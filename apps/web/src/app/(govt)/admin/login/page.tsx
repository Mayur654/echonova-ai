"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function GovtLoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    // Step 1: Authenticate
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (authError || !data.user) {
      setError("Invalid credentials.");
      setLoading(false); return;
    }

    // Step 2: Check role via app_metadata (instant — no extra DB call, no RLS race condition)
    // app_metadata is set server-side only so farmers cannot spoof it.
    // To assign the role, run the SQL snippet in the setup instructions.
    const role = data.user.app_metadata?.role;

    if (role !== "govt_officer") {
      await supabase.auth.signOut();
      setError("Access denied. This portal is for authorised government officers only.");
      setLoading(false); return;
    }

    // Step 3: Store officer name and redirect
    const officerName = data.user.user_metadata?.name ?? data.user.email ?? "Officer";
    localStorage.setItem("govt_officer", officerName);

    // Hard redirect — most reliable way to push to a new route
    window.location.href = "/admin";
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--gov-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.03) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: "radial-gradient(ellipse,rgba(99,102,241,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, background: "var(--gov-blue-dim)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>G</div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "var(--gov-text)" }}>
            Eco<span style={{ color: "#818cf8" }}>Nova AI</span>
            <span style={{ fontSize: 10, color: "var(--gov-text-3)", marginLeft: 6 }}>Government Portal</span>
          </span>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#a5b4fc", marginBottom: 20 }}>
          🔒 Restricted Access — Authorised Officers Only
        </div>

        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: "var(--gov-text)" }}>Government Sign In</h1>
        <p style={{ fontSize: 14, color: "var(--gov-text-3)", marginBottom: 24 }}>Use your government-issued credentials to access the verification dashboard.</p>

        <div className="card-gov" style={{ padding: 24 }}>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--gov-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Officer Email</label>
              <input
                type="email" placeholder="officer@gov.in"
                value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); }}
                required autoComplete="email"
                className="input input-gov"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--gov-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Password</label>
              <input
                type="password" placeholder="••••••••"
                value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
                required autoComplete="current-password"
                className="input input-gov"
              />
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-gov" style={{ width: "100%", marginTop: 4 }}>
              {loading
                ? <><svg className="anim-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Signing in…</>
                : "Sign In to Dashboard →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--gov-text-3)", marginTop: 20 }}>
          Are you a farmer?{" "}
          <a href="/login" style={{ color: "var(--green)", textDecoration: "none", fontWeight: 600 }}>Farmer portal →</a>
        </p>
      </div>
    </div>
  );
}
