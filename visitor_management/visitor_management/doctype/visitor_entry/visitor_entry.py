# Copyright (c) 2026, Vivek Choudhary and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from visitor_management.services import otp_service


# Status → audit Datetime field (first time stamped when status is reached)
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
		self.sync_host_from_employee()
		self.set_host_name()
		self.set_image_previews()
		self.validate_location_hierarchy()
		self.validate_otp()
		self.validate_transfer_user()
		self.normalize_legacy_status()
		self.stamp_status_audit()

	def before_insert(self):
		if not self.status or self.status == "Awaiting":
			self.status = "Pending Approval"

	def stamp_status_audit(self):
		"""Set status audit datetimes when status changes (Desk or API)."""
		fieldname = STATUS_AUDIT_FIELDS.get(self.status)
		if not fieldname:
			return

		status_changed = self.has_value_changed("status") if not self.is_new() else True
		if not status_changed and self.get(fieldname):
			return

		now = now_datetime()
		if not self.get(fieldname):
			self.set(fieldname, now)

		# Keep gate / meeting operational fields in sync
		if self.status == "Checked In":
			if not self.check_in:
				self.check_in = self.checked_in_on or now
			if not self.checked_in_on:
				self.checked_in_on = self.check_in
		elif self.status == "Checked Out":
			if not self.check_out:
				self.check_out = self.checked_out_on or now
			if not self.checked_out_on:
				self.checked_out_on = self.check_out
		elif self.status == "Meeting Done":
			if not self.meeting_ended_on:
				self.meeting_ended_on = self.meeting_done_on or now
			if not self.meeting_done_on:
				self.meeting_done_on = self.meeting_ended_on

	def set_full_name(self):
		parts = [self.first_name, self.middle_name, self.last_name]
		self.full_name = " ".join(part for part in parts if part)

	def sync_host_from_employee(self):
		"""If Host Employee is set, fill Person to Meet from Employee.user_id when empty."""
		if not self.host_employee:
			return

		if not frappe.db.exists("DocType", "Employee"):
			return

		user_id = frappe.db.get_value("Employee", self.host_employee, "user_id")
		if user_id and not self.person_to_meet:
			self.person_to_meet = user_id

	def set_host_name(self):
		if not self.person_to_meet:
			self.host_name = None
			return

		self.host_name = frappe.db.get_value("User", self.person_to_meet, "full_name")

	def set_image_previews(self):
		if self.id_proof_photo:
			self.id_proof_photo_preview = self.id_proof_photo
		if self.company_id_card:
			self.company_id_card_preview = self.company_id_card

	def validate_location_hierarchy(self):
		if self.site and self.organization:
			site_org = frappe.db.get_value("Site", self.site, "organization")
			if site_org and site_org != self.organization:
				frappe.throw(_("Selected Site does not belong to the selected Organization."))

		if self.building and self.site:
			building_site = frappe.db.get_value("Building", self.building, "site")
			if building_site and building_site != self.site:
				frappe.throw(_("Selected Building does not belong to the selected Site."))

		if self.tower and self.building:
			tower_building = frappe.db.get_value("Tower", self.tower, "building")
			if tower_building and tower_building != self.building:
				frappe.throw(_("Selected Tower does not belong to the selected Building."))

		if self.floor and self.building:
			floor_building = frappe.db.get_value("Floor", self.floor, "building")
			if floor_building and floor_building != self.building:
				frappe.throw(_("Selected Floor does not belong to the selected Building."))

		if self.unit and self.floor:
			unit_floor = frappe.db.get_value("Unit", self.unit, "floor")
			if unit_floor and unit_floor != self.floor:
				frappe.throw(_("Selected Unit does not belong to the selected Floor."))

		if self.vms_department and self.organization:
			dept_org = frappe.db.get_value("VMS Department", self.vms_department, "organization")
			if dept_org and dept_org != self.organization:
				frappe.throw(_("Selected Department does not belong to the selected Organization."))

	def validate_otp(self):
		if frappe.flags.in_import or frappe.flags.in_install:
			return

		if frappe.conf.developer_mode and "System Manager" in frappe.get_roles():
			return

		if not self.otp_verified:
			frappe.throw(_("Please verify the mobile OTP before saving."))

	def validate_transfer_user(self):
		# Transfer is handled via approval_service.transfer_visitor (reassigns host).
		# Legacy status "Transfer User" still requires a target if set manually.
		if self.status == "Transfer User" and not self.transfer_to_user:
			frappe.throw(_("Please select Transferred To when status is Transfer User."))

	def normalize_legacy_status(self):
		if self.status == "Awaiting":
			self.status = "Pending Approval"



@frappe.whitelist()
def send_otp(mobile):
	"""Desk / form OTP — uses shared otp_service."""
	return otp_service.generate_and_send_otp(mobile, purpose="visitor_registration")


@frappe.whitelist()
def verify_otp(mobile, otp):
	"""Desk / form OTP verify — uses shared otp_service."""
	return otp_service.verify_otp(mobile, otp, purpose="visitor_registration")
