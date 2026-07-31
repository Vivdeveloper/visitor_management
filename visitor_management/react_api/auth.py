"""Authentication API — Frappe session (no custom JWT).

OTP lives in :mod:`visitor_management.react_api.otp`."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.auth.session import get_profile, logout_current


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
