import { describe, expect, it, vi } from "vitest";
import { createPasteHandler, resolvePaste } from "../../src/editor/paste-handler";
import type { FormiqoSettings } from "../../src/settings/settings";
import { createDefaultSettings } from "../../src/settings/settings-defaults";
import { md } from "../helpers";
import { CmEditor } from "./cm-editor";

interface FakePaste {
	event: ClipboardEvent;
	getData: ReturnType<typeof vi.fn>;
	preventDefault: ReturnType<typeof vi.fn>;
}

function fakePaste(text: string, options: { files?: number; defaultPrevented?: boolean; noData?: boolean } = {}): FakePaste {
	const getData = vi.fn((type: string) => (type === "text/plain" ? text : ""));
	const state = { defaultPrevented: options.defaultPrevented ?? false };
	const preventDefault = vi.fn(() => {
		state.defaultPrevented = true;
	});
	const event = {
		get defaultPrevented() {
			return state.defaultPrevented;
		},
		preventDefault,
		clipboardData: options.noData ? null : { getData, files: { length: options.files ?? 0 } },
	} as unknown as ClipboardEvent;
	return { event, getData, preventDefault };
}

const ESCAPED = md("\\| | Dev | Staging |", "\\| --- | --- | --- |", "\\| Directory | `/var/www/dev` | `/var/www/staging` |");
const FIXED = md("| | Dev | Staging |", "| --- | --- | --- |", "| Directory | `/var/www/dev` | `/var/www/staging` |");

function setup(settings: FormiqoSettings = createDefaultSettings(), doc = "", cursor = doc.length) {
	const editor = new CmEditor(doc, cursor);
	const handler = createPasteHandler(() => settings);
	return { editor, handler, settings };
}

describe("paste handler", () => {
	it("repairs an escaped table and inserts it in one undoable step", () => {
		const { editor, handler } = setup(createDefaultSettings(), "Before\n\n");
		const paste = fakePaste(ESCAPED);

		handler(paste.event, editor);

		expect(paste.preventDefault).toHaveBeenCalledTimes(1);
		expect(editor.getValue()).toBe(`Before\n\n${FIXED}`);
		expect(editor.transactions).toBe(1);
		editor.undo();
		expect(editor.getValue()).toBe("Before\n\n");
	});

	it("replaces the current selection, like a normal paste", () => {
		const doc = "keep\nSELECTED\nkeep";
		const editor = new CmEditor(doc, 5, 13);
		createPasteHandler(() => createDefaultSettings())(fakePaste(ESCAPED).event, editor);
		expect(editor.getValue()).toBe(`keep\n${FIXED}\nkeep`);
	});

	it.each([
		["valid Markdown", md("| a | b |", "| --- | --- |", "| 1 | 2 |")],
		["plain text", "Just some words."],
		["source code", md("const a = 1;", "function f() {", "  return a;", "}")],
		["whitespace only", "   \n  "],
	])("lets Obsidian paste %s normally", (_name, text) => {
		const { editor, handler } = setup();
		const paste = fakePaste(text);
		handler(paste.event, editor);
		expect(paste.preventDefault).not.toHaveBeenCalled();
		expect(editor.transactions).toBe(0);
	});

	it("does nothing when another handler already handled the paste", () => {
		const { editor, handler } = setup();
		const paste = fakePaste(ESCAPED, { defaultPrevented: true });
		handler(paste.event, editor);
		expect(paste.getData).not.toHaveBeenCalled();
		expect(editor.transactions).toBe(0);
	});

	it("does not read the clipboard when paste formatting or the plugin is disabled", () => {
		for (const disable of [(s: FormiqoSettings) => (s.pasteFormatting = false), (s: FormiqoSettings) => (s.enabled = false)]) {
			const settings = createDefaultSettings();
			disable(settings);
			const { editor, handler } = setup(settings);
			const paste = fakePaste(ESCAPED);
			handler(paste.event, editor);
			expect(paste.getData).not.toHaveBeenCalled();
			expect(paste.preventDefault).not.toHaveBeenCalled();
		}
	});

	it("leaves file pastes (images, attachments) to Obsidian", () => {
		const { editor, handler } = setup();
		const paste = fakePaste(ESCAPED, { files: 1 });
		handler(paste.event, editor);
		expect(paste.preventDefault).not.toHaveBeenCalled();
	});

	it("handles missing clipboard data safely", () => {
		const { editor, handler } = setup();
		const paste = fakePaste(ESCAPED, { noData: true });
		expect(() => handler(paste.event, editor)).not.toThrow();
		expect(paste.preventDefault).not.toHaveBeenCalled();
	});

	it("never formats when pasting inside a code block", () => {
		const doc = md("```md", "", "```");
		const { editor, handler } = setup(createDefaultSettings(), doc, doc.indexOf("\n") + 1);
		const paste = fakePaste(ESCAPED);
		handler(paste.event, editor);
		expect(paste.preventDefault).not.toHaveBeenCalled();
	});

	it("does not interfere with multi-cursor pastes", () => {
		const { editor, handler } = setup(createDefaultSettings(), "a\nb", 0);
		editor.addCursor(2);
		const paste = fakePaste(ESCAPED);
		handler(paste.event, editor);
		expect(paste.preventDefault).not.toHaveBeenCalled();
	});

	it("does not apply line-start repairs to a single line pasted mid-sentence", () => {
		const { editor, handler } = setup(createDefaultSettings(), "Shopping: ");
		const paste = fakePaste("• milk");
		handler(paste.event, editor);
		expect(paste.preventDefault).not.toHaveBeenCalled();

		const atLineStart = setup(createDefaultSettings(), "Intro\n");
		atLineStart.handler(fakePaste("• milk").event, atLineStart.editor);
		expect(atLineStart.editor.getValue()).toBe("Intro\n- milk");
	});

	it("handles a second paste independently (no duplicate insertion)", () => {
		const { editor, handler } = setup();
		handler(fakePaste(ESCAPED).event, editor);
		handler(fakePaste(`\n${ESCAPED}`).event, editor);
		expect(editor.getValue()).toBe(`${FIXED}\n${FIXED}`);
		expect(editor.transactions).toBe(2);
	});
});

describe("resolvePaste", () => {
	const input = (text: string) => ({ text, hasFiles: false, multipleSelections: false, insertsMidLine: false, isInsideProtectedBlock: () => false });

	it("returns repaired text or null", () => {
		const settings = createDefaultSettings();
		expect(resolvePaste(input(ESCAPED), settings)).toBe(FIXED);
		expect(resolvePaste(input(FIXED), settings)).toBeNull();
	});

	it("only checks the cursor context when the text could be formatted", () => {
		const isInsideProtectedBlock = vi.fn(() => false);
		resolvePaste({ ...input("const a = 1;\nlet b = 2;"), isInsideProtectedBlock }, createDefaultSettings());
		expect(isInsideProtectedBlock).not.toHaveBeenCalled();
	});

	it("respects the table formatting toggle", () => {
		const settings = createDefaultSettings();
		settings.formatting.tables = false;
		expect(resolvePaste(input(ESCAPED), settings)).toBeNull();
	});
});
