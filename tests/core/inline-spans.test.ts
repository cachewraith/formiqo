import { describe, expect, it } from "vitest";
import { findCodeSpans, findInlineMath, findProtectedInlineRanges, findWikilinks, mergeRanges } from "../../src/utils/inline-spans";
import { PRESERVE_ALL } from "../helpers";

const slices = (text: string, ranges: readonly (readonly [number, number])[]): string[] => ranges.map(([s, e]) => text.slice(s, e));

describe("inline spans", () => {
	it("finds code spans with matching backtick runs", () => {
		const text = "a `b` c ``d ` e`` f `unclosed";
		expect(slices(text, findCodeSpans(text))).toEqual(["`b`", "``d ` e``"]);
	});

	it("ignores escaped backticks", () => {
		const text = "\\`not code\\` but `code`";
		expect(slices(text, findCodeSpans(text))).toEqual(["`code`"]);
	});

	it("finds inline math using Obsidian rules", () => {
		const text = "$x|y$ costs $5 and $10, $$a|b$$";
		expect(slices(text, findInlineMath(text))).toEqual(["$x|y$", "$$a|b$$"]);
	});

	it("does not find math inside code spans", () => {
		const text = "`$a$` $b$";
		expect(slices(text, findInlineMath(text, findCodeSpans(text)))).toEqual(["$b$"]);
	});

	it("finds wikilinks and embeds", () => {
		const text = "[[Note|alias]] and ![[img.png|300]]";
		expect(slices(text, findWikilinks(text))).toEqual(["[[Note|alias]]", "![[img.png|300]]"]);
	});

	it("respects preservation options", () => {
		const text = "`code` $m$";
		expect(findProtectedInlineRanges(text, PRESERVE_ALL)).toHaveLength(2);
		expect(findProtectedInlineRanges(text, { ...PRESERVE_ALL, inlineCode: false, math: false })).toHaveLength(0);
	});

	it("merges overlapping ranges", () => {
		expect(mergeRanges([[5, 8], [0, 3], [2, 4]])).toEqual([[0, 4], [5, 8]]);
	});
});
