"use client";

import { useEffect, useState } from "react";
import { getAllLands } from "@/lib/api";

type Land = {
  id: string; area_ha: number; predicted_co2: number;
  land_type: string; status: string;
  farmers?: { name: string; state: string; district: string };
};

const EMOJI: Record<string, string> = { forest:"🌲", cropland:"🌾", grassland:"🌿", wetland:"💧", shrubland:"🌱" };

export default function AnalyticsPage() {
  const [lands,   setLands]   = useState<Land[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllLands().then((d) => { setLands(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const approved  = lands.filter((l) => l.status === "approved");
  const co2Total  = approved.reduce((s, l) => s + l.predicted_co2, 0);
  const areaTotal = approved.reduce((s, l) => s + l.area_ha, 0);

  // State breakdown
  const stateMap: Record<string, { co2: number; area: number; count: number }> = {};
  approved.forEach((l) => {
    const st = l.farmers?.state ?? "Unknown";
    if (!stateMap[st]) stateMap[st] = { co2: 0, area: 0, count: 0 };
    stateMap[st].co2   += l.predicted_co2;
    stateMap[st].area  += l.area_ha;
    stateMap[st].count += 1;
  });
  const stateList = Object.entries(stateMap).sort((a, b) => b[1].co2 - a[1].co2);
  const maxCO2    = stateList[0]?.[1].co2 ?? 1;

  // Land type breakdown
  const typeMap: Record<string, { count: number; co2: number }> = {};
  lands.forEach((l) => {
    if (!typeMap[l.land_type]) typeMap[l.land_type] = { count: 0, co2: 0 };
    typeMap[l.land_type].count += 1;
    if (l.status === "approved") typeMap[l.land_type].co2 += l.predicted_co2;
  });

  // Status breakdown
  const statusCounts = {
    pending:        lands.filter((l) => l.status === "pending").length,
    field_confirmed: lands.filter((l) => l.status === "field_confirmed").length,
    approved:       approved.length,
    rejected:       lands.filter((l) => l.status === "rejected").length,
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 20px" }}>

        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Government Portal</p>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, color: "var(--gov-text)", marginBottom: 4 }}>AI Analytics Dashboard</h1>
          <p style={{ fontSize: 14, color: "var(--gov-text-3)" }}>Aggregated insights from all registered and approved land parcels</p>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 12 }}>
            {[1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
          </div>
        ) : (
          <>
            {/* Top KPIs */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
              {[
                { label:"Total CO₂ Verified",   value:`${co2Total.toFixed(1)} t`,              color:"var(--green)"   },
                { label:"Total Area Approved",   value:`${areaTotal.toFixed(1)} ha`,            color:"var(--gov-text)"},
                { label:"Carbon Market Value",   value:`₹${(co2Total*1500).toLocaleString("en-IN")}`, color:"var(--amber)"},
                { label:"Avg Yield / Hectare",   value: areaTotal > 0 ? `${(co2Total/areaTotal).toFixed(2)} t/ha` : "—", color:"#a5b4fc" },
              ].map((s) => (
                <div key={s.label} className="stat-card-gov">
                  <div className="stat-label-gov">{s.label}</div>
                  <div className="stat-value-gov" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div className="card-gov" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, color: "var(--gov-text)", marginBottom: 20 }}>Verification Pipeline</h3>
              <div className="grid-4">
                {[
                  { label:"Pending",        value: statusCounts.pending,         color:"var(--amber)"  },
                  { label:"Field Confirmed",value: statusCounts.field_confirmed, color:"#a5b4fc"       },
                  { label:"Approved",       value: statusCounts.approved,        color:"var(--green)"  },
                  { label:"Rejected",       value: statusCounts.rejected,        color:"var(--red)"    },
                ].map((s) => (
                  <div key={s.label} style={{ background: "var(--gov-bg)", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "var(--gov-text-3)", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Pipeline progress bar */}
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 8, background: "var(--gov-bg)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                  {lands.length > 0 && [
                    { count: statusCounts.pending,         color: "var(--amber)"  },
                    { count: statusCounts.field_confirmed, color: "#6366f1"       },
                    { count: statusCounts.approved,        color: "var(--green)"  },
                    { count: statusCounts.rejected,        color: "var(--red)"    },
                  ].map((s, i) => (
                    <div key={i} style={{ width: `${(s.count / lands.length) * 100}%`, height: "100%", background: s.color, transition: "width 0.8s ease" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--gov-text-3)" }}>
                  <span>{lands.length} total submissions</span>
                  <span>Approval rate: {lands.length ? Math.round((statusCounts.approved / lands.length) * 100) : 0}%</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

              {/* State-wise breakdown */}
              <div className="card-gov" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, color: "var(--gov-text)", marginBottom: 20 }}>State-wise CO₂ Performance</h3>
                {stateList.length === 0 ? (
                  <p style={{ color: "var(--gov-text-3)", fontSize: 13 }}>No approved parcels yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {stateList.map(([state, data]) => (
                      <div key={state}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 13, color: "var(--gov-text-2)" }}>{state}</span>
                          <span style={{ fontSize: 12, color: "var(--gov-text-3)" }}>{data.count} parcel{data.count !== 1 ? "s" : ""} · {data.area.toFixed(1)} ha</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, height: 7, background: "var(--gov-bg)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${(data.co2 / maxCO2) * 100}%`, height: "100%", background: "linear-gradient(90deg,#4f46e5,#818cf8)", borderRadius: 4, transition: "width 0.8s ease" }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", width: 65, textAlign: "right", flexShrink: 0 }}>{data.co2.toFixed(1)} t</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Land type breakdown */}
              <div className="card-gov" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, color: "var(--gov-text)", marginBottom: 20 }}>Land Type Analysis</h3>
                {Object.keys(typeMap).length === 0 ? (
                  <p style={{ color: "var(--gov-text-3)", fontSize: 13 }}>No data yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {Object.entries(typeMap).sort((a, b) => b[1].co2 - a[1].co2).map(([type, data]) => (
                      <div key={type} style={{ background: "var(--gov-bg)", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, color: "var(--gov-text)", fontWeight: 500 }}>{EMOJI[type]??""} <span style={{ textTransform: "capitalize" }}>{type}</span></div>
                          <div style={{ fontSize: 11, color: "var(--gov-text-3)", marginTop: 2 }}>{data.count} parcel{data.count !== 1 ? "s" : ""}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{data.co2.toFixed(1)} t</div>
                          <div style={{ fontSize: 11, color: "var(--gov-text-3)" }}>CO₂/yr</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* AI insight panel */}
            <div className="card-gov" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, color: "var(--gov-text)", marginBottom: 6 }}>AI Insights</h3>
              <p style={{ fontSize: 13, color: "var(--gov-text-3)", marginBottom: 16 }}>Model-generated observations based on current parcel data</p>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  stateList[0] && { icon:"🏆", text:`Top performing state: ${stateList[0][0]} with ${stateList[0][1].co2.toFixed(1)} t CO₂ verified` },
                  areaTotal > 0 && { icon:"📊", text:`Average yield is ${(co2Total/areaTotal).toFixed(2)} t CO₂/ha — ${(co2Total/areaTotal) > 12 ? "above" : "below"} national cropland benchmark of 12 t/ha` },
                  statusCounts.pending > 0 && { icon:"⚡", text:`${statusCounts.pending} parcel${statusCounts.pending !== 1 ? "s" : ""} awaiting review — consider sending field inspectors to speed up approval` },
                  statusCounts.field_confirmed > 0 && { icon:"📍", text:`${statusCounts.field_confirmed} parcel${statusCounts.field_confirmed !== 1 ? "s" : ""} have been field-confirmed and are ready for final approval` },
                  Object.entries(typeMap).sort((a,b)=>b[1].co2-a[1].co2)[0] && { icon:"🌱", text:`${Object.entries(typeMap).sort((a,b)=>b[1].co2-a[1].co2)[0]?.[0]} land type contributes most CO₂ — consider prioritising these submissions` },
                ].filter(Boolean).map((insight: any, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: "var(--gov-bg)", borderRadius: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{insight.icon}</span>
                    <span style={{ fontSize: 13, color: "var(--gov-text-2)", lineHeight: 1.5 }}>{insight.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
