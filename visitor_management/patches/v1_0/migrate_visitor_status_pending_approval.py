import frappe


def execute():
	"""Rename legacy Visitor Entry status Awaiting → Pending Approval."""
	if not frappe.db.exists("DocType", "Visitor Entry"):
		return

	frappe.db.sql(
		"""
		UPDATE `tabVisitor Entry`
		SET status = 'Pending Approval'
		WHERE status = 'Awaiting'
		"""
	)
	frappe.db.commit()
