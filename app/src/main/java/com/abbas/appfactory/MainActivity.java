package com.abbas.appfactory;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

public class MainActivity extends Activity {
    private final int BG = Color.rgb(10, 13, 22);
    private final int CARD = Color.rgb(24, 29, 43);
    private final int TEXT = Color.WHITE;
    private final int MUTED = Color.rgb(166, 175, 196);
    private final int ACCENT = Color.rgb(65, 125, 255);
    private final int GREEN = Color.rgb(66, 210, 140);

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        LinearLayout root = column(22, 22, 22, 28);
        scroll.addView(root);

        TextView brand = text("✦  ABBAS AI FACTORY", 13, ACCENT, true);
        root.addView(brand);
        TextView title = text("ساخت اپلیکیشن با هوش مصنوعی", 26, TEXT, true);
        title.setTextDirection(View.TEXT_DIRECTION_RTL);
        root.addView(title, lp(LinearLayout.LayoutParams.MATCH_PARENT, 55));
        TextView sub = text("ایده خودت را بده؛ Factory مراحل تحلیل، تولید، QA و Build را مدیریت می‌کند.", 14, MUTED, false);
        sub.setTextDirection(View.TEXT_DIRECTION_RTL);
        root.addView(sub);

        LinearLayout hero = card();
        TextView h = text("Factory Pipeline", 18, TEXT, true);
        hero.addView(h);
        TextView pct = text("72%", 30, GREEN, true);
        pct.setGravity(Gravity.END);
        hero.addView(pct, lp(LinearLayout.LayoutParams.MATCH_PARENT, 48));
        ProgressBar progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100); progress.setProgress(72); progress.setProgressTintList(android.content.res.ColorStateList.valueOf(ACCENT));
        hero.addView(progress, lp(LinearLayout.LayoutParams.MATCH_PARENT, 12));
        hero.addView(text("پروژه فعال: Digital Sales AI", 14, MUTED, false));
        root.addView(hero);

        root.addView(text("مراحل اجرا", 18, TEXT, true), lp(LinearLayout.LayoutParams.MATCH_PARENT, 48));
        String[] stages = {"AI Planning", "Code Generation", "GitHub Push", "Quality Assurance", "Build & APK"};
        for (int i = 0; i < stages.length; i++) {
            LinearLayout row = card(); row.setPadding(18, 14, 18, 14);
            TextView icon = text(i < 3 ? "✓" : "○", 18, i < 3 ? GREEN : MUTED, true);
            row.addView(icon, lp(36, 40));
            LinearLayout labels = column(0,0,0,0);
            labels.addView(text(stages[i], 15, TEXT, true));
            labels.addView(text(i < 3 ? "Completed" : (i == 3 ? "Ready for verification" : "Waiting for build"), 12, MUTED, false));
            row.addView(labels, lp(0, 40, 1));
            root.addView(row);
        }

        LinearLayout action = card();
        action.addView(text("شروع پروژه جدید", 18, TEXT, true));
        TextView hint = text("از نسخه بعدی، این صفحه به Orchestrator متصل می‌شود و وضعیت Job را زنده نمایش می‌دهد.", 13, MUTED, false);
        hint.setTextDirection(View.TEXT_DIRECTION_RTL);
        action.addView(hint);
        root.addView(action);

        setContentView(scroll);
    }

    private LinearLayout column(int l, int t, int r, int b) { LinearLayout v = new LinearLayout(this); v.setOrientation(LinearLayout.VERTICAL); v.setPadding(l,t,r,b); return v; }
    private LinearLayout card() { LinearLayout v = column(18,16,18,16); GradientDrawable g = new GradientDrawable(); g.setColor(CARD); g.setCornerRadius(28); v.setBackground(g); return v; }
    private TextView text(String s, float size, int color, boolean bold) { TextView v = new TextView(this); v.setText(s); v.setTextSize(size); v.setTextColor(color); v.setGravity(Gravity.CENTER_VERTICAL); if (bold) v.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD); return v; }
    private LinearLayout.LayoutParams lp(int w, int h) { return new LinearLayout.LayoutParams(w,h); }
    private LinearLayout.LayoutParams lp(int w, int h, float weight) { return new LinearLayout.LayoutParams(w,h,weight); }
}
