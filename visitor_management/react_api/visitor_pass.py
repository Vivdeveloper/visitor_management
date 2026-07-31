"""Visitor pass / QR API."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import get_datetime, now_datetime

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
	"""Return pass fields from Visitor Entry only — never invent pass_url here."""
	return {
		"visitor_entry": doc.name,
		"name": doc.name,
		"full_name": doc.full_name,
		"photo": doc.photo,
		"mobile": doc.mobile,
		"visitor_company": doc.visitor_company,
		"person_to_meet_name": doc.person_to_meet_name,
		"host_name": doc.person_to_meet_name,
		"floor": doc.floor,
		"status": doc.status,
		"qr_expires_on": doc.qr_expires_on,
		"checked_in_on": doc.get("checked_in_on"),
		"pass_url": doc.get("pass_url"),
	}


@frappe.whitelist()
def generate_pass(visitor_entry: str | None = None, force: int | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.generate_pass(visitor_entry, force=force)}


@frappe.whitelist()
def send_pass_to_mobile(visitor_entry: str | None = None, mobile: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	target_mobile = mobile or doc.mobile or ""
	# Generation must go through Visitor Entry Python helper
	pass_info = ve.generate_pass(visitor_entry)
	pass_url = pass_info.get("pass_url")
	if not pass_url:
		frappe.throw(_("Gate pass could not be generated."))

	try:
		from visitor_management.services.otp_service import send_sms
		send_sms(target_mobile, f"Your Gate Pass link for Precious Alloys: {pass_url}")
	except Exception:
		pass

	return {
		"success": True,
		"message": f"Gate pass sent to {target_mobile}",
		"mobile": target_mobile,
		"pass_url": pass_url,
	}


@frappe.whitelist()
def get_pass(name: str | None = None) -> dict:
	"""Load gate pass for display. Creates pass via Visitor Entry Python if missing."""
	if not name:
		frappe.throw(_("Visitor Entry name is required"))
	if not frappe.db.exists("Visitor Entry", name):
		frappe.throw(_("Visitor Entry {0} not found").format(name))

	doc = frappe.get_doc("Visitor Entry", name)
	# Only Python generate_pass / _assign_gate_pass may create pass_url
	if not doc.get("pass_url"):
		ve.generate_pass(name)
		doc.reload()

	if not doc.get("pass_url"):
		frappe.throw(_("Gate pass was not generated for {0}").format(name))

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
		# Do not invent pass URLs in Python list — only return DB value from generate_pass
		row["host_name"] = row.get("person_to_meet_name")
	return rows
