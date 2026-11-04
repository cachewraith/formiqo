/**
 * LinkFormatter
 *
 * repair:    `[text] (https://...)` -> `[text](https://...)` (also for images).
 *            A space between `]` and `(` breaks the link; this is only fixed when
 *            the target is clearly a URL or a file path, never for task boxes such
 *            as `- [ ] (optional) step` or `- [/] (url)`.
 * normalize: trims padding inside the parentheses: `[a]( url )` -> `[a](url)`.
 *
 * Wikilinks, embeds, code spans, inline math and inline HTML are never touched.
 */

import type { Formatter } from "../types";
import { findProtectedInlineRanges, overlapsRanges, type Range } from "../utils/inline-spans";
import { isEscaped } from "../utils/text-utils";
import { mapEditableLines } from "./shared";

const URL_TARGET = String.raw`(?:https?:\/\/|mailto:|obsidian:\/\/|file:\/\/)[^\s()<>]+|[^\s()<>]+\.(?:md|png|jpe?g|gif|svg|webp|pdf|canvas)`;
const DETACHED_LINK = new RegExp(String.raw`(!?)\[([^\[\]\n]+)\][ \t]+\((${URL_TARGET})\)`, "g");
const PADDED_TARGET = /(!?\[[^[\]\n]*\])\([ \t]+([^\s()<>]+)((?:[ \t]+"[^"\n]*")?)[ \t]*\)|(!?\[[^[\]\n]*\])\(([^\s()<>]+)((?:[ \t]+"[^"\n]*")?)[ \t]+\)/g;
/** Single-character labels look like task boxes, including custom statuses such as `[/]` or `[-]`. */
const TASK_LIKE_TEXT = /^.$/u;

export const linkFormatter: Formatter = {
	id: "links",
	format(doc, ctx) {
		return mapEditableLines(doc, (text) => {
			if (!text.includes("](") && !text.includes("] (")) return text;
			const ranges = findProtectedInlineRanges(text, ctx.preservation);
			const repaired = replaceOutside(text, ranges, DETACHED_LINK, (match) => {
				const [, bang = "", label = "", target = ""] = match;
				const isReferenceOrFootnote = match.input[match.index - 1] === "]" || label.startsWith("^");
				return TASK_LIKE_TEXT.test(label) || isReferenceOrFootnote ? null : `${bang}[${label}](${target})`;
			});
			if (ctx.mode !== "normalize") return repaired;
			return replaceOutside(repaired, findProtectedInlineRanges(repaired, ctx.preservation), PADDED_TARGET, (match) => {
				const label = match[1] ?? match[4] ?? "";
				const target = match[2] ?? match[5] ?? "";
				const title = (match[3] ?? match[6] ?? "").trim();
				return `${label}(${target}${title === "" ? "" : ` ${title}`})`;
			});
		});
	},
};

/** Applies `replace` to regex matches that do not overlap protected ranges and are not escaped. */
function replaceOutside(text: string, ranges: readonly Range[], pattern: RegExp, replace: (match: RegExpExecArray) => string | null): string {
	let out = "";
	let last = 0;
	for (const match of text.matchAll(pattern)) {
		const start = match.index;
		const end = start + match[0].length;
		if (overlapsRanges(ranges, start, end) || isEscaped(text, start)) continue;
		const replacement = replace(match);
		if (replacement === null) continue;
		out += text.slice(last, start) + replacement;
		last = end;
	}
	return out + text.slice(last);
}
