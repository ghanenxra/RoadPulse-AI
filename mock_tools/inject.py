#!/usr/bin/env python3
"""
mock_tools/inject.py
─────────────────────
One-shot injection: sends a single detection batch to POST /api/ingest/detections.

Usage:
    # Use default session_single.json for a specific road
    python mock_tools/inject.py --road TR-01

    # Use a custom JSON file
    python mock_tools/inject.py --road AJ-01 --file mock_tools/mock_data/session_single.json

    # Override session ID
    python mock_tools/inject.py --road TR-01 --session my-test-001

    # Point to a remote/deployed API
    python mock_tools/inject.py --road TR-01 --api https://your-api.railway.app

    # Dry run (print payload without sending)
    python mock_tools/inject.py --road TR-01 --dry-run

    # Clear live data for a segment first, then inject
    python mock_tools/inject.py --road TR-01 --clear-first

Simulates what a real YOLO model would send after processing a video:
    Local video -> YOLO inference -> this script -> POST /api/ingest/detections
"""

import argparse
import json
import sys
import os
import uuid
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FILE = os.path.join(SCRIPT_DIR, "mock_data", "session_single.json")


def load_payload(file_path: str) -> dict:
    with open(file_path, "r") as f:
        data = json.load(f)
    # Strip comment keys
    return {k: v for k, v in data.items() if not k.startswith("_")}


def inject(api_base: str, road: str, session_id: str, file_path: str, dry_run: bool, clear_first: bool):
    payload = load_payload(file_path)

    # Override road and session
    payload["road_segment_id"] = road
    payload["session_id"] = session_id
    payload["captured_at"] = datetime.now(timezone.utc).isoformat()

    print(f"\n{'[DRY RUN] ' if dry_run else ''}RoadPulse AI — Mock Inject")
    print(f"  API        : {api_base}")
    print(f"  Road       : {road}")
    print(f"  Session    : {session_id}")
    print(f"  Detections : {len(payload.get('detections', []))}")
    print(f"  File       : {file_path}")
    print()

    if dry_run:
        print("Payload that would be sent:")
        print(json.dumps(payload, indent=2, default=str))
        return

    # Optional: clear live data first
    if clear_first:
        print(f"Clearing existing live data for {road}...")
        try:
            r = requests.delete(f"{api_base}/api/ingest/clear/{road}", timeout=10)
            if r.status_code == 200:
                print(f"  ✓ Cleared")
            else:
                print(f"  ! Could not clear: HTTP {r.status_code}")
        except requests.ConnectionError:
            print(f"ERROR: Cannot connect to {api_base}")
            sys.exit(1)
        print()

    # Send detection batch
    print("Sending detection batch...")
    try:
        r = requests.post(
            f"{api_base}/api/ingest/detections",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
    except requests.ConnectionError:
        print(f"ERROR: Cannot connect to {api_base}")
        print("Make sure the backend is running: python backend/main.py")
        sys.exit(1)

    if r.status_code == 200:
        result = r.json()
        print(f"  ✓ Accepted!")
        print(f"  Road          : {result.get('road_name')} ({result.get('road_segment_id')})")
        print(f"  Detections    : {result.get('detections_stored')}")
        print(f"  Live Score    : {result.get('live_score')} (Grade {result.get('live_grade')})")
        print(f"  Score Updated : {result.get('score_updated')}")
        print()
        print(f"View on dashboard: http://localhost:3001")
    elif r.status_code == 404:
        print(f"  ✗ Road segment '{road}' not found.")
        print(f"    Run first: python mock_tools/seed_roads.py")
    else:
        print(f"  ✗ HTTP {r.status_code}: {r.text[:300]}")


def main():
    parser = argparse.ArgumentParser(
        description="Inject a single mock detection batch into RoadPulse AI"
    )
    parser.add_argument("--road", required=True, help="Road segment ID, e.g. TR-01, AJ-01")
    parser.add_argument("--api", default="http://localhost:8000", help="FastAPI base URL")
    parser.add_argument("--file", default=DEFAULT_FILE, help="Path to detection JSON file")
    parser.add_argument("--session", default=None, help="Custom session ID (auto-generated if omitted)")
    parser.add_argument("--dry-run", action="store_true", help="Print payload without sending")
    parser.add_argument("--clear-first", action="store_true", help="Clear live data before injecting")
    args = parser.parse_args()

    session_id = args.session or f"SESSION-inject-{uuid.uuid4().hex[:8]}"
    inject(
        api_base=args.api.rstrip("/"),
        road=args.road,
        session_id=session_id,
        file_path=args.file,
        dry_run=args.dry_run,
        clear_first=args.clear_first
    )


if __name__ == "__main__":
    main()
