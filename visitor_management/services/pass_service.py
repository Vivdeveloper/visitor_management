"""QR pass generation, token validation, and public URL helpers."""

from __future__ import annotations

import secrets
from urllib.parse import urlparse

import frappe
from frappe import _
from frappe.model.naming import make_autoname
from frappe.utils import add_to_date, get_datetime, get_url, now_datetime


PASS_TTL_HOURS = 24
VALID_PASS_STATUSES = ("Approved", "Checked In")


def _public_pass_path(token: str) -> str:
	return f"/vms/pass/{token}"


def _is_site_name_host(host: str) -> bool:
	"""True when Host is the bench site name (not a browser-reachable hostname)."""
	hostname = (host or "").split(":")[0].strip().lower()
	if not hostname or hostname in {"localhost", "127.0.0.1", "::1"}:
		return False
	site = (getattr(frappe.local, "site", None) or "").strip().lower()
	if site and hostname == site.split(":")[0]:
		return True
	# Typical local multi-site names: *.local
	if hostname.endswith(".local"):
		return True
	return False


def _local_dev_origin(preferred_port: str | None = None) -> str:
	"""Fallback origin for local benches when Host is the site name."""
	override = (frappe.conf.get("vms_public_host") or "").strip()
	if override:
		if "://" not in override:
			override = f"http://{override}"
		return override.rstrip("/")

	port = preferred_port or str(frappe.conf.get("webserver_port") or 8000)
	return f"http://localhost:{port}"


def get_public_pass_url(token: str) -> str:
	"""Build a browser-reachable absolute URL.

	Local multi-site benches often resolve get_url() to ``http://site-name/...``
	which does not work in the browser (DNS NXDOMAIN). Prefer the current request
	host when it is browser-reachable (e.g. ``localhost:8025``), then configured
	host, then localhost + webserver_port — never bare site names like precious.alloys.
	"""
	path = _public_pass_path(token)

	request = getattr(frappe.local, "request", None)
	host = (getattr(request, "host", None) or "").strip() if request is not None else ""
	if host:
		if _is_site_name_host(host):
			port = host.split(":")[1] if ":" in host else None
			return _local_dev_origin(port) + path
		scheme = "https" if getattr(request, "is_secure", False) else "http"
		return f"{scheme}://{host}{path}"

	configured = (
		frappe.conf.get("vms_public_host")
		or frappe.conf.get("hostname")
		or frappe.conf.get("host_name")
		or ""
	).strip()
	if configured:
		if "://" not in configured:
			configured = f"http://{configured}"
		return configured.rstrip("/") + path

	# Avoid get_url() site-name hosts (e.g. http://precious.alloys/...)
	fallback = get_url(path)
	try:
		parsed = urlparse(fallback)
		if parsed.hostname and _is_site_name_host(parsed.netloc or parsed.hostname):
			return _local_dev_origin(str(parsed.port) if parsed.port else None) + path
	except Exception:
		pass

	return fallback


def _compute_expiry(doc) -> object:
	"""24h from now, or expected_exit if sooner (and still in the future)."""
	expires = add_to_date(now_datetime(), hours=PASS_TTL_HOURS, as_datetime=True)
	if doc.expected_exit:
		exit_at = get_datetime(doc.expected_exit)
		if exit_at and exit_at > now_datetime() and exit_at < expires:
			expires = exit_at
	return expires


def generate_pass_for_entry(visitor_entry: str, *, force: bool = False) -> dict:
	"""Create/refresh QR token on Visitor Entry. Requires Approved (or force)."""
	doc = frappe.get_doc("Visitor Entry", visitor_entry)

	if doc.status not in VALID_PASS_STATUSES and not force:
		frappe.throw(
			_("QR pass can only be generated for Approved visitors. Current status: {0}").format(
				doc.status
			)
		)

	if not force and doc.qr_token and doc.qr_expires_on and get_datetime(doc.qr_expires_on) > now_datetime():
		url = get_public_pass_url(doc.qr_token)
		if doc.pass_url != url:
			doc.db_set("pass_url", url, update_modified=False)
			doc.pass_url = url
		return {
			"name": doc.name,
			"pass_number": doc.pass_number,
			"qr_token": doc.qr_token,
			"qr_expires_on": doc.qr_expires_on,
			"pass_url": doc.pass_url or url,
			"regenerated": False,
		}

	token = secrets.token_urlsafe(32)
	# Ensure uniqueness
	while frappe.db.exists("Visitor Entry", {"qr_token": token}):
		token = secrets.token_urlsafe(32)

	if not doc.pass_number:
		doc.pass_number = make_autoname("VP-.#####")

	doc.qr_token = token
	doc.qr_expires_on = _compute_expiry(doc)
	doc.pass_url = get_public_pass_url(token)
	doc.save(ignore_permissions=True)

	return {
		"name": doc.name,
		"pass_number": doc.pass_number,
		"qr_token": doc.qr_token,
		"qr_expires_on": str(doc.qr_expires_on),
		"pass_url": doc.pass_url,
		"regenerated": True,
	}


def get_pass_by_entry(visitor_entry: str) -> dict:
	doc = frappe.get_doc("Visitor Entry", visitor_entry)
	if not doc.qr_token:
		frappe.throw(_("No QR pass generated for this visitor yet."))
	return _pass_payload(doc, public=False)


def validate_qr_token(token: str) -> dict:
	"""Validate token for gate / public page. Guest-safe."""
	token = (token or "").strip()
	if not token:
		frappe.throw(_("Pass token is required"))

	name = frappe.db.get_value("Visitor Entry", {"qr_token": token}, "name")
	if not name:
		return {"valid": False, "reason": _("Invalid pass token"), "pass": None}

	doc = frappe.get_doc("Visitor Entry", name)
	now = now_datetime()

	if doc.qr_expires_on and get_datetime(doc.qr_expires_on) < now:
		return {
			"valid": False,
			"reason": _("Pass has expired"),
			"pass": _pass_payload(doc, public=True),
		}

	if doc.status not in VALID_PASS_STATUSES:
		return {
			"valid": False,
			"reason": _("Pass not valid for status: {0}").format(doc.status),
			"pass": _pass_payload(doc, public=True),
		}

	return {
		"valid": True,
		"reason": _("Pass is valid"),
		"pass": _pass_payload(doc, public=True),
	}


def _pass_payload(doc, *, public: bool) -> dict:
	payload = {
		"visitor_entry": doc.name,
		"pass_number": doc.pass_number,
		"full_name": doc.full_name,
		"photo": doc.photo,
		"visitor_company": doc.visitor_company,
		"host_name": doc.host_name,
		"person_to_meet": doc.person_to_meet,
		"building": doc.building,
		"floor": doc.floor,
		"unit": doc.unit,
		"expected_meeting_time": doc.expected_meeting_time,
		"expected_exit": doc.expected_exit,
		"status": doc.status,
		"qr_expires_on": doc.qr_expires_on,
		"pass_url": doc.pass_url or (get_public_pass_url(doc.qr_token) if doc.qr_token else None),
	}
	if not public:
		payload["qr_token"] = doc.qr_token
		payload["mobile"] = doc.mobile
	return payload
