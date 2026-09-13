# RoadPulse AI — Complete Road Health Intelligence Dashboard

Build a complete, working prototype of **RoadPulse AI** — an AI-powered road-health monitoring platform for electric city buses in Jaipur. The application will use the provided 8-segment, 4-week demo dataset and present a professional civic-tech dashboard for an ideathon presentation.

## User Review Required

> [!IMPORTANT]
> **Database Choice**: The build request specifies PostgreSQL/PostGIS, but since this is an ideathon prototype that needs to run easily on any machine without database installation, I recommend **SQLite with SpatiaLite** for the prototype. This gives us a single-file database that works out of the box. The schema and queries will be PostGIS-compatible, so migrating to PostgreSQL later is trivial. **If you want PostgreSQL instead, let me know and I'll add Docker setup.**

> [!IMPORTANT]
> **Project Location**: I'll create the project at `C:\Users\pureg\.gemini\antigravity\scratch\roadpulse-ai`. After creation, you should set this as your active workspace.

> [!WARNING]
> **No pothole image dataset was provided.** The evidence view will show clean "Evidence unavailable — simulated demo" placeholders as instructed in the build request. No stock images will be used.

## Open Questions

1. **Grade scale mismatch**: The build request uses grades A–E (score 0–100 in 20-point bands), but the PRD uses A–F (with different ranges). The demo dataset uses `F` for dangerous. I'll **normalize to the build request's A–E scale** and remap the dataset's `F` grades to `E`. OK?

2. **Map tile fallback**: If OpenStreetMap tiles are unavailable, I'll render a simple canvas-based road network diagram with labeled segments. This ensures the map is never empty.

3. **Processing Center video upload**: The build request asks for actual file upload capability. I'll implement drag-and-drop upload with mock processing (simulated progress bar, then load demo detections). No actual YOLO inference. Acceptable?

---

## Provided Data Summary

