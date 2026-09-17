"""
processing.py — Video Upload & YOLO Inference API
───────────────────────────────────────────────────
Flow:
  1. User drags video onto Processing Center dashboard
  2. POST /api/upload  → video saved to uploads/, job created in DB
  3. Background task fires: real YOLOv8 runs on local GPU
  4. Detections stored via ingest logic (week=0 live bucket)
  5. Job status/progress tracked in DB (frontend polls every 4s)
"""

import os
import uuid
import asyncio
import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from core.config import settings
from models.database import (
    get_db, ProcessingJob, VideoAsset, Detection, RoadSegment, WeeklyRoadMetric
)
from services.detection_service import get_detection_provider
from services.scoring_service import calculate_risk_score, get_grade

router = APIRouter()


# ── Helper: update live metric after inference ─────────────────────────────────

def _update_live_metric(segment_id: str, detections: list, db: Session):
    """
    Upsert WeeklyRoadMetric week=0 (live bucket) from real detection results.
    Mirrors the logic in ingest.py so both code paths stay consistent.
    """
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        return

    existing_live = db.query(Detection).filter(
        Detection.road_segment_id == segment_id,
        Detection.week == 0
    ).all()

    all_live = existing_live
    count = len(all_live)
    if count == 0:
        return

    length_km = seg.length_km if (seg.length_km and seg.length_km > 0) else 1.0
    avg_sev = sum(d.severity for d in all_live) / count
    density = count / length_km

    risk = calculate_risk_score(
        severity=avg_sev,
        density=density,
        trend=0.0,
        rain_mm=0.0
    )
    grade = get_grade(risk)
    now_str = datetime.utcnow().strftime("%Y-%m-%d")

    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == segment_id,
        WeeklyRoadMetric.week == 0
    ).first()

    if metric:
        metric.pothole_count = count
        metric.severe_count = sum(1 for d in all_live if d.severity_label == "High")
        metric.density = round(density, 3)
        metric.severity_avg = round(avg_sev, 2)
        metric.depth_avg_cm = round(
            sum(d.depth_cm for d in all_live if d.depth_cm) /
            max(1, sum(1 for d in all_live if d.depth_cm)), 2
        )
        metric.risk_score = risk
        metric.grade = grade
        metric.status = "live"
        metric.note = "Local YOLO inference"
        metric.data_source = "local_yolo"
        metric.date = now_str
    else:
        metric = WeeklyRoadMetric(
            segment_id=segment_id,
            week=0,
            date=now_str,
            pothole_count=count,
            severe_count=sum(1 for d in all_live if d.severity_label == "High"),
            density=round(density, 3),
            severity_avg=round(avg_sev, 2),
            depth_avg_cm=0.0,
            rain_mm=0.0,
            trend=0.0,
            context_score=10.0,
            risk_score=risk,
            grade=grade,
            status="live",
            note="Local YOLO inference",
            surveyed=True,
            coverage_confidence=0.95,
            data_source="local_yolo"
        )
        db.add(metric)

    db.commit()


# ── Background inference task ──────────────────────────────────────────────────

def run_yolo_inference(job_id: str, video_path: str, road_segment_id: str, bus_id: str):
    """
    Runs in a background thread (via FastAPI BackgroundTasks).
    1. Loads YOLO model (auto: real if available, mock if not)
    2. Runs inference on the uploaded video
    3. Saves detections to DB (week=0 live bucket)
    4. Updates job progress and live metric
    """
    from models.database import SessionLocal

    db = SessionLocal()
    try:
        # ── Update job: processing ──
        job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.progress = 5.0
        db.commit()

        # ── Load provider (auto picks real YOLO if available) ──
        try:
            provider = get_detection_provider("auto")
            provider_name = type(provider).__name__
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            db.commit()
            return

        job.provider = "yolov8_local" if "YOLO" in provider_name else "mock_yolo_v8"
        job.progress = 10.0
        db.commit()

        # ── Run inference ──
        try:
            raw_detections = provider.detect(video_path)
        except Exception as e:
            job.status = "failed"
            job.error = f"Inference error: {e}"
            db.commit()
            return

        job.progress = 75.0
        job.frames_processed = job.frames_total
        db.commit()

        # ── Store detections in DB (week=0 live bucket) ──
        seg = db.query(RoadSegment).filter(RoadSegment.segment_id == road_segment_id).first()
        stored = 0
        for det in raw_detections:
            did = det.get("detection_id") or f"D-{uuid.uuid4().hex[:10]}"
            detection = Detection(
                detection_id=did,
                video_id=job.video_id,
                bus_id=bus_id,
                frame_number=det.get("frame_number"),
                timestamp=det.get("timestamp") or datetime.utcnow(),
                latitude=seg.start_lat if seg else 26.9124,
                longitude=seg.start_lon if seg else 75.7873,
                confidence=det.get("confidence", 0.85),
                severity=det.get("severity", 2.5),
                severity_label=det.get("severity_label", "Medium"),
                depth_cm=det.get("depth_cm"),
                bbox=json.dumps(det.get("bbox", [])) if det.get("bbox") else None,
                road_segment_id=road_segment_id,
                data_source="local_yolo",
                week=0      # live bucket — never overwrites historical weeks 1-4
            )
            db.add(detection)
            stored += 1

        db.commit()
        job.detections_count = stored
        job.progress = 90.0
        db.commit()

        # ── Update live metric ──
        _update_live_metric(road_segment_id, raw_detections, db)

        # ── Complete ──
        job.status = "completed"
        job.progress = 100.0
        job.completed_at = datetime.utcnow()
        db.commit()

        print(f"[JOB {job_id}] Done. {stored} potholes detected on {road_segment_id}")

    except Exception as e:
        try:
            job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
            if job:
                job.status = "failed"
                job.error = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ── Upload & trigger inference ─────────────────────────────────────────────────

