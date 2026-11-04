/**
 * Runs formatters in order. The text is re-scanned before every formatter so
 * each one sees accurate line classifications, even after earlier formatters
 * inserted lines (e.g. a closing fence or a table separator).
 */

import type { FormatContext, Formatter, FormatterId } from "../types";
import { arraysEqual } from "../utils/text-utils";
import { scanMarkdown, type ScanOptions } from "./markdown-scanner";

export interface PipelineResult {
	readonly lines: string[];
	readonly applied: FormatterId[];
}

export function runPipeline(
	lines: readonly string[],
	formatters: readonly Formatter[],
	ctx: FormatContext,
	scanOptions: ScanOptions,
): PipelineResult {
	let current = [...lines];
	const applied: FormatterId[] = [];
	for (const formatter of formatters) {
		const next = formatter.format(scanMarkdown(current, scanOptions), ctx);
		if (!arraysEqual(next, current)) {
			applied.push(formatter.id);
			current = next;
		}
	}
	return { lines: current, applied };
}
