"use client";

import { useEffect, useState } from "react";

type StageState = "done" | "active" | "waiting" | "error";
type Stage = { key: string; title: string; state: StageState };

const stages: Stage[] = [
  { key: "IDEA", title: "تحلیل ایده", state: "done" },
  { key: "RESEARCHED", title: "تحقیق و نیازمندی‌ها", state: "done" },
  { key: "SCRIPTED", title: "طراحی و معماری", state: "done" },
  { key: "ASSETS_READY", title: "طراحی UI/UX", state: "active" },
  { key: "RENDERED", title: "تولید کد", state: "waiting" },
  { key: "QA_PASSED", title: "تست و QA", state: "waiting" },
  { key: "UPLOADED", title: "Build / APK", state: "waiting" },
  { key: "ANALYZED", title: "تحویل نهایی", state: "waiting" },
];

function StageIcon({ type }: { type: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
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

export default function Dashboard() {
  const [progress, setProgress] = useState(46);
  const [elapsed, setElapsed] = useState(0);
  const [command, setCommand] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <main className="shell">
      <aside className="sidebar"><div className="brand">✦ Abbas AI Factory</div><nav className="nav"><a className="active" href="#dashboard">داشبورد</a><a href="#projects">پروژه‌ها</a><a href="#videos">ویدئوها</a><a href="#channels">کانال‌های YouTube</a><a href="#analytics">تحلیل‌ها</a><a href="#license">لایسنس</a><a href="#settings">تنظیمات</a><a href="#help">راهنما</a></nav></aside>
      <section className="main" id="dashboard">
        <header className="top"><div><div className="eyebrow">AI WORKSPACE / LIVE MONITOR</div><h1>مرکز فرمان هوش مصنوعی</h1></div><span className="badge">● LIVE · LIFETIME ACTIVE</span></header>
        <section className="monitor card full">
          <div className="monitor-head"><div><div className="label">MONITORING</div><h2>مسیر ساخت پروژه</h2></div><div className="progress-number">{progress}%</div></div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="stage-flow">
            {stages.map((stage, index) => <div className="stage-wrap" key={stage.key}>
              <div className={`stage-glass ${stage.state}`}><div className="stage-icon-glass"><StageIcon type={stage.key} /></div><div className="stage-number">0{index + 1}</div><strong>{stage.title}</strong><small>{stage.key}</small><span className="stage-status">{stage.state === "done" ? "✓ تکمیل شد" : stage.state === "active" ? "● در حال انجام" : stage.state === "error" ? "! خطا" : "○ در انتظار"}</span></div>
              {index < stages.length - 1 && <div className={`flow-line ${stage.state === "done" ? "done" : ""}`} />}
            </div>)}
          </div>
          <div className="activity"><div><b>🔵 فعالیت فعلی Agent</b><p>در حال طراحی رابط کاربری و آماده‌سازی ساختار صفحات…</p></div><div className="metrics"><span>⏱ {time}</span><span>📁 17 فایل</span><span>🧪 12/15 تست</span><span>⚠️ 0 خطا</span></div></div>
        </section>
        <div className="grid">
          <section className="card wide"><div className="label">فرمان هوشمند</div><h2>چه چیزی می‌خواهید بسازید؟</h2><div className="command"><input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="مثلاً یک پروژه YouTube درباره آموزش آشپزی بساز..." /><button className="primary" onClick={() => setProgress((v) => Math.min(100, v + 5))}>شروع پروژه</button></div></section>
          <section className="card"><div className="label">پروژه‌های فعال</div><div className="value">3</div></section><section className="card"><div className="label">ویدئوهای تولیدشده</div><div className="value">24</div></section><section className="card"><div className="label">وضعیت YouTube</div><div className="value">متصل</div></section>
          <section className="card" id="license"><div className="label">License Center</div><h3>LIFETIME</h3><p>دستگاه‌ها: 1 / 2<br />کانال‌ها: 1 / 1</p></section><section className="card full"><div className="label">شروع سریع</div><p>ورود → فعال‌سازی لایسنس → اتصال YouTube → ساخت پروژه → تولید محتوا → کنترل کیفیت → بررسی → انتشار</p></section>
        </div>
      </section>
    </main>
  );
}
