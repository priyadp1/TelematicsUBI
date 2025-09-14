import pandas as pd, numpy as np, joblib, xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, brier_score_loss
from pathlib import Path


DATA = Path("data/data/driver_features.csv") 
OUT  = Path("models/xgb_calibrated.joblib")
OUT.parent.mkdir(parents=True, exist_ok=True)


df = pd.read_csv(DATA)


FEATURES = [
    "trips","miles","duration_h","speed_mean","speed_std",
    "harsh_brake_rate","harsh_accel_rate","sharp_turn_rate",
    "night_pct","school_zone_pct","rush_hour_pct",
]


missing = [c for c in FEATURES if c not in df.columns]
if missing:
    print("WARNING: missing feature columns:", missing)
for c in missing:
    df[c] = 0.0


def pick_or_make_target(d: pd.DataFrame) -> pd.Series:
    for name in ["label", "hadClaim", "claim", "is_claim", "target"]:
        if name in d.columns:
            y = d[name].astype(int)
            print(f"Using '{name}' as classification label.")
            return y
    if "riskScore" in d.columns:
        t = 0.35
        y = (d["riskScore"].astype(float).clip(0, 1) >= t).astype(int)
        print("Using 'riskScore' >= 0.35 as positive label.")
        return y

    
    proxies = [
        "harsh_brake_rate", "harsh_accel_rate", "sharp_turn_rate",
        "speed_std", "night_pct", "rush_hour_pct"
    ]
    use_cols = [c for c in proxies if c in d.columns]
    if not use_cols:
        raise SystemExit("No label/claim/riskScore column found, and no proxy columns to synthesize from. "
                         "Add a 'label' column or provide risk proxies.")

    
    ranks = d[use_cols].rank(pct=True)
    proxy_score = ranks.mean(axis=1)

    
    q = 0.70
    thr = proxy_score.quantile(q)
    y = (proxy_score >= thr).astype(int)

    d["proxy_risk_score"] = proxy_score
    print(f"Synthesized 'label' from proxies {use_cols} using rank-mean; positives are top 30% (threshold={thr:.4f}).")
    return y

y = pick_or_make_target(df)
X = df[FEATURES].fillna(0.0)


strat = y if y.nunique() == 2 and (y.sum() > 0) and (y.sum() < len(y)) else None
X_tr, X_va, y_tr, y_va = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=strat
)


pos = int(y_tr.sum()); neg = len(y_tr) - pos
scale_pos_weight = (neg / max(pos, 1)) if pos > 0 else 1.0


clf = xgb.XGBClassifier(
    n_estimators=400, max_depth=4, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, reg_lambda=2.0,
    min_child_weight=20, gamma=0.0, tree_method="hist",
    eval_metric="logloss", n_jobs=4, scale_pos_weight=scale_pos_weight,
)

clf.fit(X_tr, y_tr, eval_set=[(X_va, y_va)], verbose=False)


cal = CalibratedClassifierCV(clf, method="isotonic", cv="prefit")
cal.fit(X_va, y_va)


p = cal.predict_proba(X_va)[:, 1]
auc = roc_auc_score(y_va, p) if y_va.nunique() == 2 and (y_va.sum() > 0) and (y_va.sum() < len(y_va)) else float("nan")
brier = brier_score_loss(y_va, p)
print(f"AUC={auc:.3f}  Brier={brier:.3f}")


joblib.dump({"model": clf, "cal": cal, "features": FEATURES}, OUT)
print(f"Saved -> {OUT}")
