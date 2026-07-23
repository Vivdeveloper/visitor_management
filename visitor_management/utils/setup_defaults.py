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

def _insert_master(doctype, fieldname, value):
	if frappe.db.exists(doctype, value):
		return

	frappe.get_doc(
		{
			"doctype": doctype,
			fieldname: value,
		}
	).insert(ignore_permissions=True)


def setup_master_data():
	for name in VISIT_PURPOSE_TYPES:
		_insert_master("Visit Purpose Type", "visit_purpose_type_name", name)

	for name in VEHICLE_TYPES:
		_insert_master("Vehicle Type", "vehicle_type_name", name)

	for name in ID_PROOF_TYPES:
		_insert_master("ID Proof Type", "id_proof_type_name", name)

