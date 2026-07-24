import frappe


MSG91_GATEWAY_URL = "https://api.msg91.com/api/sendhttp.php"


def setup_msg91_sms_settings(authkey=None, sender_id="VISENT", force=False):
	"""Configure Frappe SMS Settings for MSG91 transactional SMS."""
	if not frappe.db.exists("DocType", "SMS Settings"):
		return

	existing_url = frappe.db.get_single_value("SMS Settings", "sms_gateway_url")
	if existing_url and not force:
		return

	authkey = authkey or frappe.conf.get("msg91_auth_key") or "YOUR_MSG91_AUTH_KEY"
	sender_id = sender_id or frappe.conf.get("msg91_sender_id") or "VISENT"

	doc = frappe.get_single("SMS Settings")
	doc.sms_gateway_url = MSG91_GATEWAY_URL
	doc.message_parameter = "message"
	doc.receiver_parameter = "mobiles"
	doc.use_post = 1
	doc.set("parameters", [])

	for parameter, value in (
		("authkey", authkey),
		("sender", sender_id),
		("route", "4"),
		("country", "91"),
	):
		doc.append("parameters", {"parameter": parameter, "value": value, "header": 0})

	doc.flags.ignore_permissions = True
	doc.save()
