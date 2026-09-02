"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type StageState = "done" | "active" | "waiting" | "error";
type Stage = { key: string; title: string; state: StageState };
type Project = { projectId: string; accountId: string; title: string; brief: string; stage: string; progress: number; createdAt: string; updatedAt: string; error: string | null; execution?: { status: string; lastAIResult: unknown; lastAIAt: string | null; lastError: string | null } };

const stageDefs = [
  ["IDEA", "تحلیل ایده"], ["RESEARCHED", "تحقیق و نیازمندی‌ها"], ["SCRIPTED", "طراحی و معماری"], ["ASSETS_READY", "طراحی UI/UX"],
  ["RENDERED", "تولید کد"], ["QA_PASSED", "تست و QA"], ["UPLOADED", "Build / APK"], ["ANALYZED", "تحویل نهایی"],
] as const;

function StageIcon({ type }: { type: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    IDEA: <><path {...common} d="M12 3a6 6 0 0 0-3.4 10.95c.8.55 1.4 1.35 1.4 2.35h4c0-1 .6-1.8 1.4-2.35A6 6 0 0 0 12 3Z"/><path {...common} d="M10 20h4M10.5 17h3"/></>,
    RESEARCHED: <><circle {...common} cx="10.5" cy="10.5" r="5.5"/><path {...common} d="m15 15 4 4"/></>,
    SCRIPTED: <><path {...common} d="M6 3.5h9l3 3V20H6z"/><path {...common} d="M15 3.5V7h3M9 11h6M9 14h6M9 17h4"/></>,
    ASSETS_READY: <><rect {...common} x="3.5" y="5" width="17" height="14" rx="2"/><path {...common} d="m6.5 16 4-4 2.5 2.5 2-2 2.5 3.5M8 9h.01"/></>,
    RENDERED: <><path {...common} d="M5 4h14v16H5zM9 8l6 4-6 4z"/></>,
    QA_PASSED: <><path {...common} d="M12 3 19 6v5c0 4.2-2.8 7.3-7 9-4.2-1.7-7-4.8-7-9V6z"/><path {...common} d="m8.5 12 2.2 2.2 4.8-5"/></>,
    UPLOADED: <><path {...common} d="M12 16V5M8 9l4-4 4 4M5 18v2h14v-2"/></>,
    ANALYZED: <><path {...common} d="M5 19V9M12 19V5M19 19v-7"/><path {...common} d="M3 19h18"/></>,
  };
  return <svg className="stage-svg" viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

function buildStages(project: Project | null): Stage[] {
  const current = project ? stageDefs.findIndex(([key]) => key === project.stage) : -1;
  return stageDefs.map(([key, title], index) => ({ key, title, state: project?.error && index === current ? "error" : index < current ? "done" : index === current ? "active" : "waiting" }));
}

export default function Dashboard() {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const [project, setProject] = useState<Project | null>(null);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<"live" | "offline">("offline");
  const [elapsed, setElapsed] = useState(0);

  const stages = useMemo(() => buildStages(project), [project]);
  const progress = project?.progress ?? 0;

  useEffect(() => {
    if (!project) return;
    const started = new Date(project.createdAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [project]);

  useEffect(() => {
    if (!project?.projectId) return;
    const poll = async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/projects/${project.projectId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("offline");
        setProject(await res.json());
        setConnection("live");
      } catch { setConnection("offline"); }
    };
    poll();
    const timer = window.setInterval(poll, 3000);
    return () => window.clearInterval(timer);
  }, [apiBase, project?.projectId]);

  async function startProject() {
    if (!command.trim() || loading) return;
    setLoading(true);
    try {
      const createRes = await fetch(`${apiBase}/api/v1/projects`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId: "demo-account", title: command.trim(), brief: command.trim() }) });
      if (!createRes.ok) throw new Error("API_ERROR");
      const created: Project = await createRes.json();
      setProject(created);
      setConnection("live");
      setCommand("");

      // Immediately hand the new project to the AI orchestrator. If the provider
      // is not configured, the backend records the exact blocked state instead of
      // pretending that the stage completed.
      const aiRes = await fetch(`${apiBase}/api/v1/projects/${created.projectId}/orchestrate/ai`, { method: "POST" });
      if (aiRes.ok) {
        const aiPayload = await aiRes.json();
        setProject(aiPayload.project);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "API_ERROR") setConnection("offline");
    } finally { setLoading(false); }
  }

  const time = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const active = stages.find((s) => s.state === "active");

  return (
    <main className="shell">
      <aside className="sidebar"><div className="brand">✦ Abbas AI Factory</div><nav className="nav"><a className="active" href="#dashboard">داشبورد</a><a href="#projects">پروژه‌ها</a><a href="#videos">ویدئوها</a><a href="#channels">کانال‌های YouTube</a><a href="#analytics">تحلیل‌ها</a><a href="#license">لایسنس</a><a href="#settings">تنظیمات</a><a href="#help">راهنما</a></nav></aside>
      <section className="main" id="dashboard">
        <header className="top"><div><div className="eyebrow">AI WORKSPACE / LIVE MONITOR</div><h1>مرکز فرمان هوش مصنوعی</h1></div><span className={`badge ${connection === "live" ? "live" : "offline"}`}>● {connection === "live" ? "LIVE" : "OFFLINE"} · LIFETIME ACTIVE</span></header>
        <section className="monitor card full">
          <div className="monitor-head"><div><div className="label">MONITORING</div><h2>{project?.title || "پروژه جدید"}</h2></div><div className="progress-number">{progress}%</div></div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="stage-flow">
            {stages.map((stage, index) => <div className="stage-wrap" key={stage.key}>
              <div className={`stage-glass ${stage.state}`}><div className="stage-icon-glass"><StageIcon type={stage.key} /></div><div className="stage-number">0{index + 1}</div><strong>{stage.title}</strong><small>{stage.key}</small><span className="stage-status">{stage.state === "done" ? "✓ تکمیل شد" : stage.state === "active" ? "● در حال انجام" : stage.state === "error" ? "! خطا" : "○ در انتظار"}</span></div>
              {index < stages.length - 1 && <div className={`flow-line ${stage.state === "done" ? "done" : ""}`} />}
            </div>)}
          </div>
          <div className="activity"><div><b>🔵 فعالیت فعلی Agent</b><p>{project ? `در حال پردازش مرحله «${active?.title || project.stage}» و همگام‌سازی وضعیت پروژه…` : "هنوز پروژه‌ای اجرا نشده است؛ یک فرمان جدید وارد کنید."}</p></div><div className="metrics"><span>⏱ {time}</span><span>📁 Backend: {project?.execution?.status || "READY"}</span><span>🔄 Poll: 3s</span><span>⚠️ {project?.error || "0 خطا"}</span></div></div>
        </section>
        <div className="grid">
          <section className="card wide"><div className="label">فرمان هوشمند</div><h2>چه چیزی می‌خواهید بسازید؟</h2><div className="command"><input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startProject()} placeholder="مثلاً یک پروژه YouTube درباره آموزش آشپزی بساز..." /><button className="primary" disabled={loading || !command.trim()} onClick={startProject}>{loading ? "Agent در حال اجرا…" : "شروع پروژه"}</button></div></section>
          <section className="card"><div className="label">مرحله فعلی</div><div className="value">{active?.title || (project ? "تکمیل" : "—")}</div></section>
          <section className="card"><div className="label">Project ID</div><div className="value small-value">{project?.projectId || "—"}</div></section>
          <section className="card"><div className="label">وضعیت اتصال</div><div className="value">{connection === "live" ? "زنده" : "قطع"}</div></section>
          <section className="card" id="license"><div className="label">License Center</div><h3>LIFETIME</h3><p>دستگاه‌ها: 1 / 2<br />کانال‌ها: 1 / 1</p></section>
          <section className="card full"><div className="label">منطق اجرای واقعی</div><p>ساخت پروژه → اجرای AI Orchestrator → ثبت خروجی/خطا روی پروژه → Dashboard هر ۳ ثانیه وضعیت واقعی را می‌خواند. هیچ مرحله‌ای بدون خروجی یا Build تأییدشده به‌عنوان تکمیل‌شده علامت نمی‌خورد.</p></section>
        </div>
      </section>
    </main>
  );
}
