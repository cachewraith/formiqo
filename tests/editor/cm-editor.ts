/**
 * A test double for Obsidian's Editor backed by a real CodeMirror 6 state with
 * undo history. `transaction()` applies all changes in one CM transaction with
 * positions in original-document coordinates, which is how Obsidian's
 * CodeMirror-based editor applies an EditorTransaction.
 */

import { history, undo, redo } from "@codemirror/commands";
import { EditorSelection, EditorState, type TransactionSpec } from "@codemirror/state";
import type { EditorPosition, EditorSelection as ObsidianSelection, EditorTransaction } from "obsidian";
import type { EditorLike } from "../../src/editor/editor-integration";

export class CmEditor implements EditorLike {
	state: EditorState;
	transactions = 0;

	constructor(doc: string, anchor = 0, head = anchor) {
		this.state = EditorState.create({ doc, extensions: [history(), EditorState.allowMultipleSelections.of(true)], selection: EditorSelection.single(anchor, head) });
	}

	/** Creates an editor with `‸` marking the cursor or `⟦`…`⟧` marking a selection. */
	static fromMarked(marked: string): CmEditor {
		const start = marked.indexOf("⟦");
		if (start !== -1) {
			const end = marked.indexOf("⟧", start) - 1;
			return new CmEditor(marked.replace("⟦", "").replace("⟧", ""), start, end);
		}
		const cursor = marked.indexOf("‸");
		return new CmEditor(marked.replace("‸", ""), Math.max(cursor, 0));
	}

	private dispatch(spec: TransactionSpec): void {
		this.state = this.state.update(spec).state;
	}

	getValue(): string {
		return this.state.doc.toString();
	}

	getCursor(side: "from" | "to" | "head" | "anchor" = "head"): EditorPosition {
		const main = this.state.selection.main;
		const offsets = { from: main.from, to: main.to, head: main.head, anchor: main.anchor };
		return this.offsetToPos(offsets[side]);
	}

	listSelections(): ObsidianSelection[] {
		return this.state.selection.ranges.map((range) => ({ anchor: this.offsetToPos(range.anchor), head: this.offsetToPos(range.head) }));
	}

	somethingSelected(): boolean {
		return !this.state.selection.main.empty;
	}

	offsetToPos(offset: number): EditorPosition {
		const line = this.state.doc.lineAt(offset);
		return { line: line.number - 1, ch: offset - line.from };
	}

	posToOffset(pos: EditorPosition): number {
		return this.state.doc.line(pos.line + 1).from + pos.ch;
	}

	getLine(line: number): string {
		return this.state.doc.line(line + 1).text;
	}

	transaction(tx: EditorTransaction): void {
		this.transactions++;
		const changes = (tx.changes ?? []).map((change) => ({
			from: this.posToOffset(change.from),
			to: this.posToOffset(change.to ?? change.from),
			insert: change.text,
		}));
		this.dispatch({ changes, userEvent: "input" });
	}

	setSelection(anchor: EditorPosition, head?: EditorPosition): void {
		this.dispatch({ selection: EditorSelection.single(this.posToOffset(anchor), this.posToOffset(head ?? anchor)) });
	}

	replaceSelection(replacement: string): void {
		this.transactions++;
		this.dispatch({ ...this.state.replaceSelection(replacement), userEvent: "input.paste" });
	}

	addCursor(offset: number): void {
		this.dispatch({ selection: this.state.selection.addRange(EditorSelection.cursor(offset)) });
	}

	undo(): boolean {
		return undo({ state: this.state, dispatch: (tr) => (this.state = tr.state) });
	}

	redo(): boolean {
		return redo({ state: this.state, dispatch: (tr) => (this.state = tr.state) });
	}

	selectedText(): string {
		const main = this.state.selection.main;
		return this.state.sliceDoc(main.from, main.to);
	}
}
