import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectTables, isSeparatorBody, repairEscapedRow, splitCells, tableFormatter } from "../../src/formatters/table-formatter";
import { scanMarkdown } from "../../src/core/markdown-scanner";
import { md, normalize, PRESERVE_ALL, repair, runFormatter } from "../helpers";

const fixture = (name: string): string => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("TableFormatter – regression: escaped leading pipes", () => {
	const input = fixture("regression-escaped-table.input.md");
	const expected = fixture("regression-escaped-table.expected.md");

	it("repairs the original Formiqo problem on paste", () => {
		expect(repair(input)).toBe(expected);
	});

	it("produces the same table when formatting a document", () => {
		expect(normalize(input)).toBe(expected);
	});

	it("is idempotent", () => {
		expect(repair(expected)).toBe(expected);
		expect(normalize(expected)).toBe(expected);
	});

	it("does not touch escaped pipes in prose", () => {
		const prose = "Use a\\|b to write a literal pipe.\nAnother \\| line.";
		expect(repair(prose)).toBe(prose);
		expect(normalize(prose)).toBe(`${prose}\n`);
	});

	it("does not touch a lone escaped row without table structure", () => {
		const lone = "\\| only one row |";
		expect(repair(lone)).toBe(lone);
	});

	it("does not touch escaped tables inside fenced code", () => {
		const code = md("```md", "\\| a | b |", "\\| --- | --- |", "\\| 1 | 2 |", "```");
		expect(repair(code)).toBe(code);
		expect(normalize(code)).toBe(`${code}\n`);
	});
});

describe("TableFormatter – repair mode", () => {
	it("leaves valid tables unchanged", () => {
		const table = md("| Name | Role |", "| --- | :---: |", "| Ada | Engineer |");
		expect(repair(table)).toBe(table);
	});

	it("leaves valid tables without outer pipes unchanged", () => {
		const table = md("Name | Role", "--- | ---", "Ada | Engineer");
		expect(repair(table)).toBe(table);
	});

	it("unescapes fully escaped rows", () => {
		const input = md("\\| a \\| b \\|", "\\| --- \\| --- \\|", "\\| 1 \\| 2 \\|");
		expect(repair(input)).toBe(md("| a | b |", "| --- | --- |", "| 1 | 2 |"));
	});

	it("keeps escaped pipes inside inline code in escaped rows", () => {
		const input = md("\\| Command \\| Example \\|", "\\| --- \\| --- \\|", "\\| pipe \\| `a \\| b` \\|");
		expect(repair(input)).toBe(md("| Command | Example |", "| --- | --- |", "| pipe | `a \\| b` |"));
	});

	it("keeps literal escaped pipes inside cells of a normal table", () => {
		const table = md("| Expr | Meaning |", "| --- | --- |", "| a \\| b | logical or |");
		expect(repair(table)).toBe(table);
		expect(normalize(table)).toBe(`${table}\n`);
	});

	it("keeps literal escaped pipes in cells when only the leading pipe is escaped", () => {
		const input = md("\\| Expr | Meaning |", "\\| --- | --- |", "\\| a \\| b | logical or |");
		expect(repair(input)).toBe(md("| Expr | Meaning |", "| --- | --- |", "| a \\| b | logical or |"));
	});

	it("inserts a missing separator row", () => {
		const input = md("| Name | Role |", "| Ada | Engineer |", "| Linus | Maintainer |");
		expect(repair(input)).toBe(md("| Name | Role |", "| --- | --- |", "| Ada | Engineer |", "| Linus | Maintainer |"));
	});

	it("inserts a missing separator in an escaped table", () => {
		const input = md("\\| Name \\| Role \\|", "\\| Ada \\| Engineer \\|");
		expect(repair(input)).toBe(md("| Name | Role |", "| --- | --- |", "| Ada | Engineer |"));
	});

	it("does not infer single-column tables without a separator", () => {
		const input = md("| just text |", "| more text |");
		expect(repair(input)).toBe(input);
	});

	it("fixes a separator with the wrong column count, keeping alignment", () => {
		const input = md("| a | b | c |", "|:--|--:|", "| 1 | 2 | 3 |");
		expect(repair(input)).toBe(md("| a | b | c |", "| :--- | ---: | --- |", "| 1 | 2 | 3 |"));
	});

	it("pads rows that are missing cells", () => {
		const input = md("| a | b | c |", "| --- | --- | --- |", "| 1 |");
		expect(repair(input)).toBe(md("| a | b | c |", "| --- | --- | --- |", "| 1 | | |"));
	});

	it("never drops extra cells", () => {
		const input = md("| a | b |", "| --- | --- |", "| 1 | 2 | 3 |");
		expect(repair(input)).toBe(input);
		expect(normalize(input)).toBe(`${input}\n`);
	});

	it("handles empty cells", () => {
		const table = md("| | Dev |", "| --- | --- |", "| x | |");
		expect(repair(table)).toBe(table);
		expect(normalize(table)).toBe(`${table}\n`);
	});

	it("handles links and formatted text in cells", () => {
		const input = md(
			"\\| Site | Notes |",
			"\\| --- | --- |",
			"\\| [Docs](https://example.com/a?b=c) | **bold** and _em_ |",
			"\\| [[Wiki note|alias]] | ~~old~~ |",
		);
		expect(repair(input)).toBe(
			md(
				"| Site | Notes |",
				"| --- | --- |",
				"| [Docs](https://example.com/a?b=c) | **bold** and _em_ |",
				"| [[Wiki note|alias]] | ~~old~~ |",
			),
		);
	});

	it("preserves Unicode and multilingual content", () => {
		const input = md("\\| 言語 | Grüße | Emoji |", "\\| --- | --- | --- |", "\\| 日本語 | Ça va? | 🚀 ✅ |");
		expect(repair(input)).toBe(md("| 言語 | Grüße | Emoji |", "| --- | --- | --- |", "| 日本語 | Ça va? | 🚀 ✅ |"));
	});

	it("repairs non-breaking spaces around delimiters and in separators", () => {
		const nbsp = " ";
		const input = md(`|${nbsp}a${nbsp}|${nbsp}b${nbsp}|`, `|${nbsp}---${nbsp}|${nbsp}---${nbsp}|`, `|${nbsp}1${nbsp}|${nbsp}2${nbsp}|`);
		expect(repair(input)).toBe(md("| a | b |", "| --- | --- |", "| 1 | 2 |"));
	});

	it("keeps non-breaking spaces inside cell text", () => {
		const table = md("| Distance |", "| --- |", "| 10 km |");
		expect(repair(table)).toBe(table);
	});

	it("repairs multiple tables in one document", () => {
		const input = md("\\| a | b |", "\\| --- | --- |", "\\| 1 | 2 |", "", "Text", "", "\\| c | d |", "\\| --- | --- |", "\\| 3 | 4 |");
		expect(repair(input)).toBe(md("| a | b |", "| --- | --- |", "| 1 | 2 |", "", "Text", "", "| c | d |", "| --- | --- |", "| 3 | 4 |"));
	});

	it("handles tables adjacent to headings and lists", () => {
		const input = md("## Environments", "\\| a | b |", "\\| --- | --- |", "\\| 1 | 2 |", "- next item");
		expect(repair(input)).toBe(md("## Environments", "| a | b |", "| --- | --- |", "| 1 | 2 |", "", "- next item"));
	});

	it("separates a table from adjacent paragraph text", () => {
		const input = md("Here is a table:", "| a | b |", "| --- | --- |", "| 1 | 2 |", "Next paragraph");
		expect(repair(input)).toBe(md("Here is a table:", "", "| a | b |", "| --- | --- |", "| 1 | 2 |", "", "Next paragraph"));
	});

	it("repairs tables inside blockquotes and callouts", () => {
		const input = md("> [!info] Servers", "> \\| a | b |", "> \\| --- | --- |", "> \\| 1 | 2 |");
		expect(repair(input)).toBe(md("> [!info] Servers", "> | a | b |", "> | --- | --- |", "> | 1 | 2 |"));
	});
});

