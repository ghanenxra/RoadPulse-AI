"""
test_scoring.py
───────────────
Unit tests for the multi-criteria risk formulation, weight normalization,
monotonicity guarantees, and environmental context handling.
"""

import pytest
from services.scoring_service import (
    calculate_risk_score, get_grade, get_validated_weights, get_score_explanation
)


def test_risk_score_boundaries():
    """Verify pristine and critical road boundary score calculations."""
    # Pristine road: minimal severity, 0 density, neutral trend, no rain
    low_score = calculate_risk_score(severity=1.0, density=0.0, trend=0.0, rain_mm=0.0)
    assert 0.0 <= low_score <= 30.0
    assert get_grade(low_score) in ["A", "B"]

    # Critical severe road: maximum severity, maximum density, rapid deterioration, heavy rain
    high_score = calculate_risk_score(severity=5.0, density=30.0, trend=50.0, rain_mm=50.0)
    assert high_score >= 80.0
    assert get_grade(high_score) == "E"


def test_score_monotonicity_severity():
    """Proves that increasing physical severity cannot reduce risk score."""
    score_low = calculate_risk_score(severity=1.5, density=5.0, trend=0.0, rain_mm=10.0)
    score_mid = calculate_risk_score(severity=3.0, density=5.0, trend=0.0, rain_mm=10.0)
    score_high = calculate_risk_score(severity=4.5, density=5.0, trend=0.0, rain_mm=10.0)

    assert score_mid >= score_low
    assert score_high >= score_mid


def test_score_monotonicity_density():
    """Proves that increasing pothole density cannot reduce risk score."""
    score_d1 = calculate_risk_score(severity=3.0, density=2.0, trend=0.0, rain_mm=10.0)
    score_d2 = calculate_risk_score(severity=3.0, density=10.0, trend=0.0, rain_mm=10.0)
    score_d3 = calculate_risk_score(severity=3.0, density=25.0, trend=0.0, rain_mm=10.0)

    assert score_d2 >= score_d1
    assert score_d3 >= score_d2


def test_score_monotonicity_rain():
    """Proves that increasing rainfall cannot reduce risk score."""
    score_dry = calculate_risk_score(severity=3.0, density=5.0, trend=0.0, rain_mm=0.0)
    score_mod = calculate_risk_score(severity=3.0, density=5.0, trend=0.0, rain_mm=20.0)
    score_wet = calculate_risk_score(severity=3.0, density=5.0, trend=0.0, rain_mm=45.0)

    assert score_mod >= score_dry
    assert score_wet >= score_mod


def test_score_monotonicity_trend():
    """Proves that an improving (negative) trend decreases score, while worsening trend increases score."""
    score_improving = calculate_risk_score(severity=3.0, density=5.0, trend=-30.0, rain_mm=10.0)
    score_neutral = calculate_risk_score(severity=3.0, density=5.0, trend=0.0, rain_mm=10.0)
    score_worsening = calculate_risk_score(severity=3.0, density=5.0, trend=+30.0, rain_mm=10.0)

    assert score_improving <= score_neutral
    assert score_neutral <= score_worsening


def test_missing_weather_data_handling():
    """
    Proves that missing weather observations (None) are handled with a neutral baseline
    and do not raise TypeErrors or fabricate a 0.0 mm measurement.
    """
    score_missing = calculate_risk_score(severity=3.0, density=5.0, trend=0.0, rain_mm=None)
    score_zero = calculate_risk_score(severity=3.0, density=5.0, trend=0.0, rain_mm=0.0)

    # Neutral baseline for missing data is 10.0, which is higher than 0.0 measured rain
    assert 0.0 <= score_missing <= 100.0
    assert score_missing >= score_zero


def test_weight_validation_and_normalization():
    """Proves that weights are non-negative and always sum to 1.0."""
    w_sev, w_den, w_trend, w_ctx = get_validated_weights()
    assert w_sev >= 0.0
    assert w_den >= 0.0
    assert w_trend >= 0.0
    assert w_ctx >= 0.0
    assert abs((w_sev + w_den + w_trend + w_ctx) - 1.0) < 0.001


def test_score_clamping():
    """Proves that risk score is strictly clamped in [0.0, 100.0]."""
    score_neg = calculate_risk_score(severity=0.0, density=-10.0, trend=-100.0, rain_mm=0.0)
    assert score_neg >= 0.0

    score_huge = calculate_risk_score(severity=10.0, density=100.0, trend=200.0, rain_mm=200.0)
    assert score_huge <= 100.0
