package com.abbas.appfactory;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(48, 48, 48, 48);

        TextView title = new TextView(this);
        title.setText("AI App Factory");
        title.setTextSize(28);
        title.setTextColor(Color.WHITE);
        title.setGravity(Gravity.CENTER);

        TextView status = new TextView(this);
        status.setText("Companion app ready — backend integration next");
        status.setTextSize(16);
        status.setTextColor(Color.LTGRAY);
        status.setGravity(Gravity.CENTER);

        root.setBackgroundColor(Color.rgb(10, 12, 18));
        root.addView(title);
        root.addView(status);
        setContentView(root);
    }
}
