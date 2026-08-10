(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // ../visitor_management/visitor_management/public/js/vms_desk_alerts.bundle.js
  frappe.provide("vms.desk_alerts");
  (function() {
    const RING_INTERVAL_MS = 2200;
    const BUS_KEY = "vms_desk_alerts_bus";
    const CLAIM_KEY = "vms_desk_alert_claim";
    const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    let audioCtx = null;
    let ringTimer = null;
    let activeDialog = null;
    let lastKey = "";
    let lastAt = 0;
    let booted = false;
    let channel = null;
    function getAudioContext() {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      if (!audioCtx) {
        audioCtx = new Ctx();
      }
      return audioCtx;
    }
    function primeAudio() {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === "running") {
        return;
      }
      ctx.resume().catch(() => void 0);
    }
    function playAlertSound() {
      primeAudio();
      const ctx = getAudioContext();
      if (!ctx) {
        return;
      }
      const playTones = () => {
        const now = ctx.currentTime;
        const tones = [
          { freq: 1046.5, start: 0, duration: 0.12, type: "square", peak: 0.42 },
          { freq: 1318.5, start: 0.14, duration: 0.12, type: "square", peak: 0.48 },
          { freq: 1568, start: 0.28, duration: 0.16, type: "square", peak: 0.55 },
          { freq: 784, start: 0.5, duration: 0.28, type: "sawtooth", peak: 0.38 },
          { freq: 1174.7, start: 0.82, duration: 0.18, type: "square", peak: 0.5 }
        ];
        tones.forEach(({ freq, start, duration, type, peak }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, now + start);
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(4200, now + start);
          gain.gain.setValueAtTime(1e-4, now + start);
          gain.gain.exponentialRampToValueAtTime(Math.max(1e-3, peak), now + start + 0.015);
          gain.gain.exponentialRampToValueAtTime(1e-4, now + start + duration);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + start);
          osc.stop(now + start + duration + 0.03);
        });
      };
      if (ctx.state === "running") {
        playTones();
        return;
      }
      ctx.resume().then(playTones).catch(() => void 0);
    }
    function broadcast(msg) {
      const payload = __spreadProps(__spreadValues({}, msg), { tab: TAB_ID, at: Date.now() });
      if (channel) {
        try {
          channel.postMessage(payload);
        } catch (e) {
        }
      }
      try {
        localStorage.setItem(BUS_KEY, JSON.stringify(payload));
        localStorage.removeItem(BUS_KEY);
      } catch (e) {
      }
    }
    function stopRingLocal() {
      if (ringTimer) {
        clearInterval(ringTimer);
        ringTimer = null;
      }
    }
    function stopRing(opts) {
      const fromPeer = Boolean(opts && opts.fromPeer);
      stopRingLocal();
      if (!fromPeer) {
        broadcast({ type: "stop" });
        try {
          localStorage.removeItem(CLAIM_KEY);
        } catch (e) {
        }
      }
    }
    function tryClaimSound(alertKey) {
      const visible = document.visibilityState === "visible";
      if (!visible) {
        return false;
      }
      const now = Date.now();
      try {
        const raw = localStorage.getItem(CLAIM_KEY);
        if (raw) {
          const prev = JSON.parse(raw);
          if (prev && prev.key === alertKey && prev.tab && prev.tab !== TAB_ID && now - (prev.at || 0) < 4e3) {
            return false;
          }
        }
        localStorage.setItem(
          CLAIM_KEY,
          JSON.stringify({ tab: TAB_ID, key: alertKey, at: now })
        );
        broadcast({ type: "claim", key: alertKey });
        return true;
      } catch (e) {
        return visible;
      }
    }
    function startRing(alertKey) {
      if (!tryClaimSound(alertKey)) {
        return;
      }
      stopRingLocal();
      playAlertSound();
      ringTimer = setInterval(playAlertSound, RING_INTERVAL_MS);
    }
    function titleFor(kind, data) {
      const status = data && data.status || "";
      const lifecycle = data && data.lifecycle_event || data && data.event || "";
      if (kind === "security") {
        return __("Visitor ready for checkout");
      }
      if (kind === "creator") {
        if (lifecycle === "approved" || status === "Approved") {
          return __("Visitor approved");
        }
        if (lifecycle === "rejected" || status === "Rejected") {
          return __("Visitor rejected");
        }
        if (lifecycle === "meeting_done" || status === "Meeting Done") {
          return __("Meeting completed");
        }
        return __("Visitor update");
      }
      if (lifecycle === "checked_in" || status === "Checked In") {
        return __("Visitor checked in");
      }
      if (lifecycle === "cancelled" || status === "Cancelled") {
        return __("Visit cancelled");
      }
      return __("Visitor waiting at gate");
    }
    function showBrowserNotification(title, body, tag) {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
      }
      try {
        const n = new Notification(title, {
          body,
          tag: tag || "vms-desk-alert",
          requireInteraction: true
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (e) {
      }
    }
    function dismissDialogLocal() {
      if (activeDialog) {
        try {
          activeDialog.hide();
        } catch (e) {
        }
        activeDialog = null;
      }
    }
    function openVisitor(visitorEntry) {
      stopRing();
      dismissDialogLocal();
      broadcast({ type: "dismiss" });
      if (visitorEntry) {
        frappe.set_route("Form", "Visitor Entry", visitorEntry);
      }
    }
    function handlePeerMessage(msg) {
      if (!msg || msg.tab === TAB_ID) {
        return;
      }
      if (msg.type === "stop" || msg.type === "dismiss") {
        stopRing({ fromPeer: true });
        if (msg.type === "dismiss") {
          dismissDialogLocal();
        }
        return;
      }
      if (msg.type === "claim" && msg.key) {
        stopRingLocal();
      }
    }
    function bindCrossTabBus() {
      if (typeof BroadcastChannel !== "undefined") {
        try {
          channel = new BroadcastChannel("vms_desk_alerts");
          channel.onmessage = (ev) => handlePeerMessage(ev.data);
        } catch (e) {
          channel = null;
        }
      }
      window.addEventListener("storage", (ev) => {
        if (ev.key !== BUS_KEY || !ev.newValue) {
          return;
        }
        try {
          handlePeerMessage(JSON.parse(ev.newValue));
        } catch (e) {
        }
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          stopRingLocal();
        }
      });
    }
    function handleAlert(data, kind) {
      if (!data || frappe.session.user === "Guest") {
        return;
      }
      const visitorEntry = data.visitor_entry || "";
      const visitorName = data.visitor_name || visitorEntry || __("Visitor");
      const message = data.message || __("{0} needs your attention.", [visitorName]);
      const title = titleFor(kind, data);
      const key = `${kind}:${visitorEntry}:${title}`;
      const now = Date.now();
      if (key === lastKey && now - lastAt < 2e3) {
        return;
      }
      lastKey = key;
      lastAt = now;
      primeAudio();
      startRing(key);
      frappe.show_alert(
        {
          message: `<b>${frappe.utils.escape_html(title)}</b><br>${frappe.utils.escape_html(
            message
          )}`,
          indicator: kind === "security" ? "blue" : "orange"
        },
        15
      );
      showBrowserNotification(title, message, `vms-desk-${visitorEntry || kind}`);
      if (document.visibilityState !== "visible") {
        return;
      }
      dismissDialogLocal();
      const d = new frappe.ui.Dialog({
        title,
        fields: [
          {
            fieldtype: "HTML",
            options: `<div style="padding:4px 2px 8px;">
						<p style="margin:0 0 8px;font-size:15px;font-weight:600;">${frappe.utils.escape_html(
              visitorName
            )}</p>
						<p style="margin:0;color:var(--text-muted);">${frappe.utils.escape_html(message)}</p>
					</div>`
          }
        ],
        primary_action_label: visitorEntry ? __("Open Visitor Entry") : __("OK"),
        primary_action() {
          openVisitor(visitorEntry);
        },
        secondary_action_label: __("Stop sound"),
        secondary_action() {
          stopRing();
          broadcast({ type: "dismiss" });
          d.hide();
          activeDialog = null;
        }
      });
      d.$wrapper.on("hidden.bs.modal", () => {
        stopRing();
        if (activeDialog === d) {
          activeDialog = null;
        }
      });
      activeDialog = d;
      d.show();
    }
    function bindRealtime() {
      if (!frappe.realtime || !frappe.realtime.on) {
        return;
      }
      frappe.realtime.on("vms_host_alert", (data) => handleAlert(data, "host"));
      frappe.realtime.on("vms_creator_alert", (data) => handleAlert(data, "creator"));
      frappe.realtime.on("vms_security_alert", (data) => handleAlert(data, "security"));
    }
    function boot() {
      if (booted) {
        return;
      }
      if (!frappe.session || !frappe.session.user || frappe.session.user === "Guest") {
        return;
      }
      booted = true;
      document.addEventListener("pointerdown", primeAudio, { once: true });
      document.addEventListener("keydown", primeAudio, { once: true });
      bindCrossTabBus();
      bindRealtime();
      vms.desk_alerts.play = playAlertSound;
      vms.desk_alerts.stop = () => stopRing();
      vms.desk_alerts.prime = primeAudio;
    }
    $(document).on("app_ready", boot);
    if (window.frappe && frappe.session && frappe.session.user && frappe.session.user !== "Guest") {
      setTimeout(boot, 0);
    }
  })();
})();
//# sourceMappingURL=vms_desk_alerts.bundle.QPKYYIEF.js.map
