"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function GovtNavbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [officer, setOfficer] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const role = data.session?.user?.app_metadata?.role;
      if (!data.session || role !== "govt_officer") {
        // Not logged in or not an officer — redirect to govt login
        router.replace("/admin/login");
        return;
      }
      const name = data.session.user.user_metadata?.name
        ?? localStorage.getItem("govt_officer")
        ?? data.session.user.email?.split("@")[0]
        ?? "Officer";
      setOfficer(name);
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("govt_officer");
    router.push("/admin/login");
    router.refresh();
  }

  const nav = [
    { href: "/admin",           label: "Queue"     },
    { href: "/admin/analytics", label: "Analytics" },
  ];

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,6,15,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--gov-border)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

        <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: "var(--gov-blue-dim)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>G</div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "var(--gov-text)" }}>
            Eco<span style={{ color: "#818cf8" }}>Nova AI</span>
            <span style={{ fontSize: 10, color: "var(--gov-text-3)", marginLeft: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 400 }}>Government</span>
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {nav.map((link) => (
            <Link key={link.href} href={link.href}
              style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "all 0.15s",
                color: isActive(link.href) ? "#a5b4fc" : "var(--gov-text-2)",
                background: isActive(link.href) ? "rgba(99,102,241,0.1)" : "transparent",
                border: isActive(link.href) ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent",
              }}
            >{link.label}</Link>
          ))}
          <Link href="/marketplace" style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", color: "var(--gov-text-3)" }}>
            Marketplace ↗
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {officer && (
            <>
              <span style={{ fontSize: 12, color: "var(--gov-text-3)" }}>Officer: {officer}</span>
              <button onClick={handleSignOut} className="btn btn-gov-ghost btn-sm">Sign out</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function GovtLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--gov-bg)", minHeight: "100vh" }}>
      <GovtNavbar />
      <main>{children}</main>
    </div>
  );
}
