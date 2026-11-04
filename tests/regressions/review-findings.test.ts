/**
 * Regression tests for issues found in an independent correctness review.
 * Each test pins the exact input that used to be mangled.
 */
import { describe, expect, it } from "vitest";
import { resolvePaste } from "../../src/editor/paste-handler";
import { createDefaultSettings } from "../../src/settings/settings-defaults";
import { md, normalize, repair } from "../helpers";

const NBSP4 = " ".repeat(4);

describe("tables", () => {
	it("does not swallow a list item that follows a table", () => {
		const input = md("| a | b | c |", "|---|---|---|", "| 1 | 2 | 3 |", "- yes | no");
		expect(repair(input)).toBe(md("| a | b | c |", "|---|---|---|", "| 1 | 2 | 3 |", "", "- yes | no"));
	});

	it("does not use a prose line as the header of an inferred table", () => {
		const input = md("Compare a | b here", "| x | y |", "| z | w |");
		expect(repair(input)).toBe(md("Compare a | b here", "", "| x | y |", "| --- | --- |", "| z | w |"));
		const wiki = md("See [[Note|alias]]:", "| x | y |", "| z | w |");
		expect(normalize(wiki)).toContain("See [[Note|alias]]:\n");
	});

	it("does not infer tables from prose using pipes, e.g. absolute values", () => {
		const input = md("|a| = |b|", "|c| = |d|");
		expect(repair(input)).toBe(input);
	});

	it("treats wikilink aliases as part of a cell", () => {
		const input = md("| [[Note|alias]] | b |", "|---|---|", "| 1 | 2 |");
		expect(repair(input)).toBe(input);
		expect(normalize(input)).toBe(`${md("| [[Note|alias]] | b |", "| --- | --- |", "| 1 | 2 |")}\n`);
	});

	it("keeps a leading literal \\| in tables without outer pipes", () => {
		const input = md("a | b", "--|--", "\\|x\\| | y");
		expect(repair(input)).toBe(input);
	});
});

describe("paste", () => {
	const input = (text: string) => ({ text, hasFiles: false, multipleSelections: false, insertsMidLine: true, isInsideProtectedBlock: () => false });

	it("does not apply line-start repairs to multi-line text pasted mid-line", () => {
		expect(resolvePaste(input(md("| a | b |", "| c | d |")), createDefaultSettings())).toBeNull();
		expect(resolvePaste(input(md("☐ buy milk", "☐ eggs")), createDefaultSettings())).toBeNull();
	});

	it("still formats mid-line pastes that start on a new line", () => {
		expect(resolvePaste(input("\n☐ buy milk"), createDefaultSettings())).toBe("\n- [ ] buy milk");
	});
});

describe("structure preservation", () => {
	it("never creates frontmatter by normalizing a rule to ---", () => {
		const input = md("---", "Some text", "", "***", "", "More");
		expect(normalize(input)).toBe(`${input}\n`);
	});

	it("keeps headings inside list items indented", () => {
		const input = md("- item", "  ## Sub heading", "  more text");
		expect(normalize(input)).toBe(`${input}\n`);
	});

	it("does not turn NBSP-indented list items into indented code", () => {
		expect(repair(md("Intro", "", `${NBSP4}- item`))).toBe(md("Intro", "", `${NBSP4}- item`));
		expect(repair(md("- parent", `${NBSP4}- child`))).toBe(md("- parent", "    - child"));
	});

	it("does not turn custom-status task boxes into links", () => {
		const input = "- [/] (https://github.com/o/r/pull/1) review";
		expect(repair(input)).toBe(input);
	});

	it("closes an unclosed fence inside a quote within the quote", () => {
		expect(repair(md("> ```js", "> code", "Normal paragraph"))).toBe(md("> ```js", "> code", "> ```", "Normal paragraph"));
	});

	it("does not treat an indented ``` in a paragraph as a fence", () => {
		const input = md("Some text", "    ```", "more");
		expect(repair(input)).toBe(input);
	});

	it("does not turn a lone * under a paragraph into a setext underline", () => {
		const input = md("Footnote text", "*");
		expect(normalize(input)).toBe(`${input}\n`);
	});

	it("leaves indented code inside list items alone", () => {
		const blanks = md("- item", "", "      a", "", "", "      b");
		expect(normalize(blanks)).toBe(`${blanks}\n`);
		const gap = md("-   item", "", "        code");
		expect(normalize(gap)).toBe(`${gap}\n`);
	});
});
