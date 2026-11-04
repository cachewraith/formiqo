import { describe, expect, it } from "vitest";
import { scanMarkdown } from "../../src/core/markdown-scanner";
import type { LineKind, PreservationOptions } from "../../src/types";
import { PRESERVE_ALL } from "../helpers";

function kinds(lines: string[], allowFrontmatter = true, preservation: PreservationOptions = PRESERVE_ALL): LineKind[] {
	return scanMarkdown(lines, { preservation, allowFrontmatter }).lines.map((line) => line.kind);
}

describe("scanMarkdown", () => {
	it("detects YAML frontmatter only at the very start", () => {
		expect(kinds(["---", "a: 1", "---", "text"])).toEqual(["frontmatter", "frontmatter", "frontmatter", "markdown"]);
		expect(kinds(["---", "a: 1", "---"], false)).toEqual(["markdown", "markdown", "markdown"]);
		expect(kinds(["text", "---", "a: 1", "---"])).toEqual(["markdown", "markdown", "markdown", "markdown"]);
	});

	it("does not treat an unclosed --- as frontmatter", () => {
		expect(kinds(["---", "text"])).toEqual(["markdown", "markdown"]);
	});

	it("detects backtick and tilde fences with their delimiters", () => {
		expect(kinds(["```js", "code", "```", "after"])).toEqual(["fence", "code", "fence", "markdown"]);
		expect(kinds(["~~~", "```", "~~~"])).toEqual(["fence", "code", "fence"]);
	});

	it("requires a closing fence at least as long as the opener", () => {
		expect(kinds(["````", "```", "````"])).toEqual(["fence", "code", "fence"]);
	});

	it("treats an unclosed fence as code to the end", () => {
		expect(kinds(["```", "a", "b"])).toEqual(["fence", "code", "code"]);
	});

	it("detects fences inside blockquotes and list items", () => {
		expect(kinds(["> ```", "> x", "> ```"])).toEqual(["fence", "code", "fence"]);
		expect(kinds(["- item", "  ```", "  x", "  ```"])).toEqual(["markdown", "fence", "code", "fence"]);
	});

	it("detects math blocks, single-line and multi-line", () => {
		expect(kinds(["$$", "x^2", "$$", "$$y$$"])).toEqual(["math", "math", "math", "math"]);
	});

	it("detects Obsidian comments", () => {
		expect(kinds(["%%", "secret", "%%", "%% inline %%"])).toEqual(["comment", "comment", "comment", "comment"]);
	});

	it("detects HTML blocks", () => {
		expect(kinds(["<div>", "| a |", "</div>", "", "text"])).toEqual(["html", "html", "html", "markdown", "markdown"]);
		expect(kinds(["<!--", "comment", "-->"])).toEqual(["html", "html", "html"]);
		expect(kinds(["<pre>", "", "x", "</pre>"])).toEqual(["html", "html", "html", "html"]);
	});

	it("does not treat inline HTML inside a paragraph as a block", () => {
		expect(kinds(["text", "<span>inline</span> more"])).toEqual(["markdown", "markdown"]);
	});

	it("detects indented code blocks but not indented list continuation", () => {
		expect(kinds(["para", "", "    code", "", "    more"])).toEqual(["markdown", "markdown", "code", "code", "code"]);
		expect(kinds(["- item", "", "    continuation"])).toEqual(["markdown", "markdown", "markdown"]);
	});

	it("marks lines protected according to preservation settings", () => {
		const doc = scanMarkdown(["```", "x", "```", "$$", "y", "$$"], {
			preservation: { ...PRESERVE_ALL, codeBlocks: false },
			allowFrontmatter: true,
		});
		expect(doc.lines.map((line) => line.protected)).toEqual([false, false, false, true, true, true]);
	});

	it("always protects Obsidian comments", () => {
		const off: PreservationOptions = { codeBlocks: false, inlineCode: false, frontmatter: false, callouts: false, html: false, math: false };
		expect(scanMarkdown(["%%", "x", "%%"], { preservation: off, allowFrontmatter: true }).lines.every((line) => line.protected)).toBe(true);
	});

	it("reports block spans", () => {
		const doc = scanMarkdown(["a", "```", "b", "```", "c"], { preservation: PRESERVE_ALL, allowFrontmatter: true });
		expect(doc.blocks).toEqual([{ kind: "code", start: 1, end: 3 }]);
	});
});
