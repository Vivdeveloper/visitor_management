"""Background tasks wired via hooks.scheduler_events."""

from __future__ import annotations


def pending_approval_reminder() -> None:
	raise NotImplementedError


def detect_overstay() -> None:
	raise NotImplementedError


def cleanup_expired_passes() -> None:
	raise NotImplementedError


def auto_checkout_verification() -> None:
	raise NotImplementedError
