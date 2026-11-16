# RoadPulse AI — Production Target Architecture & Transition Blueprint

## Executive Summary

RoadPulse AI is currently architected as a lightweight, high-fidelity demonstrator utilizing a local SQLite embedded engine, synchronised linear survey aggregations, and in-process inference orchestration. While this architecture provides zero-friction developer onboarding, rapid iteration, and deterministic local demonstrations, transitioning RoadPulse AI to a city-scale municipal production platform requires addressing high-throughput telemetry ingestion, multi-camera spatial registration, asynchronous worker pipelines, and sub-meter geospatial indexing.

This document formalizes the production target architecture, detailing the rationale for **PostgreSQL + PostGIS**, the enterprise relational-geospatial schema, asynchronous worker infrastructure, cloud object storage, and a pragmatic migration blueprint from the current demonstrator.

---

## 1. Architectural Justification: PostgreSQL + PostGIS

The target production data layer for RoadPulse AI is **PostgreSQL (v16+) with PostGIS (v3.4+)**. 

### 1.1 Limitations of SQLite & Flat Spatial Proxies
In the current prototype:
- Road corridor geometries are stored as serialized GeoJSON strings in SQLite `TEXT` columns (`coordinates_json`).
- Spatial containment and proximity calculations require serializing coordinates into Python memory and computing Euclidean distances or linear interpolation in user-space.
- SQLite locks the entire database file during writes (`WAL` mode mitigates read contention, but concurrent telemetry from hundreds of municipal transit buses will create write queue serialization bottlenecks).
- SQLite lacks native spatial indexing, geometric projection transformations (EPSG re-projection), and topological operations.

### 1.2 Enterprise Capabilities of PostGIS
1. **First-Class Geometric Types:** Native `GEOMETRY(LineString, 4326)` for road centerlines and `GEOMETRY(Point, 4326)` for defect coordinate registrations.
2. **Sub-Meter Spatial Indexing (GiST / SP-GiST):** Generalized Search Tree (GiST) indexes execute $R\text{-tree}$ bounding-box queries in logarithmic time ($\mathcal{O}(\log N)$), enabling instantaneous spatial queries across millions of detected road defects.
3. **Native Spatial Clustering (`ST_ClusterDBSCAN`):** City-scale edge devices running monocular detection across overlapping bus sweeps will record duplicate detections of the same physical pothole. PostGIS provides native Density-Based Spatial Clustering of Applications with Noise (DBSCAN), clustering detections within physical tolerances (e.g., $\epsilon = 3.0\text{ meters}, \text{minpoints} = 2$) directly inside the database engine without memory overhead.
4. **Linear Referencing System (LRS):** Road assets are managed by chainage/stationing (e.g., Tonk Road KM 4.250). PostGIS `ST_AddMeasure`, `ST_LocateAlong`, and `ST_LineLocatePoint` allow mapping video keyframes along physical road segments with millimeter precision.
5. **High-Concurrency Multi-Version Concurrency Control (MVCC):** Hundreds of edge devices and automated depot transfer stations can stream high-frequency telemetry concurrently while municipal dashboard operators perform analytical queries without lock contention.

---

## 2. Production Relational & Geospatial Schema Design

```
                     +---------------------------------------+
                     |         jurisdictional_zones          |
                     +---------------------------------------+
                                         | 1
                                         |
                                         | N
+--------------------+ 1               N +---------------------------------------+
|  road_authorities  |-------------------|             road_segments             |
+--------------------+                   +---------------------------------------+
          | 1                                                | 1
          |                                                  |
          | N                                                | N
+--------------------+                   +---------------------------------------+
|    issue_reports   |                   |          pothole_detections           |
+--------------------+                   +---------------------------------------+
          | 1                                                | N
          |                                                  |
          | N                                                | 1
+--------------------+                   +---------------------------------------+
| repair_verificates |                   |        spatial_defect_clusters       |
+--------------------+                   +---------------------------------------+
                                                             | 1
                                                             |
                                                             | N
                                         +---------------------------------------+
                                         |         historical_aggregations       |
                                         +---------------------------------------+
```

### 2.1 Core Tables & Spatial DDL

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 1. Road Segments (Polylines with Spatial Index)
CREATE TABLE road_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id VARCHAR(32) NOT NULL UNIQUE,
    road_name VARCHAR(128) NOT NULL,
    ward VARCHAR(64) NOT NULL,
    zone VARCHAR(64) NOT NULL,
    length_km NUMERIC(6, 3) NOT NULL CHECK (length_km > 0),
    geom GEOMETRY(LineString, 4326) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_road_segments_geom ON road_segments USING GIST (geom);
