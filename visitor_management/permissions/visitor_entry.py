"""Permission query / has_permission hooks for Visitor Entry and related DocTypes."""

from __future__ import annotations


def visitor_entry_query(user: str) -> str | None:
	"""Return permission query condition SQL fragment."""
	return None


def visitor_entry_has_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool | None:
	"""Return True/False to override, or None to use default."""
	return None
