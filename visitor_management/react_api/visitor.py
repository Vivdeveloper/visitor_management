"""Visitor registration and profile API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.services import visitor_service


@frappe.whitelist()
def create_visitor(**kwargs) -> dict:
	"""Create a visitor entry (registration flow → Pending Approval)."""
	# frappe may pass form_dict keys; strip meta
	data = {k: v for k, v in kwargs.items() if not k.startswith("_")}
	name = visitor_service.create_visitor_entry(data, require_otp=True)
	doc = visitor_service.get_visitor_entry(name)
	return {
		"success": True,
		"name": name,
		"message": _("Visitor registered and pending approval."),
		"visitor": doc,
	}


@frappe.whitelist()
def get_visitor(name: str | None = None) -> dict:
	"""Fetch a visitor entry by name."""
	return visitor_service.get_visitor_entry(name or "")


@frappe.whitelist()
def list_visitors(filters: str | None = None, limit: int = 20) -> list:
	"""List visitor entries with optional filters (JSON string or dict)."""
	return visitor_service.list_visitor_entries(filters, limit)


@frappe.whitelist()
def update_visitor(name: str | None = None, **kwargs) -> dict:
	"""Update visitor entry fields."""
	data = {k: v for k, v in kwargs.items() if not k.startswith("_") and k != "name"}
	doc = visitor_service.update_visitor_entry(name or "", data)
	return {"success": True, "visitor": doc}
