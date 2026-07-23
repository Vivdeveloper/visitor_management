// Copyright (c) 2026, Vivek Choudhary and contributors
// For license information, please see license.txt

frappe.ui.form.on("Floor", {
	setup(frm) {
		frm.set_query("tower", () => ({
			filters: {
				building: frm.doc.building || "",
				is_active: 1,
			},
		}));
	},

	building(frm) {
		if (frm.doc.tower) {
			frm.set_value("tower", "");
		}
	},
});
