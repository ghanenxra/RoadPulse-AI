# BUILD REQUEST: ROADPULSE AI — COMPLETE ROAD HEALTH INTELLIGENCE DASHBOARD

You are an expert full-stack engineer, product designer, GIS developer, and data visualization engineer.

Build a complete, polished, functional prototype of **RoadPulse AI**, an AI-powered road-health monitoring platform for electric city buses.

This is an actual implementation task, not a design-only task. You must create the project, write the code, run it, test it, and fix errors.

## 1. PROJECT CONTEXT

RoadPulse AI uses existing NVDR front cameras installed in electric city buses.

The real-world workflow is:

1. Electric city buses record road footage through their existing NVDR cameras.
2. The footage is stored locally on the camera/storage system.
3. When the bus reaches its designated charging station, usually one or two stations in the city, the bus connects to the charging-station network.
4. The stored front-camera video is uploaded to a central server.
5. A fine-tuned YOLO model processes the video offline.
6. Pothole detections are associated with timestamps and GPS coordinates from the camera metadata or GPS log.
7. Detections are mapped to road segments.
8. The system calculates road-health scores and grades.
9. A real interactive map displays road condition.
10. Weekly reports show deterioration, severity, authority responsibility, and repair verification.
11. Reports can be exported as PDF and CSV.

### Important scope decision

For this implementation:

**Do not connect the actual YOLO model yet.**

Build the complete application architecture so that a YOLO inference service can be plugged in later without rewriting the dashboard.

Use the supplied pothole sample data as the primary source for demo results.

If the sample data contains different field names, inspect and normalize it. Do not discard useful fields.

---

# 2. YOUR DELIVERABLE

Create a complete working RoadPulse AI prototype with:

- A professional dashboard.
- Interactive map.
- Road segment visualization.
- Road detail pages/panels.
- Four-week historical road-health data.
- Deterioration timeline.
- Pothole evidence view.
- Processing center.
- Video upload interface.
- Demo data mode.
- Authority accountability.
- Repair verification.
- PDF reports.
- CSV exports.
- Charts.
- Filters.
- Search.
- Settings.
- Loading, empty, and error states.
- Responsive desktop and tablet UI.
- A working local development environment.
- Seeded demo data.
- A clean integration boundary for future YOLO inference.

Do not create a static mockup.

All buttons and important interactions must work.

---

# 3. FIRST: INSPECT THE PROJECT AND PROVIDED FILES

Before writing the application:

1. Inspect the current workspace.
2. Inspect all uploaded files.
3. Locate the PRD document.
4. Locate the Claude-generated pothole dataset.
5. Determine the dataset format: JSON, CSV, Excel, SQL, or other.
6. Read the dataset structure.
7. Identify available fields:
   - Pothole ID.
   - Latitude.
   - Longitude.
   - Timestamp.
   - Week.
   - Severity.
   - Confidence.
   - Bus ID.
   - Video ID.
   - Road name.
   - Road segment.
   - Any evidence image or frame path.
8. Preserve all useful source data.
9. Create a normalization layer instead of rewriting the original data.
10. If a field is missing, derive it only when reasonable and document the derivation.
11. If road names, GPS coordinates, or weekly data are missing, do not silently invent fake facts and present them as source data.

If the supplied dataset already contains four weeks of data, use it directly.

If the supplied dataset contains only pothole detections, create a deterministic aggregation layer that generates road-level weekly summaries from those detections.

If the dataset has no weekly history, create a clearly labeled simulated demo scenario layer only where needed.

---

# 4. PRODUCT DESIGN DIRECTION

The dashboard should feel like a serious civic-tech / infrastructure intelligence platform.

Design references:

- Modern GIS dashboards.
- Premium SaaS analytics dashboards.
- Professional infrastructure monitoring systems.
- Clean data-heavy interfaces.
- Strong visual hierarchy.
- Minimal but useful cards.
- Dark navy/charcoal interface with light map canvas, or a polished light dashboard with dark text.
- Avoid generic AI neon aesthetics.
- Avoid excessive gradients.
- Avoid unnecessary rounded cards everywhere.
- Avoid huge decorative hero sections.
- Avoid fake 3D maps.
- Avoid clutter.

