"use client";
import { useAuth } from "@/lib/auth-context";

import { API_URL } from "@/lib/config";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type BlockchainTx = { tx_hash: string; tokens: number; timestamp: string };
type Land = {
  id: string; area_ha: number; predicted_co2: number;
  land_type: string; crop_type?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string; blockchain_tx?: BlockchainTx;
};

const LAND_EMOJI: Record<string, string> = { forest:"🌲", cropland:"🌾", grassland:"🌿", wetland:"💧", shrubland:"🌱" };

const STATUS_CFG = {
  approved: { label:"Approved",     pill:"pill pill-green", dot:"var(--green)" },
  pending:  { label:"Under Review", pill:"pill pill-amber", dot:"var(--amber)" },
  rejected: { label:"Rejected",     pill:"pill pill-red",   dot:"var(--red)"   },
};

export default function FarmerDashboard() {
  const [lands,       setLands]       = useState<Land[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [farmerName,  setFarmerName]  = useState("Farmer");
  const [farmerId,    setFarmerId]    = useState<string | null>(null);

  const fetchLands = useCallback(async (id: string) => {
    try {
      const res  = await fetch(`${API_URL}/land/my-lands/${id}`);
      const data = await res.json();
      setLands(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  
  const { farmer } = useAuth();

  useEffect(() => {
   if (!farmer) {
      setLoading(false);
      return;
   }

   setFarmerName(farmer.name || "Farmer");
   setFarmerId(farmer.id);

   fetchLands(farmer.id);
  }, [farmer, fetchLands]);

  // Auto-refresh every 8s when there are pending parcels
  useEffect(() => {
    if (!farmerId || !lands.some((l) => l.status === "pending")) return;
    const t = setInterval(() => fetchLands(farmerId), 8000);
    return () => clearInterval(t);
  }, [farmerId, lands, fetchLands]);

  const totalArea    = lands.reduce((s, l) => s + l.area_ha, 0);
  const totalCO2     = lands.reduce((s, l) => s + l.predicted_co2, 0);
  const totalTokens  = lands.filter((l) => l.blockchain_tx?.tokens).reduce((s, l) => s + (l.blockchain_tx?.tokens ?? 0), 0);
  const approvedCnt  = lands.filter((l) => l.status === "approved").length;
  const pendingCnt   = lands.filter((l) => l.status === "pending").length;
  const estValue     = totalTokens * 1500;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <p className="section-label">Farmer Portal</p>
            <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
              Hello, {farmerName.split(" ")[0]} 👋
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>Your carbon credit overview</p>
          </div>
          <Link href="/land" className="btn btn-primary" style={{ textDecoration: "none" }}>+ Register Land</Link>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { label:"Total Area",       value: totalArea.toFixed(1),    sub:"hectares",         color:"var(--text)"  },
            { label:"CO₂ / Year",       value: totalCO2.toFixed(1),     sub:"tonnes sequestered",color:"var(--green)"},
            { label:"Tokens Earned",    value: totalTokens.toFixed(0),  sub:"ERC-20 on Polygon", color:"var(--amber)"},
            { label:"Est. Value",       value: `₹${estValue.toLocaleString("en-IN")}`, sub:"at ₹1,500/tonne", color:"var(--text)" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Approved / Pending breakdown */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, background: "var(--green-glow)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✓</div>
            <div>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{approvedCnt}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>Approved parcels · tokens minted</div>
            </div>
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, background: "rgba(245,158,11,0.1)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⏳</div>
            <div>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 700, color: "var(--amber)" }}>{pendingCnt}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                {pendingCnt > 0 ? "Awaiting government review" : "No pending parcels"}
                {pendingCnt > 0 && <span className="anim-pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--amber)", display: "inline-block", marginLeft: 6 }} />}
              </div>
            </div>
          </div>
        </div>

        {/* Land parcels list */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 17, fontWeight: 700 }}>My Parcels</h2>
          <button onClick={() => farmerId && fetchLands(farmerId)} className="btn btn-ghost btn-sm">↺ Refresh</button>
        </div>

        {/* Not logged in */}
        {!loading && !farmerId && (
          <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🌾</div>
            <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No account found</h3>
            <p style={{ color: "var(--text-3)", fontSize: 14, marginBottom: 20 }}>Register as a farmer to start tracking your carbon credits.</p>
            <Link href="/register" className="btn btn-primary" style={{ textDecoration: "none" }}>Create Account →</Link>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: "grid", gap: 10 }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 20, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14 }}>
                <div className="skeleton" style={{ height: 13, width: "30%" }} />
                <div className="skeleton" style={{ height: 20, width: "55%" }} />
                <div className="skeleton" style={{ height: 11, width: "40%" }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && farmerId && lands.length === 0 && (
          <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🗺️</div>
            <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No land registered yet</h3>
            <p style={{ color: "var(--text-3)", fontSize: 14, marginBottom: 20 }}>Register your first field parcel to start earning carbon credits.</p>
            <Link href="/land" className="btn btn-primary" style={{ textDecoration: "none" }}>Register First Plot →</Link>
          </div>
        )}

        {/* Land cards */}
        {!loading && lands.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {lands.map((land, idx) => {
              const s = STATUS_CFG[land.status] ?? STATUS_CFG.pending;
              return (
                <div key={land.id} className="card" style={{ padding: "20px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                        {LAND_EMOJI[land.land_type] ?? "🌱"} {land.land_type}{land.crop_type ? ` · ${land.crop_type}` : ""} · Plot #{idx + 1}
                      </div>
                      <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 700 }}>{land.area_ha} ha</div>
                    </div>
                    <div className={s.pill}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block" }} className={land.status === "pending" ? "anim-pulse-dot" : ""} />
                      {s.label}
                    </div>
                  </div>

                  <div className="grid-4" style={{ marginBottom: land.blockchain_tx ? 10 : 0 }}>
                    {[
                      { label:"CO₂ / yr",    value:`${land.predicted_co2} t`,  color:"var(--green)" },
                      { label:"Tokens",       value: land.blockchain_tx ? String(land.blockchain_tx.tokens) : "—", color:"var(--amber)" },
                      { label:"Est. Value",   value: land.blockchain_tx ? `₹${((land.blockchain_tx.tokens ?? 0)*1500).toLocaleString("en-IN")}` : "—", color:"var(--text-2)" },
                      { label:"Registered",   value: new Date(land.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"}), color:"var(--text-2)" },
                    ].map((m) => (
                      <div key={m.label} style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 13px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: m.color, marginTop: 3 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {land.blockchain_tx?.tx_hash && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", borderRadius: 10, padding: "9px 13px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>Polygon TX</span>
                      <span className="hash" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{land.blockchain_tx.tx_hash}</span>
                      <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>{new Date(land.blockchain_tx.timestamp).toLocaleDateString()}</span>
                    </div>
                  )}

                  {land.status === "rejected" && (
                    <div style={{ marginTop: 10, padding: "9px 13px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#f87171" }}>
                      This parcel was rejected. You can register a new one with corrections.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pendingCnt > 0 && !loading && (
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)", marginTop: 20 }}>
            Auto-refreshing every 8 seconds while parcels are pending review
          </p>
        )}
      </div>
    </div>
  );
}
