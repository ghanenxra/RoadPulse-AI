"""
aggregation_service.py
───────────────────────
Aggregates detection records into road segment summaries and weekly metrics.
Calculates pothole density, severity distributions, depth averages, and trend progression.
"""

from typing import List, Optional, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.database import RoadSegment, WeeklyRoadMetric
from services.scoring_service import calculate_risk_score, get_grade


def aggregate_detections_to_weekly(
    detections: List[Any],
    segment: RoadSegment,
    week: int,
    prev_metric: Optional[WeeklyRoadMetric] = None,
    db: Optional[Session] = None
) -> WeeklyRoadMetric:
    """
    Aggregates a collection of detections for a road segment into a structured WeeklyRoadMetric.
    Handles empty detection sets, missing depth values, and historical trend calculations safely.
    """
    if not segment:
        raise ValueError("Cannot aggregate detections: valid RoadSegment is required")

    now_str = datetime.now(timezone.utc).replace(tzinfo=None).strftime("%Y-%m-%d")
    count = len(detections) if detections else 0
    length_km = segment.length_km if (segment.length_km and segment.length_km > 0) else 1.0

    if count == 0:
        avg_sev = 1.0
        high_count = 0
        avg_depth = None
        density = 0.0
    else:
        # Extract severity values safely
        valid_sevs = []
        for d in detections:
            s = getattr(d, 'severity', None) if hasattr(d, 'severity') else (d.get('severity') if isinstance(d, dict) else None)
            if s is not None:
                try:
                    valid_sevs.append(float(s))
                except (ValueError, TypeError):
                    pass

        avg_sev = round(sum(valid_sevs) / len(valid_sevs), 2) if valid_sevs else 2.5

        # Count high-severity potholes (>= 3.8 or labeled High)
        high_count = 0
        for d in detections:
            lbl = getattr(d, 'severity_label', None) if hasattr(d, 'severity_label') else (d.get('severity_label') if isinstance(d, dict) else None)
            sev = getattr(d, 'severity', None) if hasattr(d, 'severity') else (d.get('severity') if isinstance(d, dict) else None)
            if lbl == "High" or (sev is not None and float(sev) >= 3.8):
                high_count += 1

        # Extract depth measurements only when available (do not fabricate)
        valid_depths = []
        for d in detections:
            dp = getattr(d, 'depth_cm', None) if hasattr(d, 'depth_cm') else (d.get('depth_cm') if isinstance(d, dict) else None)
            if dp is not None:
                try:
                    valid_depths.append(float(dp))
                except (ValueError, TypeError):
                    pass

        avg_depth = round(sum(valid_depths) / len(valid_depths), 1) if valid_depths else None
        density = round(count / length_km, 2)

    # Weather context: inherit from prior metric if present, else None
    rain_mm = prev_metric.rain_mm if (prev_metric and prev_metric.rain_mm is not None) else None

    # Calculate baseline risk score
    risk = calculate_risk_score(
        severity=avg_sev,
        density=density,
        trend=0.0,
        rain_mm=rain_mm
    )
    grade = get_grade(risk)

    # Calculate meaningful historical trend if previous metric exists
    if prev_metric and prev_metric.risk_score is not None:
        if prev_metric.risk_score > 0:
            trend = round(((risk - prev_metric.risk_score) / prev_metric.risk_score) * 100, 2)
        else:
            trend = 0.0
        # Re-score including the historical trend
        risk = calculate_risk_score(
            severity=avg_sev,
            density=density,
            trend=trend,
            rain_mm=rain_mm
        )
        grade = get_grade(risk)
    else:
        trend = 0.0

    if db:
        metric = db.query(WeeklyRoadMetric).filter(
            WeeklyRoadMetric.segment_id == segment.segment_id,
            WeeklyRoadMetric.week == week
        ).first()

        if metric:
            metric.date = now_str
            metric.pothole_count = count
            metric.severe_count = high_count
            metric.density = density
            metric.severity_avg = avg_sev
            metric.depth_avg_cm = avg_depth
            metric.trend = trend
            metric.risk_score = risk
            metric.grade = grade
            metric.status = "aggregated"
            metric.surveyed = True
        else:
            metric = WeeklyRoadMetric(
                segment_id=segment.segment_id,
                week=week,
                date=now_str,
                pothole_count=count,
                severe_count=high_count,
                density=density,
                severity_avg=avg_sev,
                depth_avg_cm=avg_depth,
                rain_mm=rain_mm,
                trend=trend,
                context_score=10.0,
                risk_score=risk,
                grade=grade,
                status="aggregated",
                surveyed=True,
                coverage_confidence=0.90,
                data_source="aggregated"
            )
            db.add(metric)
        db.commit()
        db.refresh(metric)
        return metric

    return WeeklyRoadMetric(
        segment_id=segment.segment_id,
        week=week,
        date=now_str,
        pothole_count=count,
        severe_count=high_count,
        density=density,
        severity_avg=avg_sev,
        depth_avg_cm=avg_depth,
        rain_mm=rain_mm,
        trend=trend,
        context_score=10.0,
        risk_score=risk,
        grade=grade,
        status="aggregated",
        surveyed=True,
        coverage_confidence=0.90,
        data_source="aggregated"
    )


def get_road_summary(segment_id: str, week: int, db: Session) -> Optional[dict]:
    seg = db.query(RoadSegment).filter(RoadSegment.segment_id == segment_id).first()
    if not seg:
        return None
    metrics = db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.segment_id == segment_id,
        WeeklyRoadMetric.week == week
    ).first()
    return {
        "segment": seg,
        "metrics": metrics
    }


def get_priority_roads(week: int, db: Session, limit: int = 10):
    return db.query(WeeklyRoadMetric).filter(
        WeeklyRoadMetric.week == week
    ).order_by(desc(WeeklyRoadMetric.risk_score)).limit(limit).all()
