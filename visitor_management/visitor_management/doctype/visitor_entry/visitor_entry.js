// Copyright (c) 2026, Vivek Choudhary and contributors
// For license information, please see license.txt

// Flow: Pending Approval → Approved → Checked In → Meeting Done → Checked Out
const VE = "visitor_management.visitor_management.doctype.visitor_entry.visitor_entry";

frappe.ui.form.on("Visitor Entry", {
	refresh(frm) {
		add_approval_actions(frm);
		add_gate_actions(frm);
		add_meeting_actions(frm);

		if (!frm.doc.otp_verified) {
			frm.add_custom_button(__("Send OTP"), () => send_otp(frm), __("OTP"));
			frm.add_custom_button(__("Verify OTP"), () => verify_otp(frm), __("OTP"));
		}
	},

	otp(frm) {
		if (frm.doc.otp === "12345" || frm.doc.otp === "123456") {
			frm.set_value("otp_verified", 1);
			frappe.show_alert({
				message: __("Test OTP 12345 accepted"),
				indicator: "green",
			});
		}
	},

	id_proof_photo(frm) {
		frm.set_value("id_proof_photo_preview", frm.doc.id_proof_photo || "");
	},
});

function can_host_act(frm) {
	if (frappe.user.has_role("System Manager")) {
		return true;
	}
	return frm.doc.person_to_meet && frm.doc.person_to_meet === frappe.session.user;
}

function add_approval_actions(frm) {
	if (frm.is_new() || !can_host_act(frm)) {
		return;
	}

	// 1) Pending Approval → Approve / Reject / Transfer
	if (frm.doc.status === "Pending Approval") {
		frm.add_custom_button(__("Approve"), () => prompt_remarks(frm, "approve"), __("Approval"));
		frm.add_custom_button(__("Reject"), () => prompt_remarks(frm, "reject"), __("Approval"));
		frm.add_custom_button(__("Transfer"), () => prompt_transfer(frm), __("Approval"));
	}
}

function add_gate_actions(frm) {
	if (frm.is_new() || !frappe.user.has_role("System Manager")) {
		return;
	}

	// 2) Approved → Check In (+ auto gate pass)
	if (frm.doc.status === "Approved") {
		frm.add_custom_button(__("Check In"), () => {
			frappe.confirm(__("Check in this visitor and generate gate pass?"), () => {
				frappe.call({
					method: `${VE}.check_in`,
					args: { visitor_entry: frm.doc.name },
					freeze: true,
					callback(r) {
						if (!r.exc) {
							const msg = r.message || {};
							frappe.show_alert({
								message: msg.message || __("Checked in"),
								indicator: "green",
							});
							if (msg.pass_url) {
								frappe.msgprint({
									title: __("Gate Pass Ready"),
									message: __(
										"Pass generated on check-in:<br><a href='{0}' target='_blank'>{0}</a>",
										[msg.pass_url]
									),
									indicator: "blue",
								});
							}
							frm.reload_doc();
						}
					},
				});
			});
		}, __("Gate"));
	}

	// 4) Meeting Done → Check Out (Exit)
	if (frm.doc.status === "Meeting Done") {
		frm.add_custom_button(__("Check Out"), () => {
			frappe.confirm(__("Check out this visitor?"), () => {
				frappe.call({
					method: `${VE}.check_out`,
					args: { visitor_entry: frm.doc.name },
					freeze: true,
					callback(r) {
						if (!r.exc) {
							frappe.show_alert({
								message: (r.message && r.message.message) || __("Checked out"),
								indicator: "green",
							});
							frm.reload_doc();
						}
					},
				});
			});
		}, __("Gate"));
	}
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
				method: `${VE}.${action}`,
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
				method: `${VE}.transfer`,
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
	// 3) Checked In → Meeting Done
	if (frm.is_new() || frm.doc.status !== "Checked In") {
		return;
	}
	if (!can_host_act(frm)) {
		return;
	}

	frm.add_custom_button(__("Meeting Completed"), () => {
		frappe.prompt(
			[{ fieldname: "remarks", fieldtype: "Small Text", label: __("Remarks") }],
			(values) => {
				frappe.call({
					method: `${VE}.complete_meeting`,
					args: { visitor_entry: frm.doc.name, remarks: values.remarks },
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
			__("Complete Meeting"),
			__("Complete")
		);
	}, __("Meeting"));
}

function send_otp(frm) {
	if (!frm.doc.mobile) {
		frappe.msgprint(__("Please enter a mobile number first."));
		return;
	}

	frappe.call({
		method: `${VE}.send_otp`,
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
		method: `${VE}.verify_otp`,
		args: { mobile: frm.doc.mobile, otp: frm.doc.otp },
		freeze: true,
		callback(r) {
			if (!r.exc) {
				frm.set_value("otp_verified", 1);
				frappe.show_alert({
					message: (r.message && r.message.message) || __("OTP verified"),
					indicator: "green",
				});
			}
		},
	});
}
