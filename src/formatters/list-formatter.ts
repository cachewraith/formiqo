/**
 * ListFormatter
 *
 * repair:    converts typographic bullets (`•`, `◦`, `▪`, ...) and checkbox glyphs
 *            (`☐`, `☑`, `☒`) copied from rendered pages into Markdown list/task
 *            syntax, and adds the missing space in `- [ ]Task`. (`- []` is left
 *            alone: in technical writing it is usually a literal empty array.)
 * normalize: unifies bullets to `-`, collapses the gap after a marker to one space,
 *            lowercases `[X]`, and renumbers ordered lists whose numbering is
 *            inconsistent. Lists numbered with a repeated value (`1.` `1.` `1.`)
 *            are intentional and are left alone. Indentation is never changed.
 */

import type { Formatter, ScannedDocument } from "../types";
import { isAtxHeading, isThematicBreak, parseListItem, splitQuote, type ListItem } from "../utils/markdown-utils";
import { indentWidth, isBlank, leadingWhitespace } from "../utils/text-utils";
import { mapEditableLines } from "./shared";

const TYPOGRAPHIC_BULLET = /^([ \t]*)[•◦▪▫‣⁃●○■∙][ \t]+(?=\S)/;
const CHECKBOX_GLYPH = /^([ \t]*)(?:([-*+]|\d{1,9}[.)])[ \t]+)?([☐☑☒])[ \t]*(?=\S)/;
/** Task box glued to its text (`[ ]Task`). Links such as `[x](url)` never match because `(` is not a letter. */
const UNSPACED_TASK = /^\[( |x|X)\](?=[\p{L}\p{N}])/u;
/** Gaps of 5+ spaces start indented code inside the item, so they are left alone. */
const MAX_COLLAPSIBLE_GAP = 4;

export const listFormatter: Formatter = {
	id: "lists",
	format(doc, ctx) {
		const lines = mapEditableLines(doc, (text, index) => {
			const { quote, content } = splitQuote(text);
			const repaired = repairListLine(content);
			return quote + (ctx.mode === "normalize" ? normalizeListLine(repaired, doc, index) : repaired);
		});
		return ctx.mode === "normalize" ? renumberOrderedLists(lines, doc) : lines;
	},
};

function repairListLine(content: string): string {
	const glyph = CHECKBOX_GLYPH.exec(content);
	if (glyph) {
		const [whole, indent = "", marker = "-", box = ""] = glyph;
		return `${indent}${marker} ${box === "☐" ? "[ ]" : "[x]"} ${content.slice(whole.length)}`;
	}
	const bullet = TYPOGRAPHIC_BULLET.exec(content);
	if (bullet) return `${bullet[1] ?? ""}- ${content.slice(bullet[0].length)}`;

	const item = parseListItem(content);
	if (!item || item.gap === "") return content;
	const task = UNSPACED_TASK.exec(item.body);
	if (!task) return content;
	return `${item.indent}${item.marker}${item.gap}${task[0]} ${item.body.slice(task[0].length)}`;
}

function normalizeListLine(content: string, doc: ScannedDocument, index: number): string {
	const item = parseListItem(content);
	// An empty `*` or `+` directly under a paragraph would become a setext underline as `-`.
	if (!item || item.body === "") return content;
	const marker = item.ordered ? item.marker : "-";
	const body = item.body.replace(/^\[X\](?=\s|$)/, "[x]");
	return `${item.indent}${marker}${collapsedGap(item, doc, index)}${body}`;
}

/**
 * Shrinking the gap after a marker moves the item's content column. That is
 * only safe when no continuation line of the item is indented far enough to be
 * (or to become) an indented code block relative to the new column.
 */
function collapsedGap(item: ListItem, doc: ScannedDocument, index: number): string {
	if (item.gap === " " || item.gap.includes("\t") || item.gap.length > MAX_COLLAPSIBLE_GAP) return item.gap;
	const itemIndent = indentWidth(item.indent);
	const codeColumn = itemIndent + item.marker.length + 1 + MAX_COLLAPSIBLE_GAP;
	for (let next = index + 1; next < doc.lines.length; next++) {
		const text = doc.lines[next]?.text ?? "";
		if (isBlank(text)) continue;
		const width = indentWidth(leadingWhitespace(splitQuote(text).content));
		if (width <= itemIndent) break;
		if (width >= codeColumn) return item.gap;
	}
	return " ";
}

