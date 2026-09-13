# RoadPulse AI — Build Tasks

## Phase 1: Project Setup
- [ ] Create project directory structure
- [ ] Copy demo-data.json to project
- [ ] Create config files (.env.example, docker-compose.yml)
- [ ] Create README.md

## Phase 2: Backend (FastAPI + Python)
- [ ] requirements.txt + setup
- [ ] models/database.py — SQLAlchemy models + SQLite
- [ ] schemas/api_schemas.py — Pydantic schemas
- [ ] data/seed.py — Database seeder from demo-data.json
- [ ] services/scoring_service.py — Risk score formula
- [ ] services/detection_service.py — Provider abstraction
- [ ] services/aggregation_service.py — Weekly aggregation
- [ ] services/report_service.py — PDF + CSV generation
- [ ] services/verification_service.py — Repair verification
- [ ] api/health.py — Health endpoint
- [ ] api/roads.py — Road + map endpoints
- [ ] api/metrics.py — Overview + weekly metrics
- [ ] api/processing.py — Upload + jobs
- [ ] api/reports.py — Report + export endpoints
- [ ] api/authority.py — Authority issue endpoints
- [ ] api/demo.py — Demo load/reset/simulate
- [ ] main.py — FastAPI app entry point
- [ ] tests/test_api.py — Basic tests

## Phase 3: Frontend (Next.js + TypeScript)
- [ ] package.json + Next.js config + Tailwind + shadcn/ui setup
- [ ] types/index.ts — TypeScript interfaces
- [ ] lib/api.ts — API client
- [ ] lib/constants.ts — Colors, grades, thresholds
- [ ] lib/utils.ts — Formatting helpers
- [ ] components/ui/ — shadcn/ui components
- [ ] components/layout/ — Sidebar, Topbar, DemoDataBanner
- [ ] app/layout.tsx — Root layout
- [ ] app/page.tsx — Overview dashboard
- [ ] components/dashboard/ — KPI cards, charts, tables
- [ ] app/map/page.tsx — Road health map
- [ ] components/map/ — InteractiveRoadMap, Legend, Filters
- [ ] app/roads/[segmentId]/page.tsx — Road detail
- [ ] components/roads/ — Timeline, EvidenceGrid
- [ ] app/processing/page.tsx — Processing center
- [ ] components/processing/ — UploadDropzone, Stepper, JobTable
- [ ] app/reports/page.tsx — Reports
- [ ] app/authority/page.tsx — Authority tracker
- [ ] app/demo/page.tsx — Demo controls
- [ ] app/settings/page.tsx — Settings
- [ ] hooks/ — useRoads, useMetrics, useMap

## Phase 4: Integration & Testing
- [ ] pip install backend dependencies
- [ ] npm install frontend dependencies
- [ ] Verify backend starts and seeds data
- [ ] Verify frontend builds without errors
- [ ] Test main user flow end-to-end
- [ ] Fix any issues

## Phase 5: Final Polish
- [ ] Complete README.md with full instructions
- [ ] Verify all navigation works
- [ ] Verify exports work (PDF + CSV)
- [ ] Verify demo reset works
