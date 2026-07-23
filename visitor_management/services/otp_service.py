"""OTP generation, SMS delivery, and verification (cache-backed)."""

from __future__ import annotations

import random

import frappe
from frappe import _
from frappe.utils import cstr


OTP_TTL_SEC = 300
VERIFIED_TTL_SEC = 1800


def normalize_mobile(mobile: str | None) -> str:
	mobile = cstr(mobile).strip()
	for char in (" ", "-", "(", ")", "+"):
		mobile = mobile.replace(char, "")

	if len(mobile) == 10 and mobile.isdigit():
		mobile = f"91{mobile}"

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


def is_sms_configured() -> bool:
	if not frappe.db.exists("DocType", "SMS Settings"):
		return False
	return bool(frappe.db.get_single_value("SMS Settings", "sms_gateway_url"))


def _send_sms(mobile: str, message: str) -> None:
	from frappe.core.doctype.sms_settings.sms_settings import send_sms

	send_sms([mobile], message, success_msg=False)


def generate_and_send_otp(mobile: str, purpose: str = "login") -> dict:
	"""Generate OTP, store in cache, send SMS (or return OTP in developer_mode)."""
	mobile = validate_mobile(mobile)
	purpose = cstr(purpose).strip() or "login"

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


def verify_otp(mobile: str, otp: str, purpose: str = "login") -> dict:
	"""Verify OTP and mark mobile as verified for a short window."""
	mobile = validate_mobile(mobile)
	purpose = cstr(purpose).strip() or "login"
	otp = cstr(otp).strip()

	if not otp:
		frappe.throw(_("OTP is required"))

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
