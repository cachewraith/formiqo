import { describe, expect, it } from "vitest";
import { headingFormatter } from "../../src/formatters/heading-formatter";
import { md, normalize, repair, runFormatter } from "../helpers";

describe("HeadingFormatter", () => {
	it("adds the missing space after 2-6 hashes on paste", () => {
		expect(repair("##Setup")).toBe("## Setup");
		expect(repair("######Deep")).toBe("###### Deep");
	});

	it("never turns an Obsidian #tag into a heading", () => {
		expect(repair("#tag and text")).toBe("#tag and text");
		expect(normalize("#tag\n")).toBe("#tag\n");
	});

	it("leaves valid headings unchanged on paste", () => {
		const input = md("# Title", "Text", "## Section ##");
		expect(repair(input)).toBe(input);
	});

	it("normalizes spacing and closing sequences but keeps indentation", () => {
		expect(runFormatter(headingFormatter, "   ##   Title   ##")).toBe("   ## Title");
		expect(runFormatter(headingFormatter, "#\tTabbed")).toBe("# Tabbed");
		expect(runFormatter(headingFormatter, "### ###")).toBe("###");
	});

	it("keeps hashes that are part of the heading text", () => {
		expect(runFormatter(headingFormatter, "## Learn C#")).toBe("## Learn C#");
		expect(runFormatter(headingFormatter, "## Project #work")).toBe("## Project #work");
		expect(runFormatter(headingFormatter, "## Escaped \\#")).toBe("## Escaped \\#");
	});

	it("surrounds top-level headings with blank lines", () => {
		const input = md("Intro", "# Title", "Body", "## Next", "More");
		expect(normalize(input)).toBe(`${md("Intro", "", "# Title", "", "Body", "", "## Next", "", "More")}\n`);
	});

	it("does not insert a blank line between frontmatter and a heading", () => {
		const input = md("---", "a: 1", "---", "# Title", "Body");
		expect(normalize(input)).toBe(`${md("---", "a: 1", "---", "# Title", "", "Body")}\n`);
	});

	it("repairs headings inside blockquotes", () => {
		expect(repair("> ##Quoted")).toBe("> ## Quoted");
	});

	it("does not treat setext headings or hashes in code as ATX headings", () => {
		const input = md("Title", "=====", "", "```python", "##not a heading", "```");
		expect(normalize(input)).toBe(`${input}\n`);
	});

	it("is idempotent", () => {
		const once = normalize(md("Intro", "##Title ##", "Body"));
		expect(normalize(once)).toBe(once);
	});
});
