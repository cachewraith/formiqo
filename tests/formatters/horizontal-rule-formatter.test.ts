import { describe, expect, it } from "vitest";
import { horizontalRuleFormatter } from "../../src/formatters/horizontal-rule-formatter";
import { md, normalize, repair, runFormatter } from "../helpers";

describe("HorizontalRuleFormatter", () => {
	it("rewrites thematic breaks as ---", () => {
		expect(runFormatter(horizontalRuleFormatter, md("a", "", "***", "", "* * *", "", "___", "", "- - -", "", "-----"))).toBe(
			md("a", "", "---", "", "---", "", "---", "", "---", "", "---"),
		);
	});

	it("inserts a blank line so a rule below a paragraph does not become a setext heading", () => {
		expect(runFormatter(horizontalRuleFormatter, md("Paragraph", "***"))).toBe(md("Paragraph", "", "---"));
	});

	it("never touches setext underlines", () => {
		const setext = md("Heading", "-----");
		expect(runFormatter(horizontalRuleFormatter, setext)).toBe(setext);
	});

	it("never rewrites the first line (it could become frontmatter)", () => {
		expect(runFormatter(horizontalRuleFormatter, md("***", "text"))).toBe(md("***", "text"));
	});

	it("ignores indented rules and leaves --- alone", () => {
		const input = md("a", "", "  ***", "", "---");
		expect(runFormatter(horizontalRuleFormatter, input)).toBe(input);
	});

	it("does nothing in repair mode", () => {
		const input = md("a", "", "***");
		expect(repair(input)).toBe(input);
	});

	it("is idempotent through the full pipeline", () => {
		const once = normalize(md("Text", "* * *", "More"));
		expect(once).toBe(`${md("Text", "", "---", "More")}\n`);
		expect(normalize(once)).toBe(once);
	});
});
