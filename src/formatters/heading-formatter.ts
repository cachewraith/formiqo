/**
 * HeadingFormatter
 *
 * repair:    `##Heading` -> `## Heading` for 2-6 hashes. A single `#word` is
 *            left alone because it is an Obsidian tag.
 * normalize: collapses the gap after the hashes to one space, strips the
 *            optional closing `#` sequence and surrounds top-level headings with
 *            blank lines. Indentation is kept (it attaches headings to list items).
 */

import type { Formatter, ScannedDocument } from "../types";
import { parseAtxHeading, splitQuote } from "../utils/markdown-utils";
import { isBlank } from "../utils/text-utils";
import { insertSeparators, isEditable, mapEditableLines } from "./shared";

const MISSING_SPACE = /^( {0,3})(#{2,6})([^#\s])/;

export const headingFormatter: Formatter = {
	id: "headings",
	format(doc, ctx) {
		const lines = mapEditableLines(doc, (text) => {
			const { quote, content } = splitQuote(text);
			const repaired = content.replace(MISSING_SPACE, "$1$2 $3");
			return quote + (ctx.mode === "normalize" ? normalizeHeading(repaired) : repaired);
		});
		if (ctx.mode !== "normalize") return lines;
		return separateTopLevelHeadings(lines, doc);
	},
};

function normalizeHeading(content: string): string {
	const heading = parseAtxHeading(content);
	if (!heading) return content;
	// Indentation is kept: inside a list item it is what attaches the heading to the item.
	const hashes = heading.indent + "#".repeat(heading.level);
	return heading.text === "" ? hashes : `${hashes} ${heading.text}`;
}

function separateTopLevelHeadings(lines: readonly string[], doc: ScannedDocument): string[] {
	const isTopLevelHeading = (index: number): boolean => {
		const text = lines[index] ?? "";
		return isEditable(doc.lines[index]) && !/^\s/.test(text) && parseAtxHeading(text) !== null;
	};
	return insertSeparators(
		lines,
		(index) => {
			if (!isTopLevelHeading(index)) return null;
			const previous = doc.lines[index - 1];
			return previous !== undefined && previous.kind !== "frontmatter" && !isBlank(previous.text) ? "" : null;
		},
		(index) => (isTopLevelHeading(index) ? "" : null),
	);
}
