/**
 * Markdown post-processor for the Reading View.
 *
 * Works only on the DOM that Obsidian's own renderer produced: tables are
 * moved into a scroll container and code blocks get a language label stored
 * in a data attribute (rendered via CSS `attr()`). No HTML strings are ever
 * parsed or injected.
 */

import type { MarkdownPostProcessor } from "obsidian";
import type { FormiqoSettings } from "../settings/settings";
import { isReadingViewActive } from "./reading-view";

export const TABLE_WRAPPER_CLASS = "formiqo-table-scroll";
export const LANGUAGE_ATTRIBUTE = "data-formiqo-lang";

/** Conservative whitelist for language names shown as labels. */
const LANGUAGE_CLASS = /^language-([\w#+.-]{1,32})$/;

export function createReadingViewPostProcessor(getSettings: () => FormiqoSettings): MarkdownPostProcessor {
	return (element) => {
		const settings = getSettings();
		if (!isReadingViewActive(settings)) return;
		if (settings.reading.responsiveTables) wrapTables(element);
		if (settings.reading.codeBlocks) labelCodeBlocks(element);
	};
}

export function wrapTables(root: HTMLElement): void {
	for (const table of Array.from(root.querySelectorAll("table"))) {
		const parent = table.parentElement;
		if (!parent || parent.classList.contains(TABLE_WRAPPER_CLASS)) continue;
		const wrapper = parent.createDiv({ cls: TABLE_WRAPPER_CLASS });
		parent.insertBefore(wrapper, table);
		wrapper.appendChild(table);
	}
}

export function labelCodeBlocks(root: HTMLElement): void {
	for (const code of Array.from(root.querySelectorAll("pre > code"))) {
		const pre = code.parentElement;
		if (!pre || pre.hasAttribute(LANGUAGE_ATTRIBUTE)) continue;
		const language = codeLanguage(code);
		if (language !== null) pre.setAttribute(LANGUAGE_ATTRIBUTE, language);
	}
}

function codeLanguage(code: Element): string | null {
	for (const className of Array.from(code.classList)) {
		const language = LANGUAGE_CLASS.exec(className)?.[1];
		if (language !== undefined) return language;
	}
	return null;
}
