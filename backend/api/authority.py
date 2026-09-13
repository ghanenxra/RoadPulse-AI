from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models.database import get_db, IssueReport, RoadSegment, Authority
from backend.schemas.api_schemas import IssueStatusUpdate
from backend.services.verification_service import verify_repair, simulate_authority_response

router = APIRouter()

@router.get('/api/authority/issues')
def list_issues(status: str = None, authority_id: str = None, priority: str = None, db: Session = Depends(get_db)):
    query = db.query(IssueReport)
    if status: query = query.filter(IssueReport.status == status)
    if authority_id: query = query.filter(IssueReport.authority_id == authority_id)
    if priority: query = query.filter(IssueReport.priority == priority)
    
    issues = query.all()
    return issues

@router.get('/api/authority/summary')
def authority_summary(db: Session = Depends(get_db)):
    status_counts = db.query(IssueReport.status, func.count(IssueReport.issue_id)).group_by(IssueReport.status).all()
    auth_counts = db.query(Authority.name, func.count(IssueReport.issue_id)).join(IssueReport, Authority.authority_id == IssueReport.authority_id).group_by(Authority.name).all()
    
    return {
        "by_status": {status: count for status, count in status_counts},
        "by_authority": {auth: count for auth, count in auth_counts}
    }

@router.post('/api/authority/issues/{issue_id}/status')
def update_issue_status(issue_id: str, payload: IssueStatusUpdate, db: Session = Depends(get_db)):
    success = simulate_authority_response(issue_id, payload.status, db)
    if not success:
        issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
        if not issue: raise HTTPException(404, "Issue not found")
        issue.status = payload.status
        issue.notes = payload.notes
        db.commit()
    return {"message": "Status updated successfully"}

@router.post('/api/verification/{issue_id}')
def trigger_verification(issue_id: str, db: Session = Depends(get_db)):
    ver = verify_repair(issue_id, 4, db)
    if not ver:
        raise HTTPException(404, "Issue not found")
    return ver
