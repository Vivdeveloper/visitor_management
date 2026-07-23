"""Host meeting start / complete tracking."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime

from visitor_management.realtime.publisher import publish_visitor_update
from visitor_management.services.approval_service import _ensure_can_act


def start_meeting(visitor_entry: str, user: str | None = None, remarks: str | None = None) -> dict:
	"""Host marks meeting started. Status stays Checked In."""
	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	actor = _ensure_can_act(doc, user)

	if doc.status != "Checked In":
		frappe.throw(_("Meeting can only start after check-in. Current status: {0}").format(doc.status))

	if doc.meeting_started_on:
		frappe.throw(_("Meeting was already started at {0}.").format(doc.meeting_started_on))

	doc.meeting_started_on = now_datetime()
	if remarks:
		_append_meeting_remarks(doc, remarks, _("Started by {0}").format(actor))
	doc.save(ignore_permissions=True)

	publish_visitor_update(
		doc.name,
		"meeting_started",
		{"status": doc.status, "meeting_started_on": str(doc.meeting_started_on), "action_by": actor},
	)

	return {
		"name": doc.name,
		"status": doc.status,
		"meeting_started_on": str(doc.meeting_started_on),
	}


def complete_meeting(visitor_entry: str, user: str | None = None, remarks: str | None = None) -> dict:
	"""Host marks meeting complete → Meeting Done (checkout reminder later)."""
	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	actor = _ensure_can_act(doc, user)

	if doc.status != "Checked In":
		frappe.throw(
			_("Meeting can only be completed while visitor is Checked In. Current status: {0}").format(
				doc.status
			)
		)

	if not doc.meeting_started_on:
		# Allow complete without explicit start — treat start = end for short visits
		doc.meeting_started_on = now_datetime()

	doc.meeting_ended_on = now_datetime()
	doc.meeting_done_on = doc.meeting_ended_on
	doc.status = "Meeting Done"
	_append_meeting_remarks(doc, remarks, _("Completed by {0}").format(actor))
	doc.save(ignore_permissions=True)

	publish_visitor_update(
		doc.name,
		"meeting_completed",
		{
			"status": doc.status,
			"meeting_started_on": str(doc.meeting_started_on),
			"meeting_ended_on": str(doc.meeting_ended_on),
			"action_by": actor,
			"host": doc.person_to_meet,
		},
	)

	return {
		"name": doc.name,
		"status": doc.status,
		"meeting_started_on": str(doc.meeting_started_on),
		"meeting_ended_on": str(doc.meeting_ended_on),
	}


def _append_meeting_remarks(doc, remarks: str | None, prefix: str) -> None:
	note = (remarks or "").strip()
	line = f"{prefix}: {note}" if note else prefix
	existing = (doc.meeting_remarks or "").strip()
	doc.meeting_remarks = f"{existing}\n{line}".strip() if existing else line
