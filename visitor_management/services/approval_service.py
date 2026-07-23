"""Approval workflow service — host approve / reject / transfer."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime

from visitor_management.realtime.publisher import publish_visitor_update
from visitor_management.services import pass_service


def _actor(user: str | None = None) -> str:
	return user or frappe.session.user


def can_act_on_visitor(doc, user: str | None = None) -> bool:
	"""Assigned host (person_to_meet) or System Manager."""
	user = _actor(user)
	if user == "Guest":
		return False
	if "System Manager" in frappe.get_roles(user):
		return True
	return bool(doc.person_to_meet and doc.person_to_meet == user)


def _ensure_can_act(doc, user: str | None = None) -> str:
	user = _actor(user)
	if not can_act_on_visitor(doc, user):
		frappe.throw(_("Only the assigned host or System Manager can perform this action."))
	return user


def _ensure_pending(doc) -> None:
	if doc.status != "Pending Approval":
		frappe.throw(_("Visitor Entry must be in Pending Approval. Current status: {0}").format(doc.status))


def _append_remarks(doc, remarks: str | None, prefix: str) -> None:
	note = (remarks or "").strip()
	line = f"{prefix}: {note}" if note else prefix
	existing = (doc.approval_remarks or "").strip()
	doc.approval_remarks = f"{existing}\n{line}".strip() if existing else line


def approve_visitor(visitor_entry: str, user: str | None = None, remarks: str | None = None) -> dict:
	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	_ensure_pending(doc)
	actor = _ensure_can_act(doc, user)

	doc.status = "Approved"
	doc.action_by = actor
	doc.action_on = now_datetime()
	doc.approved_on = doc.action_on
	_append_remarks(doc, remarks, _("Approved by {0}").format(actor))
	doc.save(ignore_permissions=True)

	pass_info = {}
	try:
		pass_info = pass_service.generate_pass_for_entry(doc.name, force=True)
	except Exception:
		frappe.log_error(title="VMS QR pass generation failed after approve")

	publish_visitor_update(
		doc.name,
		"approved",
		{"status": doc.status, "action_by": actor, "pass_url": pass_info.get("pass_url")},
	)
	return {"name": doc.name, "status": doc.status, "pass": pass_info}


def reject_visitor(visitor_entry: str, user: str | None = None, remarks: str | None = None) -> dict:
	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	_ensure_pending(doc)
	actor = _ensure_can_act(doc, user)

	doc.status = "Rejected"
	doc.action_by = actor
	doc.action_on = now_datetime()
	doc.rejected_on = doc.action_on
	_append_remarks(doc, remarks, _("Rejected by {0}").format(actor))
	doc.save(ignore_permissions=True)

	publish_visitor_update(doc.name, "rejected", {"status": doc.status, "action_by": actor})
	return {"name": doc.name, "status": doc.status}


def transfer_visitor(
	visitor_entry: str,
	transfer_to_user: str,
	user: str | None = None,
	remarks: str | None = None,
) -> dict:
	"""Reassign host; stays Pending Approval for the new host."""
	if not transfer_to_user:
		frappe.throw(_("Please select a user to transfer to."))

	if not frappe.db.exists("User", transfer_to_user):
		frappe.throw(_("User {0} does not exist").format(transfer_to_user))

	if not frappe.db.get_value("User", transfer_to_user, "enabled"):
		frappe.throw(_("User {0} is disabled").format(transfer_to_user))

	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	_ensure_pending(doc)
	actor = _ensure_can_act(doc, user)

	if transfer_to_user == doc.person_to_meet:
		frappe.throw(_("Visitor is already assigned to this host."))

	previous_host = doc.person_to_meet
	doc.transfer_to_user = transfer_to_user
	doc.person_to_meet = transfer_to_user
	doc.host_employee = None
	doc.host_name = frappe.db.get_value("User", transfer_to_user, "full_name")
	doc.status = "Pending Approval"
	doc.action_by = actor
	doc.action_on = now_datetime()
	_append_remarks(
		doc,
		remarks,
		_("Transferred from {0} to {1} by {2}").format(previous_host or "—", transfer_to_user, actor),
	)
	doc.save(ignore_permissions=True)

	publish_visitor_update(
		doc.name,
		"transferred",
		{
			"status": doc.status,
			"from_host": previous_host,
			"to_host": transfer_to_user,
			"action_by": actor,
		},
	)
	return {
		"name": doc.name,
		"status": doc.status,
		"person_to_meet": doc.person_to_meet,
		"transfer_to_user": doc.transfer_to_user,
	}


def list_for_host(user: str | None = None, status: str | None = None) -> list:
	user = _actor(user)
	if user == "Guest":
		frappe.throw(_("Login required"))

	filters: dict = {}
	if "System Manager" not in frappe.get_roles(user):
		filters["person_to_meet"] = user

	if status:
		filters["status"] = status
	else:
		filters["status"] = "Pending Approval"

	return frappe.get_all(
		"Visitor Entry",
		filters=filters,
		fields=[
			"name",
			"full_name",
			"mobile",
			"status",
			"photo",
			"visitor_company",
			"visit_purpose_type",
			"expected_meeting_time",
			"floor",
			"building",
			"unit",
			"vehicle_type",
			"vehicle_number",
			"person_to_meet",
			"host_name",
			"modified",
		],
		order_by="modified desc",
		limit_page_length=100,
	)
