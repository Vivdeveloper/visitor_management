"""Web Push (VAPID) + FCM device tokens for GatePass background alerts."""

from __future__ import annotations

import base64
import json
import os
from typing import Any

import frappe
from frappe import _
from frappe.utils import cstr, now_datetime

# Error Log.title max length in Frappe
_ERROR_TITLE_MAX = 140


def _log_vms(title: str, message: str | Exception | None = None) -> None:
	"""Always pass a short title — Frappe log_error(title=…) truncates at 140 chars."""
	short = cstr(title).replace("\n", " ").strip()[:_ERROR_TITLE_MAX] or "VMS Push"
	detail = cstr(message) if message is not None else frappe.get_traceback()
	frappe.log_error(title=short, message=detail)


def _vapid_private_usable(priv_pem: str) -> bool:
	"""Reject corrupt / truncated PEM so we regenerate instead of failing every push."""
	if not priv_pem or "BEGIN" not in priv_pem:
		return False
	try:
		from cryptography.hazmat.primitives.serialization import load_pem_private_key

		load_pem_private_key(priv_pem.encode() if isinstance(priv_pem, str) else priv_pem, password=None)
		return True
	except Exception:
		return False


def _ensure_vapid_keys() -> tuple[str, str]:
	conf = frappe.conf
	pub = getattr(conf, "vms_vapid_public_key", None)
	priv = getattr(conf, "vms_vapid_private_pem", None)
	if pub and priv and _vapid_private_usable(cstr(priv)):
		return pub, priv

	try:
		from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
		from py_vapid import Vapid
	except ImportError:
		# Web Push libs not installed on this bench — callers degrade to FCM / in-app only.
		return "", ""

	vapid = Vapid()
	vapid.generate_keys()
	pub = (
		base64.urlsafe_b64encode(
			vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
		)
		.rstrip(b"=")
		.decode()
	)
	priv = vapid.private_pem().decode()

	site_config_path = os.path.join(frappe.get_site_path(), "site_config.json")
	try:
		with open(site_config_path) as handle:
			cfg = json.load(handle)
		cfg["vms_vapid_public_key"] = pub
		cfg["vms_vapid_private_pem"] = priv
		with open(site_config_path, "w") as handle:
			json.dump(cfg, handle, indent="\t")
		# Keep in-process conf in sync so this request can send push.
		frappe.conf.vms_vapid_public_key = pub
		frappe.conf.vms_vapid_private_pem = priv
	except Exception:
		_log_vms("VMS VAPID key persist failed")

	return pub, priv


def _subs_path() -> str:
	return os.path.join(frappe.get_site_path(), "private", "files", "vms_push_subscriptions.json")


def _fcm_tokens_path() -> str:
	return os.path.join(frappe.get_site_path(), "private", "files", "vms_fcm_tokens.json")


def _load_json_file(path: str) -> dict:
	try:
		if os.path.exists(path):
			with open(path) as handle:
				return json.load(handle)
	except Exception:
		pass
	return {}


def _persist_json_file(path: str, data: dict) -> None:
	os.makedirs(os.path.dirname(path), exist_ok=True)
	with open(path, "w") as handle:
		json.dump(data, handle, indent="\t")


def _load_subs() -> dict:
	return _load_json_file(_subs_path())


def _persist_subs(data: dict) -> None:
	_persist_json_file(_subs_path(), data)


def _load_fcm_tokens() -> dict:
	return _load_json_file(_fcm_tokens_path())


def _persist_fcm_tokens(data: dict) -> None:
	_persist_json_file(_fcm_tokens_path(), data)


@frappe.whitelist()
def get_vapid_public_key() -> str:
	pub, _ = _ensure_vapid_keys()
	return pub


@frappe.whitelist()
def save_push_subscription(subscription_json: str) -> dict:
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Login required"), frappe.AuthenticationError)

	sub = json.loads(subscription_json) if isinstance(subscription_json, str) else subscription_json
	endpoint = sub.get("endpoint", "")
	if not endpoint:
		frappe.throw(_("Invalid subscription: missing endpoint"))

	all_subs = _load_subs()
	user_subs = [s for s in all_subs.get(user, []) if s.get("endpoint") != endpoint]
	user_subs.append(sub)
	all_subs[user] = user_subs
	_persist_subs(all_subs)
	return {"ok": True, "endpoint": endpoint}


@frappe.whitelist()
def delete_push_subscription(endpoint: str) -> dict:
	user = frappe.session.user
	all_subs = _load_subs()
	all_subs[user] = [s for s in all_subs.get(user, []) if s.get("endpoint") != endpoint]
	_persist_subs(all_subs)
	return {"ok": True}


