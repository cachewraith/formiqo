/**
 * Line-aware Markdown scanner.
 *
 * Classifies every line so that formatters know which lines are ordinary
 * Markdown and which belong to constructs whose content must be preserved
 * verbatim (frontmatter, fenced/indented code, math, HTML, Obsidian comments).
 * The scanner never rewrites anything, so syntax it does not understand
 * simply stays "markdown" and is handled conservatively by the formatters.
 */

import type { LineKind, PreservationOptions, ScannedBlock, ScannedDocument, ScannedLine } from "../types";
import { isAtxHeading, isThematicBreak, parseListItem, splitQuote, stripContainerPrefix } from "../utils/markdown-utils";
import { indentWidth, isBlank, leadingWhitespace } from "../utils/text-utils";

export interface ScanOptions {
	readonly preservation: PreservationOptions;
	readonly allowFrontmatter: boolean;
}

/** Minimum indentation (columns) of an indented code block. */
const INDENTED_CODE_WIDTH = 4;

/** HTML block start conditions 6 (CommonMark): block-level tag names. */
const HTML_BLOCK_TAGS = new Set([
	"address", "article", "aside", "base", "basefont", "blockquote", "body", "caption", "center", "col",
	"colgroup", "dd", "details", "dialog", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure",
	"footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr",
	"html", "iframe", "legend", "li", "link", "main", "menu", "menuitem", "nav", "noframes", "ol",
	"optgroup", "option", "p", "param", "search", "section", "summary", "table", "tbody", "td", "tfoot",
	"th", "thead", "title", "tr", "track", "ul",
]);

/** HTML block start condition 1: raw-text elements that end at their closing tag. */
const RAW_HTML_TAGS = ["pre", "script", "style", "textarea"];

interface ScanState {
	inList: boolean;
	/** Content column of the most recent list item; code inside the item starts 4 columns further. */
	listContentColumn: number;
	/** True while the previous line is paragraph (or table) text that a new block cannot interrupt. */
	paragraphOpen: boolean;
}

interface BlockMatch {
	readonly kind: Exclude<LineKind, "markdown">;
	/** Inclusive index of the last line of the block. */
	readonly end: number;
	/** Kind of the first/last line when it differs from the body (fences). */
	readonly delimiterKind?: LineKind;
	/** True when a closing delimiter was found. */
	readonly closed: boolean;
}

export function scanMarkdown(lines: readonly string[], options: ScanOptions): ScannedDocument {
	const kinds: LineKind[] = new Array<LineKind>(lines.length).fill("markdown");
	const blocks: ScannedBlock[] = [];
	const state: ScanState = { inList: false, listContentColumn: 0, paragraphOpen: false };

	let i = 0;
	if (options.allowFrontmatter) {
		const end = matchFrontmatter(lines);
		if (end !== -1) {
			kinds.fill("frontmatter", 0, end + 1);
			blocks.push({ kind: "frontmatter", start: 0, end });
			i = end + 1;
		}
	}

	while (i < lines.length) {
		const line = lines[i] ?? "";
		if (isBlank(line)) {
			state.paragraphOpen = false;
			i++;
			continue;
		}

		const block = matchBlock(lines, i, state);
		if (block) {
			kinds.fill(block.kind, i, block.end + 1);
			if (block.delimiterKind) {
				kinds[i] = block.delimiterKind;
				if (block.closed) kinds[block.end] = block.delimiterKind;
			}
			blocks.push({ kind: block.kind, start: i, end: block.end });
			state.paragraphOpen = false;
			i = block.end + 1;
			continue;
		}

		updateLineState(state, line);
		i++;
	}

	const scanned: ScannedLine[] = lines.map((text, index) => {
		const kind = kinds[index] ?? "markdown";
		return { text, kind, protected: isProtected(kind, options.preservation) };
	});
	return { lines: scanned, blocks };
}

function isProtected(kind: LineKind, preservation: PreservationOptions): boolean {
	switch (kind) {
		case "markdown":
			return false;
		case "frontmatter":
			return preservation.frontmatter;
		case "fence":
		case "code":
			return preservation.codeBlocks;
		case "math":
			return preservation.math;
		case "html":
			return preservation.html;
		case "comment":
			// Obsidian comments are user metadata and are always preserved.
			return true;
	}
}

/** Returns the index of the closing `---`/`...` line, or -1. */
function matchFrontmatter(lines: readonly string[]): number {
	if (lines[0]?.trimEnd() !== "---") return -1;
	for (let i = 1; i < lines.length; i++) {
		const trimmed = lines[i]?.trimEnd();
		if (trimmed === "---" || trimmed === "...") return i;
	}
	return -1;
}

function matchBlock(lines: readonly string[], start: number, state: ScanState): BlockMatch | null {
	const line = lines[start] ?? "";
	// Indented code cannot interrupt a paragraph; inside a list it starts 4 columns past the item's content.
	const codeColumn = state.inList ? state.listContentColumn + INDENTED_CODE_WIDTH : INDENTED_CODE_WIDTH;
	if (!state.paragraphOpen && isIndentedCodeLine(line, codeColumn)) {
		return { kind: "code", end: findIndentedCodeEnd(lines, start, codeColumn), closed: false };
	}
	const { rest } = stripContainerPrefix(line);
	// Outside lists, a fence indented by 4+ columns is paragraph continuation or indented code.
	const contentIndent = indentWidth(leadingWhitespace(splitQuote(line).content));
	const fence = state.inList || contentIndent < INDENTED_CODE_WIDTH ? matchFence(lines, start, rest) : null;
	return fence ?? matchMath(lines, start, rest) ?? matchComment(lines, start, rest) ?? matchHtml(lines, start, line, state.paragraphOpen);
}

