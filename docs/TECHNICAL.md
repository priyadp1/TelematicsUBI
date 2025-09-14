# Technical Deep Dive — Telematics UBI

This document captures the full technical design and implementation details of the Telematics UBI proof-of-concept.

---

## 1. Data & Feature Engineering

### Synthetic Data
- Generated using `/bin/make_fake_data.py`.
- Includes:
  - `events.csv`: second-by-second simulated telemetry (speed, accel, brake, location).
  - `drivers.csv`, `vehicles.csv`, `context.csv`: reference/context.
  - `trip_features.csv`, `driver_features.csv`: aggregated engineered features.
  - `labels.csv`: simulated claims (binary outcome).

### Feature Groups
- **Exposure:** trips, miles, duration_h
- **Driving Style:** speed_mean, speed_std, harsh_brake_rate, harsh_accel_rate, sharp_turn_rate
- **Contextual:** night_pct, school_zone_pct, rush_hour_pct
- **Vehicle & History (extension):** yearsLicensed, priorClaimsCount, vehicleYear, localCrashRate, crimeIndex

---

## 2. Modeling

### Baselines
- **Logistic Regression**: lightweight, interpretable, used as a sanity check.

### Final Model
- **XGBoost (Gradient Boosted Trees)**  
  Chosen over deep learning for:
  - Superior performance on structured/tabular features.
  - Handles heterogeneous feature scales and sparse signals.
  - Produces feature importances and SHAP explanations.
- **Calibration**: Isotonic regression to improve probability calibration.

### Metrics
- **AUC**: ~0.82 on synthetic sample.
- **Brier score**: 0.14 post-calibration.
- **Logloss**: ~0.39.

---

## 3. Pricing Engine

Premium = `base_rate` × adjustments:

1. **Exposure Factor:** scale with miles driven.  
2. **Behavior Factor:** increase/decrease based on risk score.  
3. **Context Surcharge:** add % for night driving, school zones.  
4. **Stability Clamp:** premium limited to ±50% of base rate.

Implemented in `src/pricing.py`.

---

## 4. Backend (FastAPI)

- Exposes `/health`, `/score`, `/graphql` proxy.
- Loads trained XGBoost + calibration models from `/models/xgb_calibrated.joblib`.
- Computes risk score and top 3 features (via SHAP or feature_importances).
- Dockerized (`Dockerfile`).
- Deployed on **AWS App Runner** from ECR.

---

## 5. Frontend (React)

- Entry point: `/deploy/app.jsx` and `/deploy/index.html`.
- Features:
  - Input form for telematics variables.
  - Calls backend `/score` API.
  - Displays risk score, premium, and top contributing factors.
  - History table showing last N days.

---

## 6. GraphQL + Persistence

- **Schema:** defined in `amplify/backend/api/schema.graphql`.  
  - `DriverFeature` model stores date, driverId, risk score, premium, and inputs.  
  - Indexed by driverId + date.
- **Integration:**  
  - Frontend writes via `mutations.createDriverFeature`.  
  - Reads last 5 entries via `featuresByDriver` query.  
- **Auth:**  
  - API key for POC.  
  - Cognito UserPool supported for authenticated flows.

---

## 7. AWS Infrastructure

- **ECR:** stores Docker image.
- **App Runner:** serves FastAPI container at `https://<service-id>.us-east-1.awsapprunner.com`.
- **Amplify/CloudFront:** hosts frontend at  
  👉 [https://d23qfgezrabaz7.cloudfront.net](https://d23qfgezrabaz7.cloudfront.net)
- **AppSync:** GraphQL API for persistence (backed by DynamoDB).
- **DynamoDB:** stores driver history.
- **IAM:** role `AppRunnerECRAccessRole` allows App Runner to pull images.

---

## 8. Security & Privacy

- POC uses only synthetic data.
- No PII; driver IDs are pseudonymous.
- Production extension would require:
  - Consent management.
  - Encryption at rest and in transit.
  - Data retention policies.
  - Differential privacy for location traces.

---

## 9. Evaluation Criteria (Mapped)

- **Modeling Choice:** XGBoost with calibration for accuracy + interpretability.  
- **Risk Score Reliability:** AUC/Brier validated.  
- **System Scalability:** Containerized backend, serverless frontend, managed GraphQL.  
- **Cost Awareness:** Pay-per-use serverless services (App Runner, Amplify, DynamoDB).

---

## 10. Next Steps

- Expand feature space (weather, traffic, external context).  
- Add gamification (safe driving rewards).  
- Real-time trip event processing (Kinesis or Kafka).  
- Enhanced interpretability with SHAP visualization in frontend.  
