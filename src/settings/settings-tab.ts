import {
	Modal,
	PluginSettingTab,
	requireApiVersion,
	Setting,
	type App,
	type Plugin,
	type SettingDefinition,
	type SettingDefinitionItem,
} from "obsidian";
import type { PreservationOptions } from "../types";
import type { FormattingSettings, FormiqoSettings, StudioSettings, ReadingSettings } from "./settings";
import type { FormiqoHost } from "./settings-host";

/**
 * Obsidian's red "destructive" button style. Applied as a class because
 * setWarning() is deprecated and its replacement, setDestructive(), only
 * exists since Obsidian 1.13.
 */
const WARNING_BUTTON_CLASS = "mod-warning";

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

const STUDIO_TOGGLES: readonly ToggleSpec<keyof StudioSettings>[] = [
	{ key: "readingView", name: "Studio style in Reading View", desc: "A clean, editor-like look for rendered notes: system fonts, crisp headings, blue links, framed code with syntax colours, and striped tables. Replaces Formiqo's own Reading View look; responsive tables and code labels still apply." },
	{ key: "editor", name: "Studio style in the editor", desc: "The matching look while writing, in Live Preview and Source mode: system and code fonts, coloured headings, links and list markers." },
];

/** Top-level settings keys, and `group.field` keys for the nested groups. */
type SettingKey =
	| "enabled"
	| "pasteFormatting"
	| "readingView"
	| `formatting.${keyof FormattingSettings}`
	| `preservation.${keyof PreservationOptions}`
	| `reading.${keyof ReadingSettings}`
	| `studio.${keyof StudioSettings}`;

interface Section {
	/** Null for the first section, which (per Obsidian's guidelines) has no heading. */
	readonly heading: string | null;
	readonly toggles: readonly ToggleSpec<SettingKey>[];
}

const prefixed = <G extends string, K extends string>(group: G, specs: readonly ToggleSpec<K>[]): ToggleSpec<`${G}.${K}`>[] =>
	specs.map((spec) => ({ ...spec, key: `${group}.${spec.key}` as const }));

/** Single source of truth for both the declarative (1.13+) and imperative (< 1.13) settings UI. */
const SECTIONS: readonly Section[] = [
	{
		heading: null,
		toggles: [
			{ key: "enabled", name: "Enable Formiqo", desc: "Master switch for paste formatting, Reading View enhancements and the formatting commands." },
			{ key: "pasteFormatting", name: "Automatic paste formatting", desc: "Repair malformed Markdown when pasting. Valid Markdown, plain text and source code are pasted unchanged." },
			{ key: "readingView", name: "Enhanced Reading View", desc: "Apply Formiqo's styling to rendered notes." },
		],
	},
	{ heading: "Formatting", toggles: prefixed("formatting", FORMATTING_TOGGLES) },
	{ heading: "Preservation", toggles: prefixed("preservation", PRESERVATION_TOGGLES) },
	{ heading: "Reading View", toggles: prefixed("reading", READING_TOGGLES) },
	{ heading: "Studio style", toggles: prefixed("studio", STUDIO_TOGGLES) },
];

const SETTING_KEYS: ReadonlySet<string> = new Set(SECTIONS.flatMap((section) => section.toggles.map((toggle) => toggle.key)));

const RESET = {
	heading: "Reset",
	name: "Reset to defaults",
	desc: "Restore every Formiqo setting to its default value.",
} as const;

function isSettingKey(key: string): key is SettingKey {
	return SETTING_KEYS.has(key);
}

/** The object holding a key's value and the property name within it. */
function locate(settings: FormiqoSettings, key: SettingKey): [Record<string, unknown>, string] {
	const [group, field] = key.split(".") as [string, string | undefined];
	if (field === undefined) return [settings as unknown as Record<string, unknown>, group];
	return [(settings as unknown as Record<string, Record<string, unknown>>)[group] ?? {}, field];
}

export function readToggle(settings: FormiqoSettings, key: SettingKey): boolean {
	const [container, property] = locate(settings, key);
	return container[property] === true;
}

function writeToggle(settings: FormiqoSettings, key: SettingKey, value: boolean): void {
	const [container, property] = locate(settings, key);
	container[property] = value;
}

/**
 * Obsidian 1.13+ renders (and indexes for settings search) the declarative
 * definitions and skips display(); older versions call display(). Both are
 * generated from SECTIONS, so they cannot drift apart.
 */
export class FormiqoSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private readonly host: FormiqoHost,
	) {
		super(app, plugin);
	}

	override getSettingDefinitions(): SettingDefinitionItem[] {
		const toDefinition = (toggle: ToggleSpec<SettingKey>): SettingDefinition => ({
			name: toggle.name,
			desc: toggle.desc,
			control: { type: "toggle", key: toggle.key },
		});
		const items: SettingDefinitionItem[] = [];
		for (const section of SECTIONS) {
			if (section.heading === null) items.push(...section.toggles.map(toDefinition));
			else items.push({ type: "group", heading: section.heading, items: section.toggles.map(toDefinition) });
		}
		items.push({
			type: "group",
			heading: RESET.heading,
			items: [{ name: RESET.name, desc: RESET.desc, action: () => this.confirmReset() }],
		});
		return items;
	}

	override getControlValue(key: string): unknown {
		return isSettingKey(key) ? readToggle(this.host.settings, key) : undefined;
	}

	/** Writes go through the plugin so they are validated, saved and applied. */
	override async setControlValue(key: string, value: unknown): Promise<void> {
		if (!isSettingKey(key) || typeof value !== "boolean") return;
		await this.host.updateSettings((settings) => writeToggle(settings, key, value));
	}

	/** Imperative rendering for Obsidian versions before 1.13. */
	override display(): void {
		this.render();
	}

	private render(): void {
		const { containerEl } = this;
		containerEl.empty();

		for (const section of SECTIONS) {
			if (section.heading !== null) new Setting(containerEl).setName(section.heading).setHeading();
			for (const toggle of section.toggles) {
				new Setting(containerEl)
					.setName(toggle.name)
					.setDesc(toggle.desc)
					.addToggle((component) =>
						component.setValue(readToggle(this.host.settings, toggle.key)).onChange(async (value) => {
							await this.host.updateSettings((settings) => writeToggle(settings, toggle.key, value));
						}),
					);
			}
		}

		new Setting(containerEl).setName(RESET.heading).setHeading();
		new Setting(containerEl)
			.setName(RESET.name)
			.setDesc(RESET.desc)
			.addButton((button) =>
				button
					.setButtonText("Reset")
					.setClass(WARNING_BUTTON_CLASS)
					.onClick(() => this.confirmReset()),
			);
	}

	private confirmReset(): void {
		new ConfirmResetModal(this.app, async () => {
			await this.host.resetSettings();
			this.refresh();
		}).open();
	}

	/**
	 * display() does not refresh declarative settings on 1.13+ (the first
	 * version with getSettingDefinitions); update() does. The version must be a
	 * string literal so Obsidian's API-compatibility lint recognises the guard.
	 */
	private refresh(): void {
		if (requireApiVersion("1.13.0")) {
			this.update();
		} else {
			this.render();
		}
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
					.setClass(WARNING_BUTTON_CLASS)
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
