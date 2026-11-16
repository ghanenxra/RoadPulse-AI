"""
test_aggregation.py
───────────────────
Tests for detection aggregation into WeeklyRoadMetric, handling of missing depths,
safe density calculations with invalid road lengths, and historical trend computation.
"""

import pytest
from models.database import RoadSegment, WeeklyRoadMetric
from services.aggregation_service import aggregate_detections_to_weekly


def test_aggregate_valid_detections():
    """Verify aggregation of regular detections into weekly metric."""
    seg = RoadSegment(
        segment_id="SEG-TEST-AGG",
        road_name="Test Corridor",
        length_km=2.0
    )

    detections = [
        {"severity": 2.0, "severity_label": "Low", "depth_cm": None},
        {"severity": 3.0, "severity_label": "Medium", "depth_cm": None},
        {"severity": 4.0, "severity_label": "High", "depth_cm": None},
        {"severity": 4.5, "severity_label": "High", "depth_cm": None},
    ]

    metric = aggregate_detections_to_weekly(detections, seg, week=1)

    assert metric.pothole_count == 4
    assert metric.severe_count == 2
    assert metric.density == 2.0  # 4 / 2.0 km
    assert metric.severity_avg == round((2.0 + 3.0 + 4.0 + 4.5) / 4, 2)
    # When no depth measurements exist, depth_avg_cm must be None (not 0.0)
    assert metric.depth_avg_cm is None
    assert 0.0 <= metric.risk_score <= 100.0


def test_aggregate_empty_detections():
    """Verify safe handling of empty detection list (zero defects)."""
    seg = RoadSegment(
        segment_id="SEG-TEST-EMPTY",
        road_name="Clean Road",
        length_km=5.0
    )

    metric = aggregate_detections_to_weekly([], seg, week=1)

    assert metric.pothole_count == 0
    assert metric.severe_count == 0
    assert metric.density == 0.0
    assert metric.depth_avg_cm is None
    assert metric.risk_score >= 0.0


def test_aggregate_with_depth_measurements():
    """Verify that when actual depth measurements exist, average is calculated accurately."""
    seg = RoadSegment(
        segment_id="SEG-TEST-DEPTH",
        road_name="Depth Road",
        length_km=1.0
    )

    detections = [
        {"severity": 3.0, "severity_label": "Medium", "depth_cm": 4.0},
        {"severity": 4.0, "severity_label": "High", "depth_cm": 6.0},
    ]

    metric = aggregate_detections_to_weekly(detections, seg, week=1)
    assert metric.depth_avg_cm == 5.0  # (4.0 + 6.0) / 2


def test_aggregate_with_zero_road_length():
    """Verify safe handling of zero or negative road length (prevents division by zero)."""
    seg_zero = RoadSegment(
        segment_id="SEG-TEST-ZERO",
        road_name="Zero Length Road",
        length_km=0.0
    )

    detections = [{"severity": 2.5, "severity_label": "Medium"}]
    # Should not raise ZeroDivisionError
    metric = aggregate_detections_to_weekly(detections, seg_zero, week=1)
    assert metric.density > 0.0


def test_aggregate_trend_computation():
    """Verify week-over-week trend calculation against prior metric."""
    seg = RoadSegment(
        segment_id="SEG-TEST-TREND",
        road_name="Trend Road",
        length_km=2.0
    )

    prev_metric = WeeklyRoadMetric(
        segment_id="SEG-TEST-TREND",
        week=1,
        risk_score=30.0,
        rain_mm=10.0
    )

    # Detections that result in higher risk than 30.0
    detections = [
        {"severity": 4.8, "severity_label": "High"},
        {"severity": 4.5, "severity_label": "High"},
        {"severity": 4.2, "severity_label": "High"},
    ]

    metric = aggregate_detections_to_weekly(detections, seg, week=2, prev_metric=prev_metric)
    assert metric.trend > 0.0  # Condition worsened compared to week 1