The product should look like something a municipal authority could use.

### Brand

Name: RoadPulse AI

Tagline:

"From road detection to road accountability."

Secondary tagline:

"Continuous road-health intelligence powered by everyday bus journeys."

Brand colors:

- Dark navy.
- Slate.
- White.
- Green for healthy.
- Yellow for moderate.
- Orange for poor.
- Red for dangerous.
- Blue for system/information states.

Use colors consistently.

Do not use color alone to communicate status. Include labels and icons.

Every simulated-data screen must visibly display:

**SIMULATED DEMO DATA**

Use a non-intrusive but clearly visible banner/badge.

Do not claim the data is live government data.

---

# 5. APPLICATION ARCHITECTURE

Build a modular full-stack application.

Recommended structure:

```text
roadpulse-ai/
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── map/
│   │   ├── roads/
│   │   ├── processing/
│   │   ├── reports/
│   │   ├── authority/
│   │   ├── demo/
│   │   └── settings/
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   ├── map/
│   │   ├── roads/
│   │   ├── reports/
│   │   ├── processing/
│   │   └── ui/
│   │
│   ├── lib/
│   ├── types/
│   └── hooks/
│
├── backend/
│   ├── main.py
│   ├── api/
│   ├── services/
│   │   ├── ingestion_service.py
│   │   ├── detection_service.py
│   │   ├── aggregation_service.py
│   │   ├── scoring_service.py
│   │   ├── report_service.py
│   │   └── verification_service.py
│   ├── models/
│   ├── schemas/
│   ├── data/
│   └── tests/
│
├── sample_data/
│
├── reports/
│
├── README.md
├── docker-compose.yml
└── .env.example
```

You may use a simpler structure if it is more practical, but keep responsibilities separated.

---

# 6. DASHBOARD NAVIGATION

Create a persistent sidebar on desktop.

Navigation items:

1. Overview
2. Road Health Map
3. Road Segments
4. Processing Center
5. Reports
6. Authority Tracker
7. Demo Data
8. Settings

Include:

- RoadPulse AI logo.
- Current mode badge.
- Selected city/zone.
- Sidebar collapse behavior.
- Responsive mobile navigation.
- Current active page.
- User/profile placeholder.
- System status indicator.

No authentication is required for the prototype unless it is easy to add without slowing down the main work.

---

# 7. OVERVIEW DASHBOARD

Route:

`/`

The Overview page is the first screen shown to judges.

It must immediately communicate:

- How many roads are monitored.
- How many are dangerous.
- How many potholes were detected.
- How many repairs are pending.
- Whether the road situation is improving or deteriorating.
- How the system works.

## Header

Title:

"Road Health Overview"

Subtitle:

"Monitor road condition, detect deterioration, and track maintenance outcomes."

Header controls:

- Week selector: Week 1, Week 2, Week 3, Week 4.
- Compare with previous week.
- Refresh demo data.
- Export current report.
- Simulated Demo Data badge.

## KPI cards

Display:

1. Roads surveyed.
2. Total clustered potholes.
3. Dangerous road segments.
4. Average road-health score.
5. Pending repairs.
6. Verified repairs.
7. Uploads processed.
8. Survey coverage.

Each card should include:

- Main number.
- Label.
- Week-over-week change.
- Small trend indicator.
- Tooltip explaining the metric.

Do not use arbitrary numbers if the supplied dataset can provide the values.

## Main overview sections

### A. Road health distribution

Bar or donut chart showing:

- Grade A.
- Grade B.
- Grade C.
- Grade D.
- Grade E.

### B. Weekly road-health trend

Line chart for:

- Average risk score.
- Total potholes.
- Dangerous segments.

Allow toggling metrics.

### C. Priority roads

Table showing the 5–10 most urgent road segments.

Columns:

- Rank.
- Road name.
- Segment.
- Grade.
- Risk score.
- Potholes.
- Weekly change.
- Authority.
- Repair status.
- View details.

