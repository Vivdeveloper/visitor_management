(() => {
  var __defProp = Object.defineProperty;
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

  // ../visitor_management/visitor_management/public/js/msg91_widget.bundle.js
  frappe.provide("vms.otp");
  (function() {
    const SCRIPT_URLS = [
      "https://verify.msg91.com/otp-provider.js",
      "https://verify.phone91.com/otp-provider.js"
    ];
    const CHANNEL_SMS = "11";
    const DEFAULTS = { otpLength: 6, channel: CHANNEL_SMS, isEmail: false };
    let readyPromise = null;
    let lastWidgetError = null;
    let widgetInfo = __spreadValues({}, DEFAULTS);
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
        script.onerror = () => loadScript(index + 1).then(resolve, reject);
        document.head.appendChild(script);
      });
    }
    function waitForMethods(timeoutMs) {
      const deadline = Date.now() + (timeoutMs || 1e4);
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
    function readWidgetInfo() {
      var _a, _b;
      let data = null;
      try {
        data = typeof window.getWidgetData === "function" ? window.getWidgetData() : null;
      } catch (e) {
        data = null;
      }
      if (!data)
        return __spreadValues({}, DEFAULTS);
      const isDefaultWidget = String(((_a = data.widgetType) == null ? void 0 : _a.name) || "").toLowerCase() === "default";
      return {
        otpLength: Number(data.otpLength) || DEFAULTS.otpLength,
        channel: isDefaultWidget ? null : String(data.globalDefaultChannel || CHANNEL_SMS),
        isEmail: String(((_b = data.processType) == null ? void 0 : _b.name) || "").toUpperCase() === "EMAIL"
      };
    }
    function init() {
      lastWidgetError = null;
      return frappe.call({ method: "visitor_management.react_api.otp.get_widget_config" }).then((r) => {
        const config = r.message || {};
        if (!config.enabled) {
          throw new Error(
            __("OTP is not configured. Set Auth Key, Widget ID and Widget Token Auth in PA OTP SMS Settings.")
          );
        }
        return loadScript(0).then(() => {
          window.initSendOTP({
            widgetId: config.widget_id,
            tokenAuth: config.token_auth,
            exposeMethods: true,
            success: () => {
            },
            failure: (err) => {
              lastWidgetError = err;
            }
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
          readyPromise = null;
          throw err;
        });
      }
      return readyPromise;
    }
    function toIdentifier(value) {
      const raw = String(value || "").trim();
      if (widgetInfo.isEmail)
        return raw;
      const digits = raw.replace(/\D/g, "");
      return digits.length === 10 ? "91" + digits : digits;
    }
    function messageFrom(data, fallback) {
      if (typeof data === "string")
        return data;
      if (data && typeof data === "object") {
        for (const key of ["message", "msg", "error"]) {
          if (typeof data[key] === "string")
            return data[key];
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
    vms.otp.getWidgetInfo = () => __spreadValues({}, widgetInfo);
    vms.otp.sendOtp = (mobile) => ensureReady().then(
      () => callWidget(
        (ok, fail) => window.sendOtp(toIdentifier(mobile), ok, fail),
        __("Could not send the OTP. Please try again.")
      )
    );
    vms.otp.retryOtp = (channel) => ensureReady().then(
      () => callWidget(
        (ok, fail) => window.retryOtp(channel === void 0 ? widgetInfo.channel : channel, ok, fail),
        __("Could not resend the OTP. Please try again.")
      )
    );
    vms.otp.verifyOtp = (otp) => ensureReady().then(
      () => callWidget(
        (ok, fail) => window.verifyOtp(otp, ok, fail),
        __("The OTP entered is incorrect.")
      )
    ).then((data) => {
      const token = messageFrom(data, "");
      if (!token)
        throw new Error(__("OTP verification did not return a token."));
      return token;
    });
  })();
})();
//# sourceMappingURL=msg91_widget.bundle.XTO7FFPR.js.map
