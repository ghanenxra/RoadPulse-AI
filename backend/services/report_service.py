import os
import csv
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session
from backend.models.database import RoadSegment, Detection, WeeklyRoadMetric, IssueReport, ProcessingJob

def generate_weekly_pdf(week: int, db: Session, zone: str = None, authority: str = None) -> str:
    os.makedirs("C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/reports", exist_ok=True)
    file_path = f"C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/reports/weekly_report_w{week}.pdf"
    
    c = canvas.Canvas(file_path, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "RoadPulse AI - Weekly Report")
    c.setFont("Helvetica", 12)
    c.drawString(100, 730, f"SIMULATED DEMO DATA - Week {week}")
    c.drawString(100, 710, "Executive Summary: Total roads analyzed and risk score summary.")
    c.drawString(100, 690, "Methodology Note: AI model confidence 85%.")
    
    c.save()
    return file_path

def _write_csv(filename: str, headers: list, rows: list) -> str:
    os.makedirs("C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/reports", exist_ok=True)
    file_path = f"C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/reports/{filename}"
    with open(file_path, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["# SIMULATED DEMO DATA"])
        writer.writerow(headers)
        writer.writerows(rows)
    return file_path

def export_detections_csv(db: Session, week: int = None) -> str:
    q = db.query(Detection)
    if week: q = q.filter(Detection.week == week)
    rows = [[d.detection_id, d.latitude, d.longitude, d.severity, d.severity_label, d.week] for d in q.all()]
    return _write_csv(f"detections_w{week}.csv" if week else "detections_all.csv", ["id", "lat", "lon", "severity", "label", "week"], rows)

def export_road_segments_csv(db: Session) -> str:
    rows = [[r.segment_id, r.road_name, r.length_km, r.ward] for r in db.query(RoadSegment).all()]
    return _write_csv("road_segments.csv", ["id", "name", "length_km", "ward"], rows)

def export_weekly_history_csv(db: Session) -> str:
    rows = [[m.segment_id, m.week, m.pothole_count, m.risk_score, m.grade] for m in db.query(WeeklyRoadMetric).all()]
    return _write_csv("weekly_history.csv", ["segment_id", "week", "potholes", "risk", "grade"], rows)

def export_authority_actions_csv(db: Session) -> str:
    rows = [[i.issue_id, i.segment_id, i.status, i.priority] for i in db.query(IssueReport).all()]
    return _write_csv("authority_actions.csv", ["issue_id", "segment_id", "status", "priority"], rows)

def export_processing_jobs_csv(db: Session) -> str:
    rows = [[j.job_id, j.status, j.progress, j.detections_count] for j in db.query(ProcessingJob).all()]
    return _write_csv("processing_jobs.csv", ["job_id", "status", "progress", "detections"], rows)
