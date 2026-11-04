/**
 * TableFormatter
 *
 * A block is only treated as a table when its structure is demonstrable:
 *   - a header row followed by a delimiter (separator) row, or
 *   - two or more rows framed by pipes on both sides (missing separator).
 * Escaped pipes (`\|`) are converted to delimiters only inside such blocks;
 * pipes in code spans, prose and code blocks are never touched.
 *
 * repair:    unescape delimiter pipes, insert a missing separator row, fix a
 *            separator whose column count does not match the header, pad rows
 *            that are missing cells, normalise unusual spaces around pipes and
 *            separate the table from adjacent paragraphs. Edits are minimal.
 * normalize: additionally rewrites every row canonically as `| a | b |`.
 */

import type { FormatContext, Formatter, ScannedDocument, ScannedLine } from "../types";
import { findCodeSpans, findWikilinks, isInRanges, mergeRanges, type Range } from "../utils/inline-spans";
import { isAtxHeading, parseListItem, splitQuote } from "../utils/markdown-utils";
import { isEscaped, isSpaceLike, replaceUnusualSpaces, trimSpaces } from "../utils/text-utils";
import { isContentLine, isEditable } from "./shared";

type Alignment = "none" | "left" | "center" | "right";

interface TableBlock {
	readonly start: number;
	readonly end: number;
	/** Index of the separator row, or null when it is missing. */
	readonly separator: number | null;
}

interface RowParts {
	readonly prefix: string;
	readonly body: string;
}

const ROW_PREFIX = /^\s*(?:>\s*)*/;
const SEPARATOR_CELL = /^:?-+:?$/;
/** A table needs at least this many cells per row to be inferred without a separator. */
const MIN_INFERRED_COLUMNS = 2;

export const tableFormatter: Formatter = {
	id: "tables",
	format(doc, ctx) {
		const replacements = new Map<number, string>();
		const before = new Map<number, string>();
		const after = new Map<number, string[]>();

		for (const table of detectTables(doc)) {
			formatTable(doc, table, ctx, replacements, after);
			addParagraphSeparation(doc, table, before, after);
		}

		const out: string[] = [];
		doc.lines.forEach((line, index) => {
			const blank = before.get(index);
			if (blank !== undefined) out.push(blank);
			out.push(replacements.get(index) ?? line.text);
			out.push(...(after.get(index) ?? []));
		});
		return out;
	},
};

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export function detectTables(doc: ScannedDocument): TableBlock[] {
	const tables: TableBlock[] = [];
	const lines = doc.lines;
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (!isRowCandidate(line)) {
			i++;
			continue;
		}
		const depth = quoteDepth(line);
		const sameContainer = (index: number): boolean => quoteDepth(lines[index]) === depth;

		const next = lines[i + 1];
		if (next !== undefined && isEditable(next) && sameContainer(i + 1) && isSeparatorBody(rowParts(next.text).body)) {
			let end = i + 1;
			while (isRowCandidate(lines[end + 1]) && sameContainer(end + 1)) end++;
			tables.push({ start: i, end, separator: i + 1 });
			i = end + 1;
			continue;
		}

		let end = i;
		while (isPipeFramed(lines[end + 1]) && sameContainer(end + 1)) end++;
		if (end > i && isPipeFramed(line) && isInferableTable(lines.slice(i, end + 1))) {
			tables.push({ start: i, end, separator: null });
			i = end + 1;
			continue;
		}
		i++;
	}
	return tables;
}

function quoteDepth(line: ScannedLine | undefined): number {
	return line === undefined ? -1 : splitQuote(line.text).depth;
}

function rowParts(text: string): RowParts {
	const prefix = ROW_PREFIX.exec(text)?.[0] ?? "";
	return { prefix, body: text.slice(prefix.length) };
}

/** A line that could be a table row: has a delimiter pipe, or starts with an escaped one. */
function isRowCandidate(line: ScannedLine | undefined): line is ScannedLine {
	if (!isContentLine(line)) return false;
	const { body } = rowParts(line.text);
	// A heading or list item starts a new block, which also ends a table.
	const { content } = splitQuote(line.text);
	if (isAtxHeading(content) || parseListItem(content) !== null) return false;
	return startsWithEscapedPipe(body) || delimiterPositions(body).length > 0;
}

/** A row framed by pipes on both ends, e.g. `| a | b |` or `\| a \| b \|`. */
function isPipeFramed(line: ScannedLine | undefined): line is ScannedLine {
	if (!isRowCandidate(line)) return false;
	const body = trimSpaces(rowParts(line.text).body);
	return /^\\?\|/.test(body) && body.endsWith("|") && body.length > 1;
}

/**
 * Without a separator row, only rows that look unmistakably like a table are
 * accepted: framed, spaced around every pipe (`| a | b |`), at least two
 * columns, and the same column count in every row. This rules out prose such
 * as `|a| = |b|`.
 */
