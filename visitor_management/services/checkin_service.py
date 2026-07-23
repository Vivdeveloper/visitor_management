"""Check-in / check-out domain service."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime, time_diff_in_seconds

from visitor_management.realtime.publisher import publish_visitor_update
from visitor_management.services import pass_service


SECURITY_ROLES = ("System Manager",)
CHECKOUT_ALLOWED_STATUSES = ("Checked In", "Meeting Done")


def can_operate_gate(user: str | None = None) -> bool:
	user = user or frappe.session.user
	if user == "Guest":
		return False
	roles = set(frappe.get_roles(user))
	return bool(roles.intersection(SECURITY_ROLES))


def _ensure_gate_operator(user: str | None = None) -> str:
	user = user or frappe.session.user
	if not can_operate_gate(user):
		frappe.throw(_("Only System Manager can perform gate operations for now."))
	return user


def _format_duration(seconds: float | int) -> str:
	seconds = max(int(seconds or 0), 0)
	hours, rem = divmod(seconds, 3600)
	minutes, secs = divmod(rem, 60)
	if hours:
		return f"{hours}h {minutes}m"
	if minutes:
		return f"{minutes}m {secs}s"
	return f"{secs}s"


def check_in(
	visitor_entry: str,
	live_image: str | None = None,
	*,
	user: str | None = None,
	skip_pass_validation: bool = False,
) -> dict:
	"""Mark visitor Checked In. Requires Approved status (and valid QR unless skipped)."""
	actor = _ensure_gate_operator(user)
	doc = frappe.get_doc("Visitor Entry", visitor_entry)

	if doc.status == "Checked In":
		frappe.throw(_("Visitor is already checked in."))

	if doc.status != "Approved":
		frappe.throw(
			_("Only Approved visitors can check in. Current status: {0}").format(doc.status)
		)

	if not skip_pass_validation:
		if not doc.qr_token:
			frappe.throw(_("No QR pass found. Generate a pass before check-in."))
		validation = pass_service.validate_qr_token(doc.qr_token)
		if not validation.get("valid"):
			frappe.throw(validation.get("reason") or _("QR pass is not valid"))

	doc.status = "Checked In"
	doc.check_in = now_datetime()
	doc.checked_in_on = doc.check_in
	doc.checked_in_by = actor
	if live_image:
		doc.check_in_photo = live_image
	doc.save(ignore_permissions=True)

	publish_visitor_update(
		doc.name,
		"checked_in",
		{
			"status": doc.status,
			"check_in": str(doc.check_in),
			"checked_in_by": actor,
			"host": doc.person_to_meet,
		},
	)

	return {
		"name": doc.name,
		"status": doc.status,
		"check_in": str(doc.check_in),
		"checked_in_by": actor,
		"full_name": doc.full_name,
	}


def check_in_by_token(token: str, live_image: str | None = None, user: str | None = None) -> dict:
	"""Scan QR then check in."""
	_ensure_gate_operator(user)
	validation = pass_service.validate_qr_token(token)
	if not validation.get("valid"):
		frappe.throw(validation.get("reason") or _("Invalid QR pass"))

	visitor_entry = (validation.get("pass") or {}).get("visitor_entry")
	if not visitor_entry:
		frappe.throw(_("Pass has no visitor entry"))

	return check_in(visitor_entry, live_image=live_image, user=user, skip_pass_validation=True)


def check_out(
	visitor_entry: str,
	*,
	remarks: str | None = None,
	user: str | None = None,
) -> dict:
	"""Mark visitor Checked Out from Meeting Done or Checked In."""
	actor = _ensure_gate_operator(user)
	doc = frappe.get_doc("Visitor Entry", visitor_entry)

	if doc.status == "Checked Out":
		frappe.throw(_("Visitor is already checked out."))

	if doc.status not in CHECKOUT_ALLOWED_STATUSES:
		frappe.throw(
			_("Checkout allowed from Checked In or Meeting Done. Current status: {0}").format(
				doc.status
			)
		)

	doc.check_out = now_datetime()
	doc.checked_out_on = doc.check_out
	doc.checked_out_by = actor
	doc.status = "Checked Out"
	if remarks:
		doc.checkout_remarks = remarks

	if doc.check_in:
		doc.visit_duration = _format_duration(time_diff_in_seconds(doc.check_out, doc.check_in))
	else:
		doc.visit_duration = None

	doc.save(ignore_permissions=True)

	publish_visitor_update(
		doc.name,
		"checked_out",
		{
			"status": doc.status,
			"check_out": str(doc.check_out),
			"checked_out_by": actor,
			"visit_duration": doc.visit_duration,
			"host": doc.person_to_meet,
		},
	)

	return {
		"name": doc.name,
		"status": doc.status,
		"check_out": str(doc.check_out),
		"checked_out_by": actor,
		"visit_duration": doc.visit_duration,
		"full_name": doc.full_name,
	}


def check_out_by_token(token: str, remarks: str | None = None, user: str | None = None) -> dict:
	"""Lookup QR token and check out (token may be expired after long visits)."""
	_ensure_gate_operator(user)
	token = (token or "").strip()
	if not token:
		frappe.throw(_("Pass token is required"))

	visitor_entry = frappe.db.get_value("Visitor Entry", {"qr_token": token}, "name")
	if not visitor_entry:
		frappe.throw(_("Invalid pass token"))

	return check_out(visitor_entry, remarks=remarks, user=user)
