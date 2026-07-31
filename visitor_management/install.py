import frappe

from visitor_management.utils.setup_defaults import setup_master_data
from visitor_management.utils.sms import setup_msg91_sms_settings


def after_install():
	setup_master_data()
	setup_msg91_sms_settings()
