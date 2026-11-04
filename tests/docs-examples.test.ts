/**
 * Every before/after example shown in README.md and docs/ is checked here,
 * so the documentation cannot drift from the real behaviour.
 */
import { describe, expect, it } from "vitest";
import { md, normalize, repair } from "./helpers";

describe("documented examples", () => {
	it("README / getting started: escaped table paste", () => {
		const input = md("\\| | Dev | Staging |", "\\| --- | --- | --- |", "\\| Directory | `/var/www/dev` | `/var/www/staging` |");
		expect(repair(input)).toBe(md("| | Dev | Staging |", "| --- | --- | --- |", "| Directory | `/var/www/dev` | `/var/www/staging` |"));
	});

	it("getting started: Format current document", () => {
		expect(normalize(md("##Setup", "* one", "+ two", "1. first", "3. second"))).toBe(`${md("## Setup", "", "- one", "- two", "1. first", "2. second")}\n`);
	});

	it("formatting rules: escaped pipes", () => {
		expect(repair(md("\\| Name | Role |", "\\| --- | --- |", "\\| Ada | Engineer |"))).toBe(md("| Name | Role |", "| --- | --- |", "| Ada | Engineer |"));
	});

	it("formatting rules: missing separator", () => {
		expect(repair(md("| Name | Role |", "| Ada | Engineer |"))).toBe(md("| Name | Role |", "| --- | --- |", "| Ada | Engineer |"));
	});

	it("formatting rules: canonical table rows in commands", () => {
		expect(normalize(md("|a|b|", "|-|:-:|", "|1|2|"))).toBe(`${md("| a | b |", "| --- | :---: |", "| 1 | 2 |")}\n`);
	});

	it("formatting rules: headings", () => {
		expect(repair("##Heading")).toBe("## Heading");
		expect(repair("#word")).toBe("#word");
		expect(normalize("##   Title")).toBe("## Title\n");
		expect(normalize("## Title ##")).toBe("## Title\n");
	});

	it("formatting rules: list and task repairs", () => {
		expect(repair(md("• item", "◦ item", "▪ item", "● item"))).toBe(md("- item", "- item", "- item", "- item"));
		expect(repair(md("☐ task", "☑ done", "☒ done", "- [ ]Task"))).toBe(md("- [ ] task", "- [x] done", "- [x] done", "- [ ] Task"));
		expect(repair("- [] is an empty array")).toBe("- [] is an empty array");
	});

	it("formatting rules: list style in commands", () => {
		expect(normalize(md("1. a", "3. b", "7. c"))).toBe(`${md("1. a", "2. b", "3. c")}\n`);
		expect(normalize(md("1. a", "1. b", "1. c"))).toBe(`${md("1. a", "1. b", "1. c")}\n`);
		expect(normalize(md("-   item", "* [X] done", "- [-] cancelled", "- [?] question"))).toBe(`${md("- item", "- [x] done", "- [-] cancelled", "- [?] question")}\n`);
	});

	it("formatting rules: blockquotes and horizontal rules", () => {
		expect(normalize(md(">text", ">>nested"))).toBe(`${md("> text", "> > nested")}\n`);
		expect(normalize(md("Intro", "", "***", "", "* * *", "", "___"))).toBe(`${md("Intro", "", "---", "", "---", "", "---")}\n`);
		expect(normalize(md("Text", "***"))).toBe(`${md("Text", "", "---")}\n`);
	});

	it("formatting rules: links", () => {
		expect(repair("[the docs] (https://example.com)")).toBe("[the docs](https://example.com)");
		expect(repair("- [/] (https://example.com) review")).toBe("- [/] (https://example.com) review");
		expect(normalize("[a]( https://x.y )")).toBe("[a](https://x.y)\n");
	});

	it("formatting rules: code fences", () => {
		expect(repair(md("```js", "const a = 1;"))).toBe(md("```js", "const a = 1;", "```"));
		expect(normalize(md("```   js", "x", "```"))).toBe(`${md("```js", "x", "```")}\n`);
	});

	it("formatting rules: whitespace", () => {
		expect(normalize("line with a break   \nnext")).toBe("line with a break  \nnext\n");
		expect(normalize(md("a", "", "", "", "b"))).toBe(`${md("a", "", "b")}\n`);
		expect(repair("- item")).toBe("- item");
	});

	it("paste: prose escapes are not tables", () => {
		expect(repair("use a\\|b here")).toBe("use a\\|b here");
	});
});
