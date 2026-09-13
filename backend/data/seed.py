import json
import math
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models.database import (
    Base, engine, Authority, RoadSegment, Bus, ChargingStation, VideoAsset,
    Detection, PotholeCluster, WeeklyRoadMetric, IssueReport, RepairVerification, ProcessingJob
)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def clear_database(db: Session):
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()

def seed_database(db: Session):
    clear_database(db)
    
    with open("C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/data/demo-data.json", "r") as f:
        demo_data = json.load(f)
        
    random.seed(42)
    now = datetime.utcnow()
    
    # Authorities
    authorities = {}
    for seg in demo_data["segments"]:
        auth_name = seg["authority"]
        if auth_name not in authorities:
            auth_id = f"AUTH-{len(authorities)+1}"
            authorities[auth_name] = auth_id
            db.add(Authority(authority_id=auth_id, name=auth_name, zone=demo_data["city"]))
    
    # Road Segments & Metrics
    for seg in demo_data["segments"]:
        start_lat, start_lon = seg["coords"][0]
        end_lat, end_lon = seg["coords"][1]
        length_km = haversine(start_lat, start_lon, end_lat, end_lon)
        if length_km < 0.1: length_km = 1.0 # fallback
        
        db.add(RoadSegment(
            segment_id=seg["id"],
            road_name=seg["road"],
            sub_name=seg["sub"],
            start_lat=start_lat, start_lon=start_lon,
            end_lat=end_lat, end_lon=end_lon,
            length_km=length_km,
            authority_id=authorities[seg["authority"]],
            ward=seg["ward"]
        ))
        
        prev_risk = None
        for w in seg["weeks"]:
            grade = "E" if w["grade"] == "F" else w["grade"]
            trend = w["risk"] - prev_risk if prev_risk is not None else 0
            prev_risk = w["risk"]
            density = w["potholes"] / length_km
            
            db.add(WeeklyRoadMetric(
                segment_id=seg["id"],
                week=w["week"],
                date=w["date"],
                pothole_count=w["potholes"],
                severe_count=int(w["potholes"] * 0.3),
                density=density,
                severity_avg=w["severity"],
                depth_avg_cm=w["depth_cm"],
                rain_mm=w["rain_mm"],
                trend=trend,
                context_score=10.0,
                risk_score=w["risk"],
                grade=grade,
                status=w["status"],
                note=w["note"]
            ))
            
            # Synthetic Detections
            for i in range(w["potholes"]):
                lat = start_lat + (end_lat - start_lat) * random.random() + random.uniform(-0.0005, 0.0005)
                lon = start_lon + (end_lon - start_lon) * random.random() + random.uniform(-0.0005, 0.0005)
                sev_label = "Low" if w["severity"] < 2.5 else "Medium" if w["severity"] < 3.5 else "High"
                db.add(Detection(
                    detection_id=f"DET-{seg['id']}-{w['week']}-{i}",
                    bus_id="BUS-1",
                    timestamp=now - timedelta(days=(4-w["week"])*7),
                    latitude=lat, longitude=lon,
                    confidence=random.uniform(0.75, 0.98),
                    severity=w["severity"],
                    severity_label=sev_label,
                    depth_cm=w["depth_cm"],
                    road_segment_id=seg["id"],
                    week=w["week"]
                ))
            
            # Mock issue report for specific statuses
            if w["status"] in ["reported", "overdue", "in_progress", "repaired", "verified"]:
                issue = db.query(IssueReport).filter_by(segment_id=seg["id"]).first()
                if not issue:
                    issue_id = f"ISS-{seg['id']}"
                    db.add(IssueReport(
                        issue_id=issue_id,
                        segment_id=seg["id"],
                        authority_id=authorities[seg["authority"]],
                        priority="High" if w["risk"] > 60 else "Medium",
                        risk_score=w["risk"],
                        sent_at=now - timedelta(days=14),
                        status=w["status"]
                    ))
                    if w["status"] in ["verified", "repaired"]:
                        db.add(RepairVerification(
                            verification_id=f"VER-{issue_id}",
                            issue_id=issue_id,
                            survey_week=w["week"],
                            result="verified" if w["status"] == "verified" else "partial",
                            before_score=85.0, after_score=w["risk"]
                        ))
    
    # Buses and Stations
    db.add(ChargingStation(station_id="CS-1", name="JMC Main Depot", latitude=26.9, longitude=75.8, network_id="JCTSL"))
    for i in range(1, 4):
        db.add(Bus(bus_id=f"BUS-{i}", route_id=f"R-{i}", camera_id=f"CAM-{i}", charging_station_id="CS-1"))
        for w in range(1, 5):
            vid = f"VID-{i}-{w}"
            db.add(VideoAsset(video_id=vid, bus_id=f"BUS-{i}", route_id=f"R-{i}", upload_time=now, duration_seconds=3600.0, metadata_source="sim", status="processed"))
            db.add(ProcessingJob(job_id=f"JOB-{vid}", video_id=vid, bus_id=f"BUS-{i}", source="upload", status="completed", progress=100.0, created_at=now, completed_at=now))
            
    db.commit()
