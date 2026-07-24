# Copyright (c) 2026, Vivek Choudhary and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_to_date, get_url, now_datetime, time_diff_in_seconds

from visitor_management.services import otp_service


# Flow: Pending Approval → Approved → Checked In → Meeting Done → Checked Out
STATUS_AUDIT_FIELDS = {
	"Approved": "approved_on",
	"Rejected": "rejected_on",
	"Checked In": "checked_in_on",
	"Checked Out": "checked_out_on",
	"Meeting Done": "meeting_done_on",
	"Cancelled": "cancelled_on",
	"Completed": "completed_on",
}


class VisitorEntry(Document):
	def validate(self):
		self.set_full_name()
		self.set_image_previews()
		self.validate_otp()
		self.normalize_legacy_status()
		self.stamp_status_audit()

	def before_insert(self):
		if not self.status or self.status == "Awaiting":
			self.status = "Pending Approval"

	def stamp_status_audit(self):
		fieldname = STATUS_AUDIT_FIELDS.get(self.status)
		if not fieldname:
			return

		status_changed = self.has_value_changed("status") if not self.is_new() else True
		if not status_changed and self.get(fieldname):
			return

		now = now_datetime()
		if not self.get(fieldname):
			self.set(fieldname, now)

		if self.status == "Checked In" and self.meta.has_field("check_in"):
			if not self.get("check_in"):
				self.check_in = self.get("checked_in_on") or now
			if not self.get("checked_in_on"):
				self.checked_in_on = self.check_in
		elif self.status == "Checked Out" and self.meta.has_field("check_out"):
			if not self.get("check_out"):
				self.check_out = self.get("checked_out_on") or now
			if not self.get("checked_out_on"):
				self.checked_out_on = self.check_out

	def set_full_name(self):
		parts = [self.first_name, self.middle_name, self.last_name]
		self.full_name = " ".join(part for part in parts if part)

	def set_image_previews(self):
		if self.id_proof_photo:
			self.id_proof_photo_preview = self.id_proof_photo

	def validate_otp(self):
		if frappe.flags.in_import or frappe.flags.in_install:
			return

		# Bypass for test OTP 12345 / 123456 or logged-in Desk users
		if (self.otp and str(self.otp).strip() in ("12345", "123456")) or frappe.session.user != "Guest":
			self.otp_verified = 1
			return

		if not self.otp_verified:
			frappe.throw(_("Please verify the mobile OTP before saving."))

	def normalize_legacy_status(self):
		if self.status == "Awaiting":
			self.status = "Pending Approval"

	def _append_remarks(self, remarks: str | None, prefix: str) -> None:
		note = (remarks or "").strip()
		line = f"{prefix}: {note}" if note else prefix
		existing = (self.approval_remarks or "").strip()
		self.approval_remarks = f"{existing}\n{line}".strip() if existing else line

	def _ensure_host_or_manager(self) -> str:
		user = frappe.session.user
		if user == "Guest":
			frappe.throw(_("Login required"))
		if "System Manager" in frappe.get_roles(user):
			return user
		if self.person_to_meet and self.person_to_meet == user:
			return user
		frappe.throw(_("Only the assigned host or System Manager can perform this action."))

	def _ensure_gate_operator(self) -> str:
		user = frappe.session.user
		if "System Manager" not in frappe.get_roles(user):
			frappe.throw(_("Only System Manager can perform gate operations."))
		return user


def _get_entry(name: str) -> VisitorEntry:
	if not name:
		frappe.throw(_("Visitor Entry is required"))
	return frappe.get_doc("Visitor Entry", name)


def _format_duration(seconds: float | int) -> str:
	seconds = max(int(seconds or 0), 0)
	hours, rem = divmod(seconds, 3600)
	minutes, secs = divmod(rem, 60)
	if hours:
		return f"{hours}h {minutes}m"
	if minutes:
		return f"{minutes}m {secs}s"
	return f"{secs}s"


def _pass_url(name: str) -> str:
	return get_url(f"/vms/pass/{name}")


def _assign_gate_pass(doc: VisitorEntry) -> None:
	"""Auto-create gate pass URL + expiry on check-in."""
	if doc.meta.has_field("pass_url"):
		doc.pass_url = _pass_url(doc.name)
	if doc.meta.has_field("qr_expires_on"):
		doc.qr_expires_on = add_to_date(now_datetime(), hours=24, as_datetime=True)


@frappe.whitelist()
def send_otp(mobile):
	return otp_service.generate_and_send_otp(mobile, purpose="visitor_registration")


@frappe.whitelist()
def verify_otp(mobile, otp):
	return otp_service.verify_otp(mobile, otp, purpose="visitor_registration")


