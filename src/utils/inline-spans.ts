/**
 * Detection of inline constructs whose content must never be edited:
 * code spans, inline math, wikilinks/embeds and inline HTML tags.
 */

import type { PreservationOptions } from "../types";
import { isEscaped } from "./text-utils";

/** Half-open character range `[start, end)`. */
export type Range = readonly [start: number, end: number];

/** CommonMark code spans: a backtick run closed by a run of exactly the same length. */
export function findCodeSpans(text: string): Range[] {
	const ranges: Range[] = [];
	let i = 0;
	while (i < text.length) {
		const char = text[i];
		if (char === "\\") {
			i += 2;
			continue;
		}
		if (char !== "`") {
			i++;
			continue;
		}
		const openLength = backtickRunLength(text, i);
		const close = findBacktickRun(text, i + openLength, openLength);
		if (close === -1) {
			i += openLength;
			continue;
		}
		ranges.push([i, close + openLength]);
		i = close + openLength;
	}
	return ranges;
}

function backtickRunLength(text: string, start: number): number {
	let end = start;
	while (text[end] === "`") end++;
	return end - start;
}

function findBacktickRun(text: string, from: number, length: number): number {
	let i = from;
	while (i < text.length) {
		if (text[i] !== "`") {
			i++;
			continue;
		}
		const runLength = backtickRunLength(text, i);
		if (runLength === length) return i;
		i += runLength;
	}
	return -1;
}

/**
 * Obsidian-style inline math: `$...$` where the opening `$` is not followed by
 * whitespace and the closing `$` is not preceded by whitespace nor followed by a
 * digit (so prices like "$5 and $10" are not math). `$$...$$` on one line is
 * also recognised.
 */
export function findInlineMath(text: string, exclude: readonly Range[] = []): Range[] {
	const ranges: Range[] = [];
	let i = 0;
	while (i < text.length) {
		const skipTo = rangeEndContaining(exclude, i);
		if (skipTo !== -1) {
			i = skipTo;
			continue;
		}
		if (text[i] !== "$" || isEscaped(text, i)) {
			i++;
			continue;
		}
		const end = text[i + 1] === "$" ? findDisplayMathEnd(text, i + 2) : findInlineMathEnd(text, i + 1, exclude);
		if (end === -1) {
			i++;
			continue;
		}
		ranges.push([i, end]);
		i = end;
	}
	return ranges;
}

function findDisplayMathEnd(text: string, from: number): number {
	const close = text.indexOf("$$", from);
	return close === -1 ? -1 : close + 2;
}

function findInlineMathEnd(text: string, from: number, exclude: readonly Range[]): number {
	const first = text[from];
	if (first === undefined || /\s/.test(first)) return -1;
	for (let j = from; j < text.length; j++) {
		if (rangeEndContaining(exclude, j) !== -1) return -1;
		if (text[j] !== "$" || isEscaped(text, j)) continue;
		const before = text[j - 1] ?? "";
		const after = text[j + 1] ?? "";
		if (j > from && !/\s|\$/.test(before) && !/\d|\$/.test(after)) return j + 1;
	}
	return -1;
}

/** `[[wikilinks]]` and `![[embeds]]`. */
export function findWikilinks(text: string): Range[] {
	return matchRanges(text, /!?\[\[[^\]\n]*\]\]/g);
}

/** Inline HTML tags and autolinks such as `<span class="x">` or `<https://example.com>`. */
export function findInlineHtml(text: string): Range[] {
	return matchRanges(text, /<\/?[A-Za-z][^<>\n]*>/g);
}

function matchRanges(text: string, pattern: RegExp): Range[] {
	return Array.from(text.matchAll(pattern), (match) => [match.index, match.index + match[0].length] as const);
}

/** All inline ranges that formatters must leave untouched, sorted and merged. */
export function findProtectedInlineRanges(text: string, preservation: PreservationOptions): Range[] {
	const code = findCodeSpans(text);
	const ranges: Range[] = [...findWikilinks(text)];
	if (preservation.inlineCode) ranges.push(...code);
	if (preservation.math) ranges.push(...findInlineMath(text, code));
	if (preservation.html) ranges.push(...findInlineHtml(text).filter((range) => !overlapsAny(range, code)));
	return mergeRanges(ranges);
}

export function mergeRanges(ranges: readonly Range[]): Range[] {
	const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const [start, end] of sorted) {
		const last = merged[merged.length - 1];
		if (last && start <= last[1]) last[1] = Math.max(last[1], end);
		else merged.push([start, end]);
	}
	return merged;
}

/** Returns the end of the range containing `index`, or -1. */
export function rangeEndContaining(ranges: readonly Range[], index: number): number {
	for (const [start, end] of ranges) {
		if (index >= start && index < end) return end;
	}
	return -1;
}

export function isInRanges(ranges: readonly Range[], index: number): boolean {
	return rangeEndContaining(ranges, index) !== -1;
}

function overlapsAny(range: Range, others: readonly Range[]): boolean {
	return others.some(([start, end]) => range[0] < end && start < range[1]);
}

/** True if `[start, end)` overlaps any of the ranges. */
export function overlapsRanges(ranges: readonly Range[], start: number, end: number): boolean {
	return overlapsAny([start, end], ranges);
}
