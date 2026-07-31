"""Auto notifications for Visitor Entry create / status / host changes.

Sends Notification Log + Frappe realtime + Web Push to:
- Host (Person to Meet)
- Creator (document owner)
- Security desk (meeting done / checkout required)
"""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.realtime.publisher import publish_vms_event
from visitor_management.auth.permissions import get_users_with_doctype_permission


def resolve_host_user(raw: str | None) -> str | None:
	"""Map person_to_meet to a valid User id (name / email / full_name tolerant)."""
	if not raw:
		return None

	person = str(raw).strip()
	if not person:
		return None
	if frappe.db.exists("User", person):
		return person

	return (
		frappe.db.get_value("User", {"full_name": person, "enabled": 1}, "name")
		or frappe.db.get_value("User", {"email": person, "enabled": 1}, "name")
		or frappe.db.get_value("User", {"first_name": person, "enabled": 1}, "name")
		or frappe.db.get_value("User", {"mobile_no": person, "enabled": 1}, "name")
	)


def get_security_users() -> list[str]:
	"""Enabled users with Visitor Entry create (gate) via Role Permission Manager."""
	return get_users_with_doctype_permission("Visitor Entry", "create")


def _status_copy(status: str, visitor_name: str) -> tuple[str, str, str, bool]:
	"""Return (event, title, body, ring_host)."""
	if status == "Pending Approval":
		return (
			"host_notified",
			_("Visitor waiting at gate"),
			_("Visitor {0} is waiting for your approval at the gate.").format(visitor_name),
			True,
		)
	if status == "Approved":
		return (
			"approved",
			_("Visitor approved"),
			_("{0} has been approved.").format(visitor_name),
			False,
		)
	if status == "Rejected":
		return (
			"rejected",
			_("Visitor rejected"),
			_("{0} has been rejected.").format(visitor_name),
			False,
		)
	if status == "Checked In":
		return (
			"checked_in",
			_("Visitor checked in"),
			_("{0} has checked in.").format(visitor_name),
			False,
		)
	if status == "Meeting Done":
		return (
			"meeting_done",
			_("Meeting completed"),
			_("Meeting with {0} is marked done.").format(visitor_name),
			False,
		)
	if status == "Checked Out":
		return (
			"checked_out",
			_("Visitor checked out"),
			_("{0} has checked out.").format(visitor_name),
			False,
		)
	if status == "Cancelled":
		return (
			"cancelled",
			_("Visit cancelled"),
			_("Visit for {0} was cancelled.").format(visitor_name),
			False,
		)
	return (
		"status_changed",
		_("Visitor update"),
		_("{0} status is now {1}.").format(visitor_name, status),
		False,
	)


def _push_url_for(event: str) -> str:
	if event in ("host_notified", "created"):
		return "/vms/approvals"
	if event in ("checked_in", "meeting_done"):
		return "/vms/inside"
	if event == "security_checkout_required":
		return "/vms/inside"
	return "/vms/"


def _notify_one_user(
	user: str,
	*,
	title: str,
	body: str,
	visitor_entry: str,
	event: str,
	payload: dict,
	ring_host: bool = False,
) -> None:
	if not user or user in ("Guest",):
		return

	try:
		frappe.get_doc(
			{
				"doctype": "Notification Log",
				"for_user": user,
				"from_user": frappe.session.user if frappe.session.user != "Guest" else "Administrator",
				"type": "Alert",
				"document_type": "Visitor Entry",
				"document_name": visitor_entry,
				"subject": title,
				"email_content": body,
			}
		).insert(ignore_permissions=True)
	except Exception:
		frappe.log_error(title="VMS Notification Log failed")

	try:
		publish_event = "host_notified" if ring_host else event
		publish_vms_event(publish_event, payload, user=user)
	except Exception:
		frappe.log_error(title="VMS realtime notify failed")

	try:
		from visitor_management.react_api.push_notification import send_fcm_to_user, send_push_to_user

		send_push_to_user(
			user,
			title=title,
			body=body,
			url=_push_url_for(event),
			tag=f"vms-{visitor_entry}-{event}",
		)
		send_fcm_to_user(
			user,
			title=title,
			body=body,
			url=_push_url_for(event),
			tag=f"vms-{visitor_entry}-{event}",
		)
	except Exception:
		frappe.log_error(title="VMS web/FCM push notify failed")


