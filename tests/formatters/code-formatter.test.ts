import { describe, expect, it } from "vitest";
import { codeBlockFormatter } from "../../src/formatters/code-formatter";
import { md, normalize, repair, runFormatter } from "../helpers";

describe("CodeBlockFormatter", () => {
	it("closes an unclosed fence so it cannot swallow the rest of the note", () => {
		expect(repair(md("```js", "const a = 1;"))).toBe(md("```js", "const a = 1;", "```"));
		expect(repair(md("~~~~", "code"))).toBe(md("~~~~", "code", "~~~~"));
	});

	it("closes unclosed fences inside lists and quotes with the same prefix", () => {
		expect(repair(md("1. Step", "   ```bash", "   ls"))).toBe(md("1. Step", "   ```bash", "   ls", "   ```"));
		expect(repair(md("> ```", "> quoted code"))).toBe(md("> ```", "> quoted code", "> ```"));
	});

	it("preserves language identifiers and code content exactly", () => {
		const input = md("```typescript", "const x = 1;   ", "\t\tindented", "", "| a | b |", "```");
		expect(repair(input)).toBe(input);
		expect(normalize(input)).toBe(`${input}\n`);
	});

	it("removes stray spaces between fence and language", () => {
		expect(runFormatter(codeBlockFormatter, md("```   js  ", "x", "```  "))).toBe(md("```js", "x", "```"));
	});

	it("separates top-level fences from paragraphs", () => {
		expect(runFormatter(codeBlockFormatter, md("Run this:", "```sh", "ls", "```", "Done."))).toBe(
			md("Run this:", "", "```sh", "ls", "```", "", "Done."),
		);
	});

	it("does not separate fences inside list items", () => {
		const input = md("1. Step", "   ```sh", "   ls", "   ```", "2. Next");
		expect(runFormatter(codeBlockFormatter, input)).toBe(input);
	});

	it("handles longer fences containing shorter ones", () => {
		const input = md("````md", "```js", "x", "```", "````");
		expect(normalize(input)).toBe(`${input}\n`);
	});

	it("preserves inline code", () => {
		const input = "Use `\\|` or ``a ` b`` inline.";
		expect(repair(input)).toBe(input);
		expect(normalize(input)).toBe(`${input}\n`);
	});

	it("is idempotent", () => {
		const once = normalize(md("Text", "```  js", "x"));
		expect(normalize(once)).toBe(once);
	});
});
