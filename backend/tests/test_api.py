"""
test_api.py
───────────
Integration tests for RoadPulse AI API endpoints.
Runs against the isolated in-memory test database fixture provided by conftest.py.
"""

import pytest


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_config_credentials_not_exposed(client):
    """Proves that /api/config does not expose raw database credentials or passwords."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert "database_url" not in data
    assert "database_type" in data


def test_get_roads(client):
    response = client.get("/api/roads?week=4")
    assert response.status_code == 200
    roads = response.json()
    assert len(roads) > 0
    assert any(r["segment_id"] == "TR-TEST-1" for r in roads)


def test_get_road_detail(client):
    response = client.get("/api/roads/TR-TEST-1?week=4")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "TR-TEST-1"
    assert "weeks" in data


def test_get_map_geojson(client):
    response = client.get("/api/map?week=4")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0


def test_get_overview_metrics(client):
    response = client.get("/api/metrics/overview?week=4")
    assert response.status_code == 200
    data = response.json()
    assert "roads_surveyed" in data
    assert "total_potholes" in data
    assert "avg_risk_score" in data

    # Verify KPIValue structure
    kpi_potholes = data["total_potholes"]
    assert "current" in kpi_potholes
    assert "previous" in kpi_potholes
    # Week 4 (18) vs Week 3 (12) -> previous=12, change=6, change_pct=50.0%
    assert kpi_potholes["current"] == 18
    assert kpi_potholes["previous"] == 12
    assert kpi_potholes["change"] == 6.0
    assert kpi_potholes["change_pct"] == 50.0


def test_get_weekly_metrics(client):
    response = client.get("/api/metrics/weekly")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4


def test_get_authority_issues(client):
    response = client.get("/api/authority/issues")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) > 0


def test_csv_export(client):
    response = client.get("/api/exports/csv?type=road_segments")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]


def test_get_jobs_queue(client):
    response = client.get("/api/jobs")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_upload_invalid_extension_rejected(client):
    """Proves that upload endpoint rejects non-video extensions with 415."""
    files = {"file": ("malicious.exe", b"binarycontent", "application/octet-stream")}
    data = {"road_segment_id": "TR-TEST-1"}
    response = client.post("/api/upload", files=files, data=data)
    assert response.status_code == 415
    assert "unsupported" in response.json()["detail"].lower()


def test_upload_missing_segment_rejected(client):
    """Proves that upload endpoint validates road segment exists with 404."""
    files = {"file": ("test_clip.mp4", b"dummy_mp4_bytes", "video/mp4")}
    data = {"road_segment_id": "NON-EXISTENT-SEGMENT"}
    response = client.post("/api/upload", files=files, data=data)
    assert response.status_code == 404


def test_live_fleet_telemetry(client):
    """Proves that /api/telemetry/live-fleet returns normalized fleet telemetry schema."""
    response = client.get("/api/telemetry/live-fleet")
    assert response.status_code == 200
    data = response.json()
    assert "vehicles" in data
    assert "count" in data
    assert "moving" in data
    assert "idle" in data
    assert isinstance(data["vehicles"], list)
    if data["count"] > 0:
        first = data["vehicles"][0]
        assert "vehicle_id" in first
        assert "latitude" in first
        assert "longitude" in first
        assert "speed" in first
        assert "heading" in first
