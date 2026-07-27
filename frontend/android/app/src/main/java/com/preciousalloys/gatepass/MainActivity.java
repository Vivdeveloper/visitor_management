package com.preciousalloys.gatepass;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            NotificationChannel channel = new NotificationChannel(
                "gatepass_default",
                "GatePass Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Visitor approvals, check-ins, and gate notifications");
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);

            NotificationChannel urgent = new NotificationChannel(
                "gatepass_urgent",
                "Urgent Host Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            urgent.setDescription("High-priority visitor approval alerts with sound and vibration");
            urgent.enableVibration(true);
            urgent.setVibrationPattern(new long[] { 0, 280, 120, 280, 120, 420 });
            urgent.enableLights(true);
            urgent.setBypassDnd(false);
            manager.createNotificationChannel(urgent);
        }
    }
}
