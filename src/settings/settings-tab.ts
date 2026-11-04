import { Modal, PluginSettingTab, Setting, type App, type Plugin } from "obsidian";
import type { PreservationOptions } from "../types";
import type { FormattingSettings, FormiqoSettings, ReadingSettings } from "./settings";
import type { FormiqoHost } from "./settings-host";

interface ToggleSpec<K extends string> {
	readonly key: K;
	readonly name: string;
	readonly desc: string;
}

const FORMATTING_TOGGLES: readonly ToggleSpec<keyof FormattingSettings>[] = [
	{ key: "tables", name: "Fix Markdown tables", desc: "Repair escaped pipes (\\|), missing or mismatched separator rows and rows with missing cells." },
	{ key: "headings", name: "Normalize headings", desc: "Add the missing space in ##Heading, tidy spacing and closing hashes. A single #word is treated as a tag and left alone." },
	{ key: "lists", name: "Normalize lists", desc: "Convert • bullets and ☐ checkboxes, unify bullet markers, fix task boxes and renumber inconsistent ordered lists." },
	{ key: "blockquotes", name: "Normalize blockquotes", desc: "Use a consistent \"> \" quote prefix when formatting with a command." },
	{ key: "horizontalRules", name: "Normalize horizontal rules", desc: "Rewrite ***, ___ and - - - as --- when formatting with a command." },
	{ key: "whitespace", name: "Normalize whitespace", desc: "Fix non-breaking spaces in list, quote and heading markers; when formatting with a command, also trim trailing spaces and collapse repeated blank lines." },
	{ key: "codeFences", name: "Tidy code fences", desc: "Close unclosed code fences and tidy fence lines. Code inside the block is never changed." },
	{ key: "links", name: "Repair links", desc: "Join links broken by a space, such as [text] (https://…)." },
];

const PRESERVATION_TOGGLES: readonly ToggleSpec<keyof PreservationOptions>[] = [
	{ key: "codeBlocks", name: "Preserve code blocks", desc: "Never apply formatting rules inside fenced or indented code blocks." },
	{ key: "inlineCode", name: "Preserve inline code", desc: "Never apply formatting rules inside `inline code`." },
	{ key: "frontmatter", name: "Preserve YAML frontmatter", desc: "Leave the properties block at the top of a note untouched." },
	{ key: "callouts", name: "Preserve Obsidian callouts", desc: "Leave callout markers (> [!note] and the > prefix of their lines) exactly as written. Tables and lists inside callouts are still repaired." },
	{ key: "html", name: "Preserve embedded HTML", desc: "Leave HTML blocks and inline HTML tags untouched." },
	{ key: "math", name: "Preserve mathematical expressions", desc: "Leave $inline$ and $$block$$ LaTeX untouched." },
];

const READING_TOGGLES: readonly ToggleSpec<keyof ReadingSettings>[] = [
	{ key: "tables", name: "Table styling", desc: "Clean borders, padding, header contrast and row striping." },
	{ key: "responsiveTables", name: "Responsive tables", desc: "Scroll wide tables horizontally instead of overflowing the page." },
	{ key: "codeBlocks", name: "Code block styling", desc: "Framed code blocks with language labels and horizontal scrolling, plus refined inline code." },
	{ key: "typography", name: "Typography enhancements", desc: "Heading hierarchy and spacing, comfortable line height, link and rule styling." },
	{ key: "lists", name: "List spacing", desc: "Consistent spacing for items, nested lists and task checkboxes." },
	{ key: "blockquotes", name: "Blockquote styling", desc: "Accent border and subtle background for quotes. Callouts keep their native look." },
];

export class FormiqoSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private readonly host: FormiqoHost,
	) {
		super(app, plugin);
	}

	// `display()` is the documented settings API for Obsidian < 1.13 (minAppVersion is 1.1.0);
	// the declarative getSettingDefinitions() API does not exist on those versions.
	override display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.host.settings;

		this.toggle(containerEl, "Enable Formiqo", "Master switch for paste formatting, Reading View enhancements and the formatting commands.", settings.enabled, (s, v) => (s.enabled = v));
		this.toggle(containerEl, "Automatic paste formatting", "Repair malformed Markdown when pasting. Valid Markdown, plain text and source code are pasted unchanged.", settings.pasteFormatting, (s, v) => (s.pasteFormatting = v));
		this.toggle(containerEl, "Enhanced Reading View", "Apply Formiqo's styling to rendered notes.", settings.readingView, (s, v) => (s.readingView = v));

		new Setting(containerEl).setName("Formatting").setHeading();
		for (const spec of FORMATTING_TOGGLES) {
			this.toggle(containerEl, spec.name, spec.desc, settings.formatting[spec.key], (s, v) => (s.formatting[spec.key] = v));
		}

		new Setting(containerEl).setName("Preservation").setHeading();
		for (const spec of PRESERVATION_TOGGLES) {
			this.toggle(containerEl, spec.name, spec.desc, settings.preservation[spec.key], (s, v) => (s.preservation[spec.key] = v));
		}

		new Setting(containerEl).setName("Reading View").setHeading();
		for (const spec of READING_TOGGLES) {
			this.toggle(containerEl, spec.name, spec.desc, settings.reading[spec.key], (s, v) => (s.reading[spec.key] = v));
		}

		new Setting(containerEl).setName("Reset").setHeading();
		new Setting(containerEl)
			.setName("Reset to defaults")
			.setDesc("Restore every Formiqo setting to its default value.")
			.addButton((button) =>
				button
					.setButtonText("Reset")
					// setDestructive() only exists since Obsidian 1.13; setWarning() works on every supported version.
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					.setWarning()
					.onClick(() => {
						new ConfirmResetModal(this.app, async () => {
							await this.host.resetSettings();
							// Re-render with the defaults; see the note on display() above.
							// eslint-disable-next-line @typescript-eslint/no-deprecated
							this.display();
						}).open();
					}),
			);
	}

	private toggle(container: HTMLElement, name: string, desc: string, value: boolean, assign: (settings: FormiqoSettings, value: boolean) => void): void {
		new Setting(container)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle.setValue(value).onChange(async (next) => {
					await this.host.updateSettings((settings) => assign(settings, next));
				}),
			);
	}
}

class ConfirmResetModal extends Modal {
	constructor(
		app: App,
		private readonly onConfirm: () => Promise<void>,
	) {
		super(app);
	}

	override onOpen(): void {
		this.titleEl.setText("Reset Formiqo settings?");
		this.contentEl.createEl("p", { text: "All Formiqo settings will be restored to their defaults." });
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((button) =>
				button
					.setButtonText("Reset")
					// See above: setDestructive() requires Obsidian 1.13.
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					.setWarning()
					.onClick(async () => {
						this.close();
						await this.onConfirm();
					}),
			);
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
