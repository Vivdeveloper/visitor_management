"""Visitor check-out API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.services import checkin_service, meeting_service


@frappe.whitelist()
def check_out(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Mark visitor as checked out at the gate."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = checkin_service.check_out(visitor_entry, remarks=remarks)
	return {"success": True, "message": _("Visitor checked out."), **result}


@frappe.whitelist()
def mark_meeting_complete(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Alias for meeting.complete_meeting (host marks meeting done)."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = meeting_service.complete_meeting(visitor_entry, remarks=remarks)
	return {
		"success": True,
		"message": _("Meeting completed. Visitor can proceed to checkout."),
		**result,
	}
