/** Block-level Markdown line syntax helpers (CommonMark/GFM + Obsidian). */

export interface QuoteSplit {
	/** The blockquote markers including their spacing, e.g. `"> > "`. */
	readonly quote: string;
	/** Number of `>` markers. */
	readonly depth: number;
	/** Text after the markers. */
	readonly content: string;
}

/** Splits the leading blockquote markers (each optionally indented up to 3 spaces). */
export function splitQuote(line: string): QuoteSplit {
	const match = /^(?: {0,3}>[ \t]?)+/.exec(line);
	if (!match) return { quote: "", depth: 0, content: line };
	const quote = match[0];
	return { quote, depth: (quote.match(/>/g) ?? []).length, content: line.slice(quote.length) };
}

/** Strips indentation and blockquote markers, e.g. for fence detection inside lists and quotes. */
export function stripContainerPrefix(line: string): { prefix: string; rest: string } {
	const prefix = /^[ \t]*(?:>[ \t]*)*/.exec(line)?.[0] ?? "";
	return { prefix, rest: line.slice(prefix.length) };
}

export interface ListItem {
	readonly indent: string;
	readonly marker: string;
	readonly ordered: boolean;
	/** For ordered items: the parsed number. */
	readonly number: number;
	/** For ordered items: `.` or `)`. Empty for bullets. */
	readonly delimiter: string;
	/** Whitespace between marker and body. */
	readonly gap: string;
	readonly body: string;
}

const LIST_ITEM = /^([ \t]*)([-*+]|(\d{1,9})([.)]))([ \t]+|$)(.*)$/;

/** Parses a list item line (without blockquote prefix). Thematic breaks are not list items. */
export function parseListItem(content: string): ListItem | null {
	if (isThematicBreak(content)) return null;
	const match = LIST_ITEM.exec(content);
	if (!match) return null;
	const [, indent = "", marker = "", digits, delimiter = "", gap = "", body = ""] = match;
	return {
		indent,
		marker,
		ordered: digits !== undefined,
		number: digits === undefined ? 0 : Number(digits),
		delimiter,
		gap,
		body,
	};
}

/** CommonMark thematic break: 3+ of the same `-`, `*` or `_`, optionally space-separated. */
export function isThematicBreak(content: string): boolean {
	return /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(content);
}

export interface AtxHeading {
	readonly indent: string;
	readonly level: number;
	/** Heading text without the optional closing `#` sequence. */
	readonly text: string;
}

export function parseAtxHeading(content: string): AtxHeading | null {
	const match = /^( {0,3})(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/.exec(content);
	if (!match) return null;
	const [, indent = "", hashes = "", raw = ""] = match;
	// Strip an optional closing sequence: spaces followed by only `#` characters.
	const text = /^#+$/.test(raw) ? "" : raw.replace(/[ \t]+#+$/, "");
	return { indent, level: hashes.length, text };
}

export function isAtxHeading(content: string): boolean {
	return parseAtxHeading(content) !== null;
}

/** True if the line is an Obsidian callout header such as `> [!note]+ Title`. */
export function isCalloutHeader(line: string): boolean {
	const { depth, content } = splitQuote(line);
	return depth > 0 && /^[ \t]*\[![^\]\s]+\][+-]?/.test(content);
}
