# Copyright (c) 2026, Vivek Choudhary and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_to_date, get_url, now_datetime, time_diff_in_seconds



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
		self.set_company_from_defaults()
		self.autocorrect_names()
		self.set_full_name()
		self.canonicalize_host()
		self.set_image_previews()
		self.validate_otp()
		self.normalize_legacy_status()
		self.stamp_status_audit()

	def set_company_from_defaults(self):
		"""Fetch Company from Global Defaults when empty."""
		if self.get("company"):
			return
		company = frappe.db.get_single_value("Global Defaults", "default_company")
		if company:
			self.company = company

	def canonicalize_host(self):
		"""person_to_meet is Link → Host; repair orphan ids via Host master / display name."""
		from visitor_management.services.visitor_notifications import resolve_host_link

		if not self.person_to_meet and not self.person_to_meet_name:
			return

		resolved = resolve_host_link(self.person_to_meet)
		if not resolved and self.person_to_meet_name:
			resolved = resolve_host_link(self.person_to_meet_name)
		if resolved:
			self.person_to_meet = resolved
			full_name = frappe.db.get_value("Host", resolved, "full_name")
			if not full_name and frappe.db.exists("DocType", "Host"):
				user = frappe.db.get_value("Host", resolved, "user")
				full_name = frappe.db.get_value("User", user, "full_name") if user else None
			if full_name:
				self.person_to_meet_name = full_name
		elif self.person_to_meet and frappe.db.exists("DocType", "Host") and not frappe.db.exists(
			"Host", self.person_to_meet
		):
			frappe.throw(
				_("Select a valid Host. Current value is not in Host list: {0}").format(self.person_to_meet)
			)

	def autocorrect_names(self):
		"""vivEk → Vivek (and same for middle / last name)."""
		from visitor_management.utils.name_case import autocorrect_name_fields

		autocorrect_name_fields(self)

	def before_insert(self):
		self.set_company_from_defaults()
		if not self.status or self.status == "Awaiting":
			self.status = "Pending Approval"

	def after_insert(self):
		"""Auto-create gate pass URL when Visitor Entry is first saved."""
		if self.meta.has_field("pass_url") and not self.get("pass_url"):
			_assign_gate_pass(self)
			updates = {}
			if self.meta.has_field("pass_url") and self.get("pass_url"):
				updates["pass_url"] = self.pass_url
			if self.meta.has_field("qr_expires_on") and self.get("qr_expires_on"):
				updates["qr_expires_on"] = self.qr_expires_on
			if updates:
				frappe.db.set_value("Visitor Entry", self.name, updates, update_modified=False)
				for key, value in updates.items():
					self.set(key, value)

	def on_update(self):
		"""Auto-notify host + creator on create and status / host changes."""
		try:
			from visitor_management.services.visitor_notifications import notify_visitor_lifecycle

			notify_visitor_lifecycle(self, previous=self.get_doc_before_save())
		except Exception:
			frappe.log_error(title="VMS auto notification failed")

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
		"""Derive `otp_verified` server-side; never trust it from the client."""
		if frappe.flags.in_import or frappe.flags.in_install:
			return

		# Staff logged into the Desk are vouching for the visitor in person.
		if frappe.session.user != "Guest":
			self.otp_verified = 1
			return

		from visitor_management.react_api.otp import is_mobile_verified

		self.otp_verified = 1 if is_mobile_verified(self.mobile, "visitor_registration") else 0
		if not self.otp_verified:
			frappe.throw(_("Please verify the mobile number with an OTP before saving."))

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
		if not user or user == "Guest":
			return "Desk Operator"
		return user

	def _ensure_gate_operator(self) -> str:
		user = frappe.session.user
		if not user or user == "Guest":
			return "Gate Operator"
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
	"""Assign gate pass URL + QR expiry (created on insert; refreshed on check-in)."""
	if doc.meta.has_field("pass_url"):
		doc.pass_url = _pass_url(doc.name)
	if doc.meta.has_field("qr_expires_on"):
		doc.qr_expires_on = add_to_date(now_datetime(), hours=24, as_datetime=True)


@frappe.whitelist()
def approve(visitor_entry: str | None = None, remarks: str | None = None, floor: str | None = None) -> dict:
	"""Pending Approval → Approved (host approves before gate check-in)."""
	from visitor_management.auth.permissions import require_approve_role

	require_approve_role()
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_host_or_manager()
	if doc.status != "Pending Approval":
		frappe.throw(_("Only Pending visitors can be approved. Current status: {0}").format(doc.status))

	if floor:
		doc.floor = floor
	if not doc.floor:
		frappe.throw(_("Please select a floor before approval."))

	doc.status = "Approved"
	doc.approved_on = now_datetime()
	doc._append_remarks(remarks, _("Approved by {0}").format(actor))
	# Ensure gate pass exists (also auto-created on insert for new entries)
	if not doc.get("pass_url"):
		_assign_gate_pass(doc)
	doc.save(ignore_permissions=True)

	return {
		"name": doc.name,
		"status": doc.status,
		"floor": doc.floor,
		"pass_url": doc.get("pass_url"),
		"message": _("Visitor approved."),
	}


