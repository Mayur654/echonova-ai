"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

const INDIAN_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry"];

type Step = "account" | "profile";

export default function FarmerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [authForm,    setAuthForm]    = useState({ email: "", password: "", confirmPassword: "" });
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", state: "", district: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  function onAuthChange(e: React.ChangeEvent<HTMLInputElement>) { setAuthForm({ ...authForm, [e.target.name]: e.target.value }); setError(""); }
  function onProfileChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) { setProfileForm({ ...profileForm, [e.target.name]: e.target.value }); setError(""); }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (authForm.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (authForm.password !== authForm.confirmPassword) { setError("Passwords do not match."); return; }
    setError(""); setStep("profile");
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: authForm.email, password: authForm.password,
      options: { data: { name: profileForm.name } },
    });
    if (authError) { setError(authError.message); setLoading(false); return; }

    const userId = authData.user?.id;
    if (!userId) { setError("Account creation failed. Please try again."); setLoading(false); return; }

    const { data: farmerData, error: farmerError } = await supabase
      .from("farmers")
      .insert([{ user_id: userId, name: profileForm.name, phone: profileForm.phone, email: authForm.email, state: profileForm.state, district: profileForm.district }])
      .select().single();

    if (farmerError) { setError("Profile setup failed: " + farmerError.message); setLoading(false); return; }

    localStorage.setItem("farmer_id",   farmerData.id);
    localStorage.setItem("farmer_name", farmerData.name);
    router.push("/dashboard"); router.refresh();
  }

  const stepIdx = step === "account" ? 1 : 2;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(22,163,74,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(22,163,74,0.025) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 24 }}>
          <div style={{ width: 30, height: 30, background: "var(--green-dim)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 13, color: "#fff" }}>E</div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Eco<span style={{ color: "var(--green)" }}>Ledger</span></span>
        </Link>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          {[{n:1,label:"Account"},{n:2,label:"Profile"}].map((s,i) => (
            <div key={s.n} style={{ display:"flex", alignItems:"center", flex: i===0 ? undefined : 1 }}>
              {i > 0 && <div style={{ flex:1, height:1, background: stepIdx>1 ? "var(--green-dim)" : "var(--border)", margin:"0 10px", transition:"background 0.3s" }} />}
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0, transition:"all 0.2s",
                  background: stepIdx===s.n ? "var(--green-dim)" : stepIdx>s.n ? "var(--green-glow)" : "var(--bg-card)",
                  border: stepIdx>s.n ? "1px solid var(--green-dim)" : "1px solid var(--border)",
                  color: stepIdx===s.n ? "#fff" : stepIdx>s.n ? "var(--green)" : "var(--text-3)",
                }}>
                  {stepIdx > s.n ? "✓" : s.n}
                </div>
                <span style={{ fontSize:12, fontWeight:600, color: stepIdx===s.n ? "var(--text)" : "var(--text-3)", transition:"color 0.2s" }}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {step === "account" && (
          <>
            <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:24, fontWeight:700, marginBottom:4 }}>Create farmer account</h1>
            <p style={{ fontSize:14, color:"var(--text-3)", marginBottom:20 }}>Set up your login credentials</p>
            <div className="card" style={{ padding:24 }}>
              <form onSubmit={handleStep1} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Email *</label>
                  <input name="email" type="email" placeholder="you@example.com" value={authForm.email} onChange={onAuthChange} required autoComplete="email" className="input" />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Password *</label>
                  <input name="password" type="password" placeholder="Min 8 characters" value={authForm.password} onChange={onAuthChange} required minLength={8} autoComplete="new-password" className="input" />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Confirm Password *</label>
                  <input name="confirmPassword" type="password" placeholder="Repeat password" value={authForm.confirmPassword} onChange={onAuthChange} required autoComplete="new-password" className="input"
                    style={{ borderColor: authForm.confirmPassword && authForm.password !== authForm.confirmPassword ? "var(--red)" : undefined }} />
                </div>
                {error && <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 14px", color:"#f87171", fontSize:13 }}>{error}</div>}
                <button type="submit" className="btn btn-primary" style={{ width:"100%", marginTop:4 }}>Continue →</button>
              </form>
            </div>
            <p style={{ textAlign:"center", fontSize:13, color:"var(--text-3)", marginTop:16 }}>
              Already have an account? <Link href="/login" style={{ color:"var(--green)", textDecoration:"none", fontWeight:600 }}>Sign in</Link>
            </p>
          </>
        )}

        {step === "profile" && (
          <>
            <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:24, fontWeight:700, marginBottom:4 }}>Your farm profile</h1>
            <p style={{ fontSize:14, color:"var(--text-3)", marginBottom:20 }}>Tell us about your farm</p>
            <div className="card" style={{ padding:24 }}>
              <form onSubmit={handleStep2} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Full Name *</label>
                  <input name="name" placeholder="e.g. Ramesh Kumar" value={profileForm.name} onChange={onProfileChange} required className="input" />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Phone *</label>
                  <div style={{ display:"flex", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", padding:"0 12px", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:10, fontSize:13, color:"var(--text-2)", flexShrink:0 }}>🇮🇳 +91</div>
                    <input name="phone" placeholder="9876543210" value={profileForm.phone} onChange={onProfileChange} required type="tel" pattern="[0-9]{10}" className="input" />
                  </div>
                </div>
                <div className="grid-2">
                  <div>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>State *</label>
                    <select name="state" value={profileForm.state} onChange={onProfileChange} required className="input" style={{ colorScheme:"dark" }}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>District *</label>
                    <input name="district" placeholder="e.g. Pune" value={profileForm.district} onChange={onProfileChange} required className="input" />
                  </div>
                </div>
                {error && <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 14px", color:"#f87171", fontSize:13 }}>{error}</div>}
                <div className="grid-2" style={{ marginTop:4 }}>
                  <button type="button" onClick={() => { setStep("account"); setError(""); }} className="btn btn-ghost" style={{ width:"100%" }}>← Back</button>
                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:"100%" }}>
                    {loading ? <><svg className="anim-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Creating…</> : "Create Account →"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
