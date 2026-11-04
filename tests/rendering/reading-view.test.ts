// @vitest-environment happy-dom
import type { MarkdownPostProcessorContext } from "obsidian";
import { describe, expect, it } from "vitest";
import { createReadingViewPostProcessor, LANGUAGE_ATTRIBUTE, TABLE_WRAPPER_CLASS } from "../../src/rendering/markdown-postprocessor";
import { readingViewClasses, ReadingViewStyler } from "../../src/rendering/reading-view";
import type { FormiqoSettings } from "../../src/settings/settings";
import { createDefaultSettings } from "../../src/settings/settings-defaults";
import { installObsidianDomHelpers } from "../mocks/obsidian-dom";

installObsidianDomHelpers();

/** Builds a DOM fragment the way Obsidian's renderer would, without parsing HTML strings. */
function renderedSection(): HTMLElement {
	const section = document.createElement("div");
	const table = section.appendChild(document.createElement("table"));
	table.appendChild(document.createElement("tbody")).appendChild(document.createElement("tr")).appendChild(document.createElement("td")).textContent = "cell";
	for (const className of ["language-typescript", "language-x".padEnd(50, "x"), ""]) {
		const pre = section.appendChild(document.createElement("pre"));
		const code = pre.appendChild(document.createElement("code"));
		if (className) code.className = `${className} is-loaded`;
		code.textContent = "const a = 1;";
	}
	return section;
}

function process(element: HTMLElement, settings: FormiqoSettings): void {
	void createReadingViewPostProcessor(() => settings)(element, {} as MarkdownPostProcessorContext);
}

describe("Reading View post-processor", () => {
	it("wraps tables in a scroll container exactly once", () => {
		const section = renderedSection();
		const settings = createDefaultSettings();
		process(section, settings);
		process(section, settings);
		const wrappers = section.querySelectorAll(`.${TABLE_WRAPPER_CLASS}`);
		expect(wrappers).toHaveLength(1);
		expect(wrappers[0]?.firstElementChild?.tagName).toBe("TABLE");
		expect(section.querySelector("td")?.textContent).toBe("cell");
	});

	it("labels code blocks with a whitelisted language name", () => {
		const section = renderedSection();
		process(section, createDefaultSettings());
		const labels = Array.from(section.querySelectorAll("pre"), (pre) => pre.getAttribute(LANGUAGE_ATTRIBUTE));
		expect(labels).toEqual(["typescript", null, null]);
		expect(section.querySelector("code")?.textContent).toBe("const a = 1;");
	});

	it("does nothing when the Reading View, its features or Formiqo are disabled", () => {
		const variants: ((settings: FormiqoSettings) => void)[] = [
			(s) => (s.enabled = false),
			(s) => (s.readingView = false),
			(s) => {
				s.reading.responsiveTables = false;
				s.reading.codeBlocks = false;
			},
		];
		for (const disable of variants) {
			const settings = createDefaultSettings();
			disable(settings);
			const section = renderedSection();
			process(section, settings);
			expect(section.querySelector(`.${TABLE_WRAPPER_CLASS}`)).toBeNull();
			expect(section.querySelector(`[${LANGUAGE_ATTRIBUTE}]`)).toBeNull();
		}
	});
});

describe("Reading View body classes", () => {
	it("maps settings to classes", () => {
		const settings = createDefaultSettings();
		expect(readingViewClasses(settings)).toEqual([
			"formiqo-reading",
			"formiqo-tables",
			"formiqo-code",
			"formiqo-typography",
			"formiqo-lists",
			"formiqo-blockquotes",
			"formiqo-responsive-tables",
		]);
		settings.reading.lists = false;
		expect(readingViewClasses(settings)).not.toContain("formiqo-lists");
		settings.enabled = false;
		expect(readingViewClasses(settings)).toEqual([]);
	});

	it("keeps unrelated body classes intact", () => {
		const doc = document.implementation.createHTMLDocument("x");
		doc.body.className = "theme-dark is-mobile";
		const settings = createDefaultSettings();
		const styler = new ReadingViewStyler(() => settings);
		styler.attach(doc);
		settings.readingView = false;
		styler.refresh();
		expect([...doc.body.classList]).toEqual(["theme-dark", "is-mobile"]);
		settings.readingView = true;
		styler.refresh();
		styler.destroy();
		expect([...doc.body.classList]).toEqual(["theme-dark", "is-mobile"]);
	});
});
