"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type StageState = "done" | "active" | "waiting" | "error";
type Artifact = { name?: string; type?: string; url?: string };
type BuildInfo = { buildId: string; appId?: string; workflowId?: string; branch?: string; status?: string; finished?: boolean; failed?: boolean; artifacts?: Artifact[] };
type Project = { projectId: string; accountId: string; title: string; brief: string; stage: string; progress: number; createdAt: string; updatedAt: string; error: string | null; execution?: { status: string; lastAIResult: unknown; lastAIAt: string | null; lastError: string | null; sourceDraft?: { files?: Array<{ path: string; content: string }>; summary?: string }; source?: { commitSha?: string }; qa?: { passed: boolean; findings?: Array<{ severity: string; code: string; path?: string }> }; build?: BuildInfo } };
type Stage = { key: string; title: string; state: StageState };

const stageDefs = [["IDEA", "تحلیل ایده"], ["RESEARCHED", "تحقیق و نیازمندی‌ها"], ["SCRIPTED", "طراحی و معماری"], ["ASSETS_READY", "طراحی UI/UX"], ["RENDERED", "تولید کد"], ["QA_PASSED", "تست و QA"], ["UPLOADED", "Build / APK"], ["ANALYZED", "تحویل نهایی"]] as const;

function StageIcon({ type }: { type: string }) {
  const c = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const p: Record<string, ReactNode> = {
    IDEA: <><path {...c} d="M12 3a6 6 0 0 0-3.4 10.95c.8.55 1.4 1.35 1.4 2.35h4c0-1 .6-1.8 1.4-2.35A6 6 0 0 0 12 3Z"/><path {...c} d="M10 20h4M10.5 17h3"/></>,
    RESEARCHED: <><circle {...c} cx="10.5" cy="10.5" r="5.5"/><path {...c} d="m15 15 4 4"/></>,
    SCRIPTED: <><path {...c} d="M6 3.5h9l3 3V20H6z"/><path {...c} d="M15 3.5V7h3M9 11h6M9 14h6M9 17h4"/></>,
    ASSETS_READY: <><rect {...c} x="3.5" y="5" width="17" height="14" rx="2"/><path {...c} d="m6.5 16 4-4 2.5 2.5 2-2 2.5 3.5M8 9h.01"/></>,
    RENDERED: <><path {...c} d="M5 4h14v16H5zM9 8l6 4-6 4z"/></>,
    QA_PASSED: <><path {...c} d="M12 3 19 6v5c0 4.2-2.8 7.3-7 9-4.2-1.7-7-4.8-7-9V6z"/><path {...c} d="m8.5 12 2.2 2.2 4.8-5"/></>,
    UPLOADED: <><path {...c} d="M12 16V5M8 9l4-4 4 4M5 18v2h14v-2"/></>,
    ANALYZED: <><path {...c} d="M5 19V9M12 19V5M19 19v-7"/><path {...c} d="M3 19h18"/></>,
  };
  return <svg className="stage-svg" viewBox="0 0 24 24" aria-hidden="true">{p[type]}</svg>;
}

