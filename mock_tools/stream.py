#!/usr/bin/env python3
"""
mock_tools/stream.py
──────────────────────
Simulates a live bus camera feed by streaming detection batches
to POST /api/ingest/detections at a configurable interval.

Usage:
    # Stream for 60 seconds, push every 5 seconds
    python mock_tools/stream.py --road TR-01 --duration 60 --interval 5

    # Stream with custom detections per push
    python mock_tools/stream.py --road AJ-01 --duration 30 --interval 3 --count 3

    # Stream using a custom JSON frame file
    python mock_tools/stream.py --road TR-01 --file mock_tools/mock_data/session_stream.json

    # Stream to a remote API
    python mock_tools/stream.py --road TR-01 --duration 60 --api https://your-api.railway.app

    # Dry run (show what would be sent)
    python mock_tools/stream.py --road TR-01 --duration 15 --dry-run

This simulates what happens when a bus drives past a road segment:
    Local camera -> YOLO inference (every N seconds) -> JSON -> FastAPI
"""

import argparse
import json
import sys
import os
import uuid
import random
import time
from datetime import datetime, timezone
from typing import List, Optional

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STREAM_FILE = os.path.join(SCRIPT_DIR, "mock_data", "session_stream.json")


# ── Mock detection generator ──────────────────────────────────────────────────

DETECTION_CLASSES = ["pothole", "pothole", "pothole", "crack", "subsidence"]  # weighted

def generate_detections(count: int, road_id: str) -> List[dict]:
    """Generate N randomized detections mimicking YOLO output."""
    detections = []
    for i in range(count):
        sev = round(random.uniform(1.5, 4.9), 1)
        detections.append({
            "class_name": random.choice(DETECTION_CLASSES),
            "confidence": round(random.uniform(0.70, 0.97), 2),
            "severity": sev,
            "depth_cm": round(random.uniform(2.0, 9.5), 1) if sev > 2.5 else None,
            "bbox": [
                random.randint(50, 350),
                random.randint(260, 360),
                random.randint(50, 100),
                random.randint(40, 80)
            ],
            "frame_number": random.randint(1, 450)
        })
    return detections


def build_payload(road: str, session_id: str, frame_num: int,
                  detections: List[dict], source: str) -> dict:
    return {
        "road_segment_id": road,
        "session_id": session_id,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "frame_count": frame_num * 90,
        "source": source,
        "detections": detections
    }


# ── File-based stream ────────────────────────────────────────────────────────

def load_stream_file(file_path: str, road: str, session_id: str) -> List[dict]:
    with open(file_path, "r") as f:
        data = json.load(f)
    payloads = []
    for frame in data.get("frames", []):
        payload = {k: v for k, v in frame.items() if not k.startswith("_")}
        payload["road_segment_id"] = road
        payload["session_id"] = session_id
        payload["captured_at"] = datetime.now(timezone.utc).isoformat()
        payload["source"] = data.get("source", "mock_tool")
        if "location" in data:
            payload["location"] = data["location"]
        payloads.append(payload)
    return payloads


# ── Send one batch ───────────────────────────────────────────────────────────

