package com.preciousalloys.gatepass;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import java.util.Collections;

public class MainActivity extends BridgeActivity {
    private static boolean domSafetyInjected = false;

    /**
     * Runs before any page JS on every navigation — fixes React removeChild races
     * when the WebView loads the live /vms/ site from Frappe Cloud.
     */
    private static final String DOM_SAFETY_SCRIPT =
        "(function(){"
            + "if(typeof Node!=='undefined'&&Node.prototype){"
            + "var o=Node.prototype.removeChild;"
            + "Node.prototype.removeChild=function(c){"
            + "if(c.parentNode!==this){if(c.parentNode)return o.call(c.parentNode,c);return c;}"
            + "return o.call(this,c);};"
            + "var i=Node.prototype.insertBefore;"
            + "Node.prototype.insertBefore=function(n,r){"
            + "if(r&&r.parentNode!==this)return i.call(this,n,null);"
            + "return i.call(this,n,r);};"
            + "}"
            + "function swallow(e){if(!e)return false;var m=String(e.message||e);"
            + "return e.name==='NotFoundError'&&(m.indexOf('removeChild')!==-1||m.indexOf('insertBefore')!==-1);}"
            + "window.addEventListener('error',function(ev){if(swallow(ev.error)){ev.preventDefault();return true;}},true);"
            + "window.addEventListener('unhandledrejection',function(ev){if(swallow(ev.reason))ev.preventDefault();});"
            + "document.addEventListener('DOMContentLoaded',function(){var r=document.getElementById('root');if(r)r.replaceChildren();});"
            + "if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}"
            + "})();";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        createNotificationChannels();
        injectDomSafetyPatch();
    }

    private void injectDomSafetyPatch() {
        if (domSafetyInjected) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(
                webView,
                DOM_SAFETY_SCRIPT,
                Collections.singleton("*")
            );
            domSafetyInjected = true;
        }
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
