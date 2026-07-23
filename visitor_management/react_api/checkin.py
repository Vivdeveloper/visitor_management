"""Visitor check-in API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.services import checkin_service


@frappe.whitelist()
def check_in(visitor_entry: str | None = None, live_image: str | None = None) -> dict:
	"""Mark visitor as checked in (optional live photo)."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = checkin_service.check_in(visitor_entry, live_image=live_image)
	return {"success": True, "message": _("Visitor checked in."), **result}
