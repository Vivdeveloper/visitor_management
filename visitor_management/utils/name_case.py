"""Proper-case person names for Visitor Entry (vivEk → Vivek)."""

from __future__ import annotations

import re

# Keep Devanagari / other non-Latin scripts unchanged.
_INDIC_RE = re.compile(r"[\u0900-\u097F]")
_WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|[^\s]+")


def _case_latin_token(token: str) -> str:
	"""Title-case one Latin name token, including simple apostrophe names."""
	if not token:
		return token
	if "'" in token:
		parts = token.split("'")
		return "'".join(p[:1].upper() + p[1:].lower() if p else p for p in parts)
	if "-" in token:
		return "-".join(_case_latin_token(part) for part in token.split("-"))
	return token[:1].upper() + token[1:].lower()


def autocorrect_person_name(value: str | None) -> str:
	"""
	Normalize a person name for storage / display.

	Examples:
	        vivEk  → Vivek
	        JOHN   → John
	        mAry-jane → Mary-Jane
	        o'brien → O'Brien
	"""
	raw = (value or "").strip()
	if not raw:
		return ""

	# Already Indic script — leave as typed.
	if _INDIC_RE.search(raw):
		return raw

	parts: list[str] = []
	last_end = 0
	for match in _WORD_RE.finditer(raw):
		parts.append(raw[last_end : match.start()])
		token = match.group(0)
		if re.fullmatch(r"[A-Za-z]+(?:'[A-Za-z]+)?", token) or "-" in token:
			parts.append(_case_latin_token(token))
		else:
			parts.append(token)
		last_end = match.end()
	parts.append(raw[last_end:])
	return "".join(parts).strip()


def autocorrect_name_fields(doc) -> None:
	"""Apply autocorrect to first / middle / last name on a Visitor Entry doc."""
	for fieldname in ("first_name", "middle_name", "last_name"):
		if not doc.meta.has_field(fieldname):
			continue
		current = doc.get(fieldname)
		if current is None or current == "":
			continue
		fixed = autocorrect_person_name(str(current))
		if fixed != current:
			doc.set(fieldname, fixed)
