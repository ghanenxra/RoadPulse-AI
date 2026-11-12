from sqlalchemy.orm import Session
from models.database import IssueReport, RepairVerification, WeeklyRoadMetric
from datetime import datetime, timezone

def verify_repair(issue_id: str, survey_week: int, db: Session) -> RepairVerification:
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        return None

    existing = db.query(RepairVerification).filter(
        RepairVerification.issue_id == issue_id,
        RepairVerification.survey_week == survey_week,
    ).first()
    if existing:
        return existing

    before_score = issue.risk_score
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == issue.segment_id,
        WeeklyRoadMetric.week == survey_week,
    ).first()
    after_score = metric.risk_score if metric else before_score

    if after_score < before_score * 0.6:
        result = 'verified'
        issue.status = 'verified'
    elif after_score >= before_score * 0.8:
        result = 'failed'
        issue.status = 'failed_verification'
    else:
        result = 'partial'
        issue.status = 'repaired' # but not verified
    
    ver = RepairVerification(
        verification_id=f"VER-{issue_id}-{survey_week}",
        issue_id=issue_id,
        survey_week=survey_week,
        result=result,
        before_score=before_score,
        after_score=after_score,
        verified_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(ver)
    db.commit()
    db.refresh(ver)
    return ver

def simulate_authority_response(issue_id: str, action: str, db: Session):
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
