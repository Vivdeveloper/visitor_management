import { autocorrectFormText } from "@/lib/nameCase";

/** Sentinel value for the synthetic "Other" purpose option in the UI. */
export const VISIT_PURPOSE_OTHER_VALUE = "__OTHER__";

export function resolveVisitPurposeType(selected: string, otherText: string): string {
  if (selected === VISIT_PURPOSE_OTHER_VALUE) {
    return autocorrectFormText(otherText);
  }
  return selected.trim();
}

export function isVisitPurposeOther(
  selected: string,
  knownPurposeValues: string[],
): boolean {
  if (!selected) return false;
  if (selected === VISIT_PURPOSE_OTHER_VALUE) return true;
  return knownPurposeValues.length > 0 && !knownPurposeValues.includes(selected);
}

export function visitPurposeSelectValue(
  selected: string,
  knownPurposeValues: string[],
): string {
  if (!selected) return "";
  if (isVisitPurposeOther(selected, knownPurposeValues)) {
    return VISIT_PURPOSE_OTHER_VALUE;
  }
  return selected;
}

export function visitPurposeOtherText(
  selected: string,
  otherText: string,
  knownPurposeValues: string[],
): string {
  if (selected === VISIT_PURPOSE_OTHER_VALUE) return otherText;
  if (isVisitPurposeOther(selected, knownPurposeValues)) return selected;
  return otherText;
}
