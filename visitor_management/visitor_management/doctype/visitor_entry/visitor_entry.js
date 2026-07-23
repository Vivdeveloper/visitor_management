// Copyright (c) 2026, Vivek Choudhary and contributors
// For license information, please see license.txt

frappe.ui.form.on("Visitor Entry", {
	setup(frm) {
		frm.set_query("site", () => ({
			filters: {
				organization: frm.doc.organization || "",
				is_active: 1,
			},
		}));
		frm.set_query("building", () => ({
			filters: {
				site: frm.doc.site || "",
				is_active: 1,
			},
		}));
		frm.set_query("tower", () => ({
			filters: {
				building: frm.doc.building || "",
				is_active: 1,
			},
		}));
		frm.set_query("floor", () => ({
			filters: {
				building: frm.doc.building || "",
				is_active: 1,
			},
		}));
		frm.set_query("unit", () => ({
			filters: {
				floor: frm.doc.floor || "",
				is_active: 1,
			},
		}));
		frm.set_query("vms_department", () => ({
			filters: {
				organization: frm.doc.organization || "",
				is_active: 1,
			},
		}));
		frm.set_query("host_employee", () => ({
			filters: { status: "Active" },
		}));
	},

	refresh(frm) {
		sync_public_pass_url_field(frm);
		add_approval_actions(frm);
		add_pass_actions(frm);
		add_gate_actions(frm);
		add_meeting_actions(frm);

		if (!frm.doc.otp_verified) {
			frm.add_custom_button(__("Send OTP"), () => send_otp(frm), __("OTP"));
			frm.add_custom_button(__("Verify OTP"), () => verify_otp(frm), __("OTP"));
		}
	},

	organization(frm) {
		clear_downstream(frm, ["site", "building", "tower", "floor", "unit", "vms_department"]);
	},

	site(frm) {
		clear_downstream(frm, ["building", "tower", "floor", "unit"]);
	},

	building(frm) {
		clear_downstream(frm, ["tower", "floor", "unit"]);
	},

	floor(frm) {
		clear_downstream(frm, ["unit"]);
	},

	host_employee(frm) {
		if (!frm.doc.host_employee) {
			return;
		}
		frappe.db.get_value("Employee", frm.doc.host_employee, ["user_id", "employee_name"]).then((r) => {
			const row = r && r.message;
			if (!row) {
				return;
			}
			if (row.user_id) {
				frm.set_value("person_to_meet", row.user_id);
			}
			if (row.employee_name && !frm.doc.host_name) {
				frm.set_value("host_name", row.employee_name);
			}
		});
	},

	person_to_meet(frm) {
		if (!frm.doc.person_to_meet) {
			frm.set_value("host_name", "");
			return;
		}

		frappe.db.get_value("User", frm.doc.person_to_meet, "full_name").then((r) => {
			frm.set_value("host_name", (r && r.message && r.message.full_name) || "");
		});
	},

	id_proof_photo(frm) {
		frm.set_value("id_proof_photo_preview", frm.doc.id_proof_photo || "");
	},

	company_id_card(frm) {
		frm.set_value("company_id_card_preview", frm.doc.company_id_card || "");
	},
});

function clear_downstream(frm, fields) {
	fields.forEach((field) => {
		if (frm.doc[field]) {
			frm.set_value(field, "");
		}
	});
}

function can_approve(frm) {
	if (frappe.user.has_role("System Manager")) {
		return true;
	}
	return frm.doc.person_to_meet && frm.doc.person_to_meet === frappe.session.user;
}

function add_approval_actions(frm) {
	if (frm.is_new() || frm.doc.status !== "Pending Approval") {
		return;
	}
	if (!can_approve(frm)) {
		return;
	}

	frm.add_custom_button(__("Approve"), () => prompt_remarks(frm, "approve"), __("Approval"));
	frm.add_custom_button(__("Reject"), () => prompt_remarks(frm, "reject"), __("Approval"));
	frm.add_custom_button(__("Transfer"), () => prompt_transfer(frm), __("Approval"));
}

