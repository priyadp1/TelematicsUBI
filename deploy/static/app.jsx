const APP_BUILD = "app.jsx v10";
const apiBase = "https://mxmayt28pp.us-east-1.awsapprunner.com";

let MODEL = null;
async function loadModelJSON() {
  if (MODEL) return MODEL;
  const res = await fetch("/static/model_frontend.json", { cache: "no-store" });
  if (!res.ok) throw new Error("load model_frontend.json failed");
  MODEL = await res.json();
  return MODEL;
}

function zscore(x, m, s) { if (m == null || s == null) return x; return (x - m) / (s || 1); }
function dot(a, b){ let s = 0; for (let i=0;i<a.length;i++) s += a[i]*b[i]; return s; }
function sigmoid(z){ if (z>=0){ const ez=Math.exp(-z); return 1/(1+ez); } const ez=Math.exp(z); return ez/(1+ez); }
function interp1d(x,xp,fp){
  if(!xp||!fp||xp.length!==fp.length||!xp.length) return x;
  if(x<=xp[0]) return fp[0]; if(x>=xp[xp.length-1]) return fp[fp.length-1];
  let lo=0, hi=xp.length-1;
  while(hi-lo>1){ const mid=(lo+hi)>>1; if(x>=xp[mid]) lo=mid; else hi=mid; }
  const t=(x-xp[lo])/(xp[hi]-xp[lo]); return fp[lo]+t*(fp[hi]-fp[lo]);
}
const toCamel = k => k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const toSnake = k => k.replace(/[A-Z]/g,c=>"_"+c.toLowerCase());
function normalizeKeys(obj){
  const out={}; for(const [k,v] of Object.entries(obj)){
    out[k]=v; out[toSnake(k)]=v; out[toCamel(k)]=v; out[k.toLowerCase()]=v;
  } return out;
}

function priceMonth(base,risk,miles,nightPct,schoolZonePct){
  let adj=1;
  if(miles>1000) adj*=1.05; if(miles<300) adj*=0.97;
  adj*=1+(risk-0.25)*0.6; adj*=1+(nightPct||0)*0.10; adj*=1+(schoolZonePct||0)*0.05;
  const uncapped=base*adj;
  const premium=Math.max(0.5*base, Math.min(1.5*base, uncapped));
  const tier=risk<0.15?"Low":(risk<0.35?"Medium":"High");
  return { premium:Number(premium.toFixed(2)), tier };
}

function topFactors(model,xStd,order,n=3){
  const coef=model?.logreg_coef||[];
  const rows=xStd.map((v,i)=>({name:order[i],score:Math.abs(v*(coef[i]||0))}));
  rows.sort((a,b)=>b.score-a.score);
  return rows.slice(0,n).map(r=>r.name);
}

async function gqlFetch({ query, variables = {}, authMode = "userPool" }) {
  const res = await fetch(`${apiBase}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authMode, query, variables })
  });
  if (!res.ok) throw new Error(`GraphQL ${authMode} fetch failed: ${res.status}`);
  return res.json();
}

async function getDriverIdOrDemo() {
  try {
    const { getCurrentUser } = window.aws || {};
    if (getCurrentUser) {
      const u = await getCurrentUser();
      return u?.userId || u?.username || "demo";
    }
  } catch (_) {}
  return "demo";
}

async function fetchLast5FromAppSync() {
  const driverId = await getDriverIdOrDemo();
  const byDriverQuery = `
    query Last5($driverId: String!, $limit: Int) {
      featuresByDriver(driverId: $driverId, sortDirection: DESC, limit: $limit) {
        items { date riskScore premium driverId }
      }
    }`;
  try {
    const r = await gqlFetch({
      authMode: "userPool",
      query: byDriverQuery,
      variables: { driverId, limit: 5 }
    });
    const items = r?.data?.featuresByDriver?.items || [];
    if (items.length) return items;
  } catch (_) {}
  try {
    const r = await gqlFetch({
      authMode: "apiKey",
      query: byDriverQuery,
      variables: { driverId, limit: 5 }
    });
    const items = r?.data?.featuresByDriver?.items || [];
    if (items.length) return items;
  } catch (e) {
    console.warn("AppSync read failed:", e);
  }
  return [];
}

async function scoreRisk(formValues) {
  try {
    const body = {
      trips: formValues.trips,
      miles: formValues.miles,
      duration_h: formValues.durationH,
      speed_mean: formValues.speedMean,
      speed_std: formValues.speedStd,
      harsh_brake_rate: formValues.harshBrakeRate,
      harsh_accel_rate: formValues.harshAccelRate,
      sharp_turn_rate: formValues.sharpTurnRate,
      night_pct: formValues.nightPct,
      school_zone_pct: formValues.schoolZonePct,
      rush_hour_pct: formValues.rushHourPct,
    };
    const res = await fetch(`${apiBase}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`XGB scoring failed (${res.status})`);
    const { riskScore, topFactors: tf } = await res.json();
    return {
      riskScore: Number(riskScore),
      xStd: [], order: [], model: null,
      topFactors: (tf || []).map(t => t.feature)
    };
  } catch (e) {
    const m = await loadModelJSON();
    const order = m.feature_order;
    const fvAll = normalizeKeys(formValues);
    const xRaw = order.map(k => Number(
      fvAll[k] ?? fvAll[toCamel(k)] ?? fvAll[toSnake(k)] ?? fvAll[k.toLowerCase()] ?? 0
    ));
    const mean = m.scaler_mean, scale = m.scaler_scale;
    const xStd = xRaw.map((v, i) => zscore(v, mean ? mean[i] : null, scale ? scale[i] : null));
    const coef = m.logreg_coef || [];
    const intercept = m.logreg_intercept || 0;
    const logit = dot(coef, xStd) + intercept;
    let p = sigmoid(logit);
    if (m.calibrator?.x && m.calibrator?.y) p = interp1d(p, m.calibrator.x, m.calibrator.y);
    return { riskScore: Math.max(0, Math.min(1, p)), xStd, order, model: m, topFactors: topFactors(m, xStd, order, 3) };
  }
}

