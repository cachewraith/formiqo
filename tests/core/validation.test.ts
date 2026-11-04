import { describe, expect, it } from "vitest";
import { scanMarkdown } from "../../src/core/markdown-scanner";
import { validateFormatting } from "../../src/core/validation";
import { PRESERVE_ALL } from "../helpers";

const scan = (lines: string[]) => scanMarkdown(lines, { preservation: PRESERVE_ALL, allowFrontmatter: true });

describe("validateFormatting", () => {
	it("accepts markup-only changes", () => {
		expect(validateFormatting(scan(["* [X] a", "\\| b |"]), scan(["- [x] a", "| b |"])).valid).toBe(true);
	});

	it("rejects changes to code block content", () => {
		const result = validateFormatting(scan(["```", "a ", "```"]), scan(["```", "a", "```"]));
		expect(result).toEqual({ valid: false, reason: "protected content would have changed" });
	});

	it("allows fence delimiter changes", () => {
		expect(validateFormatting(scan(["```  js", "a", "```"]), scan(["```js", "a", "```"])).valid).toBe(true);
	});

	it("rejects removed content lines", () => {
		expect(validateFormatting(scan(["a", "-", "b"]), scan(["a", "b"])).valid).toBe(false);
	});

	it("allows list renumbering but rejects changed numbers in text", () => {
		expect(validateFormatting(scan(["1. a", "3. b"]), scan(["1. a", "2. b"])).valid).toBe(true);
		expect(validateFormatting(scan(["| 10 |"]), scan(["| 1 |"])).valid).toBe(false);
	});

	it("rejects changed words", () => {
		expect(validateFormatting(scan(["hello world"]), scan(["hello word"])).valid).toBe(false);
	});
});
