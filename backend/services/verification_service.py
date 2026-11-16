"""
verification_service.py
───────────────────────
Municipal SLA closed-loop repair verification service.

Lifecycle:
  reported → acknowledged → in_progress → claimed_repaired → verified / failed_verification

Limitations & Future Architecture:
  In this prototype environment, verification checks that an issue was formally claimed repaired
  and evaluates post-repair transit survey telemetry on the road corridor.
  In production with PostgreSQL + PostGIS, verification will perform sub-meter spatial DBSCAN
  bounding-box defect matching across successive video passes.
"""

from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from models.database import IssueReport, RepairVerification, WeeklyRoadMetric


def verify_repair(issue_id: str, survey_week: int, db: Session) -> Optional[RepairVerification]:
    """
    Evaluates physical evidence for an issue reported on a road corridor.
    Pre-conditions:
      - Issue must exist
      - Issue must be in a claimed-repaired state ('repaired' or 'claimed_repaired')
      - Subsequent survey telemetry must be available
    """
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        return None

    # Idempotency check: prevent duplicate verification records
    existing = db.query(RepairVerification).filter(
        RepairVerification.issue_id == issue_id,
        RepairVerification.survey_week == survey_week,
    ).first()
    if existing:
        return existing

    # Pre-condition: Check if repair was actually claimed by contractor/authority
    if issue.status not in ['repaired', 'claimed_repaired']:
        ver = RepairVerification(
            verification_id=f"VER-{issue_id}-{survey_week}",
            issue_id=issue_id,
            survey_week=survey_week,
            result='unclaimed',
            before_score=issue.risk_score,
            after_score=issue.risk_score,
            notes="Verification pre-condition not met: repair has not been claimed by municipal contractor.",
            verified_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(ver)
        db.commit()
        db.refresh(ver)
        return ver

    before_score = issue.risk_score or 50.0
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == issue.segment_id,
        WeeklyRoadMetric.week == survey_week,
    ).first()

    if not metric:
        # Survey has not yet occurred for the target week
        ver = RepairVerification(
            verification_id=f"VER-{issue_id}-{survey_week}",
            issue_id=issue_id,
            survey_week=survey_week,
            result='pending_survey',
            before_score=before_score,
            after_score=before_score,
            notes=f"Subsequent survey telemetry for week {survey_week} has not been collected yet.",
            verified_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(ver)
        db.commit()
        db.refresh(ver)
        return ver

    after_score = metric.risk_score if metric.risk_score is not None else before_score

    # Evaluate physical risk change
    if before_score > 0 and after_score < before_score * 0.6:
        reduction_pct = round((1.0 - (after_score / before_score)) * 100, 1)
        result = 'verified'
        issue.status = 'verified'
        notes = f"Closed-loop AI verification confirmed: Risk index reduced by {reduction_pct}% ({before_score:.1f} → {after_score:.1f})."
    elif before_score > 0 and after_score >= before_score * 0.85:
        result = 'failed'
        issue.status = 'failed_verification'
        notes = f"Verification failed: Risk index remains elevated ({after_score:.1f} vs baseline {before_score:.1f}). Defect signatures persist."
    else:
        result = 'pending_manual_verification'
        issue.status = 'pending_manual_verification'
        notes = f"Ambiguous defect mitigation (risk {before_score:.1f} → {after_score:.1f}). Flagged for physical supervisory inspection."

    ver = RepairVerification(
        verification_id=f"VER-{issue_id}-{survey_week}",
        issue_id=issue_id,
        survey_week=survey_week,
        result=result,
        before_score=before_score,
        after_score=after_score,
        notes=notes,
        verified_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(ver)
    db.commit()
    db.refresh(ver)
    return ver


def simulate_authority_response(issue_id: str, action: str, db: Session) -> bool:
    """
    Simulates authority dispatch lifecycle transitions for interactive demonstrations.
    """
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        return False
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if action == "acknowledge":
        issue.status = "acknowledged"
        issue.acknowledged_at = now_utc
    elif action == "repair":
        issue.status = "repaired"
        issue.repair_claimed_at = now_utc
    db.commit()
    return True
