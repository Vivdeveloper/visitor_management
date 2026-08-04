"""Host approval workflow API — thin wrappers over Visitor Entry methods."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.services.visitor_notifications import notify_host_and_creator, resolve_host_user
from visitor_management.visitor_management.doctype.visitor_entry import visitor_entry as ve


@frappe.whitelist()
def approve(visitor_entry: str | None = None, remarks: str | None = None, floor: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.approve(visitor_entry, remarks=remarks, floor=floor)}


@frappe.whitelist()
def reject(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.reject(visitor_entry, remarks=remarks)}


@frappe.whitelist()
def cancel(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.cancel_visit(visitor_entry, remarks=remarks)}


@frappe.whitelist()
def transfer(
	visitor_entry: str | None = None,
	transfer_to_user: str | None = None,
	remarks: str | None = None,
) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {
		"success": True,
		**ve.transfer(visitor_entry, transfer_to_user=transfer_to_user, remarks=remarks),
	}


@frappe.whitelist()
def notify_host(visitor_entry: str | None = None, message: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))

	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	host_user = resolve_host_user(doc.person_to_meet)
	if not host_user:
		frappe.throw(_("No valid host user is assigned for this visitor. Set Person to Meet first."))

	host_name = doc.person_to_meet_name or host_user
	visitor_name = doc.full_name or doc.name
	alert_message = message or _("Visitor {0} is waiting at the gate").format(visitor_name)

	result = notify_host_and_creator(
		doc,
		event="host_notified",
		title=_("Visitor waiting at gate"),
		body=alert_message,
		ring_host=True,
	)

	return {
		"success": True,
		"message": _("Notification sent to {0}").format(host_name),
		"host_name": host_name,
		"host_user": host_user,
		"visitor_entry": visitor_entry,
		"notification_logged": True,
		"realtime_sent": bool(result.get("recipients")),
		"recipients": result.get("recipients") or [],
	}


@frappe.whitelist()
def list_for_host(status: str | None = None) -> list:
	from visitor_management.auth.permissions import must_scope_visitor_entry_to_host

	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Login required"))

	filters: dict = {}
	# Role Permission Manager: no create → host queue only (person_to_meet).
	if must_scope_visitor_entry_to_host(user):
		filters["person_to_meet"] = user
	if status:
		filters["status"] = status
	else:
		filters["status"] = "Pending Approval"

	return frappe.get_all(
		"Visitor Entry",
		filters=filters,
		fields=[
			"name",
			"full_name",
			"mobile",
			"status",
			"photo",
			"visitor_company",
			"visitor_location",
			"person_to_meet",
			"person_to_meet_name",
			"floor",
			"modified",
		],
		order_by="modified desc",
		limit_page_length=100,
	)
