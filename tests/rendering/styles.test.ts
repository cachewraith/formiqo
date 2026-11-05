import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("styles.css", () => {
	const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

	/** Returns every style rule's selector list, descending into @media blocks. */
	function selectors(source: string): string[] {
		const found: string[] = [];
		let prelude = "";
		for (const char of source) {
			if (char === "{") {
				const text = prelude.trim();
				if (!text.startsWith("@")) found.push(...splitTopLevel(text));
				prelude = "";
			} else if (char === "}" || char === ";") {
				prelude = "";
			} else {
				prelude += char;
			}
		}
		return found;
	}

	/** Splits a selector list on commas that are not inside parentheses (e.g. `:is(h1, h2)`). */
	function splitTopLevel(list: string): string[] {
		const parts: string[] = [];
		let depth = 0;
		let current = "";
		for (const char of list) {
			if (char === "(") depth++;
			if (char === ")") depth--;
			if (char === "," && depth === 0) {
				parts.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		parts.push(current.trim());
		return parts;
	}

	const all = selectors(css);

	it("contains rules", () => {
		expect(all.length).toBeGreaterThan(20);
	});

	/** The first compound selector, i.e. the body-level classes the rule depends on. */
	const gate = (selector: string): string => selector.split(/\s+/)[0] ?? "";

	it("gates every rule behind a Formiqo body class", () => {
		for (const selector of all) {
			expect(gate(selector), selector).toMatch(/\.formiqo-(?:reading|studio-editor)\b/);
		}
	});

	it("scopes Reading View rules to rendered notes and editor rules to the editor", () => {
		const variableBlocks = new Set(["body.formiqo-reading", ".is-mobile.formiqo-reading"]);
		for (const selector of all.filter((s) => !variableBlocks.has(s))) {
			const isEditorRule = gate(selector).includes(".formiqo-studio-editor");
			expect(selector, selector).toContain(isEditorRule ? ".markdown-source-view" : ".markdown-preview-view");
			expect(selector, selector).not.toContain(isEditorRule ? ".markdown-preview-view" : ".markdown-source-view");
		}
	});

	it("uses theme variables instead of hard-coded colours", () => {
		const declarations = css.match(/(?:^|[;{\s])(?:color|background(?:-color)?|border(?:-[a-z-]+)?)\s*:[^;]+;/g) ?? [];
		for (const declaration of declarations) {
			expect(declaration, declaration).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
		}
	});
});
