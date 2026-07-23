"""Security / reception gate operations API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.services import checkin_service, pass_service


@frappe.whitelist()
def scan_qr(token: str | None = None) -> dict:
	"""Scan visitor QR and return verification payload (does not check in)."""
	if not checkin_service.can_operate_gate():
		frappe.throw(_("Only System Manager can scan QR at the gate for now."))

	result = pass_service.validate_qr_token(token or "")
	return {
		"success": bool(result.get("valid")),
		"valid": result.get("valid"),
		"reason": result.get("reason"),
		"pass": result.get("pass"),
		"message": result.get("reason") or _("QR scanned"),
	}


@frappe.whitelist()
def verify_visitor(visitor_entry: str | None = None) -> dict:
	"""Manual verification payload for a Visitor Entry at the gate."""
	if not checkin_service.can_operate_gate():
		frappe.throw(_("Only System Manager can verify visitors at the gate for now."))
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))

	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	pass_ok = False
	pass_reason = _("No QR token")
	if doc.qr_token:
		validation = pass_service.validate_qr_token(doc.qr_token)
		pass_ok = bool(validation.get("valid"))
		pass_reason = validation.get("reason")

	return {
		"name": doc.name,
		"full_name": doc.full_name,
		"mobile": doc.mobile,
		"photo": doc.photo,
		"status": doc.status,
		"host_name": doc.host_name,
		"pass_valid": pass_ok,
		"pass_reason": pass_reason,
		"can_check_in": doc.status == "Approved" and pass_ok,
		"can_check_out": doc.status in checkin_service.CHECKOUT_ALLOWED_STATUSES,
	}


@frappe.whitelist()
def gate_queue() -> list:
	"""Approved visitors waiting for check-in (valid / expected)."""
	if not checkin_service.can_operate_gate():
		frappe.throw(_("Only System Manager can view the gate queue for now."))

	return frappe.get_all(
		"Visitor Entry",
		filters={"status": "Approved"},
		fields=[
			"name",
			"full_name",
			"mobile",
			"host_name",
			"pass_number",
			"qr_expires_on",
			"expected_meeting_time",
			"building",
			"floor",
			"modified",
		],
		order_by="expected_meeting_time asc, modified desc",
		limit_page_length=100,
	)


@frappe.whitelist()
def exit_queue() -> list:
	"""Visitors inside who can check out (Checked In / Meeting Done)."""
	if not checkin_service.can_operate_gate():
		frappe.throw(_("Only System Manager can view the exit queue for now."))

	return frappe.get_all(
		"Visitor Entry",
		filters={"status": ["in", list(checkin_service.CHECKOUT_ALLOWED_STATUSES)]},
		fields=[
			"name",
			"full_name",
			"mobile",
			"host_name",
			"status",
			"check_in",
			"meeting_ended_on",
			"pass_number",
			"building",
			"floor",
			"modified",
		],
		order_by="modified desc",
		limit_page_length=100,
	)


@frappe.whitelist()
def check_in_by_token(token: str | None = None, live_image: str | None = None) -> dict:
	"""Scan QR and check in in one step."""
	result = checkin_service.check_in_by_token(token or "", live_image=live_image)
	return {"success": True, "message": _("Visitor checked in."), **result}


@frappe.whitelist()
def check_out_by_token(token: str | None = None, remarks: str | None = None) -> dict:
	"""Scan QR and check out in one step."""
	result = checkin_service.check_out_by_token(token or "", remarks=remarks)
	return {"success": True, "message": _("Visitor checked out."), **result}
