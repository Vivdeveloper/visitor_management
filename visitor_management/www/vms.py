import os

import frappe


def get_context(context):
	"""SPA shell for React build under public/frontend (after `npm run build`)."""
	context.no_cache = 1
	context.safe_render = 0

	app_path = frappe.get_app_path("visitor_management")
	bundle = os.path.join(app_path, "public", "frontend", "vms-app.js")
	try:
		context.vms_asset_v = str(int(os.path.getmtime(bundle)))
	except OSError:
		context.vms_asset_v = frappe.utils.today()

	context.vms_page_title = "Visitor Management"
	context.vms_csrf_token = frappe.sessions.get_csrf_token()
	context.vms_sitename = frappe.local.site
	context.vms_socketio_port = frappe.conf.socketio_port or 9000
	context.vms_developer_mode = 1 if frappe.conf.developer_mode else 0
