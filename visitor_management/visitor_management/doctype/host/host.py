# Copyright (c) 2026, Vivek Choudhary and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Host(Document):
	def validate(self):
		if self.user:
			self.full_name = frappe.db.get_value("User", self.user, "full_name") or self.user