def send_batch(api_base: str, payload: dict, frame_num: int, dry_run: bool) -> bool:
    det_count = len(payload.get("detections", []))
    ts = datetime.now().strftime("%H:%M:%S")

    if dry_run:
        print(f"  [{ts}] [DRY] Frame {frame_num} — {det_count} detections would be sent")
        return True

    try:
        r = requests.post(
            f"{api_base}/api/ingest/detections",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if r.status_code == 200:
            res = r.json()
            score = res.get("live_score", "?")
            grade = res.get("live_grade", "?")
            stored = res.get("detections_stored", 0)
            print(f"  [{ts}] Frame {frame_num:03d} — {stored} detections stored | Score: {score} Grade: {grade}")
            return True
        elif r.status_code == 404:
            print(f"  [{ts}] ✗ Road not found. Run: python mock_tools/seed_roads.py")
            return False
        else:
            print(f"  [{ts}] ✗ HTTP {r.status_code}: {r.text[:100]}")
            return False
    except requests.ConnectionError:
        print(f"\nERROR: Lost connection to {api_base}")
        return False


# ── Main stream loop ─────────────────────────────────────────────────────────

def stream_generated(api_base: str, road: str, session_id: str,
                     duration: int, interval: int, count: int,
                     dry_run: bool):
    """Stream randomly generated detections."""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}RoadPulse AI — Live Stream (Generated)")
    print(f"  Road     : {road}")
    print(f"  Session  : {session_id}")
    print(f"  Duration : {duration}s")
    print(f"  Interval : every {interval}s")
    print(f"  Per push : {count} detections")
    print(f"  API      : {api_base}")
    print()
    print("Streaming... (Ctrl+C to stop early)")
    print()

    start = time.time()
    frame = 1
    total_sent = 0

    try:
        while time.time() - start < duration:
            dets = generate_detections(count, road)
            payload = build_payload(road, session_id, frame, dets, "mock_tool")
            ok = send_batch(api_base, payload, frame, dry_run)
            if ok:
                total_sent += len(dets)
            frame += 1
            remaining = duration - (time.time() - start)
            if remaining > interval:
                time.sleep(interval)
            else:
                break
    except KeyboardInterrupt:
        print("\n\nStream interrupted by user.")

    elapsed = round(time.time() - start, 1)
    print(f"\nStream complete: {frame - 1} pushes, {total_sent} detections in {elapsed}s")
    if not dry_run:
        print(f"Check status: GET {api_base}/api/ingest/status/{road}")


def stream_from_file(api_base: str, road: str, session_id: str,
                     file_path: str, interval: int, dry_run: bool):
    """Stream from a JSON frame file."""
    payloads = load_stream_file(file_path, road, session_id)

    print(f"\n{'[DRY RUN] ' if dry_run else ''}RoadPulse AI — Live Stream (File)")
    print(f"  Road     : {road}")
    print(f"  Session  : {session_id}")
    print(f"  Frames   : {len(payloads)}")
    print(f"  Interval : every {interval}s")
    print(f"  File     : {file_path}")
    print(f"  API      : {api_base}")
    print()
    print("Streaming... (Ctrl+C to stop early)")
    print()

    total_sent = 0
    try:
        for i, payload in enumerate(payloads, 1):
            ok = send_batch(api_base, payload, i, dry_run)
            if ok:
                total_sent += len(payload.get("detections", []))
            if i < len(payloads):
                time.sleep(interval)
    except KeyboardInterrupt:
        print("\n\nStream interrupted by user.")

    print(f"\nStream complete: {len(payloads)} frames, {total_sent} detections")
    if not dry_run:
        print(f"Check status: GET {api_base}/api/ingest/status/{road}")


def main():
    parser = argparse.ArgumentParser(
        description="Stream mock YOLO detections to RoadPulse AI in real-time"
    )
    parser.add_argument("--road", required=True, help="Road segment ID, e.g. TR-01")
    parser.add_argument("--api", default="http://localhost:8000", help="FastAPI base URL")
    parser.add_argument("--duration", type=int, default=60,
                        help="Total stream duration in seconds (generated mode only)")
    parser.add_argument("--interval", type=int, default=5,
                        help="Seconds between each push (default: 5)")
    parser.add_argument("--count", type=int, default=3,
                        help="Detections per push in generated mode (default: 3)")
    parser.add_argument("--file", default=None,
                        help="Use a frame JSON file instead of generating. Overrides --duration/--count")
    parser.add_argument("--session", default=None, help="Custom session ID (auto-generated if omitted)")
    parser.add_argument("--dry-run", action="store_true", help="Print payloads without sending")
    args = parser.parse_args()

    session_id = args.session or f"SESSION-stream-{uuid.uuid4().hex[:8]}"
    api = args.api.rstrip("/")

    if args.file:
        stream_from_file(api, args.road, session_id, args.file, args.interval, args.dry_run)
    else:
        stream_generated(api, args.road, session_id, args.duration,
                         args.interval, args.count, args.dry_run)


if __name__ == "__main__":
    main()
