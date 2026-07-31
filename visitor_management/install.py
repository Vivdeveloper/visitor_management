import frappe

from visitor_management.utils.setup_defaults import setup_master_data


def after_install():
	setup_master_data()
