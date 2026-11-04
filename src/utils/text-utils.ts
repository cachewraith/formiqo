/** Generic, Markdown-agnostic text helpers. */

/** Width of a tab stop when measuring indentation (CommonMark uses 4). */
export const TAB_WIDTH = 4;

/**
 * Space characters that look like a normal space but are not treated as one by
 * Markdown parsers (NBSP, en/em spaces, narrow NBSP, ...). Text copied from web
 * pages and chat UIs frequently contains them in structural positions.
 * The ideographic space (U+3000) is deliberately excluded: it is meaningful
 * indentation in CJK prose.
 */
export const UNUSUAL_SPACE_CLASS = "\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F";
const UNUSUAL_SPACE = new RegExp(`[${UNUSUAL_SPACE_CLASS}]`, "g");
const UNUSUAL_SPACE_CHAR = new RegExp(`^[${UNUSUAL_SPACE_CLASS}]$`);
const ANY_SPACE = new RegExp(`^[ \\t${UNUSUAL_SPACE_CLASS}]*$`);

/** Splits text into lines, accepting any line-ending style. */
export function splitLines(text: string): string[] {
	return text.split(/\r\n|\r|\n/);
}

export function normalizeLineEndings(text: string): string {
	return text.replace(/\r\n?/g, "\n");
}

/** True for empty lines and lines containing only (possibly unusual) spaces. */
export function isBlank(line: string): boolean {
	return ANY_SPACE.test(line);
}

export function isUnusualSpace(char: string | undefined): boolean {
	return char !== undefined && UNUSUAL_SPACE_CHAR.test(char);
}

export function isSpaceLike(char: string | undefined): boolean {
	return char === " " || char === "\t" || isUnusualSpace(char);
}

export function replaceUnusualSpaces(text: string): string {
	return text.replace(UNUSUAL_SPACE, " ");
}

/** Trims regular and unusual spaces from both ends. */
export function trimSpaces(text: string): string {
	let start = 0;
	let end = text.length;
	while (start < end && isSpaceLike(text[start])) start++;
	while (end > start && isSpaceLike(text[end - 1])) end--;
	return text.slice(start, end);
}

/** Leading run of spaces and tabs. */
export function leadingWhitespace(text: string): string {
	return /^[ \t]*/.exec(text)?.[0] ?? "";
}

/** Visual width of a run of spaces/tabs, expanding tabs to tab stops. */
export function indentWidth(whitespace: string): number {
	let width = 0;
	for (const char of whitespace) {
		width = char === "\t" ? width + TAB_WIDTH - (width % TAB_WIDTH) : width + 1;
	}
	return width;
}

/** True when the character at `index` is escaped by an odd number of backslashes. */
export function isEscaped(text: string, index: number): boolean {
	let backslashes = 0;
	for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) backslashes++;
	return backslashes % 2 === 1;
}

export function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}