### D. Mini map

Show a meaningful map preview with colored road segments.

Clicking the map opens the full Road Health Map page.

### E. Processing status

Show:

- Videos uploaded.
- Jobs completed.
- Jobs processing.
- Failed jobs.
- Last upload.
- Total frames processed.

### F. Accountability snapshot

Show:

- Reports sent.
- Acknowledged.
- In progress.
- Claimed repaired.
- Verified.
- Failed verification.
- Overdue.

---

# 8. ROAD HEALTH MAP

Route:

`/map`

This is the most important visual part of the prototype.

The map must not open empty.

It must show seeded road segments immediately.

## Map behavior

Use Leaflet or MapLibre.

Default view:

- Fit bounds to all available road segments.
- Use the actual coordinates from the dataset when available.
- If the data has no road geometry, derive a demo road segment from the detection points and label it as simulated.
- Do not use arbitrary coordinates without documenting them.
- Do not place all roads at the same point.

Use a realistic city-level demo extent only if supported by the dataset or clearly marked as simulated.

## Map layers

Provide toggleable layers:

1. Road segments.
2. Individual pothole clusters.
3. Raw detections.
4. Risk heatmap, if practical.
5. Survey coverage.
6. Authority boundaries or zones, if data exists.
7. Repair status.

## Road segment colors

Use the score grade:

| Grade | Score | Color | Label |
|---|---:|---|---|
| A | 0–20 | Green | Good |
| B | 21–40 | Light green | Fair |
| C | 41–60 | Yellow | Moderate |
| D | 61–80 | Orange | Poor |
| E | 81–100 | Red | Dangerous |

Use thick, visible polylines.

Add hover tooltips:

- Road name.
- Segment ID.
- Grade.
- Score.
- Pothole count.
- Weekly change.

On click, open a detail drawer.

## Map filters

Include:

- Week.
- Grade.
- Risk score range.
- Authority.
- Zone.
- Bus route.
- Road type.
- Repair status.
- Worsening roads only.
- Unresolved issues only.
- Survey coverage.

Include a search box:

"Search road, segment, authority, or bus route."

## Map legend

Must be visible.

Include:

- Grade colors.
- Pothole cluster marker.
- Verified repair.
- Pending repair.
- Not recently surveyed.
- Simulated Demo Data disclaimer.

---

# 9. ROAD DETAIL DRAWER / PAGE

Route:

`/roads/[segmentId]`

Clicking a road segment must open a complete detail view.

## Header

Show:

- Road name.
- Segment ID.
- Start point A.
- End point B.
- Zone.
- Authority.
- Road type.
- Current grade.
- Current score.
- Current status.
- Last surveyed date.
- Coverage warning if applicable.

## Main metrics

- Current risk score.
- Pothole count.
- Severe pothole count.
- Potholes per km.
- Average severity.
- Weekly change.
- Days since last survey.
- Repair status.

## Weekly history

Display a chart for Week 1, Week 2, Week 3, Week 4.

Show:

- Risk score.
- Grade.
- Pothole count.
- Severity.
- Survey coverage.
- Report sent marker.
- Repair claimed marker.
- Verification marker.

Example narrative:

"Road condition deteriorated from Grade C in Week 1 to Grade E in Week 3. A report was sent to the responsible authority. The road remains unresolved in Week 4."

Generate this dynamically from the data.

Do not hardcode the narrative if the underlying values differ.

## Evidence

Display:

- Pothole evidence thumbnails.
- Detection timestamp.
- GPS.
- Confidence.
- Severity.
- Source video.
- Frame number.

If no real evidence image exists:

- Show a clean "Evidence unavailable" state.
- Do not use random stock images.
- If using generated placeholders, label them as simulated evidence.

## Road segment mini-map

Show:

- Segment geometry.
- Pothole markers.
- Start/end points.
- Current risk color.

## Authority status

Show:

- Responsible authority.
- Report sent date.
- Current status.
- Due date.
- Repair claimed date.
- Verification result.
- Escalation state.

