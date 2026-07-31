// Copyright (c) 2026, Vivek Choudhary and contributors
// For license information, please see license.txt

/**
 * MSG91 OTP widget for the Frappe Desk.
 *
 * Initialised with `exposeMethods: true`, so MSG91 shows no popup and instead
 * puts sendOtp / retryOtp / verifyOtp on `window`. Desk forms drive those from
 * their own dialogs.
 *
 * `verifyOtp` resolving only means MSG91 accepted the code — it returns a JWT
 * that the server must validate via `react_api.otp.verify`.
 */
frappe.provide("vms.otp");

(function () {
	const SCRIPT_URLS = [
		"https://verify.msg91.com/otp-provider.js",
		"https://verify.phone91.com/otp-provider.js",
	];

	/** MSG91 channel codes. Used only as a fallback if the widget omits one. */
	const CHANNEL_SMS = "11";
	const DEFAULTS = { otpLength: 6, channel: CHANNEL_SMS, isEmail: false };

	let readyPromise = null;
	let lastWidgetError = null;
	let widgetInfo = { ...DEFAULTS };

	/**
	 * Read the widget's real configuration from MSG91 instead of assuming it,
	 * so swapping to a widget with a different channel, identifier type or OTP
	 * length needs no code change.
	 */
	function readWidgetInfo() {
		let data = null;
		try {
			data = typeof window.getWidgetData === "function" ? window.getWidgetData() : null;
		} catch (e) {
			data = null;
		}
		if (!data) return { ...DEFAULTS };

		// Default-configuration widgets require a null channel; Custom ones
		// require the channel code passed explicitly.
		const isDefaultWidget = String(data.widgetType?.name || "").toLowerCase() === "default";
		return {
			otpLength: Number(data.otpLength) || DEFAULTS.otpLength,
			channel: isDefaultWidget ? null : String(data.globalDefaultChannel || CHANNEL_SMS),
			isEmail: String(data.processType?.name || "").toUpperCase() === "EMAIL",
		};
	}

	vms.otp.getWidgetInfo = () => ({ ...widgetInfo });

	function loadScript(index) {
		return new Promise((resolve, reject) => {
			if (window.initSendOTP) {
				resolve();
				return;
			}
			if (index >= SCRIPT_URLS.length) {
				reject(new Error(__("Could not load the OTP provider.")));
				return;
			}

			const script = document.createElement("script");
			script.src = SCRIPT_URLS[index];
			script.async = true;
			script.onload = () => resolve();
			// Fall through to the next mirror rather than failing outright.
			script.onerror = () => loadScript(index + 1).then(resolve, reject);
			document.head.appendChild(script);
		});
	}

	/**
	 * initSendOTP registers window.sendOtp/retryOtp/verifyOtp asynchronously —
	 * it fetches the widget's own config from MSG91 first — so the methods are
	 * not available the moment it returns. Poll until they appear.
	 */
	function waitForMethods(timeoutMs) {
		const deadline = Date.now() + (timeoutMs || 10000);
		return new Promise((resolve, reject) => {
			(function poll() {
				if (typeof window.sendOtp === "function" && typeof window.verifyOtp === "function") {
					resolve();
					return;
				}
				if (Date.now() > deadline) {
					reject(
						new Error(
							messageFrom(
								lastWidgetError,
								__(
									"The OTP widget did not start. Check that the Widget ID and Widget Token Auth in PA OTP SMS Settings match the MSG91 panel."
								)
							)
						)
					);
					return;
				}
				setTimeout(poll, 50);
			})();
		});
	}

	function init() {
		lastWidgetError = null;
		return frappe
			.call({ method: "visitor_management.react_api.otp.get_widget_config" })
			.then((r) => {
				const config = r.message || {};
				if (!config.enabled) {
					throw new Error(
						__("OTP is not configured. Set Widget ID and Auth Key in PA OTP SMS Settings.")
					);
				}
				return loadScript(0).then(() => {
					window.initSendOTP({
						widgetId: config.widget_id,
						tokenAuth: config.token_auth,
						exposeMethods: true,
						// success/failure are MANDATORY: initSendOTP throws
						// "success callback function missing !" without them, and
						// bails before creating the widget element — so the exposed
						// methods never appear. Per-call results come from the
						// callbacks passed to sendOtp/verifyOtp instead.
						success: () => {},
						failure: (err) => {
							lastWidgetError = err;
						},
					});
					return waitForMethods().then(() => {
						widgetInfo = readWidgetInfo();
					});
				});
			});
	}

	function ensureReady() {
		if (!readyPromise) {
			readyPromise = init().catch((err) => {
				// Let the next attempt retry instead of caching the failure.
				readyPromise = null;
				throw err;
			});
		}
		return readyPromise;
	}

	/**
	 * MSG91 requires a mobile identifier with country code and no "+", e.g.
	 * 919876543210 (mirrors normalize_mobile() on the server). Email-process
	 * widgets take the address as-is — stripping non-digits would destroy it.
	 */
	function toIdentifier(value) {
		const raw = String(value || "").trim();
		if (widgetInfo.isEmail) return raw;
		const digits = raw.replace(/\D/g, "");
		return digits.length === 10 ? "91" + digits : digits;
	}

	function messageFrom(data, fallback) {
		if (typeof data === "string") return data;
		if (data && typeof data === "object") {
			for (const key of ["message", "msg", "error"]) {
				if (typeof data[key] === "string") return data[key];
			}
		}
		return fallback;
	}

	function callWidget(invoke, fallbackError) {
		return new Promise((resolve, reject) => {
			invoke(
				(data) => resolve(data),
				(error) => reject(new Error(messageFrom(error, fallbackError)))
			);
		});
	}

	vms.otp.sendOtp = (mobile) =>
		ensureReady().then(() =>
			callWidget(
				(ok, fail) => window.sendOtp(toIdentifier(mobile), ok, fail),
				__("Could not send the OTP. Please try again.")
			)
		);

	/** Channel comes from the widget's own config: null for Default-configuration
	 *  widgets, the channel code (SMS 11, Voice 4, Email 3, WhatsApp 12) for Custom. */
	vms.otp.retryOtp = (channel) =>
		ensureReady().then(() =>
			callWidget(
				(ok, fail) => window.retryOtp(channel === undefined ? widgetInfo.channel : channel, ok, fail),
				__("Could not resend the OTP. Please try again.")
			)
		);

	/** Resolves with the JWT access token for server-side verification. */
	vms.otp.verifyOtp = (otp) =>
		ensureReady()
			.then(() =>
				callWidget(
					(ok, fail) => window.verifyOtp(otp, ok, fail),
					__("The OTP entered is incorrect.")
				)
			)
			.then((data) => {
				const token = messageFrom(data, "");
				if (!token) throw new Error(__("OTP verification did not return a token."));
				return token;
			});
})();
