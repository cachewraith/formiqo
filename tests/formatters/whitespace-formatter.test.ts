import { describe, expect, it } from "vitest";
import { repairStructuralSpaces, trimTrailingWhitespace, whitespaceFormatter } from "../../src/formatters/whitespace-formatter";
import { md, normalize, repair, runFormatter } from "../helpers";

const NBSP = " ";

describe("WhitespaceFormatter – repair", () => {
	it("fixes non-breaking spaces after list, task, quote and heading markers", () => {
		expect(repairStructuralSpaces(`-${NBSP}item`)).toBe("- item");
		expect(repairStructuralSpaces(`1.${NBSP}item`)).toBe("1. item");
		expect(repairStructuralSpaces(`-${NBSP}[${NBSP}]${NBSP}task`)).toBe("- [ ] task");
		expect(repairStructuralSpaces(`>${NBSP}quote`)).toBe("> quote");
		expect(repairStructuralSpaces(`##${NBSP}Title`)).toBe("## Title");
		expect(repairStructuralSpaces(`${NBSP}${NBSP}-${NBSP}nested`)).toBe("  - nested");
	});

	it("keeps non-breaking spaces in prose", () => {
		const prose = `Prix${NBSP}: 10${NBSP}€`;
		expect(repairStructuralSpaces(prose)).toBe(prose);
		expect(repair(prose)).toBe(prose);
	});

	it("does not turn NBSP-indented prose into an indented code block", () => {
		const prose = `${NBSP.repeat(4)}Indented prose`;
		expect(repairStructuralSpaces(prose)).toBe(prose);
	});

	it("keeps trailing whitespace and blank lines in repair mode", () => {
		const input = md("a  ", "", "", "b ");
		expect(repair(input)).toBe(input);
	});
});

describe("WhitespaceFormatter – normalize", () => {
	it("trims trailing whitespace but keeps hard breaks as two spaces", () => {
		expect(trimTrailingWhitespace("text   ")).toBe("text  ");
		expect(trimTrailingWhitespace("text ")).toBe("text");
		expect(trimTrailingWhitespace("text\t")).toBe("text");
		expect(trimTrailingWhitespace("   ")).toBe("");
	});

	it("collapses runs of blank lines", () => {
		expect(runFormatter(whitespaceFormatter, md("a", "", "", "", "b", "  ", "", "c"))).toBe(md("a", "", "b", "", "c"));
	});

	it("never touches whitespace inside code blocks", () => {
		const input = md("```", "a   ", "", "", "b", "```");
		expect(runFormatter(whitespaceFormatter, input)).toBe(input);
	});

	it("ends documents with exactly one newline and keeps leading blank lines", () => {
		expect(normalize("text\n\n\n")).toBe("text\n");
		expect(normalize("\n\ntext")).toBe("\n\ntext\n");
	});

	it("keeps tabs used for indentation", () => {
		const input = md("- a", "\t- b");
		expect(normalize(input)).toBe(`${input}\n`);
	});
});
