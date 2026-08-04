import frappe

from visitor_management.auth.permissions import VMS_DOCTYPES, get_docperm_roles
from visitor_management.utils.ensure_docperms import ensure_gate_master_docperms
from visitor_management.utils.setup_defaults import setup_master_data

SKIP_ROLE_SEED = frozenset({"All", "Guest", "Administrator", "System Manager", "Desk User"})


def ensure_roles_from_docperm() -> None:
	"""Create any Role referenced on VMS DocType DocPerm (Role Permission Manager)."""
	roles: set[str] = set()
	for doctype in VMS_DOCTYPES:
		roles.update(get_docperm_roles(doctype))

	for role_name in sorted(roles):
		if role_name in SKIP_ROLE_SEED:
			continue
		if frappe.db.exists("Role", role_name):
			continue
		frappe.get_doc(
			{
				"doctype": "Role",
				"role_name": role_name,
				"desk_access": 1,
			}
		).insert(ignore_permissions=True)


def after_install():
	ensure_roles_from_docperm()
	ensure_gate_master_docperms()
	setup_master_data()


def after_migrate():
	ensure_roles_from_docperm()
	ensure_gate_master_docperms()
