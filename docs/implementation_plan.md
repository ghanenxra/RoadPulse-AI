# Implementation Plan: Fix RoadGuard Map Route Rendering & Add 5-Second GPS Trajectory Simulation

## Goal Description
Fix the map route rendering across RoadPulse AI so road segments follow actual street geometry rather than straight lines cutting across buildings, and implement a realistic 5-second GPS vehicle trajectory simulation that follows the road network, updates telemetry, renders an animated vehicle marker, and displays the travelled path.

---

## User Review Required

> [!IMPORTANT]
> - **Zero Layout Alterations**: The existing dashboard layout, navbar, KPI cards, tables, filters, and severity colors (Grade A–E) will remain completely intact.
> - **Preserved Pothole Data**: All 826 synthetic detections and their associations with road segments and weeks remain fully preserved.
> - **100% Street Geometry via OSRM**: All 20 road corridors in Jaipur have been verified and routed against OpenStreetMap through OSRM (`router.project-osrm.org`), providing 40–252 street-following coordinates per corridor without cutting across city blocks.
> - **5-Second Simulation Cycle**: Vehicle telemetry (`BUS-001`) will tick strictly every 5,000 ms, interpolating smooth bearings and speeds along the route geometry, updating the travelled path polyline and vehicle marker, with strict React lifecycle cleanup to avoid duplicate timers.

---

## Proposed Changes

### 1. High-Resolution Road Geometry Integration (OSRM)

#### [MODIFY] [`backend/data/demo-data.json`](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/data/demo-data.json)
- Inject the pre-computed OSRM street-following coordinates into the `coords` array for all 20 road segments.
- Each corridor's coordinates will trace actual road lanes and turns in Jaipur (e.g. Tonk Road: 115 points, Ajmer Road: 201 points, JLN Marg: 130 points, Agra Road: 252 points).

#### [EXECUTE] Database Re-Seeding
- Run `seed_database(SessionLocal())` to update `RoadSegment.polyline_coords` and SQLite database so `GET /api/map` and `GET /api/roads/{segment_id}` return the full road-following geometry.

---

### 2. Frontend Map Component Enhancements

#### [MODIFY] [`frontend/components/MapComponent.tsx`](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/components/MapComponent.tsx)
- Support vehicle marker rendering using custom Leaflet `L.divIcon`:
  - Directional bus icon with heading rotation (`transform: rotate(${heading}deg)`).
  - Ambient radar pulse animation for active survey visualization.
  - Interactive tooltip/popup showing Vehicle ID (`BUS-001`), Road Corridor, Latitude/Longitude, Speed (`km/h`), Heading, and Survey Status.
- Support `travelledPath` polyline rendering:
  - Separate high-visibility breadcrumb trail (`#2563eb`, weight 5, opacity 0.85) showing the road path the vehicle has traversed.
- Ensure all existing segment polylines with severity-based colors (Grade A green, B lime, C amber, D orange, E red), tooltips, and click-to-detail navigation remain fully functional.

---

### 3. 5-Second GPS Vehicle Trajectory Simulation

#### [MODIFY] [`frontend/types/index.ts`](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/types/index.ts)
- Add the `VehicleTelemetry` interface:
  ```typescript
  export interface VehicleTelemetry {
    vehicle_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed: number;
    heading: number;
    route_id?: string;
    road_name?: string;
  }
  ```

#### [MODIFY] [`frontend/app/map/page.tsx`](file:///C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/frontend/app/map/page.tsx)
- Add the 5-second trajectory simulation engine:
  - Select active demo corridor (defaulting to Tonk Road TR-01 or first visible road).
  - Run `setInterval(..., 5000)` strictly tied to `useEffect` with return cleanup to prevent duplicate intervals.
  - Calculate bearing/heading between route coordinates:
    $$\theta = \text{atan2}(\sin(\Delta \lambda) \cdot \cos(\varphi_2), \cos(\varphi_1) \cdot \sin(\varphi_2) - \sin(\varphi_1) \cdot \cos(\varphi_2) \cdot \cos(\Delta \lambda))$$
  - Update vehicle position to the next road coordinate every 5 seconds.
  - Append point to `travelledPath`.
  - Loop or transition seamlessly when reaching the end of the corridor.
- Add a compact, non-intrusive floating Live Telemetry HUD widget on the map:
  - Shows: `BUS-001 (NVDR AI Survey Unit)`, `Speed: ~28 km/h`, `Heading: 184° S`, `Lat/Lon`, `Pulse indicator`.
  - Pause / Resume button.

---

## Verification Plan

### Automated Tests
- Run `python -m pytest backend/tests/ -v` to ensure all API endpoints pass.
- Verify `GET /api/map?week=4` returns features with full high-resolution road geometries.

### Manual Verification
1. **Route Geometry Inspection**:
   - Open `http://localhost:3001/map` and verify routes follow the curves of actual streets without cutting across buildings.
2. **GPS Simulation Inspection**:
   - Verify `BUS-001` marker appears on the road.
   - Verify every 5 seconds the marker advances along the road.
   - Verify the travelled breadcrumb path extends behind the vehicle along the road.
   - Verify popup and telemetry HUD display updated coordinates, speed, and heading every 5 seconds.
   - Verify switching weeks or toggling filters does not duplicate intervals or crash the map.
