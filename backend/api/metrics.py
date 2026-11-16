from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.database import get_db, RoadSegment, WeeklyRoadMetric, Detection, IssueReport, RepairVerification, ProcessingJob
from schemas.api_schemas import OverviewMetricsResponse

router = APIRouter()


def get_kpi(current: Optional[float], previous: Optional[float]) -> dict:
    """
    Computes comparative metrics between two periods.
    If previous-period data is not available, explicitly returns None rather than
    fabricating 0.0 or pretending zero change occurred.
    """
    if current is None or previous is None:
        return {
            "current": current if current is not None else 0.0,
            "value": current if current is not None else 0.0,
            "previous": previous,
            "change": None,
            "change_pct": None
        }

    change = round(current - previous, 2)
    if previous > 0:
        change_pct = round((change / previous) * 100, 2)
    elif change == 0:
        change_pct = 0.0
    else:
        change_pct = 100.0

    return {
        "current": current,
        "value": current,
        "previous": previous,
        "change": change,
        "change_pct": change_pct
    }


@router.get('/api/metrics/overview')
def get_overview_metrics(week: int = 4, db: Session = Depends(get_db)):
    prev_week = (week - 1) if week > 1 else None

    metrics_current = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == week).all()
    metrics_prev = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == prev_week).all() if prev_week else []

    roads_surveyed = len(metrics_current)
    prev_roads_surveyed = len(metrics_prev) if metrics_prev else None

    total_potholes = sum(m.pothole_count for m in metrics_current) if metrics_current else 0
    prev_potholes = sum(m.pothole_count for m in metrics_prev) if metrics_prev else None

    dangerous_segments = sum(1 for m in metrics_current if m.grade in ['D', 'E']) if metrics_current else 0
    prev_dangerous = sum(1 for m in metrics_prev if m.grade in ['D', 'E']) if metrics_prev else None

    avg_risk = (sum(m.risk_score for m in metrics_current) / roads_surveyed) if roads_surveyed else 0.0
    prev_avg_risk = (sum(m.risk_score for m in metrics_prev) / prev_roads_surveyed) if prev_roads_surveyed else None

    # Pending repairs: active open tickets
    pending_repairs = db.query(IssueReport).filter(
        IssueReport.status.in_(['reported', 'acknowledged', 'in_progress', 'overdue'])
    ).count()

    # Verified repairs for the specific survey week
    verified_repairs = db.query(RepairVerification).filter(
        RepairVerification.survey_week == week,
        RepairVerification.result == 'verified'
    ).count()
    prev_verified = db.query(RepairVerification).filter(
        RepairVerification.survey_week == prev_week,
        RepairVerification.result == 'verified'
    ).count() if prev_week else None

    # Uploads completed in processing queue
    uploads_processed = db.query(ProcessingJob).filter(ProcessingJob.status == 'completed').count()

    total_roads = db.query(RoadSegment).count()
    survey_coverage_pct = round((roads_surveyed / total_roads) * 100, 1) if total_roads else 0.0
    prev_coverage = round((prev_roads_surveyed / total_roads) * 100, 1) if (total_roads and prev_roads_surveyed is not None) else None

    grade_dist = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0}
    for m in metrics_current:
        if m.grade in grade_dist:
            grade_dist[m.grade] += 1

    processing_status = {
        'completed': db.query(ProcessingJob).filter(ProcessingJob.status == 'completed').count(),
        'processing': db.query(ProcessingJob).filter(ProcessingJob.status == 'processing').count(),
        'failed': db.query(ProcessingJob).filter(ProcessingJob.status == 'failed').count(),
        'total_frames': sum(j.frames_processed for j in db.query(ProcessingJob).all())
    }

    accountability_snapshot = {
        'reported': db.query(IssueReport).filter(IssueReport.status == 'reported').count(),
        'acknowledged': db.query(IssueReport).filter(IssueReport.status == 'acknowledged').count(),
        'in_progress': db.query(IssueReport).filter(IssueReport.status == 'in_progress').count(),
        'claimed_repaired': db.query(IssueReport).filter(IssueReport.status.in_(['repaired', 'claimed_repaired'])).count(),
        'verified': db.query(IssueReport).filter(IssueReport.status == 'verified').count(),
        'failed_verification': db.query(IssueReport).filter(IssueReport.status == 'failed_verification').count(),
        'overdue': db.query(IssueReport).filter(IssueReport.status == 'overdue').count(),
    }

    cov_kpi = get_kpi(survey_coverage_pct, prev_coverage)

    return {
        "roads_surveyed": get_kpi(roads_surveyed, prev_roads_surveyed),
        "total_potholes": get_kpi(total_potholes, prev_potholes),
        "dangerous_segments": get_kpi(dangerous_segments, prev_dangerous),
        "avg_risk_score": get_kpi(round(avg_risk, 1) if avg_risk is not None else None,
                                  round(prev_avg_risk, 1) if prev_avg_risk is not None else None),
        "pending_repairs": get_kpi(pending_repairs, None),  # Previous pending cannot be inferred without historical state snapshot
        "verified_repairs": get_kpi(verified_repairs, prev_verified),
        "uploads_processed": get_kpi(uploads_processed, None),  # Queue total has no historical week bucket
        "survey_coverage": cov_kpi,
        "survey_coverage_pct": cov_kpi,
        "grade_distribution": grade_dist,
        "processing_status": processing_status,
        "accountability_snapshot": accountability_snapshot
    }


@router.get('/api/metrics/weekly')
def get_weekly_metrics(db: Session = Depends(get_db)):
    weeks_data = []
    for w in range(1, 5):
        metrics = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == w).all()
        count = len(metrics)
        avg_risk = sum(m.risk_score for m in metrics) / count if count else 0.0
        total_potholes = sum(m.pothole_count for m in metrics)
        dangerous_count = sum(1 for m in metrics if m.grade in ['D', 'E'])
        weeks_data.append({
            "week": w,
            "avg_risk": round(avg_risk, 1),
            "total_potholes": total_potholes,
            "dangerous_count": dangerous_count,
            "corridors_surveyed": count
        })
    return weeks_data
