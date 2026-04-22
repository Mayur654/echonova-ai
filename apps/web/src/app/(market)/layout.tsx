"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletProvider, useWallet } from "@/lib/wallet-context";

function WalletBadge() {
  const { address, walletType, disconnect } = useWallet();
  if (!address) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "var(--amber)" }}>
        <span>{walletType === "metamask" ? "🦊" : "🧪"}</span>
        <span className="hash" style={{ color: "var(--amber)" }}>{address.slice(0, 6)}…{address.slice(-4)}</span>
      </div>
      <button onClick={disconnect} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
        Disconnect
      </button>
    </div>
  );
}

function MarketNavbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/marketplace", label: "Browse Credits" },
    { href: "/esg",         label: "ESG Report"     },
  ];

  const isActive = (href: string) =>
    href === "/marketplace" ? pathname === "/marketplace" : pathname.startsWith(href);

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(4,9,5,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

        {/* Brand */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#16a34a,#0f6e56)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>C</div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 15, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Eco<span style={{ color: "var(--green)" }}>Nova AI</span>
            <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 8, fontFamily: "'DM Sans',sans-serif", fontWeight: 400, letterSpacing: 0 }}>Marketplace</span>
          </span>
        </Link>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              textDecoration: "none", transition: "all 0.15s",
              color:      isActive(link.href) ? "var(--amber)"                   : "var(--text-2)",
              background: isActive(link.href) ? "rgba(245,158,11,0.08)"          : "transparent",
              border:     isActive(link.href) ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
            }}>{link.label}</Link>
          ))}
          <a href="/login"       style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", color: "var(--text-3)" }}>Farmer Portal ↗</a>
          <a href="/admin/login" style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", color: "var(--text-3)" }}>Gov Portal ↗</a>
        </div>

        {/* Wallet + Network */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <WalletBadge />
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-3)" }}>
            <span className="anim-pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            Polygon
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <MarketNavbar />
      <main>{children}</main>
    </WalletProvider>
  );
}
