import frappe

from visitor_management.utils.setup_defaults import setup_security_shifts


def execute():
	"""Seed Morning / Night security shifts after Phase 3 DocTypes sync."""
	setup_security_shifts()
	frappe.db.commit()