Buttons:

- View report.
- Export segment CSV.
- Export segment PDF.
- Simulate authority response.
- Simulate repair verification.

---

# 10. PROCESSING CENTER

Route:

`/processing`

This page represents the actual NVDR ingestion workflow.

## Header

Title:

"Video Processing Center"

Subtitle:

"Upload stored bus footage and convert it into road-health intelligence."

## Workflow visualization

Show a stepper:

1. Video stored in bus.
2. Bus arrives at charging station.
3. Upload to server.
4. Metadata validation.
5. Frame sampling.
6. YOLO inference.
7. GPS enrichment.
8. Deduplication.
9. Road matching.
10. Risk scoring.
11. Report generation.

Use a professional visual pipeline.

## Upload section

Create a drag-and-drop upload box.

Accepted:

- MP4.
- MOV.
- AVI if practical.
- Optional GPS sidecar CSV/JSON.

Fields:

- Bus ID.
- Route ID.
- Charging station.
- Upload source.
- Video date.
- Metadata source.

Buttons:

- Upload video.
- Start processing.
- Clear.
- Use demo processing job.

## Important model placeholder

Create an abstraction:

```python
class DetectionProvider:
    def detect(self, video_path, metadata=None):
        raise NotImplementedError
```

Create:

```python
class MockDetectionProvider(DetectionProvider):
    def detect(self, video_path, metadata=None):
        ...
```

Later we will add:

```python
class YOLODetectionProvider(DetectionProvider):
    def detect(self, video_path, metadata=None):
        ...
```

For now, the application must use the mock provider or supplied sample data.

Do not download or install a YOLO model automatically.

Do not require GPU access.

## Processing job table

Columns:

- Job ID.
- Bus ID.
- Video ID.
- Source.
- Duration.
- Uploaded at.
- Status.
- Progress.
- Frames processed.
- Detections.
- Model/provider.
- Processing duration.
- Error.
- View results.

Statuses:

- Queued.
- Uploading.
- Validating.
- Processing.
- Aggregating.
- Completed.
- Failed.
- Cancelled.

## Demo upload behavior

When the user uploads a short video:

- Validate it.
- Create a processing job.
- Show progress.
- Use mock results or supplied demo detections.
- Produce a result summary.
- Update map and road metrics.

If true video decoding is not implemented, provide a clear mock-processing mode rather than pretending that YOLO ran.

---

# 11. DEMO DATA SYSTEM

Route:

`/demo`

This is essential for the ideathon presentation.

The dashboard must show useful data even if no live camera or YOLO model is connected.

## Demo data rules

1. Load the supplied Claude-generated pothole dataset.
2. Normalize it into the application's internal schema.
3. Use deterministic seed data.
4. Keep the original source data unchanged.
5. Clearly label all synthetic/generated records.
6. Support four weekly cycles.
7. Ensure the map contains road segments immediately.
8. Ensure the Overview dashboard contains meaningful metrics immediately.

## Demo controls

Create a Demo Data page with:

- Load dataset.
- Reset dataset.
- Select Week 1.
- Select Week 2.
- Select Week 3.
- Select Week 4.
- Play week-by-week timeline.
- Show only deteriorating roads.
- Show unresolved repairs.
- Show successful repairs.
- Simulate a new video upload.
- Simulate a report sent.
- Simulate authority acknowledgement.
- Simulate claimed repair.
- Simulate repair verification.
- Restore original seed state.

## Required demo scenarios

The dataset/demo layer must include, where supported by the supplied data:

### Scenario 1 — Deteriorating road

Example:

Week 1: Grade C, score 48  
Week 2: Grade D, score 67  
Week 3: Grade E, score 86  
Week 4: Grade E, score 84

Narrative:

"Condition worsened over three weeks. Report sent. No verified maintenance."

### Scenario 2 — Successful repair

Example:

Week 1: Grade D, score 70  
Week 2: Grade D, score 72  
Week 3: Grade C, score 55  
Week 4: Grade B, score 34

Narrative:

"Road condition improved after reported maintenance. Repair verified through subsequent survey."