function App() {
  const [features, setFeatures] = React.useState({
    miles: 750, harshBrakeRate: 0.02, harshAccelRate: 0.015, sharpTurnRate: 0.01,
    nightPct: 0.20, schoolZonePct: 0.05, rushHourPct: 0.30, trips: 40, durationH: 22,
    speedMean: 13, speedStd: 3, yearsLicensed: 4, priorClaimsCount: 0, priorViolations: 1,
    vehicleYear: 2018, safetyRating: 4, localCrashRate: 1.0, crimeIndex: 1.0
  });
  const [baseRate, setBaseRate] = React.useState(100);
  const [riskScore, setRiskScore] = React.useState(null);
  const [riskTier, setRiskTier] = React.useState(null);
  const [premium, setPremium] = React.useState(null);
  const [factors, setFactors] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoadingHistory(true);
      const items = await fetchLast5FromAppSync();
      const rows = (items || [])
        .slice()
        .sort((a,b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0,5)
        .map(x => ({ date: x.date, riskScore: Number(x.riskScore), premium: Number(x.premium) }));
      setHistory(rows);
      setLoadingHistory(false);
    })();
  }, []);

  const handleChange = (k) => (e) => {
    const v = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setFeatures((s) => ({ ...s, [k]: v }));
  };

  async function scoreAndPrice() {
    setLoading(true);
    try {
      const scored = await scoreRisk(features);
      const riskScoreVal = Number(scored.riskScore.toFixed(4));
      const priced = priceMonth(baseRate, riskScoreVal, features.miles, features.nightPct, features.schoolZonePct);
      setRiskScore(riskScoreVal);
      setRiskTier(priced.tier);
      setPremium(priced.premium);
      setFactors((scored.topFactors && scored.topFactors.length)
        ? scored.topFactors
        : topFactors(scored.model, scored.xStd, scored.order, 3));
      const today = new Date().toISOString().slice(0,10);
      try {
        const { API, getCurrentUser } = window.aws || {};
        const { mutations } = window.gql || {};
        if (API && getCurrentUser && mutations?.createDriverFeature) {
          const user = await getCurrentUser();
          const input = {
            driverId: user.userId || user.username || "demo",
            date: today,
            miles: features.miles, trips: features.trips, durationH: features.durationH,
            speedMean: features.speedMean, speedStd: features.speedStd,
            harshBrakeRate: features.harshBrakeRate, harshAccelRate: features.harshAccelRate,
            sharpTurnRate: features.sharpTurnRate, nightPct: features.nightPct, schoolZonePct: features.schoolZonePct,
            riskScore: riskScoreVal, premium: priced.premium, updatedAt: new Date().toISOString()
          };
          await API.graphql({ query: mutations.createDriverFeature, variables: { input }, authMode: "userPool" });
          setHistory(prev => {
            const row = { date: today, riskScore: riskScoreVal, premium: priced.premium };
            return [row, ...prev.filter(r => r.date !== today)].slice(0,5);
          });
        }
      } catch (e) {
        console.warn("GraphQL save skipped/failed:", e);
      }
    } catch (e) {
      alert("Scoring failed.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshHistory() {
    setLoadingHistory(true);
    const items = await fetchLast5FromAppSync();
    const rows = (items || [])
      .slice()
      .sort((a,b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0,5)
      .map(x => ({ date: x.date, riskScore: Number(x.riskScore), premium: Number(x.premium) }));
    setHistory(rows);
    setLoadingHistory(false);
  }

  return (
    <div>
      <p className="muted">Build: {APP_BUILD}</p>
      <section className="grid">
        {Object.keys(features).map((k) => (
          <label key={k}>
            <span className="muted">{k}</span>
            <input type="number" step="any" value={features[k]} onChange={handleChange(k)} />
          </label>
        ))}
      </section>
      <div className="row">
        <label>Base rate ($):
          <input type="number" value={baseRate} onChange={(e) => setBaseRate(Number(e.target.value))} />
        </label>
        <button onClick={scoreAndPrice} disabled={loading}>{loading ? "Scoring..." : "Score & Price"}</button>
        <div>Risk score: <strong>{riskScore ?? "—"}</strong> {riskTier ? <span className="muted">({riskTier})</span> : null}</div>
        <div>Premium: <strong>{premium == null ? "—" : `$${premium}`}</strong></div>
        <div>Top factors: <strong>{(factors && factors.length) ? factors.join(", ") : "—"}</strong></div>
      </div>
      <div style={{marginTop:12, display:"flex", alignItems:"center", gap:12}}>
        <div className="muted">Last {history.length || 0} days</div>
        <button onClick={refreshHistory} disabled={loadingHistory}>{loadingHistory ? "Refreshing..." : "Refresh"}</button>
      </div>
      {history.length > 0 && (
        <div style={{marginTop:8}}>
          <table>
            <thead><tr><th>Date</th><th>Risk</th><th>Premium</th></tr></thead>
            <tbody>
              {history.map(r => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>{r.riskScore}</td>
                  <td>${r.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
