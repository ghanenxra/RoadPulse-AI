from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend.models.database import get_db, RoadSegment, WeeklyRoadMetric, Detection, IssueReport, RepairVerification
from backend.schemas.api_schemas import RoadSegmentResponse, RoadSegmentDetailResponse, MapGeoJSONResponse
import json

router = APIRouter()

@router.get('/api/roads')
def get_roads(week: int = 4, grade: str = None, authority: str = None, status: str = None, search: str = None, db: Session = Depends(get_db)):
    query = db.query(RoadSegment)
    if authority:
        query = query.filter(RoadSegment.authority_id == authority)
    if search:
        query = query.filter(RoadSegment.road_name.ilike(f'%{search}%'))
        
    segments = query.all()
    results = []
    for seg in segments:
        metric = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.segment_id == seg.segment_id, WeeklyRoadMetric.week == week).first()
        if grade and metric and metric.grade != grade:
            continue
        if status and metric and metric.status != status:
            continue
        
        results.append({
            "id": seg.segment_id,
            "road": seg.road_name,
            "sub": seg.sub_name,
            "authority": seg.authority.name if seg.authority else seg.authority_id,
            "ward": seg.ward,
            "coords": [[seg.start_lat, seg.start_lon], [seg.end_lat, seg.end_lon]],
            "current_metrics": metric.__dict__ if metric else None
        })
    return results

@router.get('/api/roads/{segment_id}')
def get_road_detail(segment_id: str, db: Session = Depends(get_db)):
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
        
    weeks = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.segment_id == segment_id).order_by(WeeklyRoadMetric.week).all()
    issues = db.query(IssueReport).filter(IssueReport.segment_id == segment_id).all()
    
    verifications = []
    for issue in issues:
        verifs = db.query(RepairVerification).filter(RepairVerification.issue_id == issue.issue_id).all()
        verifications.extend(verifs)
        
    detections = db.query(Detection).filter(Detection.road_segment_id == segment_id).all()
    
    return {
        "id": seg.segment_id,
        "road": seg.road_name,
        "sub": seg.sub_name,
        "authority": seg.authority.name if seg.authority else seg.authority_id,
        "ward": seg.ward,
        "coords": [[seg.start_lat, seg.start_lon], [seg.end_lat, seg.end_lon]],
        "weeks": [w.__dict__ for w in weeks],
        "issues": [i.__dict__ for i in issues],
        "verifications": [v.__dict__ for v in verifications],
        "detections": [d.__dict__ for d in detections]
    }

@router.get('/api/map')
def get_map_geojson(week: int = 4, db: Session = Depends(get_db)):
    features = []
    segments = db.query(RoadSegment).all()
    for seg in segments:
        metric = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.segment_id == seg.segment_id, WeeklyRoadMetric.week == week).first()
        if not metric: continue
        
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[seg.start_lon, seg.start_lat], [seg.end_lon, seg.end_lat]]
            },
            "properties": {
                "segment_id": seg.segment_id,
                "road_name": seg.road_name,
                "sub_name": seg.sub_name,
                "risk_score": metric.risk_score,
                "grade": metric.grade,
                "pothole_count": metric.pothole_count,
                "authority": seg.authority.name if seg.authority else seg.authority_id,
                "status": metric.status,
                "weekly_change": metric.trend
            }
        }
        features.append(feature)
        
    return {"type": "FeatureCollection", "features": features}
