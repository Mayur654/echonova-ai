"use client";

import { useEffect, useState } from "react";
import { getBackendStatus } from "@/lib/api";
import Link from "next/link";

const ROLES = [
  {
    emoji: "🌾", title: "Farmers",
    desc: "Register your field on satellite map. AI estimates CO₂ sequestration. Earn ERC-20 carbon tokens after govt approval.",
    href: "/register", cta: "Start as Farmer",
    accent: "var(--green)", glow: "rgba(34,197,94,0.08)",
  },
  {
    emoji: "🏛️", title: "Government",
    desc: "Review land submissions, walk GPS boundaries, approve parcels, mint tokens on Polygon. Full analytics dashboard.",
    href: "/admin", cta: "Officer Portal",
    accent: "#818cf8", glow: "rgba(99,102,241,0.08)",
  },
  {
    emoji: "🏭", title: "Companies",
    desc: "Buy verified carbon credits from Indian farmers. Generate auditable ESG reports, BRSR-ready, UN SDG aligned.",
    href: "/marketplace", cta: "Browse Credits",
    accent: "var(--amber)", glow: "rgba(245,158,11,0.08)",
  },
];

const STATS = [
  { value: "1,200+", label: "Farmers enrolled",  color: "var(--green)" },
  { value: "48,000 t", label: "CO₂ sequestered", color: "var(--text)"  },
  { value: "₹7.2 Cr",  label: "Credits traded",  color: "var(--amber)" },
  { value: "14",        label: "States covered",  color: "#a5b4fc"      },
];

const STEPS = [
  { n:"01", title:"Draw Field",      desc:"Mark your boundary on satellite map using polygon tool or GPS walk mode." },
  { n:"02", title:"AI + Satellite",  desc:"Google Earth Engine fetches real NDVI data. Our ML model predicts CO₂ with vegetation validation." },
  { n:"03", title:"Govt Review",     desc:"Officer reviews on dashboard, walks GPS boundary overlay, optionally sends field inspector." },
  { n:"04", title:"Token Minting",   desc:"Approval triggers CarbonCredit ERC-20 mint on Polygon. 1 token = 1 tonne CO₂." },
  { n:"05", title:"Marketplace",     desc:"Companies buy credits via smart contract. Payment in MATIC, ESG report auto-generated." },
  { n:"06", title:"ESG Reporting",   desc:"BRSR-ready UN SDG-aligned reports with full blockchain audit trail." },
];

const TECH = [
  { name: "Next.js 15",           icon: "▲" },
  { name: "FastAPI",              icon: "⚡" },
  { name: "Supabase",            icon: "🟢" },
  { name: "Polygon ERC-20",      icon: "⬡" },
  { name: "Google Earth Engine", icon: "🛰" },
  { name: "XGBoost ML",          icon: "🧠" },
];

