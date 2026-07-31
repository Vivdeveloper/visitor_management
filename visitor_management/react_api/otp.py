"""MSG91 OTP — the app's entire OTP surface.

Flow
----
1. Browser initialises the MSG91 widget with :func:`get_widget_config`.
2. The widget sends and checks the OTP, and returns a JWT access token.
3. :func:`verify` validates that token against MSG91's
   ``widget/verifyAccessToken`` and records the verified mobile.

The verified number always comes from MSG91's response, never from the caller
— which is why :func:`verify` takes no mobile argument. Verification also does
not touch the Frappe session: a receptionist verifying a visitor's phone must
not end up logged in as that visitor.

Templates, resend and rate limiting are configured in the MSG91 panel; none of
it is duplicated here.
"""

from __future__ import annotations

import requests

import frappe
from frappe import _
from frappe.utils import cstr

from visitor_management.visitor_management.doctype.pa_otp_sms_settings.pa_otp_sms_settings import (
	BASE_URL,
	get_settings,
)


REQUEST_TIMEOUT_SEC = 15

#: How long a mobile stays "verified" after the widget confirms it.
VERIFIED_WINDOW_MINUTES = 30


# --------------------------------------------------------------------------
# Mobile numbers
# --------------------------------------------------------------------------

def normalize_mobile(mobile: str | None) -> str:
	mobile = cstr(mobile).strip()
	for char in (" ", "-", "(", ")", "+"):
		mobile = mobile.replace(char, "")

	if len(mobile) == 10 and mobile.isdigit():
		mobile = f"91{mobile}"

	return mobile


def validate_mobile(mobile: str) -> str:
	mobile = normalize_mobile(mobile)
	if not mobile or not mobile.isdigit() or len(mobile) < 10:
		frappe.throw(_("Please enter a valid mobile number"))
	return mobile


# --------------------------------------------------------------------------
# Verified state (Frappe cache, scoped by purpose)
# --------------------------------------------------------------------------

def _verified_key(purpose: str, mobile: str) -> str:
	return f"vms_otp_verified:{purpose}:{mobile}"


def mark_mobile_verified(mobile: str, purpose: str = "login") -> str:
	"""Record that MSG91 proved ownership of this mobile."""
	mobile = validate_mobile(mobile)
	purpose = cstr(purpose).strip() or "login"
	frappe.cache.set_value(
		_verified_key(purpose, mobile), 1, expires_in_sec=VERIFIED_WINDOW_MINUTES * 60
	)
	return mobile


def is_mobile_verified(mobile: str, purpose: str = "login") -> bool:
	mobile = normalize_mobile(mobile)
	if not mobile:
		return False

	# expires=True is required: without it Frappe memoises a miss as None in
	# the per-request frappe.local.cache, while set_value(expires_in_sec=...)
	# writes only to Redis — so a mark-then-check in one request would miss.
	return bool(frappe.cache.get_value(_verified_key(purpose, mobile), expires=True))


def clear_mobile_verified(mobile: str, purpose: str = "login") -> None:
	mobile = normalize_mobile(mobile)
	if mobile:
		frappe.cache.delete_value(_verified_key(purpose, mobile))


# --------------------------------------------------------------------------
# MSG91 gateway
# --------------------------------------------------------------------------

class MSG91Error(Exception):
	"""MSG91 reported a failure, or the call never landed."""

	def __init__(self, message: str, code: str | None = None):
		super().__init__(message)
		self.message = message
		self.code = code


def _extract_identifier(body: dict) -> str:
	"""Pull the verified mobile out of a verifyAccessToken response.

	MSG91 puts the payload in ``message``. Nested shapes are handled too
	because the exact schema is not published. Returns "" when nothing usable
	is present — the caller must treat that as a failure, never as a pass.
	"""
	candidates = []
	for container in (body.get("message"), body.get("data")):
		if isinstance(container, str):
			candidates.append(container)
		elif isinstance(container, dict):
			for field in ("identifier", "mobile", "phone", "number", "mobiles"):
				if container.get(field):
					candidates.append(container[field])

	for candidate in candidates:
		digits = "".join(ch for ch in cstr(candidate) if ch.isdigit())
		if len(digits) >= 10:
			return digits

	return ""


def verify_access_token(access_token: str) -> str:
	"""Validate a widget access token and return the verified mobile.

	MSG91 answers with HTTP 200 even when a request fails, so success is read
	from the ``type`` field in the body, never from the status code::

	    {"type": "success", "message": "919876543210"}
	    {"type": "error", "message": "AuthenticationFailure", "code": "201"}
	"""
	access_token = cstr(access_token).strip()
	if not access_token:
		raise MSG91Error(_("Access token is required."))

	settings = get_settings()
	auth_key = settings.get_auth_key() if settings else ""
	if not auth_key:
		raise MSG91Error(_("MSG91 Auth Key is not configured."))

	try:
		response = requests.post(
			f"{BASE_URL}/widget/verifyAccessToken",
			json={"authkey": auth_key, "access-token": access_token},
			headers={"Content-Type": "application/json", "accept": "application/json"},
			timeout=REQUEST_TIMEOUT_SEC,
		)
		body = response.json()
	except requests.RequestException as exc:
		raise MSG91Error(_("Could not reach MSG91: {0}").format(exc)) from exc
	except ValueError:
		# A non-JSON body means a gateway/proxy error page, not a MSG91 response.
		raise MSG91Error(_("MSG91 returned an unexpected response (HTTP {0}).").format(response.status_code))

	if cstr(body.get("type")).lower() != "success":
		raise MSG91Error(
			cstr(body.get("message")) or _("MSG91 rejected the request."),
			code=cstr(body.get("code")) or None,
		)

	mobile = _extract_identifier(body)
	if not mobile:
		# Fail closed: a success flag without a usable identifier is unusable.
		frappe.log_error(title="MSG91 verifyAccessToken: no identifier", message=cstr(body)[:500])
		raise MSG91Error(_("MSG91 verified the token but returned no mobile number."))

	return mobile


# --------------------------------------------------------------------------
# Whitelisted API
# --------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_widget_config() -> dict:
	"""Public config for initialising the widget.

	Only the widget ID and widget token are exposed — both are client-side
	values by design. The account Auth Key never leaves the server.
	"""
	settings = get_settings()
	if not settings or not settings.is_widget_ready():
		return {"enabled": False}

	return {
		"enabled": True,
		"widget_id": settings.get_widget_id(),
		"token_auth": settings.get_widget_token(),
	}


@frappe.whitelist(allow_guest=True)
def verify(access_token: str | None = None, purpose: str | None = None) -> dict:
	"""Validate a widget access token and mark its mobile verified.

	Takes **no mobile argument** on purpose: accepting a caller-supplied mobile
	would let anyone present their own valid token alongside someone else's
	number.
	"""
	if not access_token:
		frappe.throw(_("Access token is required"))

	purpose = (purpose or "visitor_registration").strip() or "visitor_registration"

	try:
		verified_mobile = verify_access_token(access_token)
	except MSG91Error as exc:
		frappe.log_error(title="VMS OTP verification failed", message=str(exc))
		frappe.throw(_("Could not verify the OTP. Please try again."))

	return {
		"verified": True,
		"mobile": mark_mobile_verified(verified_mobile, purpose),
		"purpose": purpose,
	}
