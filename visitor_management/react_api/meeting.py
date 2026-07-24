"""Host meeting tracking API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.visitor_management.doctype.visitor_entry import visitor_entry as ve


@frappe.whitelist()
def start_meeting(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""No separate start timestamp — returns current status."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	if doc.status != "Checked In":
		frappe.throw(_("Meeting can only start after check-in."))
	return {"success": True, "name": doc.name, "status": doc.status, "message": _("Ready for meeting.")}


@frappe.whitelist()
def complete_meeting(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.complete_meeting(visitor_entry, remarks=remarks)}
