"""Publish visitor events to Frappe realtime channels."""

from __future__ import annotations

import frappe


def publish_vms_event(
	event: str, payload: dict | None = None, user: str | None = None
) -> None:
	"""Publish a generic VMS realtime event.

	- ``vms_visitor_update`` is site-wide for list refresh (soft lifecycle event).
	- Urgent rings (``vms_host_alert`` / ``vms_creator_alert`` / ``vms_security_alert``)
	  go **only** to the target ``user`` room — never site-wide.
	"""
	body = payload or {}
	lifecycle = body.get("lifecycle_event") or event
	# Site-wide refresh must not carry urgent ring event names (every client would see them).
	soft_message = {**body, "event": lifecycle if event in ("host_notified", "creator_alert", "security_checkout_required") else event}
	urgent_message = {"event": event, **body}

	try:
		frappe.publish_realtime(
			event="vms_visitor_update",
			message=soft_message,
			after_commit=True,
		)
		if user:
			frappe.publish_realtime(
				event="vms_visitor_update",
				message=urgent_message,
				user=user,
				after_commit=True,
			)

		if event == "host_notified" and user:
			frappe.publish_realtime(
				event="vms_host_alert",
				message=urgent_message,
				user=user,
				after_commit=True,
			)

		if event == "creator_alert" and user:
			frappe.publish_realtime(
				event="vms_creator_alert",
				message=urgent_message,
				user=user,
				after_commit=True,
			)

		if event == "security_checkout_required" and user:
			frappe.publish_realtime(
				event="vms_security_alert",
				message=urgent_message,
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
