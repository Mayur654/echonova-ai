"use client";

import { API_URL } from "@/lib/config";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

const OfficerFieldMap = dynamic(() => import("@/components/OfficerFieldMap"), { ssr: false });

type Farmer = { name: string; phone: string; state: string; district: string };
type FieldInspection = {
  gps_lat: number; gps_lng: number; timestamp: string;
  inside_boundary: boolean; officer_notes: string; device_info?: string;
};
type Land = {
  id: string; area_ha: number; predicted_co2: number;
  land_type: string; crop_type?: string;
  status: "pending" | "approved" | "rejected" | "field_confirmed";
  created_at: string; rejection_reason?: string;
  blockchain_tx?: { tx_hash: string; tokens: number; timestamp: string };
  polygon_geojson?: any;
  field_inspection?: FieldInspection;
  farmers?: Farmer;
};

const EMOJI: Record<string, string> = { forest:"🌲", cropland:"🌾", grassland:"🌿", wetland:"💧", shrubland:"🌱" };

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = { approved:"pill pill-green", pending:"pill pill-amber", rejected:"pill pill-red", field_confirmed:"pill pill-blue" };
  const labels: Record<string, string> = { approved:"Approved", pending:"Pending", rejected:"Rejected", field_confirmed:"Field Confirmed" };
  return (
    <span className={cfg[status] ?? "pill pill-amber"}>
      {status === "pending" && <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--amber)", display:"inline-block" }} className="anim-pulse-dot" />}
      {labels[status] ?? status}
    </span>
  );
}

// ── Field Inspection Detail Panel ─────────────────────────────────────────────

