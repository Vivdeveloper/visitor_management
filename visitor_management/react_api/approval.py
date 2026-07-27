"""Host approval workflow API — thin wrappers over Visitor Entry methods."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.realtime.publisher import publish_vms_event
from visitor_management.visitor_management.doctype.visitor_entry import visitor_entry as ve


def _resolve_host_user(raw: str | None) -> str | None:
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


@frappe.whitelist()
def approve(visitor_entry: str | None = None, remarks: str | None = None, floor: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.approve(visitor_entry, remarks=remarks, floor=floor)}


@frappe.whitelist()
def reject(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {"success": True, **ve.reject(visitor_entry, remarks=remarks)}


@frappe.whitelist()
def transfer(
	visitor_entry: str | None = None,
	transfer_to_user: str | None = None,
	remarks: str | None = None,
) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	return {
		"success": True,
		**ve.transfer(visitor_entry, transfer_to_user=transfer_to_user, remarks=remarks),
	}


@frappe.whitelist()
def notify_host(visitor_entry: str | None = None, message: str | None = None) -> dict:
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))

	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	host_user = _resolve_host_user(doc.person_to_meet)
	if not host_user:
		frappe.throw(_("No valid host user is assigned for this visitor. Set Person to Meet first."))

	host_name = doc.person_to_meet_name or host_user
	visitor_name = doc.full_name or doc.name
	alert_message = message or _("Visitor {0} is waiting at the gate").format(visitor_name)
	payload = {
		"visitor_entry": visitor_entry,
		"visitor_name": visitor_name,
		"host": host_name,
		"host_user": host_user,
		"message": alert_message,
	}

	notification_logged = False
	realtime_sent = False
	try:
		frappe.get_doc(
			{
				"doctype": "Notification Log",
				"for_user": host_user,
				"from_user": frappe.session.user,
				"type": "Alert",
				"document_type": "Visitor Entry",
				"document_name": doc.name,
				"subject": _("Visitor Alert: {0}").format(visitor_name),
				"email_content": alert_message,
			}
		).insert(ignore_permissions=True)
		notification_logged = True
	except Exception:
		frappe.log_error(title="VMS notify_host Notification Log failed")

	try:
		publish_vms_event("host_notified", payload, user=host_user)
		realtime_sent = True
	except Exception:
		frappe.log_error(title="VMS notify_host realtime publish failed")

	try:
		from visitor_management.react_api.push_notification import send_push_to_user

		push_sent = send_push_to_user(
			host_user,
			title=_("Visitor waiting at gate"),
			body=alert_message,
			url=f"/vms/approvals",
			tag=f"vms-{visitor_entry}",
		)
		if push_sent:
			realtime_sent = True
	except Exception:
		frappe.log_error(title="VMS notify_host web push failed")

	if not notification_logged and not realtime_sent:
		frappe.throw(_("Could not deliver host alert. Check socket.io / redis and try again."))

	return {
		"success": True,
		"message": _("Notification sent to {0}").format(host_name),
		"host_name": host_name,
		"host_user": host_user,
		"visitor_entry": visitor_entry,
		"notification_logged": notification_logged,
		"realtime_sent": realtime_sent,
	}


@frappe.whitelist()
def list_for_host(status: str | None = None) -> list:
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Login required"))

	filters: dict = {}
	if "System Manager" not in frappe.get_roles(user):
		filters["person_to_meet"] = user
	filters["status"] = status or "Pending Approval"

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
			"person_to_meet",
			"person_to_meet_name",
			"floor",
			"modified",
		],
		order_by="modified desc",
		limit_page_length=100,
	)
