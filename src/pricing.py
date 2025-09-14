def priceMonth(baseRate: float, miles: float, riskScore: float, night: float, schoolZone: float, prevPremium: float | None = None):
    # Compute a monthly premium from simple exposure, behavior, and context factors.
    # If a previous premium is provided, clamp the month-over-month change to ±15%.
    exposureFactor = 1.0 + (miles / 1000.0) * 0.15
    behaviorFactor = 0.7 + 0.6 * float(riskScore)
    behaviorFactor = max(0.5, min(1.5, behaviorFactor))  # hard clamps for safety
    contextSurcharge = 1.0 + 0.05 * float(night) + 0.05 * float(schoolZone)

    premium = baseRate * exposureFactor * behaviorFactor * contextSurcharge

    if prevPremium is not None:
        cap = 0.15 * prevPremium
        lower, upper = prevPremium - cap, prevPremium + cap
        premium = max(lower, min(upper, premium))

    return float(round(premium, 2))

def calculatePremium(riskScore: float, baseRate: float = 100.0):
    if riskScore < 0.2:
        tier = "Low Risk"
    elif riskScore < 0.5:
        tier = "Medium Risk"
    else:
        tier = "High Risk"

    premium = baseRate * (1+ riskScore)
    return {"riskScore": round(riskScore, 4) , "tier": tier, "premium": round(premium, 2)}
