"""Dashboard API — KPIs, live queues, trends."""

from __future__ import annotations

import frappe

from visitor_management.services import dashboard_service


@frappe.whitelist()
def get_dashboard(
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	trend_days: int | str | None = 7,
) -> dict:
	"""Full dashboard payload (KPIs + 7-day trend + queues)."""
	return dashboard_service.get_dashboard(
		site=site or None,
		building=building or None,
		from_date=from_date or None,
		to_date=to_date or None,
		trend_days=int(trend_days or 7),
	)


@frappe.whitelist()
def get_kpis(
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
) -> dict:
	"""KPI cards for role-based dashboards."""
	dashboard_service.ensure_dashboard_access()
	return dashboard_service.get_status_counts(
		site=site or None,
		building=building or None,
		from_date=from_date or None,
		to_date=to_date or None,
	)


@frappe.whitelist()
def get_live_visitors(
	site: str | None = None,
	building: str | None = None,
) -> list:
	"""Visitors currently checked in / in meeting (gate exit queue)."""
	dashboard_service.ensure_dashboard_access()
	return dashboard_service.get_queues(site=site or None, building=building or None)["gate_exit"]


@frappe.whitelist()
def get_pending_approvals(
	site: str | None = None,
	building: str | None = None,
) -> list:
	"""Pending visitor approvals queue."""
	dashboard_service.ensure_dashboard_access()
	return dashboard_service.get_queues(site=site or None, building=building or None)["pending"]


@frappe.whitelist()
def get_visitor_trends(
	site: str | None = None,
	building: str | None = None,
	period: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
) -> dict:
	"""Visitor trend series for charts (default last 7 days)."""
	dashboard_service.ensure_dashboard_access()
	days = 7
	if period:
		raw = str(period).lower().replace("d", "")
		if raw.isdigit():
			days = int(raw)
	series = dashboard_service.get_visitor_trend(
		site=site or None,
		building=building or None,
		days=days,
		from_date=from_date or None,
		to_date=to_date or None,
	)
	return {"period": period or f"{days}d", "series": series}


@frappe.whitelist()
def get_queues(
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
) -> dict:
	"""Pending, gate exit, overstay, rejected queues."""
	dashboard_service.ensure_dashboard_access()
	return dashboard_service.get_queues(
		site=site or None,
		building=building or None,
		from_date=from_date or None,
		to_date=to_date or None,
	)
