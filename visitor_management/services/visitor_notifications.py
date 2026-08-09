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


def _login_user(raw: str | None) -> str | None:
	"""Resolve any Host.user / email / name to enabled ``User.name`` (login id)."""
	if not raw:
		return None
	person = str(raw).strip()
	if not person or person == "Guest":
		return None

	if frappe.db.exists("User", person):
		if not frappe.db.get_value("User", person, "enabled"):
			return None
		return _canonical_user(person)

	by_email = frappe.db.get_value("User", {"email": person, "enabled": 1}, "name")
	if by_email:
		return _canonical_user(by_email)

	return None


def resolve_host_user(raw: str | None) -> str | None:
	"""Map person_to_meet (Host.name or User) → User.name for notifications / push.

	Host DocType is the master list; ``Host.user`` is the login that receives alerts.
	With autoname ``field:user``, Host.name usually equals User.name.
	"""
	if not raw:
		return None

	person = str(raw).strip()
	if not person:
		return None

	if frappe.db.exists("DocType", "Host"):
		if frappe.db.exists("Host", person):
			user = frappe.db.get_value("Host", person, "user")
			return _login_user(user) or _login_user(person)
		by_user = frappe.db.get_value("Host", {"user": person}, ["name", "user"], as_dict=True)
		if by_user:
			return _login_user(by_user.user) or _login_user(by_user.name)

	login = _login_user(person)
	if login:
		return login

	for field in ("full_name", "first_name", "mobile_no"):
		matches = frappe.get_all(
			"User",
			filters={field: person, "enabled": 1},
			pluck="name",
			limit_page_length=20,
		)
		picked = _prefer_email_user(matches)
		if picked:
			return picked

	return None


def resolve_host_link(raw: str | None) -> str | None:
	"""Map input → Host.name for Visitor Entry.person_to_meet (Link → Host)."""
	if not raw:
		return None

	person = str(raw).strip()
	if not person:
		return None

	if not frappe.db.exists("DocType", "Host"):
		# Legacy sites without Host DocType — fall back to User id.
		return resolve_host_user(person)

	if frappe.db.exists("Host", person):
		return person

	by_user = frappe.db.get_value("Host", {"user": person}, "name")
	if by_user:
		return by_user

	matches = frappe.get_all(
		"Host",
		filters={"full_name": person},
		pluck="name",
		limit_page_length=5,
	)
	if len(matches) == 1:
		return matches[0]

	# Recover from display name via User, then Host.user
	user = resolve_host_user(person)
	if user:
		by_user = frappe.db.get_value("Host", {"user": user}, "name")
		if by_user:
			return by_user
		if frappe.db.exists("Host", user):
			return user

	return None


def list_host_options() -> list[dict]:
	"""Active Host DocType rows for PWA / desk pickers (value = Host.name).

	Includes Administrator when a Host row points at that User (previously skipped).
	"""
	if not frappe.db.exists("DocType", "Host"):
		return []

	filters: dict = {}
	if frappe.db.has_column("Host", "is_active"):
		filters["is_active"] = 1

	hosts = frappe.get_all(
		"Host",
		filters=filters,
		fields=["name", "user", "full_name"],
		order_by="full_name asc, name asc",
		limit_page_length=500,
		ignore_permissions=True,
	)

	rows: list[dict] = []
	seen: set[str] = set()
	for host in hosts:
		raw_user = (host.get("user") or host.get("name") or "").strip()
		if not raw_user or raw_user == "Guest":
			continue
		# Prefer real login id (e.g. Host.user stored as email → User.name Administrator).
		login = _login_user(raw_user) or _login_user(host.get("name"))
		if not login:
			continue
		value = host["name"]
		if value in seen:
			continue
		seen.add(value)
		label = (host.get("full_name") or frappe.db.get_value("User", login, "full_name") or login).strip()
		rows.append(
			{
				"value": value,
				"label": label,
				"email": login,
			}
		)
	return rows


