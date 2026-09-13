import os
import json
import math
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models.database import (
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
    
    data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo-data.json")
    with open(data_path, "r", encoding="utf-8") as f:
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
            db.add(Authority(
                authority_id=auth_id,
                name=auth_name,
                department="Public Works / Municipal Road Maintenance",
                zone=demo_data["city"],
                contact_email=f"roads@{auth_name.lower().replace(' ', '').replace('(', '').replace(')', '')}.gov.in"
            ))
    
    # Road Segments & Metrics
    for seg in demo_data["segments"]:
        start_lat, start_lon = seg["coords"][0]
        end_lat, end_lon = seg["coords"][1]
        length_km = round(haversine(start_lat, start_lon, end_lat, end_lon), 2)
        if length_km < 0.2:
            length_km = 1.25
        
        db.add(RoadSegment(
            segment_id=seg["id"],
            road_name=seg["road"],
            sub_name=seg["sub"],
            start_lat=start_lat, start_lon=start_lon,
            end_lat=end_lat, end_lon=end_lon,
            length_km=length_km,
            road_type="Arterial Urban Transit Corridor",
            authority_id=authorities[seg["authority"]],
            ward=seg["ward"]
        ))
        
        prev_risk = None
        for w in seg["weeks"]:
            grade = "E" if w["grade"] == "F" else w["grade"]
            trend = round(w["risk"] - prev_risk, 2) if prev_risk is not None else 0.0
            prev_risk = w["risk"]
            density = round(w["potholes"] / length_km, 2)
            
            db.add(WeeklyRoadMetric(
                segment_id=seg["id"],
                week=w["week"],
                date=w["date"],
                pothole_count=w["potholes"],
                severe_count=max(1, int(w["potholes"] * 0.35)) if w["potholes"] > 0 else 0,
                density=density,
                severity_avg=w["severity"],
                depth_avg_cm=w["depth_cm"],
                rain_mm=w["rain_mm"],
                trend=trend,
                context_score=round(10.0 + (w["rain_mm"] * 0.5), 1),
                risk_score=float(w["risk"]),
                grade=grade,
                status=w["status"],
                note=w["note"],
                surveyed=True,
                coverage_confidence=0.92
            ))
            
            # Synthetic individual pothole detections
            for i in range(w["potholes"]):
                t = random.random()
                lat = start_lat + (end_lat - start_lat) * t + random.uniform(-0.0003, 0.0003)
                lon = start_lon + (end_lon - start_lon) * t + random.uniform(-0.0003, 0.0003)
                sev_label = "Low" if w["severity"] < 2.5 else "Medium" if w["severity"] < 3.8 else "High"
                det_id = f"DET-{seg['id']}-W{w['week']}-{i+1}"
                bus_id = f"BUS-{((i % 3) + 1)}"
                db.add(Detection(
                    detection_id=det_id,
                    video_id=f"VID-{((i % 3) + 1)}-{w['week']}",
                    bus_id=bus_id,
                    frame_number=1200 + (i * 150),
                    timestamp=now - timedelta(days=(4 - w["week"]) * 7, hours=random.randint(1, 10)),
                    latitude=round(lat, 6),
                    longitude=round(lon, 6),
                    confidence=round(random.uniform(0.78, 0.97), 2),
                    severity=w["severity"],
                    severity_label=sev_label,
                    depth_cm=w["depth_cm"],
                    bbox=json.dumps({"x": round(random.uniform(0.2, 0.7), 2), "y": round(random.uniform(0.4, 0.8), 2), "w": 0.15, "h": 0.12}),
                    road_segment_id=seg["id"],
                    evidence_path=None,
                    data_source="simulated_demo",
                    week=w["week"]
                ))
            
            # Clusters
            if w["potholes"] > 0:
                cluster_count = max(1, w["potholes"] // 3)
                for c_idx in range(cluster_count):
                    c_lat = start_lat + (end_lat - start_lat) * ((c_idx + 0.5) / cluster_count)
                    c_lon = start_lon + (end_lon - start_lon) * ((c_idx + 0.5) / cluster_count)
                    db.add(PotholeCluster(
                        cluster_id=f"CLUS-{seg['id']}-W{w['week']}-{c_idx+1}",
                        segment_id=seg["id"],
                        centroid_lat=round(c_lat, 6),
                        centroid_lon=round(c_lon, 6),
                        detection_count=max(1, w["potholes"] // cluster_count),
                        first_seen=now - timedelta(days=28),
                        last_seen=now - timedelta(days=(4 - w["week"]) * 7),
                        avg_severity=w["severity"]
                    ))
        
        # Issue reports
        latest_w = seg["weeks"][-1]
        active_weeks = [w for w in seg["weeks"] if w["status"] not in ["none", ""]]
        
        if active_weeks:
            first_report_week = active_weeks[0]
            issue_id = f"ISS-{seg['id']}"
            
            sent_days_ago = (4 - first_report_week["week"] + 1) * 7
            sent_at = now - timedelta(days=sent_days_ago)
            due_at = sent_at + timedelta(days=21)
            
            ack_at = None
            if latest_w["status"] in ["acknowledged", "in_progress", "repaired", "verified", "overdue"]:
                ack_at = sent_at + timedelta(days=2)
                
            claimed_at = None
            if latest_w["status"] in ["repaired", "verified"]:
                claimed_at = now - timedelta(days=5)
                
            db.add(IssueReport(
                issue_id=issue_id,
                segment_id=seg["id"],
                authority_id=authorities[seg["authority"]],
                priority="High" if latest_w["risk"] > 60 else "Medium",
                risk_score=float(latest_w["risk"]),
                sent_at=sent_at,
                due_at=due_at,
                acknowledged_at=ack_at,
                status=latest_w["status"],
                repair_claimed_at=claimed_at,
                notes=latest_w["note"],
                data_source="simulated_demo"
            ))
            
            if latest_w["status"] in ["verified", "repaired"]:
                db.add(RepairVerification(
                    verification_id=f"VER-{issue_id}",
                    issue_id=issue_id,
                    survey_week=latest_w["week"],
                    result="verified" if latest_w["status"] == "verified" else "partial",
                    before_score=float(seg["weeks"][0]["risk"]),
                    after_score=float(latest_w["risk"]),
                    notes=latest_w["note"],
                    verified_at=now - timedelta(days=1)
                ))
    
    # Buses and Stations
    db.add(ChargingStation(
        station_id="CS-1",
        name="JCTSL Sanganer Central Charging Hub",
        latitude=26.825,
        longitude=75.805,
        network_id="JCTSL-EV-NET-01"
    ))
    db.add(ChargingStation(
        station_id="CS-2",
        name="Vidhyadhar Nagar Bus Depot Terminal",
        latitude=26.960,
        longitude=75.790,
        network_id="JCTSL-EV-NET-02"
    ))
    
    for i in range(1, 4):
        bus_id = f"BUS-{i}"
        db.add(Bus(
            bus_id=bus_id,
            route_id=f"ROUTE-{10 + i}",
            camera_id=f"NVDR-CAM-4K-0{i}",
            charging_station_id="CS-1" if i < 3 else "CS-2"
        ))
        for w in range(1, 5):
            vid = f"VID-{i}-{w}"
            upload_dt = now - timedelta(days=(4 - w) * 7 + i)
            duration_s = 3600.0 + (i * 300)
            frames = int(duration_s * 30)
            db.add(VideoAsset(
                video_id=vid,
                bus_id=bus_id,
                route_id=f"ROUTE-{10 + i}",
                upload_time=upload_dt,
                duration_seconds=duration_s,
                metadata_source="NVDR_GPS_SYNC",
                status="processed",
                file_path=None
            ))
            db.add(ProcessingJob(
                job_id=f"JOB-{vid}",
                video_id=vid,
                bus_id=bus_id,
                source="charging_station_sync",
                status="completed",
                progress=100.0,
                frames_total=frames,
                frames_processed=frames,
                detections_count=18 + (w * 3) + i,
                provider="mock_yolo_v8",
                model_version="yolov8n-rdd2022-v1.2",
                processing_duration_seconds=42.5,
                error=None,
                created_at=upload_dt,
                completed_at=upload_dt + timedelta(minutes=2)
            ))
            
    db.commit()
