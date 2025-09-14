from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse, Response
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any
from pathlib import Path
import numpy as np, joblib, os, json
import httpx

app = FastAPI(title="Telematics UBI API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE = Path(__file__).resolve().parent
ART = BASE / "models" / "xgb_calibrated.joblib"
_pack = joblib.load(ART)
MODEL, CAL, COLS = _pack["model"], _pack["cal"], _pack["features"]

_use_shap = False
_EXPL = None
try:
    import shap
    _EXPL = shap.TreeExplainer(MODEL)
    _use_shap = True
except Exception:
    pass

STATIC_DIR = BASE / "deploy" / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
else:
    print(f"[WARN] Static dir not found: {STATIC_DIR}. Skipping /static mount.")

class Features(BaseModel):
    trips: float = 0
    miles: float = 0
    duration_h: float = 0
    speed_mean: float = 0
    speed_std: float = 0
    harsh_brake_rate: float = 0
    harsh_accel_rate: float = 0
    sharp_turn_rate: float = 0
    night_pct: float = 0
    school_zone_pct: float = 0
    rush_hour_pct: float = 0

def row_from_features(f: Features) -> np.ndarray:
    return np.array([[getattr(f, c, 0) for c in COLS]], dtype=float)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/")
def root():
    index = STATIC_DIR / "index.html"
    if index.exists():
        return RedirectResponse(url="/static/index.html", status_code=307)
    return JSONResponse({"ok": True, "features": COLS, "model_artifact": str(ART),
                         "hint": f"Place index.html at {index} or update STATIC_DIR."})

@app.post("/score")
def score(f: Features) -> Dict[str, Any]:
    x = row_from_features(f)
    try:
        prob = float(CAL.predict_proba(x)[:, 1][0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"predict failed: {e}")

    top: List[Dict[str, Any]] = []
    try:
        if _use_shap and _EXPL is not None:
            sv_all = _EXPL.shap_values(x)
            sv = sv_all[0] if isinstance(sv_all, list) else sv_all[0]
            idx = np.argsort(np.abs(sv))[::-1][:3]
            top = [{"feature": COLS[i], "contribution": float(sv[i])} for i in idx]
        else:
            imps = getattr(MODEL, "feature_importances_", None)
            if imps is not None and len(imps) == len(COLS):
                idx = np.argsort(imps)[::-1][:3]
                top = [{"feature": COLS[i], "contribution": float(imps[i])} for i in idx]
    except Exception:
        top = []

    return {"riskScore": max(0.0, min(1.0, prob)), "topFactors": top}

APPSYNC_URL = os.getenv("APPSYNC_URL", "").strip()
APPSYNC_API_KEY = os.getenv("APPSYNC_API_KEY", "").strip()
if not APPSYNC_URL:
    print("[WARN] /graphql proxy disabled: APPSYNC_URL not set")

@app.post("/graphql")
async def graphql_proxy(req: Request) -> Response:
    if not APPSYNC_URL:
        raise HTTPException(status_code=503, detail="AppSync proxy disabled; APPSYNC_URL not set")

    try:
        data = await req.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    query = data.get("query")
    variables = data.get("variables")
    operation_name = data.get("operationName")
    auth_mode = (data.get("authMode") or "").lower()

    if not query:
        raise HTTPException(status_code=400, detail="Missing 'query'")

    headers = {"content-type": "application/json"}
    incoming_auth = req.headers.get("authorization")

    use_api_key = False
    if auth_mode in ("apikey", "api_key", "api-key"):
        use_api_key = True
    elif not incoming_auth and APPSYNC_API_KEY:
        use_api_key = True

    if use_api_key:
        if not APPSYNC_API_KEY:
            raise HTTPException(status_code=401, detail="authMode=apiKey but APPSYNC_API_KEY not set")
        headers["x-api-key"] = APPSYNC_API_KEY
    else:
        if not incoming_auth:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        headers["authorization"] = incoming_auth

    payload = {"query": query, "variables": variables, "operationName": operation_name}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(APPSYNC_URL, headers=headers, json=payload)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Upstream AppSync timeout")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream AppSync error: {e}")

    return Response(content=r.content, status_code=r.status_code, media_type="application/json")
