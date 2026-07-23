"""Host meeting tracking API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.services import meeting_service


@frappe.whitelist()
def start_meeting(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Host marks meeting started (status remains Checked In)."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = meeting_service.start_meeting(visitor_entry, remarks=remarks)
	return {"success": True, "message": _("Meeting started."), **result}


@frappe.whitelist()
def complete_meeting(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Host marks meeting completed → Meeting Done."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = meeting_service.complete_meeting(visitor_entry, remarks=remarks)
	return {
		"success": True,
		"message": _("Meeting completed. Visitor can proceed to checkout."),
		**result,
	}
