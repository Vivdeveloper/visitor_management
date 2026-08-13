"""Publish visitor events to Frappe realtime channels."""

from __future__ import annotations

import frappe


def publish_vms_event(
	event: str, payload: dict | None = None, user: str | None = None
) -> None:
	"""Publish a generic VMS realtime event.

	- Always emits ``vms_visitor_update`` (site-wide + optional user room).
	- Urgent channels also emit site-wide so PWA clients that are not in the
	  Frappe user room still receive popup + sound (clients filter by host/owner).
	"""
	message = {"event": event, **(payload or {})}
	try:
		frappe.publish_realtime(
			event="vms_visitor_update",
			message=message,
			after_commit=True,
		)
		if user:
			frappe.publish_realtime(
				event="vms_visitor_update",
				message=message,
				user=user,
				after_commit=True,
			)

		if event == "host_notified":
			# Site-wide first — PWA HostAlertContext filters by host_user.
			frappe.publish_realtime(
				event="vms_host_alert",
				message=message,
				after_commit=True,
			)
			if user:
				frappe.publish_realtime(
					event="vms_host_alert",
					message=message,
					user=user,
					after_commit=True,
				)

		if event == "creator_alert":
			frappe.publish_realtime(
				event="vms_creator_alert",
				message=message,
				after_commit=True,
			)
			if user:
				frappe.publish_realtime(
					event="vms_creator_alert",
					message=message,
					user=user,
					after_commit=True,
				)

		if event == "security_checkout_required":
			frappe.publish_realtime(
				event="vms_security_alert",
				message=message,
				after_commit=True,
			)
			if user:
				frappe.publish_realtime(
					event="vms_security_alert",
					message=message,
					user=user,
					after_commit=True,
				)
	except Exception:
		frappe.log_error(title="VMS realtime publish failed")


def publish_visitor_update(visitor_entry: str, event: str, data: dict | None = None) -> None:
	"""Notify SPA / desk listeners (no SMS/push in Phase 5)."""
	payload = {"visitor_entry": visitor_entry, "event": event, **(data or {})}
	try:
		frappe.publish_realtime(
			event="vms_visitor_update",
			message=payload,
			after_commit=True,
		)
		# Also notify the current host user room when known
		host = (data or {}).get("to_host") or frappe.db.get_value(
			"Visitor Entry", visitor_entry, "person_to_meet"
		)
		if host:
			frappe.publish_realtime(
				event="vms_visitor_update",
				message=payload,
				user=host,
				after_commit=True,
			)
	except Exception:
		frappe.log_error(title="VMS realtime publish failed")
