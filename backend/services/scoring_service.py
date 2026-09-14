from core.config import settings


def get_grade(score: float) -> str:
    if score <= 20: return "A"
    if score <= 40: return "B"
    if score <= 60: return "C"
    if score <= 80: return "D"
    return "E"


def calculate_risk_score(
    severity: float,
    density: float,
    trend: float,
    rain_mm: float,
    max_density: float = 30.0
) -> float:
    """
    Risk Score formula (weights loaded from env via settings):
      score = W_sev*Severity + W_den*Density + W_trend*Trend + W_ctx*Context

    Default weights: 0.40 / 0.25 / 0.20 / 0.15
    Override via env: SCORING_WEIGHT_SEVERITY, SCORING_WEIGHT_DENSITY, etc.
    """
    # Severity: map 1-5 scale to 0-100
    sev_score = min((severity / 5.0) * 100, 100)

    # Density: potholes_per_km / max_density * 100
    den_score = min((density / max_density) * 100, 100)

    # Trend: week-over-week risk change (-50 to +50) → 0-100
    trend_score = min(max((trend + 50) / 100 * 100, 0), 100)

    # Context: rain_mm impact
    context_score = min(rain_mm * 2.0, 100)

    risk = (
        settings.scoring_weight_severity * sev_score +
        settings.scoring_weight_density  * den_score +
        settings.scoring_weight_trend    * trend_score +
        settings.scoring_weight_context  * context_score
    )
    return round(min(max(risk, 0), 100), 2)


def get_score_explanation(risk: float) -> str:
    grade = get_grade(risk)
    return (
        f"Risk Score {risk} ({grade}): "
        f"Weights — Severity:{settings.scoring_weight_severity}, "
        f"Density:{settings.scoring_weight_density}, "
        f"Trend:{settings.scoring_weight_trend}, "
        f"Context:{settings.scoring_weight_context}"
    )
