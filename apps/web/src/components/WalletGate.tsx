"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";

export default function WalletGate({ children }: { children: React.ReactNode }) {
  const { address, walletType, connecting, connectMetaMask, connectDemo } = useWallet();
  const [demoName,  setDemoName]  = useState("");
  const [tab,       setTab]       = useState<"metamask" | "demo">("metamask");
  const [mmError,   setMmError]   = useState("");
  const [hasMetaMask] = useState(() =>
    typeof window !== "undefined" && "ethereum" in window
  );

  if (address) return <>{children}</>;

  async function handleMetaMask() {
    setMmError("");
    try { await connectMetaMask(); }
    catch (e: any) { setMmError(e.message ?? "Connection failed"); }
  }

  function handleDemo(e: React.FormEvent) {
    e.preventDefault();
    if (!demoName.trim()) return;
    connectDemo(demoName.trim());
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, position: "relative", overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(245,158,11,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
      <div style={{ position: "fixed", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: "radial-gradient(ellipse,rgba(245,158,11,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#16a34a,#0f6e56)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>C</div>
          <div>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 17, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Eco<span style={{ color: "var(--green)" }}>Nova AI</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>Carbon Marketplace</div>
          </div>
        </div>

        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
          Connect Your Wallet
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 28, lineHeight: 1.6 }}>
          Connect a wallet to browse and purchase verified carbon credits from Indian farmers.
          Your wallet address is used to track your ESG portfolio.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {(["metamask", "demo"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s", border: "none",
              background: tab === t ? "var(--bg-card2)" : "transparent",
              color:      tab === t ? "var(--text)"    : "var(--text-3)",
              boxShadow:  tab === t ? "0 0 0 1px var(--border-h)" : "none",
            }}>
              {t === "metamask" ? "🦊 MetaMask" : "🧪 Demo Wallet"}
            </button>
          ))}
        </div>

        {/* MetaMask tab */}
        {tab === "metamask" && (
          <div className="card" style={{ padding: 24 }}>
            {hasMetaMask ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 10 }}>
                  <span style={{ fontSize: 20 }}>🦊</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>MetaMask detected</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Click below to connect your wallet</div>
                  </div>
                  <span className="pill pill-green" style={{ marginLeft: "auto", fontSize: 10 }}>Ready</span>
                </div>
                {mmError && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 14 }}>
                    {mmError}
                  </div>
                )}
                <button onClick={handleMetaMask} disabled={connecting} className="btn btn-primary" style={{ width: "100%", minHeight: 48 }}>
                  {connecting ? <><svg className="anim-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Connecting…</> : "Connect MetaMask →"}
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", padding: "20px 0", marginBottom: 16 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🦊</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>MetaMask not installed</div>
                  <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>
                    MetaMask is a browser extension that acts as your crypto wallet. Install it to use real blockchain transactions.
                  </p>
                </div>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: "block", textAlign: "center", textDecoration: "none", width: "100%", minHeight: 48, lineHeight: "48px", padding: "0 20px" }}
                >
                  Install MetaMask →
                </a>
                <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-3)", marginTop: 12 }}>
                  After installing, refresh this page and connect.
                </p>
              </>
            )}
          </div>
        )}

        {/* Demo wallet tab */}
        {tab === "demo" && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
              🧪 <strong>Demo mode:</strong> Creates a simulated wallet address from your company name.
              Perfect for hackathon demos. Wallet clears when you close the browser tab.
            </div>
            <form onSubmit={handleDemo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Company / Your Name
                </label>
                <input
                  className="input"
                  placeholder="e.g. Tata Motors Ltd"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", minHeight: 48 }}>
                Create Demo Wallet →
              </button>
            </form>
          </div>
        )}

        {/* What you get */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { icon: "⛓", text: "On-chain credit tracking" },
            { icon: "📊", text: "ESG report generation" },
            { icon: "🔒", text: "Secure purchase history" },
            { icon: "🇮🇳", text: "BRSR-ready exports" },
          ].map((f) => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <span style={{ fontSize: 14 }}>{f.icon}</span>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
