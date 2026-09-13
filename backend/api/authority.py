from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from models.database import get_db, IssueReport, RoadSegment, Authority, WeeklyRoadMetric
from schemas.api_schemas import IssueStatusUpdate
from services.verification_service import verify_repair, simulate_authority_response

router = APIRouter()

def serialize_issue(issue: IssueReport, db: Session) -> dict:
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == issue.segment_id).first()
    auth = db.query(Authority).filter(Authority.authority_id == issue.authority_id).first()
    
    days_unresolved = (datetime.utcnow() - issue.sent_at).days if issue.sent_at else 0
    
    return {
        "issue_id": issue.issue_id,
        "segment_id": issue.segment_id,
        "road_name": seg.road_name if seg else issue.segment_id,
        "sub_name": seg.sub_name if seg else "",
        "authority_id": issue.authority_id,
        "authority_name": auth.name if auth else (seg.authority.name if seg and seg.authority else issue.authority_id),
        "priority": issue.priority,
        "risk_score": issue.risk_score,
        "status": issue.status,
        "notes": issue.notes or "",
        "sent_at": issue.sent_at.isoformat() if issue.sent_at else None,
        "due_at": issue.due_at.isoformat() if issue.due_at else None,
        "acknowledged_at": issue.acknowledged_at.isoformat() if issue.acknowledged_at else None,
        "repair_claimed_at": issue.repair_claimed_at.isoformat() if issue.repair_claimed_at else None,
        "days_unresolved": max(0, days_unresolved)
    }

@router.get('/api/authority/issues')
def list_issues(status: str = None, authority_id: str = None, priority: str = None, db: Session = Depends(get_db)):
    query = db.query(IssueReport)
    if status:
        query = query.filter(IssueReport.status == status)
    if authority_id:
        query = query.filter(IssueReport.authority_id == authority_id)
    if priority:
        query = query.filter(IssueReport.priority == priority)
        
    issues = query.all()
    return [serialize_issue(i, db) for i in issues]

@router.get('/api/authority/summary')
def authority_summary(db: Session = Depends(get_db)):
    status_counts = db.query(IssueReport.status, func.count(IssueReport.issue_id)).group_by(IssueReport.status).all()
    
    authorities = db.query(Authority).all()
    by_auth = []
    for a in authorities:
        issues = db.query(IssueReport).filter(IssueReport.authority_id == a.authority_id).all()
        by_auth.append({
            "authority_id": a.authority_id,
            "name": a.name,
            "zone": a.zone,
            "total_issues": len(issues),
            "open_issues": sum(1 for i in issues if i.status in ['reported', 'acknowledged', 'in_progress', 'overdue']),
            "verified_repairs": sum(1 for i in issues if i.status == 'verified'),
            "overdue_issues": sum(1 for i in issues if i.status == 'overdue'),
            "avg_response_days": 3.2
        })
        
    return {
        "by_status": {status: count for status, count in status_counts},
        "by_authority": by_auth,
        "total_reports": db.query(IssueReport).count(),
        "overdue_count": db.query(IssueReport).filter(IssueReport.status == 'overdue').count(),
        "verified_count": db.query(IssueReport).filter(IssueReport.status == 'verified').count()
    }

@router.patch('/api/authority/issues/{issue_id}')
@router.post('/api/authority/issues/{issue_id}/status')
def update_issue_status(issue_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    status = payload.get("status")
    notes = payload.get("notes")
    
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        raise HTTPException(404, f"Issue {issue_id} not found")
        
    issue.status = status
    if notes:
        issue.notes = notes
        
    if status == "acknowledged" and not issue.acknowledged_at:
        issue.acknowledged_at = datetime.utcnow()
    elif status in ["repaired", "claimed_repaired"] and not issue.repair_claimed_at:
        issue.repair_claimed_at = datetime.utcnow()
        
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == issue.segment_id,
        WeeklyRoadMetric.week == 4
    ).first()
    if metric:
        metric.status = status
        
    db.commit()
    return serialize_issue(issue, db)

@router.post('/api/verification/{issue_id}')
def trigger_verification(issue_id: str, db: Session = Depends(get_db)):
    ver = verify_repair(issue_id, 4, db)
    if not ver:
        raise HTTPException(404, f"Issue {issue_id} not found or could not verify")
    return {
        "verification_id": ver.verification_id,
        "issue_id": ver.issue_id,
        "survey_week": ver.survey_week,
        "result": ver.result,
        "before_score": ver.before_score,
        "after_score": ver.after_score,
        "notes": ver.notes,
        "verified_at": ver.verified_at.isoformat() if ver.verified_at else None
    }
