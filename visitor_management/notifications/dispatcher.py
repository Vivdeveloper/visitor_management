"""Central notification dispatcher for business events."""

from __future__ import annotations


def notify(event: str, context: dict) -> None:
	"""Fan out to SMS / email / push / in-app based on event rules."""
	raise NotImplementedError
