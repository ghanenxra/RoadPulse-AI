"""
scoring_service.py
───────────────────
Multi-criteria Road Health Risk Index and Municipal Grading Service.

Risk Formulation:
  Risk = W_sev * S_sev + W_den * S_den + W_trend * S_trend + W_ctx * S_ctx

Weights (configurable via environment):
  - Severity (40%): Physical pothole severity (1.0 to 5.0 scale)
  - Density  (25%): Defect frequency per kilometer relative to threshold
  - Trend    (20%): Multi-week condition progression (-50% to +50%)
  - Context  (15%): Environmental rainfall exposure (monsoon saturation)
"""

from typing import Optional, Tuple
from core.config import settings


def get_validated_weights() -> Tuple[float, float, float, float]:
    """
    Validates scoring weights from settings.
    Ensures non-negative values and normalizes sum to 1.0.
    """
    try:
        w_sev = max(0.0, float(settings.scoring_weight_severity))
        w_den = max(0.0, float(settings.scoring_weight_density))
        w_trend = max(0.0, float(settings.scoring_weight_trend))
        w_ctx = max(0.0, float(settings.scoring_weight_context))
    except (TypeError, ValueError):
        return 0.40, 0.25, 0.20, 0.15

    total = w_sev + w_den + w_trend + w_ctx
    if total <= 0:
        return 0.40, 0.25, 0.20, 0.15

    if abs(total - 1.0) > 0.001:
        return w_sev / total, w_den / total, w_trend / total, w_ctx / total

    return w_sev, w_den, w_trend, w_ctx


def get_grade(score: float) -> str:
    """
    Standard municipal road condition grading:
      Grade A: 0 – 20  (Good Condition)
      Grade B: 21 – 40 (Fair Condition)
      Grade C: 41 – 60 (Moderate Wear)
      Grade D: 61 – 80 (Poor / Severe Deterioration)
      Grade E: 81 – 100 (Critical / Hazardous Emergency)
    """
    if score <= 20.0:
        return "A"
    if score <= 40.0:
        return "B"
    if score <= 60.0:
        return "C"
    if score <= 80.0:
        return "D"
    return "E"


def calculate_risk_score(
    severity: float,
    density: float,
    trend: Optional[float] = 0.0,
    rain_mm: Optional[float] = None,
    max_density: float = 30.0
) -> float:
    """
    Computes calibrated composite risk score between 0.0 and 100.0.
    - severity: physical severity on 1.0 to 5.0 scale
    - density: potholes per kilometer
    - trend: percentage change from previous survey (-50% to +50%), or None/0 for neutral
    - rain_mm: rainfall measurement in mm, or None if weather sensor is unavailable
    - max_density: density saturation threshold (defaults to 30 potholes/km)
    """
    w_sev, w_den, w_trend, w_ctx = get_validated_weights()

    # 1. Severity sub-score (0 to 100)
    sev_val = max(0.0, float(severity or 1.0))
    sev_score = min(max((sev_val / 5.0) * 100.0, 0.0), 100.0)

    # 2. Density sub-score (0 to 100)
    den_thresh = max(1.0, float(max_density or 30.0))
    den_val = max(0.0, float(density or 0.0))
    den_score = min(max((den_val / den_thresh) * 100.0, 0.0), 100.0)

    # 3. Trend sub-score (0 to 100)
    # Neutral (0.0% change or None) maps to 50.0 (neutral impact)
    # Deteriorating (+50% change) maps to 100.0
    # Improving (-50% change) maps to 0.0
    if trend is None:
        trend_score = 50.0
    else:
        trend_val = float(trend)
        trend_score = min(max(((trend_val + 50.0) / 100.0) * 100.0, 0.0), 100.0)

    # 4. Context sub-score (0 to 100)
    # When rain observation is missing (None), use documented neutral baseline (10.0)
    # Never fabricate a 0.0 mm measurement when sensor data is absent
    if rain_mm is None:
        context_score = 10.0
    else:
        rain_val = max(0.0, float(rain_mm))
        context_score = min(max(rain_val * 2.0, 0.0), 100.0)

    risk = (
        w_sev * sev_score +
        w_den * den_score +
        w_trend * trend_score +
        w_ctx * context_score
    )

    return round(min(max(risk, 0.0), 100.0), 2)


def get_score_explanation(risk: float) -> str:
    grade = get_grade(risk)
    w_sev, w_den, w_trend, w_ctx = get_validated_weights()
    return (
        f"Risk Score {risk:.1f} ({grade}): "
        f"Weights — Severity:{w_sev:.2f}, "
        f"Density:{w_den:.2f}, "
        f"Trend:{w_trend:.2f}, "
        f"Context:{w_ctx:.2f}"
    )
