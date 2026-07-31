"""OTP generation, SMS delivery, and verification (cache-backed)."""

from __future__ import annotations

import random

# pyrefly: ignore [missing-import]
import frappe
# pyrefly: ignore [missing-import]
from frappe import _
# pyrefly: ignore [missing-import]
from frappe.utils import cstr


OTP_TTL_SEC = 300
VERIFIED_TTL_SEC = 1800


def normalize_mobile(mobile: str | None) -> str:
	mobile = cstr(mobile).strip()
	for char in (" ", "-", "(", ")", "+"):
		mobile = mobile.replace(char, "")

	# If 12 digits starting with 91 (e.g. 919156880887), strip leading 91 -> 10 digits
	if len(mobile) == 12 and mobile.startswith("91"):
		mobile = mobile[2:]

	return mobile



def validate_mobile(mobile: str) -> str:
	mobile = normalize_mobile(mobile)
	if not mobile or not mobile.isdigit() or len(mobile) < 10:
		frappe.throw(_("Please enter a valid mobile number"))
	return mobile


def _otp_key(purpose: str, mobile: str) -> str:
	return f"vms_otp:{purpose}:{mobile}"


def _verified_key(purpose: str, mobile: str) -> str:
	return f"vms_otp_verified:{purpose}:{mobile}"


def _widget_req_key(purpose: str, mobile: str) -> str:
	"""Cache key for the MSG91 Widget reqId (pending OTP session)."""
	return f"vms_widget_req:{purpose}:{mobile}"


def is_widget_configured() -> bool:
	"""True when MSG91 Widget credentials are present in site_config."""
	return bool(frappe.conf.get("msg91_widget_id") and frappe.conf.get("msg91_widget_token"))


def is_sms_configured() -> bool:
	if not frappe.db.exists("DocType", "SMS Settings"):
		return False
	return bool(frappe.db.get_single_value("SMS Settings", "sms_gateway_url"))


def _send_sms(mobile: str, message: str) -> None:
	# pyrefly: ignore [missing-import]
	from frappe.core.doctype.sms_settings.sms_settings import send_sms

	send_sms([mobile], message, success_msg=False)


def send_sms(mobile: str, message: str) -> None:
	"""Public SMS helper used by gate-pass and other callers."""
	_send_sms(mobile, message)


def _send_via_widget(mobile: str, purpose: str) -> dict:
	"""Send OTP via MSG91 Widget API — server-side (no browser CORS issues)."""
	import requests as _requests

	widget_id = frappe.conf.get("msg91_widget_id")
	widget_token = frappe.conf.get("msg91_widget_token")

	try:
		resp = _requests.post(
			"https://api.msg91.com/api/v5/widget/sendOtp",
			headers={"Content-Type": "application/json"},
			json={"mobile": mobile, "widgetId": widget_id, "tokenAuth": widget_token},
			timeout=10,
		)
	except _requests.RequestException as exc:
		frappe.log_error(title="VMS MSG91 Widget sendOtp failed", message=str(exc))
		frappe.throw(_("Could not reach MSG91 to send OTP. Please try again."))

	try:
		data = resp.json()
	except Exception:
		frappe.throw(_("Unexpected response from MSG91. Please try again."))

	if not resp.ok or data.get("type") == "error":
		msg = data.get("message") or data.get("msg") or "Failed to send OTP via MSG91"
		frappe.throw(_(msg))

	# MSG91 returns reqId in response
	req_id = (
		data.get("reqId")
		or data.get("request_id")
		or data.get("requestId")
		or (data.get("message") if isinstance(data.get("message"), str) and len(data.get("message", "")) > 10 else None)
	)
	if not req_id:
		frappe.log_error(title="VMS MSG91 Widget: no reqId in response", message=str(data))
		frappe.throw(_("MSG91 did not return a session ID. Please try again."))

	# Store reqId in Redis for use during OTP verification
	frappe.cache.set_value(_widget_req_key(purpose, mobile), req_id, expires_in_sec=OTP_TTL_SEC)

	frappe.logger().info("VMS MSG91 Widget OTP sent for %s (purpose=%s)", mobile, purpose)
	return {
		"success": True,
		"mobile": mobile,
		"purpose": purpose,
		"message": _("OTP sent successfully"),
		"expires_in": OTP_TTL_SEC,
	}



