"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBackendStatus } from "@/lib/api";

export default function FarmerHome() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    getBackendStatus().then(() => setStatus("online")).catch(() => setStatus("offline"));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", overflowX: "hidden" }}>
      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(22,163,74,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(22,163,74,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
      <div style={{ position: "fixed", top: "25%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 350, background: "radial-gradient(ellipse,rgba(34,197,94,0.05) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "72px 24px 60px", textAlign: "center" }}>
        {/* Status */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 999, fontSize: 12, fontWeight: 600, color: status === "online" ? "var(--green)" : "var(--text-3)", marginBottom: 28 }}>
          <span className={status === "online" ? "anim-pulse-dot" : ""} style={{ width: 6, height: 6, borderRadius: "50%", background: status === "online" ? "var(--green)" : "var(--text-3)", display: "inline-block" }} />
          {status === "online" ? "Backend online · Polygon Mumbai" : status === "checking" ? "Connecting…" : "Backend offline"}
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(38px,7vw,72px)", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: 18 }}>
          Your farm.<br /><span style={{ color: "var(--green)" }}>Your carbon credits.</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.65, maxWidth: 520, margin: "0 auto 32px" }}>
          Register your field, let AI calculate how much CO₂ it sequesters, get verified by the government, earn Polygon-based carbon tokens.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
          <Link href="/register" className="btn btn-primary btn-lg" style={{ textDecoration: "none" }}>Get Started →</Link>
          <Link href="/dashboard" className="btn btn-ghost btn-lg" style={{ textDecoration: "none" }}>View Dashboard</Link>
        </div>

        {/* How it works */}
        <div style={{ textAlign: "left" }}>
          <p className="section-label" style={{ textAlign: "center", marginBottom: 12 }}>How it works for you</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {[
              { n:"01", title:"Draw your field",    desc:"Use our satellite map to outline your land boundary. Works on phone or desktop." },
              { n:"02", title:"AI carbon estimate",  desc:"We fetch satellite NDVI data and run an XGBoost model to predict your annual CO₂ sequestration." },
              { n:"03", title:"Government approves", desc:"A verified officer reviews your submission. A field inspector may visit your farm." },
              { n:"04", title:"Earn tokens",         desc:"Approved parcels get ERC-20 carbon tokens minted on Polygon — 1 token = 1 tonne CO₂." },
              { n:"05", title:"Sell on marketplace", desc:"Companies buy your credits. MATIC (Polygon's currency) is sent directly to your wallet." },
              { n:"06", title:"Track earnings",      desc:"Your dashboard shows all parcels, token balances, blockchain transaction hashes." },
            ].map((s) => (
              <div key={s.n} className="card" style={{ padding: "18px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 700, color: "var(--green)", background: "var(--green-glow)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 7, padding: "3px 7px", flexShrink: 0 }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 48 }}>EcoNova AI Farmer Portal · AI by XGBoost · Satellite data by Google Earth Engine · Blockchain by Polygon</p>
      </div>
    </div>
  );
}