### Scenario 3 — Failed repair verification

The authority claims repair, but post-repair observations show that the road remains dangerous.

### Scenario 4 — Overdue authority

Report sent, no acknowledgement, issue remains high risk after several weeks.

### Scenario 5 — Not recently surveyed

A road has no recent bus observation. Display:

"Not recently surveyed"

Do not display it as healthy.

## Data disclaimer

Every page using demo records must show:

"SIMULATED DEMO DATA — NOT LIVE GOVERNMENT DATA"

PDF and CSV exports must also include this disclaimer.

---

# 12. ROAD HEALTH SCORING

Create a reusable scoring service.

Initial formula:

```text
Risk Score =
0.40 × Severity
+ 0.25 × Density
+ 0.20 × Trend
+ 0.15 × Context
```

Normalize every component to 0–100.

## Components

### Severity

Use available severity information.

If missing:

- Derive a clearly labeled prototype estimate from supplied fields.
- Do not claim actual pothole depth unless available.

### Density

Use:

```text
clustered potholes / road length in km
```

Normalize to 0–100 using configurable thresholds.

### Trend

Measure deterioration or improvement across weekly observations.

### Context

Use available context such as:

- Weather scenario.
- Road type.
- Speed context.
- Coverage confidence.

If weather data is not provided, do not silently fetch or claim real weather. Use a simulated context field if needed.

## Grading

A: 0–20  
B: 21–40  
C: 41–60  
D: 61–80  
E: 81–100

Make weights and thresholds configurable.

Display a score explanation on the road detail page.

---

# 13. AUTHORITY TRACKER

Route:

`/authority`

Create a complete accountability dashboard.

## Summary cards

- Total reports.
- Pending.
- Sent.
- Acknowledged.
- In progress.
- Claimed repaired.
- Verified.
- Failed verification.
- Overdue.

## Issue table

Columns:

- Issue ID.
- Road.
- Segment.
- Authority.
- Priority.
- Risk score.
- Report sent.
- Due date.
- Status.
- Repair claim.
- Verification.
- Days unresolved.
- View.

## Status lifecycle

```text
Detected
    ↓
Report generated
    ↓
Sent to authority
    ↓
Acknowledged
    ↓
In progress
    ↓
Claimed repaired
    ↓
Verified repaired
```

Alternative endings:

- Failed verification.
- Overdue.
- Unverified due to insufficient survey coverage.

## Authority detail

Show:

- Authority name.
- Assigned roads.
- Open issues.
- Average response time.
- Overdue issues.
- Verified repairs.
- Failed repairs.
- Weekly performance.

Use demo data if real authority integration is not available.

Do not send actual emails or government complaints.

---

# 14. REPORTS

Route:

`/reports`

Create a polished report center.

## Weekly report generator

Controls:

- Select week.
- Select zone.
- Select authority.
- Include evidence.
- Include map snapshot.
- Include unresolved issues.
- Generate PDF.
- Export CSV.

## PDF content

The PDF must include:

1. RoadPulse AI branding.
2. "SIMULATED DEMO DATA" disclaimer.
3. Reporting period.
4. Executive summary.
5. Road health distribution.
6. Total potholes.
7. Dangerous roads.
8. Worsening roads.
9. Top priority roads.
10. Authority accountability.
11. Repair verification.
12. Weekly comparison.
13. Methodology.
14. Data disclaimer.

## CSV exports

Implement:

- `detections.csv`
- `road_segments.csv`
- `weekly_history.csv`
- `authority_actions.csv`
- `processing_jobs.csv`

Use real generated data from the database.

Do not create a fake download button.

The export must produce a real file.

---

# 15. DATA MODEL

Create models for:

## Bus

```text
bus_id
route_id
camera_id
charging_station_id
```

## ChargingStation

```text
station_id
name
location
network_id
```

## VideoAsset

```text
video_id
bus_id
route_id
upload_time
duration
metadata_source
status
file_path
```

## Detection

