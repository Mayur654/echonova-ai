"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function FarmerNavbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { farmer, user, signOut, loading } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = [
    { href: "/",          label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/land",      label: "Register Land" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(4,9,5,0.94)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: "var(--green-dim)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>E</div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
             Eco<span style={{ color: "var(--green)" }}>Nova AI</span>
            <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 400 }}>Farmer</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {nav.map((link) => (
            <Link
              key={link.href} href={link.href}
              style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "all 0.15s",
                color: isActive(link.href) ? "var(--green)" : "var(--text-2)",
                background: isActive(link.href) ? "var(--green-glow)" : "transparent",
                border: isActive(link.href) ? "1px solid rgba(34,197,94,0.2)" : "1px solid transparent",
              }}
            >{link.label}</Link>
          ))}
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-3)" }}>
            <span className="anim-pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            Polygon
          </div>
          {!loading && user ? (
            <>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>{farmer?.name?.split(" ")[0] || user.email?.split("@")[0]}</span>
              <button onClick={handleSignOut} className="btn btn-ghost btn-sm">Sign out</button>
            </>
          ) : !loading ? (
            <Link href="/login" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>Sign In</Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FarmerNavbar />
      <main>{children}</main>
    </>
  );
}
