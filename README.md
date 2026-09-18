# RoadPulse AI — Road Health Intelligence Dashboard

> **"From Road Detection to Road Accountability"**

An AI-powered road-health monitoring platform engineered for municipal transit networks and electric city buses. RoadPulse AI leverages existing Network Vehicle Digital Recorders (NVDR) already mounted on public bus windshields to continuously monitor road infrastructure, detect pavement defects using custom fine-tuned deep learning models, stitch coordinates to real OpenStreetMap carriageways, and enforce strict accountability for civic repairs.

---

## 📚 Architectural & Technical Documentation

For in-depth technical specifications, review the dedicated system architecture documents:

- 🛠️ **[Complete Technology Stack & Specifications (`TECH_STACK.md`)](TECH_STACK.md)** — Detailed breakdown of YOLOv8, PyTorch, OpenCV, OSRM, Leaflet, FastAPI, SQLAlchemy 2.0, Next.js 14, ReportLab, and hardware requirements.
- 🔄 **[End-to-End System Pipeline (`PIPELINE.md`)](PIPELINE.md)** — 10-step capture-to-repair pipeline with Mermaid diagrams, mathematical risk formulations, DBSCAN spatial clustering, and closed-loop AI verification.

---

## 🚀 Key Features

- **Interactive Road Health Map** — Vector mapping powered by Leaflet and OpenStreetMap with OSRM-stitched geometry across 20 high-traffic Jaipur transit corridors and color-coded condition gradients ($A\text{--}E$).
- **Deep Learning Inference Engine** — Integrated fine-tuned YOLOv8 model (`model/Yolov8-fintuned-on-potholes.pt`) with CUDA GPU acceleration and CPU fallback for real-time pothole bounding box detection.
- **Geometric Depth & Severity Estimation** — Estimates physical pothole depth ($0\text{--}15\text{ cm}$) using vehicle horizon pitch heuristics and classifies defects into Minor, Moderate, Severe, and Critical.
- **Spatial Clustering & Deduplication** — Scikit-Learn DBSCAN clustering ($\varepsilon = 15\text{m}$) merges repeat detections across multiple bus passes into persistent physical defect records.
- **Road-Snapping Infrastructure** — Snaps raw GPS points to real OpenStreetMap carriageways and flyovers via Open Source Routing Machine (OSRM) integration.
- **1-Click Sample Dashcam Ingestion** — Pre-bundled Jaipur dashcam video clips accessible directly from the Processing Center UI for instant offline jury demonstrations.
- **Multi-Criteria Road Health Scoring** — Standardized 0–100 index combining Severity ($40\%$), Defect Density ($25\%$), Degradation Velocity ($20\%$), and Environmental Context ($15\%$).
- **Statutory Municipal SLA Tracker** — Automated ticket dispatch with 21-day repair countdowns for Jaipur Municipal Corporation (Greater & Heritage), PWD Rajasthan, and Jaipur Development Authority (JDA).
- **Closed-Loop AI Verification** — Re-surveys repaired corridors on subsequent bus cycles, automatically validating repairs ($\ge 40\%$ risk reduction) or escalating failed fixes ($<20\%$ reduction).
- **Executive Dossiers & Open Data** — Automated programmatic ReportLab PDF generation and sanitized CSV data streaming for departmental audit trails.

---

## 🛠️ Technology Stack Summary

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Deep Learning** | **YOLOv8 + PyTorch** | Fine-tuned pothole detection network (`model/Yolov8-fintuned-on-potholes.pt`) |
| **Computer Vision** | **OpenCV (`opencv-python`)** | Video container parsing, 1 FPS keyframe decimation, frame normalization |
| **Geospatial & Mapping**| **OSRM + Leaflet.js + OSM** | Real road vector geometry, OSRM road-snapping, and interactive map UI |
| **Spatial Deduplication**| **Scikit-Learn (DBSCAN)** | Density-based spatial clustering ($\varepsilon = 15\text{m}$) across bus passes |
| **Backend Service** | **FastAPI + Uvicorn** | High-concurrency async Python framework with automated OpenAPI docs |
| **Database & ORM** | **SQLAlchemy 2.0 + SQLite**| Modern declarative relational models with migration compatibility |
| **Frontend UI** | **Next.js 14 (App Router)** | TypeScript 5, React 18, Tailwind CSS, shadcn/ui, and Radix primitives |
| **Data Analytics** | **Recharts** | Interactive 4-week degradation trajectories and SLA compliance charts |
| **Reporting Engine** | **ReportLab 4.0 + HTML5 Blob** | Programmatic PDF executive summaries and cross-origin CSV downloads |

---

## 🏗️ Repository Architecture

