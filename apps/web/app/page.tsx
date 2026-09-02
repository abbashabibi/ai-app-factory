"use client";

import { useEffect, useState } from "react";

type Stage = { key: string; title: string; state: "done" | "active" | "waiting" | "error" };

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
      <aside className="sidebar">
        <div className="brand">✦ Abbas AI Factory</div>
        <nav className="nav">
          <a className="active" href="#dashboard">داشبورد</a><a href="#projects">پروژه‌ها</a><a href="#videos">ویدئوها</a>
          <a href="#channels">کانال‌های YouTube</a><a href="#analytics">تحلیل‌ها</a><a href="#license">لایسنس</a><a href="#settings">تنظیمات</a><a href="#help">راهنما</a>
        </nav>
      </aside>
      <section className="main" id="dashboard">
        <header className="top"><div><div className="eyebrow">AI WORKSPACE / LIVE MONITOR</div><h1>مرکز فرمان هوش مصنوعی</h1></div><span className="badge">● LIVE · LIFETIME ACTIVE</span></header>

        <section className="monitor card full">
          <div className="monitor-head"><div><div className="label">MONITORING</div><h2>پروژه «آشپزی هوشمند»</h2></div><div className="progress-number">{progress}%</div></div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="stage-list">
            {stages.map((stage, index) => (
              <div className={`stage ${stage.state}`} key={stage.key}>
                <div className="stage-icon">{stage.state === "done" ? "✓" : stage.state === "active" ? "●" : stage.state === "error" ? "!" : index + 1}</div>
                <div className="stage-info"><strong>{stage.title}</strong><small>{stage.key}</small></div>
                <span className="stage-status">{stage.state === "done" ? "تکمیل شد" : stage.state === "active" ? "در حال انجام…" : stage.state === "error" ? "خطا" : "در انتظار"}</span>
              </div>
            ))}
          </div>
          <div className="activity"><div><b>🔵 فعالیت فعلی Agent</b><p>در حال طراحی رابط کاربری و آماده‌سازی ساختار صفحات…</p></div><div className="metrics"><span>⏱ {time}</span><span>📁 17 فایل</span><span>🧪 12/15 تست</span><span>⚠️ 0 خطا</span></div></div>
        </section>

        <div className="grid">
          <section className="card wide"><div className="label">فرمان هوشمند</div><h2>چه چیزی می‌خواهید بسازید؟</h2><div className="command"><input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="مثلاً یک پروژه YouTube درباره آموزش آشپزی بساز..." /><button className="primary" onClick={() => setProgress((v) => Math.min(100, v + 5))}>شروع پروژه</button></div></section>
          <section className="card"><div className="label">پروژه‌های فعال</div><div className="value">3</div></section>
          <section className="card"><div className="label">ویدئوهای تولیدشده</div><div className="value">24</div></section>
          <section className="card"><div className="label">وضعیت YouTube</div><div className="value">متصل</div></section>
          <section className="card" id="license"><div className="label">License Center</div><h3>LIFETIME</h3><p>دستگاه‌ها: 1 / 2<br />کانال‌ها: 1 / 1</p></section>
          <section className="card full"><div className="label">شروع سریع</div><p>ورود → فعال‌سازی لایسنس → اتصال YouTube → ساخت پروژه → تولید محتوا → کنترل کیفیت → بررسی → انتشار</p></section>
        </div>
      </section>
    </main>
  );
}
