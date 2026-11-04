/**
 * Public entry point of the formatting engine.
 *
 *   input -> split edges -> scan -> formatting pipeline -> validation -> output
 *
 * Pure function: the input string is never mutated, and on any failure the
 * original text is returned unchanged.
 */

import { FORMATTERS } from "../formatters";
import type { FormatContext, FormatterId, NormalizeOptions, NormalizeResult } from "../types";
import { arraysEqual, normalizeLineEndings, splitLines } from "../utils/text-utils";
import { runPipeline } from "./formatting-pipeline";
import { scanMarkdown, type ScanOptions } from "./markdown-scanner";
import { validateFormatting } from "./validation";

/** Upper bound on formatting passes; real documents converge after one or two. */
const MAX_PASSES = 3;

interface Edges {
	/** Blank lines before the first content line (kept verbatim). */
	readonly leading: string;
	readonly core: string;
	/** Line breaks and blank lines after the last content line. */
	readonly trailing: string;
}

export function normalizeMarkdown(input: string, options: NormalizeOptions): NormalizeResult {
	const unchanged: NormalizeResult = { text: input, changed: false, applied: [] };
	const source = normalizeLineEndings(input);
	const { leading, core, trailing } = splitEdges(source);
	const formatters = FORMATTERS.filter((formatter) => options.formatters.has(formatter.id));
	if (core.trim() === "" || formatters.length === 0) return unchanged;

	const scanOptions: ScanOptions = {
		preservation: options.preservation,
		allowFrontmatter: options.allowFrontmatter && leading === "",
	};
	const ctx: FormatContext = { mode: options.mode, preservation: options.preservation };
	const originalLines = splitLines(core);

	let formattedLines = originalLines;
	const appliedIds = new Set<FormatterId>();
	try {
		// A fix can change the document's structure (e.g. a blank line ends an HTML block and
		// exposes an unclosed fence), so passes repeat until the output is stable.
		for (let pass = 0; pass < MAX_PASSES; pass++) {
			const result = runPipeline(formattedLines, formatters, ctx, scanOptions);
			result.applied.forEach((id) => appliedIds.add(id));
			if (arraysEqual(result.lines, formattedLines)) break;
			formattedLines = result.lines;
		}
	} catch {
		return { ...unchanged, rejected: "an internal formatting error occurred" };
	}

	const validation = validateFormatting(scanMarkdown(originalLines, scanOptions), scanMarkdown(formattedLines, scanOptions));
	if (!validation.valid) return { ...unchanged, rejected: validation.reason ?? "validation failed" };

	const text = leading + formattedLines.join("\n") + finalTrailing(trailing, options);
	if (text === source) return unchanged;
	const applied = formatters.map((formatter) => formatter.id).filter((id) => appliedIds.has(id));
	return { text, changed: true, applied };
}

/** Documents end with exactly one newline when whitespace normalization is on. */
function finalTrailing(trailing: string, options: NormalizeOptions): string {
	const tidyDocumentEnd = options.scope === "document" && options.mode === "normalize" && options.formatters.has("whitespace");
	return tidyDocumentEnd ? "\n" : trailing;
}

function splitEdges(source: string): Edges {
	const leading = /^(?:[ \t]*\n)*/.exec(source)?.[0] ?? "";
	const rest = source.slice(leading.length);
	const trailing = /(?:\n[ \t]*)*$/.exec(rest)?.[0] ?? "";
	return { leading, core: rest.slice(0, rest.length - trailing.length), trailing };
}