def generate_and_send_otp(mobile: str, purpose: str = "login") -> dict:
	"""Send OTP via MSG91 Widget API (preferred) or Frappe SMS Settings (fallback)."""
	mobile = validate_mobile(mobile)
	purpose = cstr(purpose).strip() or "login"

	# Prefer MSG91 Widget API (server-side call — no browser CORS, no Frappe SMS config needed)
	if is_widget_configured():
		return _send_via_widget(mobile, purpose)

	# ── Fallback: generate OTP locally and deliver via Frappe SMS Settings ────
	otp = str(random.randint(100000, 999999))
	frappe.cache.set_value(_otp_key(purpose, mobile), otp, expires_in_sec=OTP_TTL_SEC)

	response: dict = {
		"success": True,
		"mobile": mobile,
		"purpose": purpose,
		"message": _("OTP sent successfully"),
		"expires_in": OTP_TTL_SEC,
	}

	sms_message = _("Your Visitor Management OTP is {0}. Valid for 5 minutes.").format(otp)

	try:
		if is_sms_configured():
			_send_sms(mobile, sms_message)
		elif frappe.conf.developer_mode:
			response["message"] = _("SMS gateway not configured. Use the OTP shown below.")
			response["otp"] = otp
		else:
			frappe.throw(
				_(
					"SMS gateway is not configured. Please configure SMS Settings "
					"or contact your administrator."
				)
			)
	except frappe.ValidationError:
		raise
	except Exception:
		frappe.log_error(title="VMS OTP SMS Failed")
		if frappe.conf.developer_mode:
			response["message"] = _("SMS delivery failed. Use the OTP shown below for testing.")
			response["otp"] = otp
		else:
			frappe.throw(_("Failed to send OTP SMS. Please try again or contact support."))

	frappe.logger().info("VMS OTP (%s) for %s: %s", purpose, mobile, otp)
	return response


def _verify_via_widget(mobile: str, otp: str, purpose: str) -> dict:
	"""Verify OTP via MSG91 Widget API and validate the returned JWT server-side."""
	import requests as _requests

	req_id = frappe.cache.get_value(_widget_req_key(purpose, mobile))
	if not req_id:
		frappe.throw(_("No OTP session found. Please go back and request a new OTP."))

	try:
		resp = _requests.post(
			"https://api.msg91.com/api/v5/widget/verifyOtp",
			headers={"Content-Type": "application/json"},
			json={"reqId": req_id, "otp": otp},
			timeout=10,
		)
	except _requests.RequestException as exc:
		frappe.log_error(title="VMS MSG91 Widget verifyOtp failed", message=str(exc))
		frappe.throw(_("Could not reach MSG91 to verify OTP. Please try again."))

	try:
		data = resp.json()
	except Exception:
		frappe.throw(_("Unexpected response from MSG91. Please try again."))

	if not resp.ok or data.get("type") == "error":
		msg = data.get("message") or data.get("msg") or "Invalid OTP"
		frappe.throw(_(msg))

	access_token = data.get("access-token") or data.get("accessToken")
	if not access_token:
		frappe.log_error(title="VMS MSG91 Widget: no access-token in verifyOtp response", message=str(data))
		frappe.throw(_("OTP accepted but no access token returned. Please try again."))

	# Clean up reqId — one-time use
	frappe.cache.delete_value(_widget_req_key(purpose, mobile))

	# Validate the JWT with AuthKey (server-side) and mark mobile as verified
	return verify_and_exchange_widget_token(access_token, mobile, purpose)


