// Copyright (c) 2026, Vivek Choudhary and contributors
// For license information, please see license.txt

/**
 * Urgent VMS alert sound + dialog on Frappe Desk.
 *
 * Listens to the same realtime channels as the PWA:
 * - vms_host_alert (Pending / Checked In / Cancelled → Host)
 * - vms_creator_alert (Approved / Rejected / Meeting Done → Creator)
 * - vms_security_alert (Meeting Done checkout → Security)
 *
 * Multi-tab: only one tab plays sound; Stop / Open stops sound in every tab.
 */
frappe.provide("vms.desk_alerts");

(function () {
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
		ctx.resume().catch(() => undefined);
	}

	/** Strong Tawk-like attention chime (matches PWA hostAlertManager). */
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
				{ freq: 1174.7, start: 0.82, duration: 0.18, type: "square", peak: 0.5 },
			];

			tones.forEach(({ freq, start, duration, type, peak }) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				const filter = ctx.createBiquadFilter();
				osc.type = type;
				osc.frequency.setValueAtTime(freq, now + start);
				filter.type = "lowpass";
				filter.frequency.setValueAtTime(4200, now + start);
				gain.gain.setValueAtTime(0.0001, now + start);
				gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + start + 0.015);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
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
		ctx.resume().then(playTones).catch(() => undefined);
	}

	function broadcast(msg) {
		const payload = { ...msg, tab: TAB_ID, at: Date.now() };
		if (channel) {
			try {
				channel.postMessage(payload);
			} catch (e) {
				/* ignore */
			}
		}
		try {
			localStorage.setItem(BUS_KEY, JSON.stringify(payload));
			// StorageEvent only fires in *other* tabs; clear so next write still triggers.
			localStorage.removeItem(BUS_KEY);
		} catch (e) {
			/* ignore */
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
				/* ignore */
			}
		}
	}

	/**
	 * Only one Desk tab may own the repeating sound.
	 * Prefer a visible tab; hide-background tabs never claim.
	 */
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
				if (
					prev &&
					prev.key === alertKey &&
					prev.tab &&
					prev.tab !== TAB_ID &&
					now - (prev.at || 0) < 4000
				) {
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
		const status = (data && data.status) || "";
		const lifecycle = (data && data.lifecycle_event) || (data && data.event) || "";
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
		// Only the sound-owner / visible tab should spawn OS notifications.
		if (document.visibilityState !== "visible") {
			return;
		}
		if (!("Notification" in window) || Notification.permission !== "granted") {
			return;
		}
		try {
			const n = new Notification(title, {
				body: body,
				tag: tag || "vms-desk-alert",
				requireInteraction: true,
			});
			n.onclick = () => {
				window.focus();
				n.close();
			};
		} catch (e) {
			/* ignore */
		}
	}

	function dismissDialogLocal() {
		if (activeDialog) {
			try {
				activeDialog.hide();
			} catch (e) {
				/* ignore */
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
			// Another visible tab owns sound — silence this tab.
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
				/* ignore */
			}
		});
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				// Background tab must not keep ringing if it somehow owns the timer.
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
		const message =
			data.message || __("{0} needs your attention.", [visitorName]);
		const title = titleFor(kind, data);
		const key = `${kind}:${visitorEntry}:${title}`;
		const now = Date.now();
		// Debounce duplicate socket fan-out within 2s (same tab)
		if (key === lastKey && now - lastAt < 2000) {
			return;
		}
		lastKey = key;
		lastAt = now;

		primeAudio();
		// Sound only in one visible tab; other tabs still get a quiet toast.
		startRing(key);

		frappe.show_alert(
			{
				message: `<b>${frappe.utils.escape_html(title)}</b><br>${frappe.utils.escape_html(
					message
				)}`,
				indicator: kind === "security" ? "blue" : "orange",
			},
			15
		);

		showBrowserNotification(title, message, `vms-desk-${visitorEntry || kind}`);

		// Dialog only on the visible focused tab to avoid stacked modals.
		if (document.visibilityState !== "visible") {
			return;
		}

		dismissDialogLocal();

		const d = new frappe.ui.Dialog({
			title: title,
			fields: [
				{
					fieldtype: "HTML",
					options: `<div style="padding:4px 2px 8px;">
						<p style="margin:0 0 8px;font-size:15px;font-weight:600;">${frappe.utils.escape_html(
							visitorName
						)}</p>
						<p style="margin:0;color:var(--text-muted);">${frappe.utils.escape_html(message)}</p>
					</div>`,
				},
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
			},
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
	// Desk may already be ready when this bundle loads after a soft reload.
	if (window.frappe && frappe.session && frappe.session.user && frappe.session.user !== "Guest") {
		setTimeout(boot, 0);
	}
})();
