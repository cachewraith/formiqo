/**
 * Lightweight content classification used by the paste handler to decide
 * whether pasted text should be considered for formatting at all.
 * Source code pasted outside a code block is left exactly as copied.
 */

import type { ContentKind } from "../types";
import { isBlank, splitLines } from "../utils/text-utils";

const FENCE = /^\s*(?:```|~~~)/;

/** Markdown constructs that are unlikely to appear in source code. */
const STRONG_MARKDOWN = [
	FENCE,
	/^\s*\\?\|.*\|\s*$/, // table row
	/^\s*>\s*\[![^\]]+\]/, // callout
	/!?\[[^\]\n]+\]\s?\([^)\s]+\)/, // link / image
	/!?\[\[[^\]\n]+\]\]/, // wikilink / embed
	/^\s*[-*+]\s+\[[ xX]\]\s/, // task
];

/** Markdown constructs that can also be source-code comments or operators. */
const WEAK_MARKDOWN = [
	/^#{1,6}\s+\S/, // heading (also a shell/Python comment)
	/^\s*(?:[-*+•]|\d{1,9}[.)])\s+\S/, // list item
	/^\s*>\s?\S/, // blockquote
	/\*\*[^*\n]+\*\*/, // bold
];

const CODE_LINE = [
	/[;{]\s*$/,
	/^\s*[}\])][;,)]*\s*$/,
	/^\s*(?:import|export|from|const|let|var|function|def|class|interface|return|if|elif|else|for|while|switch|case|try|catch|public|private|protected|static|package|using|namespace|fn|func|impl|struct|enum|async|await|#include|#define|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/,
	/^\s*(?:\/\/|\/\*|\*\/|<\?php|@\w+)/,
	/=>|::|\$\{|\b(?:print|console\.log)\(/,
];

/** Share of non-blank lines that must look like code for text to be treated as code. */
const CODE_RATIO_THRESHOLD = 0.6;

export function classifyContent(text: string): ContentKind {
	const lines = splitLines(text).filter((line) => !isBlank(line));
	if (lines.length === 0) return "empty";

	const count = (patterns: readonly RegExp[]): number =>
		lines.filter((line) => patterns.some((pattern) => pattern.test(line))).length;
	const strong = count(STRONG_MARKDOWN);
	const weak = count(WEAK_MARKDOWN);
	const codeRatio = count(CODE_LINE) / lines.length;
	const fenceLines = lines.filter((line) => FENCE.test(line)).length;

	if (strong === 0 && codeRatio >= CODE_RATIO_THRESHOLD) return "code";
	if (fenceLines > 0) return strong - fenceLines + weak > 0 ? "mixed" : "markdown";
	if (strong > 0 || weak > 0) return codeRatio >= CODE_RATIO_THRESHOLD ? "mixed" : "markdown";
	return "plain-text";
}
