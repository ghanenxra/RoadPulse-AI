import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.models.database import get_db, RoadSegment, WeeklyRoadMetric, IssueReport
from backend.data.seed import seed_database
from backend.services.verification_service import verify_repair

router = APIRouter()

@router.post('/api/demo/load')
@router.post('/api/demo/reset')
def reset_demo_data(db: Session = Depends(get_db)):
    seed_database(db)
    return {"success": True, "message": "Demo data loaded successfully"}

@router.post('/api/demo/simulate-upload')
def simulate_upload(db: Session = Depends(get_db)):
    # This just returns success to indicate the mock ran. The actual processing API handles simulation.
    return {"success": True, "message": "Simulated processing job created and run"}

@router.post('/api/demo/simulate-repair')
def simulate_repair(payload: dict = Body(...), db: Session = Depends(get_db)):
    segment_id = payload.get("segment_id")
    week = payload.get("week", 4)
    
    issue = db.query(IssueReport).filter(IssueReport.segment_id == segment_id).first()
    if not issue:
        raise HTTPException(404, "No active issue found for this segment")
        
    issue.status = "repaired"
    db.commit()
    
    ver = verify_repair(issue.issue_id, week, db)
    return {"success": True, "message": "Simulated repair and verification", "verification": ver}

@router.post('/api/demo/simulate-report')
def simulate_report(payload: dict = Body(...), db: Session = Depends(get_db)):
    segment_id = payload.get("segment_id")
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        raise HTTPException(404, "Segment not found")
        
    issue_id = f"ISS-{uuid.uuid4().hex[:8]}"
    issue = IssueReport(
        issue_id=issue_id, segment_id=segment_id, authority_id=seg.authority_id,
        priority="High", risk_score=85.0, sent_at=datetime.utcnow(), status="reported"
    )
    db.add(issue)
    
    metric = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.segment_id == segment_id, WeeklyRoadMetric.week == 4).first()
    if metric:
        metric.status = "reported"
        
    db.commit()
    return {"success": True, "message": "Simulated issue report", "issue_id": issue_id}

@router.post('/api/demo/simulate-acknowledge')
def simulate_acknowledge(payload: dict = Body(...), db: Session = Depends(get_db)):
    issue_id = payload.get("issue_id")
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        raise HTTPException(404, "Issue not found")
        
    issue.status = "acknowledged"
    issue.acknowledged_at = datetime.utcnow()
    
    metric = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.segment_id == issue.segment_id, WeeklyRoadMetric.week == 4).first()
    if metric:
        metric.status = "acknowledged"
        
    db.commit()
    return {"success": True, "message": "Issue acknowledged simulated"}
