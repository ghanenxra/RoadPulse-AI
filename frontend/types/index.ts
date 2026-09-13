export interface RoadSegment {
  segment_id: string;
  road_name: string;
  sub_name: string;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  length_km: number;
  road_type: string;
  authority_id: string;
  authority_name: string;
  ward: string;
  coords?: [number, number][];
  current_week: WeeklyMetric;
  weeks: WeeklyMetric[];
}

export interface WeeklyMetric {
  week: number;
  date: string;
  pothole_count: number;
  severe_count: number;
  density: number;
  severity_avg: number;
  depth_avg_cm: number;
  rain_mm: number;
  risk_score: number;
  grade: string;
  status: string;
  note: string;
  trend: number;
  weekly_change: number;
}

export interface OverviewMetrics {
  roads_surveyed: KPIValue;
  total_potholes: KPIValue;
  dangerous_segments: KPIValue;
  avg_risk_score: KPIValue;
  pending_repairs: KPIValue;
  verified_repairs: KPIValue;
  uploads_processed: KPIValue;
  survey_coverage: KPIValue;
  grade_distribution: GradeDistribution;
  processing_status: ProcessingStatus;
  accountability_snapshot: AccountabilitySnapshot;
}

export interface KPIValue {
  current: number;
  previous: number;
  change: number;
  change_pct: number;
}

export interface GradeDistribution {
  A: number; B: number; C: number; D: number; E: number;
}

export interface ProcessingStatus {
  completed: number; processing: number; failed: number; total_frames: number;
}

export interface AccountabilitySnapshot {
  reported: number; acknowledged: number; in_progress: number;
  claimed_repaired: number; verified: number; failed_verification: number; overdue: number;
}

export interface ProcessingJob {
  job_id: string; video_id: string; bus_id: string; source: string;
  status: string; progress: number; frames_total: number; frames_processed: number;
  detections_count: number; provider: string; model_version: string;
  processing_duration_seconds: number; error: string | null;
  created_at: string; completed_at: string | null;
}

export interface IssueReport {
  issue_id: string; segment_id: string; road_name: string; sub_name: string;
  authority_id: string; authority_name: string; priority: string;
  risk_score: number; sent_at: string; due_at: string; status: string;
  repair_claimed_at: string | null; acknowledged_at: string | null;
  notes: string;
}

export interface Detection {
  detection_id: string; latitude: number; longitude: number;
  confidence: number; severity: number; severity_label: string;
  timestamp: string; week: number;
}

export interface MapFeature {
  type: 'Feature';
  properties: {
    segment_id: string; road_name: string; sub_name: string;
    risk_score: number; grade: string; pothole_count: number;
    authority: string; status: string; weekly_change: number;
  };
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

export interface WeeklyTrend {
  week: number; avg_risk: number; total_potholes: number; dangerous_count: number;
}

export interface VehicleTelemetry {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
  heading: number;
  route_id?: string;
  road_name?: string;
}
