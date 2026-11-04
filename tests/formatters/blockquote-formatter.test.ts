import { describe, expect, it } from "vitest";
import { blockquoteFormatter } from "../../src/formatters/blockquote-formatter";
import { md, PRESERVE_ALL, repair, runFormatter } from "../helpers";

describe("BlockquoteFormatter", () => {
	it("normalizes quote marker spacing and nesting", () => {
		expect(runFormatter(blockquoteFormatter, md(">text", ">>nested", "> >mixed", ">   indented code"))).toBe(
			md("> text", "> > nested", "> > mixed", ">   indented code"),
		);
	});

	it("trims empty quote lines to a bare marker", () => {
		expect(runFormatter(blockquoteFormatter, md("> a", ">  ", "> b"))).toBe(md("> a", ">", "> b"));
	});

	it("keeps indentation of quotes inside list items", () => {
		expect(runFormatter(blockquoteFormatter, md("- item", "  >quoted"))).toBe(md("- item", "  > quoted"));
	});

	it("leaves Obsidian callouts untouched when callouts are preserved", () => {
		const callout = md(">[!note]+ Title", ">body line", ">>nested");
		expect(runFormatter(blockquoteFormatter, callout)).toBe(callout);
	});

	it("normalizes callouts when callout preservation is off", () => {
		const callout = md(">[!note]+ Title", ">body line");
		expect(runFormatter(blockquoteFormatter, callout, "normalize", { ...PRESERVE_ALL, callouts: false })).toBe(
			md("> [!note]+ Title", "> body line"),
		);
	});

	it("does nothing in repair mode", () => {
		expect(repair(">>text")).toBe(">>text");
	});

	it("is idempotent", () => {
		const once = runFormatter(blockquoteFormatter, md(">>a", ">", "> b"));
		expect(runFormatter(blockquoteFormatter, once)).toBe(once);
	});
});