@frappe.whitelist()
def approve(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Pending Approval → Approved (host approves before gate check-in)."""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_host_or_manager()
	if doc.status != "Pending Approval":
		frappe.throw(_("Only Pending visitors can be approved. Current status: {0}").format(doc.status))

	doc.status = "Approved"
	doc.approved_on = now_datetime()
	doc._append_remarks(remarks, _("Approved by {0}").format(actor))
	doc.save(ignore_permissions=True)

	return {
		"name": doc.name,
		"status": doc.status,
		"message": _("Visitor approved."),
	}


@frappe.whitelist()
def check_in(visitor_entry: str | None = None) -> dict:
	"""Approved → Checked In (+ auto gate pass)."""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_gate_operator()
	if doc.status != "Approved":
		frappe.throw(_("Only Approved visitors can check in. Current status: {0}").format(doc.status))

	now = now_datetime()
	doc.status = "Checked In"
	doc.checked_in_on = now
	if doc.meta.has_field("check_in"):
		doc.check_in = now
	if doc.meta.has_field("checked_in_by"):
		doc.checked_in_by = actor
	_assign_gate_pass(doc)
	doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		"status": doc.status,
		"pass_url": doc.get("pass_url"),
		"message": _("Visitor checked in. Gate pass generated."),
	}


@frappe.whitelist()
def reject(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Reject while Pending Approval (before host approval)."""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_host_or_manager()
	if doc.status != "Pending Approval":
		frappe.throw(_("Visitor can only be rejected before approval. Current status: {0}").format(doc.status))

	doc.status = "Rejected"
	doc.rejected_on = now_datetime()
	doc._append_remarks(remarks, _("Rejected by {0}").format(actor))
	doc.save(ignore_permissions=True)
	return {"name": doc.name, "status": doc.status, "message": _("Visitor rejected.")}


@frappe.whitelist()
def transfer(
	visitor_entry: str | None = None,
	transfer_to_user: str | None = None,
	remarks: str | None = None,
) -> dict:
	"""Reassign host while Pending Approval."""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_host_or_manager()
	if doc.status != "Pending Approval":
		frappe.throw(_("Transfer is only allowed before approval. Current status: {0}").format(doc.status))
	if not transfer_to_user:
		frappe.throw(_("Please select a user to transfer to."))
	if not frappe.db.exists("User", transfer_to_user):
		frappe.throw(_("User {0} does not exist").format(transfer_to_user))
	if transfer_to_user == doc.person_to_meet:
		frappe.throw(_("Visitor is already assigned to this host."))

	previous = doc.person_to_meet
	doc.transfer_to_user = transfer_to_user
	doc.person_to_meet = transfer_to_user
	doc._append_remarks(
		remarks,
		_("Transferred from {0} to {1} by {2}").format(previous or "—", transfer_to_user, actor),
	)
	doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		"status": doc.status,
		"person_to_meet": doc.person_to_meet,
		"message": _("Visitor transferred."),
	}


@frappe.whitelist()
def complete_meeting(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Checked In → Meeting Done."""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_host_or_manager()
	if doc.status != "Checked In":
		frappe.throw(_("Meeting can only be completed after check-in. Current status: {0}").format(doc.status))

	doc.status = "Meeting Done"
	doc.meeting_done_on = now_datetime()
	doc._append_remarks(remarks, _("Meeting completed by {0}").format(actor))
	doc.save(ignore_permissions=True)
	return {"name": doc.name, "status": doc.status, "message": _("Meeting completed.")}


@frappe.whitelist()
def check_out(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Meeting Done → Checked Out (Exit)."""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_gate_operator()
	if doc.status != "Meeting Done":
		frappe.throw(_("Checkout allowed after Meeting Done. Current status: {0}").format(doc.status))

	now = now_datetime()
	doc.status = "Checked Out"
	doc.checked_out_on = now
	if doc.meta.has_field("check_out"):
		doc.check_out = now
	if doc.meta.has_field("checked_out_by"):
		doc.checked_out_by = actor
	if remarks:
		doc._append_remarks(remarks, _("Checkout by {0}").format(actor))

	start = doc.get("check_in") or doc.get("checked_in_on")
	if start and doc.meta.has_field("visit_duration"):
		doc.visit_duration = _format_duration(time_diff_in_seconds(now, start))

	doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		"status": doc.status,
		"visit_duration": doc.get("visit_duration"),
		"message": _("Visitor checked out."),
	}


@frappe.whitelist()
def generate_pass(visitor_entry: str | None = None, force: int | None = None) -> dict:
	"""Compatibility: gate pass is created automatically on check-in."""
	doc = _get_entry(visitor_entry)
	if doc.status not in ("Checked In", "Meeting Done"):
		frappe.throw(_("Gate pass is generated automatically on check-in."))

	_assign_gate_pass(doc)
	doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		"pass_url": doc.pass_url,
		"qr_expires_on": str(doc.qr_expires_on) if doc.get("qr_expires_on") else None,
		"message": _("Gate pass ready."),
	}