function FieldInspectionCard({ inspection }: { inspection: FieldInspection }) {
  const date = new Date(inspection.timestamp).toLocaleString("en-IN", { day:"numeric", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" });
  return (
    <div style={{ background: "var(--gov-bg)", border: "1px solid var(--gov-border)", borderRadius: 10, padding: "12px 14px", marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        📍 Field Inspection Report
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { l: "Date & Time",     v: date },
          { l: "Boundary",        v: inspection.inside_boundary ? "✓ Inside" : "⚠ Outside", color: inspection.inside_boundary ? "#4ade80" : "#fbbf24" },
          { l: "GPS Lat",         v: inspection.gps_lat ? inspection.gps_lat.toFixed(5) : "No GPS" },
          { l: "GPS Lng",         v: inspection.gps_lng ? inspection.gps_lng.toFixed(5) : "No GPS" },
        ].map((r) => (
          <div key={r.l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gov-text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{r.l}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: (r as any).color ?? "var(--gov-text-2)" }}>{r.v}</div>
          </div>
        ))}
      </div>
      {inspection.officer_notes && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--gov-text-3)", background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "8px 10px" }}>
          <strong style={{ color: "var(--gov-text-2)" }}>Notes:</strong> {inspection.officer_notes}
        </div>
      )}
      {inspection.gps_lat ? (
        <a
          href={`https://maps.google.com/?q=${inspection.gps_lat},${inspection.gps_lng}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, color: "#818cf8", textDecoration: "none", fontWeight: 600 }}
        >
          🗺 View on Google Maps ↗
        </a>
      ) : null}
    </div>
  );
}

// ── Officer GPS Walk Modal ────────────────────────────────────────────────────

function OfficerGPSModal({ land, onClose, onDone }: { land: Land; onClose: () => void; onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  async function handleSubmit(path: [number, number][], inside: boolean | null) {
    setSubmitting(true);
    try {
      // Update field_inspection with officer's GPS trace and boundary check
      await supabase.from("land_parcels").update({
        field_inspection: {
          gps_lat:          path.length > 0 ? path[path.length - 1][0] : 0,
          gps_lng:          path.length > 0 ? path[path.length - 1][1] : 0,
          officer_gps_path: path,               // full trace stored
          inside_boundary:  inside ?? false,
          timestamp:        new Date().toISOString(),
          officer_notes:    `Officer GPS trace: ${path.length} points. ${inside ? "Final position inside boundary." : "Final position outside boundary."}`,
          device_info:      navigator.userAgent.slice(0, 80),
        },
        status: "field_confirmed",
      }).eq("id", land.id);

      setDone(true);
      setTimeout(() => { onClose(); onDone(); }, 1500);
    } catch (e: any) {
      alert("Failed to submit: " + e.message);
    }
    setSubmitting(false);
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div style={{ background: "var(--gov-card)", border: "1px solid var(--gov-border)", borderRadius: 20, padding: 24, maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 700, color: "var(--gov-text)", marginBottom: 4 }}>
              Officer GPS Boundary Walk
            </h3>
            <p style={{ fontSize: 13, color: "var(--gov-text-3)" }}>
              {land.farmers?.name} · {land.area_ha} ha · {EMOJI[land.land_type]} {land.land_type}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--gov-text-3)", fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 700, color: "#4ade80" }}>GPS Trace Saved</div>
            <p style={{ color: "var(--gov-text-3)", fontSize: 13, marginTop: 6 }}>Parcel status updated to Field Confirmed</p>
          </div>
        ) : (
          <OfficerFieldMap
            farmerPolygon={land.polygon_geojson}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [lands,       setLands]       = useState<Land[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<string>("all");
  const [busy,        setBusy]        = useState<Record<string, boolean>>({});
  const [expanded,    setExpanded]    = useState<string | null>(null);   // expanded row ID
  const [gpsLand,     setGpsLand]     = useState<Land | null>(null);     // GPS walk modal
  const [toast,       setToast]       = useState<{ msg: string; type: "success"|"error" } | null>(null);

  function showToast(msg: string, type: "success"|"error" = "success") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  }

  const fetchAll = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/land/all`);
      const data = await res.json();
      setLands(Array.isArray(data) ? data : []);
    } catch { showToast("Backend connection failed", "error"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!lands.some((l) => l.status === "pending" || l.status === "field_confirmed")) return;
    const t = setInterval(fetchAll, 10000);
    return () => clearInterval(t);
  }, [lands, fetchAll]);

  async function approve(id: string) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/land/approve/${id}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      showToast("Parcel approved — tokens minted on Polygon ✓");
      await fetchAll();
    } catch (e: any) { showToast("Approval failed: " + e.message, "error"); }
    setBusy((b) => ({ ...b, [id]: false }));
  }

  async function reject(id: string) {
    const reason = window.prompt("Rejection reason (required):", "Boundary mismatch detected");
    if (!reason) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await fetch(`${API_URL}/land/reject/${id}?reason=${encodeURIComponent(reason)}`, { method: "POST" });
      showToast("Parcel rejected");
      await fetchAll();
    } catch (e: any) { showToast("Rejection failed: " + e.message, "error"); }
    setBusy((b) => ({ ...b, [id]: false }));
  }

  async function sendInspection(land: Land) {
    const token = btoa(JSON.stringify({ land_id: land.id, exp: Date.now() + 24*60*60*1000 }));
    const url   = `${window.location.origin}/verify?token=${token}`;
    try { await navigator.clipboard.writeText(url); showToast("Inspection link copied — send to field officer"); }
    catch { window.prompt("Copy this link:", url); }
  }

  const pending   = lands.filter((l) => l.status === "pending").length;
  const approved  = lands.filter((l) => l.status === "approved").length;
  const fieldConf = lands.filter((l) => l.status === "field_confirmed").length;
  const co2Total  = lands.filter((l) => l.status === "approved").reduce((s, l) => s + l.predicted_co2, 0);
  const filtered  = filter === "all" ? lands : lands.filter((l) => l.status === filter);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Toast */}
      {toast && (
        <div className="toast-wrap">
          <div className={`toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
            {toast.type === "error" ? "⚠️" : "✓"} {toast.msg}
          </div>
        </div>
      )}

      {/* Officer GPS modal */}
      {gpsLand && (
        <OfficerGPSModal land={gpsLand} onClose={() => setGpsLand(null)} onDone={fetchAll} />
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>EcoNova AI · Government Portal</p>
            <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 4, color: "var(--gov-text)" }}>Verification Dashboard</h1>
            <p style={{ fontSize: 14, color: "var(--gov-text-3)" }}>Review field inspections, approve parcels, mint carbon tokens</p>
          </div>
          <button onClick={fetchAll} className="btn btn-gov-ghost btn-sm">↺ Refresh</button>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { label:"Pending Review",  value:pending,   color:"var(--amber)", sub:"awaiting action"  },
            { label:"Field Confirmed", value:fieldConf, color:"#a5b4fc",      sub:"inspection done"  },
            { label:"Approved",        value:approved,  color:"var(--green)", sub:"tokens minted"    },
            { label:"CO₂ On-chain",    value:`${co2Total.toFixed(0)} t`, color:"var(--gov-text)", sub:"verified" },
          ].map((s) => (
            <div key={s.label} className="stat-card-gov">
              <div className="stat-label-gov">{s.label}</div>
              <div className="stat-value-gov" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--gov-text-3)", marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {["all","pending","field_confirmed","approved","rejected"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
              background: filter===f ? "var(--gov-blue-dim)" : "var(--gov-card)",
              border: `1px solid ${filter===f ? "var(--gov-blue-dim)" : "var(--gov-border)"}`,
              color: filter===f ? "#fff" : "var(--gov-text-3)", textTransform: "capitalize",
            }}>
              {f.replace("_"," ")} ({f==="all" ? lands.length : lands.filter(l=>l.status===f).length})
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display:"grid", gap:10 }}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:80, borderRadius:12 }}/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="card-gov" style={{ padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <p style={{ color:"var(--gov-text-3)", fontSize:14 }}>No submissions for this filter.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((land) => (
              <div key={land.id} className="card-gov" style={{ padding: "18px 20px" }}>

                {/* Main row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--gov-text)", marginBottom: 2 }}>
                      {land.farmers?.name ?? "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gov-text-3)" }}>
                      {land.farmers?.district}, {land.farmers?.state} · {EMOJI[land.land_type]} {land.land_type} · {land.area_ha} ha
                    </div>
                  </div>

                  {/* CO2 */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 700, color: "var(--green)", lineHeight: 1 }}>{land.predicted_co2} t</div>
                    <div style={{ fontSize: 10, color: "var(--gov-text-3)" }}>CO₂/yr</div>
                  </div>

                  {/* Status */}
                  <StatusPill status={land.status} />

                  {/* TX hash */}
                  {land.blockchain_tx?.tx_hash && (
                    <span className="hash" style={{ fontSize: 11 }}>{land.blockchain_tx.tx_hash.slice(0,10)}…</span>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                    {(land.status === "pending" || land.status === "field_confirmed") && (
                      <>
                        <button onClick={() => approve(land.id)} disabled={!!busy[land.id]} className="btn btn-sm"
                          style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80" }}>
                          {busy[land.id] ? "…" : "✓ Approve"}
                        </button>
                        <button onClick={() => reject(land.id)} disabled={!!busy[land.id]} className="btn btn-danger btn-sm">
                          {busy[land.id] ? "…" : "✗ Reject"}
                        </button>
                        {land.status === "pending" && (
                          <button onClick={() => sendInspection(land)} className="btn btn-sm"
                            style={{ background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", color:"#a5b4fc" }}>
                            📍 Send Inspector
                          </button>
                        )}
                        {/* Officer GPS walk button */}
                        {land.polygon_geojson && (
                          <button onClick={() => setGpsLand(land)} className="btn btn-sm"
                            style={{ background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.25)", color:"#c084fc" }}>
                            🗺 Walk GPS
                          </button>
                        )}
                      </>
                    )}
                    {land.status === "approved" && <span style={{ fontSize:12, color:"var(--green)", fontWeight:600 }}>Minted ✓</span>}
                    {land.status === "rejected"  && <span style={{ fontSize:12, color:"var(--red)",   fontWeight:600 }}>Rejected</span>}

                    {/* Expand/collapse */}
                    <button
                      onClick={() => setExpanded(expanded === land.id ? null : land.id)}
                      className="btn btn-gov-ghost btn-sm"
                    >
                      {expanded === land.id ? "▲ Less" : "▼ Details"}
                    </button>
                  </div>
                </div>

                {/* Expanded detail — field inspection */}
                {expanded === land.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--gov-border)" }}>
                    {land.field_inspection ? (
                      <FieldInspectionCard inspection={land.field_inspection} />
                    ) : (
                      <div style={{ fontSize: 13, color: "var(--gov-text-3)", padding: "10px 0" }}>
                        No field inspection recorded yet. Send a field inspector or use the Walk GPS feature above.
                      </div>
                    )}

                    {/* Rejection reason */}
                    {land.rejection_reason && (
                      <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#f87171" }}>
                        <strong>Rejection reason:</strong> {land.rejection_reason}
                      </div>
                    )}

                    {/* Submission date */}
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--gov-text-3)" }}>
                      Submitted: {new Date(land.created_at).toLocaleString("en-IN")}
                      {land.crop_type && <span> · Crop: {land.crop_type}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
