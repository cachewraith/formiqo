// @vitest-environment happy-dom
import { App, MarkdownView, type Plugin as MockPlugin } from "./mocks/obsidian";
import { beforeEach, describe, expect, it } from "vitest";
import FormiqoPlugin from "../src/main";
import { createDefaultSettings } from "../src/settings/settings-defaults";
import { md } from "./helpers";
import { CmEditor } from "./editor/cm-editor";

type Mocked = Omit<FormiqoPlugin, "app"> & Omit<MockPlugin, "app" | "addCommand"> & { app: App };

async function loadPlugin(storedData: unknown = null): Promise<Mocked> {
	const plugin = new FormiqoPlugin(new App() as never, {} as never) as unknown as Mocked;
	plugin.storedData = storedData;
	await plugin.onload();
	return plugin;
}

function pasteEvent(text: string): ClipboardEvent {
	let prevented = false;
	return {
		get defaultPrevented() {
			return prevented;
		},
		preventDefault: () => (prevented = true),
		clipboardData: { getData: () => text, files: { length: 0 } },
	} as unknown as ClipboardEvent;
}

describe("FormiqoPlugin lifecycle", () => {
	beforeEach(() => {
		document.body.className = "";
	});

	it("registers commands, the paste handler, a post-processor and the settings tab", async () => {
		const plugin = await loadPlugin();
		expect(plugin.commands.map((command) => command.id)).toEqual([
			"format-selection",
			"format-document",
			"fix-tables",
			"toggle-paste-formatting",
			"toggle-reading-view",
		]);
		expect(plugin.app.workspace.handlers.get("editor-paste")).toHaveLength(1);
		expect(plugin.app.workspace.handlers.get("window-open")).toHaveLength(1);
		expect(plugin.postProcessors).toHaveLength(1);
		expect(plugin.settingTabs).toHaveLength(1);
		// Every workspace handler is registered through registerEvent so Obsidian detaches it on unload.
		expect(plugin.events).toHaveLength(3);
	});

	it("does not write settings on first load", async () => {
		const plugin = await loadPlugin();
		expect(plugin.saveCount).toBe(0);
		expect(plugin.settings).toEqual(createDefaultSettings());
	});

	it("repairs outdated stored settings on load", async () => {
		const plugin = await loadPlugin({ enabled: true, pasteFormatting: false });
		expect(plugin.settings.pasteFormatting).toBe(false);
		expect(plugin.saveCount).toBe(1);
		expect(plugin.storedData).toEqual(plugin.settings);
	});

	it("persists setting changes across reloads", async () => {
		const plugin = await loadPlugin();
		await plugin.updateSettings((settings) => {
			settings.formatting.tables = false;
			settings.reading.typography = false;
		});
		const reloaded = await loadPlugin(plugin.storedData);
		expect(reloaded.settings.formatting.tables).toBe(false);
		expect(reloaded.settings.reading.typography).toBe(false);
	});

	it("validates settings passed to updateSettings", async () => {
		const plugin = await loadPlugin();
		await plugin.updateSettings((settings) => {
			(settings as unknown as Record<string, unknown>).enabled = "nope";
		});
		expect(plugin.settings.enabled).toBe(true);
	});

	it("resets to defaults", async () => {
		const plugin = await loadPlugin();
		await plugin.updateSettings((settings) => (settings.enabled = false));
		await plugin.resetSettings();
		expect(plugin.settings).toEqual(createDefaultSettings());
		expect(plugin.storedData).toEqual(createDefaultSettings());
	});

	it("applies Reading View classes to the body and removes them on unload", async () => {
		const plugin = await loadPlugin();
		expect(document.body.classList.contains("formiqo-reading")).toBe(true);
		expect(document.body.classList.contains("formiqo-tables")).toBe(true);

		await plugin.updateSettings((settings) => (settings.reading.tables = false));
		expect(document.body.classList.contains("formiqo-tables")).toBe(false);

		await plugin.updateSettings((settings) => (settings.readingView = false));
		expect(document.body.classList.contains("formiqo-reading")).toBe(false);

		await plugin.updateSettings((settings) => (settings.readingView = true));
		plugin.onunload();
		expect([...document.body.classList].filter((name) => name.startsWith("formiqo"))).toEqual([]);
	});

	it("styles popout windows too", async () => {
		const plugin = await loadPlugin();
		const popout = document.implementation.createHTMLDocument("popout");
		plugin.app.workspace.trigger("window-open", { doc: popout });
		expect(popout.body.classList.contains("formiqo-reading")).toBe(true);
		plugin.app.workspace.trigger("window-close", { doc: popout });
		expect(popout.body.classList.contains("formiqo-reading")).toBe(false);
	});

	it("re-renders open Reading Views only when reading settings change", async () => {
		const plugin = await loadPlugin();
		const view = new MarkdownView();
		plugin.app.workspace.leaves = [{ view }];
		await plugin.updateSettings((settings) => (settings.formatting.links = false));
		expect(view.previewMode.rerenderCount).toBe(0);
		await plugin.updateSettings((settings) => (settings.reading.codeBlocks = false));
		expect(view.previewMode.rerenderCount).toBe(1);
	});

	it("formats pastes end-to-end through the registered handler", async () => {
		const plugin = await loadPlugin();
		const editor = new CmEditor("");
		plugin.app.workspace.trigger("editor-paste", pasteEvent(md("\\| a | b |", "\\| - | - |")), editor);
		expect(editor.getValue()).toBe(md("| a | b |", "| - | - |"));

		await plugin.updateSettings((settings) => (settings.pasteFormatting = false));
		const second = new CmEditor("");
		const event = pasteEvent(md("\\| a | b |", "\\| - | - |"));
		plugin.app.workspace.trigger("editor-paste", event, second);
		expect(event.defaultPrevented).toBe(false);
	});
});
