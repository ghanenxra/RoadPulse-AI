from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from models.database import get_db, RoadSegment, WeeklyRoadMetric, Detection, IssueReport, RepairVerification, Authority
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter()


# ── Seed schemas (used only by mock_tools/seed_roads.py) ────────────────────

class AuthoritySeed(BaseModel):
    authority_id: str
    name: str
    department: Optional[str] = None
    zone: Optional[str] = "Jaipur"
    contact_email: Optional[str] = None


class RoadSegmentSeed(BaseModel):
    segment_id: str
    road_name: str
    sub_name: str
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    length_km: float
    road_type: Optional[str] = "Urban"
    authority_id: str
    ward: Optional[str] = None
    polyline_coords: Optional[str] = None


@router.post("/api/roads/seed/authority", status_code=201)
def seed_authority(payload: AuthoritySeed, db: Session = Depends(get_db)):
    """
    Idempotent: Insert an authority if it does not already exist.
    Called by mock_tools/seed_roads.py — never called automatically by the server.
    """
    existing = db.query(Authority).filter(Authority.authority_id == payload.authority_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Authority '{payload.authority_id}' already exists")
    auth = Authority(
        authority_id=payload.authority_id,
        name=payload.name,
        department=payload.department,
        zone=payload.zone,
        contact_email=payload.contact_email
    )
    db.add(auth)
    db.commit()
    return {"status": "created", "authority_id": payload.authority_id}


@router.post("/api/roads/seed/segment", status_code=201)
def seed_road_segment(payload: RoadSegmentSeed, db: Session = Depends(get_db)):
    """
    Idempotent: Insert a road segment if it does not already exist.
    Called by mock_tools/seed_roads.py — never called automatically by the server.
    """
    existing = db.query(RoadSegment).filter(RoadSegment.segment_id == payload.segment_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Segment '{payload.segment_id}' already exists")
    seg = RoadSegment(
        segment_id=payload.segment_id,
        road_name=payload.road_name,
        sub_name=payload.sub_name,
        start_lat=payload.start_lat,
        start_lon=payload.start_lon,
        end_lat=payload.end_lat,
        end_lon=payload.end_lon,
        length_km=payload.length_km,
        road_type=payload.road_type,
        authority_id=payload.authority_id,
        ward=payload.ward,
        polyline_coords=payload.polyline_coords
    )
    db.add(seg)
    db.commit()
    return {"status": "created", "segment_id": payload.segment_id, "road_name": payload.road_name}


def serialize_metric(m: WeeklyRoadMetric) -> dict:
    if not m:
        return None
    return {
        "id": m.id,
        "segment_id": m.segment_id,
        "week": m.week,
        "date": m.date,
        "pothole_count": m.pothole_count,
        "potholes": m.pothole_count,
        "severe_count": m.severe_count,
        "density": round(m.density, 2) if m.density else 0.0,
        "severity_avg": round(m.severity_avg, 2) if m.severity_avg else 0.0,
        "severity": round(m.severity_avg, 2) if m.severity_avg else 0.0,
        "depth_avg_cm": round(m.depth_avg_cm, 1) if m.depth_avg_cm else 0.0,
        "depth_cm": round(m.depth_avg_cm, 1) if m.depth_avg_cm else 0.0,
        "rain_mm": m.rain_mm or 0.0,
        "trend": round(m.trend, 2) if m.trend else 0.0,
        "weekly_change": round(m.trend, 2) if m.trend else 0.0,
        "context_score": m.context_score or 10.0,
        "risk_score": round(m.risk_score, 1) if m.risk_score else 0.0,
        "risk": round(m.risk_score, 1) if m.risk_score else 0.0,
        "grade": m.grade,
        "status": m.status or "none",
        "note": m.note or "",
        "surveyed": m.surveyed,
        "coverage_confidence": m.coverage_confidence or 0.85
    }

def serialize_segment(seg: RoadSegment, week: int, db: Session) -> dict:
    metric = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == seg.segment_id,
        WeeklyRoadMetric.week == week
    ).first()
    
    all_metrics = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == seg.segment_id
    ).order_by(WeeklyRoadMetric.week).all()
    
    auth = db.query(Authority).filter(Authority.authority_id == seg.authority_id).first()
    auth_name = auth.name if auth else seg.authority_id
    current_m_dict = serialize_metric(metric)
    weeks_list = [serialize_metric(m) for m in all_metrics]
    
    return {
        "id": seg.segment_id,
        "segment_id": seg.segment_id,
        "road": seg.road_name,
        "road_name": seg.road_name,
        "sub": seg.sub_name,
        "sub_name": seg.sub_name,
        "start_lat": seg.start_lat,
        "start_lon": seg.start_lon,
        "end_lat": seg.end_lat,
        "end_lon": seg.end_lon,
        "length_km": seg.length_km,
        "road_type": seg.road_type,
        "authority_id": seg.authority_id,
        "authority": auth_name,
        "authority_name": auth_name,
        "ward": seg.ward,
        "coords": json.loads(seg.polyline_coords) if seg.polyline_coords else [[seg.start_lat, seg.start_lon], [seg.end_lat, seg.end_lon]],
        "current_week": current_m_dict,
        "current_metrics": current_m_dict,
        "weeks": weeks_list
    }

