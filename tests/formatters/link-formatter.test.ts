import { describe, expect, it } from "vitest";
import { linkFormatter } from "../../src/formatters/link-formatter";
import { md, normalize, repair, runFormatter } from "../helpers";

describe("LinkFormatter – repair", () => {
	it("joins links broken by a space before the URL", () => {
		expect(repair("See [the docs] (https://example.com/docs) now.")).toBe("See [the docs](https://example.com/docs) now.");
	});

	it("joins detached images and file links", () => {
		expect(repair("![Diagram] (assets/diagram.png)")).toBe("![Diagram](assets/diagram.png)");
		expect(repair("[Note] (Folder/Note.md)")).toBe("[Note](Folder/Note.md)");
	});

	it("does not touch task boxes, footnotes, reference links or plain parentheses", () => {
		const input = md(
			"- [ ] (https://example.com) check later",
			"Footnote[^1] (https://example.com)",
			"[a][b] (https://example.com)",
			"[not a link] (just a remark)",
		);
		expect(repair(input)).toBe(input);
	});

	it("leaves valid links, images and wikilinks unchanged", () => {
		const input = md("[a](https://x.y)", "![alt](img.png \"Title\")", "[[Note|alias]] ![[embed.png|300]]", "<https://autolink.example>");
		expect(repair(input)).toBe(input);
	});

	it("never edits inside inline code or math", () => {
		const input = "`[a] (https://x.y)` and $[a] (https://x.y)$";
		expect(repair(input)).toBe(input);
	});

	it("respects escaped brackets", () => {
		expect(repair("\\[a] (https://x.y)")).toBe("\\[a] (https://x.y)");
	});
});

describe("LinkFormatter – normalize", () => {
	it("trims padding inside link parentheses and keeps titles", () => {
		expect(runFormatter(linkFormatter, "[a]( https://x.y )")).toBe("[a](https://x.y)");
		expect(runFormatter(linkFormatter, '[a]( https://x.y  "Title" )')).toBe('[a](https://x.y "Title")');
		expect(runFormatter(linkFormatter, "![img](pic.png )")).toBe("![img](pic.png)");
	});

	it("is idempotent", () => {
		const once = normalize("[a] (https://x.y) and [b]( https://z )");
		expect(normalize(once)).toBe(once);
	});
});