@frappe.whitelist()
def check_in(visitor_entry: str | None = None, floor: str | None = None) -> dict:
	"""Approved → Checked In (+ auto gate pass)."""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_gate_operator()
	if doc.status != "Approved":
		frappe.throw(_("Only Approved visitors can check in. Current status: {0}").format(doc.status))

	if floor:
		doc.floor = floor

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
	from visitor_management.auth.permissions import require_approve_role

	require_approve_role()
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
def reopen_to_pending(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Rejected → Pending Approval so the host can decide again."""
	from visitor_management.auth.permissions import require_approve_role

	require_approve_role()
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_host_or_manager()
	if doc.status != "Rejected":
		frappe.throw(_("Only Rejected visitors can move back to Pending. Current status: {0}").format(doc.status))

	doc.status = "Pending Approval"
	if doc.meta.has_field("rejected_on"):
		doc.rejected_on = None
	doc._append_remarks(remarks, _("Moved back to Pending by {0}").format(actor))
	doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		"status": doc.status,
		"message": _("Visitor moved back to Pending Approval."),
	}


@frappe.whitelist()
def cancel_visit(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Gate cancel for Pending / Approved / Rejected entries (before check-in)."""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_gate_operator()
	if doc.status not in ("Pending Approval", "Pending", "Approved", "Rejected"):
		frappe.throw(
			_("Cancel is only allowed before check-in. Current status: {0}").format(doc.status)
		)

	doc.status = "Cancelled"
	if doc.meta.has_field("cancelled_on"):
		doc.cancelled_on = now_datetime()
	doc._append_remarks(remarks, _("Cancelled by {0}").format(actor))
	doc.save(ignore_permissions=True)
	return {"name": doc.name, "status": doc.status, "message": _("Visit cancelled.")}


@frappe.whitelist()
def transfer(
	visitor_entry: str | None = None,
	transfer_to_user: str | None = None,
	remarks: str | None = None,
) -> dict:
	"""Reassign host while Pending Approval."""
	from visitor_management.services.visitor_notifications import resolve_host_link, resolve_host_user

	doc = _get_entry(visitor_entry)
	actor = doc._ensure_host_or_manager()
	if doc.status != "Pending Approval":
		frappe.throw(_("Transfer is only allowed before approval. Current status: {0}").format(doc.status))
	if not transfer_to_user:
		frappe.throw(_("Please select a Host to transfer to."))
	resolved = resolve_host_link(transfer_to_user)
	if not resolved:
		frappe.throw(_("Host {0} does not exist").format(transfer_to_user))
	transfer_to_user = resolved
	current_host = resolve_host_link(doc.person_to_meet) or doc.person_to_meet
	if transfer_to_user == current_host:
		frappe.throw(_("Visitor is already assigned to this host."))

	previous = doc.person_to_meet
	doc.transfer_to_user = transfer_to_user
	doc.person_to_meet = transfer_to_user
	doc._append_remarks(
		remarks,
		_("Transferred from {0} to {1} by {2}").format(previous or "—", transfer_to_user, actor),
	)
	# Urgent ring for the new host (PWA/API transfer — not Desk field edits).
	doc.flags.vms_ring_host = True
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
	"""Gate checkout from any active visit stage → Checked Out.

	Requires Visitor Entry create DocPerm (Role Permission Manager).
	May exit from Pending, Approved, Checked In, or Meeting Done.
	Terminal statuses cannot be checked out again.
	"""
	doc = _get_entry(visitor_entry)
	actor = doc._ensure_gate_operator()
	terminal = ("Checked Out", "Rejected", "Cancelled")
	if doc.status in terminal:
		frappe.throw(_("Visitor is already {0}.").format(doc.status))

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
	"""Ensure gate pass URL + QR code exist (idempotent; use force=1 to refresh expiry)."""
	doc = _get_entry(visitor_entry)
	force_refresh = int(force or 0) == 1
	if force_refresh or not doc.get("pass_url"):
		_assign_gate_pass(doc)
		doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		"pass_url": doc.pass_url,
		"qr_expires_on": str(doc.qr_expires_on) if doc.get("qr_expires_on") else None,
		"message": _("Gate pass ready."),
	}
