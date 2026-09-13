from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class WeeklyMetricResponse(BaseModel):
    week: int
    date: str
    potholes: int
    severe_count: int
    severity: float
    depth_cm: float
    rain_mm: float
    risk: float
    grade: str
    status: str
    note: str
    density: float
    trend: float

class RoadSegmentResponse(BaseModel):
    id: str
    road: str
    sub: str
    authority: str
    ward: str
    coords: List[List[float]]
    current_metrics: Optional[WeeklyMetricResponse] = None

class IssueReportResponse(BaseModel):
    issue_id: str
    segment_id: str
    authority_id: str
    priority: str
    risk_score: float
    status: str
    notes: Optional[str] = None
    sent_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    repair_claimed_at: Optional[datetime] = None

class RepairVerificationResponse(BaseModel):
    verification_id: str
    issue_id: str
    survey_week: int
    result: str
    before_score: float
    after_score: float
    notes: Optional[str] = None
    verified_at: Optional[datetime] = None

class DetectionResponse(BaseModel):
    detection_id: str
    latitude: float
    longitude: float
    severity_label: str
    confidence: float
    severity: float
    depth_cm: Optional[float] = None
    timestamp: datetime
    week: int

class RoadSegmentDetailResponse(RoadSegmentResponse):
    weeks: List[WeeklyMetricResponse]
    issues: List[IssueReportResponse] = []
    verifications: List[RepairVerificationResponse] = []
    detections: List[DetectionResponse] = []

class KPIValue(BaseModel):
    value: float
    previous: float
    change: float
    change_pct: float

class OverviewMetricsResponse(BaseModel):
    roads_surveyed: KPIValue
    total_potholes: KPIValue
    dangerous_segments: KPIValue
    avg_risk_score: KPIValue
    pending_repairs: KPIValue
    verified_repairs: KPIValue
    uploads_processed: KPIValue
    survey_coverage_pct: KPIValue
    grade_distribution: Dict[str, int]
    processing_status: Dict[str, int]
    accountability_snapshot: Dict[str, int]

class MapGeoJSONResponse(BaseModel):
    type: str = "FeatureCollection"
    features: List[Dict[str, Any]]

class ProcessingJobCreate(BaseModel):
    video_id: str
    source: str = "upload"

class ProcessingJobResponse(BaseModel):
    job_id: str
    video_id: Optional[str] = None
    bus_id: Optional[str] = None
    source: str
    status: str
    progress: float
    frames_total: int
    frames_processed: int
    detections_count: int
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class IssueStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class RepairVerificationCreate(BaseModel):
    survey_week: int

class WeeklyReportResponse(BaseModel):
    url: str
    file_name: str

class DemoActionResponse(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
