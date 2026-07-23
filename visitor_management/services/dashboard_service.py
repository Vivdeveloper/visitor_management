"""Dashboard KPIs, trends, and live queues for Desk + React."""

from __future__ import annotations

from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import add_days, getdate, now_datetime, today

from visitor_management.services.checkin_service import CHECKOUT_ALLOWED_STATUSES

KPI_STATUSES = (
	"Pending Approval",
	"Approved",
	"Checked In",
	"Meeting Done",
	"Checked Out",
	"Rejected",
)

QUEUE_FIELDS = [
	"name",
	"full_name",
	"mobile",
	"host_name",
	"status",
	"site",
	"building",
	"floor",
	"expected_meeting_time",
	"expected_exit",
	"check_in",
	"creation",
	"modified",
]


def ensure_dashboard_access(user: str | None = None) -> str:
	"""Any logged-in (non-Guest) user may view the VMS dashboard."""
	user = user or frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Please sign in to view the dashboard."), frappe.PermissionError)
	return user


def _parse_dates(from_date: str | None, to_date: str | None) -> tuple[str, str]:
	start = getdate(from_date or today())
	end = getdate(to_date or today())
	if start > end:
		start, end = end, start
	return str(start), str(end)


def _location_filters(site: str | None = None, building: str | None = None) -> dict:
	filters: dict = {}
	if site:
		filters["site"] = site
	if building:
		filters["building"] = building
	return filters


def get_status_counts(
	*,
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
) -> dict[str, int]:
	start, end = _parse_dates(from_date, to_date)
	base = _location_filters(site, building)
	counts = {status: 0 for status in KPI_STATUSES}
	total = 0

	for status in KPI_STATUSES:
		n = frappe.db.count(
			"Visitor Entry",
			{
				**base,
				"status": status,
				"creation": ("between", [f"{start} 00:00:00", f"{end} 23:59:59"]),
			},
		)
		counts[status] = int(n or 0)
		total += counts[status]

	# On-premises is live state (not limited to creation date range)
	on_premises = frappe.db.count(
		"Visitor Entry",
		{**base, "status": ["in", list(CHECKOUT_ALLOWED_STATUSES)]},
	)
	counts["On Premises"] = int(on_premises or 0)
	counts["total"] = total
	return counts


def get_visitor_trend(
	*,
	site: str | None = None,
	building: str | None = None,
	days: int = 7,
	from_date: str | None = None,
	to_date: str | None = None,
) -> list[dict]:
	if from_date and to_date:
		start, end = _parse_dates(from_date, to_date)
	else:
		end = getdate(today())
		start = add_days(end, -(max(int(days or 7), 1) - 1))
		start, end = str(start), str(end)

	base = _location_filters(site, building)
	rows = frappe.get_all(
		"Visitor Entry",
		filters={
			**base,
			"creation": ("between", [f"{start} 00:00:00.000000", f"{end} 23:59:59.999999"]),
		},
		fields=["creation"],
		limit_page_length=10000,
	)

	bucket: dict[str, int] = {}
	cursor = getdate(start)
	end_d = getdate(end)
	while cursor <= end_d:
		bucket[str(cursor)] = 0
		cursor = cursor + timedelta(days=1)

	for row in rows:
		key = str(getdate(row.creation))
		if key in bucket:
			bucket[key] += 1

	return [{"date": d, "count": bucket[d]} for d in sorted(bucket.keys())]


def _list_queue(filters: dict, order_by: str = "modified desc", limit: int = 50) -> list[dict]:
	return frappe.get_all(
		"Visitor Entry",
		filters=filters,
		fields=QUEUE_FIELDS,
		order_by=order_by,
		limit_page_length=limit,
	)


def get_queues(
	*,
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
) -> dict[str, list]:
	base = _location_filters(site, building)
	start, end = _parse_dates(from_date, to_date)
	now = now_datetime()

	pending = _list_queue(
		{**base, "status": "Pending Approval"},
		order_by="expected_meeting_time asc, modified desc",
	)
	gate_exit = _list_queue(
		{**base, "status": ["in", list(CHECKOUT_ALLOWED_STATUSES)]},
		order_by="check_in asc, modified desc",
	)

	overstay_filters: list = [
		["status", "in", list(CHECKOUT_ALLOWED_STATUSES)],
		["expected_exit", "is", "set"],
		["expected_exit", "<", now],
	]
	if site:
		overstay_filters.append(["site", "=", site])
	if building:
		overstay_filters.append(["building", "=", building])

	overstay_candidates = frappe.get_all(
		"Visitor Entry",
		filters=overstay_filters,
		fields=QUEUE_FIELDS,
		order_by="expected_exit asc",
		limit_page_length=50,
	)

	rejected = frappe.get_all(
		"Visitor Entry",
		filters={
			**base,
			"status": "Rejected",
			"creation": ("between", [f"{start} 00:00:00.000000", f"{end} 23:59:59.999999"]),
		},
		fields=QUEUE_FIELDS,
		order_by="modified desc",
		limit_page_length=50,
	)

	return {
		"pending": pending,
		"gate_exit": gate_exit,
		"overstay": overstay_candidates,
		"rejected": rejected,
	}


def get_dashboard(
	*,
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	trend_days: int = 7,
) -> dict:
	ensure_dashboard_access()
	start, end = _parse_dates(from_date, to_date)
	kpis = get_status_counts(site=site, building=building, from_date=start, to_date=end)
	# Trend defaults to last 7 days unless an explicit multi-day range is requested
	if start != end:
		trend = get_visitor_trend(site=site, building=building, from_date=start, to_date=end)
	else:
		trend = get_visitor_trend(site=site, building=building, days=trend_days)

	return {
		"filters": {
			"site": site or "",
			"building": building or "",
			"from_date": start,
			"to_date": end,
		},
		"kpis": kpis,
		"trend": trend,
		"queues": get_queues(site=site, building=building, from_date=start, to_date=end),
		"generated_at": str(now_datetime()),
	}
