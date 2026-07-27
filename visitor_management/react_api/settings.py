"""App / client settings API."""

from __future__ import annotations

import frappe


@frappe.whitelist()
def get_settings() -> dict:
	"""Public / role-scoped client settings for React apps."""
	return {
		"app_name": "Visitor Management",
		"default_visitor_status": "Pending Approval",
		"otp_ttl_sec": 300,
	}


@frappe.whitelist(allow_guest=True)
def get_masters() -> dict:
	"""Master data needed by registration forms."""
	def active_list(doctype: str, fields: list[str], order_by: str = "modified desc"):
		if not frappe.db.exists("DocType", doctype):
			return []
		filters = {"is_active": 1} if frappe.db.has_column(doctype, "is_active") else {}
		return frappe.get_all(doctype, filters=filters, fields=fields, order_by=order_by, limit_page_length=500)

	return {
		"organizations": active_list("Organization", ["name", "organization_name", "organization_code"]),
		"sites": active_list("Site", ["name", "site_name", "organization"]),
		"buildings": active_list("Building", ["name", "building_name", "site"]),
		"towers": active_list("Tower", ["name", "tower_name", "building"]),
		"floors": active_list("Floor", ["name", "floor_name", "building", "tower", "floor_number"], order_by="floor_number asc, floor_name asc"),
		"units": active_list("Unit", ["name", "unit_name", "floor", "unit_code"]),
		"departments": active_list("VMS Department", ["name", "department_name", "organization"]),
		"visit_purpose_types": active_list("Visit Purpose Type", ["name", "visit_purpose_type_name"], order_by="visit_purpose_type_name asc, name asc"),
		"vehicle_types": active_list("Vehicle Type", ["name", "vehicle_type_name"], order_by="vehicle_type_name asc, name asc"),
		"id_proof_types": active_list("ID Proof Type", ["name", "id_proof_type_name"], order_by="id_proof_type_name asc, name asc"),
		"security_shifts": active_list("Security Shift", ["name", "shift_name", "start_time", "end_time"]),
	}


@frappe.whitelist(allow_guest=True)
def get_hosts() -> list:
	"""Fetch enabled Frappe / ERPNext users for the Person to Meet dropdown."""
	users = frappe.get_all(
		"User",
		filters={"enabled": 1, "user_type": "System User"},
		fields=["name", "full_name", "first_name", "last_name", "email"],
		order_by="first_name asc",
		limit_page_length=200,
	)
	if not users:
		users = frappe.get_all(
			"User",
			filters={"enabled": 1},
			fields=["name", "full_name", "first_name", "last_name", "email"],
			order_by="first_name asc",
			limit_page_length=100,
		)
	return [
		{
			"value": u["name"],
			"label": u.get("full_name") or f"{u.get('first_name') or ''} {u.get('last_name') or ''}".strip() or u["name"],
			"email": u.get("email") or u["name"],
		}
		for u in users
	]