def _prefer_email_user(names: list[str]) -> str | None:
	if not names:
		return None
	emailish = [n for n in names if isinstance(n, str) and "@" in n]
	if emailish:
		return sorted(emailish)[0]
	for name in names:
		canonical = _canonical_user(name)
		if canonical and "@" in canonical:
			return canonical
	return names[0]


def _canonical_user(user_name: str) -> str:
	"""If a hash User duplicates a real email User, prefer the email User.name."""
	if not user_name:
		return user_name
	if "@" in user_name:
		return user_name
	email = frappe.db.get_value("User", user_name, "email")
	if email and email != user_name and frappe.db.exists("User", email):
		return email
	return user_name


def get_security_users() -> list[str]:
	"""Enabled users with Visitor Entry create (gate) via Role Permission Manager."""
	return get_users_with_doctype_permission("Visitor Entry", "create")


def _extract_reject_reason(remarks: str | None) -> str | None:
	if not remarks:
		return None
	lines = [line.strip() for line in str(remarks).splitlines() if line.strip()]
	for line in reversed(lines):
		lower = line.lower()
		if lower.startswith("rejected by") and ":" in line:
			reason = line.split(":", 1)[1].strip()
			if reason:
				return reason
	return None


def _status_copy(status: str, visitor_name: str, remarks: str | None = None) -> tuple[str, str, str, str | None]:
	"""Return (event, title, body, ring_for) where ring_for is 'host' | 'creator' | None.

	Urgent sound matrix (Tawk-like):
	- Pending Approval → Host
	- Approved / Rejected → Creator
	- Checked In → Host
	- Meeting Done → Creator
	- Cancelled → Host
	"""
	if status == "Pending Approval":
		return (
			"host_notified",
			_("Visitor waiting at gate"),
			_("Visitor {0} is waiting for your approval at the gate.").format(visitor_name),
			"host",
		)
	if status == "Approved":
		return (
			"approved",
			_("Visitor approved"),
			_("{0} has been approved.").format(visitor_name),
			"creator",
		)
	if status == "Rejected":
		reason = _extract_reject_reason(remarks)
		body = (
			_("{0} has been rejected. Reason: {1}").format(visitor_name, reason)
			if reason
			else _("{0} has been rejected.").format(visitor_name)
		)
		return (
			"rejected",
			_("Visitor rejected"),
			body,
			"creator",
		)
	if status == "Checked In":
		return (
			"checked_in",
			_("Visitor checked in"),
			_("{0} has checked in and is with you.").format(visitor_name),
			"host",
		)
	if status == "Meeting Done":
		return (
			"meeting_done",
			_("Meeting completed"),
			_("Meeting with {0} is marked done — proceed with gate checkout.").format(visitor_name),
			"creator",
		)
	if status == "Checked Out":
		return (
			"checked_out",
			_("Visitor checked out"),
			_("{0} has checked out.").format(visitor_name),
			None,
		)
	if status == "Cancelled":
		return (
			"cancelled",
			_("Visit cancelled"),
			_("Visit for {0} was cancelled.").format(visitor_name),
			"host",
		)
	return (
		"status_changed",
		_("Visitor update"),
		_("{0} status is now {1}.").format(visitor_name, status),
		None,
	)


def _push_url_for(event: str) -> str:
	if event in ("host_notified", "created"):
		return "/vms/approvals"
	if event in ("checked_in", "meeting_done"):
		return "/vms/inside"
	if event == "rejected":
		return "/vms/inside?status=rejected"
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
	ring_channel: str | None = None,
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
		publish_event = event
		if ring_host and (ring_channel == "security" or event == "security_checkout_required"):
			# Keep checkout event so clients get `vms_security_alert` (not host ring).
			publish_event = "security_checkout_required"
		elif ring_host and ring_channel == "creator":
			publish_event = "creator_alert"
		elif ring_host:
			publish_event = "host_notified"
		elif event in ("host_notified", "created"):
			# Soft update — never open the urgent host ring from Desk saves.
			publish_event = "visitor_registered"
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
				ring_channel="security",
			)
	finally:
		frappe.flags.in_vms_notify = False

	return {"success": True, "recipients": recipients, "event": "security_checkout_required"}


