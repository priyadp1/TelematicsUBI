# Telematics UBI — Prisha Priyadarshini

A full-stack usage-based insurance (UBI) prototype.  
It collects simulated telematics features, trains an ML risk model (XGBoost + calibration), prices policies dynamically, and serves predictions through a FastAPI backend + React frontend deployed on AWS.

 **Live Demo:** [Telematics UBI Dashboard](https://d23qfgezrabaz7.cloudfront.net)

---

## Features
- **Risk Scoring:** XGBoost model trained on engineered driver behavior features.
- **Dynamic Pricing:** Premiums adjust monthly based on risk score, mileage, and contextual surcharges.
- **User Dashboard:** React + Amplify app showing inputs, risk score, premium, and top risk factors.
- **GraphQL Integration:** AWS AppSync + DynamoDB to persist driver history and fetch the last 5 entries seamlessly for the dashboard.
- **Cloud Deployment:**  
  - Backend: FastAPI on AWS App Runner (Docker container via ECR)  
  - Frontend: React app on AWS Amplify/CloudFront  
  - Storage: AppSync + DynamoDB  

---

## Modeling
- **Why XGBoost?**  
  XGBoost is purpose-built for structured/tabular data with non-linear feature interactions. Compared to Logistic Regression (linear, fast but limited) or Neural Networks (flexible but data-hungry and harder to explain), XGBoost strikes the balance:
  - Handles heterogeneous feature scales automatically.
  - Produces strong accuracy on relatively small synthetic datasets.
  - Still explainable (via feature importances or SHAP values).
- **Calibration:** Isotonic regression ensures probability outputs are well-calibrated, making the pricing engine fairer and less volatile.
- **Metrics:** AUC + Brier score tracked during training.

---

## Pricing Function
```python
adj = 1
if miles > 1000: adj *= 1.05
if miles < 300: adj *= 0.97
adj *= 1 + (risk_score - 0.25) * 0.6
adj *= 1 + (night_pct * 0.10) + (school_zone_pct * 0.05)
premium = clip(base * adj, 0.5*base, 1.5*base)

# Setup, Run, and Evaluation

## Option A: Evaluate the Live Demo (fastest)
1) Open the dashboard: **https://d23qfgezrabaz7.cloudfront.net**  
2) Adjust inputs and click **Score & Price** to see risk, premium, and top factors.  
3) Use **Refresh** to pull your last 5 entries (stored via AppSync/DynamoDB when signed in).

## Option B: Run Locally (backend + frontend)

**Backend**
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pip install shap httpx   # required extras

# (optional) train the model locally
python src/train.py

uvicorn main:app --reload --port 8000

# health check
curl http://127.0.0.1:8000/health
# scoring example
curl -X POST http://127.0.0.1:8000/score -H "Content-Type: application/json" -d '{
  "trips":28,"miles":240,"duration_h":7.5,
  "speed_mean":13.0,"speed_std":2.1,
  "harsh_brake_rate":0.0018,"harsh_accel_rate":0.0017,"sharp_turn_rate":0.0027,
  "night_pct":0.42,"school_zone_pct":0.03,"rush_hour_pct":0.11
}'
**Frontend**
cd deploy
npm install
npm start