function prompt_remarks(frm, action) {
	const title = action === "approve" ? __("Approve Visitor") : __("Reject Visitor");
	frappe.prompt(
		[
			{
				fieldname: "remarks",
				fieldtype: "Small Text",
				label: __("Remarks"),
				reqd: action === "reject" ? 1 : 0,
			},
		],
		(values) => {
			frappe.call({
				method: `visitor_management.react_api.approval.${action}`,
				args: {
					visitor_entry: frm.doc.name,
					remarks: values.remarks,
				},
				freeze: true,
				callback(r) {
					if (!r.exc) {
						const msg = r.message || {};
						frappe.show_alert({
							message: msg.message || __("Done"),
							indicator: "green",
						});
						if (action === "approve" && msg.pass && msg.pass.qr_token) {
							const path = `/vms/pass/${msg.pass.qr_token}`;
							frappe.msgprint({
								title: __("QR Pass Ready"),
								message: __(
									"Open this link on the same host as Desk (e.g. localhost:8025):<br><a href='{0}' target='_blank'>{0}</a>",
									[path]
								),
								indicator: "blue",
							});
						}
						frm.reload_doc();
					}
				},
			});
		},
		title,
		action === "approve" ? __("Approve") : __("Reject")
	);
}

function prompt_transfer(frm) {
	frappe.prompt(
		[
			{
				fieldname: "transfer_to_user",
				fieldtype: "Link",
				options: "User",
				label: __("Transfer To"),
				reqd: 1,
				get_query: () => ({
					filters: { enabled: 1, name: ["!=", frm.doc.person_to_meet || ""] },
				}),
			},
			{
				fieldname: "remarks",
				fieldtype: "Small Text",
				label: __("Reason / Remarks"),
				reqd: 1,
			},
		],
		(values) => {
			frappe.call({
				method: "visitor_management.react_api.approval.transfer",
				args: {
					visitor_entry: frm.doc.name,
					transfer_to_user: values.transfer_to_user,
					remarks: values.remarks,
				},
				freeze: true,
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({
							message: (r.message && r.message.message) || __("Transferred"),
							indicator: "green",
						});
						frm.reload_doc();
					}
				},
			});
		},
		__("Transfer Visitor"),
		__("Transfer")
	);
}

function add_meeting_actions(frm) {
	if (frm.is_new() || frm.doc.status !== "Checked In") {
		return;
	}
	if (!can_approve(frm)) {
		return;
	}

	if (!frm.doc.meeting_started_on) {
		frm.add_custom_button(__("Meeting Started"), () => prompt_meeting(frm, "start"), __("Meeting"));
	}
	frm.add_custom_button(__("Meeting Completed"), () => prompt_meeting(frm, "complete"), __("Meeting"));
}

function prompt_meeting(frm, action) {
	const is_start = action === "start";
	frappe.prompt(
		[
			{
				fieldname: "remarks",
				fieldtype: "Small Text",
				label: __("Remarks"),
				reqd: 0,
			},
		],
		(values) => {
			const method = is_start
				? "visitor_management.react_api.meeting.start_meeting"
				: "visitor_management.react_api.meeting.complete_meeting";
			frappe.call({
				method,
				args: {
					visitor_entry: frm.doc.name,
					remarks: values.remarks,
				},
				freeze: true,
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({
							message: (r.message && r.message.message) || __("Done"),
							indicator: "green",
						});
						frm.reload_doc();
					}
				},
			});
		},
		is_start ? __("Start Meeting") : __("Complete Meeting"),
		is_start ? __("Start") : __("Complete")
	);
}

function add_gate_actions(frm) {
	if (frm.is_new() || !frappe.user.has_role("System Manager")) {
		return;
	}

	if (frm.doc.status === "Approved") {
		frm.add_custom_button(__("Check In"), () => prompt_check_in(frm), __("Gate"));
	}

	if (["Checked In", "Meeting Done"].includes(frm.doc.status)) {
		frm.add_custom_button(__("Check Out"), () => prompt_check_out(frm), __("Gate"));
	}
}

function prompt_check_in(frm) {
	frappe.prompt(
		[
			{
				fieldname: "check_in_photo",
				fieldtype: "Attach Image",
				label: __("Live Photo (optional)"),
			},
		],
		(values) => {
			frappe.call({
				method: "visitor_management.react_api.checkin.check_in",
				args: {
					visitor_entry: frm.doc.name,
					live_image: values.check_in_photo || frm.doc.check_in_photo || null,
				},
				freeze: true,
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({
							message: (r.message && r.message.message) || __("Checked in"),
							indicator: "green",
						});
						frm.reload_doc();
					}
				},
			});
		},
		__("Security Check-In"),
		__("Check In")
	);
}