function isInferableTable(rows: readonly ScannedLine[]): boolean {
	const counts = rows.map((row) => {
		const body = rowParts(row.text).body;
		if (isSeparatorBody(body)) return -1;
		const repaired = trimSpaces(repairEscapedRow(body, FRAMED));
		return isSpacedRow(repaired) ? splitCells(repaired).length : -1;
	});
	const first = counts[0] ?? -1;
	return first >= MIN_INFERRED_COLUMNS && counts.every((count) => count === first);
}

function isSpacedRow(text: string): boolean {
	const positions = delimiterPositions(text);
	return positions.every((position, index) => {
		const before = position === 0 || isSpaceLike(text[position - 1]);
		const after = position === text.length - 1 || isSpaceLike(text[position + 1]);
		const isEmptyCell = text[position + 1] === "|" || text[position - 1] === "|";
		return isEmptyCell || (index === 0 ? after : index === positions.length - 1 ? before : before && after);
	});
}

/** GFM delimiter row; escaped pipes count as delimiters because a separator has no literal text. */
export function isSeparatorBody(body: string): boolean {
	const normalized = trimSpaces(replaceUnusualSpaces(body.replace(/\\\|/g, "|")));
	if (!normalized.includes("|")) return false;
	const cells = splitCells(normalized);
	return cells.length > 0 && cells.every((cell) => SEPARATOR_CELL.test(cell));
}

function startsWithEscapedPipe(body: string): boolean {
	return trimSpaces(body).startsWith("\\|");
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

/** Ranges whose pipes are never cell delimiters: code spans and `[[wikilink|alias]]`. */
function atomicRanges(text: string): Range[] {
	return mergeRanges([...findCodeSpans(text), ...findWikilinks(text)]);
}

/** Positions of unescaped pipes outside code spans and wikilinks. */
function delimiterPositions(text: string, atomic: readonly Range[] = atomicRanges(text)): number[] {
	const positions: number[] = [];
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "|" && !isEscaped(text, i) && !isInRanges(atomic, i)) positions.push(i);
	}
	return positions;
}

/** Splits a row body into trimmed cells, honouring optional leading/trailing pipes. */
export function splitCells(body: string): string[] {
	const text = trimSpaces(body);
	let positions = delimiterPositions(text);
	let start = 0;
	let end = text.length;
	if (positions[0] === 0) {
		start = 1;
		positions = positions.slice(1);
	}
	const last = positions[positions.length - 1];
	if (last !== undefined && last === text.length - 1) {
		end = last;
		positions = positions.slice(0, -1);
	}
	const cells: string[] = [];
	let cellStart = start;
	for (const position of positions) {
		cells.push(trimSpaces(text.slice(cellStart, position)));
		cellStart = position + 1;
	}
	cells.push(trimSpaces(text.slice(cellStart, end)));
	return cells;
}

function parseAlignment(cell: string): Alignment {
	const left = cell.startsWith(":");
	const right = cell.endsWith(":") && cell.length > 1;
	if (left && right) return "center";
	if (left) return "left";
	if (right) return "right";
	return "none";
}

const ALIGNMENT_TOKENS: Record<Alignment, string> = {
	none: "---",
	left: ":---",
	center: ":---:",
	right: "---:",
};

function serializeRow(prefix: string, cells: readonly string[]): string {
	return `${normalizePrefix(prefix)}|${cells.map((cell) => (cell === "" ? " " : ` ${cell} `)).join("|")}|`;
}

function serializeSeparator(prefix: string, alignments: readonly Alignment[]): string {
	return `${normalizePrefix(prefix)}|${alignments.map((alignment) => ` ${ALIGNMENT_TOKENS[alignment]} `).join("|")}|`;
}

function normalizePrefix(prefix: string): string {
	return replaceUnusualSpaces(prefix);
}

function padCells(cells: readonly string[], columns: number): string[] {
	return cells.length >= columns ? [...cells] : [...cells, ...new Array<string>(columns - cells.length).fill("")];
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

/** Whether the table's separator row has outer pipes. */
export interface TableFrame {
	readonly leading: boolean;
	readonly trailing: boolean;
}

const FRAMED: TableFrame = { leading: true, trailing: true };

/**
 * Turns escaped delimiter pipes back into real ones.
 * - A leading `\|` is a delimiter when the table has outer pipes (it is then
 *   the row's frame, not cell text).
 * - If the row has no other unescaped delimiter, every `\|` outside code is a delimiter.
 * - Otherwise a trailing `\|` is a delimiter only when the separator has a trailing pipe.
 * Escaped pipes inside cells of a normally delimited row stay literal.
 */
export function repairEscapedRow(body: string, frame: TableFrame): string {
	const leadingSpace = body.length - body.trimStart().length;
	if (!frame.leading || !body.startsWith("\\|", leadingSpace)) return body;

	let text = body.slice(0, leadingSpace) + body.slice(leadingSpace + 1);
	const atomic = atomicRanges(text);
	if (delimiterPositions(text, atomic).length === 1) {
		return unescapePipesOutside(text, atomic);
	}
	const trimmedEnd = text.trimEnd();
	if (frame.trailing && trimmedEnd.endsWith("\\|") && !isEscaped(trimmedEnd, trimmedEnd.length - 2)) {
		text = trimmedEnd.slice(0, -2) + "|" + text.slice(trimmedEnd.length);
	}
	return text;
}

function unescapePipesOutside(text: string, atomic: readonly Range[]): string {
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const isEscapingPipe = text[i] === "\\" && text[i + 1] === "|" && !isEscaped(text, i) && !isInRanges(atomic, i);
		if (!isEscapingPipe) out += text.charAt(i);
	}
	return out;
}

