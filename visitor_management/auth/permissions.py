"""Visitor Entry permissions — Frappe Role Permission Manager (DocPerm) only.

Configure access in Desk → Role Permission Manager for each DocType.
Do not use User Permission for host scoping (would affect linked DocTypes).

Visitor Entry DocPerm conventions (RPM):
  - create (+ write/read) → gate / security — all queues, Call Host, check-in
  - write + read (no create) → host / approver — Accept/Reject, person_to_meet scope
  - read → view lists / dashboard
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

VISITOR_ENTRY = "Visitor Entry"


def _user_roles(user: str) -> set[str]:
	return set(frappe.get_roles(user) or [])


def _docperm_roles(doctype: str, ptype: str | None = None) -> set[str]:
	return set(get_docperm_roles(doctype, ptype))


def user_has_visitor_entry_perm(ptype: str, user: str | None = None) -> bool:
	"""True if user's roles include DocPerm `{ptype}` on Visitor Entry (RPM)."""
	user = user or frappe.session.user
	if not user or user == "Guest":
		return False
	return bool(_user_roles(user) & _docperm_roles(VISITOR_ENTRY, ptype))


def user_can_approve(user: str | None = None) -> bool:
	"""Accept/Reject from Role Permission Manager.

	Rule: write on Visitor Entry, and not gate create — unless System Manager
	(Frappe built-in full access; always has create DocPerm).
	"""
	user = user or frappe.session.user
	if not user or user == "Guest":
		return False

	roles = _user_roles(user)
	if not (roles & _docperm_roles(VISITOR_ENTRY, "write")):
		return False

	create_roles = _docperm_roles(VISITOR_ENTRY, "create")
	gate_create = (roles & create_roles) - {"System Manager"}
	if gate_create and "System Manager" not in roles:
		return False

	return True


def require_approve_role(user: str | None = None) -> None:
	if user_can_approve(user):
		return
	frappe.throw(
		frappe._("Not permitted to Accept or Reject. Need Write on Visitor Entry (Role Permission Manager)."),
		frappe.PermissionError,
	)


def get_doctype_permissions(user: str | None = None) -> dict[str, dict[str, bool]]:
	"""DocPerm flags from Role Permission Manager — same as Desk."""
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


def must_scope_visitor_entry_to_host(user: str | None = None) -> bool:
	"""Host/approver (no create DocPerm) → only person_to_meet = self.

	Gate/create DocPerm (and System Manager via create) see all rows.
	Visitor Entry hooks only — not User Permission.
	"""
	user = user or frappe.session.user
	if not user or user in ("Guest", "Administrator"):
		return False

	roles = _user_roles(user)
	if roles & _docperm_roles(VISITOR_ENTRY, "create"):
		return False

	# Any other Visitor Entry DocPerm (read/write/…) → host scope
	return bool(roles & _docperm_roles(VISITOR_ENTRY))


def visitor_entry_permission_query_conditions(user: str | None = None) -> str:
	"""Desk / get_list: host DocPerm users see only person_to_meet = self."""
	user = user or frappe.session.user
	if not must_scope_visitor_entry_to_host(user):
		return ""
	return "`tabVisitor Entry`.person_to_meet = {user}".format(user=frappe.db.escape(user))


def visitor_entry_has_permission(doc, user: str | None = None, permission_type: str | None = None):
	"""Form / get_doc: deny rows not assigned to this host.

	Returns None to fall back to Role Permission Manager DocPerm when allowed.
	"""
	if not doc:
		return None
	user = user or frappe.session.user
	if not must_scope_visitor_entry_to_host(user):
		return None
	if doc.get("person_to_meet") == user:
		return None
	return False
