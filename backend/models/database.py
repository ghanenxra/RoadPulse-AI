import os
from datetime import datetime
from typing import Any

from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DB_PATH = "sqlite:///./roadpulse.db"
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BACKEND_DIR, "roadpulse.db")
DB_PATH = f"sqlite:///{DB_FILE}"
engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)

class Authority(Base):
    __tablename__ = "authority"
    authority_id = Column(String, primary_key=True)
    name = Column(String)
    department = Column(String, nullable=True)
    zone = Column(String, default="Jaipur")
    contact_email = Column(String, nullable=True)

class RoadSegment(Base):
    __tablename__ = "road_segment"
    segment_id = Column(String, primary_key=True)
    road_name = Column(String)
    sub_name = Column(String)
    start_lat = Column(Float)
    start_lon = Column(Float)
    end_lat = Column(Float)
    end_lon = Column(Float)
    length_km = Column(Float)
    road_type = Column(String, default="Urban")
    authority_id = Column(String, ForeignKey("authority.authority_id"))
    ward = Column(String)
    polyline_coords = Column(Text, nullable=True)
    authority = relationship("Authority")
    metrics = relationship("WeeklyRoadMetric", back_populates="segment")

class Bus(Base):
    __tablename__ = "bus"
    bus_id = Column(String, primary_key=True)
    route_id = Column(String)
    camera_id = Column(String)
    charging_station_id = Column(String)

class ChargingStation(Base):
    __tablename__ = "charging_station"
    station_id = Column(String, primary_key=True)
    name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    network_id = Column(String)

class VideoAsset(Base):
    __tablename__ = "video_asset"
    video_id = Column(String, primary_key=True)
    bus_id = Column(String, ForeignKey("bus.bus_id"))
    route_id = Column(String)
    upload_time = Column(DateTime)
    duration_seconds = Column(Float)
    metadata_source = Column(String)
    status = Column(String)
    file_path = Column(String, nullable=True)

class Detection(Base):
    __tablename__ = "detection"
    detection_id = Column(String, primary_key=True)
    video_id = Column(String, ForeignKey("video_asset.video_id"), nullable=True)
    bus_id = Column(String)
    frame_number = Column(Integer, nullable=True)
    timestamp = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)
    confidence = Column(Float)
    severity = Column(Float)
    severity_label = Column(String)
    depth_cm = Column(Float, nullable=True)
    bbox = Column(String, nullable=True) # JSON
    road_segment_id = Column(String, ForeignKey("road_segment.segment_id"))
    evidence_path = Column(String, nullable=True)
    data_source = Column(String, default="simulated_demo")
    week = Column(Integer)

class PotholeCluster(Base):
    __tablename__ = "pothole_cluster"
    cluster_id = Column(String, primary_key=True)
    segment_id = Column(String, ForeignKey("road_segment.segment_id"))
    centroid_lat = Column(Float)
    centroid_lon = Column(Float)
    detection_count = Column(Integer)
    first_seen = Column(DateTime)
    last_seen = Column(DateTime)
    avg_severity = Column(Float)

class WeeklyRoadMetric(Base):
    __tablename__ = "weekly_road_metric"
    id = Column(Integer, primary_key=True, autoincrement=True)
    segment_id = Column(String, ForeignKey("road_segment.segment_id"))
    week = Column(Integer)
    date = Column(String)
    pothole_count = Column(Integer)
    severe_count = Column(Integer)
    density = Column(Float)
    severity_avg = Column(Float)
    depth_avg_cm = Column(Float)
    rain_mm = Column(Float)
    trend = Column(Float)
    context_score = Column(Float)
    risk_score = Column(Float)
    grade = Column(String)
    status = Column(String)
    note = Column(String)
    surveyed = Column(Boolean, default=True)
    coverage_confidence = Column(Float, default=0.85)
    data_source = Column(String, default="simulated_demo")
    segment = relationship("RoadSegment", back_populates="metrics")

class IssueReport(Base):
    __tablename__ = "issue_report"
    issue_id = Column(String, primary_key=True)
    segment_id = Column(String, ForeignKey("road_segment.segment_id"))
    authority_id = Column(String, ForeignKey("authority.authority_id"))
    priority = Column(String)
    risk_score = Column(Float)
    sent_at = Column(DateTime, nullable=True)
    due_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    status = Column(String)
    repair_claimed_at = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    data_source = Column(String, default="simulated_demo")
    segment = relationship("RoadSegment")
    authority = relationship("Authority")

class RepairVerification(Base):
    __tablename__ = "repair_verification"
    verification_id = Column(String, primary_key=True)
    issue_id = Column(String, ForeignKey("issue_report.issue_id"))
    survey_week = Column(Integer)
    result = Column(String)
    before_score = Column(Float)
    after_score = Column(Float)
    notes = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    issue = relationship("IssueReport")

class ProcessingJob(Base):
    __tablename__ = "processing_job"
    job_id = Column(String, primary_key=True)
    video_id = Column(String, ForeignKey("video_asset.video_id"), nullable=True)
    bus_id = Column(String, nullable=True)
    source = Column(String)
    status = Column(String)
    progress = Column(Float, default=0)
    frames_total = Column(Integer, default=0)
    frames_processed = Column(Integer, default=0)
    detections_count = Column(Integer, default=0)
    provider = Column(String, default="mock")
    model_version = Column(String, nullable=True)
    processing_duration_seconds = Column(Float, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