```text
detection_id
video_id
bus_id
frame_number
timestamp
latitude
longitude
confidence
severity
bbox
road_segment_id
evidence_path
data_source
```

## PotholeCluster

```text
cluster_id
segment_id
centroid_lat
centroid_lon
first_seen
last_seen
observation_count
```

## RoadSegment

```text
segment_id
road_name
geometry
start_point
end_point
length_km
road_type
authority_id
```

## WeeklyRoadMetric

```text
segment_id
week
pothole_count
severe_count
density
severity
trend
context
risk_score
grade
surveyed
coverage_confidence
```

## Authority

```text
authority_id
name
department
zone
```

## IssueReport

```text
issue_id
segment_id
authority_id
priority
sent_at
due_at
status
```

## RepairVerification

```text
verification_id
issue_id
survey_week
result
before_score
after_score
notes
```

## ProcessingJob

```text
job_id
video_id
status
progress
frames_processed
detections_count
provider
model_version
duration
error
```

---

# 16. API ENDPOINTS

Implement working endpoints.

```text
GET    /api/health

POST   /api/upload
GET    /api/jobs
GET    /api/jobs/{job_id}

GET    /api/roads
GET    /api/roads/{segment_id}
GET    /api/map

GET    /api/metrics/overview
GET    /api/metrics/weekly

GET    /api/reports/weekly
GET    /api/exports/csv

GET    /api/authority/issues
POST   /api/authority/issues/{issue_id}/status

POST   /api/verification/{issue_id}

POST   /api/demo/load
POST   /api/demo/reset
POST   /api/demo/simulate-upload
POST   /api/demo/simulate-repair
```

Support filters through query parameters.

Use typed request/response schemas.

Return useful error messages.

---

# 17. FRONTEND COMPONENTS

Create reusable components:

- Sidebar.
- Topbar.
- DemoDataBanner.
- KPI cards.
- RiskBadge.
- GradeBadge.
- RoadHealthChart.
- WeeklyTrendChart.
- RoadPriorityTable.
- InteractiveRoadMap.
- RoadDetailDrawer.
- RoadTimeline.
- PotholeEvidenceGrid.
- UploadDropzone.
- ProcessingStepper.
- JobStatusTable.
- AuthorityStatusBadge.
- RepairVerificationCard.
- ReportGenerator.
- ExportButtons.
- EmptyState.
- LoadingState.
- ErrorState.
- FilterBar.
- SearchInput.
- WeekSelector.
- MapLegend.

Avoid duplicating UI logic.

---

# 18. MAP DATA AND GEOSPATIAL LOGIC

Use GeoJSON for map-ready data.

Example:

```json
{
  "type": "Feature",
  "properties": {
    "segment_id": "SEG-001",
    "road_name": "Example Road",
    "risk_score": 86,
    "grade": "E",
    "week": 3,
    "pothole_count": 22,
    "authority": "Demo Municipal Authority"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [75.7873, 26.9124],
      [75.7920, 26.9150]
    ]
  }
}
```

Important:

- GeoJSON coordinates are `[longitude, latitude]`.
- Keep map data separate from UI state.
- Use road geometry if supplied.
- Use point-to-segment matching only where data supports it.
- Show a coverage warning when geometry or GPS is unavailable.

---

# 19. VIDEO AND METADATA HANDLING

The actual NVDR camera integration is future work.

For now:

- Support sample video upload.
- Support optional GPS/timestamp sidecar file.
- Validate metadata.
- Show metadata source.
- Provide a mock processing provider.
- Keep a clear provider interface for future YOLO.

Expected future metadata formats may include:

- Embedded video metadata.
- Separate GPS logs.
- Camera-specific proprietary metadata.
- GPS overlays.

Do not assume all NVDR cameras use the same format.

---

# 20. RESPONSIVENESS

The dashboard must work on:

- Desktop.
- Laptop.
- Tablet.

Prioritize desktop because this is a presentation dashboard.

At smaller widths:

- Sidebar collapses.
- Tables become scrollable or card-based.
- Map remains usable.
- Filters wrap.
- Charts resize.
- No horizontal page overflow.

