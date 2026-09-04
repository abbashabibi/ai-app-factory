package com.abbas.appfactory;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int BG = Color.rgb(9, 12, 20);
    private static final int CARD = Color.rgb(20, 25, 38);
    private static final int CARD_2 = Color.rgb(25, 31, 46);
    private static final int TEXT = Color.rgb(247, 249, 255);
    private static final int MUTED = Color.rgb(157, 168, 190);
    private static final int ACCENT = Color.rgb(72, 124, 255);
    private static final int GREEN = Color.rgb(61, 207, 139);
    private static final int BORDER = Color.rgb(43, 51, 70);
    private static final int WARNING = Color.rgb(245, 185, 72);

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window window = getWindow();
        window.setStatusBarColor(BG);
        window.setNavigationBarColor(BG);
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        scroll.setBackgroundColor(BG);

        LinearLayout root = column(20, 18, 20, 28);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        scroll.addView(root, new ScrollView.LayoutParams(-1, -2));
        setContentView(scroll);

        scroll.setOnApplyWindowInsetsListener((v, insets) -> {
            WindowInsets wi = insets;
            int top = 18;
            int bottom = 24;
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = wi.getInsets(WindowInsets.Type.systemBars());
                top += bars.top;
                bottom += bars.bottom;
            }
            root.setPadding(dp(20), top, dp(20), bottom);
            return insets;
        });
        if (android.os.Build.VERSION.SDK_INT >= 20) scroll.requestApplyInsets();

        buildHeader(root);
        buildHero(root);
        buildPipeline(root);
        buildActivity(root);
    }

    private void buildHeader(LinearLayout root) {
        LinearLayout header = row();
        TextView mark = badge("✦", ACCENT, 42);
        header.addView(mark, lp(42, 42));
        LinearLayout titles = column(0, 0, 0, 0);
        titles.setGravity(Gravity.CENTER_VERTICAL | Gravity.RIGHT);
        TextView brand = text("ABBAS AI FACTORY", 14, ACCENT, true);
        brand.setTextDirection(View.TEXT_DIRECTION_LTR);
        TextView version = text("ساخت و مدیریت اپلیکیشن با هوش مصنوعی", 13, MUTED, false);
        version.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        titles.addView(brand, wrap());
        titles.addView(version, wrapTop(3));
        header.addView(titles, weight());
        TextView live = pill("●  آنلاین", GREEN, 12);
        header.addView(live, wrap());
        root.addView(header, wrapBottom(22));

        TextView title = text("ایده‌ات را به اپلیکیشن واقعی تبدیل کن", 25, TEXT, true);
        title.setGravity(Gravity.RIGHT);
        title.setLineSpacing(0, 1.05f);
        root.addView(title, wrapBottom(6));

        TextView sub = text("Factory تحلیل، تولید کد، GitHub، کنترل کیفیت و Build را در یک جریان یکپارچه مدیریت می‌کند.", 14, MUTED, false);
        sub.setGravity(Gravity.RIGHT);
        sub.setLineSpacing(0, 1.12f);
        root.addView(sub, wrapBottom(20));
    }

    private void buildHero(LinearLayout root) {
        LinearLayout hero = card();
        LinearLayout top = row();
        LinearLayout copy = column(0, 0, 0, 0);
        TextView label = text("پروژه فعال", 12, MUTED, false);
        label.setGravity(Gravity.RIGHT);
        TextView name = text("Digital Sales AI", 20, TEXT, true);
        name.setTextDirection(View.TEXT_DIRECTION_LTR);
        name.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        copy.addView(label, wrap());
        copy.addView(name, wrapTop(3));
        top.addView(copy, weight());
        TextView percent = text("72%", 27, GREEN, true);
        percent.setTextDirection(View.TEXT_DIRECTION_LTR);
        percent.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
        top.addView(percent, wrap());
        hero.addView(top, wrapBottom(14));

        ProgressBar progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgress(72);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(ACCENT));
        progress.setMinHeight(dp(7));
        progress.setMaxHeight(dp(7));
        hero.addView(progress, wrapBottom(13));

        LinearLayout meta = row();
        TextView stage = pill("در حال تولید", ACCENT, 12);
        meta.addView(stage, wrap());
        TextView info = text("5 مرحله تکمیل شده از 8 مرحله", 12, MUTED, false);
        info.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
        meta.addView(info, weight());
        hero.addView(meta, wrap());
        root.addView(hero, wrapBottom(24));
    }

    private void buildPipeline(LinearLayout root) {
        LinearLayout section = row();
        TextView heading = text("مراحل Factory", 19, TEXT, true);
        heading.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        section.addView(heading, weight());
        TextView count = pill("8 STAGES", MUTED, 11);
        count.setTextDirection(View.TEXT_DIRECTION_LTR);
        section.addView(count, wrap());
        root.addView(section, wrapBottom(12));

        String[][] stages = {
            {"✓", "AI Planning", "تحلیل و طراحی اولیه", "تکمیل شد", "done"},
            {"✓", "Code Generation", "تولید سورس پروژه", "تکمیل شد", "done"},
            {"✓", "GitHub Push", "ثبت نسخه در مخزن", "تکمیل شد", "done"},
            {"✓", "Quality Assurance", "بررسی ساختار و کیفیت", "تکمیل شد", "done"},
            {"→", "Build & APK", "ساخت خروجی Android", "در انتظار اجرا", "active"},
            {"○", "Artifact", "دریافت و ثبت APK", "در انتظار", "wait"},
            {"○", "Delivery", "آماده‌سازی تحویل", "در انتظار", "wait"},
            {"○", "ANALYZED", "تحلیل نتیجه Build", "در انتظار", "wait"}
        };
        for (String[] s : stages) {
            root.addView(stageCard(s[0], s[1], s[2], s[3], s[4]), wrapBottom(9));
        }
    }

    private LinearLayout stageCard(String iconText, String title, String description, String status, String kind) {
        LinearLayout box = cardSmall();
        LinearLayout row = row();
        TextView icon = badge(iconText, kind.equals("done") ? GREEN : kind.equals("active") ? ACCENT : MUTED, 40);
        row.addView(icon, lp(40, 40));

        LinearLayout copy = column(0, 0, 0, 0);
        copy.setGravity(Gravity.RIGHT);
        TextView t = text(title, 15, TEXT, true);
        t.setTextDirection(View.TEXT_DIRECTION_LTR);
        t.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        TextView d = text(description, 12, MUTED, false);
        d.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        copy.addView(t, wrap());
        copy.addView(d, wrapTop(3));
        row.addView(copy, weight());

        TextView st = pill(status, kind.equals("done") ? GREEN : kind.equals("active") ? ACCENT : MUTED, 11);
        st.setGravity(Gravity.CENTER);
        row.addView(st, wrap());
        box.addView(row, wrap());
        return box;
    }

    private void buildActivity(LinearLayout root) {
        root.addView(text("وضعیت سیستم", 19, TEXT, true), wrapBottom(12));
        LinearLayout panel = card();
        addMetric(panel, "Worker", "در حال آماده‌باش", GREEN);
        addMetric(panel, "GitHub", "متصل", GREEN);
        addMetric(panel, "Codemagic", "متصل", GREEN);
        addMetric(panel, "APK", "پس از Build ثبت می‌شود", WARNING);
        root.addView(panel, wrap());

        TextView footer = text("نسخه 0.2.0  •  Android  •  AI App Factory", 11, MUTED, false);
        footer.setTextDirection(View.TEXT_DIRECTION_LTR);
        footer.setGravity(Gravity.CENTER);
        root.addView(footer, wrapTop(22));
    }

    private void addMetric(LinearLayout parent, String key, String value, int color) {
        LinearLayout line = row();
        TextView dot = text("●", 11, color, true);
        dot.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
        line.addView(dot, wrap());
        TextView v = text(value, 12, MUTED, false);
        v.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        line.addView(v, weight());
        TextView k = text(key, 13, TEXT, true);
        k.setTextDirection(View.TEXT_DIRECTION_LTR);
        k.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        line.addView(k, wrap());
        parent.addView(line, wrapBottom(10));
    }

    private LinearLayout row() {
        LinearLayout v = new LinearLayout(this);
        v.setOrientation(LinearLayout.HORIZONTAL);
        v.setGravity(Gravity.CENTER_VERTICAL);
        v.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return v;
    }

    private LinearLayout column(int l, int t, int r, int b) {
        LinearLayout v = new LinearLayout(this);
        v.setOrientation(LinearLayout.VERTICAL);
        v.setPadding(dp(l), dp(t), dp(r), dp(b));
        v.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return v;
    }

    private LinearLayout card() {
        LinearLayout v = column(17, 16, 17, 16);
        GradientDrawable g = new GradientDrawable();
        g.setColor(CARD);
        g.setCornerRadius(dp(20));
        g.setStroke(dp(1), BORDER);
        v.setBackground(g);
        return v;
    }

    private LinearLayout cardSmall() {
        LinearLayout v = column(14, 12, 14, 12);
        GradientDrawable g = new GradientDrawable();
        g.setColor(CARD_2);
        g.setCornerRadius(dp(17));
        g.setStroke(dp(1), BORDER);
        v.setBackground(g);
        return v;
    }

    private TextView badge(String s, int color, int size) {
        TextView v = text(s, size <= 42 ? 18 : size, color, true);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(Color.argb(35, Color.red(color), Color.green(color), Color.blue(color)));
        v.setBackground(g);
        v.setGravity(Gravity.CENTER);
        return v;
    }

    private TextView pill(String s, int color, int size) {
        TextView v = text(s, size, color, true);
        v.setGravity(Gravity.CENTER);
        v.setPadding(dp(10), dp(6), dp(10), dp(6));
        GradientDrawable g = new GradientDrawable();
        g.setColor(Color.argb(30, Color.red(color), Color.green(color), Color.blue(color)));
        g.setCornerRadius(dp(50));
        v.setBackground(g);
        return v;
    }

    private TextView text(String s, float size, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(s);
        v.setTextSize(size);
        v.setTextColor(color);
        v.setFontFeatureSettings("kern");
        v.setIncludeFontPadding(true);
        v.setLineSpacing(0, 1.05f);
        v.setTypeface(Typeface.create(Typeface.DEFAULT, bold ? Typeface.BOLD : Typeface.NORMAL));
        v.setTextDirection(View.TEXT_DIRECTION_FIRST_STRONG);
        return v;
    }

    private LinearLayout.LayoutParams wrap() { return new LinearLayout.LayoutParams(-2, -2); }
    private LinearLayout.LayoutParams wrapTop(int margin) { LinearLayout.LayoutParams p = wrap(); p.topMargin = dp(margin); return p; }
    private LinearLayout.LayoutParams wrapBottom(int margin) { LinearLayout.LayoutParams p = wrap(); p.bottomMargin = dp(margin); return p; }
    private LinearLayout.LayoutParams lp(int w, int h) { return new LinearLayout.LayoutParams(dp(w), dp(h)); }
    private LinearLayout.LayoutParams weight() { return new LinearLayout.LayoutParams(0, -2, 1f); }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
}
