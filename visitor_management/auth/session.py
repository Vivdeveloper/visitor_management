"""Authentication helpers — resolve User from mobile and open Frappe session."""

from __future__ import annotations

import frappe
from frappe.utils import cstr

from visitor_management.services.otp_service import normalize_mobile


STAFF_ROLES = (
	"System Manager",
	"VMS Admin",
	"Reception",
	"Security",
	"Employee",
	"Facility Manager",
	"Building Manager",
	"HR",
	"Auditor",
)


def find_user_by_mobile(mobile: str) -> str | None:
	"""Match User.mobile_no or linked Employee.cell_number (10-digit tolerant)."""
	mobile = normalize_mobile(mobile)
	if not mobile:
		return None

	last10 = mobile[-10:]
	candidates = {mobile, last10, f"91{last10}", f"+91{last10}"}

	for value in candidates:
		user = frappe.db.get_value("User", {"mobile_no": value, "enabled": 1}, "name")
		if user:
			return user

	if frappe.db.exists("DocType", "Employee"):
		for value in candidates:
			user_id = frappe.db.get_value(
				"Employee",
				{"cell_number": value, "status": "Active"},
				"user_id",
			)
			if user_id and frappe.db.get_value("User", user_id, "enabled"):
				return user_id

	# Loose match on last 10 digits for Employee
	if frappe.db.exists("DocType", "Employee"):
		rows = frappe.get_all(
			"Employee",
			filters={"status": "Active", "user_id": ["is", "set"]},
			fields=["user_id", "cell_number"],
			limit_page_length=500,
		)
		for row in rows:
			cell = normalize_mobile(row.cell_number)
			if cell and cell[-10:] == last10 and frappe.db.get_value("User", row.user_id, "enabled"):
				return row.user_id

	return None


def login_as_user(user: str) -> None:
	"""Establish Frappe session for `user` (sets sid cookie)."""
	frappe.local.login_manager.login_as(user)
	frappe.db.commit()


def logout_current() -> None:
	if frappe.session.user and frappe.session.user != "Guest":
		frappe.local.login_manager.logout()
		frappe.db.commit()


def get_profile(user: str | None = None) -> dict:
	user = user or frappe.session.user
	if not user or user == "Guest":
		return {
			"authenticated": False,
			"session_type": "guest",
			"user": "Guest",
			"roles": [],
		}

	row = frappe.db.get_value(
		"User",
		user,
		["name", "full_name", "first_name", "user_image", "mobile_no", "email"],
		as_dict=True,
	) or {"name": user}

	roles = frappe.get_roles(user) or []
	vms_roles = [role for role in roles if role in STAFF_ROLES or role == "Visitor"]

	return {
		"authenticated": True,
		"session_type": "user",
		"user": row.get("name") or user,
		"full_name": row.get("full_name"),
		"first_name": row.get("first_name"),
		"user_image": row.get("user_image"),
		"mobile_no": row.get("mobile_no"),
		"email": row.get("email"),
		"roles": roles,
		"vms_roles": vms_roles,
		"csrf_token": cstr(frappe.sessions.get_csrf_token()),
	}
