import frappe


VISIT_PURPOSE_TYPES = (
	"Meeting",
	"Interview",
	"Maintenance",
	"Delivery",
	"Personal",
)

VEHICLE_TYPES = (
	"Two Wheeler",
	"Four Wheeler",
	"Bicycle",
	"Auto Rickshaw",
	"Heavy Vehicle",
	"Other",
)

ID_PROOF_TYPES = (
	"Aadhar Card",
	"PAN",
	"Driving License",
	"Passport",
	"Voter ID",
)

SECURITY_SHIFTS = (
	{
		"shift_name": "Morning",
		"start_time": "08:00:00",
		"end_time": "20:00:00",
		"description": "Day shift 8 AM – 8 PM",
	},
	{
		"shift_name": "Night",
		"start_time": "20:00:00",
		"end_time": "08:00:00",
		"description": "Night shift 8 PM – 8 AM",
	},
)


def _insert_master(doctype, fieldname, value):
	if frappe.db.exists(doctype, value):
		return

	frappe.get_doc(
		{
			"doctype": doctype,
			fieldname: value,
		}
	).insert(ignore_permissions=True)


def setup_security_shifts():
	if not frappe.db.exists("DocType", "Security Shift"):
		return

	for row in SECURITY_SHIFTS:
		if frappe.db.exists("Security Shift", row["shift_name"]):
			continue

		frappe.get_doc(
			{
				"doctype": "Security Shift",
				**row,
				"is_active": 1,
			}
		).insert(ignore_permissions=True)


def setup_master_data():
	for name in VISIT_PURPOSE_TYPES:
		_insert_master("Visit Purpose Type", "visit_purpose_type_name", name)

	for name in VEHICLE_TYPES:
		_insert_master("Vehicle Type", "vehicle_type_name", name)

	for name in ID_PROOF_TYPES:
		_insert_master("ID Proof Type", "id_proof_type_name", name)

	setup_security_shifts()
