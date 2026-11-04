/**
 * Line-based diff (Myers' O(ND) algorithm) used to turn "old text -> new text"
 * into a minimal set of replacements. Applying minimal changes instead of
 * replacing the whole document keeps the cursor, scroll position and folds
 * stable and avoids touching lines that did not change.
 */

/** A replacement in the *original* text: characters `[from, to)` become `insert`. */
export interface TextChange {
	readonly from: number;
	readonly to: number;
	readonly insert: string;
}

interface Hunk {
	readonly oldStart: number;
	readonly oldEnd: number;
	readonly newStart: number;
	readonly newEnd: number;
}

/** Above this edit distance a single covering replacement is used instead. */
const MAX_EDIT_DISTANCE = 1000;

export function diffText(oldText: string, newText: string): TextChange[] {
	if (oldText === newText) return [];
	const a = tokenize(oldText);
	const b = tokenize(newText);

	let start = 0;
	while (start < a.length && start < b.length && a[start] === b[start]) start++;
	let endA = a.length;
	let endB = b.length;
	while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
		endA--;
		endB--;
	}

	const middle = myers(a.slice(start, endA), b.slice(start, endB)) ?? [
		{ oldStart: 0, oldEnd: endA - start, newStart: 0, newEnd: endB - start },
	];

	const offsets = prefixOffsets(a);
	return middle.map((hunk) => ({
		from: offsets[start + hunk.oldStart] ?? oldText.length,
		to: offsets[start + hunk.oldEnd] ?? oldText.length,
		insert: b.slice(start + hunk.newStart, start + hunk.newEnd).join(""),
	}));
}

/** Splits text into lines that keep their trailing `\n`, so `tokens.join("") === text`. */
function tokenize(text: string): string[] {
	return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/** offsets[i] = character offset of token i; offsets[length] = total length. */
function prefixOffsets(tokens: readonly string[]): number[] {
	const offsets = [0];
	let total = 0;
	for (const token of tokens) {
		total += token.length;
		offsets.push(total);
	}
	return offsets;
}

/** Returns hunks of differing lines, or null when the edit distance is too large. */
function myers(a: readonly string[], b: readonly string[]): Hunk[] | null {
	const n = a.length;
	const m = b.length;
	if (n === 0 || m === 0) return n + m === 0 ? [] : [{ oldStart: 0, oldEnd: n, newStart: 0, newEnd: m }];

	const max = Math.min(n + m, MAX_EDIT_DISTANCE);
	const offset = n + m;
	const v = new Int32Array(2 * offset + 2);
	/** trace[d] holds v for diagonals -d..d before step d (index k + d). */
	const trace: Int32Array[] = [];

	for (let d = 0; d <= max; d++) {
		trace.push(v.slice(offset - d, offset + d + 1));
		for (let k = -d; k <= d; k += 2) {
			const down = k === -d || (k !== d && (v[offset + k - 1] ?? 0) < (v[offset + k + 1] ?? 0));
			let x = down ? (v[offset + k + 1] ?? 0) : (v[offset + k - 1] ?? 0) + 1;
			let y = x - k;
			while (x < n && y < m && a[x] === b[y]) {
				x++;
				y++;
			}
			v[offset + k] = x;
			if (x >= n && y >= m) return toHunks(backtrack(trace, n, m), n, m);
		}
	}
	return null;
}

/** Walks the trace backwards and returns matched (equal) line pairs in order. */
function backtrack(trace: readonly Int32Array[], n: number, m: number): [number, number][] {
	const matches: [number, number][] = [];
	let x = n;
	let y = m;
	for (let d = trace.length - 1; d >= 0; d--) {
		const v = trace[d] ?? new Int32Array(0);
		const at = (k: number): number => v[k + d] ?? 0;
		const k = x - y;
		const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
		const prevK = down ? k + 1 : k - 1;
		const prevX = d === 0 ? 0 : at(prevK);
		const prevY = d === 0 ? 0 : prevX - prevK;
		while (x > prevX && y > prevY) {
			x--;
			y--;
			matches.push([x, y]);
		}
		x = prevX;
		y = prevY;
	}
	return matches.reverse();
}

function toHunks(matches: readonly [number, number][], n: number, m: number): Hunk[] {
	const hunks: Hunk[] = [];
	let oldPos = 0;
	let newPos = 0;
	for (const [i, j] of [...matches, [n, m] as [number, number]]) {
		if (i > oldPos || j > newPos) hunks.push({ oldStart: oldPos, oldEnd: i, newStart: newPos, newEnd: j });
		oldPos = i + 1;
		newPos = j + 1;
	}
	return hunks;
}