// ---------------------------------------------------------------------------
// Ordered list renumbering
// ---------------------------------------------------------------------------

interface OrderedEntry {
	readonly line: number;
	readonly item: ListItem;
	readonly quote: string;
}

interface OpenList {
	readonly indent: number;
	readonly depth: number;
	readonly ordered: boolean;
	readonly delimiter: string;
	readonly entries: OrderedEntry[];
	/** Last line attributed to this list. */
	end: number;
}

function renumberOrderedLists(lines: string[], doc: ScannedDocument): string[] {
	const result = [...lines];
	for (const list of collectLists(lines, doc)) {
		if (list.ordered) applyRenumbering(result, list);
	}
	return result;
}

/** Groups list items into lists, following CommonMark container rules closely enough to be safe. */
function collectLists(lines: readonly string[], doc: ScannedDocument): OpenList[] {
	const finished: OpenList[] = [];
	const stack: OpenList[] = [];
	const close = (predicate: (list: OpenList) => boolean): void => {
		let top = stack[stack.length - 1];
		while (top !== undefined && predicate(top)) {
			stack.pop();
			finished.push(top);
			top = stack[stack.length - 1];
		}
	};
	let previousWasParagraph = false;

	lines.forEach((text, index) => {
		if (isBlank(text)) {
			previousWasParagraph = false;
			return;
		}
		const { quote, depth, content } = splitQuote(text);
		const indent = indentWidth(leadingWhitespace(content));
		close((list) => list.depth !== depth);

		const isMarkdown = doc.lines[index]?.kind === "markdown";
		const item = isMarkdown ? parseListItem(content) : null;
		if (item) {
			close((list) => list.indent > indent);
			const top = stack[stack.length - 1];
			const continues = top?.indent === indent && top.ordered === item.ordered && top.delimiter === item.delimiter;
			if (top?.indent === indent && !continues) close((list) => list.indent >= indent);
			const list = continues ? top : pushList(stack, indent, depth, item);
			list.entries.push({ line: index, item, quote });
			stack.forEach((open) => (open.end = index));
			previousWasParagraph = true;
			return;
		}

		const isLazyContinuation = isMarkdown && previousWasParagraph && indent === 0 && !startsNewBlock(content);
		if (!isLazyContinuation) close((list) => list.indent >= indent);
		stack.forEach((open) => (open.end = index));
		previousWasParagraph = isMarkdown && !startsNewBlock(content);
	});
	close(() => true);
	return finished;
}

function pushList(stack: OpenList[], indent: number, depth: number, item: ListItem): OpenList {
	const list: OpenList = { indent, depth, ordered: item.ordered, delimiter: item.delimiter, entries: [], end: 0 };
	stack.push(list);
	return list;
}

function startsNewBlock(content: string): boolean {
	return isAtxHeading(content) || isThematicBreak(content) || /^\s*(?:>|```|~~~|\||\$\$)/.test(content);
}

function applyRenumbering(lines: string[], list: OpenList): void {
	const first = list.entries[0]?.item.number ?? 1;
	const numbers = list.entries.map((entry) => entry.item.number);
	const allSame = numbers.every((value) => value === first);
	const sequential = numbers.every((value, index) => value === first + index);
	if (allSame || sequential) return;
	if (!isRenumberingSafe(lines, list, first)) return;

	list.entries.forEach((entry, index) => {
		const { item, quote } = entry;
		lines[entry.line] = `${quote}${item.indent}${first + index}${item.delimiter}${item.gap}${item.body}`;
	});
}

/**
 * Changing a marker's width (e.g. `9.` -> `10.`) moves the item's content column.
 * If any continuation line of such an item is indented, renumbering could detach
 * it from the item, so the list is left untouched.
 */
function isRenumberingSafe(lines: readonly string[], list: OpenList, first: number): boolean {
	return list.entries.every((entry, index) => {
		const widthChanges = String(first + index).length !== String(entry.item.number).length;
		if (!widthChanges) return true;
		const nextLine = list.entries[index + 1]?.line ?? list.end + 1;
		for (let line = entry.line + 1; line < nextLine; line++) {
			const text = lines[line] ?? "";
			if (!isBlank(text) && indentWidth(leadingWhitespace(splitQuote(text).content)) > list.indent) return false;
		}
		return true;
	});
}
