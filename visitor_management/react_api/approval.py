"""Host approval workflow API."""

from __future__ import annotations

import frappe
from frappe import _

from visitor_management.services import approval_service


@frappe.whitelist()
def approve(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Approve a pending visitor entry."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = approval_service.approve_visitor(visitor_entry, remarks=remarks)
	return {"success": True, "message": _("Visitor approved."), **result}


@frappe.whitelist()
def reject(visitor_entry: str | None = None, remarks: str | None = None) -> dict:
	"""Reject a pending visitor entry."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = approval_service.reject_visitor(visitor_entry, remarks=remarks)
	return {"success": True, "message": _("Visitor rejected."), **result}


@frappe.whitelist()
def transfer(
	visitor_entry: str | None = None,
	transfer_to_user: str | None = None,
	remarks: str | None = None,
) -> dict:
	"""Transfer pending visitor to another host (stays Pending Approval)."""
	if not visitor_entry:
		frappe.throw(_("Visitor Entry is required"))
	result = approval_service.transfer_visitor(
		visitor_entry,
		transfer_to_user or "",
		remarks=remarks,
	)
	return {"success": True, "message": _("Visitor transferred to new host."), **result}


@frappe.whitelist()
def list_for_host(status: str | None = None) -> list:
	"""List approval requests for the logged-in host (or all for System Manager)."""
	return approval_service.list_for_host(status=status)
