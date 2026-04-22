"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/config";

// ── Types ────────────────────────────────────────────────────────────────────

type Transaction = {
  id: string;
  land_id: string;
  buyer_wallet: string;
  co2_tonnes: number;
  amount_inr: number;
  tx_hash: string;
  created_at: string;
  land_parcels?: {
    land_type: string;
    area_ha: number;
    farmers?: { name: string; state: string; district: string };
  };
};

type ESGStats = {
  totalCO2: number;
  totalSpend: number;
  creditCount: number;
  statesImpacted: string[];
  landTypes: Record<string, number>;
  farmersSupported: number;
  sdgPoints: SDGPoint[];
  equivalents: { label: string; value: string; icon: string }[];
};

type SDGPoint = { id: number; name: string; score: number; color: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const EMOJI: Record<string, string> = {
  forest: "🌲", cropland: "🌾", grassland: "🌿", wetland: "💧", shrubland: "🌱",
};

const SDG_LIST: SDGPoint[] = [
  { id: 1,  name: "No Poverty",              score: 0, color: "#E5243B" },
  { id: 2,  name: "Zero Hunger",             score: 0, color: "#DDA63A" },
  { id: 13, name: "Climate Action",          score: 0, color: "#3F7E44" },
  { id: 15, name: "Life on Land",            score: 0, color: "#56C02B" },
  { id: 8,  name: "Decent Work",             score: 0, color: "#A21942" },
  { id: 17, name: "Partnerships",            score: 0, color: "#19486A" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeSDG(stats: Omit<ESGStats, "sdgPoints" | "equivalents">): SDGPoint[] {
  return SDG_LIST.map((sdg) => {
    let score = 0;
    if (sdg.id === 13) score = Math.min(100, (stats.totalCO2 / 50) * 100);
    else if (sdg.id === 15) score = Math.min(100, (stats.creditCount / 5) * 100);
    else if (sdg.id === 1 || sdg.id === 2) score = Math.min(100, (stats.farmersSupported / 3) * 100);
    else if (sdg.id === 8) score = Math.min(100, (stats.farmersSupported / 3) * 80);
    else if (sdg.id === 17) score = Math.min(100, (stats.statesImpacted.length / 5) * 100);
    return { ...sdg, score: Math.round(score) };
  });
}

function computeEquivalents(co2: number) {
  return [
    { icon: "🌳", label: "Trees planted equivalent",   value: `${Math.round(co2 * 45).toLocaleString("en-IN")}` },
    { icon: "🚗", label: "Cars off road for a year",   value: `${(co2 / 4.6).toFixed(1)}` },
    { icon: "✈️", label: "Flights avoided (Mumbai–Delhi)", value: `${Math.round(co2 / 0.17).toLocaleString("en-IN")}` },
    { icon: "💡", label: "Homes powered for a year",  value: `${(co2 / 1.2).toFixed(1)}` },
  ];
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ESGPage() {
  const [wallet,       setWallet]       = useState("");
  const [company,      setCompany]      = useState("");
  const [searching,    setSearching]    = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats,        setStats]        = useState<ESGStats | null>(null);
  const [searched,     setSearched]     = useState(false);
  const [error,        setError]        = useState("");
  const [printing,     setPrinting]     = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.trim()) return;
    setSearching(true); setError(""); setStats(null); setSearched(false);

    try {
      // Fetch transactions for this wallet from Supabase
      const { data, error: dbErr } = await supabase
        .from("transactions")
        .select(`
          *,
          land_parcels (
            land_type, area_ha,
            farmers ( name, state, district )
          )
        `)
        .eq("buyer_wallet", wallet.trim())
        .order("created_at", { ascending: false });

      if (dbErr) throw new Error(dbErr.message);

      const txns: Transaction[] = data ?? [];
      setTransactions(txns);

      if (txns.length === 0) {
        setError("No purchases found for this wallet address.");
        setSearching(false); setSearched(true); return;
      }

      // Compute stats
      const totalCO2    = txns.reduce((s, t) => s + t.co2_tonnes, 0);
      const totalSpend  = txns.reduce((s, t) => s + t.amount_inr, 0);
      const states      = [...new Set(txns.map((t) => t.land_parcels?.farmers?.state ?? "Unknown"))];
      const farmers     = new Set(txns.map((t) => t.land_parcels?.farmers?.name)).size;
      const landTypes: Record<string, number> = {};
      txns.forEach((t) => {
        const lt = t.land_parcels?.land_type ?? "unknown";
        landTypes[lt] = (landTypes[lt] ?? 0) + t.co2_tonnes;
      });

      const base = { totalCO2, totalSpend, creditCount: txns.length, statesImpacted: states, landTypes, farmersSupported: farmers };
      const sdgs = computeSDG(base);
      const equivs = computeEquivalents(totalCO2);

      setStats({ ...base, sdgPoints: sdgs, equivalents: equivs });
      setSearched(true);
    } catch (err: any) {
      setError("Failed to load data: " + (err.message ?? "Unknown error"));
    }
    setSearching(false);
  }

  function handlePrint() {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  }

  const reportDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* Print-only styles */}
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: #fff !important; color: #111 !important; }
          .print-card { border: 1px solid #ddd !important; background: #fff !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <p className="section-label">ESG Reporting Suite</p>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
            Corporate Carbon Report
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", maxWidth: 560 }}>
            Generate an auditable ESG report for your company's carbon offset purchases.
            Blockchain-verified, UN SDG aligned, ready for sustainability disclosures.
          </p>
        </div>

        {/* ── Search form ── */}
        <div className="card no-print" style={{ padding: 24, marginBottom: 28 }}>
          <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="grid-2">
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Company Name
                </label>
                <input
                  className="input"
                  placeholder="e.g. Tata Motors Ltd"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Buyer Wallet Address *
                </label>
                <input
                  className="input"
                  placeholder="0x..."
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="submit" disabled={searching} className="btn btn-primary" style={{ width: 200 }}>
                {searching
                  ? <><svg className="anim-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Loading…</>
                  : "Generate ESG Report →"}
              </button>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                * The wallet address used when purchasing credits on the marketplace
              </span>
            </div>
          </form>

          {error && (
            <div style={{ marginTop: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Report ── */}
        {searched && stats && (
          <div>

            {/* ── Certificate header ── */}
            <div className="card print-card" style={{ padding: "28px 28px 20px", marginBottom: 16, background: "var(--bg-card2)", border: "1px solid var(--border-act)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, background: "var(--green-dim)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0 }}>E</div>
                    <div>
                      <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>EcoNova AI · Carbon Credit Registry</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>Powered by Polygon blockchain · AI-verified by Google Earth Engine</div>
                    </div>
                  </div>
                  <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
                    ESG Carbon Offset Certificate
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                    {company || "Company"} · Report Date: {reportDate}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="pill pill-green" style={{ fontSize: 12 }}>✓ Blockchain Verified</span>
                  <span className="pill pill-blue" style={{ fontSize: 12 }}>UN SDG Aligned</span>
                  <button onClick={handlePrint} disabled={printing} className="btn btn-ghost btn-sm no-print" style={{ marginLeft: 4 }}>
                    🖨 Download / Print
                  </button>
                </div>
              </div>

              {/* Top KPIs */}
              <div className="grid-4">
                {[
                  { label: "Total CO₂ Offset",   value: `${stats.totalCO2.toFixed(2)} t`,                          color: "var(--green)",  sub: "verified tonnes" },
                  { label: "Total Investment",    value: `₹${stats.totalSpend.toLocaleString("en-IN")}`,            color: "var(--amber)",  sub: "INR spent" },
                  { label: "Credits Purchased",  value: String(stats.creditCount),                                  color: "var(--text)",   sub: "ERC-20 tokens" },
                  { label: "Farmers Supported",  value: `${stats.farmersSupported}`,                                color: "#a5b4fc",       sub: `across ${stats.statesImpacted.length} state${stats.statesImpacted.length !== 1 ? "s" : ""}` },
                ].map((s) => (
                  <div key={s.label} style={{ background: "var(--bg)", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Impact equivalents ── */}
            <div className="card print-card" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Real-World Impact Equivalents</h3>
              <div className="grid-4">
                {stats.equivalents.map((eq) => (
                  <div key={eq.label} style={{ background: "var(--bg)", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{eq.icon}</div>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>{eq.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>{eq.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SDG alignment ── */}
            <div className="card print-card" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>UN Sustainable Development Goals Alignment</h3>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 18 }}>Contribution score based on verified impact metrics from your purchases</p>
              <div style={{ display: "grid", gap: 14 }}>
                {stats.sdgPoints.map((sdg) => (
                  <div key={sdg.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                        SDG {sdg.id} — {sdg.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sdg.score > 60 ? "var(--green)" : sdg.score > 30 ? "var(--amber)" : "var(--text-3)" }}>
                        {sdg.score}%
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${sdg.score}%`, height: "100%", background: sdg.color, borderRadius: 4, transition: "width 1s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Land type breakdown ── */}
            <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="card print-card" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Portfolio by Land Type</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {Object.entries(stats.landTypes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, co2]) => {
                      const pct = (co2 / stats.totalCO2) * 100;
                      return (
                        <div key={type}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: "var(--text-2)" }}>{EMOJI[type] ?? "🌱"} {type}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{co2.toFixed(1)} t</span>
                          </div>
                          <div style={{ height: 6, background: "var(--bg)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "var(--green-dim)", borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="card print-card" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Geographic Reach</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {stats.statesImpacted.map((state) => (
                    <div key={state} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg)", borderRadius: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0, display: "inline-block" }} />
                      <span style={{ fontSize: 13, color: "var(--text-2)" }}>🇮🇳 {state}</span>
                    </div>
                  ))}
                  <div style={{ padding: "10px 12px", background: "var(--green-glow)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                      {stats.statesImpacted.length} Indian state{stats.statesImpacted.length !== 1 ? "s" : ""} covered
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Transaction log ── */}
            <div className="card print-card" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                Verified Transaction Log
                <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 400, marginLeft: 10 }}>
                  {transactions.length} purchase{transactions.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Farmer</th>
                      <th>Location</th>
                      <th>Land Type</th>
                      <th style={{ textAlign: "right" }}>CO₂</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                      <th>Polygon TX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ fontSize: 12 }}>{new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</td>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{tx.land_parcels?.farmers?.name ?? "—"}</td>
                        <td style={{ fontSize: 12, color: "var(--text-3)" }}>{tx.land_parcels?.farmers?.district}, {tx.land_parcels?.farmers?.state}</td>
                        <td>{EMOJI[tx.land_parcels?.land_type ?? ""] ?? "🌱"} {tx.land_parcels?.land_type ?? "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--green)" }}>{tx.co2_tonnes} t</td>
                        <td style={{ textAlign: "right", color: "var(--amber)" }}>₹{tx.amount_inr.toLocaleString("en-IN")}</td>
                        <td>
                          <span className="hash" title={tx.tx_hash}>{tx.tx_hash.slice(0, 14)}…</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Disclaimer ── */}
            <div style={{ padding: "14px 18px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--text-2)" }}>Disclosure:</strong> This report is generated from blockchain-verified transactions recorded on the Polygon network.
                Carbon sequestration values are AI-estimated using satellite NDVI data from Google Earth Engine and validated by government-registered field inspectors.
                This report may be used for internal ESG disclosures, BRSR reporting, and sustainability audits.
                EcoNova AI is not liable for third-party verification requirements beyond what is stated herein.
                Report ID: {wallet.slice(2, 10).toUpperCase()}-{Date.now().toString(36).toUpperCase()}
              </p>
            </div>

          </div>
        )}

        {/* ── Empty state ── */}
        {!searched && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginTop: 8 }}>
            {[
              { icon: "📊", title: "BRSR Ready",          desc: "Business Responsibility & Sustainability Report format" },
              { icon: "⛓",  title: "Blockchain Verified", desc: "Every credit linked to a Polygon transaction hash" },
              { icon: "🇺🇳", title: "UN SDG Aligned",     desc: "Maps your purchases to 6 Sustainable Development Goals" },
              { icon: "🌍", title: "Impact Equivalents",  desc: "Translates CO₂ tonnes into understandable real-world impact" },
            ].map((f) => (
              <div key={f.title} className="card" style={{ padding: "18px 16px" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
