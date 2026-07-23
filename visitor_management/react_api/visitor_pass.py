"""Visitor pass / QR API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.services import pass_service


@frappe.whitelist()
def generate_pass(visitor_entry: str | None = None, force: int | None = None) -> dict:
	"""Generate or refresh encrypted QR pass for an approved visitor."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = pass_service.generate_pass_for_entry(visitor_entry, force=bool(force))
	return {"success": True, "message": _("QR pass ready."), **result}


@frappe.whitelist()
def get_pass(name: str | None = None) -> dict:
	"""Fetch pass details by Visitor Entry name."""
	if not name:
		frappe.throw(_("Visitor Entry name is required"))
	return pass_service.get_pass_by_entry(name)


@frappe.whitelist(allow_guest=True)
def validate_pass(token: str | None = None) -> dict:
	"""Validate a public QR token (expiry, status). Guest-allowed."""
	return pass_service.validate_qr_token(token or "")


@frappe.whitelist(allow_guest=True)
def get_public_pass(token: str | None = None) -> dict:
	"""Public pass payload for /vms/pass/<token> (same as validate, convenience alias)."""
	return pass_service.validate_qr_token(token or "")


@frappe.whitelist(allow_guest=True)
def list_my_passes(mobile: str | None = None) -> list:
	"""Visitor: list own passes after OTP login (verified mobile in cache)."""
	from visitor_management.services.otp_service import is_mobile_verified, normalize_mobile, validate_mobile

	mobile = validate_mobile(mobile or "")
	user = frappe.session.user
	allowed = False
	if user and user != "Guest":
		profile_mobile = normalize_mobile(frappe.db.get_value("User", user, "mobile_no"))
		if profile_mobile and profile_mobile[-10:] == mobile[-10:]:
			allowed = True
	if not allowed and is_mobile_verified(mobile, "login"):
		allowed = True
	if not allowed:
		frappe.throw(_("Verify OTP for this mobile to view passes."), frappe.PermissionError)

	last10 = mobile[-10:]
	rows = frappe.get_all(
		"Visitor Entry",
		filters={"mobile": ["like", f"%{last10}"]},
		fields=[
			"name",
			"full_name",
			"status",
			"pass_number",
			"qr_token",
			"pass_url",
			"qr_expires_on",
			"expected_meeting_time",
			"host_name",
			"building",
			"creation",
		],
		order_by="creation desc",
		limit_page_length=20,
	)
	for row in rows:
		if row.get("qr_token") and not row.get("pass_url"):
			row["pass_url"] = pass_service.get_public_pass_url(row["qr_token"])
	return rows
