/**
 * Bridges Obsidian's Editor and the formatting engine.
 *
 * Only a narrow slice of the Editor API is used (see `EditorLike`), which keeps
 * this module testable and makes it obvious which editor features are relied on.
 */

import type { Editor, EditorChange } from "obsidian";
import { normalizeMarkdown } from "../core/markdown-normalizer";
import { scanMarkdown } from "../core/markdown-scanner";
import { toNormalizeOptions, type FormiqoSettings } from "../settings/settings";
import type { FormatMode, FormatterId, ScannedDocument } from "../types";
import { diffText } from "../utils/line-diff";
import { isBlank, splitLines } from "../utils/text-utils";

export type EditorLike = Pick<
	Editor,
	| "getValue"
	| "getCursor"
	| "listSelections"
	| "somethingSelected"
	| "offsetToPos"
	| "posToOffset"
	| "getLine"
	| "transaction"
	| "setSelection"
	| "replaceSelection"
>;

export type FormatOutcome =
	| { readonly status: "changed"; readonly applied: readonly FormatterId[] }
	| { readonly status: "unchanged" }
	| { readonly status: "rejected"; readonly reason: string };

export interface EditorFormatRequest {
	readonly target: "selection" | "document";
	readonly mode?: FormatMode;
	readonly only?: readonly FormatterId[];
}

interface OffsetRange {
	readonly from: number;
	readonly to: number;
}

/**
 * Formats the selection or the whole document in a single editor transaction,
 * so one undo step restores the previous text. Only changed lines are
 * replaced; text outside the target range is never touched.
 */
export function formatInEditor(editor: EditorLike, settings: FormiqoSettings, request: EditorFormatRequest): FormatOutcome {
	const documentText = editor.getValue();
	const range = request.target === "document" ? { from: 0, to: documentText.length } : selectionRange(editor, documentText, settings);
	const original = documentText.slice(range.from, range.to);

	const result = normalizeMarkdown(
		original,
		toNormalizeOptions(settings, {
			scope: request.target,
			allowFrontmatter: range.from === 0,
			...(request.mode ? { mode: request.mode } : {}),
			...(request.only ? { only: request.only } : {}),
		}),
	);
	if (result.rejected !== undefined) return { status: "rejected", reason: result.rejected };
	if (!result.changed) return { status: "unchanged" };

	const changes: EditorChange[] = diffText(original, result.text).map((change) => ({
		from: editor.offsetToPos(range.from + change.from),
		to: editor.offsetToPos(range.from + change.to),
		text: change.insert,
	}));
	const selectionStart = editor.offsetToPos(range.from);
	editor.transaction({ changes }, "formiqo");

	if (request.target === "selection") {
		editor.setSelection(selectionStart, editor.offsetToPos(range.from + result.text.length));
	}
	return { status: "changed", applied: result.applied };
}

/**
 * The primary selection expanded to whole lines, then to whole blocks: a
 * selection that starts or ends inside a code block, table or paragraph is
 * widened so partial structures are never formatted in isolation.
 */
function selectionRange(editor: EditorLike, documentText: string, settings: FormiqoSettings): OffsetRange {
	const lines = splitLines(documentText);
	const doc = scanMarkdown(lines, { preservation: settings.preservation, allowFrontmatter: true });
	const from = editor.getCursor("from");
	const to = editor.getCursor("to");

	let fromLine = from.line;
	let toLine = to.ch === 0 && to.line > from.line ? to.line - 1 : to.line;
	for (const block of doc.blocks) {
		if (block.start <= toLine && block.end >= fromLine) {
			fromLine = Math.min(fromLine, block.start);
			toLine = Math.max(toLine, block.end);
		}
	}
	while (isParagraphLine(doc, fromLine - 1) && isParagraphLine(doc, fromLine)) fromLine--;
	while (isParagraphLine(doc, toLine + 1) && isParagraphLine(doc, toLine)) toLine++;

	return {
		from: editor.posToOffset({ line: fromLine, ch: 0 }),
		to: editor.posToOffset({ line: toLine, ch: editor.getLine(toLine).length }),
	};
}

function isParagraphLine(doc: ScannedDocument, index: number): boolean {
	const line = doc.lines[index];
	return line?.kind === "markdown" && !isBlank(line.text);
}

/** True when the cursor sits inside a code block, math block, frontmatter, comment or HTML block. */
export function isCursorInProtectedBlock(editor: EditorLike, settings: FormiqoSettings): boolean {
	const doc = scanMarkdown(splitLines(editor.getValue()), { preservation: settings.preservation, allowFrontmatter: true });
	const kind = doc.lines[editor.getCursor("from").line]?.kind;
	return kind !== undefined && kind !== "markdown";
}
