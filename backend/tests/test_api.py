import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_demo_load():
    response = client.post("/api/demo/load")
    assert response.status_code == 200
    assert response.json()["success"] == True

def test_get_roads():
    response = client.get("/api/roads?week=4")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_get_road_detail():
    roads = client.get("/api/roads?week=4").json()
    assert len(roads) > 0
    segment_id = roads[0]["id"]
    response = client.get(f"/api/roads/{segment_id}")
    assert response.status_code == 200
    assert response.json()["id"] == segment_id
    assert "weeks" in response.json()

def test_get_map_geojson():
    response = client.get("/api/map?week=4")
    assert response.status_code == 200
    assert response.json()["type"] == "FeatureCollection"
    assert len(response.json()["features"]) > 0

def test_get_overview_metrics():
    response = client.get("/api/metrics/overview?week=4")
    assert response.status_code == 200
    data = response.json()
    assert "roads_surveyed" in data
    assert "total_potholes" in data

def test_get_weekly_metrics():
    response = client.get("/api/metrics/weekly")
    assert response.status_code == 200
    assert len(response.json()) == 4

def test_get_authority_issues():
    response = client.get("/api/authority/issues")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_csv_export():
    response = client.get("/api/exports/csv?type=road_segments")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