function isIndentedCodeLine(line: string, column: number): boolean {
	return splitQuote(line).depth === 0 && indentWidth(leadingWhitespace(line)) >= column;
}

function findIndentedCodeEnd(lines: readonly string[], start: number, column: number): number {
	let end = start;
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (isBlank(line)) continue;
		if (!isIndentedCodeLine(line, column)) break;
		end = i;
	}
	return end;
}

/** Opening fence: 3+ backticks (info string without backticks) or 3+ tildes. */
export function parseFenceOpener(rest: string): { char: string; length: number } | null {
	const match = /^(`{3,}|~{3,})(.*)$/.exec(rest);
	if (!match) return null;
	const [, marker = "", info = ""] = match;
	if (marker.startsWith("`") && info.includes("`")) return null;
	return { char: marker.charAt(0), length: marker.length };
}

function isFenceCloser(line: string, char: string, length: number): boolean {
	const match = /^(`{3,}|~{3,})[ \t]*$/.exec(stripContainerPrefix(line).rest);
	const marker = match?.[1];
	return marker?.startsWith(char) === true && marker.length >= length;
}

function matchFence(lines: readonly string[], start: number, rest: string): BlockMatch | null {
	const opener = parseFenceOpener(rest);
	if (!opener) return null;
	const depth = splitQuote(lines[start] ?? "").depth;
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i] ?? "";
		// A fence inside a blockquote ends where the quote ends.
		if (depth > 0 && splitQuote(line).depth < depth) return { kind: "code", end: i - 1, delimiterKind: "fence", closed: false };
		if (isFenceCloser(line, opener.char, opener.length)) {
			return { kind: "code", end: i, delimiterKind: "fence", closed: true };
		}
	}
	return { kind: "code", end: lines.length - 1, delimiterKind: "fence", closed: false };
}

function matchDelimited(lines: readonly string[], start: number, rest: string, delimiter: string, kind: "math" | "comment"): BlockMatch | null {
	if (!rest.startsWith(delimiter)) return null;
	if (rest.includes(delimiter, delimiter.length)) return { kind, end: start, closed: true };
	for (let i = start + 1; i < lines.length; i++) {
		if ((lines[i] ?? "").includes(delimiter)) return { kind, end: i, closed: true };
	}
	return { kind, end: lines.length - 1, closed: false };
}

function matchMath(lines: readonly string[], start: number, rest: string): BlockMatch | null {
	return matchDelimited(lines, start, rest, "$$", "math");
}

function matchComment(lines: readonly string[], start: number, rest: string): BlockMatch | null {
	return matchDelimited(lines, start, rest, "%%", "comment");
}

function matchHtml(lines: readonly string[], start: number, line: string, paragraphOpen: boolean): BlockMatch | null {
	const content = /^ {0,3}(<.*)$/.exec(line)?.[1];
	if (content === undefined) return null;

	if (content.startsWith("<!--")) return untilLineContaining(lines, start, "-->");
	const rawTag = RAW_HTML_TAGS.find((tag) => new RegExp(`^<${tag}(?:[\\s>]|$)`, "i").test(content));
	if (rawTag) return untilLineContaining(lines, start, `</${rawTag}>`, true);

	const tagName = /^<\/?([A-Za-z][A-Za-z0-9-]*)(?:[\s/>]|$)/.exec(content)?.[1]?.toLowerCase();
	const isBlockTag = tagName !== undefined && HTML_BLOCK_TAGS.has(tagName);
	const isStandaloneTag = !paragraphOpen && /^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>[ \t]*$/.test(content);
	if (!isBlockTag && !isStandaloneTag) return null;
	return { kind: "html", end: findBlankLine(lines, start) - 1, closed: true };
}

function untilLineContaining(lines: readonly string[], start: number, terminator: string, ignoreCase = false): BlockMatch {
	const needle = ignoreCase ? terminator.toLowerCase() : terminator;
	for (let i = start; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if ((ignoreCase ? line.toLowerCase() : line).includes(needle)) return { kind: "html", end: i, closed: true };
	}
	return { kind: "html", end: lines.length - 1, closed: false };
}

function findBlankLine(lines: readonly string[], start: number): number {
	for (let i = start + 1; i < lines.length; i++) {
		if (isBlank(lines[i] ?? "")) return i;
	}
	return lines.length;
}

/**
 * Tracks the context needed to classify the next line:
 * - inside a list, indented lines after a blank line are continuation, not code;
 * - after paragraph text, an indented line is a continuation, not code.
 */
function updateLineState(state: ScanState, line: string): void {
	const { content } = splitQuote(line);
	const isHeading = isAtxHeading(content);
	state.paragraphOpen = !isHeading && !isThematicBreak(content);
	const item = parseListItem(content);
	if (item) {
		state.inList = true;
		const gap = indentWidth(item.gap);
		state.listContentColumn = indentWidth(item.indent) + item.marker.length + (gap >= 1 && gap <= INDENTED_CODE_WIDTH ? gap : 1);
		return;
	}
	const indented = indentWidth(leadingWhitespace(content)) > 0;
	if (!indented || isHeading) state.inList = false;
}
