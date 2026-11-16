"""
processing.py — Video Upload & YOLO Inference API
───────────────────────────────────────────────────
Flow:
  1. User selects/drags video onto Processing Center dashboard
  2. POST /api/upload (or sample ingest) → video saved/verified, job created in DB
  3. Background task fires: YOLOv8 model runs on local GPU (or mock if requested)
  4. Detections stored into week=0 (live real-time bucket, isolated from historical surveys)
  5. Job status/progress tracked in DB (frontend polls /api/jobs)
"""

import os
import uuid
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.config import settings
from models.database import (
    get_db, ProcessingJob, VideoAsset, Detection, RoadSegment, WeeklyRoadMetric
)
from services.detection_service import get_detection_provider
from services.scoring_service import calculate_risk_score, get_grade

router = APIRouter()


# ── Helper: update live metric after inference ─────────────────────────────────

def _update_live_metric(segment_id: str, new_detections: list, db: Session):
    """
    Update strictly week=0 (the rolling live/real-time bucket).
    Preserves historical survey weeks (week=1, 2, 3, 4) intact.
    Recalculates density, average severity, depth, risk score, and grade for week=0.
    """
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        return

    # Ingested video detections populate week=0 (live real-time bucket)
    live_detections = db.query(Detection).filter(
        Detection.road_segment_id == segment_id,
        Detection.week == 0
    ).all()

    count = len(live_detections)
    if count == 0:
        return

    length_km = seg.length_km if (seg.length_km and seg.length_km > 0) else 1.0
    avg_sev = sum(d.severity for d in live_detections) / count
    density = count / length_km

    # Calculate risk score with documented baseline
    risk = calculate_risk_score(
        severity=avg_sev,
        density=density,
        trend=0.0,
        rain_mm=None  # live feed has no physical rain sensor attached; treated as unavailable
    )
    grade = get_grade(risk)
    now_str = datetime.now(timezone.utc).replace(tzinfo=None).strftime("%Y-%m-%d")
    high_count = sum(1 for d in live_detections if d.severity_label == "High")

    depths = [d.depth_cm for d in live_detections if d.depth_cm is not None]
    avg_depth = round(sum(depths) / len(depths), 1) if depths else None

    # Upsert strictly week 0 (live ingestion bucket)
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == segment_id,
        WeeklyRoadMetric.week == 0
    ).first()

    if metric:
        metric.pothole_count = count
        metric.severe_count = high_count
        metric.density = round(density, 2)
        metric.severity_avg = round(avg_sev, 2)
        metric.depth_avg_cm = avg_depth
        metric.risk_score = risk
        metric.grade = grade
        metric.status = "live_updated"
        metric.note = f"YOLOv8 inference synced ({len(new_detections)} potholes in recent pass)"
        metric.data_source = "local_yolo"
        metric.date = now_str
    else:
        metric = WeeklyRoadMetric(
            segment_id=segment_id,
            week=0,
            date=now_str,
            pothole_count=count,
            severe_count=high_count,
            density=round(density, 2),
            severity_avg=round(avg_sev, 2),
            depth_avg_cm=avg_depth,
            rain_mm=None,
            trend=0.0,
            context_score=10.0,
            risk_score=risk,
            grade=grade,
            status="live_updated",
            note=f"YOLOv8 inference synced ({len(new_detections)} potholes in recent pass)",
            surveyed=True,
            coverage_confidence=0.98,
            data_source="local_yolo"
        )
        db.add(metric)

    db.commit()


# ── Background inference task ──────────────────────────────────────────────────

