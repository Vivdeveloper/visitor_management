# Copyright (c) 2026, Vivek Choudhary and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Floor(Document):
	def validate(self):
		if not self.tower:
			return

		tower_building = frappe.db.get_value("Tower", self.tower, "building")
		if tower_building and tower_building != self.building:
			frappe.throw(_("Selected Tower does not belong to the selected Building."))
