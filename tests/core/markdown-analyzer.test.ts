import { describe, expect, it } from "vitest";
import { classifyContent } from "../../src/core/markdown-analyzer";
import { md } from "../helpers";

describe("classifyContent", () => {
	it("detects empty content", () => {
		expect(classifyContent("")).toBe("empty");
		expect(classifyContent(" \n\t\n")).toBe("empty");
	});

	it("detects plain text", () => {
		expect(classifyContent("Just a sentence.\nAnd another one.")).toBe("plain-text");
	});

	it("detects Markdown", () => {
		expect(classifyContent(md("# Title", "", "- item", "- item"))).toBe("markdown");
		expect(classifyContent(md("\\| a | b |", "\\| --- | --- |"))).toBe("markdown");
	});

	it("detects source code", () => {
		const code = md("import { x } from 'y';", "function f(a) {", "  return a + 1;", "}");
		expect(classifyContent(code)).toBe("code");
	});

	it("treats Python with # comments as code", () => {
		const python = md("# compute totals", "def total(items):", "    return sum(items)", "print(total([1, 2]))");
		expect(classifyContent(python)).toBe("code");
	});

	it("detects mixed Markdown and code", () => {
		expect(classifyContent(md("## Install", "```bash", "npm i", "```"))).toBe("mixed");
		expect(classifyContent(md("```js", "const a = 1;", "```"))).toBe("markdown");
	});
});
