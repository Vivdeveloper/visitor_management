"""DocType-wise permission helpers — Role Permission Manager (DocPerm) only.

No hardcoded role names. Assign access in Role Permission Manager per DocType.
"""

from __future__ import annotations

import frappe

VMS_DOCTYPES = (
	"Visitor Entry",
	"Floor",
	"Visit Purpose Type",
	"Vehicle Type",
	"ID Proof Type",
)

PERM_FLAGS = ("read", "write", "create", "delete", "report", "export", "print")

# Accept / Reject only — assigned in Role Permission Manager + User roles.
APPROVE_ROLES = frozenset({"PA GatePass Approval", "System Manager"})


def user_can_approve(user: str | None = None) -> bool:
	"""True if user may Accept/Reject visitor entries."""
	user = user or frappe.session.user
	if not user or user == "Guest":
		return False
	return bool(APPROVE_ROLES.intersection(frappe.get_roles(user) or []))


def require_approve_role(user: str | None = None) -> None:
	if user_can_approve(user):
		return
	frappe.throw(
		frappe._("Only PA GatePass Approval or System Manager can Accept or Reject."),
		frappe.PermissionError,
	)


def get_doctype_permissions(user: str | None = None) -> dict[str, dict[str, bool]]:
	"""Same flags Desk uses — driven by Role Permission Manager for each DocType."""
	user = user or frappe.session.user
	out: dict[str, dict[str, bool]] = {}
	if not user or user == "Guest":
		return out

	for doctype in VMS_DOCTYPES:
		if not frappe.db.exists("DocType", doctype):
			continue
		out[doctype] = {
			flag: bool(frappe.has_permission(doctype, flag, user=user)) for flag in PERM_FLAGS
		}
	return out


def get_capabilities(permissions: dict | None, roles: list[str] | None = None) -> dict[str, bool]:
	"""Map Visitor Entry DocPerm flags → React screens.

	Accept/Reject is limited to PA GatePass Approval and System Manager.
	"""
	ve = (permissions or {}).get("Visitor Entry") or {}
	can_read = bool(ve.get("read"))
	can_write = bool(ve.get("write"))
	can_create = bool(ve.get("create"))
	can_report = bool(ve.get("report") or can_read)
	role_set = set(roles or [])
	can_approve = bool(role_set & APPROVE_ROLES)

	return {
		"dashboard": can_read,
		"approvals": can_read or can_write,
		"check_in": can_create,
		"inside": can_read,
		"reports": can_report,
		# Gate checkout = write + create (approver write-only does not get checkout)
		"checkout": can_write and can_create,
		"scan": can_write or can_create,
		"meetings": can_read,
		"history": can_read,
		"profile": True,
		"notifications": can_read,
		"approve": can_approve,
	}


def get_docperm_roles(doctype: str, ptype: str | None = None) -> list[str]:
	"""Roles that have DocPerm on `doctype` (optionally only those with `ptype`)."""
	if not frappe.db.exists("DocType", doctype):
		return []
	filters: dict = {"parent": doctype}
	if ptype:
		filters[ptype] = 1
	return list({r for r in frappe.get_all("DocPerm", filters=filters, pluck="role") if r})


def get_users_with_doctype_permission(doctype: str, ptype: str = "write") -> list[str]:
	"""Enabled users allowed for `ptype` on `doctype` via Role Permission Manager."""
	users: set[str] = set()
	for role in get_docperm_roles(doctype, ptype):
		for user in frappe.get_users_with_role(role) or []:
			if not user or user in ("Guest", "Administrator"):
				continue
			if not frappe.db.get_value("User", user, "enabled"):
				continue
			if frappe.has_permission(doctype, ptype, user=user):
				users.add(user)
	return sorted(users)


def vms_roles_for_user(roles: list[str] | None) -> list[str]:
	"""Subset of user roles that appear on any VMS DocType DocPerm (RPM metadata)."""
	rpm_roles: set[str] = set()
	for doctype in VMS_DOCTYPES:
		rpm_roles.update(get_docperm_roles(doctype))
	rpm_roles.add("Visitor")
	return [role for role in (roles or []) if role in rpm_roles]


def require_permission(doctype: str, ptype: str = "read", throw: bool = True) -> bool:
	"""Enforce DocType permission like Frappe desk."""
	ok = bool(frappe.has_permission(doctype, ptype))
	if not ok and throw:
		frappe.throw(
			frappe._("Not permitted for {0} ({1})").format(doctype, ptype),
			frappe.PermissionError,
		)
	return ok
