import type { FormiqoSettings } from "./settings";

/** What commands and the settings tab need from the plugin. */
export interface FormiqoHost {
	readonly settings: FormiqoSettings;
	/** Applies a change, validates, persists and refreshes dependent features. */
	updateSettings(mutate: (settings: FormiqoSettings) => void): Promise<void>;
	resetSettings(): Promise<void>;
}
