# RoadPulse AI — Complete Technology Stack & Specifications

This document outlines the complete architectural stack, programming languages, frameworks, libraries, algorithms, protocols, and deployment environments utilized across the **RoadPulse AI** platform.

---

## 1. System Architecture Overview

RoadPulse AI is engineered as an **Edge-to-Cloud Hybrid Intelligence Architecture**. Lightweight local GPU nodes or edge compute devices at transit depots run deep learning inference on high-definition bus dashcams, while a high-concurrency FastAPI service coordinates spatial aggregation, municipal SLA tracking, and interactive Next.js dashboards.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA CAPTURE & EDGE                             │
│  City Bus NVDR Dashcam (1080p/4K) ──► Charging Depot Wi-Fi / USB Sync  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ MP4 Footage + GPS Metadata
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    AI & COMPUTER VISION PIPELINE                       │
│  OpenCV Keyframe Sampling (1 FPS) ──► YOLOv8 Custom Pothole Detector   │
│  Lateral Pixel Depth Estimator    ──► DBSCAN Spatial Clustering        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Snapped Detections & Coordinates
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    GEOSPATIAL & SCORING ENGINE                         │
│  OSRM Road-Snapping (OSM) ──► Multi-Criteria Road Health Scoring       │
│  SQLAlchemy 2.0 Relational Models ──► SQLite (Local) / Postgres (Cloud) │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ REST APIs & GeoJSON Streams
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    DASHBOARD & MUNICIPAL PORTAL                        │
│  Next.js 14 App Router ──► Leaflet GeoJSON Mapping ──► Recharts Analytics│
│  ReportLab Automated PDF Audits ──► Automated Municipal SLA Dispatch    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Layer-by-Layer Tech Stack

### A. Artificial Intelligence & Computer Vision Layer

| Component | Technology | Version | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **Model Architecture** | **Ultralytics YOLOv8** | `8.0+` | Custom fine-tuned object detection network (`Yolov8-fintuned-on-potholes.pt`). Detects road defects (`pothole`, `crack`, `rutting`) in real-time. |
| **Inference Framework** | **PyTorch / TorchVision** | `2.0+` | Deep learning runtime supporting both CUDA GPU hardware acceleration and multi-threaded CPU fallback. |
| **Video Decoding** | **OpenCV (`opencv-python`)** | `4.8+` | Video container parsing (MP4, MOV, MKV), keyframe extraction, 30-frame decimation (~1 frame per second), and resolution normalization. |
| **Depth Estimation** | **Geometric Heuristics** | Internal | Computes vertical bounding box projection and camera horizon pitch to estimate physical pothole depth in centimeters ($0\text{--}15\text{ cm}$). |
| **Spatial Deduplication**| **Scikit-Learn (`scikit-learn`)** | `1.3+` | **DBSCAN (Density-Based Spatial Clustering)** with a spatial epsilon $\varepsilon \approx 15\text{ meters}$ to merge multi-pass bus detections into distinct physical defect clusters. |

---

### B. Geospatial & Mapping Infrastructure

| Component | Technology | Version | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **Map Rendering** | **Leaflet.js** | `1.9.4` | High-performance interactive vector mapping with custom color-coded condition polylines ($A\text{--}E$ color gradients). |
| **Map Tiles** | **OpenStreetMap (OSM)** | Standard | Cartographic basemaps served via OSM tile layers with zero proprietary vendor lock-in. |
| **Road-Snapping** | **OSRM (Open Source Routing Machine)** | `v5.0 API` | Street-network routing engine that snaps raw GPS points onto exact carriageway curves and flyover geometries in Jaipur. |
| **Geodesic Engine** | **Haversine Algorithm** | Pure Python | Spherical Earth trigonometric distance calculations for road length, density per kilometer, and lateral offset modeling. |
| **Spatial Data Format** | **GeoJSON (RFC 7946)** | Standard | Standardized FeatureCollection payload structure transmitting `[longitude, latitude]` LineStrings and Point defect geometries. |

---

### C. Backend & API Services

