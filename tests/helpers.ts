import { normalizeMarkdown } from "../src/core/markdown-normalizer";
import { scanMarkdown } from "../src/core/markdown-scanner";
import type { FormatMode, Formatter, FormatterId, NormalizeOptions, PreservationOptions } from "../src/types";
import { splitLines } from "../src/utils/text-utils";

export const ALL_FORMATTERS: readonly FormatterId[] = [
	"whitespace",
	"code-blocks",
	"headings",
	"tables",
	"lists",
	"blockquotes",
	"horizontal-rules",
	"links",
];

export const PRESERVE_ALL: PreservationOptions = {
	codeBlocks: true,
	inlineCode: true,
	frontmatter: true,
	callouts: true,
	html: true,
	math: true,
};

export function makeOptions(overrides: Partial<NormalizeOptions> = {}): NormalizeOptions {
	return {
		scope: "document",
		mode: "normalize",
		formatters: new Set(ALL_FORMATTERS),
		preservation: PRESERVE_ALL,
		allowFrontmatter: true,
		...overrides,
	};
}

/** Formats like a paste: repair mode, fragment edges preserved. */
export function repair(text: string, formatters: readonly FormatterId[] = ALL_FORMATTERS): string {
	return normalizeMarkdown(text, makeOptions({ scope: "paste", mode: "repair", formatters: new Set(formatters) })).text;
}

/** Formats like the "Format current document" command. */
export function normalize(text: string, overrides: Partial<NormalizeOptions> = {}): string {
	return normalizeMarkdown(text, makeOptions(overrides)).text;
}

/** Runs a single formatter directly, bypassing the pipeline and validation. */
export function runFormatter(
	formatter: Formatter,
	text: string,
	mode: FormatMode = "normalize",
	preservation: PreservationOptions = PRESERVE_ALL,
): string {
	const doc = scanMarkdown(splitLines(text), { preservation, allowFrontmatter: true });
	return formatter.format(doc, { mode, preservation }).join("\n");
}

/** Joins lines with `\n` – keeps multi-line expectations readable. */
export function md(...lines: string[]): string {
	return lines.join("\n");
}
