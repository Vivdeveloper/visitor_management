"""Web Push (VAPID) for GatePass PWA — background host alerts."""

from __future__ import annotations

import base64
import json
import os

import frappe
from frappe import _


def _ensure_vapid_keys() -> tuple[str, str]:
	conf = frappe.conf
	pub = getattr(conf, "vms_vapid_public_key", None)
	priv = getattr(conf, "vms_vapid_private_pem", None)
	if pub and priv:
		return pub, priv

	from py_vapid import Vapid
	from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

	vapid = Vapid()
	vapid.generate_keys()
	pub = base64.urlsafe_b64encode(
		vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
	).rstrip(b"=").decode()
	priv = vapid.private_pem().decode()

	site_config_path = os.path.join(frappe.get_site_path(), "site_config.json")
	try:
		with open(site_config_path) as handle:
			cfg = json.load(handle)
		cfg["vms_vapid_public_key"] = pub
		cfg["vms_vapid_private_pem"] = priv
		with open(site_config_path, "w") as handle:
			json.dump(cfg, handle, indent="\t")
	except Exception:
		frappe.log_error(title="VMS VAPID key persist failed")

	return pub, priv


def _subs_path() -> str:
	return os.path.join(frappe.get_site_path(), "private", "files", "vms_push_subscriptions.json")


def _load_subs() -> dict:
	path = _subs_path()
	try:
		if os.path.exists(path):
			with open(path) as handle:
				return json.load(handle)
	except Exception:
		pass
	return {}


def _persist_subs(data: dict) -> None:
	path = _subs_path()
	os.makedirs(os.path.dirname(path), exist_ok=True)
	with open(path, "w") as handle:
		json.dump(data, handle, indent="\t")


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
def get_push_status() -> dict:
	user = frappe.session.user
	subs = _load_subs().get(user, []) if user and user != "Guest" else []
	pub, _ = _ensure_vapid_keys()
	return {
		"logged_in": user != "Guest",
		"subscription_count": len(subs),
		"vapid_configured": bool(pub),
	}


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
		from pywebpush import webpush
	except ImportError:
		frappe.log_error(title="VMS Web Push: install pywebpush and py-vapid on bench")
		return False

	_, priv_pem = _ensure_vapid_keys()
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
	vapid_claims = {"sub": f"mailto:notifications@{frappe.local.site}"}

	stale: list[str] = []
	sent = False
	for sub in user_subs:
		try:
			webpush(
				subscription_info=sub,
				data=payload,
				vapid_private_key=priv_pem,
				vapid_claims=vapid_claims,
			)
			sent = True
		except Exception as exc:
			err = str(exc)
			if "404" in err or "410" in err or "Gone" in err:
				stale.append(sub.get("endpoint", ""))
			else:
				frappe.log_error(f"VMS push failed for {user}: {err}", "VMS Web Push")

	if stale:
		all_subs[user] = [s for s in user_subs if s.get("endpoint") not in stale]
		_persist_subs(all_subs)

	return sent
