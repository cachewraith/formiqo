/**
 * Obsidian adds DOM helpers such as `createDiv` to HTMLElement at runtime.
 * happy-dom doesn't have them, so tests that exercise DOM code install this
 * minimal equivalent.
 */
interface CreateOptions {
	cls?: string;
}

export function installObsidianDomHelpers(): void {
	if ("createDiv" in HTMLElement.prototype) return;
	Object.defineProperty(HTMLElement.prototype, "createDiv", {
		configurable: true,
		value(this: HTMLElement, options?: CreateOptions): HTMLDivElement {
			const div = this.ownerDocument.createElement("div");
			if (options?.cls) div.className = options.cls;
			this.appendChild(div);
			return div;
		},
	});
}
