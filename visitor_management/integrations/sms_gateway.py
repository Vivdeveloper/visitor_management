"""SMS gateway adapter (MSG91 / others). Prefer visitor_management.utils.sms for low-level send."""

from __future__ import annotations


def send_sms(mobile: str, message: str) -> dict:
	raise NotImplementedError
