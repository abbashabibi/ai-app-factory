export default function Dashboard() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">✦ Abbas AI Factory</div>
        <nav className="nav">
          <a className="active" href="#dashboard">داشبورد</a>
          <a href="#projects">پروژه‌ها</a>
          <a href="#videos">ویدئوها</a>
          <a href="#channels">کانال‌های YouTube</a>
          <a href="#analytics">تحلیل‌ها</a>
          <a href="#license">لایسنس</a>
          <a href="#settings">تنظیمات</a>
          <a href="#help">راهنما</a>
        </nav>
      </aside>
      <section className="main">
        <header className="top">
          <div><div className="eyebrow">AI WORKSPACE</div><h1>مرکز فرمان هوش مصنوعی</h1></div>
          <span className="badge">LIFETIME ACTIVE</span>
        </header>
        <div className="grid">
          <section className="card wide">
            <div className="label">فرمان هوشمند</div>
            <h2>چه چیزی می‌خواهید بسازید؟</h2>
            <div className="command"><input placeholder="مثلاً یک پروژه YouTube درباره آموزش آشپزی بساز..." /><button className="primary">شروع پروژه</button></div>
          </section>
          <section className="card"><div className="label">پروژه‌های فعال</div><div className="value">3</div></section>
          <section className="card"><div className="label">ویدئوهای تولیدشده</div><div className="value">24</div></section>
          <section className="card"><div className="label">وضعیت YouTube</div><div className="value">متصل</div></section>
          <section className="card wide" id="projects"><div className="label">Pipeline</div><h3>پروژه «آشپزی هوشمند»</h3><p>Research → Script → Assets → Render → QA</p><div className="badge">QA در حال آماده‌سازی</div></section>
          <section className="card" id="license"><div className="label">License Center</div><h3>LIFETIME</h3><p>دستگاه‌ها: 1 / 2<br/>کانال‌ها: 1 / 1</p></section>
          <section className="card full"><div className="label">شروع سریع</div><p>ورود → فعال‌سازی لایسنس → اتصال YouTube → ساخت پروژه → تولید محتوا → کنترل کیفیت → انتشار</p></section>
        </div>
      </section>
    </main>
  );
}
