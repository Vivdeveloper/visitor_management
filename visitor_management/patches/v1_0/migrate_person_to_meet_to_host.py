"""Migrate person_to_meet to Host DocType (autoname by User).

- Ensure each Host row is named by its User (email login)
- Create missing Host rows for existing Visitor Entry assignments
- Point Visitor Entry.person_to_meet at Host.name
"""

from __future__ import annotations

import frappe


def execute():
	if not frappe.db.exists("DocType", "Host"):
		return

	_normalize_host_names()
	_ensure_hosts_for_visitor_entries()
	_repair_visitor_entry_links()


def _normalize_host_names():
	"""Rename hash Host names → User email (autoname field:user)."""
	rows = frappe.get_all("Host", fields=["name", "user", "full_name", "is_active"], limit_page_length=1000)
	for row in rows:
		user = (row.user or "").strip()
		if not user or not frappe.db.exists("User", user):
			continue
		if row.name == user:
			continue

		# Target name already occupied by another Host
		if frappe.db.exists("Host", user) and row.name != user:
			# Repoint visitors from hash → email Host, delete duplicate hash row
			frappe.db.set_value(
				"Visitor Entry",
				{"person_to_meet": row.name},
				"person_to_meet",
				user,
				update_modified=False,
			)
			frappe.delete_doc("Host", row.name, ignore_permissions=True, force=True)
			continue

		doc = frappe.get_doc("Host", row.name)
		doc.flags.ignore_permissions = True
		try:
			frappe.rename_doc("Host", row.name, user, force=True, merge=False)
		except Exception:
			# Fallback: recreate
			active = row.get("is_active")
			if active is None:
				active = 1
			frappe.delete_doc("Host", row.name, ignore_permissions=True, force=True)
			if not frappe.db.exists("Host", user):
				frappe.get_doc(
					{
						"doctype": "Host",
						"user": user,
						"full_name": row.full_name or user,
						"is_active": active,
					}
				).insert(ignore_permissions=True)


def _ensure_hosts_for_visitor_entries():
	"""Create Host master rows for any User still stored on Visitor Entry."""
	values = frappe.get_all(
		"Visitor Entry",
		filters={"person_to_meet": ["is", "set"]},
		pluck="person_to_meet",
		distinct=True,
		limit_page_length=5000,
	)
	for raw in values:
		if not raw:
			continue
		if frappe.db.exists("Host", raw):
			continue
		user = raw if frappe.db.exists("User", raw) else None
		if not user:
			user = frappe.db.get_value("User", {"email": raw}, "name")
		if not user:
			user = frappe.db.get_value("User", {"full_name": raw}, "name")
		if not user or not frappe.db.exists("User", user):
			continue
		if frappe.db.exists("Host", user) or frappe.db.exists("Host", {"user": user}):
			continue
		frappe.get_doc(
			{
				"doctype": "Host",
				"user": user,
				"full_name": frappe.db.get_value("User", user, "full_name") or user,
				"is_active": 1,
			}
		).insert(ignore_permissions=True)


def _repair_visitor_entry_links():
	"""Force person_to_meet onto Host.name and refresh person_to_meet_name."""
	from visitor_management.services.visitor_notifications import resolve_host_link

	rows = frappe.get_all(
		"Visitor Entry",
		filters={"person_to_meet": ["is", "set"]},
		fields=["name", "person_to_meet", "person_to_meet_name"],
		limit_page_length=5000,
	)
	for row in rows:
		resolved = resolve_host_link(row.person_to_meet) or resolve_host_link(row.person_to_meet_name)
		if not resolved:
			continue
		full_name = frappe.db.get_value("Host", resolved, "full_name") or row.person_to_meet_name
		updates = {}
		if row.person_to_meet != resolved:
			updates["person_to_meet"] = resolved
		if full_name and row.person_to_meet_name != full_name:
			updates["person_to_meet_name"] = full_name
		if updates:
			frappe.db.set_value("Visitor Entry", row.name, updates, update_modified=False)
