import json, joblib, pathlib, sys

BASE = pathlib.Path(__file__).resolve().parent
MODELS = BASE.parent / "models"
STATIC = BASE.parent / "static"

def first_existing(paths):
  for p in paths:
    if p and p.exists():
      return p
  return None

def load_json(path):
  raw = json.loads(path.read_text(encoding="utf-8"))
  return raw.get("columns") if isinstance(raw, dict) and "columns" in raw else raw

def get_attr(obj, names):
  for n in names:
    v = getattr(obj, n, None)
    if v is not None:
      return v
  return None

def try_load(p):
  try:
    return joblib.load(p)
  except Exception:
    return None

def main():
  if not MODELS.exists():
    print(f"Missing {MODELS}"); sys.exit(1)

  features_path = first_existing([MODELS/"feature_order.json", MODELS/"feature_columns.json"])
  if not features_path:
    print("Missing feature_order.json or feature_columns.json"); sys.exit(1)

  scaler = try_load(MODELS/"scaler.pkl")
  logreg = try_load(MODELS/"baseline_logreg.pkl")
  if logreg is None:
    print("Missing baseline_logreg.pkl"); sys.exit(1)

  features = load_json(features_path)

  data = {
    "feature_order": features,
    "scaler_mean": getattr(scaler, "mean_", None).tolist() if getattr(scaler, "mean_", None) is not None else None,
    "scaler_scale": getattr(scaler, "scale_", None).tolist() if getattr(scaler, "scale_", None) is not None else None,
    "logreg_coef": getattr(logreg, "coef_", None).ravel().tolist() if getattr(logreg, "coef_", None) is not None else None,
    "logreg_intercept": float(getattr(logreg, "intercept_", [0])[0]) if getattr(logreg, "intercept_", None) is not None else 0.0,
    "calibrator": None,
    "version": 1
  }

  calib = try_load(MODELS/"isotonic_cal.pkl") or try_load(MODELS/"isotonic_calib.pkl") or try_load(MODELS/"isotonic.pkl")
  if calib is not None:
    xs = get_attr(calib, ["X_thresholds_", "x_thresholds_", "X_"])
    ys = get_attr(calib, ["y_thresholds_", "y_"])
    if xs is not None and ys is not None:
      data["calibrator"] = {"x": [float(x) for x in list(xs)], "y": [float(y) for y in list(ys)]}

  STATIC.mkdir(parents=True, exist_ok=True)
  out = STATIC/"model_frontend.json"
  out.write_text(json.dumps(data, indent=2), encoding="utf-8")
  print(f"Wrote {out.resolve()}")

if __name__ == "__main__":
  main()