/** Replaces unusual spaces that touch a delimiter pipe or the row edges. */
function normalizeDelimiterSpacing(body: string): string {
	// UTF-16 code units: only BMP space characters are replaced, so surrogate pairs survive.
	const chars = body.split("");
	const anchors = [-1, ...delimiterPositions(body), body.length];
	const toSpace = (char: string | undefined): string => (char === "\t" ? "\t" : " ");
	for (const anchor of anchors) {
		for (let i = anchor - 1; i >= 0 && isSpaceLike(chars[i]); i--) chars[i] = toSpace(chars[i]);
		for (let i = anchor + 1; i < chars.length && isSpaceLike(chars[i]); i++) chars[i] = toSpace(chars[i]);
	}
	return chars.join("");
}

function formatTable(
	doc: ScannedDocument,
	table: TableBlock,
	ctx: FormatContext,
	replacements: Map<number, string>,
	after: Map<number, string[]>,
): void {
	const rows: number[] = [];
	for (let index = table.start; index <= table.end; index++) if (index !== table.separator) rows.push(index);

	const separatorText = table.separator === null ? "" : (doc.lines[table.separator]?.text ?? "");
	const separatorParts = rowParts(separatorText);
	const separatorBody = trimSpaces(replaceUnusualSpaces(separatorParts.body.replace(/\\\|/g, "|")));
	const separatorCells = table.separator === null ? [] : splitCells(separatorBody);
	const frame: TableFrame =
		table.separator === null ? FRAMED : { leading: separatorBody.startsWith("|"), trailing: separatorBody.endsWith("|") };

	const repaired = new Map<number, RowParts>();
	for (const index of rows) {
		const parts = rowParts(doc.lines[index]?.text ?? "");
		repaired.set(index, { prefix: parts.prefix, body: normalizeDelimiterSpacing(repairEscapedRow(parts.body, frame)) });
	}

	const header = repaired.get(table.start) ?? { prefix: "", body: "" };
	const headerCells = splitCells(header.body);
	const columns = Math.max(headerCells.length, separatorCells.length);

	for (const index of rows) {
		const parts = repaired.get(index);
		if (!parts) continue;
		const cells = splitCells(parts.body);
		const minimal = normalizePrefix(parts.prefix) + parts.body;
		const text = ctx.mode === "normalize" || cells.length < columns ? serializeRow(parts.prefix, padCells(cells, columns)) : minimal;
		if (text !== doc.lines[index]?.text) replacements.set(index, text);
	}

	const alignments = padCells(separatorCells, columns).map((cell) => (cell === "" ? "none" : parseAlignment(cell)));
	const canonicalSeparator = serializeSeparator(table.separator === null ? header.prefix : separatorParts.prefix, alignments);
	if (table.separator === null) {
		after.set(table.start, [canonicalSeparator]);
		return;
	}
	const minimalSeparator = normalizePrefix(separatorParts.prefix) + replaceUnusualSpaces(separatorParts.body.replace(/\\\|/g, "|"));
	const text = ctx.mode === "normalize" || separatorCells.length !== columns ? canonicalSeparator : minimalSeparator;
	if (text !== separatorText) replacements.set(table.separator, text);
}

/** Top-level tables get a blank line between them and adjacent paragraph text. */
function addParagraphSeparation(doc: ScannedDocument, table: TableBlock, before: Map<number, string>, after: Map<number, string[]>): void {
	if (rowParts(doc.lines[table.start]?.text ?? "").prefix !== "") return;
	const isParagraphText = (line: ScannedLine | undefined): line is ScannedLine => isContentLine(line) && line.kind === "markdown";
	const previous = doc.lines[table.start - 1];
	if (isParagraphText(previous) && !isAtxHeading(previous.text)) before.set(table.start, "");
	if (isParagraphText(doc.lines[table.end + 1])) after.set(table.end, [...(after.get(table.end) ?? []), ""]);
}