| Component | Technology | Version | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **Web Framework** | **FastAPI** | `0.104.1` | High-performance async ASGI Python framework providing automated OpenAPI/Swagger documentation at `/docs`. |
| **ASGI Server** | **Uvicorn** | `0.24.0` | Production lightning-fast ASGI web server implementation for Python. |
| **ORM & Database** | **SQLAlchemy** | `2.0.23` | Modern object-relational mapping with type safety, schema migrations, and declarative models. |
| **Data Validation** | **Pydantic** | `2.5.2` | Strict runtime request and response payload validation and schema serialization. |
| **Task Queue** | **FastAPI BackgroundTasks** | Native | Non-blocking async background workers for video processing, GPU inference passes, and telemetry broadcasting. |
| **HTTP Client** | **HTTPX / Urllib** | `0.25.2` | Async and sync HTTP engines for cloud edge synchronization and external routing queries. |

---

### D. Frontend & Presentation Layer

| Component | Technology | Version | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js** | `14.0.4` | React framework utilizing the App Router architecture, Server Components, and static/dynamic route optimization. |
| **Language** | **TypeScript** | `5.3.3` | End-to-end static typing across all API payloads, component props, and telemetry structures. |
| **UI Library** | **React** | `18.2.0` | Component-based reactive user interface with hooks for state and lifecycle management. |
| **Styling** | **Tailwind CSS** | `3.3.0` | Modern utility-first CSS framework with custom municipal color palettes and responsive layouts. |
| **Component Primitives**| **shadcn/ui + Radix UI** | Latest | Accessible, unstyled UI primitives for cards, modals, tabs, badges, progress bars, and dropdown menus. |
| **Icons** | **Lucide React** | `0.294.0` | Lightweight, scalable vector iconography for operational dashboards. |
| **Charts & Analytics** | **Recharts** | `2.10.3` | Declarative SVG charting library for historical 4-week degradation curves, risk distributions, and SLA compliance metrics. |

---

### E. Reporting, Document & Export Engine

| Component | Technology | Version | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **PDF Generation** | **ReportLab** | `4.0.8` | Programmatic PDF document compilation with executive summaries, condition ledgers, multi-page repeating headers, and typography. |
| **CSV Export Engine** | **Python `csv` Module** | Standard | High-speed tabular data streaming for GIS layers, raw detections, 4-week degradation histories, and municipal SLA audit logs. |
| **Browser Streaming** | **HTML5 Blob API** | Standard | Cross-origin binary streaming using `window.URL.createObjectURL(blob)` for reliable client-side file downloads. |

---

### F. Data Storage & Persistence

| Component | Technology | Configuration |
| :--- | :--- | :--- |
| **Local Database** | **SQLite 3** | Zero-configuration relational database with WAL (Write-Ahead Logging) mode and thread-safe connection pooling. |
| **Cloud Database** | **PostgreSQL (Optional)** | Production-ready schema compatible with PostGIS extensions for enterprise GIS integration. |
| **File Storage** | **Local File System** | Structured storage organized into `sample_data/` (pre-bundled clips), `uploads/` (ingested bus footage), and `reports/` (compiled PDFs/CSVs). |

---

## 3. Communication Protocols & Data Exchange

- **RESTful JSON API:** Standardized resource-oriented endpoints (`/api/roads`, `/api/jobs`, `/api/authority`, `/api/reports`).
- **Multipart Form-Data:** High-throughput streaming uploads for video binary payloads (`POST /api/upload`).
- **GeoJSON Streams:** Map boundary and polyline delivery formatted to OpenStreetMap standards (`GET /api/map`).
- **CORS Support:** Permissive, environment-aware Cross-Origin Resource Sharing covering `localhost:3000`, `localhost:3001`, `localhost:3002`, and hosted Vercel/Render origins.

---

## 4. Hardware & Runtime Requirements

### Minimum Edge / Local Inference Node
- **CPU:** Intel Core i5 / AMD Ryzen 5 or higher
- **RAM:** 8 GB DDR4
- **GPU (Recommended):** NVIDIA GTX 1650 / RTX 3050 or higher (CUDA enabled)
- **OS:** Windows 10/11, Ubuntu 20.04+, or macOS (Apple Silicon MPS supported)
- **Python:** 3.9 through 3.14

### Cloud / Server Deployment Node
- **Server:** Linux x86_64 container (Docker / Render / Railway / AWS EC2)
- **Node.js:** 18.x or 20.x LTS
- **Memory:** 1 GB minimum for dashboard & API proxy (4 GB+ for cloud CPU inference)
