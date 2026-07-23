"""Firebase Cloud Messaging adapter."""

from __future__ import annotations


def send_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> dict:
	raise NotImplementedError
