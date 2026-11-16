"""
conftest.py
───────────
Pytest configuration for RoadPulse AI backend.
Provides isolated, temporary SQLite test databases and managed TestClient fixtures
ensuring integration and unit tests NEVER mutate or corrupt the user's demo database.
"""

import os
import tempfile
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from models.database import (
    Base, get_db, Authority, RoadSegment, WeeklyRoadMetric,
    IssueReport, RepairVerification, ProcessingJob
)
from main import app


@pytest.fixture(scope="session")
def test_engine():
    """
    Creates an isolated in-memory SQLite engine with StaticPool
    so all test connections share the same isolated schema.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def db_session(test_engine):
    """
    Provides a clean transactional session for each test function,
    re-seeded with minimal baseline records.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = TestingSessionLocal()

    # Clear any residual records
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()

    # Seed minimal deterministic test records
    auth = Authority(
        authority_id="AUTH-TEST",
        name="Test Municipal Corporation",
        zone="Jaipur North",
        contact_email="test@jaipur.gov.in"
    )
    session.add(auth)

    seg1 = RoadSegment(
        segment_id="TR-TEST-1",
        road_name="Test Corridor Alpha",
        sub_name="Sector 1 to Sector 5",
        start_lat=26.8500,
        start_lon=75.8000,
        end_lat=26.8700,
        end_lon=75.8200,
        length_km=4.5,
        road_type="Urban Arterial",
        authority_id="AUTH-TEST",
        ward="Ward 12",
        polyline_coords="[[26.85, 75.80], [26.87, 75.82]]"
    )
    seg2 = RoadSegment(
        segment_id="TR-TEST-2",
        road_name="Test Corridor Beta",
        sub_name="Link Road",
        start_lat=26.8800,
        start_lon=75.8300,
        end_lat=26.8900,
        end_lon=75.8400,
        length_km=2.0,
        road_type="Feeder",
        authority_id="AUTH-TEST",
        ward="Ward 14",
        polyline_coords="[[26.88, 75.83], [26.89, 75.84]]"
    )
    session.add_all([seg1, seg2])

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # Week 3 baseline metric
    m_w3 = WeeklyRoadMetric(
        segment_id="TR-TEST-1",
        week=3,
        date="2026-08-31",
        pothole_count=12,
        severe_count=4,
        density=2.67,
        severity_avg=3.2,
        depth_avg_cm=4.5,
        rain_mm=15.0,
        trend=0.0,
        context_score=30.0,
        risk_score=48.0,
        grade="C",
        status="surveyed",
        surveyed=True
    )

    # Week 4 metric
    m_w4 = WeeklyRoadMetric(
        segment_id="TR-TEST-1",
        week=4,
        date="2026-09-07",
        pothole_count=18,
        severe_count=7,
        density=4.0,
        severity_avg=3.6,
        depth_avg_cm=5.2,
        rain_mm=25.0,
        trend=15.0,
        context_score=50.0,
        risk_score=62.0,
        grade="D",
        status="surveyed",
        surveyed=True
    )
    session.add_all([m_w3, m_w4])

    # Issue report with real timestamps for response time audit
    sent_time = now_utc - timedelta(days=5)
    ack_time = sent_time + timedelta(days=2.5)  # 2.5 days response time

    issue1 = IssueReport(
        issue_id="ISSUE-TEST-1",
        segment_id="TR-TEST-1",
        authority_id="AUTH-TEST",
        priority="High",
        risk_score=62.0,
        status="acknowledged",
        sent_at=sent_time,
        acknowledged_at=ack_time,
        due_at=sent_time + timedelta(days=21)
    )

    issue2 = IssueReport(
        issue_id="ISSUE-TEST-2",
        segment_id="TR-TEST-1",
        authority_id="AUTH-TEST",
        priority="Critical",
        risk_score=75.0,
        status="repaired",
        sent_at=sent_time - timedelta(days=10),
        acknowledged_at=sent_time - timedelta(days=8),
        repair_claimed_at=now_utc - timedelta(days=1),
        due_at=sent_time + timedelta(days=11)
    )
    session.add_all([issue1, issue2])
    session.commit()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """
    Provides a FastAPI TestClient configured with lifespan and
    dependency override to the isolated test database session.
    """
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
