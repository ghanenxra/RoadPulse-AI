"""
test_verification_and_authority.py
───────────────────────────────────
Tests for closed-loop repair verification state machine and authority response time calculation.
"""

import pytest
from datetime import datetime, timedelta, timezone
from models.database import IssueReport, WeeklyRoadMetric, RepairVerification, Authority
from services.verification_service import verify_repair


def test_verify_repair_unclaimed_precondition(db_session):
    """
    Proves that an issue which has NOT been claimed repaired cannot be verified.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    issue = IssueReport(
        issue_id="ISSUE-UNCLAIMED",
        segment_id="TR-TEST-1",
        authority_id="AUTH-TEST",
        priority="High",
        risk_score=60.0,
        status="in_progress"  # Contractor has not claimed repaired!
    )
    db_session.add(issue)
    db_session.commit()

    ver = verify_repair("ISSUE-UNCLAIMED", survey_week=4, db=db_session)
    assert ver is not None
    assert ver.result == "unclaimed"
    # Issue status must not be marked verified!
    assert issue.status == "in_progress"


def test_verify_repair_verified_when_risk_subsides(db_session):
    """
    Proves that a claimed repair is verified when subsequent survey shows significant risk drop.
    """
    # Create road metric for week 5 showing verified fix (score dropped from 70 to 20)
    m_w5 = WeeklyRoadMetric(
        segment_id="TR-TEST-1",
        week=5,
        date="2026-09-14",
        pothole_count=2,
        severe_count=0,
        density=0.44,
        severity_avg=1.8,
        risk_score=18.0,
        grade="A",
        status="surveyed"
    )
    db_session.add(m_w5)

    issue = IssueReport(
        issue_id="ISSUE-CLAIMED-FIX",
        segment_id="TR-TEST-1",
        authority_id="AUTH-TEST",
        priority="Critical",
        risk_score=70.0,
        status="repaired",  # Claimed repaired!
        repair_claimed_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db_session.add(issue)
    db_session.commit()

    ver = verify_repair("ISSUE-CLAIMED-FIX", survey_week=5, db=db_session)
    assert ver.result == "verified"
    assert issue.status == "verified"


def test_verify_repair_failed_when_risk_persists(db_session):
    """
    Proves that a claimed repair fails verification if defect signatures persist in subsequent survey.
    """
    # Create week 6 survey showing high risk persisted (65 vs 70)
    m_w6 = WeeklyRoadMetric(
        segment_id="TR-TEST-1",
        week=6,
        date="2026-09-21",
        pothole_count=16,
        severe_count=6,
        density=3.5,
        severity_avg=3.8,
        risk_score=65.0,
        grade="D",
        status="surveyed"
    )
    db_session.add(m_w6)

    issue = IssueReport(
        issue_id="ISSUE-FAILED-FIX",
        segment_id="TR-TEST-1",
        authority_id="AUTH-TEST",
        priority="High",
        risk_score=70.0,
        status="claimed_repaired",
        repair_claimed_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db_session.add(issue)
    db_session.commit()

    ver = verify_repair("ISSUE-FAILED-FIX", survey_week=6, db=db_session)
    assert ver.result == "failed"
    assert issue.status == "failed_verification"


def test_verify_repair_idempotency(db_session):
    """
    Proves that repeated verification requests return existing records
    and do not generate duplicate database entries.
    """
    # Re-verify the already created verification from previous test
    ver1 = verify_repair("ISSUE-TEST-2", survey_week=4, db=db_session)
    ver2 = verify_repair("ISSUE-TEST-2", survey_week=4, db=db_session)

    assert ver1.verification_id == ver2.verification_id
    count = db_session.query(RepairVerification).filter(
        RepairVerification.issue_id == "ISSUE-TEST-2",
        RepairVerification.survey_week == 4
    ).count()
    assert count == 1


def test_authority_response_time_calculation(client):
    """
    Tests that authority summary calculates response time from actual timestamps
    and does not return a hardcoded 3.2 days.
    """
    res = client.get("/api/authority/summary")
    assert res.status_code == 200
    data = res.json()

    auth_list = data["by_authority"]
    assert len(auth_list) > 0

    test_auth = next((a for a in auth_list if a["authority_id"] == "AUTH-TEST"), None)
    assert test_auth is not None
    # In conftest.py, we seeded two issues: 2.5 days and 2.0 days -> avg is 2.2 days
    assert test_auth["avg_response_days"] == 2.2
    assert test_auth["eligible_responses"] == 2  # issue1 (2.5d) and issue2 (2.0d)
