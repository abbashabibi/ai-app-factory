package com.abbas.appfactory;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(48, 48, 48, 48);
        root.setBackgroundColor(Color.rgb(10, 15, 30));

        TextView title = new TextView(this);
        title.setText("✦ Abbas AI Factory");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);

        TextView status = new TextView(this);
        status.setText("AI App Factory\n\nPipeline آماده اتصال به Orchestrator");
        status.setTextColor(Color.LTGRAY);
        status.setTextSize(17);
        status.setGravity(Gravity.CENTER);
        status.setPadding(0, 32, 0, 0);

        root.addView(title, new LinearLayout.LayoutParams(-1, -2));
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));
        setContentView(root);
    }
}
