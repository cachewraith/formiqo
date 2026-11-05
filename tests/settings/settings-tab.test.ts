import type { SettingDefinition, SettingDefinitionGroup, SettingDefinitionItem } from "obsidian";
import { beforeEach, describe, expect, it } from "vitest";
import type { FormiqoSettings } from "../../src/settings/settings";
import { createDefaultSettings } from "../../src/settings/settings-defaults";
import { FormiqoSettingTab } from "../../src/settings/settings-tab";
import { apiVersion, App, Modal, Plugin, Setting } from "../mocks/obsidian";

const created = (): Setting[] => Setting.created;

function setup() {
	const host = {
		settings: createDefaultSettings(),
		resets: 0,
		updateSettings(mutate: (settings: FormiqoSettings) => void): Promise<void> {
			mutate(host.settings);
			return Promise.resolve();
		},
		resetSettings(): Promise<void> {
			host.resets++;
			host.settings = createDefaultSettings();
			return Promise.resolve();
		},
	};
	const app = new App() as never;
	const tab = new FormiqoSettingTab(app, new Plugin(new App(), {}) as never, host);
	const find = (name: string): Setting => {
		const setting = created().find((candidate) => candidate.name === name);
		if (!setting) throw new Error(`missing setting ${name}`);
		return setting;
	};
	return { host, tab, find, mocked: tab as unknown as { updates: number } };
}

const isGroup = (item: SettingDefinitionItem): item is SettingDefinitionGroup => "type" in item;
const definitionsOf = (items: readonly SettingDefinitionItem[]): SettingDefinition[] =>
	items.flatMap((item) => (isGroup(item) ? definitionsOf((item.items ?? []) as SettingDefinitionItem[]) : [item as SettingDefinition]));
const controlKey = (definition: SettingDefinition): string | undefined => ("control" in definition ? definition.control.key : undefined);

describe("FormiqoSettingTab – declarative (Obsidian 1.13+)", () => {
	beforeEach(() => {
		created().length = 0;
		apiVersion.current = "1.15.0";
	});

	it("groups settings under headings, with the general toggles first and ungrouped", () => {
		const items = setup().tab.getSettingDefinitions();
		expect(items.slice(0, 3).map((item) => ("name" in item ? item.name : null))).toEqual(["Enable Formiqo", "Automatic paste formatting", "Enhanced Reading View"]);
		expect(items.filter(isGroup).map((group) => [group.heading, group.items?.length])).toEqual([
			["Formatting", 8],
			["Preservation", 6],
			["Reading View", 6],
			["Studio style", 2],
			["Reset", 1],
		]);
	});

	it("binds every toggle to a unique key that reads the current settings", () => {
		const { tab, host } = setup();
		host.settings.formatting.links = false;
		const keys = definitionsOf(tab.getSettingDefinitions()).map(controlKey).filter((key): key is string => key !== undefined);
		expect(new Set(keys).size).toBe(25);
		expect(tab.getControlValue("studio.readingView")).toBe(false);
		expect(tab.getControlValue("formatting.links")).toBe(false);
		expect(tab.getControlValue("reading.tables")).toBe(true);
		expect(tab.getControlValue("enabled")).toBe(true);
		expect(tab.getControlValue("bogus")).toBeUndefined();
	});

	it("writes changes through the host and ignores invalid writes", async () => {
		const { tab, host } = setup();
		await tab.setControlValue("preservation.math", false);
		await tab.setControlValue("pasteFormatting", false);
		await tab.setControlValue("formatting.tables", "no");
		await tab.setControlValue("formatting.nonexistent", false);
		expect(host.settings.preservation.math).toBe(false);
		expect(host.settings.pasteFormatting).toBe(false);
		expect(host.settings.formatting.tables).toBe(true);
		expect(host.settings.formatting).not.toHaveProperty("nonexistent");
	});

	it("resets after confirmation and refreshes with update()", async () => {
		const { tab, host, mocked } = setup();
		host.settings.enabled = false;
		const reset = definitionsOf(tab.getSettingDefinitions()).find((definition) => definition.name === "Reset to defaults");
		const before = Modal.opened;
		(reset as { action: () => void }).action();
		expect(Modal.opened).toBe(before + 1);
		expect(host.resets).toBe(0);
		await created()[created().length - 1]?.buttonClicks[1]?.();
		expect(host.resets).toBe(1);
		expect(host.settings.enabled).toBe(true);
		expect(mocked.updates).toBe(1);
	});
});

describe("FormiqoSettingTab – imperative (Obsidian < 1.13)", () => {
	beforeEach(() => {
		created().length = 0;
		apiVersion.current = "1.12.0";
	});

	const display = (tab: FormiqoSettingTab): void => {
		tab.display(); // eslint-disable-line @typescript-eslint/no-deprecated -- display() is what Obsidian < 1.13 calls
	};

	it("renders the same settings as the declarative definitions", () => {
		const { tab } = setup();
		display(tab);
		const imperative = created().filter((setting) => setting.toggleChange !== null).map((setting) => setting.name);
		const declarative = definitionsOf(tab.getSettingDefinitions()).filter((definition) => controlKey(definition) !== undefined).map((definition) => definition.name);
		expect(imperative).toEqual(declarative);
		expect(created().filter((setting) => setting.isHeading).map((setting) => setting.name)).toEqual(["Formatting", "Preservation", "Reading View", "Studio style", "Reset"]);
	});

	it("shows current values and writes changes through the host", async () => {
		const { host, tab, find } = setup();
		display(tab);
		expect(find("Fix Markdown tables").toggleValue).toBe(true);
		await find("Fix Markdown tables").toggleChange?.(false);
		await find("Preserve mathematical expressions").toggleChange?.(false);
		await find("Responsive tables").toggleChange?.(false);
		await find("Enable Formiqo").toggleChange?.(false);
		expect(host.settings.formatting.tables).toBe(false);
		expect(host.settings.preservation.math).toBe(false);
		expect(host.settings.reading.responsiveTables).toBe(false);
		expect(host.settings.enabled).toBe(false);
	});

	it("asks for confirmation before resetting and re-renders without update()", async () => {
		const { host, tab, find, mocked } = setup();
		display(tab);
		await find("Reset to defaults").buttonClicks[0]?.();
		expect(host.resets).toBe(0);
		const settingsBefore = created().length;
		await created()[created().length - 1]?.buttonClicks[1]?.();
		expect(host.resets).toBe(1);
		expect(mocked.updates).toBe(0);
		expect(created().length).toBeGreaterThan(settingsBefore);
	});
});
