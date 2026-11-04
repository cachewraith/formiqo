import type { Formatter } from "../types";
import { blockquoteFormatter } from "./blockquote-formatter";
import { codeBlockFormatter } from "./code-formatter";
import { headingFormatter } from "./heading-formatter";
import { horizontalRuleFormatter } from "./horizontal-rule-formatter";
import { linkFormatter } from "./link-formatter";
import { listFormatter } from "./list-formatter";
import { tableFormatter } from "./table-formatter";
import { whitespaceFormatter } from "./whitespace-formatter";

/**
 * All formatters in pipeline order.
 * Whitespace runs first so later formatters see regular spaces in structural
 * positions; code fences run next so an unclosed fence is closed before
 * anything else inspects the text; headings run before tables so a repaired
 * heading is recognised when deciding whether a table needs a blank line.
 */
export const FORMATTERS: readonly Formatter[] = [
	whitespaceFormatter,
	codeBlockFormatter,
	headingFormatter,
	tableFormatter,
	listFormatter,
	blockquoteFormatter,
	horizontalRuleFormatter,
	linkFormatter,
];
