/**
 * HorizontalRuleFormatter (normalize only)
 *
 * Rewrites top-level thematic breaks (`***`, `* * *`, `___`, `- - -`, `-----`)
 * as `---`. Because `---` directly below a paragraph would turn that paragraph
 * into a setext heading, a blank line is inserted first when needed, and
 * dash-only lines directly below a paragraph (which already *are* setext
 * underlines) are never touched. Nothing is rewritten in a note that starts with
 * a bare `---`, and the first line is skipped, so a rule can never create YAML
 * frontmatter.
 */

import type { Formatter } from "../types";
import { isThematicBreak } from "../utils/markdown-utils";
import { isBlank } from "../utils/text-utils";
import { isContentLine, isEditable } from "./shared";

const CANONICAL_RULE = "---";

export const horizontalRuleFormatter: Formatter = {
	id: "horizontal-rules",
	format(doc, ctx) {
		// A note starting with a bare `---` would gain YAML frontmatter if a later rule became `---`.
		const first = doc.lines[0];
		const couldCreateFrontmatter = first !== undefined && first.kind !== "frontmatter" && first.text.trimEnd() === CANONICAL_RULE;
		if (ctx.mode !== "normalize" || couldCreateFrontmatter) return doc.lines.map((line) => line.text);
		const out: string[] = [];
		doc.lines.forEach((line, index) => {
			const isCandidate = index > 0 && isEditable(line) && isThematicBreak(line.text) && !/^\s/.test(line.text);
			if (!isCandidate || line.text === CANONICAL_RULE) {
				out.push(line.text);
				return;
			}
			const followsParagraph = isContentLine(doc.lines[index - 1]);
			if (followsParagraph && isSetextUnderline(line.text)) {
				out.push(line.text);
				return;
			}
			if (followsParagraph && !isBlank(out[out.length - 1] ?? "")) out.push("");
			out.push(CANONICAL_RULE);
		});
		return out;
	},
};

/** A run of `-` (or `=`) without internal spaces directly under a paragraph is a setext underline. */
function isSetextUnderline(text: string): boolean {
	return /^(?:-+|=+)[ \t]*$/.test(text);
}
