"""Proper-case free text for Visitor Entry (vivEk → Vivek, company / location too)."""

from __future__ import annotations

import re

# Keep Devanagari / other non-Latin scripts unchanged.
_INDIC_RE = re.compile(r"[\u0900-\u097F]")
_WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|[^\s]+")

TITLE_CASE_FIELDS = (
	"first_name",
	"middle_name",
	"last_name",
	"visitor_company",
	"visitor_location",
)

UPPERCASE_FIELDS = ("vehicle_number",)


def _case_latin_token(token: str) -> str:
	"""Title-case one Latin token, including simple apostrophe names."""
	if not token:
		return token
	if "'" in token:
		parts = token.split("'")
		return "'".join(p[:1].upper() + p[1:].lower() if p else p for p in parts)
	if "-" in token:
		return "-".join(_case_latin_token(part) for part in token.split("-"))
	return token[:1].upper() + token[1:].lower()


def autocorrect_text_case(value: str | None) -> str:
	"""
	Normalize free-text casing for storage / display.

	Examples:
	        vivEk  → Vivek
	        JOHN   → John
	        mAry-jane → Mary-Jane
	        o'brien → O'Brien
	        ACME corp → Acme Corp
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


def autocorrect_person_name(value: str | None) -> str:
	"""Alias for person-name fields."""
	return autocorrect_text_case(value)


def autocorrect_vehicle_number(value: str | None) -> str:
	raw = (value or "").strip()
	if not raw:
		return ""
	return re.sub(r"\s+", " ", raw).upper()


def autocorrect_name_fields(doc) -> None:
	"""Apply case auto-fix to visitor text fields on save."""
	for fieldname in TITLE_CASE_FIELDS:
		if not doc.meta.has_field(fieldname):
			continue
		current = doc.get(fieldname)
		if current is None or current == "":
			continue
		fixed = autocorrect_text_case(str(current))
		if fixed != current:
			doc.set(fieldname, fixed)

	for fieldname in UPPERCASE_FIELDS:
		if not doc.meta.has_field(fieldname):
			continue
		current = doc.get(fieldname)
		if current is None or current == "":
			continue
		fixed = autocorrect_vehicle_number(str(current))
		if fixed != current:
			doc.set(fieldname, fixed)
