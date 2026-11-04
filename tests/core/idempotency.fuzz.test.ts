import { describe, expect, it } from "vitest";
import { normalizeMarkdown } from "../../src/core/markdown-normalizer";
import { makeOptions } from "../helpers";

/** Building blocks that exercise every formatter and their interactions. */
const FRAGMENTS = [
	"# Title", "##Heading", "  ### Indented ##", "#tag line", "Paragraph text   ", "Another line  ", "",
	"\\| a | b |", "\\| --- | --- |", "\\| 1 | `x \\| y` |", "| c | d |", "|---|:-:|", "| only |", "a | b", "--- | ---",
	"* star", "+ plus", "- dash", "  * nested", "\t- tabbed", "1. one", "3. three", "10) ten", "• bullet", "☐ task", "- [ ]Task", "* [X] done",
	">quote", ">>nested", "> [!note] Callout", ">", "***", "* * *", "___", "---", "-----",
	"```js", "```", "~~~", "    indented code", "$$", "x^2", "%%", "<div>", "</div>",
	"[link] (https://example.com)", "[a]( https://x.y )", "Text with $|x|$ and `code`", " - nbsp item", "- nbsp", "日本語 🚀",
];

function randomDocument(seed: number): string {
	let state = seed;
	const next = (): number => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state / 2147483648;
	};
	const length = 1 + Math.floor(next() * 25);
	return Array.from({ length }, () => FRAGMENTS[Math.floor(next() * FRAGMENTS.length)] ?? "").join("\n");
}

describe("idempotency (fuzz)", () => {
	it.each(["document", "selection", "paste"] as const)("normalize(normalize(x)) === normalize(x) for %s scope", (scope) => {
		for (let seed = 1; seed <= 400; seed++) {
			const input = randomDocument(seed);
			for (const mode of ["repair", "normalize"] as const) {
				const options = makeOptions({ scope, mode, allowFrontmatter: true });
				const once = normalizeMarkdown(input, options);
				expect(once.rejected, `seed ${seed} ${mode}: ${JSON.stringify(input)}`).toBeUndefined();
				const twice = normalizeMarkdown(once.text, options);
				expect(twice.text, `seed ${seed} ${mode}: ${JSON.stringify(input)}`).toBe(once.text);
			}
		}
	});
});
