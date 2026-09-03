"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
      const path = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const response = await fetch(`${apiBase}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "AUTH_FAILED");
      if (data?.token) window.localStorage.setItem("aif_session", data.token);
      router.push("/");
    } catch (e) { setError(e instanceof Error ? e.message : "AUTH_FAILED"); }
    finally { setBusy(false); }
  }

  return <main className="shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
    <section className="card" style={{ width: "min(460px, 100%)", padding: 32 }}>
      <div className="label">ABBAS AI FACTORY</div>
      <h1 style={{ marginBottom: 8 }}>{mode === "login" ? "ورود به Factory" : "ساخت حساب"}</h1>
      <p>حساب شما پروژه‌ها، لایسنس و اجرای Factory را به‌صورت مستقل نگه می‌دارد.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {mode === "register" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" autoComplete="name" />}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل" type="email" autoComplete="email" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور (حداقل ۸ کاراکتر)" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
        <button className="primary" disabled={busy}>{busy ? "در حال پردازش…" : mode === "login" ? "ورود امن →" : "ساخت حساب →"}</button>
      </form>
      {error && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,100,100,.3)" }}>خطا: {error}</div>}
      <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ marginTop: 18, background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}>
        {mode === "login" ? "حساب ندارید؟ ثبت‌نام کنید" : "حساب دارید؟ وارد شوید"}
      </button>
    </section>
  </main>;
}
