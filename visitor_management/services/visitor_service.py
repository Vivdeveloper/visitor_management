"""Visitor domain service — registration, validation, status transitions."""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import cint, cstr

from visitor_management.config import VISITOR_STATUSES
from visitor_management.services import otp_service

ALLOWED_FIELDS = (
	"mobile",
	"email",
	"photo",
	"first_name",
	"middle_name",
	"last_name",
	"gender",
	"visit_purpose_type",
	"number_of_visitors",
	"id_proof_type",
	"id_proof_photo",
	"visitor_location",
	"visitor_company",
	"organization",
	"site",
	"building",
	"tower",
	"floor",
	"unit",
	"vms_department",
	"person_to_meet",
	"host_employee",
	"expected_meeting_time",
	"expected_exit",
	"meeting_location",
	"job_title",
	"company_id_card",
	"vehicle_type",
	"vehicle_number",
	"status",
)

LIST_FIELDS = [
	"name",
	"full_name",
	"mobile",
	"status",
	"person_to_meet",
	"host_name",
	"organization",
	"site",
	"building",
	"floor",
	"unit",
	"visit_purpose_type",
	"expected_meeting_time",
	"check_in",
	"modified",
]


def _parse_filters(filters: str | dict | list | None) -> dict | list:
	if not filters:
		return {}
	if isinstance(filters, (dict, list)):
		return filters
	try:
		return json.loads(filters)
	except (TypeError, ValueError):
		frappe.throw(_("Invalid filters JSON"))


def create_visitor_entry(data: dict, *, require_otp: bool = True) -> str:
	"""Create Visitor Entry in Pending Approval (or Draft) and return name."""
	payload = {key: data.get(key) for key in ALLOWED_FIELDS if key in data and data.get(key) not in (None, "")}

	mobile = otp_service.normalize_mobile(payload.get("mobile"))
	if not mobile:
		frappe.throw(_("Mobile number is required"))
	payload["mobile"] = mobile

	if require_otp:
		verified_flag = cint(data.get("otp_verified"))
		if not verified_flag and not otp_service.is_mobile_verified(mobile, "visitor_registration"):
			frappe.throw(_("Please verify the mobile OTP before creating a visitor entry."))
		payload["otp_verified"] = 1

	status = cstr(payload.get("status") or "Pending Approval")
	if status == "Awaiting":
		status = "Pending Approval"
	if status not in VISITOR_STATUSES and status not in (
		"Completed",
		"Meeting Done",
		"Cancelled",
		"Transfer User",
		"Draft",
	):
		status = "Pending Approval"
	payload["status"] = status

	if not payload.get("first_name") and not payload.get("last_name"):
		frappe.throw(_("First name or last name is required"))

	doc = frappe.get_doc({"doctype": "Visitor Entry", **payload})
	doc.insert(ignore_permissions=False)
	return doc.name


def get_visitor_entry(name: str) -> dict:
	if not name:
		frappe.throw(_("Visitor Entry name is required"))
	doc = frappe.get_doc("Visitor Entry", name)
	return doc.as_dict()


def list_visitor_entries(filters: str | dict | list | None = None, limit: int = 20) -> list:
	limit = min(cint(limit) or 20, 100)
	parsed = _parse_filters(filters)
	return frappe.get_all(
		"Visitor Entry",
		filters=parsed,
		fields=LIST_FIELDS,
		order_by="modified desc",
		limit_page_length=limit,
	)


def update_visitor_entry(name: str, data: dict) -> dict:
	if not name:
		frappe.throw(_("Visitor Entry name is required"))

	doc = frappe.get_doc("Visitor Entry", name)
	for key in ALLOWED_FIELDS:
		if key in data and key not in ("mobile",):  # mobile change needs re-OTP later
			doc.set(key, data.get(key))

	if "status" in data and data.get("status") == "Awaiting":
		doc.status = "Pending Approval"

	doc.save()
	return doc.as_dict()


def transition_status(visitor_entry: str, to_status: str) -> None:
	"""Validate and apply a visitor status transition (audit stamps via Document.validate)."""
	allowed = set(VISITOR_STATUSES) | {
		"Completed",
		"Meeting Done",
		"Cancelled",
		"Transfer User",
		"Draft",
	}
	if to_status not in allowed:
		frappe.throw(_("Invalid status: {0}").format(to_status))

	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	doc.status = to_status
	doc.save()