def verify_otp(mobile: str, otp: str, purpose: str = "login") -> dict:
	"""Verify OTP via MSG91 Widget API (preferred) or Redis cache (fallback)."""
	mobile = validate_mobile(mobile)
	purpose = cstr(purpose).strip() or "login"
	otp = cstr(otp).strip()

	if not otp:
		frappe.throw(_("OTP is required"))

	# Prefer MSG91 Widget verification when widget is configured
	if is_widget_configured():
		return _verify_via_widget(mobile, otp, purpose)

	# ── Fallback: Redis cache check ───────────────────────────────────────────
	stored = frappe.cache.get_value(_otp_key(purpose, mobile))
	if not stored or cstr(stored) != otp:
		frappe.throw(_("Invalid OTP"))

	frappe.cache.delete_value(_otp_key(purpose, mobile))
	frappe.cache.set_value(_verified_key(purpose, mobile), 1, expires_in_sec=VERIFIED_TTL_SEC)

	return {
		"verified": True,
		"mobile": mobile,
		"purpose": purpose,
		"message": _("OTP verified successfully"),
	}


def is_mobile_verified(mobile: str, purpose: str = "login") -> bool:
	mobile = normalize_mobile(mobile)
	if not mobile:
		return False
	return bool(frappe.cache.get_value(_verified_key(purpose, mobile)))


def clear_mobile_verified(mobile: str, purpose: str = "login") -> None:
	mobile = normalize_mobile(mobile)
	if mobile:
		frappe.cache.delete_value(_verified_key(purpose, mobile))


def verify_and_exchange_widget_token(access_token: str, mobile: str, purpose: str = "visitor_registration") -> dict:
	"""Validate a MSG91 Widget JWT access-token server-side using the AuthKey.

	The AuthKey (msg91_auth_key) is read from site_config.json and is NEVER
	sent to the browser — it stays on the server for this validation call only.

	On success:
	  - The verified mobile is marked as OTP-verified in Redis cache.
	  - Returns the same dict shape as verify_otp() so callers are interchangeable.
	"""
	import requests as _requests

	if not access_token:
		frappe.throw(_("Access token is required"))

	auth_key = frappe.conf.get("msg91_auth_key")
	if not auth_key:
		frappe.throw(
			_(
				"MSG91 auth key (msg91_auth_key) is not configured in site_config.json. "
				"Please add it and restart the bench."
			)
		)

	purpose = (purpose or "visitor_registration").strip() or "visitor_registration"

	try:
		resp = _requests.post(
			"https://control.msg91.com/api/v5/widget/validateToken",
			headers={
				"authkey": auth_key,
				"Content-Type": "application/json",
			},
			json={"access-token": access_token},
			timeout=10,
		)
	except _requests.RequestException as exc:
		frappe.log_error(title="VMS MSG91 Widget validateToken failed", message=str(exc))
		frappe.throw(_("Could not reach MSG91 to validate OTP. Please try again."))

	try:
		data = resp.json()
	except Exception:
		frappe.throw(_("Unexpected response from MSG91 OTP service. Please try again."))

	if not resp.ok or data.get("type") == "error":
		msg = data.get("message") or data.get("msg") or "Invalid or expired OTP token"
		frappe.throw(_(msg))

	# MSG91 returns the verified mobile in the response; fall back to the caller-supplied value.
	verified_mobile = (
		data.get("mobile")
		or data.get("identifier")
		or normalize_mobile(mobile)
	)
	if not verified_mobile:
		frappe.throw(_("Could not determine verified mobile from MSG91 response"))

	verified_mobile = normalize_mobile(verified_mobile)

	# Mark mobile as OTP-verified in cache (same window as the regular OTP path)
	frappe.cache.set_value(_verified_key(purpose, verified_mobile), 1, expires_in_sec=VERIFIED_TTL_SEC)

	frappe.logger().info(
		"VMS MSG91 Widget token validated for %s (purpose=%s)", verified_mobile, purpose
	)

	return {
		"verified": True,
		"mobile": verified_mobile,
		"purpose": purpose,
		"message": _("OTP verified successfully via MSG91 Widget"),
	}