function prompt_check_out(frm) {
	frappe.prompt(
		[
			{
				fieldname: "remarks",
				fieldtype: "Small Text",
				label: __("Remarks (optional)"),
			},
		],
		(values) => {
			frappe.call({
				method: "visitor_management.react_api.checkout.check_out",
				args: {
					visitor_entry: frm.doc.name,
					remarks: values.remarks,
				},
				freeze: true,
				callback(r) {
					if (!r.exc) {
						const msg = r.message || {};
						frappe.show_alert({
							message: msg.message || __("Checked out"),
							indicator: "green",
						});
						if (msg.visit_duration) {
							frappe.show_alert({
								message: __("Duration: {0}", [msg.visit_duration]),
								indicator: "blue",
							});
						}
						frm.reload_doc();
					}
				},
			});
		},
		__("Security Check-Out"),
		__("Check Out")
	);
}

function pass_path(frm) {
	if (!frm.doc.qr_token) {
		return null;
	}
	// Relative path works with whatever host you used for Desk (e.g. localhost:8025)
	return `/vms/pass/${frm.doc.qr_token}`;
}

function public_pass_url(frm) {
	const path = pass_path(frm);
	if (!path) {
		return null;
	}
	// Always use the Desk browser origin so site-name hosts (precious.alloys) are not shown
	return `${window.location.origin}${path}`;
}

function sync_public_pass_url_field(frm) {
	if (frm.is_new() || !frm.doc.qr_token) {
		return;
	}
	const url = public_pass_url(frm);
	if (!url || frm.doc.pass_url === url) {
		return;
	}
	frm.doc.pass_url = url;
	frm.refresh_field("pass_url");
	// Persist so reload / emails keep the browser-reachable host
	frappe.db.set_value(frm.doctype, frm.doc.name, "pass_url", url);
}

function add_pass_actions(frm) {
	if (frm.is_new()) {
		return;
	}
	if (!["Approved", "Checked In"].includes(frm.doc.status)) {
		return;
	}

	const path = pass_path(frm);
	if (path) {
		frm.add_custom_button(__("Open Pass"), () => window.open(path, "_blank"), __("QR Pass"));
	}
	frm.add_custom_button(__("Regenerate QR"), () => regenerate_pass(frm), __("QR Pass"));
}

function regenerate_pass(frm) {
	frappe.call({
		method: "visitor_management.react_api.visitor_pass.generate_pass",
		args: { visitor_entry: frm.doc.name, force: 1 },
		freeze: true,
		callback(r) {
			if (r.exc) {
				return;
			}
			const msg = r.message || {};
			const path = msg.qr_token ? `/vms/pass/${msg.qr_token}` : pass_path(frm);
			frappe.show_alert({
				message: __("QR pass generated"),
				indicator: "green",
			});
			if (path) {
				frappe.msgprint({
					title: __("Public Pass Link"),
					message: __(
						"Open this link on the same host as Desk (e.g. localhost:8025):<br><a href='{0}' target='_blank'>{0}</a>",
						[path]
					),
					indicator: "blue",
				});
			}
			frm.reload_doc();
		},
	});
}

function send_otp(frm) {
	if (!frm.doc.mobile) {
		frappe.msgprint(__("Please enter a mobile number first."));
		return;
	}

	frappe.call({
		method: "visitor_management.visitor_management.doctype.visitor_entry.visitor_entry.send_otp",
		args: { mobile: frm.doc.mobile },
		freeze: true,
		callback(r) {
			if (r.exc) {
				return;
			}

			const response = r.message || {};
			frappe.show_alert({
				message: response.message || __("OTP sent"),
				indicator: "green",
			});

			if (response.otp) {
				frappe.msgprint({
					title: __("OTP (Testing)"),
					message: __("Your OTP is: <b>{0}</b>", [response.otp]),
					indicator: "blue",
				});
			}
		},
	});
}

function verify_otp(frm) {
	if (!frm.doc.mobile) {
		frappe.msgprint(__("Please enter a mobile number first."));
		return;
	}

	if (!frm.doc.otp) {
		frappe.msgprint(__("Please enter the OTP."));
		return;
	}

	frappe.call({
		method: "visitor_management.visitor_management.doctype.visitor_entry.visitor_entry.verify_otp",
		args: {
			mobile: frm.doc.mobile,
			otp: frm.doc.otp,
		},
		freeze: true,
		callback(r) {
			if (!r.exc) {
				frm.set_value("otp_verified", 1);
				frappe.show_alert({
					message: r.message?.message || __("OTP verified"),
					indicator: "green",
				});
			}
		},
	});
}
