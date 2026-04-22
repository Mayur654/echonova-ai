"use client";

import Link from "next/link";
import { API_URL } from "@/lib/config";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

const FieldMap = dynamic(() => import("@/components/FieldMap"), { ssr: false });

type Step = "map" | "details" | "confirm";

const LAND_TYPES = [
  { value:"cropland",  label:"Cropland",  emoji:"🌾", co2:"~12 t/ha/yr", desc:"Agricultural crop fields",    factor:12 },
  { value:"forest",    label:"Forest",    emoji:"🌲", co2:"~30 t/ha/yr", desc:"Dense tree cover",            factor:30 },
  { value:"grassland", label:"Grassland", emoji:"🌿", co2:"~8 t/ha/yr",  desc:"Open grasslands",             factor:8  },
  { value:"wetland",   label:"Wetland",   emoji:"💧", co2:"~18 t/ha/yr", desc:"Marshes and swamps",          factor:18 },
  { value:"shrubland", label:"Shrubland", emoji:"🌱", co2:"~10 t/ha/yr", desc:"Mixed shrubs",                factor:10 },
];

const CROP_TYPES = ["Rice (Paddy)","Wheat","Cotton","Sugarcane","Soybean","Maize / Corn","Groundnut","Jowar (Sorghum)","Bajra (Millet)","Pulses / Legumes","Vegetables","Fruit Orchard","Spices / Herbs","Other"];

const STEP_LABELS: Record<Step, string> = { map:"Draw Field", details:"Land Details", confirm:"AI Estimate" };
const STEPS: Step[] = ["map", "details", "confirm"];

