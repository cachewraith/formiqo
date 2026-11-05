import type { Command, Editor, MarkdownView } from "obsidian";
import { describe, expect, it } from "vitest";
import { createCommands, describeOutcome } from "../../src/editor/editor-commands";
import type { FormiqoSettings } from "../../src/settings/settings";
import { createDefaultSettings } from "../../src/settings/settings-defaults";
import type { FormiqoHost } from "../../src/settings/settings-host";
import { md } from "../helpers";
import { CmEditor } from "./cm-editor";

function createHost(): FormiqoHost & { settings: FormiqoSettings } {
	const host = {
		settings: createDefaultSettings(),
		updateSettings(mutate: (settings: FormiqoSettings) => void): Promise<void> {
			mutate(host.settings);
			return Promise.resolve();
		},
		resetSettings(): Promise<void> {
			host.settings = createDefaultSettings();
			return Promise.resolve();
		},
	};
	return host;
}

function setup() {
	const host = createHost();
	const messages: string[] = [];
	const commands = createCommands(host, (message) => messages.push(message));
	const byId = (id: string): Command => {
		const command = commands.find((candidate) => candidate.id === id);
		if (!command) throw new Error(`missing command ${id}`);
		return command;
	};
	const runEditorCommand = (id: string, editor: CmEditor, checking = false): unknown =>
		byId(id).editorCheckCallback?.(checking, editor as unknown as Editor, {} as MarkdownView);
	return { host, messages, commands, byId, runEditorCommand };
}

describe("commands", () => {
	it("registers the Formiqo commands without default hotkeys", () => {
		const { commands } = setup();
		expect(commands.map((command) => [command.id, command.name])).toEqual([
			["format-selection", "Format selected Markdown"],
			["format-document", "Format current document"],
			["fix-tables", "Fix Markdown tables"],
			["toggle-paste-formatting", "Toggle automatic paste formatting"],
			["toggle-reading-view", "Toggle enhanced Reading View"],
			["toggle-studio-style", "Toggle Studio style"],
		]);
		expect(commands.every((command) => command.hotkeys === undefined)).toBe(true);
	});

	it("only offers 'Format selected Markdown' when text is selected", () => {
		const { runEditorCommand } = setup();
		expect(runEditorCommand("format-selection", new CmEditor("* a"), true)).toBe(false);
		expect(runEditorCommand("format-selection", new CmEditor("* a", 0, 3), true)).toBe(true);
	});

	it("hides formatting commands when Formiqo is disabled", () => {
		const { host, runEditorCommand } = setup();
		host.settings.enabled = false;
		for (const id of ["format-selection", "format-document", "fix-tables"]) {
			expect(runEditorCommand(id, new CmEditor("* a", 0, 3), true)).toBe(false);
		}
	});

	it("formats the current document and reports what changed", () => {
		const { runEditorCommand, messages } = setup();
		const editor = new CmEditor(md("* a", "\\| x | y |", "\\| - | - |", ""));
		runEditorCommand("format-document", editor);
		expect(editor.getValue()).toBe(md("- a", "", "| x | y |", "| --- | --- |", ""));
		expect(messages).toEqual(["Formiqo: fixed tables, lists in the document."]);
	});

	it("reports when there is nothing to fix", () => {
		const { runEditorCommand, messages } = setup();
		runEditorCommand("format-document", new CmEditor("Fine.\n"));
		runEditorCommand("fix-tables", new CmEditor("Fine.\n"));
		expect(messages).toEqual(["Formiqo: nothing to fix in the document.", "Formiqo: no malformed tables found in the document."]);
	});

	it("fixes only tables, in the selection when there is one", () => {
		const { runEditorCommand } = setup();
		const doc = md("* keep", "", "\\| a | b |", "\\| - | - |", "", "\\| c | d |", "\\| - | - |");
		const start = doc.indexOf("\\| a");
		const editor = new CmEditor(doc, start, start + 3);
		runEditorCommand("fix-tables", editor);
		expect(editor.getValue()).toBe(md("* keep", "", "| a | b |", "| - | - |", "", "\\| c | d |", "\\| - | - |"));
	});

	it("toggles paste formatting and the Reading View", async () => {
		const { host, byId, messages } = setup();
		await byId("toggle-paste-formatting").callback?.();
		await byId("toggle-reading-view").callback?.();
		expect(host.settings.pasteFormatting).toBe(false);
		expect(host.settings.readingView).toBe(false);
		await byId("toggle-paste-formatting").callback?.();
		expect(host.settings.pasteFormatting).toBe(true);
		expect(messages).toEqual([
			"Formiqo: automatic paste formatting disabled.",
			"Formiqo: enhanced Reading View disabled.",
			"Formiqo: automatic paste formatting enabled.",
		]);
	});

	it("toggles the Studio style for the Reading View and editor together", async () => {
		const { host, byId, messages } = setup();
		await byId("toggle-studio-style").callback?.();
		expect(host.settings.studio).toEqual({ readingView: true, editor: true });
		host.settings.studio.editor = false;
		await byId("toggle-studio-style").callback?.();
		expect(host.settings.studio).toEqual({ readingView: false, editor: false });
		expect(messages).toEqual(["Formiqo: Studio style enabled in the Reading View and editor.", "Formiqo: Studio style disabled."]);
	});

	it("describes every outcome", () => {
		expect(describeOutcome({ status: "changed", applied: ["code-blocks", "horizontal-rules"] }, "selection")).toBe(
			"Formiqo: fixed code fences, horizontal rules in the selection.",
		);
		expect(describeOutcome({ status: "changed", applied: [] }, "document")).toBe("Formiqo: tidied the document.");
		expect(describeOutcome({ status: "rejected", reason: "x" }, "document")).toBe("Formiqo: no changes made – a safety check failed (x).");
	});
});
