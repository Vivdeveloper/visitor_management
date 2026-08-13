"""In-app notification API for React clients — Frappe Notification Log."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint

from visitor_management.auth.permissions import (
	must_scope_visitor_entry_to_host,
	user_has_visitor_entry_perm,
)


def _is_security_alert_subject(subject: str | None, body: str | None = None) -> bool:
	"""Gate-relevant alerts (checkout / reject) — not every host pending ring."""
	text = f"{subject or ''} {body or ''}".lower()
	keywords = (
		"checkout",
		"check out",
		"ready for checkout",
		"meeting completed",
		"rejected",
		"visitor rejected",
	)
	return any(k in text for k in keywords)


def _filter_notifications_for_user(rows: list[dict], user: str) -> list[dict]:
	"""Keep alerts that belong to this user as host, or gate checkout/reject alerts.

	Notification Log is already ``for_user``-scoped. Extra filter stops gate/admin
	accounts from seeing every host's pending rings that were also copied to them
	as creator / broad recipient.
	"""
	if not rows:
		return rows

	ve_names = [
		r.get("document_name")
		for r in rows
		if r.get("document_type") == "Visitor Entry" and r.get("document_name")
	]
	host_by_name: dict[str, dict[str, str]] = {}
	if ve_names:
		for row in frappe.get_all(
			"Visitor Entry",
			filters={"name": ["in", list(set(ve_names))]},
			fields=["name", "person_to_meet", "owner"],
		):
			host_by_name[row.name] = {
				"person_to_meet": (row.person_to_meet or "").strip(),
				"owner": (row.owner or "").strip(),
			}

	is_gate = user_has_visitor_entry_perm("create", user)
	# Hosts (no create) always stay strictly on their assigned visitors.
	host_only = must_scope_visitor_entry_to_host(user)

	filtered: list[dict] = []
	for row in rows:
		if row.get("document_type") != "Visitor Entry" or not row.get("document_name"):
			filtered.append(row)
			continue

		meta = host_by_name.get(row["document_name"]) or {}
		person = meta.get("person_to_meet") or ""
		owner = meta.get("owner") or ""

		# Assigned host always sees their visitor alerts.
		if person and person == user:
			filtered.append(row)
			continue

		# Soft "you created this" only when the user is still the host or host-only creator.
		if owner == user and (person == user or host_only):
			filtered.append(row)
			continue

		# Gate / security: checkout + reject alerts only (not every host pending).
		if is_gate and _is_security_alert_subject(row.get("subject"), row.get("email_content")):
			filtered.append(row)
			continue

	return filtered


@frappe.whitelist()
def list_notifications(limit: int = 50) -> list:
	"""List Notification Log rows for the current user (newest first), user-scoped."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Please sign in"), frappe.AuthenticationError)

	limit = min(max(cint(limit) or 50, 1), 100)
	# Fetch extra then filter so host-scoped lists still fill the page.
	fetch_limit = min(limit * 4, 200)
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
		limit_page_length=fetch_limit,
	)
	return _filter_notifications_for_user(rows, user)[:limit]


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
