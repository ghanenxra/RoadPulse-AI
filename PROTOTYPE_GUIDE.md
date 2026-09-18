# RoadPulse AI — Prototype User Guide & Feature Manual

> **"From Road Detection to Road Accountability"**  
> Complete walkthrough and operational guide to every screen, feature, control, and workflow in the RoadPulse AI prototype.

---

## Table of Contents

1. [Quick Navigation Map](#1-quick-navigation-map)
2. [Screen-by-Screen Walkthrough](#2-screen-by-screen-walkthrough)
   - [2.1 Overview Dashboard (`/`)](#21-overview-dashboard-)
   - [2.2 Interactive Road Health Map (`/map`)](#22-interactive-road-health-map-map)
   - [2.3 Road Network Directory & Ledger (`/roads`)](#23-road-network-directory--ledger-roads)
   - [2.4 Deep Corridor Detail View (`/roads/[segmentId]`)](#24-deep-corridor-detail-view-roadssegmentid)
   - [2.5 Video Processing Center & YOLOv8 Ingestion (`/processing`)](#25-video-processing-center--yolov8-ingestion-processing)
   - [2.6 Municipal SLA & Accountability Tracker (`/authority`)](#26-municipal-sla--accountability-tracker-authority)
   - [2.7 Executive PDF Reports & CSV Data Exports (`/reports`)](#27-executive-pdf-reports--csv-data-exports-reports)
   - [2.8 Ideathon Demo Data Control Center (`/demo`)](#28-ideathon-demo-data-control-center-demo)
   - [2.9 System Settings & Scoring Configuration (`/settings`)](#29-system-settings--scoring-configuration-settings)
3. [Core Interactive Workflows](#3-core-interactive-workflows)
   - [Workflow A: Ingesting Dashcam Video & Live YOLOv8 GPU Inference](#workflow-a-ingesting-dashcam-video--live-yolov8-gpu-inference)
   - [Workflow B: Enforcing Municipal SLA & Running AI Repair Verification](#workflow-b-enforcing-municipal-sla--running-ai-repair-verification)
   - [Workflow C: Exporting Executive PDF Dossiers & CSV Open Data](#workflow-c-exporting-executive-pdf-dossiers--csv-open-data)
   - [Workflow D: Resetting and Managing Demo States](#workflow-d-resetting-and-managing-demo-states)
4. [Ideathon / Jury Presentation Script (3-Minute Winning Demo)](#4-ideathon--jury-presentation-script-3-minute-winning-demo)

---

## 1. Quick Navigation Map

The prototype web application operates with a persistent sidebar and top header:

| Page Route | Menu Title | Icon | Primary Function |
| :--- | :--- | :--- | :--- |
| `/` | **Overview** | `LayoutDashboard` | Whole-city executive KPIs, 4-week degradation trends, priority risk list |
| `/map` | **Road Health Map** | `Map` | Interactive Leaflet GIS vector map with 20 OSRM-stitched road polylines |
| `/roads` | **Road Network** | `Compass` | Tabular registry of all 20 monitored corridors with filters and sorting |
| `/roads/[id]` | **Corridor Detail** | `FileText` | Multi-week health progression, defect cards, and authority SLA history |
| `/processing` | **Processing Center** | `Cpu` | Video upload, 1-click sample dashcam clips, live YOLOv8 GPU inference |
| `/authority` | **Authority Tracker** | `ShieldAlert` | 21-Day SLA countdown clocks, dispatch tickets, repair claim audits |
| `/reports` | **Reports & Exports** | `FileDown` | Programmatic ReportLab PDF dossier generation & streaming CSV exports |
| `/demo` | **Demo Control Center** | `Sparkles` | 4-week automated playback, presentation scenarios, 3 reset buttons |
| `/settings` | **Settings** | `Sliders` | Mathematical risk formula weights, confidence thresholds, system info |

---

## 2. Screen-by-Screen Walkthrough

### 2.1 Overview Dashboard (`/`)

The primary command center presenting high-level intelligence across the municipal transit network.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Jaipur Smart Transit Network]                  [Week 1] [Week 2] [Week 3] [Week 4] │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│ 20 Corridors │ 826 Potholes │ 4 Dangerous  │ 52.4 Avg Risk│ 6 Pending SLAs │
├──────────────┴──────────────┴──────────────┴──────────────┴────────────────┤
│ [ 4-Week Health Distribution Bar Chart ]  [ Priority Corridors Quick-Action]│
│ [ 4-Week Whole-City Risk Progression   ]  [ Recent Camera Upload Status    ]│
└────────────────────────────────────────────────────────────────────────────┘
```

#### Key Elements & Interactive Features:
1. **Global Cycle Selector (Topbar):** Switch between **Week 1** (baseline scan), **Week 2** (wear observed), **Week 3** (reports sent), and **Week 4** (SLA enforcement & verification). All dashboard KPIs dynamically recalculate upon selection.
2. **8 Executive KPI Cards:**
   - **Roads Surveyed:** Total active corridors monitored (20 corridors).
   - **Total Detected Potholes:** Cumulative physical defects detected across the network.
   - **Dangerous Segments:** High-risk corridors falling into Grade D or Grade E.
   - **Average Risk Score:** Network-wide road health index (0–100 scale).
   - **Pending Authority Repairs:** Active municipal tickets awaiting civic action.
   - **AI-Verified Repairs:** Fixed corridors successfully confirmed via subsequent bus scans.
   - **Uploads Processed:** Total bus dashcam video runs ingested and analyzed.
   - **Survey Coverage:** Public bus route transit coverage percentage.
3. **Road Health Distribution (Recharts):** Visual bar breakdown of corridors categorized across Grades A through E.
4. **Priority Action Corridors:** Direct list of the top highest-risk roads requiring immediate intervention, with direct links to their detailed audit pages.
5. **City-Wide Risk Trend:** Multi-week trajectory curve illustrating condition trends over time.

---

### 2.2 Interactive Road Health Map (`/map`)

A high-performance Leaflet vector map rendering real road vectors stitched to OpenStreetMap carriageways.

#### Key Elements & Interactive Features:
1. **OSRM-Stitched Polylines:** Unlike primitive straight lines that cross through buildings, RoadPulse AI routes exact curves, turns, and flyovers across 20 Jaipur corridors (Tonk Road, Ajmer Road, Sikar Road, JLN Marg, etc.).
2. **Condition Color Gradients:**
   - 🟢 **Grade A (Green):** Pristine road ($0\text{--}20$ score)
   - 🥬 **Grade B (Light Green):** Good / Normal wear ($21\text{--}40$ score)
   - 🟡 **Grade C (Yellow):** Moderate wear ($41\text{--}60$ score)
   - 🟠 **Grade D (Orange):** Poor / Hazardous ($61\text{--}80$ score)
   - 🔴 **Grade E (Red):** Critical / Danger ($81\text{--}100$ score)
3. **Interactive Segment Popups:** Clicking any corridor polyline displays an inspection card featuring:
   - Corridor ID and Official Name (e.g. `TR-01` Tonk Road)
   - Jurisdiction (JMC Greater, PWD Rajasthan, JDA)
   - Current Risk Score & Condition Grade
   - Pothole Count and Defect Density per km
   - Direct button: **"Inspect Corridor Details →"**
4. **Filter Controls:** Filter displayed roads by Grade (All, A, B, C, D, E) and by Authority (JMC Greater, JMC Heritage, PWD, JDA).

---

### 2.3 Road Network Directory & Ledger (`/roads`)

The tabular registry for city engineers and municipal commissioners.

#### Key Elements & Interactive Features:
1. **Search Bar:** Real-time text search filtering by corridor name, sub-corridor name, or municipal authority.
2. **Tabular Columns:**
   - Corridor Code (`TR-01`, `AJ-01`, etc.)
   - Corridor Name & Section Details
   - Responsible Civic Authority
   - Road Length (km)
   - Pothole Count & Density
   - 0–100 Risk Score with color-coded Grade Badge
   - SLA Repair Status (`Normal`, `Reported`, `In Progress`, `Overdue`, `Verified`)
3. **Row Navigation:** Click any row to navigate directly to that corridor's deep analytics view.

---

### 2.4 Deep Corridor Detail View (`/roads/[segmentId]`)

Provides granular forensic evidence and historical degradation data for an individual road corridor.

#### Key Elements & Interactive Features:
1. **Corridor Summary Banner:** Displays the current grade badge, responsible civic authority, ward number, and linear length.
2. **4-Week Historical Progression Table:**
   - Week-by-week history showing Pothole Count, Mean Severity ($1.0\text{--}5.0$), Average Estimated Depth (cm), Rainfall (mm), Risk Score, Grade, and Audit Status Notes.
3. **Risk Score Progression Chart:** Recharts area chart illustrating degradation velocity or post-repair recovery.
4. **Spatial Defect Evidence Grid:**
   - Visual cards for detected potholes along the corridor.
   - Shows YOLO detection confidence score (e.g., $94\%$).
   - Estimated lateral depth in centimeters ($0\text{--}15\text{ cm}$).
   - Exact chainage distance along the road (e.g., $+340\text{ m}$ from start).
   - Timestamp and detection status.
5. **Municipal Accountability Card:**
   - Displays current ticket status: Reported, Acknowledged, In Progress, Overdue (with red alert box), or Verified Fix.
   - 21-day statutory repair countdown.

---

### 2.5 Video Processing Center & YOLOv8 Ingestion (`/processing`)

The AI nerve center where dashcam footage is ingested, decoded, and analyzed using the fine-tuned YOLOv8 deep learning network.

#### Key Elements & Interactive Features:
1. **Pipeline Stage Architecture:** Visual 11-stage diagram detailing the transit-to-dispatch workflow.
2. **1-Click Sample Dashcam Ingestion (Ideal for Live Jury Demos):**
   Four pre-bundled clips stored locally in `sample_data/`:
   - 🎬 **Tonk Road Morning Transit** (`clip_1_tonk_road_morning.mp4`)
   - 🎬 **Ajmer Road Pothole Cluster** (`clip_2_ajmer_road_pothole_cluster.mp4`)
   - 🎬 **JLN Marg Radial Boulevard** (`clip_3_jln_marg_radial.mp4`)
   - 🎬 **Master Dashcam Sweep** (`sample_dashcam_pothole_clip.mp4`)
   *Clicking any button instantly triggers the full pipeline on your local GPU/CPU without needing manual file browsing.*
3. **Manual Video Upload Dropzone:**
   - Drag and drop any custom MP4 / MOV / AVI video file.
   - Select Bus ID (`BUS-1`, `BUS-2`, `BUS-3`), Charging Station, and Target Corridor.
   - Click upload to execute inference.
4. **Live Job Queue & Telemetry:**
   - Shows active and completed processing jobs.
   - Progress bar ($0\%\text{--}100\%$) indicating real-time decimation and inference.
   - Total frames processed and detected pothole count.
   - **Inspect Detections Button (`Eye` Icon):** Opens the forensic inspection modal.
5. **Forensic Inspection Modal:**
   - **Table Tab:** Tabular list of every detected pothole with bounding box coordinates, confidence percentage, lateral depth estimate, and GPS coordinates.
   - **Telemetry JSON Tab:** Full machine-readable payload. Includes a **"Copy JSON"** button to copy raw telemetry directly to clipboard for jury inspection.
6. **Reset Button:** "Reset Only Video Ingested Data" clears test runs without touching baseline corridor records.

---

### 2.6 Municipal SLA & Accountability Tracker (`/authority`)

The civic enforcement interface holding authorities accountable for prompt repairs.

#### Key Elements & Interactive Features:
1. **Civic Jurisdiction Cards:**
   - **Jaipur Municipal Corporation (Greater):** Manages urban commercial and residential zones.
   - **Jaipur Municipal Corporation (Heritage):** Manages Old Walled City and historic zones.
   - **Public Works Department (PWD Rajasthan):** Manages state highways and arterials.
   - **Jaipur Development Authority (JDA):** Manages master plan routes and bypasses.
2. **SLA Compliance Summary:**
   - Total Repair Notices Issued
   - On-Time Repair Compliance Rate
   - Overdue Default Tickets
   - AI-Confirmed Permanent Fixes
3. **Interactive Issue Reports Ledger:**
   - Displays all active and historical road repair tickets.
   - Live **21-Day SLA Countdown Timer** indicating remaining statutory days or overdue penalties.
4. **Simulation Action Buttons:**
   - **"Simulate Authority Acknowledge":** Simulates municipal engineer acknowledging receipt of the ticket.
   - **"Simulate Claim Repair":** Simulates municipal contractor claiming pothole patching is complete.
   - **"Trigger AI Verification Sweep":** Dispatches a virtual bus re-scan to mathematically verify whether the pavement was truly fixed.

---

### 2.7 Executive PDF Reports & CSV Data Exports (`/reports`)

The administrative reporting engine enabling executive dissemination and open-data transparency.

#### Key Elements & Interactive Features:
1. **Programmatic PDF Report Generation (ReportLab 4.0):**
   - Select cycle week (Week 1 through 4), municipal zone, and authority filter.
   - Click **"Generate PDF Report"**.
   - Compiles a multi-page PDF document complete with executive KPI metrics, priority corridor tables, condition grade breakdowns, and formal municipal header layouts.
   - Directly triggers a clean browser download via HTML5 Blob streaming.
2. **Tabular CSV Data Exports (Open Data):**
   Five dedicated streaming endpoints for GIS systems and audit trails:
   - 📄 **Raw Detections CSV:** Every individual pothole observation with lat/long and confidence.
   - 📄 **Road Segments CSV:** All 20 corridors with length, authority, and baseline metrics.
   - 📄 **Weekly History CSV:** Complete 4-week degradation time-series across all segments.
   - 📄 **Authority Actions CSV:** Municipal SLA ticket lifecycle records and timestamps.
   - 📄 **Processing Jobs CSV:** GPU inference benchmarks, frame counts, and run durations.

---

### 2.8 Ideathon Demo Data Control Center (`/demo`)

The presenter control room for managing presentations, fast-forwarding time, or resetting database states.

#### Key Elements & Interactive Features:
1. **4-Week Timeline Playback:**
   - Click **"Play Timeline"** to trigger automated whole-city playback.
   - Automatically advances cycles every 2.5 seconds (Week 1 $\rightarrow$ Week 2 $\rightarrow$ Week 3 $\rightarrow$ Week 4) so judges can watch city road health dynamically degrade and recover.
2. **4 Curated Presentation Scenarios:**
   - **Scenario 1 (Tonk Road TR-01):** Chronic deterioration from Grade C ($45$) to Grade E ($88$). Breached 21-day SLA.
   - **Scenario 2 (Ajmer Road AJ-01):** Successful repair & AI verification. Risk drops from $80$ down to $22$ (`Verified Fix`).
   - **Scenario 3 (Sikar Road SR-01):** Monsoon rain surge ($42\text{ mm}$) triggering a pothole spike. Patching in progress.
   - **Scenario 4 (Civil Lines CL-01):** Pristine VIP route maintaining Grade A across all weeks.
3. **Three Granular Database Management Buttons:**
   - 🟢 **"Add 20 Demo Roads to Dashboard":** Restores all 20 Jaipur corridors with OSRM-stitched geometry.
   - 🟡 **"Reset Only Video Ingested Data":** Wipes video runs and detections while preserving the 20 baseline roads and historical charts.
   - 🔴 **"Complete Data Reset (Wipe All)":** Performs a complete clean database wipe.

---

### 2.9 System Settings & Scoring Configuration (`/settings`)

The engineering panel allowing administrators to customize the mathematical risk formula and operational thresholds.

#### Key Elements & Interactive Features:
1. **Scoring Weight Adjusters:**
   - Severity Weight (Default: $0.40$)
   - Density Weight (Default: $0.25$)
   - Trend Degradation Weight (Default: $0.20$)
   - Environmental Context Weight (Default: $0.15$)
2. **Threshold Configuration:**
   - YOLO Confidence Threshold ($\tau = 0.35$)
   - DBSCAN Spatial Clustering Radius ($\varepsilon = 15\text{m}$)
   - Municipal SLA Default Duration ($21\text{ days}$)
3. **System Environment Diagnostics:**
   - Local Inference Mode (GPU CUDA vs CPU Fallback)
   - Active Model Weight Path (`model/Yolov8-fintuned-on-potholes.pt`)
   - SQLite Database Path & Write-Ahead Log Status

---

## 3. Core Interactive Workflows

### Workflow A: Ingesting Dashcam Video & Live YOLOv8 GPU Inference
1. Navigate to **Processing Center** (`/processing`).
2. Under **"1-Click Pre-bundled Dashcam Clips"**, click **"Ajmer Road Pothole Cluster"** (or drag an MP4 into the dropzone).
3. Observe the live notification: *"'clip_2_ajmer_road_pothole_cluster.mp4' loaded → YOLO running on local GPU..."*
4. Watch the progress bar advance through keyframe decimation and deep learning inference.
5. Once complete, click the **Inspect (`Eye`)** icon next to the job.
6. Review the detected potholes, bounding boxes, and lateral depth estimates.
7. Click **"Copy JSON"** to copy the raw telemetry payload for presentation.

---

### Workflow B: Enforcing Municipal SLA & Running AI Repair Verification
1. Navigate to **Authority Tracker** (`/authority`).
2. Locate corridor **`TR-01` (Tonk Road)** showing a red **`OVERDUE`** badge with 0 days remaining.
3. Locate corridor **`AJ-01` (Ajmer Road)** where the authority has submitted a repair claim.
4. Click **"Trigger AI Verification Sweep"**.
5. The system compares the baseline risk score ($80$) against the post-repair bus survey score ($22$).
6. Because risk reduction is $>40\%$, the ticket status automatically updates to **`VERIFIED FIX`** with a green seal.

---

### Workflow C: Exporting Executive PDF Dossiers & CSV Open Data
1. Navigate to **Reports** (`/reports`).
2. Under **Executive Weekly PDF Report**, select **Week 4** and leave Authority as **"All Authorities"**.
3. Click **"Generate PDF Report"**.
4. The backend compiles the document via ReportLab and initiates an instant browser download.
5. Open the downloaded PDF to view the executive summary, road health ledger, and priority intervention table.
6. Scroll down to **Raw Data CSV Exports** and click **"Download Detections CSV"** to inspect geocoded coordinates.

---

### Workflow D: Resetting and Managing Demo States
1. Navigate to **Demo Control Center** (`/demo`).
2. If you ran video tests and want a clean slate for the jury, click **"Reset Only Video Ingested Data"**.
3. If you ever wiped the entire database, click **"Add 20 Demo Roads to Dashboard"** to instantly restore all 20 Jaipur corridors.

---

## 4. Ideathon / Jury Presentation Script (3-Minute Winning Demo)

Use this step-by-step walkthrough to present RoadPulse AI to judges or municipal stakeholders:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       3-MINUTE JURY PITCH PROGRESSION                       │
│                                                                             │
│  [0:00 - 0:40] Problem & Vision ──► Overview Dashboard (Week 1 vs Week 4)   │
│  [0:40 - 1:20] Real GIS Vectoring ──► Road Health Map (OSRM 20 Corridors)   │
│  [1:20 - 2:05] Live AI Inference ──► Processing Center (1-Click YOLOv8)     │
│  [2:05 - 2:40] The Secret Sauce ──► Authority Tracker (Closed-Loop AI Audit)│
│  [2:40 - 3:00] Executive Dossier ──► Instant ReportLab PDF Download         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### [0:00 – 0:40] Introduction & Problem Statement
- **Action:** Open Dashboard at `http://localhost:3001` (or `3000`). Select **Week 1** in the topbar.
- **Script:** *"Judges, Indian cities spend thousands of crores annually on road maintenance, yet citizens continue to suffer from dangerous potholes. Why? Because road inspection today relies on manual complaints or rare, expensive survey vehicles. RoadPulse AI transforms existing electric city buses into continuous, autonomous road intelligence scanners. By leveraging forward-facing bus dashcams, we scan the entire city transit network every single day at zero incremental vehicle cost."*
- **Action:** Switch to **Week 4** in the topbar. Point out the KPI change: 826 potholes detected, 4 dangerous corridors, and 6 active municipal SLAs.

---

### [0:40 – 1:20] Real Geospatial Road-Snapping
- **Action:** Click **Road Health Map** in the sidebar.
- **Script:** *"Unlike standard prototypes that draw fake straight lines across city blocks, RoadPulse AI integrates the Open Source Routing Machine (OSRM). Every single coordinate is snapped to real OpenStreetMap carriageways and flyovers across 20 major Jaipur arteries."*
- **Action:** Zoom into **Tonk Road (`TR-01`)** and click the red line.
- **Script:** *"Here on Tonk Road, the road has deteriorated to Grade E with an 88 risk score. Clicking the corridor reveals our 4-criteria risk formula—balancing defect severity, spatial density, degradation velocity, and monsoon rainfall impact."*

---

### [1:20 – 2:05] Live Deep Learning Inference
- **Action:** Click **Processing Center** in the sidebar.
- **Script:** *"When buses return to EV charging depots overnight, video feeds offload over Wi-Fi. Let's run live inference."*
- **Action:** Click the **"Ajmer Road Pothole Cluster"** 1-click button.
- **Script:** *"The backend extracts keyframes at 1 FPS using OpenCV to eliminate redundant stationary frames. It passes them through our fine-tuned YOLOv8 model running on our local GPU. In addition to bounding boxes, our geometric horizon heuristic calculates estimated pothole depth in centimeters."*
- **Action:** Click the **Inspect (`Eye`)** icon on the completed job, switch to the **JSON tab**, and click **"Copy JSON"**.
- **Script:** *"Every single detection is geocoded, deduplicated with DBSCAN, and made available as standard telemetry."*

---

### [2:05 – 2:40] The Game Changer: Closed-Loop AI Verification
- **Action:** Click **Authority Tracker** in the sidebar.
- **Script:** *"Here is where RoadPulse AI goes from a simple detection tool to an accountability platform. When a road hits Grade D or E, an automated ticket is dispatched to the responsible body—whether JMC Greater, PWD Rajasthan, or JDA—with a statutory 21-day SLA clock."*
- **Action:** Show Tonk Road in red **`OVERDUE`** status. Then show Ajmer Road where the authority claimed work was completed.
- **Action:** Click **"Trigger AI Verification Sweep"**.
- **Script:** *"Authorities cannot simply sign off on paper anymore. When the bus completes its next transit cycle over Ajmer Road, our AI re-scans the pavement. Seeing a risk drop from 80 to 22, the system automatically marks it as a 'Verified Fix'. If the patch was poor, it escalates as a failed verification."*

---

### [2:40 – 3:00] Administrative Dossier & Wrap-Up
- **Action:** Click **Reports** in the sidebar. Click **"Generate PDF Report"**.
- **Action:** Open the downloaded PDF in the browser.
- **Script:** *"With one click, city commissioners receive an automated, publication-ready executive dossier with priority intervention lists and audit trails. RoadPulse AI is cost-effective, scalable to any bus fleet, and creates true civic accountability for safer roads. Thank you!"*
