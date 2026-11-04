/** Small helpers shared by several formatters. */

import type { ScannedDocument, ScannedLine } from "../types";
import { isBlank } from "../utils/text-utils";

/**
 * True for a line that formatters may edit. Ordinary Markdown is always
 * editable; special regions (code, math, ...) only when their preservation
 * setting is turned off.
 */
export function isEditable(line: ScannedLine | undefined): boolean {
	return line !== undefined && !line.protected;
}

/** True for an editable line with visible content. */
export function isContentLine(line: ScannedLine | undefined): line is ScannedLine {
	return line !== undefined && isEditable(line) && !isBlank(line.text);
}

/** Applies `transform` to every editable line, keeping all other lines verbatim. */
export function mapEditableLines(doc: ScannedDocument, transform: (text: string, index: number) => string): string[] {
	return doc.lines.map((line, index) => (isEditable(line) ? transform(line.text, index) : line.text));
}

/**
 * Builds a new line list, inserting a blank line before/after lines where the
 * callbacks ask for one. Used for "separate this block from paragraphs" rules.
 * `blankLine` lets callers keep blockquote markers on inserted lines.
 */
export function insertSeparators(
	lines: readonly string[],
	needsBlankBefore: (index: number) => string | null,
	needsBlankAfter: (index: number) => string | null,
): string[] {
	const out: string[] = [];
	let lastWasInserted = false;
	lines.forEach((text, index) => {
		const before = needsBlankBefore(index);
		const previous = out[out.length - 1];
		if (before !== null && previous !== undefined && !lastWasInserted && !isBlank(previous)) out.push(before);
		out.push(text);
		lastWasInserted = false;
		const after = needsBlankAfter(index);
		const next = lines[index + 1];
		if (after !== null && next !== undefined && !isBlank(next)) {
			out.push(after);
			lastWasInserted = true;
		}
	});
	return out;
}
