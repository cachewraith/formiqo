import { describe, expect, it } from "vitest";
import { diffText, type TextChange } from "../../src/utils/line-diff";

function applyChanges(text: string, changes: readonly TextChange[]): string {
	let result = "";
	let last = 0;
	for (const change of changes) {
		expect(change.from).toBeGreaterThanOrEqual(last);
		result += text.slice(last, change.from) + change.insert;
		last = change.to;
	}
	return result + text.slice(last);
}

const cases: [string, string, string][] = [
	["identical", "a\nb\n", "a\nb\n"],
	["single line change", "a\nb\nc", "a\nB\nc"],
	["insertion", "a\nc\n", "a\nb\nc\n"],
	["deletion", "a\n\n\nb", "a\n\nb"],
	["multiple hunks", "1\n2\n3\n4\n5\n6\n7", "1\nX\n3\n4\n5\nY\n7"],
	["no trailing newline change", "a\nb", "a\nb\n"],
	["from empty", "", "a\nb"],
	["to empty", "a\nb", ""],
	["unicode", "日本\n🚀 a\n", "日本\n🚀 b\n"],
];

describe("diffText", () => {
	it.each(cases)("round-trips: %s", (_name, before, after) => {
		expect(applyChanges(before, diffText(before, after))).toBe(after);
	});

	it("returns no changes for identical text", () => {
		expect(diffText("same\n", "same\n")).toEqual([]);
	});

	it("produces separate minimal hunks for separate edits", () => {
		const changes = diffText("1\n2\n3\n4\n5\n6\n7", "1\nX\n3\n4\n5\nY\n7");
		expect(changes).toEqual([
			{ from: 2, to: 4, insert: "X\n" },
			{ from: 10, to: 12, insert: "Y\n" },
		]);
	});

	it("round-trips random edits", () => {
		let seed = 42;
		const random = (): number => {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			return seed / 2147483648;
		};
		for (let run = 0; run < 200; run++) {
			const before = Array.from({ length: Math.floor(random() * 30) }, () => String(Math.floor(random() * 5))).join("\n");
			const after = before
				.split("\n")
				.flatMap((line) => (random() < 0.2 ? [] : random() < 0.2 ? [line, "new"] : [random() < 0.2 ? `${line}!` : line]))
				.join("\n");
			expect(applyChanges(before, diffText(before, after))).toBe(after);
		}
	});

	it("falls back to one covering change for huge edit distances", () => {
		const before = Array.from({ length: 3000 }, (_, i) => `a${i}`).join("\n");
		const after = Array.from({ length: 3000 }, (_, i) => `b${i}`).join("\n");
		const changes = diffText(before, after);
		expect(changes).toHaveLength(1);
		expect(applyChanges(before, changes)).toBe(after);
	});
});
