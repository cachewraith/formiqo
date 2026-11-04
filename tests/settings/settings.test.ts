import { describe, expect, it } from "vitest";
import { loadSettingsData, toNormalizeOptions } from "../../src/settings/settings";
import { createDefaultSettings, SETTINGS_VERSION } from "../../src/settings/settings-defaults";

describe("loadSettingsData", () => {
	it("uses defaults on first run without forcing a save", () => {
		expect(loadSettingsData(null)).toEqual({ settings: createDefaultSettings(), needsSave: false });
		expect(loadSettingsData(undefined)).toEqual({ settings: createDefaultSettings(), needsSave: false });
	});

	it("round-trips valid settings unchanged", () => {
		const stored = createDefaultSettings();
		stored.formatting.links = false;
		stored.reading.lists = false;
		expect(loadSettingsData(structuredClone(stored))).toEqual({ settings: stored, needsSave: false });
	});

	it("fills in missing keys from defaults and requests a save", () => {
		const { settings, needsSave } = loadSettingsData({ version: 1, enabled: false, formatting: { tables: false } });
		expect(settings.enabled).toBe(false);
		expect(settings.formatting.tables).toBe(false);
		expect(settings.formatting.headings).toBe(true);
		expect(settings.reading).toEqual(createDefaultSettings().reading);
		expect(needsSave).toBe(true);
	});

	it("rejects values of the wrong type and drops unknown keys", () => {
		const { settings } = loadSettingsData({ version: 1, enabled: "yes", pasteFormatting: 0, formatting: { tables: "no", bogus: true }, extra: 1 });
		expect(settings.enabled).toBe(true);
		expect(settings.pasteFormatting).toBe(true);
		expect(settings.formatting.tables).toBe(true);
		expect(settings.formatting).not.toHaveProperty("bogus");
		expect(settings).not.toHaveProperty("extra");
	});

	it("migrates unversioned data", () => {
		const { settings, needsSave } = loadSettingsData({ enabled: false });
		expect(settings.version).toBe(SETTINGS_VERSION);
		expect(settings.enabled).toBe(false);
		expect(needsSave).toBe(true);
	});

	it("recovers from corrupt data", () => {
		for (const raw of ["garbage", 42, [1, 2], true]) {
			expect(loadSettingsData(raw)).toEqual({ settings: createDefaultSettings(), needsSave: true });
		}
	});

	it("returns independent default objects", () => {
		const a = createDefaultSettings();
		a.formatting.tables = false;
		expect(createDefaultSettings().formatting.tables).toBe(true);
	});
});

describe("toNormalizeOptions", () => {
	it("maps toggles to formatters and picks the mode from the scope", () => {
		const settings = createDefaultSettings();
		settings.formatting.lists = false;
		settings.formatting.codeFences = false;
		const paste = toNormalizeOptions(settings, { scope: "paste", allowFrontmatter: true });
		expect(paste.mode).toBe("repair");
		expect([...paste.formatters].sort()).toEqual(["blockquotes", "headings", "horizontal-rules", "links", "tables", "whitespace"]);
		expect(toNormalizeOptions(settings, { scope: "document", allowFrontmatter: true }).mode).toBe("normalize");
	});

	it("honours explicit mode and formatter overrides", () => {
		const settings = createDefaultSettings();
		settings.formatting.tables = false;
		const options = toNormalizeOptions(settings, { scope: "document", allowFrontmatter: false, mode: "repair", only: ["tables"] });
		expect(options).toMatchObject({ mode: "repair", allowFrontmatter: false });
		expect([...options.formatters]).toEqual(["tables"]);
	});

	it("passes preservation settings through as a copy", () => {
		const settings = createDefaultSettings();
		settings.preservation.math = false;
		const options = toNormalizeOptions(settings, { scope: "document", allowFrontmatter: true });
		expect(options.preservation.math).toBe(false);
		expect(options.preservation).not.toBe(settings.preservation);
	});
});
