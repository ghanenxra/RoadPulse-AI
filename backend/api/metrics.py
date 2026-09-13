from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models.database import get_db, RoadSegment, WeeklyRoadMetric, Detection, IssueReport, RepairVerification, ProcessingJob
from backend.schemas.api_schemas import OverviewMetricsResponse

router = APIRouter()

def get_kpi(current, previous):
    change = current - previous
    change_pct = (change / previous * 100) if previous > 0 else 0
    return {"value": current, "previous": previous, "change": change, "change_pct": round(change_pct, 2)}

@router.get('/api/metrics/overview')
def get_overview_metrics(week: int = 4, db: Session = Depends(get_db)):
    prev_week = week - 1
    
    # Calculate current values
    metrics_current = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == week).all()
    metrics_prev = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == prev_week).all()
    
    roads_surveyed = len(metrics_current)
    prev_roads_surveyed = len(metrics_prev)
    
    total_potholes = sum(m.pothole_count for m in metrics_current)
    prev_potholes = sum(m.pothole_count for m in metrics_prev)
    
    dangerous_segments = sum(1 for m in metrics_current if m.grade in ['D', 'E'])
    prev_dangerous = sum(1 for m in metrics_prev if m.grade in ['D', 'E'])
    
    avg_risk = sum(m.risk_score for m in metrics_current) / roads_surveyed if roads_surveyed else 0
    prev_avg_risk = sum(m.risk_score for m in metrics_prev) / prev_roads_surveyed if prev_roads_surveyed else 0
    
    pending_repairs = db.query(IssueReport).filter(IssueReport.status.in_(['reported', 'acknowledged', 'in_progress'])).count()
    prev_pending = max(0, pending_repairs - random.randint(0, 5)) # Mocked prev
    
    verified_repairs = db.query(RepairVerification).filter(RepairVerification.result == 'verified', RepairVerification.survey_week == week).count()
    prev_verified = db.query(RepairVerification).filter(RepairVerification.result == 'verified', RepairVerification.survey_week == prev_week).count()
    
    uploads_processed = db.query(ProcessingJob).filter(ProcessingJob.status == 'completed').count()
    prev_uploads = uploads_processed - 3 # Mocked
    
    survey_coverage_pct = 92.5
    prev_coverage = 90.0
    
    # Distributions
    grade_dist = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0}
    for m in metrics_current:
        if m.grade in grade_dist:
            grade_dist[m.grade] += 1
            
    processing_status = {
        'completed': db.query(ProcessingJob).filter(ProcessingJob.status == 'completed').count(),
        'processing': db.query(ProcessingJob).filter(ProcessingJob.status == 'processing').count(),
        'failed': db.query(ProcessingJob).filter(ProcessingJob.status == 'failed').count()
    }
    
    accountability_snapshot = {
        'reported': db.query(IssueReport).filter(IssueReport.status == 'reported').count(),
        'acknowledged': db.query(IssueReport).filter(IssueReport.status == 'acknowledged').count(),
        'in_progress': db.query(IssueReport).filter(IssueReport.status == 'in_progress').count(),
        'repaired': db.query(IssueReport).filter(IssueReport.status == 'repaired').count(),
        'verified': db.query(IssueReport).filter(IssueReport.status == 'verified').count(),
        'failed_verification': db.query(IssueReport).filter(IssueReport.status == 'failed_verification').count(),
        'overdue': db.query(IssueReport).filter(IssueReport.status == 'overdue').count(),
    }
    
    return {
        "roads_surveyed": get_kpi(roads_surveyed, prev_roads_surveyed),
        "total_potholes": get_kpi(total_potholes, prev_potholes),
        "dangerous_segments": get_kpi(dangerous_segments, prev_dangerous),
        "avg_risk_score": get_kpi(round(avg_risk, 2), round(prev_avg_risk, 2)),
        "pending_repairs": get_kpi(pending_repairs, prev_pending),
        "verified_repairs": get_kpi(verified_repairs, prev_verified),
        "uploads_processed": get_kpi(uploads_processed, prev_uploads),
        "survey_coverage_pct": get_kpi(survey_coverage_pct, prev_coverage),
        "grade_distribution": grade_dist,
        "processing_status": processing_status,
        "accountability_snapshot": accountability_snapshot
    }

import random

@router.get('/api/metrics/weekly')
def get_weekly_metrics(db: Session = Depends(get_db)):
    weeks_data = []
    for w in range(1, 5):
        metrics = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.week == w).all()
        count = len(metrics)
        avg_risk = sum(m.risk_score for m in metrics) / count if count else 0
        total_potholes = sum(m.pothole_count for m in metrics)
        dangerous_count = sum(1 for m in metrics if m.grade in ['D', 'E'])
        total_detections = db.query(Detection).filter(Detection.week == w).count()
        
        weeks_data.append({
            "week": w,
            "avg_risk": round(avg_risk, 2),
            "total_potholes": total_potholes,
            "dangerous_count": dangerous_count,
            "total_detections": total_detections
        })
    return weeks_data
