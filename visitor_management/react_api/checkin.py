"""Visitor check-in API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.visitor_management.doctype.visitor_entry import visitor_entry as ve


@frappe.whitelist()
def check_in(visitor_entry: str | None = None, live_image: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.check_in(visitor_entry)}
