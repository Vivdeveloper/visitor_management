"""Dashboard API — simple KPIs and queues (no separate dashboard service)."""

from __future__ import annotations

from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import add_days, getdate, now_datetime, today


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
	"person_to_meet_name",
	"status",
	"floor",
	"checked_in_on",
	"check_in",
	"creation",
	"modified",
]


def _ensure_access() -> None:
	if not frappe.session.user or frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to view the dashboard."), frappe.PermissionError)


def _parse_dates(from_date: str | None, to_date: str | None) -> tuple[str, str]:
	start = getdate(from_date or today())
	end = getdate(to_date or today())
	if start > end:
		start, end = end, start
	return str(start), str(end)


@frappe.whitelist()
def get_dashboard(
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	trend_days: int | str | None = 7,
) -> dict:
	_ensure_access()
	start, end = _parse_dates(from_date, to_date)
	return {
		"filters": {"site": site or "", "building": building or "", "from_date": start, "to_date": end},
		"kpis": get_kpis(from_date=start, to_date=end),
		"trend": get_visitor_trends(from_date=start, to_date=end, period=f"{int(trend_days or 7)}d")["series"],
		"queues": get_queues(from_date=start, to_date=end),
		"generated_at": str(now_datetime()),
	}


@frappe.whitelist()
def get_kpis(
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
) -> dict:
	_ensure_access()
	start, end = _parse_dates(from_date, to_date)
	counts = {status: 0 for status in KPI_STATUSES}
	total = 0
	for status in KPI_STATUSES:
		n = frappe.db.count(
			"Visitor Entry",
			{"status": status, "creation": ("between", [f"{start} 00:00:00", f"{end} 23:59:59"])},
		)
		counts[status] = int(n or 0)
		total += counts[status]
	counts["On Premises"] = int(
		frappe.db.count(
			"Visitor Entry",
			{"status": ["in", ["Checked In", "Meeting Done"]]},
		)
		or 0
	)
	counts["total"] = total
	return counts


@frappe.whitelist()
def get_live_visitors(site: str | None = None, building: str | None = None) -> list:
	_ensure_access()
	return get_queues()["gate_exit"]


@frappe.whitelist()
def get_pending_approvals(site: str | None = None, building: str | None = None) -> list:
	_ensure_access()
	return get_queues()["pending"]


@frappe.whitelist()
def get_visitor_trends(
	site: str | None = None,
	building: str | None = None,
	period: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
) -> dict:
	_ensure_access()
	days = 7
	if period:
		raw = str(period).lower().replace("d", "")
		if raw.isdigit():
			days = int(raw)

	if from_date and to_date:
		start, end = _parse_dates(from_date, to_date)
	else:
		end_d = getdate(today())
		start_d = add_days(end_d, -(max(days, 1) - 1))
		start, end = str(start_d), str(end_d)

	rows = frappe.get_all(
		"Visitor Entry",
		filters={"creation": ("between", [f"{start} 00:00:00", f"{end} 23:59:59"])},
		fields=["creation"],
		limit_page_length=10000,
	)
	bucket: dict[str, int] = {}
	cursor = getdate(start)
	end_date = getdate(end)
	while cursor <= end_date:
		bucket[str(cursor)] = 0
		cursor = cursor + timedelta(days=1)
	for row in rows:
		key = str(getdate(row.creation))
		if key in bucket:
			bucket[key] += 1
	series = [{"date": d, "count": bucket[d]} for d in sorted(bucket.keys())]
	return {"period": period or f"{days}d", "series": series}


@frappe.whitelist()
def get_queues(
	site: str | None = None,
	building: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
) -> dict:
	_ensure_access()
	start, end = _parse_dates(from_date, to_date)
	pending = frappe.get_all(
		"Visitor Entry",
		filters={"status": "Pending Approval"},
		fields=QUEUE_FIELDS,
		order_by="modified desc",
		limit_page_length=50,
	)
	gate_exit = frappe.get_all(
		"Visitor Entry",
		filters={"status": ["in", ["Checked In", "Meeting Done"]]},
		fields=QUEUE_FIELDS,
		order_by="modified desc",
		limit_page_length=50,
	)
	rejected = frappe.get_all(
		"Visitor Entry",
		filters={
			"status": "Rejected",
			"creation": ("between", [f"{start} 00:00:00", f"{end} 23:59:59"]),
		},
		fields=QUEUE_FIELDS,
		order_by="modified desc",
		limit_page_length=50,
	)
	for rows in (pending, gate_exit, rejected):
		for row in rows:
			row["host_name"] = row.get("person_to_meet_name")
	return {"pending": pending, "gate_exit": gate_exit, "overstay": [], "rejected": rejected}
