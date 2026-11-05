/** Command palette commands. */

import { Notice, type Command } from "obsidian";
import type { FormiqoHost } from "../settings/settings-host";
import type { FormatterId } from "../types";
import { formatInEditor, type EditorFormatRequest, type EditorLike, type FormatOutcome } from "./editor-integration";

export type Notify = (message: string) => void;

const showNotice: Notify = (message) => {
	new Notice(message);
};

const FORMATTER_LABELS: Readonly<Record<FormatterId, string>> = {
	whitespace: "whitespace",
	"code-blocks": "code fences",
	headings: "headings",
	tables: "tables",
	lists: "lists",
	blockquotes: "blockquotes",
	"horizontal-rules": "horizontal rules",
	links: "links",
};

export function createCommands(host: FormiqoHost, notify: Notify = showNotice): Command[] {
	const run = (editor: EditorLike, request: EditorFormatRequest, nothingFound?: string): void => {
		let outcome: FormatOutcome;
		try {
			outcome = formatInEditor(editor, host.settings, request);
		} catch (error) {
			console.error("Formiqo: formatting failed.", error instanceof Error ? error.message : "");
			notify("Formiqo: formatting failed. Your text was not changed.");
			return;
		}
		notify(describeOutcome(outcome, request.target, nothingFound));
	};

	return [
		{
			id: "format-selection",
			name: "Format selected Markdown",
			editorCheckCallback: (checking, editor) => {
				if (!host.settings.enabled || !editor.somethingSelected()) return false;
				if (!checking) run(editor, { target: "selection" });
				return true;
			},
		},
		{
			id: "format-document",
			name: "Format current document",
			editorCheckCallback: (checking, editor) => {
				if (!host.settings.enabled) return false;
				if (!checking) run(editor, { target: "document" });
				return true;
			},
		},
		{
			id: "fix-tables",
			name: "Fix Markdown tables",
			editorCheckCallback: (checking, editor) => {
				if (!host.settings.enabled) return false;
				if (!checking) {
					const target = editor.somethingSelected() ? "selection" : "document";
					run(editor, { target, mode: "repair", only: ["tables"] }, `Formiqo: no malformed tables found in the ${target}.`);
				}
				return true;
			},
		},
		{
			id: "toggle-paste-formatting",
			name: "Toggle automatic paste formatting",
			callback: async () => {
				await host.updateSettings((settings) => {
					settings.pasteFormatting = !settings.pasteFormatting;
				});
				notify(`Formiqo: automatic paste formatting ${host.settings.pasteFormatting ? "enabled" : "disabled"}.`);
			},
		},
		{
			id: "toggle-reading-view",
			name: "Toggle enhanced Reading View",
			callback: async () => {
				await host.updateSettings((settings) => {
					settings.readingView = !settings.readingView;
				});
				notify(`Formiqo: enhanced Reading View ${host.settings.readingView ? "enabled" : "disabled"}.`);
			},
		},
		{
			id: "toggle-studio-style",
			name: "Toggle Studio style",
			callback: async () => {
				// One switch for both views: turn everything off if any part is on, otherwise turn both on.
				const enable = !host.settings.studio.readingView && !host.settings.studio.editor;
				await host.updateSettings((settings) => {
					settings.studio.readingView = enable;
					settings.studio.editor = enable;
				});
				notify(`Formiqo: Studio style ${enable ? "enabled in the Reading View and editor" : "disabled"}.`);
			},
		},
	];
}

export function describeOutcome(outcome: FormatOutcome, subject: string, nothingFound?: string): string {
	switch (outcome.status) {
		case "changed":
			return outcome.applied.length === 0
				? `Formiqo: tidied the ${subject}.`
				: `Formiqo: fixed ${outcome.applied.map((id) => FORMATTER_LABELS[id]).join(", ")} in the ${subject}.`;
		case "unchanged":
			return nothingFound ?? `Formiqo: nothing to fix in the ${subject}.`;
		case "rejected":
			return `Formiqo: no changes made – a safety check failed (${outcome.reason}).`;
	}
}
