# RoadPulse AI — Road Health Intelligence Dashboard

> **"From road detection to road accountability."**

An AI-powered road-health monitoring platform for electric city buses. RoadPulse AI uses existing NVDR front cameras installed in electric city buses to continuously monitor road conditions, detect potholes, and hold authorities accountable for repairs.

![SIMULATED DEMO DATA](https://img.shields.io/badge/⚠️-SIMULATED%20DEMO%20DATA-yellow)

> **⚠️ IMPORTANT:** This prototype uses simulated demo data for demonstration purposes. All data shown is synthetic and does not represent actual government or road condition data.

---

## Features

- **Interactive Road Health Map** — Leaflet + OpenStreetMap with color-coded road segments (A–E grades)
- **Overview Dashboard** — 8 KPI cards, road health distribution, weekly trends, priority roads
- **Road Detail Pages** — 4-week history, risk timeline, evidence view, authority status
- **Processing Center** — Video upload interface with mock YOLO inference pipeline
- **Authority Tracker** — Issue reports, repair tracking, SLA monitoring, accountability dashboard
- **PDF & CSV Reports** — Weekly reports with ReportLab, CSV exports for all data types
- **Demo Data System** — Pre-loaded Jaipur road data with 8 segments, 4 weekly cycles, and 5 demo scenarios
- **Scoring Engine** — Configurable risk scoring (Severity × 0.40 + Density × 0.25 + Trend × 0.20 + Context × 0.15)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Map | Leaflet + OpenStreetMap tiles |
| Backend | FastAPI (Python) |
| Database | SQLite (PostGIS-compatible schema for migration) |
| Reports | ReportLab (PDF), Python CSV |
| AI | Clean placeholder interface (YOLO integration ready) |

## Architecture

```
roadpulse-ai/
├── frontend/          # Next.js 14 app
│   ├── app/           # Pages (Overview, Map, Roads, Processing, Reports, Authority, Demo, Settings)
│   ├── components/    # Reusable React components
│   ├── lib/           # API client, utilities, constants
│   ├── types/         # TypeScript interfaces
│   └── hooks/         # Custom React hooks
├── backend/           # FastAPI app
│   ├── api/           # API route handlers
│   ├── services/      # Business logic (scoring, reports, detection)
│   ├── models/        # SQLAlchemy ORM models
│   ├── schemas/       # Pydantic request/response schemas
│   └── data/          # Demo dataset + seeder
├── sample_data/       # Original demo dataset
├── reports/           # Generated PDF/CSV output
└── uploads/           # Uploaded video storage
```

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### 1. Clone and Setup

```bash
# Copy .env.example to .env
cp .env.example .env
```

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend will:
- Create the SQLite database
- Automatically seed demo data on first run
- Start the API server at http://localhost:8000
- API docs available at http://localhost:8000/docs

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at http://localhost:3001.

### 4. Load Demo Data

Demo data loads automatically on first backend startup. To manually reload:

- Visit the **Demo Data** page in the dashboard
- Click **"Load Dataset"** or **"Reset Dataset"**
- Or call: `POST http://localhost:8000/api/demo/load`

## Demo Data

The prototype includes pre-loaded data for **Jaipur, India** with:

| Segment | Road | Scenario |
|---|---|---|
| TR-01 | Tonk Road | Deteriorating (C→D→E→E), authority overdue |
| AJ-01 | Ajmer Road | Successful repair (D→E→C→B), verified |
| SR-01 | Sikar Road | Rain-triggered deterioration (B→C→D→D) |
| JLN-01 | JLN Marg | Stable condition (C→C→C→C) |
| JG-01 | Jawahar Circle | Gradual repair (D→C→C→B) |
| CL-01 | Civil Lines | Well-maintained (A→A→A→A) |
| MI-01 | MI Road | Stable (B→B→B→B) |
| VN-01 | Vidhyadhar Nagar | Worsening, reported (B→C→D→D) |

### Demo Presentation Steps

1. Open dashboard → See overview with KPIs populated
2. Select **Week 1** → See baseline road conditions
3. Select **Week 2** → See roads starting to deteriorate
4. Select **Week 3** → See dangerous roads, reports sent
5. Select **Week 4** → See overdue authority, unresolved issues
6. Open **Road Health Map** → See all 8 segments color-coded
7. Click **Tonk Road** → See deterioration timeline and overdue status
8. Click **Ajmer Road** → See successful repair and verification
9. Go to **Processing Center** → Upload a sample video, see mock processing
10. Go to **Reports** → Generate PDF report, download CSV
11. Go to **Authority Tracker** → See accountability dashboard

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/roads` | List road segments |
| GET | `/api/roads/{id}` | Road segment detail |
| GET | `/api/map` | GeoJSON for map |
| GET | `/api/metrics/overview` | Dashboard KPIs |
| GET | `/api/metrics/weekly` | Weekly trend data |
| POST | `/api/upload` | Upload video |
| GET | `/api/jobs` | List processing jobs |
| GET | `/api/reports/weekly` | Generate PDF report |
| GET | `/api/exports/csv` | Export CSV data |
| GET | `/api/authority/issues` | List authority issues |
| POST | `/api/demo/load` | Load demo data |
| POST | `/api/demo/reset` | Reset demo data |

Full API documentation: http://localhost:8000/docs

## YOLO Integration (Future)

The application is designed for easy YOLO model integration:

```python
# backend/services/detection_service.py

class DetectionProvider(ABC):
    @abstractmethod
    def detect(self, video_path: str, metadata=None) -> List[Detection]:
        raise NotImplementedError

# Current: MockDetectionProvider (used for demo)
# Future: YOLODetectionProvider

class YOLODetectionProvider(DetectionProvider):
    def __init__(self, model_path: str):
        self.model = load_yolo_model(model_path)

    def detect(self, video_path, metadata=None):
        # Implement YOLO inference
        ...
```

To integrate YOLO:
1. Install ultralytics or your YOLO framework
2. Implement `YOLODetectionProvider` in `detection_service.py`
3. Update `get_detection_provider()` to return the YOLO provider
4. No other code changes needed

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./roadpulse.db` | Database connection string |
| `BACKEND_HOST` | `0.0.0.0` | Backend host |
| `BACKEND_PORT` | `8000` | Backend port |
| `CORS_ORIGINS` | `http://localhost:3001` | Allowed CORS origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL for frontend |

## Road Health Scoring

```
Risk Score = 0.40 × Severity + 0.25 × Density + 0.20 × Trend + 0.15 × Context
```

| Grade | Score | Color | Label |
|---|---|---|---|
| A | 0–20 | Green | Good |
| B | 21–40 | Light Green | Fair |
| C | 41–60 | Yellow | Moderate |
| D | 61–80 | Orange | Poor |
| E | 81–100 | Red | Dangerous |

## Known Limitations

- No actual YOLO model connected (clean placeholder interface)
- No GPU required
- Evidence images are placeholders (no real pothole images provided)
- All data is simulated demo data
- No authentication system
- SQLite database (single-file, not production-scale)
- No actual email/notification sending to authorities

## Data Disclaimer

**⚠️ SIMULATED DEMO DATA — NOT LIVE GOVERNMENT DATA**

All road condition data, authority information, and reports shown in this application are simulated for demonstration purposes. This prototype does not connect to any government system or use real road survey data.

## Team

**The Cartel (IS2603)** — Idea Sprint, National Level Inter-University Innovation Challenge

## License

This project is a prototype built for academic competition purposes.
