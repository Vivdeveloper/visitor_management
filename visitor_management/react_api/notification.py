"""In-app notification API for React clients."""

from __future__ import annotations

import frappe
from frappe import _


@frappe.whitelist()
def list_notifications(limit: int = 50) -> list:
	"""List notifications for the current user."""
	frappe.throw(_("Not implemented"))


@frappe.whitelist()
def mark_read(name: str | None = None) -> dict:
	"""Mark a notification as read."""
	frappe.throw(_("Not implemented"))


@frappe.whitelist()
def mark_all_read() -> dict:
	"""Mark all notifications as read."""
	frappe.throw(_("Not implemented"))
