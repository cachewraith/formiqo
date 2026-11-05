/**
 * Settings model, validation/migration, and the mapping from settings to
 * formatting-engine options.
 */

import type { FormatMode, FormatScope, FormatterId, NormalizeOptions, PreservationOptions } from "../types";
import { createDefaultSettings, SETTINGS_VERSION } from "./settings-defaults";

export interface FormattingSettings {
	tables: boolean;
	headings: boolean;
	lists: boolean;
	blockquotes: boolean;
	horizontalRules: boolean;
	whitespace: boolean;
	codeFences: boolean;
	links: boolean;
}

export interface ReadingSettings {
	tables: boolean;
	codeBlocks: boolean;
	typography: boolean;
	lists: boolean;
	blockquotes: boolean;
	responsiveTables: boolean;
}

/** Optional "Studio" look: its own fonts, colours and text styles. */
export interface StudioSettings {
	/** Studio fonts, colours and text styles in the Reading View (replaces Formiqo's own look). */
	readingView: boolean;
	/** Studio fonts and Markdown colours in Live Preview and Source mode. */
	editor: boolean;
}

export interface FormiqoSettings {
	version: number;
	enabled: boolean;
	pasteFormatting: boolean;
	readingView: boolean;
	formatting: FormattingSettings;
	preservation: PreservationOptions;
	reading: ReadingSettings;
	studio: StudioSettings;
}

/** Which formatter each formatting toggle controls. */
export const FORMATTER_FOR_SETTING: Readonly<Record<keyof FormattingSettings, FormatterId>> = {
	tables: "tables",
	headings: "headings",
	lists: "lists",
	blockquotes: "blockquotes",
	horizontalRules: "horizontal-rules",
	whitespace: "whitespace",
	codeFences: "code-blocks",
	links: "links",
};

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrations keyed by the version they upgrade *from*. Version 0 means "no
 * version stamp" (data written before versioning, or hand-edited data); the
 * shape is the same, so it only needs re-stamping.
 */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
	0: (raw) => ({ ...raw, version: 1 }),
};

export interface LoadedSettings {
	readonly settings: FormiqoSettings;
	/** True when the stored data was missing, outdated or invalid and should be re-saved. */
	readonly needsSave: boolean;
}

/** Turns whatever was stored on disk into valid settings. Never throws. */
export function loadSettingsData(raw: unknown): LoadedSettings {
	const defaults = createDefaultSettings();
	if (!isRecord(raw)) return { settings: defaults, needsSave: raw !== null && raw !== undefined };

	const migrated = migrate(raw);
	const settings: FormiqoSettings = {
		version: SETTINGS_VERSION,
		enabled: readBoolean(migrated.enabled, defaults.enabled),
		pasteFormatting: readBoolean(migrated.pasteFormatting, defaults.pasteFormatting),
		readingView: readBoolean(migrated.readingView, defaults.readingView),
		formatting: readBooleanGroup(migrated.formatting, defaults.formatting),
		preservation: readBooleanGroup(migrated.preservation, defaults.preservation),
		reading: readBooleanGroup(migrated.reading, defaults.reading),
		studio: readBooleanGroup(migrated.studio, defaults.studio),
	};
	return { settings, needsSave: JSON.stringify(settings) !== JSON.stringify(raw) };
}

function migrate(raw: Record<string, unknown>): Record<string, unknown> {
	let data = raw;
	let version = typeof data.version === "number" && Number.isInteger(data.version) ? data.version : 0;
	while (version < SETTINGS_VERSION) {
		const migration = MIGRATIONS[version];
		if (!migration) break;
		data = migration(data);
		version++;
	}
	return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

/** Copies known boolean keys from `value`, falling back to defaults; unknown keys are dropped. */
function readBooleanGroup<T extends object>(value: unknown, defaults: T): T {
	const source = isRecord(value) ? value : {};
	const result = { ...defaults };
	for (const key of Object.keys(defaults) as (keyof T & string)[]) {
		const candidate = source[key];
		if (typeof candidate === "boolean") (result as Record<string, unknown>)[key] = candidate;
	}
	return result;
}

export interface EngineRequest {
	readonly scope: FormatScope;
	readonly allowFrontmatter: boolean;
	/** Overrides the default mode for the scope (paste = repair, otherwise normalize). */
	readonly mode?: FormatMode;
	/** Run only these formatters, regardless of the formatting toggles. */
	readonly only?: readonly FormatterId[];
}

export function toNormalizeOptions(settings: FormiqoSettings, request: EngineRequest): NormalizeOptions {
	const enabled = (Object.keys(FORMATTER_FOR_SETTING) as (keyof FormattingSettings)[])
		.filter((key) => settings.formatting[key])
		.map((key) => FORMATTER_FOR_SETTING[key]);
	return {
		scope: request.scope,
		mode: request.mode ?? (request.scope === "paste" ? "repair" : "normalize"),
		formatters: new Set(request.only ?? enabled),
		preservation: { ...settings.preservation },
		allowFrontmatter: request.allowFrontmatter,
	};
}