**Source**: [demo-data.json](file:///c:/Users/pureg/Downloads/demo-data.json) — 8 road segments in Jaipur with 4-week weekly history.

| Field | Available | Notes |
|---|---|---|
| Segment ID | ✅ | `TR-01`, `AJ-01`, etc. |
| Road name | ✅ | Tonk Road, Ajmer Road, etc. |
| Coordinates (lat/lon) | ✅ | Start/end pairs for each segment |
| Weekly potholes | ✅ | 4 weeks per segment |
| Severity (1–5) | ✅ | Numeric |
| Depth (cm) | ✅ | Estimated |
| Rainfall (mm) | ✅ | Per week |
| Risk score (0–100) | ✅ | Pre-computed |
| Grade | ✅ | A/B/C/D/F → remap F→E |
| Status | ✅ | none/reported/repaired/verified/overdue/in_progress |
| Authority | ✅ | JMC Greater, JMC Heritage, PWD, JDA |
| Ward | ✅ | Ward numbers |
| Notes | ✅ | Contextual narrative per week |
| Evidence images | ❌ | Will use placeholder |
| Individual detections | ❌ | Will generate synthetic per-pothole records from weekly counts |
| Bus/video IDs | ❌ | Will generate demo records |

### Demo Scenarios Covered by Dataset

| Scenario | Segment | Pattern |
|---|---|---|
| **Deteriorating road** (Scenario 1) | TR-01 Tonk Road | C→D→E→E, overdue |
| **Successful repair** (Scenario 2) | AJ-01 Ajmer Road | D→E→C→B, verified |
| **Failed repair** (Scenario 3) | VN-01 Vidhyadhar Nagar | B→C→D→D, reported but no fix |
| **Overdue authority** (Scenario 4) | TR-01 Tonk Road | Report sent, SLA breached |
| **Stable road** | JLN-01, MI-01 | Holding steady around C/B |
| **Well-maintained** | CL-01 Civil Lines | Consistently A |
| **Gradual repair** | JG-01 Jawahar Circle | D→C→C→B, repaired |
| **Rain-triggered deterioration** | SR-01 Sikar Road | B→C→D→D, heavy rain event |

---

## Proposed Changes

### Project Structure

```
roadpulse-ai/
├── frontend/                    # Next.js 14 + TypeScript + Tailwind + shadcn/ui
│   ├── app/
│   │   ├── layout.tsx           # Root layout with sidebar
│   │   ├── page.tsx             # Overview dashboard (/)
│   │   ├── map/page.tsx         # Road health map (/map)
│   │   ├── roads/
│   │   │   └── [segmentId]/page.tsx  # Road detail (/roads/TR-01)
│   │   ├── processing/page.tsx  # Processing center (/processing)
│   │   ├── reports/page.tsx     # Reports (/reports)
│   │   ├── authority/page.tsx   # Authority tracker (/authority)
│   │   ├── demo/page.tsx        # Demo controls (/demo)
│   │   └── settings/page.tsx    # Settings (/settings)
│   ├── components/
│   │   ├── layout/              # Sidebar, Topbar, DemoDataBanner
│   │   ├── dashboard/           # KPI cards, charts, priority table
│   │   ├── map/                 # InteractiveRoadMap, MapLegend, MapFilters
│   │   ├── roads/               # RoadDetailDrawer, RoadTimeline, EvidenceGrid
│   │   ├── processing/          # UploadDropzone, ProcessingStepper, JobTable
│   │   ├── reports/             # ReportGenerator, ExportButtons
│   │   ├── authority/           # AuthorityTable, StatusBadges
│   │   └── ui/                  # shadcn/ui components + custom shared
│   ├── lib/
│   │   ├── api.ts               # API client (fetch wrapper)
│   │   ├── constants.ts         # Colors, grades, scoring thresholds
│   │   └── utils.ts             # Formatting, grade helpers
│   ├── types/
│   │   └── index.ts             # All TypeScript interfaces
│   └── hooks/
│       ├── useRoads.ts          # Road data fetching
│       ├── useMetrics.ts        # Metrics/KPI fetching
│       └── useMap.ts            # Map state management
│
├── backend/                     # FastAPI + Python
│   ├── main.py                  # FastAPI app entry point, CORS, lifespan
│   ├── api/
│   │   ├── roads.py             # /api/roads, /api/roads/{id}, /api/map
│   │   ├── metrics.py           # /api/metrics/overview, /api/metrics/weekly
│   │   ├── processing.py        # /api/upload, /api/jobs
│   │   ├── reports.py           # /api/reports/weekly, /api/exports/csv
│   │   ├── authority.py         # /api/authority/issues
│   │   ├── demo.py              # /api/demo/load, /api/demo/reset
│   │   └── health.py            # /api/health
│   ├── services/
│   │   ├── detection_service.py # DetectionProvider abstraction + MockProvider
│   │   ├── scoring_service.py   # Risk score formula, grade assignment
│   │   ├── aggregation_service.py # Weekly aggregation from detections
│   │   ├── report_service.py    # PDF (ReportLab) + CSV generation
│   │   └── verification_service.py # Repair verification logic
│   ├── models/
│   │   └── database.py          # SQLAlchemy models, SQLite setup
│   ├── schemas/
│   │   └── api_schemas.py       # Pydantic request/response schemas
│   ├── data/
│   │   ├── demo-data.json       # Original dataset (copied)
│   │   └── seed.py              # Database seeder from JSON
│   └── tests/
│       └── test_api.py          # Basic API tests
│
├── sample_data/
│   └── demo-data.json           # Copy of original dataset
├── reports/                     # Generated PDF/CSV output directory
├── uploads/                     # Uploaded video storage
├── README.md
├── .env.example
└── docker-compose.yml           # Optional for PostgreSQL migration
```

---

### Component 1: Backend (FastAPI + Python)

#### [NEW] [main.py](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/main.py)
- FastAPI app with CORS middleware (allow frontend origin)
- Lifespan handler: auto-seed database on startup if empty
- Mount all API routers
- Static file serving for generated reports

#### [NEW] [models/database.py](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/models/database.py)
- SQLAlchemy ORM models for all 10 entities from the data model spec
- SQLite database with `roadpulse.db` file
- Tables: `buses`, `charging_stations`, `video_assets`, `detections`, `pothole_clusters`, `road_segments`, `weekly_road_metrics`, `authorities`, `issue_reports`, `repair_verifications`, `processing_jobs`
- Geometry stored as lat/lon pairs (no PostGIS extension needed for prototype)

#### [NEW] [data/seed.py](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/data/seed.py)
- Reads `demo-data.json` and normalizes into database schema
- Generates synthetic individual pothole detections from weekly pothole counts (randomly distributed along segment coordinates, with deterministic seed)
- Generates demo bus records (3 buses: BUS-JP-01, BUS-JP-02, BUS-JP-03)
- Generates demo video assets linked to buses
- Generates demo processing jobs (all completed)
- Generates issue reports from segments with `reported`/`overdue` status
- Generates repair verifications for `verified`/`repaired` segments
- Creates pothole clusters via simple spatial grouping
- All synthetic records marked with `data_source: "simulated_demo"`

#### [NEW] [services/detection_service.py](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/services/detection_service.py)
```python
class DetectionProvider(ABC):
    @abstractmethod
    def detect(self, video_path: str, metadata: dict = None) -> List[Detection]: ...

class MockDetectionProvider(DetectionProvider):
    """Returns demo detections for uploaded videos."""
    def detect(self, video_path, metadata=None):
        # Generate plausible detections based on demo patterns
        ...

# Future: class YOLODetectionProvider(DetectionProvider): ...
```

#### [NEW] [services/scoring_service.py](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/services/scoring_service.py)
- Formula: `Risk = 0.40 × Severity + 0.25 × Density + 0.20 × Trend + 0.15 × Context`
- Each component normalized to 0–100
- Grade assignment: A(0–20), B(21–40), C(41–60), D(61–80), E(81–100)
- Configurable weights and thresholds
- Score explanation generation for road detail pages

#### [NEW] [services/report_service.py](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/services/report_service.py)
- **PDF generation** via ReportLab:
  - RoadPulse AI branded header
  - "SIMULATED DEMO DATA" disclaimer
  - Executive summary, road health distribution, priority roads table
  - Authority accountability, weekly comparison
  - Methodology section
- **CSV exports**: `detections.csv`, `road_segments.csv`, `weekly_history.csv`, `authority_actions.csv`, `processing_jobs.csv`

#### [NEW] API Routes
- `api/roads.py` — GET `/api/roads`, GET `/api/roads/{segment_id}`, GET `/api/map` (GeoJSON)
- `api/metrics.py` — GET `/api/metrics/overview?week=`, GET `/api/metrics/weekly`
- `api/processing.py` — POST `/api/upload`, GET `/api/jobs`, GET `/api/jobs/{id}`
- `api/reports.py` — GET `/api/reports/weekly?week=`, GET `/api/exports/csv?type=`
- `api/authority.py` — GET `/api/authority/issues`, POST `/api/authority/issues/{id}/status`
- `api/demo.py` — POST `/api/demo/load`, POST `/api/demo/reset`, POST `/api/demo/simulate-upload`, POST `/api/demo/simulate-repair`
- `api/health.py` — GET `/api/health`

---

### Component 2: Frontend — Layout & Navigation

#### [NEW] [app/layout.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/layout.tsx)
- Dark navy sidebar (collapsible) with all 8 navigation items
- RoadPulse AI logo/branding in sidebar header
- "SIMULATED DEMO DATA" persistent top banner (subtle dark background, amber text)
- Active page highlighting
- System status indicator (green dot when backend is reachable)
- Responsive: sidebar collapses to icon-only on tablet, hamburger menu on mobile

#### [NEW] Layout Components
- `components/layout/Sidebar.tsx` — Nav items with icons (Lucide), collapse toggle
- `components/layout/Topbar.tsx` — Page title, week selector, export button, profile placeholder
- `components/layout/DemoDataBanner.tsx` — "SIMULATED DEMO DATA — NOT LIVE GOVERNMENT DATA" banner

---

### Component 3: Frontend — Overview Dashboard (`/`)

#### [NEW] [app/page.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/page.tsx)
- **Header**: "Road Health Overview" with subtitle, week selector, compare toggle, refresh, export
- **8 KPI cards** (2 rows × 4): Roads surveyed, Total potholes, Dangerous segments, Avg risk score, Pending repairs, Verified repairs, Uploads processed, Survey coverage — each with week-over-week delta and trend sparkline
- **Road health distribution chart** (Recharts bar chart, grades A–E with brand colors)
- **Weekly trend line chart** (Recharts, toggleable: avg risk, total potholes, dangerous count)
- **Priority roads table** (top 5–8 most urgent, sortable, with grade badges)
- **Mini map** (small Leaflet map with colored segments, click to navigate to /map)
- **Processing status card** (videos uploaded, jobs completed/processing/failed)
- **Accountability snapshot card** (reports sent, acknowledged, verified, overdue)

---

### Component 4: Frontend — Road Health Map (`/map`)

#### [NEW] [app/map/page.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/map/page.tsx)
- Full-height Leaflet map with OpenStreetMap tiles
- **Fallback**: If tiles fail to load, show a labeled geographic canvas with segment lines
- Centered on Jaipur (≈26.9, 75.8), fit bounds to all segments
- **Layers** (toggleable): Road segments (thick polylines by grade color), pothole clusters (circle markers), raw detections (small dots), repair status markers
- **Hover tooltip**: Road name, segment ID, grade badge, score, pothole count, weekly change
- **Click**: Opens detail drawer panel on the right
- **Filter bar**: Week selector, grade checkboxes, risk score range slider, authority dropdown, status filter, "Worsening only" toggle, search input
- **Legend**: Grade colors, marker types, "SIMULATED DEMO DATA" note
- Dynamic import for Leaflet (SSR-incompatible)

---

### Component 5: Frontend — Road Detail (`/roads/[segmentId]`)

#### [NEW] [app/roads/[segmentId]/page.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/roads/%5BsegmentId%5D/page.tsx)
- **Header**: Road name, segment ID, coordinates, zone/ward, authority, current grade badge, score, status
- **Metrics row**: Risk score, pothole count, severe count, potholes/km, avg severity, weekly change, days since survey, repair status
- **Weekly history chart** (Recharts): 4-week risk score + grade + pothole count timeline
- **Dynamic narrative**: Generated from data (e.g., "Road condition deteriorated from Grade C in Week 1 to Grade E in Week 3...")
- **Evidence grid**: Placeholder cards with "Evidence unavailable — simulated demo" state
- **Mini map**: Segment geometry with pothole markers, color-coded by grade
- **Authority status panel**: Responsible authority, report dates, status timeline, due date
- **Action buttons**: View report, Export segment CSV, Export segment PDF, Simulate authority response, Simulate repair verification

---

### Component 6: Frontend — Processing Center (`/processing`)

#### [NEW] [app/processing/page.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/processing/page.tsx)
- **Workflow stepper** (11 steps from video storage to report generation)
- **Upload section**: Drag-and-drop zone (MP4/MOV), fields for Bus ID, Route ID, Station, Date
- **Processing job table**: Job ID, Bus, Video, Status, Progress bar, Frames, Detections, Model/Provider, Duration, Error
- **Demo button**: "Use Demo Processing Job" — creates a simulated job that progresses through stages
- When upload happens: validates file, creates job record, runs mock processing with animated progress, shows mock results

---

### Component 7: Frontend — Reports (`/reports`)

#### [NEW] [app/reports/page.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/reports/page.tsx)
- **Controls**: Week selector, zone filter, authority filter, checkboxes for include evidence/map/unresolved
- **Generate PDF button** → calls backend, downloads real PDF
- **Export CSV button** → dropdown for each CSV type, downloads real files
- **Report preview**: Shows a formatted preview of what the PDF will contain
- **Generated reports list**: Previously generated reports with download links

---

### Component 8: Frontend — Authority Tracker (`/authority`)

#### [NEW] [app/authority/page.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/authority/page.tsx)
- **9 summary KPI cards**: Total, Pending, Sent, Acknowledged, In Progress, Claimed, Verified, Failed, Overdue
- **Issue table**: All issue reports with full column spec, status badges, action buttons
- **Status lifecycle visualization**: Visual flow diagram
- **Authority detail cards**: Per-authority stats (JMC Greater, JMC Heritage, PWD, JDA)

---

### Component 9: Frontend — Demo Controls (`/demo`)

#### [NEW] [app/demo/page.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/demo/page.tsx)
- Load/Reset dataset buttons
- Week navigation (1–4) with "Play timeline" animation
- Simulation buttons: new upload, report sent, authority acknowledge, claim repair, verify repair
- Filter toggles: deteriorating only, unresolved only, successful repairs only
- Restore original seed state
- All actions call real backend endpoints

---

### Component 10: Frontend — Settings (`/settings`)

#### [NEW] [app/settings/page.tsx](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/settings/page.tsx)
- Scoring weights editor (Severity, Density, Trend, Context sliders)
- Grade thresholds editor
- Map tile provider selector
- Theme preference (dark/light)
- API endpoint configuration
- Data source info
- About section with system version

---

### Component 11: Shared UI Components

Using **shadcn/ui** for base components (Button, Card, Table, Badge, Select, Slider, Dialog, Sheet, Tooltip, Tabs, Progress, Separator, DropdownMenu, Input).

Custom components:
- `GradeBadge` — colored badge with grade letter + label
- `RiskBadge` — score with color-coded background
- `KPICard` — metric card with trend indicator
- `WeekSelector` — week 1–4 toggle
- `EmptyState`, `LoadingState`, `ErrorState` — consistent empty/loading/error UIs
- `FilterBar` — reusable filter controls
- `SearchInput` — with debounce

---

## Implementation Phases

### Phase 1: Foundation (Backend core + DB + Seeding)
1. Set up project structure and dependencies
2. Create SQLAlchemy models and SQLite database
3. Build data seeder from `demo-data.json` (normalize grades, generate synthetic detections)
4. Implement core API endpoints (health, roads, metrics, map GeoJSON)
5. Implement scoring service
6. Test seeding and basic API responses

### Phase 2: Frontend Shell + Dashboard
7. Set up Next.js project with Tailwind + shadcn/ui
8. Build sidebar layout, topbar, demo banner
9. Build Overview dashboard with KPI cards and charts
10. Connect to backend API

### Phase 3: Map + Road Details
11. Build interactive Leaflet map with segment polylines
12. Build map filters, legend, tooltips
13. Build Road Detail page with weekly history chart + narrative
14. Build mini-map component

### Phase 4: Processing + Reports + Authority
15. Build Processing Center with upload UI and mock processing
16. Build Detection Provider abstraction (backend)
17. Build Report generation (PDF + CSV)
18. Build Authority Tracker page

### Phase 5: Demo Controls + Polish
19. Build Demo page with all simulation controls
20. Build Settings page
21. Add loading/empty/error states everywhere
22. Responsive pass (tablet/mobile)
23. Final testing, build verification, README

---

## Verification Plan

### Automated Tests
```bash
# Backend
cd backend && python -m pytest tests/ -v

# Frontend build
cd frontend && npm run build
```

### Manual Verification
- Dashboard loads with populated KPI cards immediately
- Map shows 8 colored road segments centered on Jaipur
- Week selector changes data across all views
- Road click opens detail with 4-week chart
- Upload form accepts video, shows mock processing
- PDF download produces a real branded PDF
- CSV downloads produce real data files
- Demo reset restores original state
- All sidebar navigation links work
- No console errors, no build errors
