import type { FormiqoSettings } from "./settings";

/** Bump when the stored settings shape changes, and add a migration in settings.ts. */
export const SETTINGS_VERSION = 1;

/** Returns a fresh copy of the defaults (never share the nested objects). */
export function createDefaultSettings(): FormiqoSettings {
	return {
		version: SETTINGS_VERSION,
		enabled: true,
		pasteFormatting: true,
		readingView: true,
		formatting: {
			tables: true,
			headings: true,
			lists: true,
			blockquotes: true,
			horizontalRules: true,
			whitespace: true,
			codeFences: true,
			links: true,
		},
		preservation: {
			codeBlocks: true,
			inlineCode: true,
			frontmatter: true,
			callouts: true,
			html: true,
			math: true,
		},
		reading: {
			tables: true,
			codeBlocks: true,
			typography: true,
			lists: true,
			blockquotes: true,
			responsiveTables: true,
		},
	};
}
