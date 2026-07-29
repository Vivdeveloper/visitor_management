"""In-app notification API for React clients — Frappe Notification Log."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint


@frappe.whitelist()
def list_notifications(limit: int = 50) -> list:
	"""List Notification Log rows for the current user (newest first)."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Please sign in"), frappe.AuthenticationError)

	limit = min(max(cint(limit) or 50, 1), 100)
	rows = frappe.get_all(
		"Notification Log",
		filters={"for_user": user},
		fields=[
			"name",
			"subject",
			"email_content",
			"document_type",
			"document_name",
			"type",
			"read",
			"creation",
			"from_user",
		],
		order_by="creation desc",
		limit_page_length=limit,
	)
	return rows


@frappe.whitelist()
def mark_read(name: str | None = None) -> dict:
	"""Mark a notification as read."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Please sign in"), frappe.AuthenticationError)
	if not name:
		frappe.throw(_("Notification name is required"))

	doc = frappe.get_doc("Notification Log", name)
	if doc.for_user != user:
		frappe.throw(_("Not permitted"), frappe.PermissionError)
	if not doc.read:
		doc.db_set("read", 1, update_modified=False)
	return {"ok": True, "name": name}


@frappe.whitelist()
def mark_all_read() -> dict:
	"""Mark all notifications as read for the current user."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Please sign in"), frappe.AuthenticationError)

	names = frappe.get_all(
		"Notification Log",
		filters={"for_user": user, "read": 0},
		pluck="name",
		limit_page_length=500,
	)
	for name in names:
		frappe.db.set_value("Notification Log", name, "read", 1, update_modified=False)
	return {"ok": True, "count": len(names)}
