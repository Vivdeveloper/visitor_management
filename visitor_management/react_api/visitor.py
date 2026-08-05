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
	"approval_remarks",
)


def _ensure_visit_purpose_type(name: str) -> str:
	value = (name or "").strip()
	if not value:
		return ""
	if frappe.db.exists("Visit Purpose Type", value):
		return value
	frappe.get_doc(
		{
			"doctype": "Visit Purpose Type",
			"visit_purpose_type_name": value,
		}
	).insert(ignore_permissions=True)
	return value


@frappe.whitelist()
def create_visitor(**kwargs) -> dict:
	"""Register a Visitor Entry from the PWA (gate desk or OTP guest).

	Desk users need Create on Visitor Entry (Role Permission Manager).
	Guests need a verified OTP for the mobile. Insert uses ignore_permissions
	so Link fields (User, ID Proof Type, …) do not fail after that check —
	same pattern as approve / reject / check_in.
	"""
	data = {k: v for k, v in kwargs.items() if not k.startswith("_") and k in ALLOWED_FIELDS and v not in (None, "")}
	if not data.get("mobile"):
		frappe.throw(_("Mobile number is required"))
	if not data.get("first_name") and not data.get("last_name"):
		frappe.throw(_("First name or last name is required"))

	_authorize_visitor_create(data.get("mobile"))

	if data.get("visit_purpose_type"):
		data["visit_purpose_type"] = _ensure_visit_purpose_type(data["visit_purpose_type"])

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

	# Drop placeholder / missing vehicle links (UI "None" is not a Vehicle Type row).
	vehicle = str(data.get("vehicle_type") or "").strip()
	if vehicle.lower() in ("", "none", "null", "undefined") or not frappe.db.exists("Vehicle Type", vehicle):
		data.pop("vehicle_type", None)

	if data.get("id_proof_type") and not frappe.db.exists("ID Proof Type", data["id_proof_type"]):
		data.pop("id_proof_type", None)

	# otp_verified is derived in Visitor Entry.validate_otp from the server-side
	# verification cache — a client-supplied flag is not trusted here.
	doc = frappe.get_doc({"doctype": "Visitor Entry", **data})
	doc.flags.ignore_permissions = True
	doc.flags.ignore_links = False
	# Host ring alert only for PWA Add Entry — not Desk New/Save.
	doc.flags.vms_pwa_entry = True
	doc.insert(ignore_permissions=True)
	return {
		"success": True,
		"name": doc.name,
		"message": _("Visitor registered and pending approval."),
		"visitor": doc.as_dict(),
	}


def _authorize_visitor_create(mobile: str | None) -> None:
	"""Allow create when:

	- Desk user has Visitor Entry **Create** (gate DocPerm), or
	- Desk user has **Write** (common misconfig for gate admins), or
	- Visitor mobile OTP was verified for ``visitor_registration`` (PWA Add Entry
	  always verifies OTP before Continue — Guest or desk).
	"""
	from visitor_management.react_api.otp import is_mobile_verified

	otp_ok = bool(mobile) and is_mobile_verified(mobile or "", "visitor_registration")
	user = frappe.session.user

	if user and user != "Guest":
		if frappe.has_permission("Visitor Entry", "create"):
			return
		if otp_ok:
			return
		if frappe.has_permission("Visitor Entry", "write"):
			return
		frappe.throw(
			_(
				"Not permitted to create Visitor Entry for {0}. "
				"Enable Create on Visitor Entry in Role Permission Manager, "
				"or complete visitor OTP verification first."
			).format(user),
			frappe.PermissionError,
		)
		return

	if not otp_ok:
		frappe.throw(
			_("Please verify the mobile number with an OTP before registering."),
			frappe.PermissionError,
		)


@frappe.whitelist(allow_guest=True)
def upload_visitor_media(mobile: str | None = None) -> dict:
	"""Upload visitor / ID photos for Add Entry.

	Uses ignore_permissions after auth so gate users and OTP guests are not
	blocked by bare ``upload_file`` PermissionError (guest upload disabled).
	"""
	_authorize_visitor_create(mobile)

	files = frappe.request.files
	if not files or "file" not in files:
		frappe.throw(_("No file uploaded"))

	uploaded = files["file"]
	content = uploaded.stream.read()
	filename = uploaded.filename or "upload.bin"
	if not content:
		frappe.throw(_("Uploaded file is empty"))

	file_doc = frappe.get_doc(
		{
			"doctype": "File",
			"file_name": filename,
			"is_private": 0,
			"folder": "Home",
			"content": content,
		}
	)
	file_doc.insert(ignore_permissions=True)
	return {
		"file_url": file_doc.file_url,
		"file_name": file_doc.file_name,
		"name": file_doc.name,
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
