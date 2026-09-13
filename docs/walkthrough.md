# RoadPulse AI — Walkthrough & Verification: Road Route Geometry & GPS Trajectory Simulation

**RoadPulse AI** is a civic-tech road health intelligence platform designed for municipal authorities and city planners. It integrates survey data, AI detection metadata, automated risk scoring, GIS mapping, and accountability tracking for urban road maintenance.

GitHub Repository: [https://github.com/ghanenxra/RoadPulse-AI](https://github.com/ghanenxra/RoadPulse-AI)

---

## 1. Fixed Straight-Line Route Problem (High-Resolution Road Geometry)

### Root Cause
Previously, road segments were plotted between 5–6 coarse waypoints with straight segments in Leaflet, causing polylines to cut diagonally across city blocks, intersections, and buildings.

### Implementation
- Querying the Open Source Routing Machine (OSRM) driving profile (`router.project-osrm.org`) across all 20 transit corridors in Jaipur generated **2,229 street-following coordinates**.
- Injected the high-resolution geometries into [`backend/data/demo-data.json`](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/data/demo-data.json).
- Re-seeded the SQLite database (`RoadSegment.polyline_coords`), ensuring both `GET /api/map` (GeoJSON) and `GET /api/roads/{segment_id}` return precise street geometries that follow real roads on OpenStreetMap.

### Corridor Routing Summary
- **Tonk Road (TR-01)**: 115 points along NH-52
- **Ajmer Road (AJ-01)**: 201 points along NH-48 / 200 Ft Bypass
- **Agra Road (AG-01)**: 252 points along NH-21 / Ghat Ki Guni
- **Civil Lines (CL-01)**: 210 points along Jacob Road & VIP area
- **Jagatpura Spine (JP-01)**: 163 points along 7 Number Bus Stand
- **All 20 Corridors**: 2,229 total street-following waypoints

---

## 2. Realistic 5-Second GPS Trajectory Simulation

### Telemetry Specification
Implemented the `VehicleTelemetry` interface in [`frontend/types/index.ts`](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/types/index.ts):
```typescript
export interface VehicleTelemetry {
  vehicle_id: string;      // "BUS-001"
  latitude: number;        // e.g. 26.8547
  longitude: number;       // e.g. 75.8064
  timestamp: string;       // ISO 8601 string
  speed: number;           // e.g. 28.5 km/h
  heading: number;         // 0 - 360 degrees
  route_id?: string;       // "TR-01"
  road_name?: string;      // "Tonk Road"
}
```

### Simulation Engine ([`frontend/app/map/page.tsx`](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/map/page.tsx))
- **Strict 5-Second Cycle**: Driven by `setInterval(..., 5000)` strictly tied to a `useEffect` with clean `clearInterval` teardown to prevent duplicate intervals on re-renders.
- **Road-Following Navigation**: Traverses the actual high-resolution OSRM street coordinates.
- **Bearing Calculation**: Computes heading dynamically from previous point to current point:
  $$\theta = \text{atan2}(\sin(\Delta \lambda) \cdot \cos(\varphi_2), \cos(\varphi_1) \cdot \sin(\varphi_2) - \sin(\varphi_1) \cdot \cos(\varphi_2) \cdot \cos(\Delta \lambda))$$
- **Speed Variation**: Interpolates realistic municipal bus survey speeds ($24 - 32\text{ km/h}$).
- **Corridor Transitions**: When reaching the end of a road corridor, smoothly transitions to the next corridor in the Jaipur network.

---

## 3. Map Visualization & UI Enhancements ([`frontend/components/MapComponent.tsx`](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/components/MapComponent.tsx))

1. **Travelled Path Breadcrumb Polyline**:
   - High-visibility dual-tone transit polyline (`#2563eb` base with `#60a5fa` dashed accent) showing the road path the vehicle has surveyed.
2. **Directional Vehicle Marker**:
   - Custom Leaflet `L.divIcon` featuring a directional vehicle icon rotated to match real-time heading (`transform: rotate(${heading}deg)`).
   - Animated radar pulse ring (`pulse-ring-effect` in `globals.css`).
   - "BUS-001" vehicle identifier badge.
   - Interactive tooltip/popup displaying Vehicle ID, Corridor, Speed (`km/h`), Heading (`°`), and GPS coordinates.
3. **Floating Live Telemetry HUD Widget**:
   - Placed in the top-right corner of the GIS map.
   - Displays live status (pulsing green indicator), active corridor, current speed, compass direction (e.g. `184° S`), GPS coordinates, and surveyed waypoint count.
   - Includes quick controls to Pause/Resume simulation and Reset Trajectory.
4. **Preserved Severity & Controls**:
   - All existing road condition grade colors (Grade A green, B lime, C amber, D orange, E red), tooltips, click navigation to `/roads/[segmentId]`, and filter sheet remain 100% operational.

---

## 4. Verification Results

### Backend Automated Tests
Ran `python -m pytest backend/tests/ -v`:
```
backend/tests/test_api.py::test_health_endpoint PASSED          [ 11%]
backend/tests/test_api.py::test_demo_load PASSED                [ 22%]
backend/tests/test_api.py::test_get_roads PASSED                [ 33%]
backend/tests/test_api.py::test_get_road_detail PASSED          [ 44%]
backend/tests/test_api.py::test_get_map_geojson PASSED          [ 55%]
backend/tests/test_api.py::test_get_overview_metrics PASSED     [ 66%]
backend/tests/test_api.py::test_get_weekly_metrics PASSED       [ 77%]
backend/tests/test_api.py::test_get_authority_issues PASSED     [ 88%]
backend/tests/test_api.py::test_csv_export PASSED               [100%]
======================= 9 passed in 1.25s =======================
```

### API Endpoint Geometries
- `GET http://127.0.0.1:8000/api/map?week=4` $\to$ Returns 20 LineStrings with **2,229 real street-following coordinates**.

### Frontend Responsiveness (Port 3001)
- `/map` $\to$ Loads in 13.2 ms.
- `/` $\to$ Loads in 101.1 ms.
- `/roads/TR-01` $\to$ Loads in 133.5 ms.

---

## 5. Git & Version Control

- **Commit**: `7964e7c`
- **Commit Message**: `feat: integrate OSRM street-following route geometry and 5-second GPS vehicle trajectory simulation`
- **Remote**: Pushed to `https://github.com/ghanenxra/RoadPulse-AI` on branch `main`.
