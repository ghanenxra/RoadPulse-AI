"""
edge_sync.py — Edge Depot Ingestion Script
──────────────────────────────────────────
Simulates the Bus Depot Edge Server:
1. Takes front-dashcam video from a bus
2. Runs the local fine-tuned YOLO model (model/Yolov8-fintuned-on-potholes.pt)
3. Detects potholes, computes severity, estimated depth, and bounding boxes
4. Geocodes detections sequentially along the selected road's GPS coordinates
5. Pushes the telemetry payload directly to the CLOUD Render backend or local backend!

Usage:
  # Sync to live cloud dashboard (Vercel/Render):
  python scripts/edge_sync.py --road TR-01

  # Custom video:
  python scripts/edge_sync.py --video sample_data/sample_dashcam_pothole_clip.mp4 --road TR-01

  # Point to local server:
  python scripts/edge_sync.py --api http://127.0.0.1:8000 --road TR-01
"""

import os
import sys
import argparse
import time
import json
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

# Resolve project paths
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from services.detection_service import get_detection_provider

DEFAULT_CLOUD_API = "https://roadpulse-ai-wjsk.onrender.com"
DEFAULT_VIDEO = ROOT_DIR / "sample_data" / "sample_dashcam_pothole_clip.mp4"

def sync_video_to_cloud(
    video_path: str,
    road_segment_id: str,
    api_base: str,
    bus_id: str = "BUS-1"
):
    print("=" * 65)
    print("RoadPulse AI -- Edge Depot Video Ingestion & Cloud Sync")
    print("=" * 65)
    print(f"  * Video File   : {Path(video_path).name}")
    print(f"  * Road Corridor: {road_segment_id}")
    print(f"  * Bus ID       : {bus_id}")
    print(f"  * Target Cloud : {api_base}")
    print("-" * 65)

    # 1. Load YOLO Provider
    print("\n[Step 1/3] Initializing Local AI Model...")
    provider = get_detection_provider("auto")
    provider_name = type(provider).__name__
    print(f"  [OK] Active Provider: {provider_name}")

    # 2. Run Inference
    print(f"\n[Step 2/3] Running YOLO Inference on {Path(video_path).name}...")
    start_time = time.time()

    def on_progress(pct, frame_idx):
        sys.stdout.write(f"\r  Progress: {pct * 100:5.1f}% (Frame {frame_idx})")
        sys.stdout.flush()

    raw_detections, video_info = provider.detect(str(video_path), progress_callback=on_progress)
    print()
    elapsed = round(time.time() - start_time, 2)
    print(f"  [OK] Inference completed in {elapsed}s")
    print(f"  [OK] Detections Found : {len(raw_detections)}")
    print(f"  [OK] Total Frames     : {video_info.get('total_frames')}")

    # 3. Format Payload for Ingestion API
    print(f"\n[Step 3/3] Syncing Detection Telemetry to Cloud ({api_base})...")
    payload = {
        "road_segment_id": road_segment_id,
        "session_id": f"DEPOT-{bus_id}-{int(time.time())}",
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "frame_count": video_info.get("total_frames"),
        "source": "edge_depot_yolov8",
        "detections": [
            {
                "class_name": d.get("class_name", "Potholes"),
                "confidence": d.get("confidence", 0.85),
                "severity": d.get("severity", 2.5),
                "depth_cm": d.get("depth_cm"),
                "bbox": d.get("bbox"),
                "frame_number": d.get("frame_number")
            }
            for d in raw_detections
        ]
    }

    req_url = f"{api_base.rstrip('/')}/api/ingest/detections"
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        req_url,
        data=data_bytes,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "RoadPulse-EdgeDepot/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            print(f"  [OK] Cloud Response Status : {resp.status} OK")
            print(f"  [OK] Live Score Updated    : {resp_data.get('live_score')} (Grade {resp_data.get('live_grade')})")
            print(f"  [OK] Detections Stored     : {resp_data.get('detections_stored')}")
            print(f"  [OK] Road                  : {resp_data.get('road_name')}")
    except Exception as e:
        print(f"  [ERROR] Failed to send to cloud: {e}")
        return False

    print("\n" + "=" * 65)
    print("SUCCESS! Local AI detections are now LIVE on the cloud dashboard!")
    print(f"Open Vercel to see updates: https://road-pulse-ai-mu.vercel.app/map")
    print("=" * 65)
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run local YOLO model on bus video and sync to cloud dashboard")
    parser.add_argument("--video", default=str(DEFAULT_VIDEO), help="Path to video file")
    parser.add_argument("--road", default="TR-01", help="Road Segment ID (e.g. TR-01, AJ-01, SR-01)")
    parser.add_argument("--bus", default="BUS-1", help="Bus ID")
    parser.add_argument("--api", default=DEFAULT_CLOUD_API, help="Target backend URL")

    args = parser.parse_args()
    sync_video_to_cloud(args.video, args.road, args.api, args.bus)
