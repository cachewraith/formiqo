/**
 * Safety net run after formatting. If any check fails the formatted output is
 * discarded and the caller keeps the original text, so a formatter bug can
 * never destroy content.
 */

import type { LineKind, ScannedDocument } from "../types";
import { isBlank } from "../utils/text-utils";

export interface ValidationResult {
	readonly valid: boolean;
	readonly reason?: string;
}

const VALID: ValidationResult = { valid: true };
/** Ordered-list marker after optional indentation/quote markers. */
const ORDERED_MARKER = /^([ \t]*(?:>[ \t]?)*[ \t]*)\d{1,9}[.)](?=[ \t]|$)/;

/**
 * Checks that:
 * 1. every protected line (code, math, HTML, comments, frontmatter) survives
 *    verbatim and in order. Repairs may legitimately *create* new protected
 *    regions (e.g. a repaired heading lets the next indented line become code),
 *    so this is a subsequence check rather than an equality check,
 * 2. no YAML frontmatter was created and no non-blank line was removed,
 * 3. the sequence of letters and digits is unchanged (formatters only touch
 *    markup, never words or numbers).
 */
export function validateFormatting(before: ScannedDocument, after: ScannedDocument): ValidationResult {
	if (countKind(after, "frontmatter") > countKind(before, "frontmatter")) {
		return { valid: false, reason: "frontmatter would have been created" };
	}
	if (!preservesProtectedLines(before, after)) {
		return { valid: false, reason: "protected content would have changed" };
	}
	if (countNonBlank(after) < countNonBlank(before)) {
		return { valid: false, reason: "content lines would have been removed" };
	}
	if (textSequence(before) !== textSequence(after)) {
		return { valid: false, reason: "text content would have changed" };
	}
	return VALID;
}

/** Fence delimiter lines are excluded: tidying them is the code-block formatter's job. */
function preservesProtectedLines(before: ScannedDocument, after: ScannedDocument): boolean {
	const expected = before.lines.filter((line) => line.protected && line.kind !== "fence").map((line) => line.text);
	let matched = 0;
	for (const line of after.lines) {
		if (matched < expected.length && line.text === expected[matched]) matched++;
	}
	return matched === expected.length;
}

function countKind(doc: ScannedDocument, kind: LineKind): number {
	return doc.lines.filter((line) => line.kind === kind).length;
}

function countNonBlank(doc: ScannedDocument): number {
	return doc.lines.filter((line) => !isBlank(line.text)).length;
}

/**
 * Task boxes (`[x]`) and ordered-list numbers are markup, not text, so they are
 * ignored; this allows `☑` -> `[x]`, `[X]` -> `[x]` and list renumbering.
 * Every other letter and digit must match exactly and in order.
 */
function textSequence(doc: ScannedDocument): string {
	return doc.lines
		.map((line) => line.text.replace(ORDERED_MARKER, "$1").replace(/\[[xX]\]/g, ""))
		.join("")
		.replace(/[^\p{L}\p{N}]/gu, "");
}
