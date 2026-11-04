import { describe, expect, it } from "vitest";
import { formatInEditor, isCursorInProtectedBlock } from "../../src/editor/editor-integration";
import { createDefaultSettings } from "../../src/settings/settings-defaults";
import { md } from "../helpers";
import { CmEditor } from "./cm-editor";

const settings = createDefaultSettings();
const ESCAPED_TABLE = md("\\| a | b |", "\\| --- | --- |", "\\| 1 | 2 |");
const FIXED_TABLE = md("| a | b |", "| --- | --- |", "| 1 | 2 |");

describe("formatInEditor – document", () => {
	it("formats the document in a single undoable transaction", () => {
		const original = md("# Title", "", ESCAPED_TABLE, "", "* item", "");
		const editor = new CmEditor(original);

		const outcome = formatInEditor(editor, settings, { target: "document" });

		expect(outcome).toEqual({ status: "changed", applied: ["tables", "lists"] });
		expect(editor.getValue()).toBe(md("# Title", "", FIXED_TABLE, "", "- item", ""));
		expect(editor.transactions).toBe(1);
		expect(editor.undo()).toBe(true);
		expect(editor.getValue()).toBe(original);
		expect(editor.redo()).toBe(true);
		expect(editor.getValue()).toBe(md("# Title", "", FIXED_TABLE, "", "- item", ""));
	});

	it("keeps the cursor on unchanged text", () => {
		const editor = CmEditor.fromMarked(md(ESCAPED_TABLE, "", "Keep my cur‸sor here.", ""));
		formatInEditor(editor, settings, { target: "document" });
		const cursor = editor.getCursor();
		expect(editor.getLine(cursor.line)).toBe("Keep my cursor here.");
		expect(cursor.ch).toBe("Keep my cur".length);
	});

	it("reports unchanged documents without dispatching a transaction", () => {
		const editor = new CmEditor(md("# Title", "", "Fine.", ""));
		expect(formatInEditor(editor, settings, { target: "document" })).toEqual({ status: "unchanged" });
		expect(editor.transactions).toBe(0);
	});

	it("runs only the requested formatters in the requested mode", () => {
		const editor = new CmEditor(md(ESCAPED_TABLE, "", "* item", ""));
		formatInEditor(editor, settings, { target: "document", mode: "repair", only: ["tables"] });
		expect(editor.getValue()).toBe(md(FIXED_TABLE, "", "* item", ""));
	});

	it("respects disabled formatting settings", () => {
		const custom = createDefaultSettings();
		custom.formatting.lists = false;
		const editor = new CmEditor(md("* item", ""));
		expect(formatInEditor(editor, custom, { target: "document" })).toEqual({ status: "unchanged" });
	});
});

describe("formatInEditor – selection", () => {
	it("formats only the selected block and leaves the rest untouched", () => {
		const editor = CmEditor.fromMarked(md("* untouched", "", "⟦* a", "+ b⟧", "", "* untouched too"));
		formatInEditor(editor, settings, { target: "selection" });
		expect(editor.getValue()).toBe(md("* untouched", "", "- a", "- b", "", "* untouched too"));
	});

	it("expands a partial table selection to the whole table and reselects the result", () => {
		const editor = CmEditor.fromMarked(md("Intro", "", "\\| a | b |", "\\| --- | ⟦--- |", "\\| 1 |⟧ 2 |", "", "Outro"));
		formatInEditor(editor, settings, { target: "selection" });
		expect(editor.getValue()).toBe(md("Intro", "", FIXED_TABLE, "", "Outro"));
		expect(editor.selectedText()).toBe(FIXED_TABLE);
	});

	it("expands a selection inside a code block to the whole block and leaves code alone", () => {
		const editor = CmEditor.fromMarked(md("```", "⟦* code⟧", "```"));
		expect(formatInEditor(editor, settings, { target: "selection" })).toEqual({ status: "unchanged" });
	});

	it("does not add a trailing newline to a selection", () => {
		const editor = CmEditor.fromMarked(md("⟦* a⟧", "next"));
		formatInEditor(editor, settings, { target: "selection" });
		expect(editor.getValue()).toBe(md("- a", "next"));
	});

	it("undoes a selection format in one step", () => {
		const original = md("text", "", "* a", "* b");
		const editor = new CmEditor(original, original.indexOf("* a"), original.length);
		formatInEditor(editor, settings, { target: "selection" });
		editor.undo();
		expect(editor.getValue()).toBe(original);
	});
});

describe("isCursorInProtectedBlock", () => {
	it.each([
		["code block", md("```", "co‸de", "```"), true],
		["frontmatter", md("---", "ti‸tle: x", "---"), true],
		["math block", md("$$", "x‸", "$$"), true],
		["unclosed fence", md("```", "a", "b‸"), true],
		["after a code block", md("```", "a", "```", "‸"), false],
		["plain text", "hel‸lo", false],
	])("%s", (_name, marked, expected) => {
		expect(isCursorInProtectedBlock(CmEditor.fromMarked(marked), settings)).toBe(expected);
	});
});