export default function Home() {
  const [status,  setStatus]  = useState<"checking"|"online"|"offline">("checking");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    getBackendStatus().then(() => setStatus("online")).catch(() => setStatus("offline"));
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", overflowX: "hidden" }}>

      {/* Global CSS additions for this page */}
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .hero-glow { animation: float 6s ease-in-out infinite; }
        @media(max-width:768px) {
          .role-grid  { grid-template-columns: 1fr !important; }
          .step-grid  { grid-template-columns: 1fr 1fr !important; }
          .stat-strip { flex-wrap: wrap !important; }
          .hero-h1    { font-size: clamp(38px,11vw,80px) !important; }
          .cta-row    { flex-direction: column !important; align-items: stretch !important; }
          .nav-links  { display: none !important; }
        }
        @media(max-width:480px) {
          .step-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(4,9,5,0.94)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#16a34a,#0d5c3a)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>C</div>
            <div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                Eco<span style={{ color: "var(--green)" }}>Nova AI</span>
              </div>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>Carbon Credit Platform</div>
            </div>
          </div>

          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {[{ href:"/register",label:"Farmers"},{href:"/marketplace",label:"Marketplace"},{href:"/admin",label:"Government"},{href:"/esg",label:"ESG"}].map((l) => (
              <Link key={l.href} href={l.href} style={{ padding:"5px 12px", borderRadius:8, fontSize:13, fontWeight:500, textDecoration:"none", color:"var(--text-2)", transition:"all 0.15s" }}>
                {l.label}
              </Link>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Link href="/login"    className="btn btn-ghost btn-sm" style={{ textDecoration:"none" }}>Sign In</Link>
            <Link href="/register" className="btn btn-primary btn-sm" style={{ textDecoration:"none" }}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ width: "100%", minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: "80px 24px 60px", textAlign: "center", overflow: "hidden" }}>
        {/* Background effects */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(22,163,74,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(22,163,74,0.04) 1px,transparent 1px)", backgroundSize: "64px 64px", pointerEvents: "none" }} />
        <div className="hero-glow" style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: "70vw", height: "40vw", background: "radial-gradient(ellipse,rgba(34,197,94,0.07) 0%,transparent 65%)", pointerEvents: "none" }} />
        {/* Scan line */}
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(34,197,94,0.15),transparent)", animation: "scan 8s linear infinite", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 720,margin: "0 auto", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease, transform 0.7s ease" }}>

          {/* Status badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 999, fontSize: 12, fontWeight: 600, color: status === "online" ? "var(--green)" : "var(--text-3)", marginBottom: 36 }}>
            <span className={status === "online" ? "anim-pulse-dot" : ""} style={{ width: 6, height: 6, borderRadius: "50%", background: status === "online" ? "var(--green)" : "var(--text-3)", display: "inline-block" }} />
            {status === "checking" ? "Connecting…" : status === "online" ? "Live · Polygon Mumbai · Earth Engine" : "Backend offline"}
          </div>

          {/* Brand headline */}
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(12px,2vw,16px)", fontWeight: 700, color: "var(--green)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
            EcoNova AI
          </div>
          <h1 className="hero-h1" style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(44px,8vw,88px)", fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.04em", color: "var(--text)", marginBottom: 28 }}>
            India's smartest<br />
            <span style={{ color: "var(--green)", display: "inline-block" }}>carbon credit</span>
            <br />platform.
          </h1>

          <p style={{ fontSize: "clamp(15px,2vw,19px)", color: "var(--text-2)", lineHeight: 1.65, maxWidth: 560, margin: "0 auto 40px" }}>
            AI-verified carbon sequestration · Satellite NDVI data · Government-approved · Polygon blockchain · ESG reporting for companies.
          </p>

          <div className="cta-row" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary" style={{ textDecoration:"none", fontSize:16, padding:"14px 32px", borderRadius:12 }}>Register Your Farm →</Link>
            <Link href="/marketplace" className="btn btn-ghost" style={{ textDecoration:"none", fontSize:16, padding:"14px 32px", borderRadius:12 }}>Browse Carbon Credits</Link>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ width: "100%", background: "var(--bg-card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <div className="stat-strip" style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 0 }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: "24px 32px", textAlign: "center", flex: 1, borderRight: i < STATS.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: "-0.03em" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THREE PORTALS ── */}
      <section style={{ width: "100%", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Who it's for
          </p>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(26px,4vw,42px)", fontWeight: 700, textAlign: "center", marginBottom: 48, letterSpacing: "-0.02em" }}>
            Three portals, one ecosystem
          </h2>

          <div className="role-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {ROLES.map((r) => (
              <div key={r.title} style={{ background: r.glow, border: `1px solid ${r.accent}30`, borderRadius: 20, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 16, transition: "transform 0.2s, border-color 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.borderColor = r.accent + "60"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.borderColor = r.accent + "30"; }}
              >
                <div style={{ fontSize: 44, lineHeight: 1 }}>{r.emoji}</div>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 700, color: r.accent }}>{r.title}</div>
                <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.7, flex: 1 }}>{r.desc}</p>
                <Link href={r.href} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 20px", background: r.accent + "20", border: `1px solid ${r.accent}40`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: r.accent, textDecoration: "none", transition: "background 0.15s" }}>
                  {r.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ width: "100%", background: "var(--bg-card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, textAlign: "center" }}>Process</p>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(26px,4vw,42px)", fontWeight: 700, textAlign: "center", marginBottom: 48, letterSpacing: "-0.02em" }}>
            From field to blockchain in 6 steps
          </h2>
          <div className="step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ padding: "24px 26px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 16, display: "flex", gap: 16 }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 800, color: "var(--green)", background: "var(--green-glow)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "4px 8px", height: "fit-content", flexShrink: 0, letterSpacing: "0.05em" }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 6, fontFamily: "Syne,sans-serif" }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section style={{ width: "100%", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 28 }}>Built with</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {TECH.map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 999, fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>{t.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER BAND ── */}
      <section style={{ width: "100%", background: "linear-gradient(135deg,rgba(22,163,74,0.08) 0%,rgba(15,110,86,0.05) 100%)", borderTop: "1px solid var(--border-act)", padding: "72px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, marginBottom: 16, letterSpacing: "-0.02em" }}>
            Ready to monetise your land?
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-3)", marginBottom: 32, lineHeight: 1.6 }}>
            EcoNova AI connects Indian farmers directly to the global carbon market. No intermediaries, no paperwork.
          </p>
          <div className="cta-row" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/register" className="btn btn-primary" style={{ textDecoration:"none", fontSize:15, padding:"13px 28px", borderRadius:12 }}>
              Register as Farmer
            </Link>
            <Link href="/marketplace" className="btn btn-ghost" style={{ textDecoration:"none", fontSize:15, padding:"13px 28px", borderRadius:12 }}>
              Buy Carbon Credits
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 26, height: 26, background: "var(--green-dim)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 12, color: "#fff" }}>C</div>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text)" }}>EcoNova <span style={{ color: "var(--green)" }}>AI</span></span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-4)", textAlign: "center" }}>
            AI-powered carbon credits · Polygon blockchain · Google Earth Engine · Made for Indian farmers
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            {[{href:"/register",l:"Farmers"},{href:"/marketplace",l:"Marketplace"},{href:"/admin/login",l:"Government"},{href:"/esg",l:"ESG"}].map((l)=>(
              <Link key={l.href} href={l.href} style={{ fontSize:12, color:"var(--text-3)", textDecoration:"none" }}>{l.l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
