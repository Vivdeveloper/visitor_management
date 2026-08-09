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
	"Host",
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
	from frappe.utils.user import get_users_with_role

	users: set[str] = set()
	for role in get_docperm_roles(doctype, ptype):
		for user in get_users_with_role(role) or []:
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
	"""Desk / get_list: host DocPerm users see only their Host assignment.

	``person_to_meet`` is Link → Host. With autoname by User, Host.name == user.
	Also include any Host rows where Host.user = session user (legacy hash names).
	"""
	user = user or frappe.session.user
	if not must_scope_visitor_entry_to_host(user):
		return ""

	host_ids = {user}
	if frappe.db.exists("DocType", "Host"):
		host_ids.update(frappe.get_all("Host", filters={"user": user}, pluck="name") or [])
		if frappe.db.exists("Host", user):
			host_ids.add(user)

	ids = sorted(host_ids)
	if len(ids) == 1:
		return "`tabVisitor Entry`.person_to_meet = {0}".format(frappe.db.escape(ids[0]))
	escaped = ", ".join(frappe.db.escape(i) for i in ids)
	return "`tabVisitor Entry`.person_to_meet in ({0})".format(escaped)


def visitor_entry_has_permission(doc, user: str | None = None, permission_type: str | None = None):
	"""Form / get_doc: deny rows not assigned to this host.

	Returns None to fall back to Role Permission Manager DocPerm when allowed.
	"""
	if not doc:
		return None
	user = user or frappe.session.user
	if not must_scope_visitor_entry_to_host(user):
		return None

	assigned = (doc.get("person_to_meet") or "").strip()
	if not assigned:
		return False
	if assigned == user:
		return None
	if frappe.db.exists("DocType", "Host"):
		if assigned == user or frappe.db.get_value("Host", assigned, "user") == user:
			return None
		if frappe.db.exists("Host", {"name": assigned, "user": user}):
			return None
	return False
