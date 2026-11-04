/**
 * CodeBlockFormatter
 *
 * Only ever touches fence *delimiter* lines; code content is never modified.
 *
 * repair:    an unclosed fence would swallow the rest of the note, so a matching
 *            closing fence is added where the block ends (the end of the text,
 *            or the end of the blockquote it was opened in).
 * normalize: removes stray spaces between the fence and its language identifier
 *            (```` ```  js ```` -> ```` ```js ````), trims closing fences, and
 *            separates top-level fences from adjacent paragraphs with a blank line.
 */

import type { Formatter, ScannedDocument } from "../types";
import { parseFenceOpener } from "../core/markdown-scanner";
import { stripContainerPrefix } from "../utils/markdown-utils";
import { isBlank } from "../utils/text-utils";

interface Fence {
	readonly open: number;
	/** Index of the closing fence line, or -1 when the block is unclosed. */
	readonly close: number;
	/** Last line of the block (the closer, or the last content line when unclosed). */
	readonly end: number;
	readonly prefix: string;
	readonly marker: string;
}

export const codeBlockFormatter: Formatter = {
	id: "code-blocks",
	format(doc, ctx) {
		const normalize = ctx.mode === "normalize";
		const fences = findFences(doc);
		const openers = new Map(fences.map((fence) => [fence.open, fence]));
		const ends = new Map(fences.map((fence) => [fence.end, fence]));
		const isParagraph = (index: number): boolean => {
			const line = doc.lines[index];
			return line?.kind === "markdown" && !isBlank(line.text);
		};

		const out: string[] = [];
		doc.lines.forEach((line, index) => {
			const opener = openers.get(index);
			if (normalize && opener?.prefix === "" && isParagraph(index - 1)) out.push("");
			out.push(normalize ? normalizeDelimiter(line.text, opener !== undefined, ends.get(index)?.close === index) : line.text);

			const ending = ends.get(index);
			if (!ending) return;
			// An unclosed fence would swallow everything after it: close it where its block ends.
			if (ending.close === -1) out.push(`${ending.prefix}${ending.marker}`);
			if (normalize && ending.prefix === "" && isParagraph(index + 1)) out.push("");
		});
		return out;
	},
};

function normalizeDelimiter(text: string, isOpener: boolean, isCloser: boolean): string {
	if (isOpener) return normalizeOpener(text);
	return isCloser ? text.trimEnd() : text;
}

/** Pairs fence delimiter lines produced by the scanner (opener, then closer). */
function findFences(doc: ScannedDocument): Fence[] {
	const fences: Fence[] = [];
	for (const block of doc.blocks) {
		if (block.kind !== "code" || doc.lines[block.start]?.kind !== "fence") continue;
		const text = doc.lines[block.start]?.text ?? "";
		const { prefix, rest } = stripContainerPrefix(text);
		const opener = parseFenceOpener(rest);
		if (!opener) continue;
		const lastIsFence = block.end > block.start && doc.lines[block.end]?.kind === "fence";
		fences.push({
			open: block.start,
			close: lastIsFence ? block.end : -1,
			end: block.end,
			prefix,
			marker: opener.char.repeat(opener.length),
		});
	}
	return fences;
}

function normalizeOpener(text: string): string {
	const { prefix, rest } = stripContainerPrefix(text);
	const match = /^(`{3,}|~{3,})[ \t]*(.*?)[ \t]*$/.exec(rest);
	if (!match) return text;
	const [, marker = "", info = ""] = match;
	return `${prefix}${marker}${info}`;
}