@router.post('/api/upload')
@router.post('/api/jobs')
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    bus_id: str = Form("BUS-1"),
    station_id: str = Form("CS-1"),
    road_segment_id: str = Form("TR-01"),
    db: Session = Depends(get_db)
):
    """
    Accept a video file from the dashboard drag-and-drop.
    Saves to uploads/, creates a job record, kicks off YOLO inference in background.
    Returns immediately — frontend polls /api/jobs for progress.
    """
    # Save file
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    file_location = settings.uploads_dir / safe_filename

    with open(str(file_location), "wb+") as f:
        f.write(await file.read())

    # Create VideoAsset record
    vid_id = f"VID-{uuid.uuid4().hex[:8]}"
    db.add(VideoAsset(
        video_id=vid_id,
        bus_id=bus_id,
        route_id=road_segment_id,
        upload_time=datetime.utcnow(),
        duration_seconds=0.0,         # will be known after inference
        metadata_source="upload",
        status="uploaded",
        file_path=str(file_location)
    ))

    # Create ProcessingJob record
    job_id = f"JOB-{uuid.uuid4().hex[:8]}"
    job = ProcessingJob(
        job_id=job_id,
        video_id=vid_id,
        bus_id=bus_id,
        source="upload",
        status="queued",
        progress=0.0,
        frames_total=0,
        frames_processed=0,
        detections_count=0,
        provider="yolov8_local",      # will be confirmed after model loads
        created_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()

    # Fire background inference (uses local GPU if available)
    background_tasks.add_task(
        run_yolo_inference,
        job_id,
        str(file_location),
        road_segment_id,
        bus_id
    )

    return {
        "job_id": job_id,
        "video_id": vid_id,
        "road_segment_id": road_segment_id,
        "message": f"Video '{file.filename}' saved. YOLO inference running in background.",
        "poll_url": f"/api/jobs/{job_id}"
    }


# ── Job list & detail ──────────────────────────────────────────────────────────

@router.get('/api/jobs')
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(ProcessingJob).order_by(ProcessingJob.created_at.desc()).limit(20).all()
    return jobs


@router.get('/api/jobs/{job_id}')
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get('/api/jobs/{job_id}/detections')
def get_job_detections(job_id: str, db: Session = Depends(get_db)):
    """Return all detections stored for a specific job."""
    job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    dets = db.query(Detection).filter(Detection.video_id == job.video_id).all()
    return [{
        "detection_id": d.detection_id,
        "frame_number": d.frame_number,
        "confidence": d.confidence,
        "severity": d.severity,
        "severity_label": d.severity_label,
        "depth_cm": d.depth_cm,
        "bbox": d.bbox,
        "road_segment_id": d.road_segment_id,
    } for d in dets]


# ── Simulate ingestion (demo shortcut button) ──────────────────────────────────

@router.post('/api/demo/simulate-upload')
async def simulate_upload(db: Session = Depends(get_db)):
    """
    Demo shortcut: creates a completed mock job instantly.
    Used by the 'Trigger Simulated Ingestion' button on the dashboard.
    """
    vid_id = f"VID-{uuid.uuid4().hex[:8]}"
    db.add(VideoAsset(
        video_id=vid_id,
        bus_id="BUS-1",
        route_id="TR-01",
        upload_time=datetime.utcnow(),
        duration_seconds=120.0,
        metadata_source="simulated_demo",
        status="processed",
        file_path=None
    ))

    job_id = f"JOB-{uuid.uuid4().hex[:8]}"
    db.add(ProcessingJob(
        job_id=job_id,
        video_id=vid_id,
        bus_id="BUS-1",
        source="simulated_demo",
        status="completed",
        progress=100.0,
        frames_total=3600,
        frames_processed=3600,
        detections_count=14,
        provider="yolov8_local (simulated)",
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    ))
    db.commit()

    return {
        "job_id": job_id,
        "video_id": vid_id,
        "message": "Simulated YOLO ingestion run complete. 14 potholes detected on Tonk Road."
    }
