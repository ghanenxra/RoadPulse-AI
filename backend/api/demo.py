import os
import json
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from models.database import (
    get_db, RoadSegment, WeeklyRoadMetric, IssueReport, ProcessingJob, 
    VideoAsset, RepairVerification, Detection, PotholeCluster, Authority, Bus, ChargingStation
)
from data.seed import seed_database, clear_database
from services.verification_service import verify_repair

router = APIRouter()

# ── 1. Add / Seed 20 Demo Roads Data ──────────────────────────────────────────

@router.post('/api/demo/seed-roads')
@router.post('/api/demo/load')
@router.post('/api/demo/reset')
def seed_roads_data(db: Session = Depends(get_db)):
    """
    Seeds or restores the complete 20 Jaipur road corridors with their 4-week history
    into the dashboard.
    """
    seed_database(db)
    road_count = db.query(RoadSegment).count()
    return {
        "success": True,
        "message": f"Successfully loaded {road_count} Jaipur transit corridors with complete 4-week timeline into the dashboard.",
        "road_count": road_count
    }


# ── 2. Reset ONLY Video Ingested Data ─────────────────────────────────────────

@router.post('/api/demo/clear-ingested')
def clear_ingested_data(db: Session = Depends(get_db)):
    """
    Clears ONLY video-ingested data:
    - Deletes detections generated from uploaded videos or local YOLO runs
    - Deletes uploaded ProcessingJobs and VideoAssets
    - Deletes week 0 live bucket metrics
    - Restores Week 4 baseline metrics for the 20 road segments from demo-data.json
    - Preserves all 20 road segments and baseline history!
    """
    # 1. Delete video-ingested detections
    ingested_dets = db.query(Detection).filter(
        (Detection.data_source.in_(["local_yolo", "edge_depot_yolov8", "upload"])) |
        (Detection.week == 0)
    ).delete(synchronize_session=False)

    # 2. Delete uploaded ProcessingJobs & VideoAssets
    jobs_cleared = db.query(ProcessingJob).filter(
        ProcessingJob.source.in_(["upload", "charging_station_upload", "local_yolo", "simulated_demo"])
    ).delete(synchronize_session=False)

    videos_cleared = db.query(VideoAsset).filter(
        VideoAsset.metadata_source.in_(["upload", "local_yolo", "NVDR_SIMULATOR"])
    ).delete(synchronize_session=False)

    # 3. Delete week=0 live metrics
    db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == 0).delete(synchronize_session=False)

    # 4. Restore Week 4 baseline metrics from demo-data.json for all segments
    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "demo-data.json")
    if os.path.exists(data_path):
        with open(data_path, "r", encoding="utf-8") as f:
            demo_data = json.load(f)
        for seg_data in demo_data.get("segments", []):
            sid = seg_data["id"]
            w4_data = next((w for w in seg_data.get("weeks", []) if w["week"] == 4), None)
            if w4_data:
                metric = db.query(WeeklyRoadMetric).filter(
                    WeeklyRoadMetric.segment_id == sid,
                    WeeklyRoadMetric.week == 4
                ).first()
                if metric:
                    metric.pothole_count = w4_data["potholes"]
                    metric.severe_count = int(w4_data["potholes"] * 0.4)
                    metric.severity_avg = w4_data["severity"]
                    metric.depth_avg_cm = w4_data["depth_cm"]
                    metric.risk_score = w4_data["risk"]
                    grade_val = w4_data["grade"]
                    metric.grade = "E" if grade_val == "F" else grade_val
                    metric.status = w4_data.get("status", "none")
                    metric.note = w4_data.get("note", "")
                    metric.data_source = "simulated_demo"

    db.commit()

    return {
        "success": True,
        "message": f"Cleared {ingested_dets} video detections and {jobs_cleared} upload jobs. Baseline 20 roads restored to original seed state.",
        "detections_cleared": ingested_dets,
        "jobs_cleared": jobs_cleared
    }


# ── 3. Complete Data Reset (Wipe All) ──────────────────────────────────────────

@router.post('/api/demo/clear-all')
def clear_all_data(db: Session = Depends(get_db)):
    """
    Complete data reset: Wipes all tables in the database (20 roads, metrics, detections, jobs).
    Database starts completely empty until 'Add 20 Demo Roads' is clicked.
    """
    clear_database(db)
    return {
        "success": True,
        "message": "Complete database wipe successful. All 20 road segments and video ingested data cleared."
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
