"""Visitor check-out API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.visitor_management.doctype.visitor_entry import visitor_entry as ve


@frappe.whitelist()
def check_out(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.check_out(visitor_entry, remarks=remarks)}


@frappe.whitelist()
def mark_meeting_complete(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.complete_meeting(visitor_entry, remarks=remarks)}
