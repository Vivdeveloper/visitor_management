import os

import frappe
from frappe.utils import cint


def get_context(context):
	"""SPA shell for Visitor Gate PWA (React build under public/frontend).

	Same pattern as HRMS ``/hrms``: www page + website_route_rules + installable
	manifest/service worker under ``/vms/``.
	"""
	context.no_cache = 1
	context.safe_render = 0

	app_path = frappe.get_app_path("visitor_management")
	bundle = os.path.join(app_path, "public", "frontend", "vms-app.js")
	try:
		context.vms_asset_v = str(int(os.path.getmtime(bundle)))
	except OSError:
		context.vms_asset_v = frappe.utils.today()

	context.vms_page_title = "Visitor Gate"
	context.vms_csrf_token = frappe.sessions.get_csrf_token()
	context.vms_sitename = frappe.local.site
	context.vms_socketio_port = frappe.conf.socketio_port or 9000
	context.vms_developer_mode = 1 if frappe.conf.developer_mode else 0
	# Optional Frappe push relay (same boot key HRMS uses)
	context.vms_push_relay_server_url = frappe.conf.get("push_relay_server_url") or ""
	context.vms_default_route = "/vms"
	context.vms_boot_json = frappe.as_json(
		{
			"sitename": frappe.local.site,
			"socketio_port": frappe.conf.socketio_port or 9000,
			"developer_mode": cint(frappe.conf.developer_mode),
			"push_relay_server_url": frappe.conf.get("push_relay_server_url") or "",
			"default_route": "/vms",
			"app_name": "Visitor Gate",
		}
	)
