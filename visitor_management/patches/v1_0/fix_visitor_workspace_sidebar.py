"""One-shot fix for Visitor Management workspace shortcut + sidebar."""

from __future__ import annotations

import frappe


def execute() -> None:
	# Fix broken URL shortcut: type=URL must use `url`, not `link_to`
	# (link_to is a Dynamic Link and resolves DocType "URL" → Not found)
	if frappe.db.exists("Workspace", "Visitor Management"):
		ws = frappe.get_doc("Workspace", "Visitor Management")
		changed = False
		for row in ws.shortcuts:
			if row.type == "URL" and (row.link_to == "/vms" or not row.url):
				row.url = row.url or row.link_to or "/vms"
				row.link_to = None
				changed = True
		if changed:
			ws.flags.ignore_links = True
			ws.save(ignore_permissions=True)
			print("Fixed Workspace shortcuts")
		else:
			print("Workspace shortcuts already OK")

	# Ensure Workspace Sidebar exists (Frappe v16 left nav)
	if not frappe.db.exists("Workspace Sidebar", "Visitor Management"):
		sidebar = frappe.new_doc("Workspace Sidebar")
		sidebar.title = "Visitor Management"
		sidebar.header_icon = "organization"
		sidebar.app = "visitor_management"
		sidebar.standard = 1
		sidebar.module = "Visitor Management"
		sidebar.append(
			"items",
			{
				"label": "Home",
				"link_to": "Visitor Management",
				"link_type": "Workspace",
				"type": "Link",
				"icon": "layout-dashboard",
			},
		)
		sidebar.append(
			"items",
			{
				"label": "Visitor Entry",
				"link_to": "Visitor Entry",
				"link_type": "DocType",
				"type": "Link",
				"icon": "user",
			},
		)
		sidebar.append(
			"items",
			{
				"label": "Open VMS App",
				"link_type": "URL",
				"type": "Link",
				"url": "/vms",
				"icon": "external-link",
			},
		)
		for label, link_to in (
			("Organization", "Organization"),
			("Site", "Site"),
			("Building", "Building"),
			("Tower", "Tower"),
			("Floor", "Floor"),
			("Unit", "Unit"),
			("VMS Department", "VMS Department"),
			("Security Shift", "Security Shift"),
			("Visit Purpose Type", "Visit Purpose Type"),
			("ID Proof Type", "ID Proof Type"),
		):
			sidebar.append(
				"items",
				{
					"label": label,
					"link_to": link_to,
					"link_type": "DocType",
					"type": "Link",
					"child": 1,
				},
			)
		sidebar.insert(ignore_permissions=True)
		print("Created Workspace Sidebar")
	else:
		print("Workspace Sidebar already exists")

	frappe.clear_cache()
	print("Done")
