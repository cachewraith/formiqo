/**
 * Shared types for the Formiqo formatting engine.
 * The engine is editor-agnostic: nothing in here depends on Obsidian.
 */

/** Identifiers of the individual formatters, in pipeline order. */
export type FormatterId =
	| "whitespace"
	| "code-blocks"
	| "headings"
	| "tables"
	| "lists"
	| "blockquotes"
	| "horizontal-rules"
	| "links";

/**
 * How aggressive formatting is.
 * - `repair`: only fix syntax that is demonstrably broken (used for paste).
 * - `normalize`: repairs plus stylistic normalization (used by commands).
 */
export type FormatMode = "repair" | "normalize";

/** Where the text being formatted comes from. Affects edge handling only. */
export type FormatScope = "document" | "selection" | "paste";

/** Which kinds of content are shielded from formatting. */
export interface PreservationOptions {
	codeBlocks: boolean;
	inlineCode: boolean;
	frontmatter: boolean;
	callouts: boolean;
	html: boolean;
	math: boolean;
}

export interface NormalizeOptions {
	scope: FormatScope;
	mode: FormatMode;
	/** Formatters that are allowed to run. */
	formatters: ReadonlySet<FormatterId>;
	preservation: PreservationOptions;
	/**
	 * Whether a leading `---` block may be treated as YAML frontmatter.
	 * Only true when the text starts at the top of a note (or is a full pasted note).
	 */
	allowFrontmatter: boolean;
}

export interface NormalizeResult {
	text: string;
	changed: boolean;
	/** Formatters that modified the text, in pipeline order. */
	applied: FormatterId[];
	/** Set when the safety validation rejected the formatted output. */
	rejected?: string;
}

/** Structural classification of a scanned line. */
export type LineKind =
	| "markdown"
	| "frontmatter"
	| "fence"
	| "code"
	| "math"
	| "html"
	| "comment";

export interface ScannedLine {
	readonly text: string;
	readonly kind: LineKind;
	/** True when formatters must leave this line untouched. */
	readonly protected: boolean;
}

/** A contiguous multi-line construct (code block, math block, ...), inclusive line indices. */
export interface ScannedBlock {
	readonly kind: Exclude<LineKind, "markdown">;
	readonly start: number;
	readonly end: number;
}

export interface ScannedDocument {
	readonly lines: readonly ScannedLine[];
	readonly blocks: readonly ScannedBlock[];
}

export interface FormatContext {
	readonly mode: FormatMode;
	readonly preservation: PreservationOptions;
}

/**
 * A formatter receives a freshly scanned document and returns the new lines.
 * Formatters must never modify protected lines and must be idempotent.
 */
export interface Formatter {
	readonly id: FormatterId;
	format(doc: ScannedDocument, ctx: FormatContext): string[];
}

/** Broad classification of clipboard content, used by the paste handler. */
export type ContentKind = "empty" | "plain-text" | "markdown" | "code" | "mixed";