@router.get('/api/roads')
def get_roads(
    week: int = 4,
    grade: str = None,
    authority: str = None,
    status: str = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(RoadSegment)
    if authority:
        query = query.filter(RoadSegment.authority_id == authority)
    if search:
        query = query.filter(RoadSegment.road_name.ilike(f'%{search}%') | RoadSegment.sub_name.ilike(f'%{search}%') | RoadSegment.segment_id.ilike(f'%{search}%'))
        
    segments = query.all()
    results = []
    for seg in segments:
        data = serialize_segment(seg, week, db)
        current_m = data["current_week"]
        
        if grade and current_m and current_m["grade"] != grade:
            continue
        if status and current_m and current_m["status"] != status:
            continue
            
        results.append(data)
        
    results.sort(key=lambda x: (x["current_week"]["risk_score"] if x["current_week"] else 0), reverse=True)
    return results

@router.get('/api/roads/{segment_id}')
def get_road_detail(segment_id: str, db: Session = Depends(get_db)):
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail=f"Segment {segment_id} not found")
        
    data = serialize_segment(seg, 4, db)
    
    issues = db.query(IssueReport).filter(IssueReport.segment_id == segment_id).all()
    serialized_issues = []
    for issue in issues:
        auth = db.query(Authority).filter(Authority.authority_id == issue.authority_id).first()
        serialized_issues.append({
            "issue_id": issue.issue_id,
            "segment_id": issue.segment_id,
            "authority_id": issue.authority_id,
            "authority_name": auth.name if auth else issue.authority_id,
            "priority": issue.priority,
            "risk_score": issue.risk_score,
            "status": issue.status,
            "notes": issue.notes,
            "sent_at": issue.sent_at.isoformat() if issue.sent_at else None,
            "due_at": issue.due_at.isoformat() if issue.due_at else None,
            "acknowledged_at": issue.acknowledged_at.isoformat() if issue.acknowledged_at else None,
            "repair_claimed_at": issue.repair_claimed_at.isoformat() if issue.repair_claimed_at else None,
        })
        
    verifications = []
    for issue in issues:
        verifs = db.query(RepairVerification).filter(RepairVerification.issue_id == issue.issue_id).all()
        for v in verifs:
            verifications.append({
                "verification_id": v.verification_id,
                "issue_id": v.issue_id,
                "survey_week": v.survey_week,
                "result": v.result,
                "before_score": v.before_score,
                "after_score": v.after_score,
                "notes": v.notes,
                "verified_at": v.verified_at.isoformat() if v.verified_at else None
            })
            
    detections = db.query(Detection).filter(Detection.road_segment_id == segment_id).order_by(Detection.week.desc(), Detection.detection_id).all()
    serialized_detections = []
    for d in detections:
        serialized_detections.append({
            "detection_id": d.detection_id,
            "video_id": d.video_id,
            "bus_id": d.bus_id,
            "frame_number": d.frame_number,
            "timestamp": d.timestamp.isoformat() if d.timestamp else None,
            "latitude": d.latitude,
            "longitude": d.longitude,
            "confidence": d.confidence,
            "severity": d.severity,
            "severity_label": d.severity_label,
            "depth_cm": d.depth_cm,
            "bbox": d.bbox,
            "week": d.week
        })
        
    data["issues"] = serialized_issues
    data["verifications"] = verifications
    data["detections"] = serialized_detections
    return data

@router.get('/api/map')
def get_map_geojson(week: int = 4, db: Session = Depends(get_db)):
    features = []
    segments = db.query(RoadSegment).all()
    for seg in segments:
        metric = db.query(WeeklyRoadMetric).filter(
            WeeklyRoadMetric.segment_id == seg.segment_id,
            WeeklyRoadMetric.week == week
        ).first()
        if not metric:
            continue
            
        auth = db.query(Authority).filter(Authority.authority_id == seg.authority_id).first()
        coords = json.loads(seg.polyline_coords) if seg.polyline_coords else [[seg.start_lat, seg.start_lon], [seg.end_lat, seg.end_lon]]
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [pt[1], pt[0]] for pt in coords
                ]
            },
            "properties": {
                "segment_id": seg.segment_id,
                "id": seg.segment_id,
                "road_name": seg.road_name,
                "road": seg.road_name,
                "sub_name": seg.sub_name,
                "sub": seg.sub_name,
                "risk_score": metric.risk_score,
                "grade": metric.grade,
                "pothole_count": metric.pothole_count,
                "authority": auth.name if auth else seg.authority_id,
                "status": metric.status or "none",
                "weekly_change": metric.trend or 0.0,
                "week": week
            }
        }
        features.append(feature)
        
    return {
        "type": "FeatureCollection",
        "features": features
    }
