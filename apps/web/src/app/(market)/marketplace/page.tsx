"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/config";
import { useWallet } from "@/lib/wallet-context";
import WalletGate from "@/components/WalletGate";

type Land = {
  id: string; area_ha: number; predicted_co2: number;
  land_type: string; crop_type?: string; status: string;
  blockchain_tx?: { tx_hash: string; tokens: number; timestamp: string };
  farmers?: { name: string; state: string; district: string };
};

const EMOJI: Record<string, string> = { forest:"🌲", cropland:"🌾", grassland:"🌿", wetland:"💧", shrubland:"🌱" };
const PRICE = 1500;

function MarketplaceInner() {
  const { address, walletType } = useWallet();
  const [lands,      setLands]      = useState<Land[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<Land | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [bought,     setBought]     = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState("all");
  const [sortBy,     setSortBy]     = useState<"co2"|"value">("co2");
  const [toast,      setToast]      = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500); }

  useEffect(() => {
    supabase.from("land_parcels")
      .select("*, farmers(name, state, district)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setLands(data ?? []); setLoading(false); });
  }, []);

  async function confirmPurchase() {
    if (!selected || !address) return;
    setPurchasing(true);
    try {
      await fetch(`${API_URL}/marketplace/buy`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          land_id:      selected.id,
          co2_tonnes:   selected.predicted_co2,
          amount_inr:   selected.predicted_co2 * PRICE,
          buyer_wallet: address,
          company_name: companyName.trim() || "Anonymous Buyer",
        }),
      });
    } catch { /* demo — silent */ }
    setBought((s) => new Set([...s, selected.id]));
    setSelected(null);
    showToast(`✓ Purchased ${selected.predicted_co2} t CO₂ credits from ${selected.farmers?.name ?? "farmer"}`);
    setPurchasing(false);
  }

  const TYPES = ["all","cropland","forest","grassland","wetland","shrubland"];

  const filtered = lands
    .filter((l) => filterType === "all" || l.land_type === filterType)
    .sort((a, b) => sortBy === "co2" ? b.predicted_co2 - a.predicted_co2 : (b.predicted_co2 - a.predicted_co2) * PRICE);

  const totalCO2   = lands.reduce((s, l) => s + l.predicted_co2, 0);
  const totalValue = totalCO2 * PRICE;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {toast && (
        <div className="toast-wrap"><div className="toast toast-success">{toast}</div></div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p className="section-label">Carbon Exchange</p>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(22px,4vw,32px)", fontWeight: 700, marginBottom: 4 }}>
            Carbon Marketplace
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-3)" }}>
            Government-verified ERC-20 credits · Polygon · 1 token = 1 tonne CO₂
          </p>
        </div>

        {/* Wallet info bar */}
        <div style={{ display:"flex", gap:16, padding:"12px 18px", background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:14 }}>{walletType === "metamask" ? "🦊" : "🧪"}</span>
            <span style={{ fontSize:12, color:"var(--text-3)" }}>Connected:</span>
            <span className="hash" style={{ fontSize:12 }}>{address}</span>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:20, flexWrap:"wrap" }}>
            <div style={{ fontSize:13 }}><span style={{ color:"var(--text-3)" }}>Available: </span><span style={{ fontWeight:700, color:"var(--green)" }}>{totalCO2.toFixed(1)} t</span></div>
            <div style={{ fontSize:13 }}><span style={{ color:"var(--text-3)" }}>Listings: </span><span style={{ fontWeight:700 }}>{lands.length}</span></div>
            <div style={{ fontSize:13 }}><span style={{ color:"var(--text-3)" }}>Market cap: </span><span style={{ fontWeight:700, color:"var(--amber)" }}>₹{totalValue.toLocaleString("en-IN")}</span></div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ display:"flex", gap:6, flex:1, flexWrap:"wrap" }}>
            {TYPES.map((t) => (
              <button key={t} onClick={() => setFilterType(t)} style={{ padding:"5px 12px", borderRadius:999, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s", background: filterType===t?"var(--green-dim)":"var(--bg-card)", border:`1px solid ${filterType===t?"var(--green-dim)":"var(--border)"}`, color: filterType===t?"#fff":"var(--text-3)", textTransform:"capitalize" }}>
                {t === "all" ? "All Types" : `${EMOJI[t]??""} ${t}`}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="input" style={{ width:"auto", padding:"6px 12px", fontSize:12 }}>
            <option value="co2">Sort: CO₂ ↓</option>
            <option value="value">Sort: Value ↓</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid-auto">{[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton" style={{ height:240, borderRadius:16 }}/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🌿</div>
            <p style={{ color:"var(--text-3)", fontSize:14 }}>No verified credits available yet.</p>
          </div>
        ) : (
          <div className="grid-auto">
            {filtered.map((land) => {
              const total      = land.predicted_co2 * PRICE;
              const isPurchased = bought.has(land.id);
              return (
                <div key={land.id} className="card" style={{ padding:"22px 20px", display:"flex", flexDirection:"column", gap:14, opacity: isPurchased?0.55:1, transition:"opacity 0.3s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:26 }}>{EMOJI[land.land_type]??"🌱"}</div>
                      <div style={{ fontFamily:"Syne,sans-serif", fontSize:12, fontWeight:700, color:"var(--text-2)", textTransform:"capitalize", marginTop:4 }}>{land.land_type}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"Syne,sans-serif", fontSize:28, fontWeight:800, color:"var(--green)", lineHeight:1 }}>{land.predicted_co2}</div>
                      <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>tonnes CO₂</div>
                    </div>
                  </div>
                  <div className="grid-2" style={{ gap:8 }}>
                    {[
                      { l:"Price/tonne", v:`₹${PRICE.toLocaleString()}`,           c:"var(--text)"   },
                      { l:"Total value", v:`₹${total.toLocaleString("en-IN")}`,    c:"var(--amber)"  },
                      { l:"Area",        v:`${land.area_ha} ha`,                    c:"var(--text)"   },
                      { l:"Seller",      v: land.farmers?.name ?? "Verified Farmer",c:"var(--text-2)" },
                    ].map((m) => (
                      <div key={m.l} style={{ background:"var(--bg)", borderRadius:9, padding:"9px 11px" }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.05em" }}>{m.l}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:m.c, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:12, color:"var(--text-3)" }}>📍 {land.farmers?.district ?? "—"}, {land.farmers?.state ?? "India"}</div>
                  {land.blockchain_tx?.tx_hash && (
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase" }}>TX</span>
                      <span className="hash">{land.blockchain_tx.tx_hash.slice(0,16)}…</span>
                      <span className="pill pill-green" style={{ marginLeft:"auto", fontSize:10 }}>Verified</span>
                    </div>
                  )}
                  {isPurchased ? (
                    <div style={{ textAlign:"center", padding:"10px", background:"var(--green-glow)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:10, fontSize:13, fontWeight:600, color:"var(--green)" }}>✓ Purchased</div>
                  ) : (
                    <button onClick={() => setSelected(land)} className="btn btn-primary" style={{ width:"100%", padding:"11px" }}>Purchase Credits →</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Purchase modal */}
        {selected && (
          <div onClick={(e)=>{if(e.target===e.currentTarget)setSelected(null);}} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
            <div style={{ background:"var(--bg-card2)", border:"1px solid var(--border-act)", borderRadius:20, padding:28, maxWidth:400, width:"100%" }}>
              <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:700, marginBottom:4 }}>Confirm Purchase</h3>
              <p style={{ fontSize:13, color:"var(--text-3)", marginBottom:16 }}>Purchasing verified carbon credits. Stored against your wallet for ESG reporting.</p>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Company Name (for ESG report)</label>
                <input className="input" placeholder="e.g. Tata Motors Ltd" value={companyName} onChange={(e)=>setCompanyName(e.target.value)} />
              </div>
              <div style={{ background:"var(--bg)", borderRadius:12, padding:16, marginBottom:18 }}>
                {[
                  ["Credits",     `${selected.predicted_co2} tonnes CO₂`],
                  ["Price/tonne", `₹${PRICE.toLocaleString()}`],
                  ["Seller",      selected.farmers?.name ?? "Verified Farmer"],
                  ["Wallet",      address?.slice(0,10)+"…"+address?.slice(-4)],
                  ["Total",       `₹${(selected.predicted_co2*PRICE).toLocaleString("en-IN")}`],
                ].map(([l,v],i,arr)=>(
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom: i<arr.length-1?"1px solid var(--border)":"none" }}>
                    <span style={{ fontSize:13, color:"var(--text-3)" }}>{l}</span>
                    <span style={{ fontSize: i===arr.length-1?15:13, fontWeight: i===arr.length-1?700:500, color: i===arr.length-1?"var(--green)":"var(--text)" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setSelected(null)} className="btn btn-ghost" style={{ flex:1 }}>Cancel</button>
                <button onClick={confirmPurchase} disabled={purchasing} className="btn btn-primary" style={{ flex:2 }}>
                  {purchasing?<><svg className="anim-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Processing…</>:"Confirm & Buy →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <WalletGate>
      <MarketplaceInner />
    </WalletGate>
  );
}