function buildStages(project: Project | null): Stage[] {
  const current = project ? stageDefs.findIndex(([key]) => key === project.stage) : -1;
  return stageDefs.map(([key, title], index) => ({ key, title, state: project?.error && index === current ? "error" : index < current ? "done" : index === current ? "active" : "waiting" }));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Dashboard() {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const [project, setProject] = useState<Project | null>(null);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<"live" | "offline">("offline");
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");
  const [artifactLink, setArtifactLink] = useState("");

  const stages = useMemo(() => buildStages(project), [project]);
  const progress = project?.progress ?? 0;
  const build = project?.execution?.build;
  const active = stages.find((s) => s.state === "active");

  useEffect(() => {
    if (!project) return;
    const started = new Date(project.createdAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer);
  }, [project]);

  useEffect(() => {
    if (!project?.projectId) return;
    const poll = async () => { try { const r = await fetch(`${apiBase}/api/v1/projects/${project.projectId}`, { cache: "no-store" }); if (!r.ok) throw new Error(); setProject(await r.json()); setConnection("live"); } catch { setConnection("offline"); } };
    poll(); const timer = window.setInterval(poll, 3000); return () => window.clearInterval(timer);
  }, [apiBase, project?.projectId]);

  useEffect(() => {
    if (!project?.projectId || !build?.buildId || build.finished || build.failed) return;
    let cancelled = false;
    const poll = async () => { try { const r = await fetch(`${apiBase}/api/v1/projects/${project.projectId}/build/${build.buildId}`, { cache: "no-store" }); if (!r.ok) return; const payload = await r.json(); if (!cancelled) { setProject(payload.project); setMessage(payload.build?.finished ? "APK با موفقیت ساخته شد." : payload.build?.failed ? "Build شکست خورد؛ خطا را بررسی کنید." : `Codemagic: ${payload.build?.status || "در حال ساخت"}`); } } catch {} };
    poll(); const timer = window.setInterval(poll, 5000); return () => { cancelled = true; window.clearInterval(timer); };
  }, [apiBase, project?.projectId, build?.buildId, build?.status, build?.finished, build?.failed]);

  async function post(path: string, body?: unknown) {
    const r = await fetch(`${apiBase}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data?.error || "REQUEST_FAILED"); return data;
  }

  async function advance(stage: string) { const data = await post(`/api/v1/projects/${project!.projectId}/advance`, { stage }); setProject(data); }

  async function runFactory() {
    if (!command.trim() || loading) return;
    setLoading(true); setArtifactLink("");
    try {
      setMessage("۱/۹ — ساخت پروژه و تحلیل هوشمند…");
      const created = await post("/api/v1/projects", { accountId: "demo-account", title: command.trim(), brief: command.trim() });
      setProject(created); setConnection("live"); setCommand("");
      const ai = await post(`/api/v1/projects/${created.projectId}/orchestrate/ai`); setProject(ai.project);
      for (const [i, stage] of ["RESEARCHED", "SCRIPTED", "ASSETS_READY"].entries()) { setMessage(`${i + 2}/۹ — ${stageDefs.find(([k]) => k === stage)?.[1]}…`); await advance(stage); await sleep(250); }
      setMessage("۵/۹ — Code Generation Agent در حال تولید Source…");
      const generated = await post(`/api/v1/projects/${created.projectId}/source/generate`); setProject(generated.project);
      const draft = generated.source?.files || generated.project?.execution?.sourceDraft?.files || [];
      if (!draft.length) throw new Error("SOURCE_FILES_MISSING");
      setMessage("۶/۹ — Commit ایزوله به GitHub و آماده‌سازی Build…");
      const prefix = `generated/${created.projectId}`;
      const committedFiles = draft.map((f: { path: string; content: string }) => ({ path: `${prefix}/${f.path}`, content: f.content }));
      const committed = await post(`/api/v1/projects/${created.projectId}/source/commit`, { files: committedFiles, message: `feat: generate app ${created.projectId}` });
      setProject(committed.project);
      setMessage("۷/۹ — اجرای QA Gate…");
      const qa = await post(`/api/v1/projects/${created.projectId}/qa/run`, { files: draft, commitSha: committed.source?.commitSha });
      setProject(qa.project); if (!qa.qa?.passed) throw new Error("QA_FAILED");
      setMessage("۸/۹ — ارسال Build واقعی به Codemagic…");
      const buildPayload = await post(`/api/v1/projects/${created.projectId}/build`, { projectRoot: prefix });
      setProject(buildPayload.project); setMessage("۹/۹ — Build در Codemagic اجرا شد؛ وضعیت زنده پیگیری می‌شود.");
    } catch (e) { setMessage(`خطا: ${e instanceof Error ? e.message : "UNKNOWN_ERROR"}`); }
    finally { setLoading(false); }
  }

  async function makeArtifactLink() {
    if (!project?.projectId || !build?.buildId || !build.finished || !build.artifacts?.length) return;
    const artifact = build.artifacts.find((a) => a.url) || build.artifacts[0];
    try { const data = await post(`/api/v1/projects/${project.projectId}/build/${build.buildId}/artifact-url`, { artifactUrl: artifact.url, artifactName: artifact.name }); setArtifactLink(data?.url || data?.publicUrl || ""); if (!data?.url && !data?.publicUrl) setMessage("لینک عمومی Artifact برگردانده نشد."); }
    catch (e) { setMessage(`خطای لینک APK: ${e instanceof Error ? e.message : "UNKNOWN_ERROR"}`); }
  }

  const time = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const canDownload = Boolean(build?.finished && build.artifacts?.length);

  return <main className="shell">
    <aside className="sidebar"><div className="brand">✦ Abbas AI Factory</div><nav className="nav"><a className="active" href="#dashboard">داشبورد</a><a href="#projects">پروژه‌ها</a><a href="#videos">ویدئوها</a><a href="#channels">کانال‌های YouTube</a><a href="#analytics">تحلیل‌ها</a><a href="#license">لایسنس</a><a href="#settings">تنظیمات</a><a href="#help">راهنما</a></nav></aside>
    <section className="main" id="dashboard"><header className="top"><div><div className="eyebrow">AI WORKSPACE / AUTONOMOUS FACTORY</div><h1>مرکز فرمان هوش مصنوعی</h1></div><span className={`badge ${connection === "live" ? "live" : "offline"}`}>● {connection === "live" ? "LIVE" : "OFFLINE"} · LIFETIME ACTIVE</span></header>
      <section className="monitor card full"><div className="monitor-head"><div><div className="label">AUTONOMOUS MONITORING</div><h2>{project?.title || "پروژه جدید"}</h2></div><div className="progress-number">{progress}%</div></div><div className="progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="stage-flow">{stages.map((stage, index) => <div className="stage-wrap" key={stage.key}><div className={`stage-glass ${stage.state}`}><div className="stage-icon-glass"><StageIcon type={stage.key} /></div><div className="stage-number">0{index + 1}</div><strong>{stage.title}</strong><small>{stage.key}</small><span className="stage-status">{stage.state === "done" ? "✓ تکمیل شد" : stage.state === "active" ? "● در حال انجام" : stage.state === "error" ? "! خطا" : "○ در انتظار"}</span></div>{index < stages.length - 1 && <div className={`flow-line ${stage.state === "done" ? "done" : ""}`} />}</div>)}</div>
        <div className="activity"><div><b>🔵 فعالیت Agent</b><p>{message || (project ? `مرحله «${active?.title || project.stage}» در حال پیگیری است.` : "یک ایده وارد کنید؛ Factory بقیه مراحل را خودکار انجام می‌دهد.")}</p></div><div className="metrics"><span>⏱ {time}</span><span>📁 {project?.execution?.status || "READY"}</span><span>🔄 Poll: 3s</span><span>⚠️ {project?.error || "0 خطا"}</span></div></div>
      </section>
      <div className="grid"><section className="card wide"><div className="label">AUTONOMOUS COMMAND</div><h2>چه چیزی می‌خواهید بسازید؟</h2><div className="command"><input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runFactory()} placeholder="مثلاً یک اپ مدیریت کافینت بساز..." /><button className="primary" disabled={loading || !command.trim()} onClick={runFactory}>{loading ? "Factory در حال ساخت…" : "ساخت خودکار 🚀"}</button></div><p>یک فرمان کافی است؛ تحلیل، Source، GitHub، QA و Build به‌صورت زنجیره‌ای اجرا می‌شوند.</p></section>
        <section className="card"><div className="label">مرحله فعلی</div><div className="value">{active?.title || (project ? "تکمیل" : "—")}</div></section><section className="card"><div className="label">Project ID</div><div className="value small-value">{project?.projectId || "—"}</div></section><section className="card"><div className="label">QA Gate</div><div className="value">{project?.execution?.qa ? (project.execution.qa.passed ? "✓ PASS" : "✕ FAIL") : "—"}</div></section><section className="card" id="license"><div className="label">License Center</div><h3>LIFETIME</h3><p>دستگاه‌ها: 1 / 2<br />کانال‌ها: 1 / 1</p></section>
        <section className="card full" id="build"><div className="label">ANDROID BUILD CENTER</div><div className="build-row"><div><h2>{build ? `Build #${build.buildId}` : "ساخت APK"}</h2><p>{build ? `Codemagic: ${build.status || "queued"}` : "پس از عبور از QA، Build واقعی شروع می‌شود."}</p>{build?.artifacts?.length ? <p>Artifact: {build.artifacts.map((a) => a.name || a.type || "artifact").join("، ")}</p> : null}</div><button className="primary" disabled={!canDownload} onClick={makeArtifactLink}>{artifactLink ? "لینک آماده است" : "دریافت لینک APK"}</button></div>{artifactLink && <p><a href={artifactLink} target="_blank" rel="noreferrer">⬇️ دانلود APK</a></p>}</section>
      </div>
    </section>
  </main>;
}
