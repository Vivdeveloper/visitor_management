"""Reporting / analytics export API."""

from __future__ import annotations

import frappe
from frappe import _


@frappe.whitelist()
def visitor_summary(from_date: str | None = None, to_date: str | None = None) -> dict:
	"""Summary report for visitor activity."""
	frappe.throw(_("Not implemented"))


@frappe.whitelist()
def department_analytics(from_date: str | None = None, to_date: str | None = None) -> list:
	"""Department-wise visitor analytics."""
	frappe.throw(_("Not implemented"))


@frappe.whitelist()
def export_report(report_name: str | None = None, filters: str | None = None) -> dict:
	"""Export a report payload for download."""
	frappe.throw(_("Not implemented"))
