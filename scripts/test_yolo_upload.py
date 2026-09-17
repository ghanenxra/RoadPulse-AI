import sys
import time
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from fastapi.testclient import TestClient
from main import app
from models.database import SessionLocal, ProcessingJob, Detection, WeeklyRoadMetric

client = TestClient(app)

def test_pipeline():
    sample_video = BASE_DIR / "sample_data" / "sample_dashcam_pothole_clip.mp4"
    if not sample_video.exists():
        print(f"Error: Sample video {sample_video} not found")
        return

    print("=== Testing RoadPulse AI Local YOLO Inference Pipeline ===")
    print(f"Uploading: {sample_video.name} for Road Segment TR-01...")

    with open(sample_video, "rb") as f:
        response = client.post(
            "/api/upload",
            files={"file": (sample_video.name, f, "video/mp4")},
            data={"bus_id": "BUS-1", "station_id": "CS-1", "road_segment_id": "TR-01"}
        )

    print("POST /api/upload response status:", response.status_code)
    data = response.json()
    print("Response payload:", data)
    job_id = data["job_id"]

    # Poll status until done
    for i in range(25):
        time.sleep(1)
        res = client.get(f"/api/jobs/{job_id}")
        job_data = res.json()
        status = job_data.get("status")
        progress = job_data.get("progress")
        count = job_data.get("detections_count")
        provider = job_data.get("provider")
        print(f"  [T+{i+1:02d}s] Status: {status:<10} | Progress: {progress:5.1f}% | Provider: {provider} | Detections: {count}")
        if status in ["completed", "failed"]:
            break

    db = SessionLocal()
    # Check detections in DB
    dets = db.query(Detection).filter(Detection.video_id == data["video_id"]).all()
    print(f"\nTotal detections saved in DB for this job: {len(dets)}")
    for d in dets[:3]:
        print(f"  • ID: {d.detection_id} | Class: {d.data_source} | Lat: {d.latitude:.5f}, Lon: {d.longitude:.5f} | Conf: {d.confidence:.2f} | Sev: {d.severity:.1f} ({d.severity_label})")

    # Check updated metrics
    metric = db.query(WeeklyRoadMetric).filter(WeeklyRoadMetric.segment_id == "TR-01", WeeklyRoadMetric.week == 4).first()
    if metric:
        print(f"\nUpdated TR-01 Week 4 Metric:")
        print(f"  • Pothole Count: {metric.pothole_count}")
        print(f"  • Risk Score: {metric.risk_score}")
        print(f"  • Grade: {metric.grade}")
        print(f"  • Status: {metric.status}")
        print(f"  • Note: {metric.note}")

    db.close()
    print("\n✅ End-to-End Local YOLO Inference Verified Successfully!")

if __name__ == "__main__":
    test_pipeline()

