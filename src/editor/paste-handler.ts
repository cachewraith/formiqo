/**
 * Automatic paste formatting.
 *
 * Hooks Obsidian's documented `editor-paste` workspace event (dispatched from
 * the CodeMirror 6 paste handler). Clipboard data is only read inside a real
 * paste event, never logged, and when nothing needs fixing the event is left
 * alone so Obsidian (or another plugin) performs its normal paste.
 */

import { classifyContent } from "../core/markdown-analyzer";
import { normalizeMarkdown } from "../core/markdown-normalizer";
import { toNormalizeOptions, type FormiqoSettings } from "../settings/settings";
import { isCursorInProtectedBlock, type EditorLike } from "./editor-integration";

export interface PasteInput {
	readonly text: string;
	readonly hasFiles: boolean;
	readonly multipleSelections: boolean;
	/** True when there is text before the cursor on its line. */
	readonly insertsMidLine: boolean;
	/** Evaluated lazily: only needed when the text is worth formatting. */
	readonly isInsideProtectedBlock: () => boolean;
}

/** Returns the text to insert instead of the clipboard text, or null for a normal paste. */
export function resolvePaste(input: PasteInput, settings: FormiqoSettings): string | null {
	if (!settings.enabled || !settings.pasteFormatting) return null;
	if (input.hasFiles || input.multipleSelections) return null;
	// The first pasted line joins the text before the cursor, so line-start repairs (headings,
	// bullets, table rows) would be wrong unless the pasted text itself starts on a new line.
	if (input.insertsMidLine && !/^\r?\n/.test(input.text)) return null;

	const kind = classifyContent(input.text);
	if (kind === "empty" || kind === "code") return null;
	if (input.isInsideProtectedBlock()) return null;

	const result = normalizeMarkdown(input.text, toNormalizeOptions(settings, { scope: "paste", allowFrontmatter: true }));
	return result.changed ? result.text : null;
}

export type PasteHandler = (evt: ClipboardEvent, editor: EditorLike) => void;

function isMidLine(editor: EditorLike): boolean {
	const cursor = editor.getCursor("from");
	return editor.getLine(cursor.line).slice(0, cursor.ch).trim() !== "";
}

export function createPasteHandler(getSettings: () => FormiqoSettings): PasteHandler {
	return (evt, editor) => {
		if (evt.defaultPrevented) return;
		const settings = getSettings();
		if (!settings.enabled || !settings.pasteFormatting) return;
		const data = evt.clipboardData;
		if (!data) return;

		let replacement: string | null;
		try {
			replacement = resolvePaste(
				{
					text: data.getData("text/plain"),
					hasFiles: data.files.length > 0,
					multipleSelections: editor.listSelections().length > 1,
					insertsMidLine: isMidLine(editor),
					isInsideProtectedBlock: () => isCursorInProtectedBlock(editor, settings),
				},
				settings,
			);
		} catch (error) {
			// Never break pasting: fall back to Obsidian's default behaviour. The clipboard text is not logged.
			console.error("Formiqo: paste formatting failed, using the default paste.", error instanceof Error ? error.message : "");
			return;
		}
		if (replacement === null) return;

		evt.preventDefault();
		editor.replaceSelection(replacement);
	};
}
