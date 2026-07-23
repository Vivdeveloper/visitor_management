"""Publish visitor events to Frappe realtime channels."""

from __future__ import annotations

import frappe


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