export default function LandPage() {
  const { farmer } = useAuth();
  const router     = useRouter();

  const [step,       setStep]       = useState<Step>("map");
  const [geo,        setGeo]        = useState<any>(null);
  const [area,       setArea]       = useState("");
  const [landType,   setLandType]   = useState("cropland");
  const [cropType,   setCropType]   = useState("Rice (Paddy)");
  const [result,     setResult]     = useState<any>(null);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  function handleDraw(geojson: any, areaHa: string) {
    setGeo(geojson); setArea(areaHa); setStep("details");
  }

  async function runPrediction() {
    setLoading(true); setResult(null); setError("");
    try {
      // 1. NDVI from Earth Engine (or simulation fallback)
      const ndviRes  = await fetch(`${API_URL}/ndvi`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ geojson: geo }) });
      const ndviData = await ndviRes.json();
      const ndvi     = ndviData.mean_ndvi ?? 0.3;

      // 2. Carbon ML prediction
      const mlRes  = await fetch(`${API_URL}/ml/predict-carbon`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ area_ha: parseFloat(area), land_type: landType, state: farmer?.state ?? "Maharashtra", ndvi }) });
      const mlData = await mlRes.json();

      if (mlData.error) throw new Error(mlData.error);
      setResult({ ...mlData, ndvi, area_ha: parseFloat(area) });
      setStep("confirm");
    } catch (e: any) {
      setError("Prediction failed: " + (e.message ?? "Unknown error. Check backend connection."));
    }
    setLoading(false);
  }

  async function submitLand() {
    if (!result) return;
    const farmerId = localStorage.getItem("farmer_id");
    if (!farmerId) { setError("You are not logged in. Please sign in first."); return; }

    setSubmitting(true); setError("");
    try {
      const res = await fetch(`${API_URL}/land/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmer_id:       farmerId,
          area_ha:         result.area_ha,
          polygon_geojson: geo,
          predicted_co2:   result.co2_tonnes,
          land_type:       landType,
          crop_type:       landType === "cropland" ? cropType : null,
        }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      router.push("/dashboard");
    } catch (e: any) {
      setError("Submission failed: " + (e.message ?? "Check backend connection."));
    }
    setSubmitting(false);
  }

  const stepIdx = STEPS.indexOf(step);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 16 }}>← Back to Dashboard</Link>
          <p className="section-label">Land Registration</p>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Register a Field Parcel</h1>
          <p style={{ fontSize: 14, color: "var(--text-3)" }}>Draw your boundary → AI estimates CO₂ → Submit for government verification</p>
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "all 0.25s",
                  background: i < stepIdx ? "var(--green-glow)" : i === stepIdx ? "var(--green-dim)" : "var(--bg-card)",
                  border: i < stepIdx ? "1px solid var(--green-dim)" : i === stepIdx ? "none" : "1px solid var(--border)",
                  color: i < stepIdx ? "var(--green)" : i === stepIdx ? "#fff" : "var(--text-3)",
                }}>
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: i === stepIdx ? "var(--text)" : "var(--text-3)", transition: "color 0.2s" }}>{STEP_LABELS[s]}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < stepIdx ? "var(--green-dim)" : "var(--border)", margin: "0 12px", transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Map ── */}
        {step === "map" && (
          <div className="anim-fade-up">
            <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 12 }}>
              Click the polygon tool (top-right corner of the map) to start drawing. Click each corner of your field, then close the polygon.
            </p>
            <FieldMap onDraw={handleDraw} />
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === "details" && (
          <div className="anim-fade-up">
            {/* Area banner */}
            <div style={{ background: "var(--green-glow2)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: 12, padding: "12px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>Field area calculated by Turf.js</span>
              <span style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{area} ha</span>
            </div>

            {/* Land type */}
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Land Type</p>
            <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
              {LAND_TYPES.map((l) => (
                <div key={l.value} onClick={() => setLandType(l.value)}
                  className={landType === l.value ? "card card-act" : "card"}
                  style={{ padding: "13px 17px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{l.emoji}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: landType === l.value ? "var(--green)" : "var(--text)" }}>{l.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>{l.desc}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, flexShrink: 0 }}>{l.co2}</span>
                </div>
              ))}
            </div>

            {/* Crop type (only for cropland) */}
            {landType === "cropland" && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Crop Type</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {CROP_TYPES.map((c) => (
                    <div key={c} onClick={() => setCropType(c)}
                      className={cropType === c ? "card card-act" : "card"}
                      style={{ padding: "10px 13px", cursor: "pointer", fontSize: 13, color: cropType === c ? "var(--green)" : "var(--text-2)", fontWeight: cropType === c ? 600 : 400 }}
                    >{c}</div>
                  ))}
                </div>
              </>
            )}

            {error && <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 14px", color:"#f87171", fontSize:13, marginBottom:14 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("map")} className="btn btn-ghost" style={{ flex: 1 }}>← Redraw</button>
              <button onClick={runPrediction} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                {loading
                  ? <><svg className="anim-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Fetching NDVI &amp; calculating…</>
                  : "Calculate Carbon Estimate →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Result ── */}
        {step === "confirm" && result && (
          <div className="anim-fade-up">
            <div className="card" style={{ padding: "28px 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>AI Carbon Estimate</p>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 60, fontWeight: 800, color: "var(--green)", lineHeight: 1, letterSpacing: "-0.03em" }}>{result.co2_tonnes}</div>
                <div style={{ fontSize: 15, color: "var(--text-3)", marginTop: 6 }}>tonnes CO₂ sequestered per year</div>
              </div>

              {/* NDVI */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Satellite NDVI — Vegetation Health</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>{result.ndvi?.toFixed(3)}</span>
                </div>
                <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (result.ndvi ?? 0) * 100)}%`, background: "linear-gradient(90deg,#ef4444 0%,#f59e0b 35%,#22c55e 70%,#16a34a 100%)", borderRadius: 4, transition: "width 0.8s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-3)" }}>
                  <span>Sparse (0)</span><span>Moderate (0.5)</span><span>Dense (1.0)</span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid-4" style={{ marginBottom: 20 }}>
                {[
                  { l:"Est. Value",    v:`₹${Number(result.value_inr).toLocaleString("en-IN")}`, c:"var(--amber)" },
                  { l:"Carbon Class", v:result.carbon_class, c: result.carbon_class==="High"?"var(--green)":result.carbon_class==="Medium"?"var(--amber)":"var(--text-2)" },
                  { l:"Area",         v:`${result.area_ha} ha`, c:"var(--text)" },
                  { l:"Land Type",    v:landType.charAt(0).toUpperCase()+landType.slice(1), c:"var(--text-2)" },
                ].map((m) => (
                  <div key={m.l} style={{ background: "var(--bg)", borderRadius: 10, padding: "11px 13px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: m.c, marginTop: 3 }}>{m.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--bg)", borderRadius: 10, padding: "11px 14px", marginBottom: 18, fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
                ℹ️ Prediction uses satellite NDVI from Google Earth Engine and the XGBoost carbon model.
                Final tokens are minted only after a government officer approves your submission.
                A field inspector may also be sent to verify your boundary on-site.
              </div>

              {error && <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 14px", color:"#f87171", fontSize:13, marginBottom:14 }}>{error}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep("details")} className="btn btn-ghost" style={{ flex: 1 }}>← Adjust</button>
                <button onClick={submitLand} disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                  {submitting
                    ? <><svg className="anim-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Submitting for review…</>
                    : "Submit for Government Verification ✓"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


