# mock_tools/

Terminal-based tools to inject and stream mock detection data into RoadPulse AI **via FastAPI endpoints**.

No data is injected automatically. No startup seeding. Production DB stays clean.

---

## Prerequisites

```bash
pip install requests
```

Make sure the backend is running:
```bash
cd backend && python main.py
# Backend at: http://localhost:8000
```

---

## Workflow

```
New deployment (clean DB)
        │
        ▼
1. python mock_tools/seed_roads.py       ← One time: load road definitions
        │
        ▼
2. python mock_tools/inject.py --road TR-01       ← One-shot: push a detection batch
   OR
   python mock_tools/stream.py --road TR-01 --duration 60   ← Simulate live bus camera
        │
        ▼
3. Dashboard at http://localhost:3001 ← See live score update
```

---

## Commands

### 1. `seed_roads.py` — One-time road setup

```bash
# Seed all Jaipur road segments and authorities into DB
python mock_tools/seed_roads.py

# Preview what would be sent (no actual request)
python mock_tools/seed_roads.py --dry-run

# Point to a deployed API
python mock_tools/seed_roads.py --api https://your-api.railway.app
```

> Safe to run multiple times — skips already-existing segments (idempotent).

---

### 2. `inject.py` — One-shot detection batch

Simulates: one bus pass over a road → YOLO processes → result sent to server

```bash
# Push default detection batch to Tonk Road
python mock_tools/inject.py --road TR-01

# Push to a different segment
python mock_tools/inject.py --road AJ-01

# Use a custom JSON file
python mock_tools/inject.py --road TR-01 --file mock_tools/mock_data/session_single.json

# Clear existing live data first, then inject
python mock_tools/inject.py --road TR-01 --clear-first

# Preview payload without sending
python mock_tools/inject.py --road TR-01 --dry-run

# Custom session ID
python mock_tools/inject.py --road TR-01 --session my-test-001

# Remote API
python mock_tools/inject.py --road TR-01 --api https://your-api.railway.app
```

---

### 3. `stream.py` — Live camera simulation

Simulates: bus driving past road → YOLO runs every N seconds → pushes JSON to server

```bash
# Stream for 60s, push every 5s, 3 detections per push (default)
python mock_tools/stream.py --road TR-01

# Custom duration and interval
python mock_tools/stream.py --road TR-01 --duration 120 --interval 3

# More detections per push
python mock_tools/stream.py --road TR-01 --duration 60 --interval 5 --count 6

# Use the stream JSON file instead of generating randomly
python mock_tools/stream.py --road TR-01 --file mock_tools/mock_data/session_stream.json

# Dry run (print each payload without sending)
python mock_tools/stream.py --road TR-01 --duration 30 --dry-run

# Stream to remote API
python mock_tools/stream.py --road TR-01 --duration 60 --api https://your-api.railway.app
```

Press `Ctrl+C` to stop early.

---

## FastAPI Endpoints Used

| Script | Endpoint |
|---|---|
| `seed_roads.py` | `POST /api/roads/seed/authority` |
| `seed_roads.py` | `POST /api/roads/seed/segment` |
| `inject.py` | `POST /api/ingest/detections` |
| `stream.py` | `POST /api/ingest/detections` |
| `inject.py --clear-first` | `DELETE /api/ingest/clear/{segment_id}` |

### Check live status
```bash
curl http://localhost:8000/api/ingest/status/TR-01
```

### Clear live data for a segment
```bash
curl -X DELETE http://localhost:8000/api/ingest/clear/TR-01
```

> Clearing only removes `week=0` (live) data. Historical weekly data (weeks 1–4) is never touched.

---

## Mock Data Files

| File | Purpose |
|---|---|
| `mock_data/roads_seed.json` | Jaipur road segment + authority definitions |
| `mock_data/session_single.json` | One detection batch for `inject.py` |
| `mock_data/session_stream.json` | Multi-frame stream config for `stream.py --file` |

---

## Road Segment IDs

| ID | Road |
|---|---|
| `TR-01` | Tonk Road |
| `AJ-01` | Ajmer Road |
| `SR-01` | Sikar Road |
| `JLN-01` | JLN Marg |
| `JG-01` | Jawahar Circle |
| `CL-01` | Civil Lines |
| `MI-01` | MI Road |
| `VN-01` | Vidhyadhar Nagar |

---

## Connecting Real YOLO

When your real YOLO model is ready, replace mock_tools with a script that:

1. Opens a video / camera stream
2. Runs YOLO inference per frame
3. Converts YOLO output `[x1, y1, x2, y2, conf, class_id]` to the ingest JSON format
4. POSTs to `POST /api/ingest/detections`

The endpoint contract is fixed — only your YOLO adapter needs to change.
