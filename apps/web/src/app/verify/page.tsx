"use client";

// Field Inspector On-site Geo-verification Page
// Opened on inspector's phone via /verify?token=xyz
// Requires HTTPS for geolocation on mobile browsers.

import { useEffect, useState, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/config";

const InspectorMap = dynamic(() => import("@/components/InspectorMap"), { ssr: false });

type Phase = "loading" | "ready" | "tracking" | "confirmed" | "error";

// ── Secure-context detection ──────────────────────────────────────────────────

function isSecureContext(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.isSecureContext === true ||
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  );
}

// ── Point-in-polygon (ray casting) ───────────────────────────────────────────

function pointInPolygon(point: [number, number], geojson: any): boolean {
  try {
    const coords: [number, number][] =
      geojson?.coordinates?.[0] ?? geojson?.geometry?.coordinates?.[0] ?? [];
    if (!coords.length) return false;
    const [px, py] = point;
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const [xi, yi] = coords[i];
      const [xj, yj] = coords[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  } catch { return false; }
}

// ── Inner component ───────────────────────────────────────────────────────────

function VerifyInner() {
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");
  const secure       = isSecureContext();

  const [phase,      setPhase]      = useState<Phase>("loading");
  const [land,       setLand]       = useState<any>(null);
  const [gps,        setGps]        = useState<{ lat: number; lng: number } | null>(null);
  const [insidePoly, setInsidePoly] = useState<boolean | null>(null);
  const [accuracy,   setAccuracy]   = useState<number | null>(null);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg("No verification token. This link is invalid or has expired.");
      setPhase("error");
      return;
    }
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp && Date.now() > decoded.exp) {
        setErrorMsg("This verification link has expired (links are valid for 24 hours). Ask the government officer to generate a new one.");
        setPhase("error");
        return;
      }
      fetchLand(decoded.land_id);
    } catch {
      setErrorMsg("Invalid verification token.");
      setPhase("error");
    }
  }, [token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  async function fetchLand(id: string) {
    const { data, error } = await supabase
      .from("land_parcels")
      .select("*, farmers(name, state, district)")
      .eq("id", id)
      .single();
    if (error || !data) {
      setErrorMsg("Land parcel not found in the database.");
      setPhase("error");
      return;
    }
    setLand(data);
    setPhase("ready");
  }

  function startTracking() {
    setErrorMsg("");

    if (!navigator.geolocation) {
      setErrorMsg("This browser does not support GPS. Please use Chrome or Safari on your phone.");
      setPhase("error");
      return;
    }

    if (!secure) {
      setErrorMsg(
        "GPS is blocked on this connection. Mobile browsers require HTTPS to access location. " +
        "Ask your system admin to share the app URL via HTTPS."
      );
      // Don't go to error phase — show the warning inline and let them still use the page
      return;
    }

    setPhase("tracking");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGps(coords);
        setAccuracy(Math.round(pos.coords.accuracy));
        if (land?.polygon_geojson) {
          setInsidePoly(pointInPolygon([coords.lng, coords.lat], land.polygon_geojson));
        }

        watchRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const c = { lat: p.coords.latitude, lng: p.coords.longitude };
            setGps(c);
            setAccuracy(Math.round(p.coords.accuracy));
            if (land?.polygon_geojson) {
              setInsidePoly(pointInPolygon([c.lng, c.lat], land.polygon_geojson));
            }
          },
          (err) => {
            setErrorMsg("GPS lost: " + err.message);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
      },
      (err) => {
        const msg =
          err.code === 1 ? "Location access denied. Tap your browser's location icon and choose Allow." :
          err.code === 2 ? "Location unavailable. Step outside and ensure GPS is enabled." :
                           "GPS timed out. Move to an open area and try again.";
        setErrorMsg(msg);
        setPhase("ready");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function confirmOnSite() {
    if (!gps) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/verify/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          land_id:         land.id,
          gps_lat:         gps.lat,
          gps_lng:         gps.lng,
          inside_boundary: insidePoly ?? false,
          officer_notes:   insidePoly ? "GPS confirmed inside boundary" : "Inspector confirmed — GPS outside boundary",
          device_info:     navigator.userAgent.slice(0, 80),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      setPhase("confirmed");
    } catch (e: any) {
      setErrorMsg("Submission failed: " + (e.message ?? "Check your internet connection."));
    }
    setSubmitting(false);
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const S: Record<string, React.CSSProperties> = {
    wrap:   { minHeight: "100dvh", background: "#040905", color: "#e2ffe6", fontFamily: "'DM Sans',sans-serif" },
    header: { background: "rgba(4,9,5,0.97)", backdropFilter: "blur(16px)", padding: "14px 18px", borderBottom: "1px solid #162518", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 },
    body:   { padding: "16px 16px 32px", maxWidth: 540, margin: "0 auto" },
    card:   { background: "#081009", border: "1px solid #162518", borderRadius: 14, padding: "16px 16px", marginBottom: 14 },
    label:  { fontSize: 11, fontWeight: 700, color: "#527056", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, display: "block" },
    row:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #162518", fontSize: 13 },
    btn:    { width: "100%", padding: "15px", border: "none", borderRadius: 12, fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", minHeight: 52 /* large touch target */ },
  };

  return (
    <div style={S.wrap}>

      {/* Header */}
      <div style={S.header}>
        <div style={{ width: 28, height: 28, background: "#4f46e5", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 13, color: "#fff", flexShrink: 0 }}>G</div>
        <div>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700 }}>EcoLedger · Field Inspection</div>
          <div style={{ fontSize: 11, color: "#527056" }}>Government geo-verification · {secure ? "🔒 Secure" : "⚠️ HTTP only"}</div>
        </div>
      </div>

      <div style={S.body}>

        {/* HTTPS warning banner */}
        {!secure && phase !== "error" && (
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>⚠️ GPS Unavailable — HTTP Connection</div>
            <div style={{ fontSize: 12, color: "#9fbfa4", lineHeight: 1.5 }}>
              GPS requires HTTPS on mobile browsers. You can still view the parcel map and manually confirm after physically visiting the site.
            </div>
          </div>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <svg className="anim-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" style={{ margin: "0 auto 16px", display: "block" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <p style={{ color: "#527056", fontSize: 14 }}>Loading parcel data…</p>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div style={{ marginTop: 24, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "24px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Verification Error</div>
            <p style={{ fontSize: 13, color: "#9fbfa4", lineHeight: 1.6 }}>{errorMsg}</p>
          </div>
        )}

        {/* Parcel info + Map + GPS */}
        {(phase === "ready" || phase === "tracking") && land && (
          <>
            {/* Parcel details */}
            <div style={S.card}>
              <span style={S.label}>Parcel to Verify</span>
              {[
                { l: "Farmer",    v: land.farmers?.name     ?? "—" },
                { l: "State",     v: land.farmers?.state    ?? "—" },
                { l: "District",  v: land.farmers?.district ?? "—" },
                { l: "Area",      v: `${land.area_ha} ha`          },
                { l: "Land Type", v: land.land_type                 },
                { l: "CO₂/yr",   v: `${land.predicted_co2} t`     },
                { l: "Status",    v: land.status                    },
              ].map((r, i, arr) => (
                <div key={r.l} style={{ ...S.row, borderBottom: i < arr.length - 1 ? "1px solid #162518" : "none" }}>
                  <span style={{ color: "#527056" }}>{r.l}</span>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Map */}
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #162518", marginBottom: 14, height: 280 }}>
              <InspectorMap polygon={land.polygon_geojson} gps={gps} />
            </div>

            {/* GPS status pill */}
            {phase === "tracking" && gps && (
              <div style={{
                background: insidePoly ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${insidePoly ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
                borderRadius: 12, padding: "12px 14px", marginBottom: 14,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{insidePoly ? "✅" : "⚠️"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: insidePoly ? "#4ade80" : "#fbbf24" }}>
                    {insidePoly ? "Inside the submitted boundary" : "Outside the submitted boundary"}
                  </div>
                  <div style={{ fontSize: 11, color: "#527056", marginTop: 2 }}>
                    {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                    {accuracy !== null && ` · ±${accuracy}m accuracy`}
                  </div>
                </div>
              </div>
            )}

            {/* Error message (inline, not full error page) */}
            {errorMsg && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 14 }}>
                {errorMsg}
              </div>
            )}

            {/* Action buttons */}
            {phase === "ready" ? (
              <button
                onClick={startTracking}
                disabled={!secure}
                style={{ ...S.btn, background: secure ? "#16a34a" : "#1a2e1c", color: secure ? "#fff" : "#527056", opacity: secure ? 1 : 0.6 }}
              >
                {secure ? "📍 Start GPS Verification" : "📍 GPS Unavailable (HTTP)"}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
                    setPhase("ready"); setGps(null); setInsidePoly(null); setErrorMsg("");
                  }}
                  style={{ ...S.btn, flex: 1, background: "transparent", border: "1px solid #234030", color: "#9fbfa4" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmOnSite}
                  disabled={!gps || submitting}
                  style={{ ...S.btn, flex: 2, background: gps ? "#16a34a" : "#14532d", color: "#fff", opacity: gps ? 1 : 0.6 }}
                >
                  {submitting
                    ? "Submitting…"
                    : insidePoly
                    ? "✓ Confirm — Inside Boundary"
                    : "⚠️ Confirm Anyway (Outside)"}
                </button>
              </div>
            )}

            {/* Manual confirm option when no GPS */}
            {!secure && phase === "ready" && (
              <button
                onClick={async () => {
                  setSubmitting(true);
                  setErrorMsg("");
                  try {
                    const res = await fetch(`${API_URL}/verify/confirm`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        land_id:         land.id,
                        gps_lat:         0,
                        gps_lng:         0,
                        inside_boundary: false,
                        officer_notes:   "Manual confirmation — GPS unavailable (HTTP connection)",
                        device_info:     navigator.userAgent.slice(0, 80),
                      }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    setPhase("confirmed");
                  } catch (e: any) {
                    setErrorMsg("Submission failed: " + e.message);
                  }
                  setSubmitting(false);
                }}
                disabled={submitting}
                style={{ ...S.btn, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", marginTop: 10, fontSize: 13 }}
              >
                {submitting ? "Submitting…" : "✓ Confirm Visit Manually (No GPS)"}
              </button>
            )}
          </>
        )}

        {/* Success */}
        {phase === "confirmed" && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ width: 72, height: 72, background: "rgba(34,197,94,0.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36 }}>✓</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>Verification Recorded</div>
            <p style={{ fontSize: 14, color: "#527056", lineHeight: 1.6, marginBottom: 20 }}>
              Your visit has been recorded. The government officer can now review and approve this parcel.
            </p>
            <div style={{ ...S.card, textAlign: "left" }}>
              <span style={S.label}>Recorded Data</span>
              <div style={{ fontSize: 13, color: "#9fbfa4", lineHeight: 1.8 }}>
                <div>Time: {new Date().toLocaleString("en-IN")}</div>
                {gps && <div>GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</div>}
                <div>Boundary: {insidePoly === null ? "Not determined (no GPS)" : insidePoly ? "Inside ✓" : "Outside ⚠️"}</div>
                <div>Parcel: {land?.id?.slice(0, 8)}…</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#040905", display: "flex", alignItems: "center", justifyContent: "center", color: "#527056", fontSize: 14 }}>
        Loading…
      </div>
    }>
      <VerifyInner />
    </Suspense>
  );
}
