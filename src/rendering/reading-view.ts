/**
 * Body classes that scope the stylesheet: the enhanced Reading View and its
 * features, and the optional Studio look for the Reading View and editor.
 *
 * All styles in styles.css are gated behind these classes, so turning a
 * feature (or the whole plugin) off restores Obsidian's native look
 * immediately, and nothing outside rendered Markdown is restyled.
 */

import { MarkdownView, type Workspace } from "obsidian";
import type { FormiqoSettings, ReadingSettings } from "../settings/settings";

export const ROOT_CLASS = "formiqo-reading";
/** Studio look for rendered notes; replaces Formiqo's own feature styling. */
export const STUDIO_READING_CLASS = "formiqo-studio";
/** Studio look for Live Preview and Source mode; independent of the Reading View. */
export const STUDIO_EDITOR_CLASS = "formiqo-studio-editor";

const FEATURE_CLASSES: Readonly<Record<keyof ReadingSettings, string>> = {
	tables: "formiqo-tables",
	codeBlocks: "formiqo-code",
	typography: "formiqo-typography",
	lists: "formiqo-lists",
	blockquotes: "formiqo-blockquotes",
	responsiveTables: "formiqo-responsive-tables",
};

/** Features that keep working under the Studio look, which replaces the rest. */
const FEATURES_KEPT_WITH_STUDIO: readonly (keyof ReadingSettings)[] = ["responsiveTables"];

const ALL_CLASSES = [ROOT_CLASS, STUDIO_READING_CLASS, STUDIO_EDITOR_CLASS, ...Object.values(FEATURE_CLASSES)];

export function isReadingViewActive(settings: FormiqoSettings): boolean {
	return settings.enabled && settings.readingView;
}

/** The body classes that should be present for the given settings. */
export function bodyClasses(settings: FormiqoSettings): string[] {
	const classes: string[] = [];
	if (isReadingViewActive(settings)) {
		const studio = settings.studio.readingView;
		const features = (Object.keys(FEATURE_CLASSES) as (keyof ReadingSettings)[])
			.filter((key) => settings.reading[key] && (!studio || FEATURES_KEPT_WITH_STUDIO.includes(key)))
			.map((key) => FEATURE_CLASSES[key]);
		classes.push(ROOT_CLASS, ...(studio ? [STUDIO_READING_CLASS] : []), ...features);
	}
	if (settings.enabled && settings.studio.editor) classes.push(STUDIO_EDITOR_CLASS);
	return classes;
}

/**
 * Keeps the feature classes in sync on the main window and any popout windows.
 * A class is warranted here: it owns the set of documents it has styled.
 */
export class ReadingViewStyler {
	private readonly documents = new Set<Document>();

	constructor(private readonly getSettings: () => FormiqoSettings) {}

	attach(doc: Document): void {
		this.documents.add(doc);
		this.apply(doc);
	}

	detach(doc: Document): void {
		doc.body.classList.remove(...ALL_CLASSES);
		this.documents.delete(doc);
	}

	refresh(): void {
		this.documents.forEach((doc) => this.apply(doc));
	}

	destroy(): void {
		[...this.documents].forEach((doc) => this.detach(doc));
	}

	private apply(doc: Document): void {
		doc.body.classList.remove(...ALL_CLASSES);
		doc.body.classList.add(...bodyClasses(this.getSettings()));
	}
}

/** Re-renders open Reading Views so post-processor changes take effect immediately. */
export function rerenderReadingViews(workspace: Workspace): void {
	for (const leaf of workspace.getLeavesOfType("markdown")) {
		if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
	}
}