```
RoadPulse AI/
├── TECH_STACK.md                  # Comprehensive technology stack reference
├── PIPELINE.md                    # 10-step end-to-end system pipeline & architecture
├── model/                         # Fine-tuned deep learning models
│   └── Yolov8-fintuned-on-potholes.pt
├── backend/                       # FastAPI backend service
│   ├── api/                       # API route modules (roads, metrics, processing, reports, demo)
│   ├── services/                  # Business logic (scoring, detection, verification, reportLab)
│   ├── models/                    # SQLAlchemy declarative relational models
│   ├── schemas/                   # Pydantic request and response schemas
│   ├── data/                      # 20-corridor OSRM road dataset & database seeder
│   ├── main.py                    # Application entry point & CORS configuration
│   └── requirements.txt           # Python dependency specifications
├── frontend/                      # Next.js 14 frontend application
│   ├── app/                       # App router pages (Overview, Map, Roads, Processing, Reports)
│   ├── components/                # Modular UI components (Leaflet map, Sidebar, KPI cards)
│   ├── lib/                       # API clients, spatial utilities, and constants
│   ├── types/                     # TypeScript definitions
│   └── package.json               # Frontend dependencies & scripts
├── sample_data/                   # Pre-bundled dashcam video clips for 1-click ingestion
├── reports/                       # Auto-generated ReportLab PDFs and CSV audit files
└── uploads/                       # Ingested municipal dashcam footage
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.9+ (CUDA-capable GPU recommended for deep learning inference, CPU fallback supported)
- Node.js 18+ & npm

### 1. Configure Environment
```bash
# Copy and configure environment variables
cp .env.example .env
```

### 2. Start the Backend Service
```bash
# In backend directory
pip install -r requirements.txt
python main.py
```
- Server starts at `http://localhost:8000`
- Interactive OpenAPI / Swagger documentation: `http://localhost:8000/docs`
- On first launch, the database automatically initializes and populates all 20 road corridors.

### 3. Start the Frontend Dashboard
```bash
# In frontend directory
npm install
npm run dev -- -p 3001
```
- Access the dashboard at `http://localhost:3001` (or `http://localhost:3000`).

---

## 🗺️ Monitored Transit Corridors (Jaipur Pilot)

The platform actively monitors 20 major transit corridors across the Jaipur municipal network:

| ID | Corridor Name | Key Section | Jurisdiction |
| :---: | :--- | :--- | :--- |
| **TR-01** | Tonk Road | World Trade Park to Durgapura | JMC Greater |
| **AJ-01** | Ajmer Road | 200 Feet Bypass to Sodala Flyover | PWD Rajasthan |
| **SR-01** | Sikar Road | Vidhyadhar Nagar to VKIA | PWD Rajasthan |
| **JLN-01**| JLN Marg | Birla Mandir to Jawahar Circle | JDA |
| **JG-01** | Jawahar Circle | Malviya Nagar Ring | JDA |
| **CL-01** | Civil Lines | Raj Bhavan Arterial | JMC Heritage |
| **MI-01** | MI Road | Ajmeri Gate to Paanch Batti | JMC Heritage |
| **VN-01** | Vidhyadhar Nagar | Sector 3 Spine Road | JMC Greater |
| **GL-01** | Gopalpura Bypass | Gujar Ki Tholi to Mansarovar | JDA |
| **KD-01** | Kalwar Road | Jhotwara to Hathoj | PWD Rajasthan |
| ... | *+ 10 additional arterial routes* | *Detailed in `backend/data/demo-data.json`* | JMC / PWD / JDA |

---

## 📊 Road Health Risk Scoring Model

$$\text{Risk Score} = 0.40 \times \text{Severity} + 0.25 \times \text{Density} + 0.20 \times \text{Trend} + 0.15 \times \text{Context}$$

| Grade | Risk Score | Condition | Action Protocol |
| :---: | :---: | :---: | :--- |
| **Grade A** | $0\text{--}20$ | Excellent / Good | Routine preventive maintenance |
| **Grade B** | $21\text{--}40$ | Fair | Continuous transit cycle monitoring |
| **Grade C** | $41\text{--}60$ | Moderate | Scheduled maintenance within 45 days |
| **Grade D** | $61\text{--}80$ | Poor / Hazardous | Formal Issue Report; 21-day SLA countdown active |
| **Grade E** | $81\text{--}100$ | Critical / Danger | Emergency SLA dispatch & administrative escalation |

---

## 🔄 Closed-Loop Verification Workflow

1. **Detection & SLA Dispatch:** Autonomous issue reporting triggered when a corridor drops to Grade D or E.
2. **Municipal Repair Claim:** Authority registers repair completion.
3. **Subsequent Bus Survey:** Normal bus revenue trips capture updated road footage.
4. **AI Audit:**
   - **$\ge 40\%$ Risk Reduction:** Verified Fix; ticket closed and certified.
   - **$< 20\%$ Risk Reduction:** Failed Verification; escalated to chief municipal engineer with audit logs.
   - **$20\%\text{--}40\%$ Risk Reduction:** Partial Repair; secondary notification issued.

---

## 👥 Project Team

**The Cartel (IS2603)** — Idea Sprint, National Level Inter-University Innovation Challenge.
