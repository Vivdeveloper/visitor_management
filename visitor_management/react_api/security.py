"""Security / reception gate operations API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.visitor_management.doctype.visitor_entry import visitor_entry as ve
from visitor_management.react_api.visitor_pass import _validate_pass


def _ensure_gate() -> None:
	if "System Manager" not in frappe.get_roles():
		frappe.throw(_("Only System Manager can perform gate operations for now."))


@frappe.whitelist()
def scan_qr(token: str | None = None) -> dict:
	_ensure_gate()
	result = _validate_pass(token or "")
	return {
		"success": bool(result.get("valid")),
		"valid": result.get("valid"),
		"reason": result.get("reason"),
		"pass": result.get("pass"),
		"message": result.get("reason") or _("QR scanned"),
	}


@frappe.whitelist()
def verify_visitor(visitor_entry: str | None = None) -> dict:
	_ensure_gate()
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	validation = _validate_pass(doc.name)
	pass_ok = bool(validation.get("valid"))
	return {
		"name": doc.name,
		"full_name": doc.full_name,
		"mobile": doc.mobile,
		"photo": doc.photo,
		"status": doc.status,
		"person_to_meet_name": doc.person_to_meet_name,
		"host_name": doc.person_to_meet_name,
		"pass_valid": pass_ok,
		"pass_reason": validation.get("reason"),
		"can_check_in": doc.status == "Pending Approval",
		"can_check_out": doc.status == "Meeting Done",
	}


@frappe.whitelist()
def gate_queue() -> list:
	_ensure_gate()
	return frappe.get_all(
		"Visitor Entry",
		filters={"status": "Pending Approval"},
		fields=["name", "full_name", "mobile", "person_to_meet_name", "floor", "modified"],
		order_by="modified desc",
		limit_page_length=100,
	)


@frappe.whitelist()
def exit_queue() -> list:
	_ensure_gate()
	return frappe.get_all(
		"Visitor Entry",
		filters={"status": "Meeting Done"},
		fields=[
			"name",
			"full_name",
			"mobile",
			"person_to_meet_name",
			"status",
			"checked_in_on",
			"meeting_done_on",
			"floor",
			"modified",
		],
		order_by="modified desc",
		limit_page_length=100,
	)


@frappe.whitelist()
def check_in_by_token(token: str | None = None, live_image: str | None = None) -> dict:
	_ensure_gate()
	result = _validate_pass(token or "")
	if not result.get("valid"):
		frappe.throw(result.get("reason") or _("Invalid QR pass"))
	visitor_entry = (result.get("pass") or {}).get("visitor_entry")
	return {"success": True, **ve.check_in(visitor_entry)}


@frappe.whitelist()
def check_out_by_token(token: str | None = None, remarks: str | None = None) -> dict:
	_ensure_gate()
	token = (token or "").strip()
	if not token or not frappe.db.exists("Visitor Entry", token):
		frappe.throw(_("Invalid pass token"))
	return {"success": True, **ve.check_out(token, remarks=remarks)}