---

# 21. UX REQUIREMENTS

Every page must include:

- Loading state.
- Empty state.
- Error state.
- Success feedback.
- Clear labels.
- Helpful tooltips.
- Keyboard-accessible controls.
- Accessible contrast.
- Status text alongside colors.

Avoid:

- Dead buttons.
- Fake progress bars that never update.
- Fake exports.
- Unclear icons.
- Excessive modals.
- Unnecessary animations.

---

# 22. DEMO PRESENTATION MODE

Create a polished presentation workflow.

The judges should be able to:

1. Open the dashboard.
2. See the simulated road map populated immediately.
3. Select Week 1.
4. Show road condition.
5. Select Week 2.
6. Show deterioration.
7. Select Week 3.
8. Show dangerous roads and report sent.
9. Select Week 4.
10. Show unresolved authority issue.
11. Open a road detail page.
12. Show pothole evidence and timeline.
13. Show successful repair on another road.
14. Show repair verification.
15. Export PDF.
16. Export CSV.
17. Upload a sample video.
18. Show a processing job using the mock provider.

Create a "Presentation Mode" or "Demo Mode" if useful.

It should allow the presenter to move through the story quickly.

---

# 23. TESTING REQUIREMENTS

Before declaring completion:

### Frontend

- All routes load.
- Sidebar navigation works.
- Filters work.
- Week selector updates data.
- Map renders segments.
- Road click opens details.
- Charts update.
- Upload form works.
- Export buttons work.

### Backend

- Health endpoint works.
- Demo load works.
- Demo reset works.
- Road endpoints work.
- Weekly metrics work.
- Report generation works.
- CSV export works.
- Processing jobs work.
- Status updates work.

### Data

- Dataset is loaded.
- No duplicate IDs.
- Coordinates are valid.
- Weekly values are valid.
- Road segments have grades.
- Map has visible data.
- Simulated disclaimer appears.

### Build

Run:

```bash
npm run build
```

and backend tests.

Fix all build errors.

Do not stop at "the code is written."

---

# 24. README REQUIREMENTS

Create a detailed README containing:

- Project overview.
- Features.
- Architecture.
- Setup instructions.
- Environment variables.
- How to run frontend.
- How to run backend.
- How to load demo data.
- How to upload a video.
- How to generate reports.
- Dataset format.
- YOLO integration instructions for later.
- Known limitations.
- Demo presentation steps.
- Simulated data disclaimer.

---

# 25. IMPORTANT DEVELOPMENT RULES

1. Build a working product, not a static design.
2. Use the supplied sample data.
3. Do not connect YOLO yet.
4. Do not require a GPU.
5. Do not require external paid APIs.
6. Do not require government API access.
7. Do not send actual reports to authorities.
8. Do not invent official government data.
9. Label all synthetic data.
10. Do not hide missing data.
11. Do not make the map empty.
12. Do not use fake buttons.
13. Keep the code modular.
14. Use realistic demo behavior.
15. Preserve the ability to plug in YOLO later.
16. Prioritize a polished working demo over unnecessary advanced features.
17. If a dependency or map tile service is unavailable, provide a useful fallback.
18. Do not wait for clarification if a reasonable implementation decision can be made.
19. Inspect and use the attached PRD and dataset before finalizing the schema.
20. After implementation, run the application and verify the main user flow.

---

# 26. DEFINITION OF DONE

The project is complete only when:

- The dashboard runs locally.
- The map displays road segments immediately.
- Four weekly cycles are available.
- The data comes from the supplied dataset or clearly labeled deterministic demo data.
- Road grades and risk scores work.
- Road detail pages work.
- Deterioration history works.
- Authority tracking works.
- Repair verification works.
- Processing center works with mock inference.
- Upload UI works.
- PDF export works.
- CSV export works.
- Demo reset works.
- The application is responsive.
- No major console/build errors remain.
- README explains how to run it.
- YOLO integration is cleanly separated for later.

Start by inspecting the provided files, then implement the application end-to-end.

Do not only give me a plan.

Build the actual project.