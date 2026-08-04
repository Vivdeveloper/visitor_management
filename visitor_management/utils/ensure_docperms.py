"""Ensure gate / approver DocPerm rows exist even when DocType JSON sync is skipped.

RPM edits bump DocType.modified in the DB, so migrate may not re-apply JSON
permissions. Masters then stay System-Manager-only and Link / Select checks fail.
"""

from __future__ import annotations

import frappe

GATE_ROLE = "PA Security Guard User"
APPROVER_ROLE = "PA GatePass Approval"

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


def ensure_gate_master_docperms() -> None:
	"""Select + Read on VMS masters for security + approval roles."""
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
		for role in (GATE_ROLE, APPROVER_ROLE):
			_upsert_role_perm(doctype, role, master_flags)

	# Select helps Link validation / dropdowns for gate create role
	_upsert_role_perm(
		"Visitor Entry",
		GATE_ROLE,
		{
			"select": 1,
			"read": 1,
			"write": 1,
			"create": 1,
			"delete": 0,
			"export": 1,
			"print": 1,
			"report": 1,
			"email": 1,
		},
	)
	_upsert_role_perm(
		"Visitor Entry",
		APPROVER_ROLE,
		{
			"select": 1,
			"read": 1,
			"write": 1,
			"create": 0,
			"delete": 0,
			"export": 0,
			"print": 1,
			"report": 1,
			"email": 1,
		},
	)

	frappe.clear_cache()
