/**
 * WhitespaceFormatter
 *
 * repair:    converts non-breaking/unusual spaces that sit in *structural*
 *            positions (indentation and after `>`, list, task and heading
 *            markers) into regular spaces, so the Markdown actually parses.
 *            Unusual spaces inside prose are left alone.
 * normalize: additionally strips trailing whitespace (keeping two-space hard
 *            line breaks) and collapses runs of blank lines into one.
 */

import type { Formatter } from "../types";
import { parseListItem, splitQuote } from "../utils/markdown-utils";
import { indentWidth, isBlank, isSpaceLike, replaceUnusualSpaces, UNUSUAL_SPACE_CLASS } from "../utils/text-utils";
import { isEditable } from "./shared";

const HAS_UNUSUAL_SPACE = new RegExp(`[${UNUSUAL_SPACE_CLASS}]`);
const TRAILING_SPACE = new RegExp(`[ \\t${UNUSUAL_SPACE_CLASS}]+$`);
const SPACE_OR_END = `(?=[ \\t${UNUSUAL_SPACE_CLASS}]|$)`;

const QUOTE_MARKER = /^>/;
const LIST_MARKER = new RegExp(`^(?:[-*+]|\\d{1,9}[.)])${SPACE_OR_END}`);
const TASK_BOX = new RegExp(`^\\[[^\\]]\\]${SPACE_OR_END}`);
const HEADING_MARKER = new RegExp(`^#{1,6}${SPACE_OR_END}`);
const TABLE_START = /^\\?\|/;
/** Indentation (columns) at which a line outside a list becomes an indented code block. */
const INDENTED_CODE_WIDTH = 4;

export const whitespaceFormatter: Formatter = {
	id: "whitespace",
	format(doc, ctx) {
		const out: string[] = [];
		let previousBlank = false;
		let previousContent: string | null = null;
		for (const line of doc.lines) {
			if (!isEditable(line)) {
				out.push(line.text);
				previousBlank = false;
				previousContent = null;
				continue;
			}
			let text = repairStructuralSpaces(line.text, previousContent !== null && isListContext(previousContent));
			if (!isBlank(text)) previousContent = text;
			if (ctx.mode === "normalize") {
				text = trimTrailingWhitespace(text);
				if (text === "") {
					if (!previousBlank) out.push("");
					previousBlank = true;
					continue;
				}
			}
			previousBlank = false;
			out.push(text);
		}
		return out;
	},
};

/** A list item or an indented line: deeper indentation after it continues the list. */
function isListContext(previous: string): boolean {
	const { content } = splitQuote(previous);
	return parseListItem(content) !== null || /^[ \t]/.test(content);
}

/**
 * Walks the structural prefix of a line (indentation, quote/list/task/heading
 * markers) and turns unusual spaces into regular ones. Lines without any
 * structural marker are returned unchanged, so NBSP-indented prose never
 * accidentally becomes an indented code block. Likewise, indentation of 4+
 * columns is only converted inside a list (`allowDeepIndent`), where it nests
 * an item instead of starting a code block.
 */
export function repairStructuralSpaces(text: string, allowDeepIndent = false): string {
	if (!HAS_UNUSUAL_SPACE.test(text)) return text;

	let index = 0;
	let repaired = "";
	let sawMarker = false;
	let afterListMarker = false;

	const consumeSpaces = (): void => {
		const start = index;
		while (index < text.length && isSpaceLike(text[index])) index++;
		repaired += replaceUnusualSpaces(text.slice(start, index));
	};

	consumeSpaces();
	if (!allowDeepIndent && indentWidth(repaired) >= INDENTED_CODE_WIDTH) return text;
	for (;;) {
		const rest = text.slice(index);
		const marker =
			QUOTE_MARKER.exec(rest)?.[0] ??
			LIST_MARKER.exec(rest)?.[0] ??
			(afterListMarker ? TASK_BOX.exec(rest)?.[0] : undefined);

		if (marker !== undefined) {
			sawMarker = true;
			afterListMarker = LIST_MARKER.test(rest);
			repaired += marker.length === 3 && marker.startsWith("[") ? `[${replaceUnusualSpaces(marker.charAt(1))}]` : marker;
			index += marker.length;
			consumeSpaces();
			continue;
		}

		const heading = HEADING_MARKER.exec(rest)?.[0];
		if (heading !== undefined) {
			sawMarker = true;
			repaired += heading;
			index += heading.length;
			consumeSpaces();
		} else if (TABLE_START.test(rest)) {
			sawMarker = true;
		}
		break;
	}

	return sawMarker ? repaired + text.slice(index) : text;
}

/** Removes trailing whitespace but keeps a Markdown hard break (2+ spaces) as exactly two spaces. */
export function trimTrailingWhitespace(text: string): string {
	const match = TRAILING_SPACE.exec(text);
	if (!match) return text;
	const content = text.slice(0, match.index);
	if (content === "") return "";
	return /^ {2,}$/.test(match[0]) ? `${content}  ` : content;
}
