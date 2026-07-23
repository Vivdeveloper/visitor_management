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


@frappe.whitelist()
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
		"floors": active_list("Floor", ["name", "floor_name", "building", "tower", "floor_number"]),
		"units": active_list("Unit", ["name", "unit_name", "floor", "unit_code"]),
		"departments": active_list("VMS Department", ["name", "department_name", "organization"]),
		"visit_purpose_types": frappe.get_all(
			"Visit Purpose Type",
			fields=["name", "visit_purpose_type_name"],
			limit_page_length=100,
		),
		"vehicle_types": frappe.get_all(
			"Vehicle Type",
			fields=["name", "vehicle_type_name"],
			limit_page_length=100,
		),
		"id_proof_types": frappe.get_all(
			"ID Proof Type",
			fields=["name", "id_proof_type_name"],
			limit_page_length=100,
		),
		"security_shifts": active_list("Security Shift", ["name", "shift_name", "start_time", "end_time"]),
	}