CREATE INDEX idx_road_segments_zone ON road_segments (zone);

-- 2. Raw Pothole Detections (Points from Edge Telemetry / Ingest)
CREATE TABLE pothole_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    segment_id VARCHAR(32) REFERENCES road_segments(segment_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    gps_accuracy_m NUMERIC(4, 2),
    location_verified BOOLEAN NOT NULL DEFAULT FALSE,
    confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
    visual_severity_score NUMERIC(3, 2) NOT NULL CHECK (visual_severity_score BETWEEN 1.0 AND 5.0),
    depth_measured_cm NUMERIC(5, 2) NULL, -- Strictly NULL for optical monocular; populated only via calibrated LiDAR
    bbox_xywh JSONB NOT NULL,
    crop_storage_uri TEXT NULL,
    video_keyframe_offset_ms INTEGER NOT NULL,
    data_source VARCHAR(64) NOT NULL, -- 'yolo_edge_gps', 'yolo_interpolated_corridor', 'synthetic_demo'
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pothole_detections_geom ON pothole_detections USING GIST (geom);
CREATE INDEX idx_pothole_detections_segment_time ON pothole_detections (segment_id, timestamp DESC);
CREATE INDEX idx_pothole_detections_synthetic ON pothole_detections (is_synthetic);

-- 3. De-duplicated Physical Defect Clusters
CREATE TABLE spatial_defect_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id VARCHAR(32) REFERENCES road_segments(segment_id) ON DELETE CASCADE,
    cluster_geom GEOMETRY(Point, 4326) NOT NULL,
    detection_count INTEGER NOT NULL DEFAULT 1,
    first_detected_at TIMESTAMPTZ NOT NULL,
    last_detected_at TIMESTAMPTZ NOT NULL,
    representative_severity NUMERIC(3, 2) NOT NULL,
    representative_depth_cm NUMERIC(5, 2) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'repaired', 'monitoring'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spatial_clusters_geom ON spatial_defect_clusters USING GIST (cluster_geom);

-- 4. Materialized Aggregations (Time-Bucket Snapshots)
CREATE MATERIALIZED VIEW mv_weekly_road_metrics AS
SELECT
    s.segment_id,
    DATE_TRUNC('week', d.timestamp) AS survey_week_start,
    COUNT(d.id) AS total_detections,
    COUNT(d.id) FILTER (WHERE d.visual_severity_score >= 3.5) AS severe_defects,
    ROUND((COUNT(d.id)::NUMERIC / NULLIF(s.length_km, 0)), 2) AS defect_density_per_km,
    ROUND(AVG(d.visual_severity_score), 2) AS avg_severity,
    ROUND(AVG(d.depth_measured_cm), 2) AS avg_depth_cm, -- Will be NULL if no LiDAR depths recorded
    COUNT(d.id) FILTER (WHERE d.is_synthetic) > 0 AS contains_synthetic_data
FROM road_segments s
LEFT JOIN pothole_detections d ON s.segment_id = d.segment_id
GROUP BY s.segment_id, s.length_km, DATE_TRUNC('week', d.timestamp);

CREATE UNIQUE INDEX idx_mv_weekly_road_metrics ON mv_weekly_road_metrics (segment_id, survey_week_start);
```

---

## 3. High-Throughput Ingestion & Asynchronous Decoupling

A production deployment cannot process video or perform neural inference within the synchronous HTTP request-response lifecycle of FastAPI.

### 3.1 Distributed Architecture Diagram

```
[ Municipal Buses / Patrol Cars ]
         | (Video + NMEA GPS stream via 4G/Wi-Fi Depot Upload)
         v
[ Reverse Proxy / API Gateway (NGINX / Envoy) ]
         |
         +---> [ FastAPI Edge Ingestion Gateway ]
                    |
                    | (1) Uploads raw video directly to Object Storage
                    v
          [ MinIO / S3 / GCS Object Store ]
                    |
                    | (2) Emits Ingestion Event
                    v
         [ Redis Streams / RabbitMQ Broker ]
                    |
                    | (3) Distributes tasks to worker pools
                    +---------------------------+
                    |                           |
                    v                           v
     [ GPU Worker: Frame Extraction ]    [ GPU Worker: YOLOv8 Inference ]
                    |                           |
                    | (4) Extracted Crops & BBoxes
                    v
          [ Worker: Spatial Interpolation & PostGIS Registration ]
                    |
                    | (5) ST_ClusterDBSCAN & Risk Scoring Engine
                    v
          [ PostgreSQL + PostGIS Primary ]
                    |
                    | (6) Real-Time Notification Event (LISTEN/NOTIFY)
                    v
      [ FastAPI SSE / WebSocket Service ] ---> [ Next.js Operational Dashboard ]
```

### 3.2 Asynchronous Worker Queues (Celery / ARQ with Redis)
- **FastAPI Gateway:** Performs lightweight client validation, handles multipart upload chunking, streams payload to object storage, and pushes an ingestion event into a Redis queue. Returns `202 Accepted` with a tracking `job_id` within `< 25ms`.
- **Inference Workers:** Standalone containerized worker processes running CUDA/TensorRT run YOLO inference at 60+ FPS on batch slices.
- **Backpressure Management:** Redis token buckets throttle upload processing when GPU worker utilization exceeds 85%, ensuring ingestion endpoints remain responsive to incoming vehicle pings.

### 3.3 Object Storage Integration (S3 / GCS / Cloudflare R2)
- Video files are never persisted on local application server disks.
- Videos are stored in an S3 bucket with a retention policy (e.g., 30-day lifecycle for raw video; permanent lifecycle for low-resolution cropped defect bounding boxes).
- Bounding-box image crops (`crop_storage_uri`) are uploaded to storage with pre-signed CDN URLs for instant frontend preview.

### 3.4 Event-Driven Real-Time Updates
- **Backend:** PostgreSQL `LISTEN/NOTIFY` triggers or Redis pub/sub broadcasts new detection clusters and job status changes.
- **Frontend:** Next.js connects via Server-Sent Events (SSE) or WebSockets (`/api/ws/telemetry`), updating map pins, live log streams, and municipal KPI widgets in real time without client polling.

---

## 4. Migration Strategy: From SQLite Prototype to Production

The transition from the current demonstrator to production must be executed in bounded, non-destructive phases:

| Phase | Objective | Execution Details | Backward Compatibility |
|---|---|---|---|
| **Phase 1: Abstract Data Access** | Isolate SQLAlchemy queries into repository interfaces | Implement `RoadRepository`, `DetectionRepository`, `MetricRepository`. Repositories hide SQL dialect specifics. | Full (SQLite demo continues to function unchanged). |
| **Phase 2: Dual-Driver Configuration** | Add Postgres/PostGIS engine support to `backend/core/database.py` | Add `psycopg2-binary` or `asyncpg`. Support `DATABASE_URL=postgresql://...`. SQLite remains default if unset. | 100% backward compatible with `roadpulse.db`. |
| **Phase 3: Spatial DDL Migration** | Alembic migration script for PostGIS | Convert `coordinates_json` to `GEOMETRY(LineString, 4326)`. Convert detections to `GEOMETRY(Point, 4326)`. | SQLite fallback continues to use JSON parsing logic. |
| **Phase 4: Celery / Redis Ingestion** | Extract `processing.py` pipeline into Celery task | Decouple video inference into background workers. Add local Redis container to `docker-compose.yml`. | Synchronous in-process runner retained as fallback for offline testing. |

---

## 5. Rationale for Deferred Infrastructure in Prototype

Implementing PostgreSQL, PostGIS, Redis, Celery, and S3 during this demonstration phase was intentionally rejected due to strict software engineering principles:

1. **Premature Infrastructure Complexity:** Mandating external database containers, geo-spatial C libraries (`gdal`, `geos`, `proj`), Redis daemons, and S3 mock servers introduces high friction for developers, evaluators, and automated CI test runners.
2. **Deterministic Demonstration Stability:** The local SQLite database and pre-computed 4-week survey metrics provide guaranteed repeatability for municipal stakeholder demonstrations and academic evaluations without network dependencies.
3. **Clean Decoupling:** By rigorously enforcing repository patterns, strict Pydantic schemas, and mathematical isolation between raw detection certainty and road risk calculations, the application business logic remains pure and decoupled from data storage concerns. When PostGIS is enabled, zero business logic needs to be rewritten.
