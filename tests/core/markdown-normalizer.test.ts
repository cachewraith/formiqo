import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeMarkdown } from "../../src/core/markdown-normalizer";
import { makeOptions, md, normalize, PRESERVE_ALL, repair } from "../helpers";

const fixture = (name: string): string => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("normalizeMarkdown – fixtures", () => {
	it("normalizes a messy mixed document", () => {
		expect(normalize(fixture("messy-document.input.md"))).toBe(fixture("messy-document.normalized.md"));
	});

	it("repairs a messy mixed document conservatively", () => {
		expect(repair(fixture("messy-document.input.md"))).toBe(fixture("messy-document.repaired.md"));
	});

	it("leaves an Obsidian note with frontmatter, callouts, math, code, comments, HTML and embeds unchanged", () => {
		const note = fixture("obsidian-note.md");
		expect(repair(note)).toBe(note);
		expect(normalize(note)).toBe(note);
	});

	it.each([
		"regression-escaped-table.input.md",
		"regression-escaped-table.expected.md",
		"messy-document.input.md",
		"obsidian-note.md",
	])("is idempotent for %s", (name) => {
		const input = fixture(name);
		const normalizedOnce = normalize(input);
		expect(normalize(normalizedOnce)).toBe(normalizedOnce);
		const repairedOnce = repair(input);
		expect(repair(repairedOnce)).toBe(repairedOnce);
	});
});

describe("normalizeMarkdown – behaviour", () => {
	it("never mutates the input and reports unchanged text", () => {
		const input = "Plain text.";
		const result = normalizeMarkdown(input, makeOptions({ scope: "paste", mode: "repair" }));
		expect(result).toEqual({ text: input, changed: false, applied: [] });
	});

	it("reports which formatters changed the text", () => {
		const result = normalizeMarkdown(md("\\| a | b |", "\\| - | - |", "##Title"), makeOptions({ scope: "paste", mode: "repair" }));
		expect(result.changed).toBe(true);
		expect(result.applied).toEqual(["headings", "tables"]);
	});

	it("returns the original text (including CRLF) when nothing needs fixing", () => {
		const input = "# Title\r\n\r\nBody\r\n";
		expect(normalizeMarkdown(input, makeOptions({ scope: "paste", mode: "repair" })).text).toBe(input);
	});

	it("handles CRLF input that needs fixing", () => {
		expect(repair("\\| a | b |\r\n\\| - | - |")).toBe("| a | b |\n| - | - |");
	});

	it("preserves leading and trailing blank lines of pasted fragments", () => {
		expect(repair("\n\n\\| a | b |\n\\| - | - |\n\n")).toBe("\n\n| a | b |\n| - | - |\n\n");
	});

	it("does not add a trailing newline to selections or pastes", () => {
		expect(normalize("* a", { scope: "selection" })).toBe("- a");
		expect(normalize("* a\n", { scope: "selection" })).toBe("- a\n");
	});

	it("only treats a leading --- block as frontmatter when allowed", () => {
		const input = md("---", "* a", "---");
		expect(normalize(input, { scope: "selection", allowFrontmatter: true })).toBe(input);
		expect(normalize(input, { scope: "selection", allowFrontmatter: false })).toBe(md("---", "- a", "---"));
	});

	it("runs only the enabled formatters", () => {
		const input = md("* a", "\\| x | y |", "\\| - | - |");
		const result = normalizeMarkdown(input, makeOptions({ mode: "repair", scope: "paste", formatters: new Set(["lists"]) }));
		expect(result.changed).toBe(false);
	});

	it("returns the input unchanged when no formatter is enabled or the text is blank", () => {
		expect(normalizeMarkdown("* a", makeOptions({ formatters: new Set() })).changed).toBe(false);
		expect(normalizeMarkdown("  \n ", makeOptions()).changed).toBe(false);
	});

	it("handles malformed and adversarial input without throwing", () => {
		const inputs = ["```", "|", "\\|", "| - |", "$$", "%%", "<div>", "> ".repeat(50), "`".repeat(1000), "[".repeat(500) + "](", "1.".repeat(300)];
		for (const input of inputs) {
			expect(() => normalizeMarkdown(input, makeOptions())).not.toThrow();
			expect(() => normalizeMarkdown(input, makeOptions({ scope: "paste", mode: "repair" }))).not.toThrow();
		}
	});

	it("handles large documents quickly", () => {
		const section = md("## Section", "", "\\| a | b |", "\\| - | - |", "\\| 1 | 2 |", "", "* item", "1. one", "3. two", "", "```js", "code();", "```", "");
		const input = Array.from({ length: 500 }, () => section).join("\n");
		const start = performance.now();
		const result = normalizeMarkdown(input, makeOptions());
		expect(performance.now() - start).toBeLessThan(2000);
		expect(result.changed).toBe(true);
	});

	it("can disable math preservation so $$ blocks are formatted like text", () => {
		const input = md("$$", "* a", "$$");
		expect(normalize(input, { preservation: PRESERVE_ALL })).toBe(`${input}\n`);
		expect(normalize(input, { preservation: { ...PRESERVE_ALL, math: false } })).toBe(`${md("$$", "- a", "$$")}\n`);
	});
});
