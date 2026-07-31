/** Pull the human rejection reason from Visitor Entry `approval_remarks`. */
export function extractRejectionReason(remarks?: string | null): string | null {
  if (!remarks?.trim()) return null;

  const lines = remarks
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const matched = /^Rejected by [^:]+:\s*(.+)$/i.exec(line);
    if (matched?.[1]?.trim()) return matched[1].trim();
  }

  const last = lines[lines.length - 1];
  if (!last) return null;
  if (/^Rejected by /i.test(last) && !last.includes(":")) return null;
  const afterColon = /:\s*(.+)$/.exec(last);
  return afterColon?.[1]?.trim() || last;
}
