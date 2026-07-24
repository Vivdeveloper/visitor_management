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
	login_manager.authenticate(usr.strip(), pwd)
	login_manager.post_login()

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
