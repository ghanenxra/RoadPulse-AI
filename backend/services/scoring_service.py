def get_grade(score: float) -> str:
    if score <= 20: return "A"
    if score <= 40: return "B"
    if score <= 60: return "C"
    if score <= 80: return "D"
    return "E"

def calculate_risk_score(severity: float, density: float, trend: float, rain_mm: float, max_density: float = 30.0) -> float:
    # Severity: Map 1-5 scale to 0-100
    sev_score = min((severity / 5.0) * 100, 100)
    
    # Density: potholes_per_km / max_density * 100
    den_score = min((density / max_density) * 100, 100)
    
    # Trend: week-over-week risk change. Increase if worsening, decrease if improving.
    # Map trend (-50 to +50) to 0-100 score where 0 is improving fast and 100 is worsening fast.
    trend_score = min(max((trend + 50) / 100 * 100, 0), 100)
    
    # Context: rain_mm impact
    context_score = min(rain_mm * 2.0, 100)
    
    # Weights
    risk = (0.40 * sev_score) + (0.25 * den_score) + (0.20 * trend_score) + (0.15 * context_score)
    return round(min(max(risk, 0), 100), 2)

def get_score_explanation(risk: float) -> str:
    grade = get_grade(risk)
    return f"Risk Score {risk} ({grade}): Calculated based on severity, density, trend and weather context."
