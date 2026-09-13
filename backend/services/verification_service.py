import os
from sqlalchemy.orm import Session
from backend.models.database import IssueReport, RepairVerification
from datetime import datetime

def verify_repair(issue_id: str, survey_week: int, db: Session) -> RepairVerification:
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        return None
    
    before_score = issue.risk_score
    after_score = before_score * 0.5 # simulated improvement
    
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
        verified_at=datetime.utcnow()
    )
    db.add(ver)
    db.commit()
    db.refresh(ver)
    return ver

def simulate_authority_response(issue_id: str, action: str, db: Session):
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        return False
    if action == "acknowledge":
        issue.status = "acknowledged"
        issue.acknowledged_at = datetime.utcnow()
    elif action == "repair":
        issue.status = "repaired"
        issue.repair_claimed_at = datetime.utcnow()
    db.commit()
    return True
