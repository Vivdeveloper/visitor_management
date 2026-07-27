"""Host approval workflow API — thin wrappers over Visitor Entry methods."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.visitor_management.doctype.visitor_entry import visitor_entry as ve


@frappe.whitelist()
def approve(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.approve(visitor_entry, remarks=remarks)}


@frappe.whitelist()
def reject(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.reject(visitor_entry, remarks=remarks)}


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
	
	host_name = "Host"
	try:
		doc = frappe.get_doc("Visitor Entry", visitor_entry)
		host_name = doc.person_to_meet_name or doc.person_to_meet or "Host"
	except Exception:
		pass

	try:
		from visitor_management.visitor_management.realtime.publisher import publish_vms_event
		publish_vms_event("host_notified", {"visitor_entry": visitor_entry, "host": host_name})
	except Exception:
		pass

	return {
		"success": True,
		"message": f"Notification sent to {host_name}",
		"host_name": host_name,
		"visitor_entry": visitor_entry,
	}


@frappe.whitelist()
def list_for_host(status: str | None = None) -> list:
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Login required"))

	filters: dict = {}
	if "System Manager" not in frappe.get_roles(user):
		filters["person_to_meet"] = user
	filters["status"] = status or "Pending Approval"

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
			"person_to_meet",
			"person_to_meet_name",
			"floor",
			"modified",
		],
		order_by="modified desc",
		limit_page_length=100,
	)

