import { describe, expect, it } from "vitest";
import { listFormatter } from "../../src/formatters/list-formatter";
import { md, normalize, repair, runFormatter } from "../helpers";

describe("ListFormatter – repair", () => {
	it("converts typographic bullets copied from rendered pages", () => {
		expect(repair(md("• First", "• Second", "  ◦ Nested"))).toBe(md("- First", "- Second", "  - Nested"));
	});

	it("converts checkbox glyphs to task syntax", () => {
		expect(repair(md("☐ Open task", "☑ Done task", "- ☒ Also done"))).toBe(md("- [ ] Open task", "- [x] Done task", "- [x] Also done"));
	});

	it("adds the missing space after a task box", () => {
		expect(repair("- [ ]Write tests")).toBe("- [ ] Write tests");
	});

	it("leaves ambiguous bracket syntax alone", () => {
		const input = md("- [] is an empty array", "- [x](https://example.com) link", "- [ ] (optional) step");
		expect(repair(input)).toBe(input);
	});

	it("leaves valid lists and bullet styles unchanged on paste", () => {
		const input = md("* star", "+ plus", "1) paren", "3. three");
		expect(repair(input)).toBe(input);
	});
});

describe("ListFormatter – normalize", () => {
	it("unifies bullet markers and gaps", () => {
		expect(runFormatter(listFormatter, md("* a", "+ b", "-   c"))).toBe(md("- a", "- b", "- c"));
	});

	it("keeps wide gaps that start indented code", () => {
		expect(runFormatter(listFormatter, "-      code")).toBe("-      code");
	});

	it("does not treat thematic breaks or emphasis as list items", () => {
		const input = md("* * *", "**bold** text", "*emphasis*");
		expect(runFormatter(listFormatter, input)).toBe(input);
	});

	it("normalizes task boxes but keeps custom statuses", () => {
		expect(runFormatter(listFormatter, md("* [X] Done", "- [ ] Open", "- [-] Cancelled", "- [>] Deferred"))).toBe(
			md("- [x] Done", "- [ ] Open", "- [-] Cancelled", "- [>] Deferred"),
		);
	});

	it("preserves nested list indentation (tabs and spaces)", () => {
		const input = md("- a", "\t- b", "\t\t- c", "- d", "    - e");
		expect(runFormatter(listFormatter, input)).toBe(input);
	});

	it("keeps lazily numbered and sequential lists", () => {
		const lazy = md("1. a", "1. b", "1. c");
		const sequential = md("3. a", "4. b", "5. c");
		expect(runFormatter(listFormatter, lazy)).toBe(lazy);
		expect(runFormatter(listFormatter, sequential)).toBe(sequential);
	});

	it("renumbers inconsistent numbering from the first number", () => {
		expect(runFormatter(listFormatter, md("1. a", "3. b", "7. c"))).toBe(md("1. a", "2. b", "3. c"));
	});

	it("renumbers nested lists independently", () => {
		const input = md("1. a", "   1. x", "   5. y", "4. b", "   - bullet", "9. c");
		expect(runFormatter(listFormatter, input)).toBe(md("1. a", "   1. x", "   2. y", "2. b", "   - bullet", "3. c"));
	});

	it("keeps lists with blank lines and continuation paragraphs together", () => {
		const input = md("1. a", "", "   more text", "", "3. b", "lazy continuation", "5. c");
		expect(runFormatter(listFormatter, input)).toBe(md("1. a", "", "   more text", "", "2. b", "lazy continuation", "3. c"));
	});

	it("treats lists separated by a heading or unindented code as separate", () => {
		const input = md("1. a", "2. b", "# Heading", "5. c", "6. d", "```", "x", "```", "8. e");
		expect(runFormatter(listFormatter, input)).toBe(input);
	});

	it("does not renumber across different delimiters", () => {
		const input = md("1. a", "2. b", "4) c", "5) d");
		expect(runFormatter(listFormatter, input)).toBe(input);
	});

	it("renumbers when marker widths change but no indented content depends on them", () => {
		expect(runFormatter(listFormatter, md("8. a", "7. b", "9. c"))).toBe(md("8. a", "9. b", "10. c"));
		expect(runFormatter(listFormatter, md("1. a", "1. b", "9. c", "   child", "3. d"))).toBe(md("1. a", "2. b", "3. c", "   child", "4. d"));
	});

	it("skips renumbering when a marker width change could detach indented content", () => {
		const unsafe = md("8. a", "7. b", "9. c", "   child under c", "12. d");
		expect(runFormatter(listFormatter, unsafe)).toBe(unsafe);
	});

	it("handles lists inside blockquotes", () => {
		expect(runFormatter(listFormatter, md("> * a", "> 1. x", "> 3. y"))).toBe(md("> - a", "> 1. x", "> 2. y"));
	});

	it("is idempotent", () => {
		const once = normalize(md("* a", "  + b", "1. x", "4. y", "* [X] done"));
		expect(normalize(once)).toBe(once);
	});
});