def run_yolo_inference(job_id: str, video_path: str, road_segment_id: str, bus_id: str):
    """
    Runs in a background thread via FastAPI BackgroundTasks.
    1. Loads detection provider (auto: real YOLO if available, mock if not)
    2. Runs inference on the video with live progress updates
    3. Interpolates coordinates along the corridor polyline (no random fabricated jitter)
    4. Saves detections to DB with week=0 (live real-time bucket)
    5. Updates live road metrics (week=0) without modifying historical audit weeks
    """
    from models.database import SessionLocal
    start_time = datetime.now(timezone.utc).replace(tzinfo=None)

    db = SessionLocal()
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.job_id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.progress = 5.0
        db.commit()

        # ── Load provider ──
        try:
            provider = get_detection_provider("auto")
            job.provider = getattr(provider, "provider_name", "yolov8_local")
        except Exception as e:
            job.status = "failed"
            job.error = f"Failed to initialize detection provider: {e}"
            db.commit()
            return

        job.progress = 12.0
        db.commit()

        # ── Run inference with live progress callback ──
        def on_progress(pct: float, current_frame: int):
            try:
                job.progress = round(15.0 + (pct * 70.0), 1)
                job.frames_processed = current_frame
                db.commit()
            except Exception:
                pass

        try:
            raw_detections, video_info = provider.detect(video_path, progress_callback=on_progress)
        except Exception as e:
            job.status = "failed"
            job.error = f"Inference execution error: {e}"
            db.commit()
            return

        total_frames = video_info.get("total_frames", 1)
        job.frames_total = total_frames
        job.frames_processed = total_frames
        job.progress = 88.0
        db.commit()

        # ── Update VideoAsset duration ──
        video_asset = db.query(VideoAsset).filter(VideoAsset.video_id == job.video_id).first()
        if video_asset:
            video_asset.duration_seconds = video_info.get("duration_seconds", 0.0)
            video_asset.status = "processed"
            db.commit()

        # ── Geocode detections along actual road polyline (interpolated, no fabricated jitter) ──
        seg = db.query(RoadSegment).filter(RoadSegment.segment_id == road_segment_id).first()
        coords = []
        if seg and seg.polyline_coords:
            try:
                coords = json.loads(seg.polyline_coords)
            except Exception:
                coords = []
        if not coords and seg:
            coords = [[seg.start_lat, seg.start_lon], [seg.end_lat, seg.end_lon]]

        total_dets = max(len(raw_detections), 1)
        stored = 0
        is_synthetic = getattr(provider, "is_synthetic", False)

        for idx, det in enumerate(raw_detections):
            frame_num = det.get("frame_number", idx)
            t = (frame_num / max(total_frames, 1)) if total_frames > 0 else (idx / total_dets)
            t = min(max(t, 0.0), 1.0)

            if coords and len(coords) > 1:
                pt_idx = int(t * (len(coords) - 1))
                base_lat, base_lon = coords[pt_idx]
            elif seg:
                base_lat = seg.start_lat + t * (seg.end_lat - seg.start_lat)
                base_lon = seg.start_lon + t * (seg.end_lon - seg.start_lon)
            else:
                base_lat, base_lon = 26.8665, 75.7972

            # Validated coordinates without random fabricated jitter for real inference
            lat = round(base_lat, 6)
            lon = round(base_lon, 6)

            did = det.get("detection_id") or f"D-{uuid.uuid4().hex[:10]}"
            data_src = "mock_synthetic_demo" if is_synthetic else "yolo_interpolated_corridor"

            detection = Detection(
                detection_id=did,
                video_id=job.video_id,
                bus_id=bus_id,
                frame_number=det.get("frame_number"),
                timestamp=det.get("timestamp") or datetime.now(timezone.utc).replace(tzinfo=None),
                latitude=lat,
                longitude=lon,
                confidence=det.get("confidence", 0.85),
                severity=det.get("severity", 2.5),
                severity_label=det.get("severity_label", "Medium"),
                depth_cm=det.get("depth_cm"),
                bbox=json.dumps(det.get("bbox", [])) if det.get("bbox") else None,
                road_segment_id=road_segment_id,
                data_source=data_src,
                week=0  # week 0 = live ingestion bucket, keeping historical weeks 1-4 intact
            )
            db.add(detection)
            stored += 1

        db.commit()
        job.detections_count = stored
        job.progress = 95.0
        db.commit()

        # ── Update live road metric in DB (week=0) ──
        _update_live_metric(road_segment_id, raw_detections, db)

        # ── Mark Job Completed ──
        end_time = datetime.now(timezone.utc).replace(tzinfo=None)
        duration_sec = round((end_time - start_time).total_seconds(), 2)

        job.status = "completed"
        job.progress = 100.0
        job.processing_duration_seconds = duration_sec
        job.completed_at = end_time
        db.commit()

        print(f"[JOB {job_id}] Finished! {stored} potholes geocoded & logged along {road_segment_id} (week=0)")

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
    Accept a video file via streamed chunks.
    Validates file extension, bounds file size to max 500 MB without high memory footprint.
    Cleans up temporary file upon any upload failure.
    Creates job record and initiates asynchronous background processing.
    """
    max_upload_bytes = 500 * 1024 * 1024  # 500 MB
    allowed_extensions = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported video format '{ext}'. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    # Validate target road segment exists
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == road_segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail=f"Road segment '{road_segment_id}' not found")

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex[:8]}_{Path(filename).name}"
    file_location = settings.uploads_dir / safe_filename

    # Stream upload in bounded 1MB chunks to prevent memory spikes
    total_bytes = 0
    chunk_size = 1024 * 1024
    try:
        with open(str(file_location), "wb") as f:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_upload_bytes:
                    f.close()
                    if file_location.exists():
                        file_location.unlink()
                    raise HTTPException(status_code=413, detail="Video exceeds the 500 MB upload limit")
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        if file_location.exists():
            file_location.unlink()
        raise HTTPException(status_code=500, detail=f"Filesystem error during upload: {exc}")

    # Create VideoAsset record
    vid_id = f"VID-{uuid.uuid4().hex[:8]}"
    db.add(VideoAsset(
        video_id=vid_id,
        bus_id=bus_id,
        route_id=road_segment_id,
        upload_time=datetime.now(timezone.utc).replace(tzinfo=None),
        duration_seconds=0.0,
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
        provider="yolov8_local",
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(job)
    db.commit()

    # Fire background inference
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
        "latitude": d.latitude,
        "longitude": d.longitude,
        "data_source": d.data_source,
    } for d in dets]


# ── Sample Video Library (1-Click Jury Demo) ───────────────────────────────────

class IngestSampleRequest(BaseModel):
    clip_name: str = "clip_1_tonk_road_morning.mp4"
    bus_id: str = "BUS-1"
    station_id: str = "CS-1"
    road_segment_id: str = "TR-01"


@router.get('/api/processing/sample-clips')
def get_sample_clips():
    """Returns list of pre-bundled sample video clips with recommended route mappings."""
    return [
        {
            "id": "clip-1",
            "filename": "clip_1_tonk_road_morning.mp4",
            "title": "Tonk Road Morning Transit",
            "sub": "Gopalpura to Durgapura Flyover (NH-52)",
            "default_segment": "TR-01",
            "default_bus": "BUS-1",
            "default_station": "CS-1",
            "size_mb": 7.8,
            "highlight": "Heavy commuter corridor with multi-lane pavement defects"
        },
        {
            "id": "clip-2",
            "filename": "clip_2_ajmer_road_pothole_cluster.mp4",
            "title": "Ajmer Road Pothole Cluster",
            "sub": "Sodala Elevated to Vaishali Nagar (NH-48)",
            "default_segment": "AJ-01",
            "default_bus": "BUS-2",
            "default_station": "CS-1",
            "size_mb": 10.0,
            "highlight": "Rapid cluster deterioration before municipal resurfacing"
        },
        {
            "id": "clip-3",
            "filename": "clip_3_jln_marg_radial.mp4",
            "title": "JLN Marg Radial Boulevard",
            "sub": "MNIT / WTP to Jawahar Circle Roundabout",
            "default_segment": "JLN-01",
            "default_bus": "BUS-3",
            "default_station": "CS-2",
            "size_mb": 9.7,
            "highlight": "High-speed dual carriageway radial boulevard"
        },
        {
            "id": "clip-4",
            "filename": "sample_dashcam_pothole_clip.mp4",
            "title": "Master Dashcam Inspection Clip",
            "sub": "Citywide Field Sweep Verification",
            "default_segment": "TR-01",
            "default_bus": "BUS-1",
            "default_station": "CS-1",
            "size_mb": 12.5,
            "highlight": "Full-length raw bus dashcam recording with real potholes"
        },
    ]


@router.post('/api/processing/sample-video')
async def ingest_sample_video(
    background_tasks: BackgroundTasks,
    payload: IngestSampleRequest,
    db: Session = Depends(get_db)
):
    """
    Ingest a pre-loaded sample video from sample_data/ directly.
    Validates route segment, stages copy in uploads, and triggers background inference.
    """
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == payload.road_segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail=f"Road segment '{payload.road_segment_id}' not found")

    project_root = Path(__file__).resolve().parent.parent.parent
    sample_dir = project_root / "sample_data"
    allowed_clips = {clip["filename"] for clip in get_sample_clips()}
    if payload.clip_name not in allowed_clips:
        raise HTTPException(status_code=400, detail="Unknown sample clip")

    sample_file = sample_dir / payload.clip_name
    if not sample_file.exists():
        fallback_dir = Path(__file__).resolve().parent.parent / "sample_data"
        if (fallback_dir / payload.clip_name).exists():
            sample_file = fallback_dir / payload.clip_name

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex[:8]}_{payload.clip_name}"
    target_file = settings.uploads_dir / safe_filename

    if sample_file.exists():
        import shutil
        shutil.copyfile(str(sample_file), str(target_file))
        actual_path = str(target_file)
    else:
        raise HTTPException(status_code=404, detail=f"Sample clip '{payload.clip_name}' not found")

    vid_id = f"VID-{uuid.uuid4().hex[:8]}"
    db.add(VideoAsset(
        video_id=vid_id,
        bus_id=payload.bus_id,
        route_id=payload.road_segment_id,
        upload_time=datetime.now(timezone.utc).replace(tzinfo=None),
        duration_seconds=0.0,
        metadata_source="sample_library",
        status="uploaded",
        file_path=actual_path
    ))

    job_id = f"JOB-{uuid.uuid4().hex[:8]}"
    job = ProcessingJob(
        job_id=job_id,
        video_id=vid_id,
        bus_id=payload.bus_id,
        source=f"sample:{payload.clip_name}",
        status="queued",
        progress=0.0,
        frames_total=0,
        frames_processed=0,
        detections_count=0,
        provider="yolov8_local",
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(
        run_yolo_inference,
        job_id,
        actual_path,
        payload.road_segment_id,
        payload.bus_id
    )

    return {
        "job_id": job_id,
        "video_id": vid_id,
        "clip_name": payload.clip_name,
        "road_segment_id": payload.road_segment_id,
        "message": f"Sample clip '{payload.clip_name}' queued for YOLOv8 inference along {payload.road_segment_id}.",
        "poll_url": f"/api/jobs/{job_id}"
    }
