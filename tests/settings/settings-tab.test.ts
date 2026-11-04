import { App, Modal, Plugin, Setting } from "../mocks/obsidian";
import { beforeEach, describe, expect, it } from "vitest";
import type { FormiqoSettings } from "../../src/settings/settings";
import { createDefaultSettings } from "../../src/settings/settings-defaults";
import { FormiqoSettingTab } from "../../src/settings/settings-tab";

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
	// display() is the settings API on Obsidian < 1.13, which Formiqo supports.
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	tab.display();
	const find = (name: string): Setting => {
		const setting = created().find((candidate) => candidate.name === name);
		if (!setting) throw new Error(`missing setting ${name}`);
		return setting;
	};
	return { host, tab, find };
}

describe("FormiqoSettingTab", () => {
	beforeEach(() => {
		created().length = 0;
	});

	it("renders sections for formatting, preservation, reading view and reset", () => {
		setup();
		expect(created().filter((setting) => setting.isHeading).map((setting) => setting.name)).toEqual(["Formatting", "Preservation", "Reading View", "Reset"]);
		const toggles = created().filter((setting) => setting.toggleChange !== null);
		expect(toggles).toHaveLength(3 + 8 + 6 + 6);
	});

	it("shows current values and writes changes through the host", async () => {
		const { host, find } = setup();
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

	it("asks for confirmation before resetting", async () => {
		const { host, find } = setup();
		const before = Modal.opened;
		await find("Reset to defaults").buttonClicks[0]?.();
		expect(Modal.opened).toBe(before + 1);
		expect(host.resets).toBe(0);
		// The confirmation modal adds a "Cancel" and a "Reset" button; click Reset.
		const modalButtons = created()[created().length - 1]?.buttonClicks ?? [];
		await modalButtons[1]?.();
		expect(host.resets).toBe(1);
	});
});