@frappe.whitelist()
def save_fcm_token(token: str | None = None, platform: str | None = None) -> dict:
	"""Register an Android/iOS FCM device token for the logged-in user."""
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Login required"), frappe.AuthenticationError)

	token = (token or "").strip()
	if not token or len(token) < 20:
		frappe.throw(_("Invalid FCM token"))

	platform = (platform or "android").strip().lower() or "android"
	all_tokens = _load_fcm_tokens()
	user_tokens = [t for t in all_tokens.get(user, []) if t.get("token") != token]
	user_tokens.append(
		{
			"token": token,
			"platform": platform,
			"updated_at": str(now_datetime()),
		}
	)
	# Keep newest tokens only (avoid unbounded growth).
	all_tokens[user] = user_tokens[-8:]
	_persist_fcm_tokens(all_tokens)
	return {"ok": True, "platform": platform}


@frappe.whitelist()
def delete_fcm_token(token: str | None = None) -> dict:
	user = frappe.session.user
	token = (token or "").strip()
	all_tokens = _load_fcm_tokens()
	all_tokens[user] = [t for t in all_tokens.get(user, []) if t.get("token") != token]
	_persist_fcm_tokens(all_tokens)
	return {"ok": True}


@frappe.whitelist()
def get_push_status() -> dict:
	user = frappe.session.user
	subs = _load_subs().get(user, []) if user and user != "Guest" else []
	fcm = _load_fcm_tokens().get(user, []) if user and user != "Guest" else []
	pub, _ = _ensure_vapid_keys()
	return {
		"logged_in": user != "Guest",
		"subscription_count": len(subs),
		"fcm_token_count": len(fcm),
		"vapid_configured": bool(pub),
		"fcm_configured": _fcm_is_configured(),
	}


def _vapid_contact_mailto() -> str:
	"""RFC8292 `sub` must be a real mailto:/https contact — not bare site names."""
	configured = cstr(getattr(frappe.conf, "vms_vapid_mailto", "") or "").strip()
	if configured:
		if not configured.startswith(("mailto:", "https://")):
			configured = f"mailto:{configured}"
		return configured

	try:
		email = cstr(frappe.db.get_value("User", "Administrator", "email") or "").strip()
	except Exception:
		email = ""
	if email and "@" in email and "." in email.split("@")[-1]:
		return f"mailto:{email}"

	site = cstr(getattr(frappe.local, "site", "") or "")
	if site and "." in site:
		return f"mailto:notifications@{site}"

	return "mailto:admin@example.com"


def send_push_to_user(
	user: str,
	title: str,
	body: str,
	url: str = "/vms/approvals",
	icon: str | None = None,
	tag: str | None = None,
) -> bool:
	"""Send Web Push to all subscribed browsers for `user`."""
	all_subs = _load_subs()
	user_subs = all_subs.get(user, [])
	if not user_subs:
		return False

	try:
		from py_vapid import Vapid
		from pywebpush import webpush
	except ImportError:
		_log_vms("VMS Web Push: install pywebpush and py-vapid")
		return False

	_, priv_pem = _ensure_vapid_keys()
	if not priv_pem:
		return False

	# pywebpush's from_string() expects raw/DER — PEM must be loaded via Vapid.from_pem.
	try:
		vapid = Vapid.from_pem(priv_pem.encode() if isinstance(priv_pem, str) else priv_pem)
	except Exception as exc:
		_log_vms("VMS VAPID private key invalid", exc)
		return False

	payload = json.dumps(
		{
			"title": title,
			"body": body,
			"url": url,
			"icon": icon or "/assets/visitor_management/frontend/icons/icon-192.png",
			"badge": "/assets/visitor_management/frontend/icons/icon-192.png",
			"tag": tag or "vms-host-alert",
		}
	)
	vapid_claims = {"sub": _vapid_contact_mailto()}

	stale: list[str] = []
	sent = False
	for sub in user_subs:
		try:
			webpush(
				subscription_info=sub,
				data=payload,
				vapid_private_key=vapid,
				vapid_claims=vapid_claims,
				timeout=20,
			)
			sent = True
		except Exception as exc:
			err = str(exc)
			if "404" in err or "410" in err or "Gone" in err:
				stale.append(sub.get("endpoint", ""))
			else:
				# title must stay short (Error Log max 140); details go in message
				_log_vms("VMS Web Push failed", f"user={user}\n{err}")

	if stale:
		all_subs[user] = [s for s in user_subs if s.get("endpoint") not in stale]
		_persist_subs(all_subs)

	return sent


def _fcm_is_configured() -> bool:
	conf = frappe.conf
	if getattr(conf, "vms_fcm_server_key", None):
		return True
	if getattr(conf, "vms_fcm_service_account_json", None):
		return True
	path = getattr(conf, "vms_fcm_service_account", None)
	if path and os.path.exists(path):
		return True
	# Common relative path under site private files
	rel = os.path.join(frappe.get_site_path(), "private", "files", "vms_fcm_service_account.json")
	return os.path.exists(rel)


def _load_fcm_service_account() -> dict[str, Any] | None:
	conf = frappe.conf
	raw = getattr(conf, "vms_fcm_service_account_json", None)
	if raw:
		return json.loads(raw) if isinstance(raw, str) else raw

	path = getattr(conf, "vms_fcm_service_account", None)
	if not path:
		path = os.path.join(frappe.get_site_path(), "private", "files", "vms_fcm_service_account.json")
	if path and os.path.exists(path):
		with open(path) as handle:
			return json.load(handle)
	return None


