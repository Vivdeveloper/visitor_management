"""Authentication API — OTP + Frappe session (no custom JWT)."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.auth.session import find_user_by_mobile, get_profile, login_as_user, logout_current
from visitor_management.services import otp_service


@frappe.whitelist(allow_guest=True)
def send_otp(mobile: str | None = None, purpose: str | None = None) -> dict:
	"""Send OTP to mobile. purpose: login | visitor_registration"""
	return otp_service.generate_and_send_otp(mobile or "", purpose or "login")


@frappe.whitelist(allow_guest=True)
def verify_otp(
	mobile: str | None = None,
	otp: str | None = None,
	purpose: str | None = None,
) -> dict:
	"""Verify OTP. Staff users get a Frappe session; unknown mobiles stay visitor-verified."""
	purpose = (purpose or "login").strip() or "login"
	result = otp_service.verify_otp(mobile or "", otp or "", purpose)

	user = find_user_by_mobile(result["mobile"])
	if user:
		login_as_user(user)
		profile = get_profile(user)
		return {
			**result,
			**profile,
			"message": _("OTP verified. Logged in successfully."),
		}

	# Visitor / unknown mobile — verified flag in cache; no Frappe User session
	return {
		**result,
		"authenticated": False,
		"session_type": "visitor",
		"user": None,
		"roles": ["Visitor"],
		"vms_roles": ["Visitor"],
		"csrf_token": frappe.sessions.get_csrf_token(),
		"message": _("OTP verified. Continue as visitor."),
	}


@frappe.whitelist(allow_guest=True)
def verify_widget_token(
	access_token: str | None = None,
	mobile: str | None = None,
	purpose: str | None = None,
) -> dict:
	"""Validate a MSG91 Widget JWT access-token server-side (uses AuthKey — never exposed to browser).

	Flow:
	  1. PWA calls MSG91 /widget/initiate  → gets reqId (Widget Token, browser-safe)
	  2. PWA calls MSG91 /widget/verifyOtp → gets JWT access-token
	  3. PWA calls this endpoint with the JWT
	  4. We validate with MSG91 /widget/validateToken using the server-side AuthKey
	  5. On success we mark the mobile as verified and (if a staff user) log them in.
	"""
	purpose = (purpose or "visitor_registration").strip() or "visitor_registration"
	result = otp_service.verify_and_exchange_widget_token(
		access_token or "", mobile or "", purpose
	)

	user = find_user_by_mobile(result["mobile"])
	if user:
		login_as_user(user)
		profile = get_profile(user)
		return {
			**result,
			**profile,
			"message": _("OTP verified. Logged in successfully."),
		}

	# Visitor / unknown mobile
	return {
		**result,
		"authenticated": False,
		"session_type": "visitor",
		"user": None,
		"roles": ["Visitor"],
		"vms_roles": ["Visitor"],
		"csrf_token": frappe.sessions.get_csrf_token(),
		"message": _("OTP verified. Continue as visitor."),
	}


@frappe.whitelist(allow_guest=True)
def me() -> dict:
	"""Current session profile (Guest-safe)."""
	return get_profile()


@frappe.whitelist(allow_guest=True)
def logout() -> dict:
	"""End Frappe session."""
	logout_current()
	return {"success": True, "message": _("Logged out"), "authenticated": False}


@frappe.whitelist(allow_guest=True)
def login_with_password(usr: str | None = None, pwd: str | None = None) -> dict:
	"""Login using Frappe / ERPNext username or email and password."""
	if not usr or not pwd:
		frappe.throw(_("Username/Email and Password are required"))

	login_manager = frappe.auth.LoginManager()
	try:
		login_manager.authenticate(usr.strip(), pwd)
		login_manager.post_login()
	except frappe.AuthenticationError:
		# Return JSON instead of re-raising — local Frappe error handler can abort
		# the HTTP response (missing `sys` import) which the SPA shows as "Network Error".
		frappe.local.response["http_status_code"] = 401
		return {
			"success": False,
			"authenticated": False,
			"message": _("Invalid ERPNext username or password"),
		}

	profile = get_profile(frappe.session.user)
	return {
		"success": True,
		**profile,
		"message": _("Logged in successfully."),
	}


@frappe.whitelist(allow_guest=True)
def get_csrf_token() -> str:
	"""CSRF token for SPA after login without full page reload."""
	return frappe.sessions.get_csrf_token()
