import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from models.database import get_db, RoadSegment, WeeklyRoadMetric, IssueReport, ProcessingJob, VideoAsset, RepairVerification
from data.seed import seed_database
from services.verification_service import verify_repair

router = APIRouter()

@router.post('/api/demo/load')
@router.post('/api/demo/reset')
def reset_demo_data(db: Session = Depends(get_db)):
    seed_database(db)
    road_count = db.query(RoadSegment).count()
    return {
        "success": True,
        "message": f"Demo dataset re-seeded successfully with {road_count} road segments and 4-week history."
    }

@router.post('/api/demo/simulate-upload')
def simulate_upload(db: Session = Depends(get_db)):
    job_id = f"JOB-SIM-{uuid.uuid4().hex[:6].upper()}"
    vid_id = f"VID-SIM-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.utcnow()
    
    video = VideoAsset(
        video_id=vid_id,
        bus_id="BUS-1",
        route_id="ROUTE-11",
        upload_time=now,
        duration_seconds=1800.0,
        metadata_source="NVDR_SIMULATOR",
        status="processed",
        file_path="simulated_stream.mp4"
    )
    db.add(video)
    
    job = ProcessingJob(
        job_id=job_id,
        video_id=vid_id,
        bus_id="BUS-1",
        source="charging_station_upload",
        status="completed",
        progress=100.0,
        frames_total=54000,
        frames_processed=54000,
        detections_count=14,
        provider="mock_yolo_v8",
        model_version="yolov8n-rdd2022-v1.2",
        processing_duration_seconds=28.4,
        created_at=now,
        completed_at=now
    )
    db.add(job)
    db.commit()
    
    return {
        "success": True,
        "job_id": job_id,
        "video_id": vid_id,
        "message": "Simulated NVDR footage ingested and processed through YOLO pipeline (14 potholes detected)."
    }

@router.post('/api/demo/simulate-repair')
def simulate_repair(payload: dict = Body(...), db: Session = Depends(get_db)):
    segment_id = payload.get("segment_id", "TR-01")
    week = payload.get("week", 4)
    
    issue = db.query(IssueReport).filter(IssueReport.segment_id == segment_id).first()
    if not issue:
        seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
        if not seg:
            raise HTTPException(404, f"Road segment {segment_id} not found")
        issue = IssueReport(
            issue_id=f"ISS-{segment_id}",
            segment_id=segment_id,
            authority_id=seg.authority_id,
            priority="High",
            risk_score=75.0,
            sent_at=datetime.utcnow() - timedelta(days=10),
            status="reported"
        )
        db.add(issue)
        db.commit()
        
    issue.status = "repaired"
    issue.repair_claimed_at = datetime.utcnow()
    
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == segment_id,
        WeeklyRoadMetric.week == week
    ).first()
    if metric:
        metric.status = "repaired"
        metric.risk_score = max(15.0, metric.risk_score * 0.45)
        metric.grade = "B" if metric.risk_score <= 40 else "C"
        metric.pothole_count = max(1, metric.pothole_count // 3)
        
    db.commit()
    
    ver = verify_repair(issue.issue_id, week, db)
    return {
        "success": True,
        "message": f"Simulated repair completed for {segment_id}. Road score improved.",
        "issue_id": issue.issue_id,
        "status": "repaired"
    }

@router.post('/api/demo/simulate-verification')
def simulate_verification(payload: dict = Body(...), db: Session = Depends(get_db)):
    issue_id = payload.get("issue_id", "ISS-TR-01")
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        issue = db.query(IssueReport).first()
        if not issue:
            raise HTTPException(404, "No active issues found")
            
    ver = verify_repair(issue.issue_id, 4, db)
    return {
        "success": True,
        "message": f"Repair verification conducted for {issue.issue_id}. Result: {ver.result if ver else 'verified'}.",
        "result": ver.result if ver else "verified"
    }

@router.post('/api/demo/simulate-report')
def simulate_report(payload: dict = Body(...), db: Session = Depends(get_db)):
    segment_id = payload.get("segment_id", "TR-01")
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        raise HTTPException(404, "Segment not found")
        
    issue = db.query(IssueReport).filter(IssueReport.segment_id == segment_id).first()
    if not issue:
        issue = IssueReport(
            issue_id=f"ISS-{segment_id}",
            segment_id=segment_id,
            authority_id=seg.authority_id,
            priority="High",
            risk_score=82.0,
            sent_at=datetime.utcnow(),
            status="reported"
        )
        db.add(issue)
    else:
        issue.status = "reported"
        issue.sent_at = datetime.utcnow()
        
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == segment_id,
        WeeklyRoadMetric.week == 4
    ).first()
    if metric:
        metric.status = "reported"
        
    db.commit()
    return {"success": True, "message": f"Maintenance notice generated and queued for {seg.road_name}.", "issue_id": issue.issue_id}

@router.post('/api/demo/simulate-acknowledge')
def simulate_acknowledge(payload: dict = Body(...), db: Session = Depends(get_db)):
    issue_id = payload.get("issue_id", "ISS-TR-01")
    issue = db.query(IssueReport).filter(IssueReport.issue_id == issue_id).first()
    if not issue:
        issue = db.query(IssueReport).first()
        if not issue:
            raise HTTPException(404, "No issue found")
        
    issue.status = "acknowledged"
    issue.acknowledged_at = datetime.utcnow()
    
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == issue.segment_id,
        WeeklyRoadMetric.week == 4
    ).first()
    if metric:
        metric.status = "acknowledged"
        
    db.commit()
    return {"success": True, "message": f"Issue {issue.issue_id} marked as acknowledged by authority."}
