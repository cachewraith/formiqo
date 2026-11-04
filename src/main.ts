import { Plugin } from "obsidian";
import { createCommands } from "./editor/editor-commands";
import { createPasteHandler } from "./editor/paste-handler";
import { createReadingViewPostProcessor } from "./rendering/markdown-postprocessor";
import { ReadingViewStyler, rerenderReadingViews } from "./rendering/reading-view";
import { loadSettingsData, type FormiqoSettings } from "./settings/settings";
import { createDefaultSettings } from "./settings/settings-defaults";
import type { FormiqoHost } from "./settings/settings-host";
import { FormiqoSettingTab } from "./settings/settings-tab";

export default class FormiqoPlugin extends Plugin implements FormiqoHost {
	override settings: FormiqoSettings = createDefaultSettings();
	private readonly styler = new ReadingViewStyler(() => this.settings);

	override async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new FormiqoSettingTab(this.app, this, this));
		for (const command of createCommands(this)) this.addCommand(command);

		this.registerEvent(this.app.workspace.on("editor-paste", createPasteHandler(() => this.settings)));
		this.registerMarkdownPostProcessor(createReadingViewPostProcessor(() => this.settings));

		this.styler.attach(document);
		this.registerEvent(this.app.workspace.on("window-open", (win) => this.styler.attach(win.doc)));
		this.registerEvent(this.app.workspace.on("window-close", (win) => this.styler.detach(win.doc)));
	}

	override onunload(): void {
		this.styler.destroy();
	}

	async updateSettings(mutate: (settings: FormiqoSettings) => void): Promise<void> {
		const draft = structuredClone(this.settings);
		mutate(draft);
		await this.replaceSettings(loadSettingsData(draft).settings);
	}

	async resetSettings(): Promise<void> {
		await this.replaceSettings(createDefaultSettings());
	}

	private async loadSettings(): Promise<void> {
		const { settings, needsSave } = loadSettingsData(await this.loadData());
		this.settings = settings;
		if (needsSave) await this.saveData(settings);
	}

	private async replaceSettings(next: FormiqoSettings): Promise<void> {
		const readingChanged = readingSignature(this.settings) !== readingSignature(next);
		this.settings = next;
		await this.saveData(next);
		this.styler.refresh();
		if (readingChanged) rerenderReadingViews(this.app.workspace);
	}
}

/** Settings that affect what the Reading View post-processor does. */
function readingSignature(settings: FormiqoSettings): string {
	return JSON.stringify([settings.enabled, settings.readingView, settings.reading]);
}
