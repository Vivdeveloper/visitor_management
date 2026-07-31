# Copyright (c) 2026, Vivek Choudhary and contributors
# For license information, please see license.txt

"""MSG91 OTP widget credentials.

Three values, matching MSG91's own integration screens:

* ``auth_key``          — server-side, for ``widget/verifyAccessToken``
* ``widget_id``         — client-side, to initialise the widget
* ``widget_token_auth`` — client-side, ditto

Each falls back to the matching ``site_config.json`` key, so deployments that
already set ``msg91_auth_key`` / ``msg91_widget_id`` / ``msg91_widget_token``
keep working until an admin fills the form in.

Everything else about the OTP (template, retry, rate limits, fallback channel)
is configured in the MSG91 panel and read from the widget at runtime.
"""

from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import cstr


DOCTYPE = "PA OTP SMS Settings"

BASE_URL = "https://api.msg91.com/api/v5"
PLACEHOLDER_AUTH_KEYS = {"", "YOUR_MSG91_AUTH_KEY", "CHANGE_ME"}


class PAOTPSMSSettings(Document):
	def validate(self):
		self.widget_id = cstr(self.widget_id).strip()
		self.widget_token_auth = cstr(self.widget_token_auth).strip()

	def get_auth_key(self) -> str:
		"""Decrypted auth key, falling back to site_config."""
		key = ""
		if self.get("auth_key"):
			# get_password() raises for an unsaved Single; the in-memory value is fine then.
			try:
				key = cstr(self.get_password("auth_key", raise_exception=False))
			except Exception:
				key = cstr(self.get("auth_key"))

		key = key.strip() or cstr(frappe.conf.get("msg91_auth_key")).strip()
		return "" if key in PLACEHOLDER_AUTH_KEYS else key

	def get_widget_id(self) -> str:
		return cstr(self.widget_id).strip() or cstr(frappe.conf.get("msg91_widget_id")).strip()

	def get_widget_token(self) -> str:
		return cstr(self.widget_token_auth).strip() or cstr(frappe.conf.get("msg91_widget_token")).strip()

	def is_widget_ready(self) -> bool:
		"""True when the browser can start the widget and we can verify its token."""
		return bool(self.get_auth_key() and self.get_widget_id() and self.get_widget_token())


def get_settings() -> PAOTPSMSSettings | None:
	"""Cached settings Single (Frappe invalidates the cache on save).

	Returns None before the DocType is migrated in, so callers stay safe
	during install and migrate.
	"""
	if not frappe.db.exists("DocType", DOCTYPE):
		return None
	return frappe.get_cached_doc(DOCTYPE, DOCTYPE)
