"""App / client settings API."""

from __future__ import annotations

import frappe


@frappe.whitelist()
def get_settings() -> dict:
	"""Public / role-scoped client settings for React apps."""
	return {
		"app_name": "Visitor Management",
		"default_visitor_status": "Pending Approval",
	}


@frappe.whitelist(allow_guest=True)
def get_masters() -> dict:
	"""Master data needed by registration forms (DocType metadata / link options)."""

	def active_list(doctype: str, fields: list[str], order_by: str = "modified desc"):
		if not frappe.db.exists("DocType", doctype):
			return []
		filters = {"is_active": 1} if frappe.db.has_column(doctype, "is_active") else {}
		return frappe.get_all(
			doctype,
			filters=filters,
			fields=fields,
			order_by=order_by,
			limit_page_length=500,
			ignore_permissions=True,
		)

	genders: list[dict] = []
	if frappe.db.exists("DocType", "Gender"):
		genders = frappe.get_all(
			"Gender",
			fields=["name"],
			order_by="name asc",
			limit_page_length=50,
			ignore_permissions=True,
		)

	return {
		"organizations": active_list("Organization", ["name", "organization_name", "organization_code"]),
		"sites": active_list("Site", ["name", "site_name", "organization"]),
		"buildings": active_list("Building", ["name", "building_name", "site"]),
		"towers": active_list("Tower", ["name", "tower_name", "building"]),
		"floors": active_list(
			"Floor",
			["name", "floor_name", "building", "tower", "floor_number"],
			order_by="floor_number asc, floor_name asc",
		),
		"units": active_list("Unit", ["name", "unit_name", "floor", "unit_code"]),
		"departments": active_list("VMS Department", ["name", "department_name", "organization"]),
		"visit_purpose_types": active_list(
			"Visit Purpose Type",
			["name", "visit_purpose_type_name"],
			order_by="visit_purpose_type_name asc, name asc",
		),
		"vehicle_types": active_list(
			"Vehicle Type",
			["name", "vehicle_type_name"],
			order_by="vehicle_type_name asc, name asc",
		),
		"id_proof_types": active_list(
			"ID Proof Type",
			["name", "id_proof_type_name"],
			order_by="id_proof_type_name asc, name asc",
		),
		"security_shifts": active_list("Security Shift", ["name", "shift_name", "start_time", "end_time"]),
		"genders": genders,
		"hosts": active_list("Host", ["name", "user", "full_name"], order_by="full_name asc, name asc"),
	}


@frappe.whitelist(allow_guest=True)
def get_hosts() -> list:
	"""Host DocType rows for Person to Meet (value = Host.name)."""
	from visitor_management.services.visitor_notifications import list_host_options

	return list_host_options()


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def host_query(doctype, txt, searchfield, start, page_len, filters):
	"""Desk Link query against Host DocType (not every User)."""
	from visitor_management.services.visitor_notifications import list_host_options

	exclude = None
	if isinstance(filters, dict):
		exclude = filters.get("name")
		if isinstance(exclude, (list, tuple)) and len(exclude) == 2 and exclude[0] == "!=":
			exclude = exclude[1]
		elif not isinstance(exclude, str):
			exclude = None

	txt = (txt or "").strip().lower()
	rows = []
	for host in list_host_options():
		value = host.get("value") or ""
		if exclude and value == exclude:
			continue
		hay = f"{host.get('label') or ''} {host.get('email') or ''} {value}".lower()
		if txt and txt not in hay:
			continue
		rows.append([value, host.get("label") or value, host.get("email") or ""])

	return rows[int(start) : int(start) + int(page_len)]
