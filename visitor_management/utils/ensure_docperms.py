"""Ensure master DocPerm rows exist for roles already on Visitor Entry (RPM).

No hardcoded role names — uses roles from Visitor Entry DocPerm
(Role Permission Manager / DocType permissions).
"""

from __future__ import annotations

import frappe

from visitor_management.auth.permissions import get_docperm_roles

SKIP_ROLES = frozenset({"All", "Guest", "Administrator", "Desk User"})

# Select + Read on masters used by Add Entry Link fields
MASTER_SELECT_READ = {
	"Visit Purpose Type",
	"ID Proof Type",
	"Vehicle Type",
	"Floor",
}


def _upsert_role_perm(doctype: str, role: str, flags: dict[str, int]) -> None:
	if not frappe.db.exists("DocType", doctype):
		return
	if not frappe.db.exists("Role", role):
		return

	doc = frappe.get_doc("DocType", doctype)
	row = next((p for p in doc.permissions if p.role == role), None)
	if row:
		changed = False
		for key, value in flags.items():
			if row.get(key) != value:
				row.set(key, value)
				changed = True
		if not changed:
			return
	else:
		doc.append("permissions", {"role": role, **flags})

	doc.save(ignore_permissions=True)


def _visitor_entry_staff_roles() -> list[str]:
	"""Roles with any DocPerm on Visitor Entry (from Role Permission Manager)."""
	roles = set(get_docperm_roles("Visitor Entry"))
	return sorted(r for r in roles if r not in SKIP_ROLES)


def ensure_gate_master_docperms() -> None:
	"""Select + Read on VMS masters for every role that has Visitor Entry DocPerm."""
	staff_roles = _visitor_entry_staff_roles()
	if not staff_roles:
		return

	master_flags = {
		"read": 1,
		"select": 1,
		"write": 0,
		"create": 0,
		"delete": 0,
		"export": 1,
		"print": 1,
		"report": 1,
		"email": 1,
	}
	for doctype in sorted(MASTER_SELECT_READ):
		for role in staff_roles:
			_upsert_role_perm(doctype, role, master_flags)

	frappe.clear_cache()
