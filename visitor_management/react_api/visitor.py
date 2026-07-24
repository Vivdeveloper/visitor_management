"""Visitor registration and profile API."""

from __future__ import annotations

import json

# pyrefly: ignore [missing-import]
import frappe
# pyrefly: ignore [missing-import]
from frappe import _
# pyrefly: ignore [missing-import]
from frappe.utils import cint


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
	"floor",
	"person_to_meet",
	"vehicle_type",
	"vehicle_number",
	"status",
)


@frappe.whitelist()
def create_visitor(**kwargs) -> dict:
	data = {k: v for k, v in kwargs.items() if not k.startswith("_") and k in ALLOWED_FIELDS and v not in (None, "")}
	if not data.get("mobile"):
		frappe.throw(_("Mobile number is required"))
	if not data.get("first_name") and not data.get("last_name"):
		frappe.throw(_("First name or last name is required"))

	if data.get("person_to_meet"):
		person = str(data["person_to_meet"]).strip()
		if not frappe.db.exists("User", person):
			matched = (
				frappe.db.get_value("User", {"full_name": person}, "name")
				or frappe.db.get_value("User", {"email": person}, "name")
				or frappe.db.get_value("User", {"first_name": person}, "name")
			)
			if matched:
				data["person_to_meet"] = matched
			else:
				fallback = frappe.db.get_value("User", {"enabled": 1, "user_type": "System User"}, "name") or "Administrator"
				data["person_to_meet"] = fallback

	doc = frappe.get_doc({"doctype": "Visitor Entry", **data})
	if cint(kwargs.get("otp_verified")):
		doc.otp_verified = 1
	doc.insert()
	return {
		"success": True,
		"name": doc.name,
		"message": _("Visitor registered and pending approval."),
		"visitor": doc.as_dict(),
	}


@frappe.whitelist()
def get_visitor(name: str | None = None) -> dict:
	if not name:
		frappe.throw(_("Visitor Entry name is required"))
	return frappe.get_doc("Visitor Entry", name).as_dict()


@frappe.whitelist()
def list_visitors(filters: str | None = None, limit: int = 20) -> list:
	parsed = {}
	if filters:
		try:
			parsed = json.loads(filters) if isinstance(filters, str) else filters
		except (TypeError, ValueError):
			frappe.throw(_("Invalid filters JSON"))
	return frappe.get_all(
		"Visitor Entry",
		filters=parsed,
		fields=["name", "full_name", "mobile", "status", "person_to_meet_name", "floor", "modified"],
		order_by="modified desc",
		limit_page_length=min(cint(limit) or 20, 100),
	)


@frappe.whitelist()
def update_visitor(name: str | None = None, **kwargs) -> dict:
	if not name:
		frappe.throw(_("Visitor Entry name is required"))
	doc = frappe.get_doc("Visitor Entry", name)
	for key in ALLOWED_FIELDS:
		if key in kwargs and key != "mobile":
			doc.set(key, kwargs.get(key))
	doc.save()
	return {"success": True, "visitor": doc.as_dict()}