def notify_security_checkout(doc) -> dict:
	"""Alert security desk users when a visitor is ready for gate checkout."""
	if getattr(frappe.flags, "in_vms_notify", False):
		return {"skipped": True}

	visitor_name = doc.full_name or doc.name
	title = _("Visitor ready for checkout")
	body = _("{0} has completed the meeting. Proceed with gate checkout.").format(visitor_name)

	recipients = get_security_users()
	checked_in_by = doc.get("checked_in_by")
	if checked_in_by and checked_in_by not in recipients and frappe.db.exists("User", checked_in_by):
		recipients.append(checked_in_by)

	if not recipients:
		return {"success": False, "recipients": [], "message": "No security users found"}

	payload = {
		"visitor_entry": doc.name,
		"visitor_name": visitor_name,
		"host": doc.get("person_to_meet_name") or doc.get("person_to_meet"),
		"status": doc.status,
		"message": body,
		"event": "security_checkout_required",
		"alert_variant": "security",
	}

	frappe.flags.in_vms_notify = True
	try:
		for user in recipients:
			_notify_one_user(
				user,
				title=title,
				body=body,
				visitor_entry=doc.name,
				event="security_checkout_required",
				payload=payload,
				ring_host=True,
			)
	finally:
		frappe.flags.in_vms_notify = False

	return {"success": True, "recipients": recipients, "event": "security_checkout_required"}


def notify_host_and_creator(
	doc,
	*,
	event: str | None = None,
	title: str | None = None,
	body: str | None = None,
	ring_host: bool | None = None,
) -> dict:
	"""Notify resolved host + document creator for a Visitor Entry."""
	if getattr(frappe.flags, "in_vms_notify", False):
		return {"skipped": True}

	visitor_name = doc.full_name or doc.name
	status = doc.status or "Pending Approval"
	auto_event, auto_title, auto_body, auto_ring = _status_copy(status, visitor_name)

	event = event or auto_event
	title = title or auto_title
	body = body or auto_body
	if ring_host is None:
		ring_host = auto_ring

	host_user = resolve_host_user(doc.get("person_to_meet"))
	creator = doc.get("owner") if doc.get("owner") and doc.get("owner") != "Guest" else None

	payload = {
		"visitor_entry": doc.name,
		"visitor_name": visitor_name,
		"host": doc.get("person_to_meet_name") or host_user,
		"host_user": host_user,
		"status": status,
		"message": body,
		"owner": creator,
	}

	recipients: list[str] = []
	for user in (host_user, creator):
		if user and user not in recipients:
			recipients.append(user)

	frappe.flags.in_vms_notify = True
	try:
		for user in recipients:
			# Only the host gets the urgent ring modal for pending gate alerts
			do_ring = bool(ring_host and host_user and user == host_user)
			user_title = title
			user_body = body
			if creator and user == creator and host_user and user != host_user and event in (
				"host_notified",
				"created",
			):
				user_title = _("Visitor entry submitted")
				user_body = _("Your visitor entry for {0} was created and is pending approval.").format(
					visitor_name
				)
			_notify_one_user(
				user,
				title=user_title,
				body=user_body,
				visitor_entry=doc.name,
				event=event,
				payload=payload,
				ring_host=do_ring,
			)
	finally:
		frappe.flags.in_vms_notify = False

	return {
		"success": True,
		"recipients": recipients,
		"event": event,
		"host_user": host_user,
		"creator": creator,
	}


def notify_visitor_lifecycle(doc, previous=None) -> dict | None:
	"""Called from Visitor Entry on_update (including insert)."""
	if frappe.flags.in_import or frappe.flags.in_install or frappe.flags.in_migrate:
		return None
	if getattr(frappe.flags, "in_vms_notify", False):
		return None

	# New document
	if previous is None:
		return notify_host_and_creator(doc, event="created", ring_host=True)

	status_changed = previous.get("status") != doc.get("status")
	host_changed = previous.get("person_to_meet") != doc.get("person_to_meet")

	if not status_changed and not host_changed:
		return None

	if host_changed and not status_changed:
		visitor_name = doc.full_name or doc.name
		return notify_host_and_creator(
			doc,
			event="transferred",
			title=_("Visitor transferred to you"),
			body=_("Visitor {0} was transferred to you and needs approval.").format(visitor_name),
			ring_host=doc.status in ("Pending Approval", "Pending"),
		)

	result = notify_host_and_creator(doc)
	if status_changed and doc.status == "Meeting Done":
		notify_security_checkout(doc)
	return result