def _fcm_access_token(service_account: dict[str, Any]) -> str:
	from google.auth.transport.requests import Request
	from google.oauth2 import service_account

	credentials = service_account.Credentials.from_service_account_info(
		service_account,
		scopes=["https://www.googleapis.com/auth/firebase.messaging"],
	)
	credentials.refresh(Request())
	return credentials.token


def _send_fcm_http_v1(
	*,
	project_id: str,
	access_token: str,
	device_token: str,
	title: str,
	body: str,
	url: str,
	tag: str,
) -> None:
	import requests

	endpoint = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
	# Include both notification (system tray / lock screen) and data (tap deep-link).
	message = {
		"message": {
			"token": device_token,
			"notification": {
				"title": title,
				"body": body,
			},
			"data": {
				"title": title,
				"body": body,
				"url": url,
				"tag": tag,
				"channelId": "gatepass_urgent",
			},
			"android": {
				"priority": "HIGH",
				"notification": {
					"channel_id": "gatepass_urgent",
					"sound": "default",
					"notification_priority": "PRIORITY_MAX",
					"default_vibrate_timings": True,
					"visibility": "PUBLIC",
				},
			},
		}
	}
	resp = requests.post(
		endpoint,
		headers={
			"Authorization": f"Bearer {access_token}",
			"Content-Type": "application/json; charset=UTF-8",
		},
		json=message,
		timeout=15,
	)
	if resp.status_code >= 400:
		raise RuntimeError(f"FCM v1 {resp.status_code}: {resp.text[:500]}")


def _send_fcm_legacy(
	*,
	server_key: str,
	device_token: str,
	title: str,
	body: str,
	url: str,
	tag: str,
) -> None:
	import requests

	resp = requests.post(
		"https://fcm.googleapis.com/fcm/send",
		headers={
			"Authorization": f"key={server_key}",
			"Content-Type": "application/json",
		},
		json={
			"to": device_token,
			"priority": "high",
			"notification": {
				"title": title,
				"body": body,
				"sound": "default",
				"android_channel_id": "gatepass_urgent",
				"tag": tag,
			},
			"data": {
				"title": title,
				"body": body,
				"url": url,
				"tag": tag,
				"channelId": "gatepass_urgent",
			},
		},
		timeout=15,
	)
	if resp.status_code >= 400:
		raise RuntimeError(f"FCM legacy {resp.status_code}: {resp.text[:500]}")
	payload = resp.json() if resp.content else {}
	if payload.get("failure"):
		raise RuntimeError(f"FCM legacy failure: {payload}")


def send_fcm_to_user(
	user: str,
	title: str,
	body: str,
	url: str = "/vms/approvals",
	tag: str | None = None,
) -> bool:
	"""Send FCM to all registered Android/iOS tokens for `user` (lock-screen capable)."""
	if not user or user == "Guest":
		return False

	all_tokens = _load_fcm_tokens()
	user_tokens = all_tokens.get(user, [])
	if not user_tokens:
		return False

	tag = tag or "vms-host-alert"
	# Prefer app deep path for Capacitor HashRouter (/approvals).
	app_url = url.replace("/vms", "") if url.startswith("/vms") else url
	if not app_url.startswith("/"):
		app_url = f"/{app_url}"

	server_key = getattr(frappe.conf, "vms_fcm_server_key", None)
	service_account = _load_fcm_service_account()
	access_token = None
	project_id = getattr(frappe.conf, "vms_fcm_project_id", None)

	if service_account:
		try:
			access_token = _fcm_access_token(service_account)
			project_id = project_id or service_account.get("project_id")
		except ImportError:
			_log_vms("VMS FCM: install google-auth on bench")
			service_account = None
		except Exception:
			_log_vms("VMS FCM: service account auth failed")
			service_account = None

	if not server_key and not (service_account and access_token and project_id):
		_log_vms(
			"VMS FCM not configured",
			"Set vms_fcm_service_account or vms_fcm_server_key in site_config.json",
		)
		return False

	stale: list[str] = []
	sent = False
	for entry in user_tokens:
		token = entry.get("token") if isinstance(entry, dict) else None
		if not token:
			continue
		try:
			if service_account and access_token and project_id:
				_send_fcm_http_v1(
					project_id=project_id,
					access_token=access_token,
					device_token=token,
					title=title,
					body=body,
					url=app_url,
					tag=tag,
				)
			else:
				_send_fcm_legacy(
					server_key=str(server_key),
					device_token=token,
					title=title,
					body=body,
					url=app_url,
					tag=tag,
				)
			sent = True
		except Exception as exc:
			err = str(exc)
			if any(code in err for code in ("NOT_FOUND", "UNREGISTERED", "InvalidRegistration", "404", "410")):
				stale.append(token)
			else:
				_log_vms("VMS FCM failed", f"user={user}\n{err}")

	if stale:
		all_tokens[user] = [t for t in user_tokens if t.get("token") not in stale]
		_persist_fcm_tokens(all_tokens)

	return sent
