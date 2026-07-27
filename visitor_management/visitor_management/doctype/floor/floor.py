# Copyright (c) 2026, Vivek Choudhary and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Floor(Document):
	def autoname(self):
		if self.floor_name:
			self.name = self.floor_name.strip()
		elif self.floor_number:
			self.name = f"Floor {self.floor_number}"
			self.floor_name = self.name
		else:
			self.name = frappe.generate_hash(length=8)
			self.floor_name = self.name

	def validate(self):
		if not self.floor_name and self.floor_number:
			self.floor_name = f"Floor {self.floor_number}"
		if not self.floor_name:
			frappe.throw(_("Floor Name is required."))