def _resolve_ring_for(ring_for: str | bool | None, auto_ring_for: str | None) -> str | None:
	"""Normalize ring target: 'host' | 'creator' | None.

	``ring_host=True`` (legacy) maps to host. ``None`` uses status matrix.
	"""
	if ring_for is None:
		return auto_ring_for
	if ring_for is True:
		return "host"
	if ring_for is False:
		return None
	if ring_for in ("host", "creator"):
		return ring_for
	return None


def notify_host_and_creator(
	doc,
	*,
	event: str | None = None,
	title: str | None = None,
	body: str | None = None,
	ring_host: bool | str | None = None,
	ring_for: str | bool | None = None,
) -> dict:
	"""Notify resolved host + document creator for a Visitor Entry.

	Urgent sound goes only to ``ring_for`` (host or creator) per status matrix.
	"""
	if getattr(frappe.flags, "in_vms_notify", False):
		return {"skipped": True}

	visitor_name = doc.full_name or doc.name
	status = doc.status or "Pending Approval"
	auto_event, auto_title, auto_body, auto_ring_for = _status_copy(
		status, visitor_name, doc.get("approval_remarks")
	)

	event = event or auto_event
	title = title or auto_title
	body = body or auto_body
	# Prefer explicit ring_for; fall back to legacy ring_host kwarg.
	effective_ring = _resolve_ring_for(
		ring_for if ring_for is not None else ring_host,
		auto_ring_for,
	)

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
		"ring_for": effective_ring,
		"lifecycle_event": event,
	}

	recipients: list[str] = []
	for user in (host_user, creator):
		if user and user not in recipients:
			recipients.append(user)

	# Gate desk should also see rejection alerts in the notification bar.
	if status == "Rejected":
		for user in get_security_users():
			if user and user not in recipients:
				recipients.append(user)

	frappe.flags.in_vms_notify = True
	try:
		for user in recipients:
			do_ring = False
			channel = None
			if effective_ring == "host" and host_user and user == host_user:
				do_ring = True
				channel = "host"
			elif effective_ring == "creator" and creator and user == creator:
				do_ring = True
				channel = "creator"

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
				payload={**payload, "message": user_body},
				ring_host=do_ring,
				ring_channel=channel,
			)
	finally:
		frappe.flags.in_vms_notify = False

	return {
		"success": True,
		"recipients": recipients,
		"event": event,
		"host_user": host_user,
		"creator": creator,
		"ring_for": effective_ring,
	}


def notify_visitor_lifecycle(doc, previous=None) -> dict | None:
	"""Called from Visitor Entry on_update (including insert)."""
	if frappe.flags.in_import or frappe.flags.in_install or frappe.flags.in_migrate:
		return None
	if getattr(frappe.flags, "in_vms_notify", False):
		return None

	# New entry — ring host when status is Pending Approval (creator → host).
	if previous is None:
		return notify_host_and_creator(doc, event="created")

	status_changed = previous.get("status") != doc.get("status")
	host_changed = previous.get("person_to_meet") != doc.get("person_to_meet")

	if not status_changed and not host_changed:
		return None

	if host_changed and not status_changed:
		visitor_name = doc.full_name or doc.name
		# Ring only when transfer API sets vms_ring_host (not Desk host field edits).
		do_ring = bool(getattr(doc.flags, "vms_ring_host", False)) and doc.status in (
			"Pending Approval",
			"Pending",
		)
		return notify_host_and_creator(
			doc,
			event="transferred",
			title=_("Visitor transferred to you"),
			body=_("Visitor {0} was transferred to you and needs approval.").format(visitor_name),
			ring_for="host" if do_ring else False,
		)

	result = notify_host_and_creator(doc)
	if status_changed and doc.status == "Meeting Done":
		notify_security_checkout(doc)
	return result
