"use client";

import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function LoginInner() {
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirect") || "/dashboard";
  const router       = useRouter();

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    // Prevent native form submission (which would send creds in the URL as GET params)
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email:    form.email.trim(),
        password: form.password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Incorrect email or password."
            : authError.message,
        );
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError("Login failed — no session returned. Please try again.");
        setLoading(false);
        return;
      }

      // Hard redirect: most reliable across desktop and mobile browsers.
      // router.push can sometimes fail on mobile when the JS state is stale.
      window.location.href = redirectTo;

    } catch (err: any) {
      setError("Unexpected error: " + (err?.message ?? "Please check your connection."));
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 32 }}
      >
        <div style={{ width: 32, height: 32, background: "var(--green-dim)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>E</div>
        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
          Eco<span style={{ color: "var(--green)" }}>Ledger</span>
        </span>
      </Link>

      <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
        Farmer sign in
      </h1>
      <p style={{ color: "var(--text-3)", fontSize: 14, marginBottom: 24 }}>
        Access your carbon credit dashboard
      </p>

      <div className="card" style={{ padding: 24 }}>
        {/*
          IMPORTANT: Do NOT add method="post" or action="" here.
          This is a client-side form — the browser must NOT submit it natively.
          The fix for mobile is in next.config.mjs (allowedDevOrigins) which
          ensures JS loads, React hydrates, and onSubmit runs correctly.
        */}
        <form
          onSubmit={onSubmit}
          autoComplete="on"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={onChange}
              required
              autoComplete="email"
              inputMode="email"
              className="input"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={onChange}
              required
              autoComplete="current-password"
              className="input"
            />
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 4, minHeight: 44 /* touch target */ }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>
      </div>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-3)", marginTop: 18 }}>
        New farmer?{" "}
        <Link href="/register" style={{ color: "var(--green)", textDecoration: "none", fontWeight: 600 }}>
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function FarmerLoginPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Suspense fallback={<div style={{ color: "var(--text-3)", fontSize: 14 }}>Loading…</div>}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
