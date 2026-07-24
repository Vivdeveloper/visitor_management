"""Visitor pass / QR API."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import get_datetime, get_url, now_datetime

from visitor_management.services.otp_service import is_mobile_verified, normalize_mobile, validate_mobile
from visitor_management.visitor_management.doctype.visitor_entry import visitor_entry as ve


def _validate_pass(token: str) -> dict:
	token = (token or "").strip()
	if not token:
		frappe.throw(_("Pass token is required"))
	if not frappe.db.exists("Visitor Entry", token):
		return {"valid": False, "reason": _("Invalid pass"), "pass": None}

	doc = frappe.get_doc("Visitor Entry", token)
	if doc.qr_expires_on and get_datetime(doc.qr_expires_on) < now_datetime():
		return {"valid": False, "reason": _("Pass has expired"), "pass": _payload(doc)}
	if doc.status not in ("Checked In", "Meeting Done"):
		return {"valid": False, "reason": _("Pass not valid for status: {0}").format(doc.status), "pass": _payload(doc)}
	return {"valid": True, "reason": _("Pass is valid"), "pass": _payload(doc)}


def _payload(doc) -> dict:
	return {
		"visitor_entry": doc.name,
		"full_name": doc.full_name,
		"photo": doc.photo,
		"visitor_company": doc.visitor_company,
		"person_to_meet_name": doc.person_to_meet_name,
		"host_name": doc.person_to_meet_name,
		"floor": doc.floor,
		"status": doc.status,
		"qr_expires_on": doc.qr_expires_on,
		"pass_url": doc.pass_url or get_url(f"/vms/pass/{doc.name}"),
	}


@frappe.whitelist()
def generate_pass(visitor_entry: str | None = None, force: int | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.generate_pass(visitor_entry, force=force)}


@frappe.whitelist()
def get_pass(name: str | None = None) -> dict:
	if not name:
		frappe.throw(_("Visitor Entry name is required"))
	doc = frappe.get_doc("Visitor Entry", name)
	return _payload(doc)


@frappe.whitelist(allow_guest=True)
def validate_pass(token: str | None = None) -> dict:
	return _validate_pass(token or "")


@frappe.whitelist(allow_guest=True)
def get_public_pass(token: str | None = None) -> dict:
	return _validate_pass(token or "")


@frappe.whitelist(allow_guest=True)
def list_my_passes(mobile: str | None = None) -> list:
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
		fields=["name", "full_name", "status", "pass_url", "qr_expires_on", "person_to_meet_name", "creation"],
		order_by="creation desc",
		limit_page_length=20,
	)
	for row in rows:
		if not row.get("pass_url"):
			row["pass_url"] = get_url(f"/vms/pass/{row['name']}")
		row["host_name"] = row.get("person_to_meet_name")
	return rows