describe("TableFormatter – normalize mode", () => {
	it("rewrites rows canonically", () => {
		const input = md("|a|b|", "|-|:-:|", "|1|2|");
		expect(normalize(input)).toBe(`${md("| a | b |", "| --- | :---: |", "| 1 | 2 |")}\n`);
	});

	it("adds outer pipes to tables without them", () => {
		const input = md("Name | Role", "--- | ---", "Ada | Engineer");
		expect(normalize(input)).toBe(`${md("| Name | Role |", "| --- | --- |", "| Ada | Engineer |")}\n`);
	});

	it("is idempotent", () => {
		const once = normalize(md("|a|b|", "|-|-|", "|1|2|", "| `x|y` | z |"));
		expect(normalize(once)).toBe(once);
	});
});

describe("TableFormatter – helpers", () => {
	it("splits cells while keeping code spans atomic", () => {
		expect(splitCells("| a | `b | c` | d |")).toEqual(["a", "`b | c`", "d"]);
		expect(splitCells("a | b")).toEqual(["a", "b"]);
		expect(splitCells("| | x |")).toEqual(["", "x"]);
	});

	it("recognises separator rows", () => {
		expect(isSeparatorBody("| --- | :---: | ---: |")).toBe(true);
		expect(isSeparatorBody("\\| --- \\| --- \\|")).toBe(true);
		expect(isSeparatorBody("---")).toBe(false);
		expect(isSeparatorBody("| a | b |")).toBe(false);
	});

	it("repairs escaped rows minimally", () => {
		const framed = { leading: true, trailing: true };
		expect(repairEscapedRow("\\| | Dev |", framed)).toBe("| | Dev |");
		expect(repairEscapedRow("\\| a \\| b \\|", framed)).toBe("| a | b |");
		expect(repairEscapedRow("| a \\| b |", framed)).toBe("| a \\| b |");
		expect(repairEscapedRow("\\|x\\| | y", { leading: false, trailing: false })).toBe("\\|x\\| | y");
	});

	it("detects tables only on editable lines", () => {
		const lines = ["```", "| a | b |", "| - | - |", "```"];
		const doc = scanMarkdown(lines, { preservation: PRESERVE_ALL, allowFrontmatter: true });
		expect(detectTables(doc)).toEqual([]);
	});

	it("only edits code-block tables when code preservation is off", () => {
		const input = md("```", "\\| a | b |", "\\| --- | --- |", "```");
		expect(runFormatter(tableFormatter, input, "repair")).toBe(input);
		expect(runFormatter(tableFormatter, input, "repair", { ...PRESERVE_ALL, codeBlocks: false })).toBe(
			md("```", "| a | b |", "| --- | --- |", "```"),
		);
	});
});
