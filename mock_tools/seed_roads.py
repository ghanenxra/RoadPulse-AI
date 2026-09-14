#!/usr/bin/env python3
"""
mock_tools/seed_roads.py
─────────────────────────
One-time script to seed road segment definitions into the DB via FastAPI.

Usage:
    python mock_tools/seed_roads.py
    python mock_tools/seed_roads.py --api http://localhost:8000
    python mock_tools/seed_roads.py --dry-run

What it does:
    - Reads mock_tools/mock_data/roads_seed.json
    - POSTs each authority + road segment to FastAPI
    - Safe to re-run: idempotent (skips existing segments)

This does NOT inject detections or metrics.
Run this once after first deploy to set up road definitions.
"""

import argparse
import json
import sys
import os

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(SCRIPT_DIR, "mock_data", "roads_seed.json")


def load_data():
    with open(DATA_FILE, "r") as f:
        return json.load(f)


def seed(api_base: str, dry_run: bool):
    data = load_data()
    print(f"\n{'[DRY RUN] ' if dry_run else ''}RoadPulse AI — Road Seed")
    print(f"  API: {api_base}")
    print(f"  File: {DATA_FILE}")
    print()

    # ── Authorities ──────────────────────────────────────────────────────────
    print(f"Seeding {len(data['authorities'])} authorities...")
    for auth in data["authorities"]:
        if dry_run:
            print(f"  [DRY] POST /api/roads/seed/authority — {auth['authority_id']}")
            continue
        try:
            r = requests.post(f"{api_base}/api/roads/seed/authority", json=auth, timeout=10)
            if r.status_code in (200, 201):
                print(f"  ✓ {auth['authority_id']} — {auth['name']}")
            elif r.status_code == 409:
                print(f"  ~ {auth['authority_id']} — already exists (skipped)")
            else:
                print(f"  ✗ {auth['authority_id']} — HTTP {r.status_code}: {r.text[:100]}")
        except requests.ConnectionError:
            print(f"\nERROR: Cannot connect to {api_base}")
            print("Make sure the backend is running: python backend/main.py")
            sys.exit(1)

    print()

    # ── Road Segments ────────────────────────────────────────────────────────
    print(f"Seeding {len(data['road_segments'])} road segments...")
    ok, skipped, failed = 0, 0, 0
    for seg in data["road_segments"]:
        if dry_run:
            print(f"  [DRY] POST /api/roads/seed/segment — {seg['segment_id']} ({seg['road_name']})")
            continue
        try:
            r = requests.post(f"{api_base}/api/roads/seed/segment", json=seg, timeout=10)
            if r.status_code in (200, 201):
                print(f"  ✓ {seg['segment_id']} — {seg['road_name']}")
                ok += 1
            elif r.status_code == 409:
                print(f"  ~ {seg['segment_id']} — already exists (skipped)")
                skipped += 1
            else:
                print(f"  ✗ {seg['segment_id']} — HTTP {r.status_code}: {r.text[:100]}")
                failed += 1
        except requests.ConnectionError:
            print(f"\nERROR: Cannot connect to {api_base}")
            sys.exit(1)

    if not dry_run:
        print(f"\nDone: {ok} seeded, {skipped} skipped, {failed} failed")
        print("\nNext steps:")
        print("  Inject mock detections : python mock_tools/inject.py --road TR-01")
        print("  Stream mock detections : python mock_tools/stream.py --road TR-01 --duration 60")


def main():
    parser = argparse.ArgumentParser(description="Seed road definitions into RoadPulse AI DB via FastAPI")
    parser.add_argument("--api", default="http://localhost:8000", help="FastAPI base URL")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be sent without actually sending")
    args = parser.parse_args()

    seed(args.api.rstrip("/"), args.dry_run)


if __name__ == "__main__":
    main()
