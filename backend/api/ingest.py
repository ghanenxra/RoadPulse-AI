"""
POST /api/ingest/detections
───────────────────────────
Ingestion endpoint for local YOLO output.

Real flow:  Local video → YOLO model → this endpoint (JSON)
Mock flow:  mock_tools/inject.py or mock_tools/stream.py → this endpoint (JSON)

No video file is uploaded here — only structured JSON detection results.
"""

import uuid
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from models.database import get_db, Detection, RoadSegment, WeeklyRoadMetric
from services.scoring_service import calculate_risk_score, get_grade

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class DetectionItem(BaseModel):
    class_name: str = Field(..., example="pothole")
    confidence: float = Field(..., ge=0.0, le=1.0)
    severity: float = Field(..., ge=1.0, le=5.0, description="1=Low, 5=Critical")
    depth_cm: Optional[float] = Field(None, ge=0.0)
    bbox: Optional[List[float]] = Field(None, description="[x, y, width, height]")
    frame_number: Optional[int] = None


class Location(BaseModel):
    lat: float
    lng: float


class IngestPayload(BaseModel):
    road_segment_id: str = Field(..., example="TR-01")
    session_id: str = Field(..., example="SESSION-abc123", description="Unique ID for this capture session")
    captured_at: Optional[datetime] = Field(None, description="ISO timestamp; defaults to now if omitted")
    location: Optional[Location] = None
    frame_count: Optional[int] = Field(None, ge=1)
    detections: List[DetectionItem] = Field(..., min_items=0)
    source: Optional[str] = Field("local_yolo", description="'local_yolo' or 'mock_tool'")


# ── Helper ────────────────────────────────────────────────────────────────────

def _severity_label(sev: float) -> str:
    if sev <= 2.0:
        return "Low"
    if sev <= 3.5:
        return "Medium"
    return "High"


def _compute_and_update_metric(segment_id: str, new_detections: List[Detection], db: Session):
    """
    Re-compute the latest WeeklyRoadMetric for a segment after new detections arrive.
    Uses week=0 as a rolling 'live' metric that is always overwritten.
    """
    all_live = db.query(Detection).filter(
        Detection.road_segment_id == segment_id,
        Detection.week == 0           # week=0 = live / real-time bucket
    ).all()

    if not all_live:
        return False

    count = len(all_live)
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    length_km = seg.length_km if (seg and seg.length_km) else 1.0

    avg_sev = sum(d.severity for d in all_live) / count
    density = count / length_km

    # No rain data in live feed — default 0 (can extend later)
    risk = calculate_risk_score(
        severity=avg_sev,
        density=density,
        trend=0.0,
        rain_mm=0.0
    )
    grade = get_grade(risk)

    # Upsert live metric (week=0)
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == segment_id,
        WeeklyRoadMetric.week == 0
    ).first()

    now_str = datetime.utcnow().strftime("%Y-%m-%d")
    if metric:
        metric.pothole_count = count
        metric.severe_count = sum(1 for d in all_live if d.severity_label == "High")
        metric.density = round(density, 3)
        metric.severity_avg = round(avg_sev, 2)
        metric.depth_avg_cm = round(
            sum(d.depth_cm for d in all_live if d.depth_cm) / max(1, sum(1 for d in all_live if d.depth_cm)), 2
        )
        metric.trend = 0.0
        metric.context_score = 10.0
        metric.risk_score = risk
        metric.grade = grade
        metric.status = "live"
        metric.note = "Live YOLO feed"
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
            note="Live YOLO feed",
            surveyed=True,
            coverage_confidence=0.95,
            data_source="local_yolo"
        )
        db.add(metric)

    db.commit()
    return True


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/api/ingest/detections")
def ingest_detections(payload: IngestPayload, db: Session = Depends(get_db)):
    """
    Accept detection results from a local YOLO model (or mock_tools scripts).

    - Validates road_segment_id exists
    - Stores each detection with week=0 (live bucket)
    - Re-computes live risk score for the segment
    - Returns summary of what was stored
    """
    # 1. Validate segment exists
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == payload.road_segment_id).first()
    if not seg:
        raise HTTPException(
            status_code=404,
            detail=f"Road segment '{payload.road_segment_id}' not found. "
                   f"Run: python mock_tools/seed_roads.py  to seed road definitions."
        )

    captured_at = payload.captured_at or datetime.utcnow()
    stored_ids = []

    # 2. Store each detection
    for item in payload.detections:
        did = f"D-{uuid.uuid4().hex[:10]}"
        det = Detection(
            detection_id=did,
            video_id=None,                            # no video upload in this flow
            bus_id=payload.session_id,                # reuse bus_id column as session identifier
            frame_number=item.frame_number,
            timestamp=captured_at,
            latitude=payload.location.lat if payload.location else seg.start_lat,
            longitude=payload.location.lng if payload.location else seg.start_lon,
            confidence=item.confidence,
            severity=item.severity,
            severity_label=_severity_label(item.severity),
            depth_cm=item.depth_cm,
            bbox=json.dumps(item.bbox) if item.bbox else None,
            road_segment_id=payload.road_segment_id,
            data_source=payload.source or "local_yolo",
            week=0           # 0 = live real-time bucket (not a historical week)
        )
        db.add(det)
        stored_ids.append(did)

    db.commit()

    # 3. Update live metric for this segment
    score_updated = _compute_and_update_metric(payload.road_segment_id, [], db)

    # 4. Get updated score for response
    live_metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == payload.road_segment_id,
        WeeklyRoadMetric.week == 0
    ).first()

    return {
        "status": "accepted",
        "session_id": payload.session_id,
        "road_segment_id": payload.road_segment_id,
        "road_name": seg.road_name,
        "detections_stored": len(stored_ids),
        "score_updated": score_updated,
        "live_score": live_metric.risk_score if live_metric else None,
        "live_grade": live_metric.grade if live_metric else None,
        "captured_at": captured_at.isoformat()
    }


@router.get("/api/ingest/status/{segment_id}")
def get_ingest_status(segment_id: str, db: Session = Depends(get_db)):
    """
    Check current live ingestion status for a road segment.
    Shows the live (week=0) metric if any data has been ingested.
    """
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail=f"Segment '{segment_id}' not found")

    live_metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == segment_id,
        WeeklyRoadMetric.week == 0
    ).first()

    live_count = db.query(Detection).filter(
        Detection.road_segment_id == segment_id,
        Detection.week == 0
    ).count()

    return {
        "segment_id": segment_id,
        "road_name": seg.road_name,
        "has_live_data": live_metric is not None,
        "live_detection_count": live_count,
        "live_score": live_metric.risk_score if live_metric else None,
        "live_grade": live_metric.grade if live_metric else None,
        "last_updated": live_metric.date if live_metric else None
    }


@router.delete("/api/ingest/clear/{segment_id}")
def clear_live_data(segment_id: str, db: Session = Depends(get_db)):
    """
    Clear all live (week=0) detections and metrics for a segment.
    Useful for resetting between mock test sessions.
    Does NOT touch historical weekly data (week 1-4).
    """
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail=f"Segment '{segment_id}' not found")

    det_count = db.query(Detection).filter(
        Detection.road_segment_id == segment_id,
        Detection.week == 0
    ).delete()

    db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == segment_id,
        WeeklyRoadMetric.week == 0
    ).delete()

    db.commit()
    return {
        "status": "cleared",
        "segment_id": segment_id,
        "detections_removed": det_count
    }
