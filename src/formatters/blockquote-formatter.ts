/**
 * BlockquoteFormatter (normalize only)
 *
 * Rewrites quote markers to the canonical `> ` form (`>>text` -> `> > text`) and
 * trims empty quote lines to a bare `>`. Leading indentation and any extra
 * spaces after the markers (indented code inside a quote) are preserved.
 * When callout preservation is on, Obsidian callouts (`> [!note]` and their
 * body lines) are left exactly as written.
 */

import type { Formatter, ScannedDocument } from "../types";
import { isCalloutHeader } from "../utils/markdown-utils";
import { isEditable } from "./shared";

const QUOTE_MARKERS = /^( {0,3})((?:>[ \t]?)+)(.*)$/;

export const blockquoteFormatter: Formatter = {
	id: "blockquotes",
	format(doc, ctx) {
		if (ctx.mode !== "normalize") return doc.lines.map((line) => line.text);
		const callouts = ctx.preservation.callouts ? findCalloutLines(doc) : new Set<number>();
		return doc.lines.map((line, index) =>
			isEditable(line) && !callouts.has(index) ? normalizeQuoteLine(line.text) : line.text,
		);
	},
};

export function normalizeQuoteLine(text: string): string {
	const match = QUOTE_MARKERS.exec(text);
	if (!match) return text;
	const [, indent = "", markers = "", content = ""] = match;
	const depth = (markers.match(/>/g) ?? []).length;
	const prefix = Array.from({ length: depth }, () => ">").join(" ");
	return content.trim() === "" ? `${indent}${prefix}` : `${indent}${prefix} ${content}`;
}

/** Lines belonging to callouts: the `> [!type]` header and the quote lines that follow it. */
function findCalloutLines(doc: ScannedDocument): Set<number> {
	const lines = new Set<number>();
	let inCallout = false;
	doc.lines.forEach((line, index) => {
		const isQuote = /^ {0,3}>/.test(line.text);
		if (isCalloutHeader(line.text)) inCallout = true;
		else if (!isQuote) inCallout = false;
		if (inCallout) lines.add(index);
	});
	return lines;
}
