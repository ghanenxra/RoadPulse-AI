from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.database import RoadSegment, WeeklyRoadMetric

def aggregate_detections_to_weekly(detections, segment: RoadSegment, week: int, prev_metric: WeeklyRoadMetric = None):
    # This function is a placeholder for aggregating new detections.
    # We mainly rely on seed data for this prototype.
    pass

def get_road_summary(segment_id: str, week: int, db: Session) -> dict:
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        return None
    metrics = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.segment_id == segment_id, WeeklyRoadMetric.week == week).first()
    return {
        "segment": seg,
        "metrics": metrics
    }

def get_priority_roads(week: int, db: Session, limit: int = 10):
    return db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == week).order_by(desc(WeeklyRoadMetric.risk_score)).limit(limit).all()
