/**
 * Minimal runtime stand-in for the `obsidian` module (which ships types only).
 * Implements just enough behaviour for Formiqo's integration tests; types are
 * still checked against the real `obsidian.d.ts`.
 */

type Callback = (...args: unknown[]) => unknown;

export class Notice {
	static readonly messages: string[] = [];
	constructor(readonly message: string) {
		Notice.messages.push(message);
	}
}

export class Workspace {
	readonly handlers = new Map<string, Callback[]>();
	leaves: { view: unknown }[] = [];

	on(name: string, callback: Callback): { name: string; callback: Callback } {
		const list = this.handlers.get(name) ?? [];
		list.push(callback);
		this.handlers.set(name, list);
		return { name, callback };
	}

	trigger(name: string, ...args: unknown[]): void {
		for (const callback of this.handlers.get(name) ?? []) callback(...args);
	}

	getLeavesOfType(): { view: unknown }[] {
		return this.leaves;
	}
}

export class App {
	readonly workspace = new Workspace();
}

export class MarkdownView {
	readonly previewMode = { rerenderCount: 0, rerender(): void { this.rerenderCount++; } };
}

export class Plugin {
	readonly commands: { id: string; name: string }[] = [];
	readonly postProcessors: unknown[] = [];
	readonly settingTabs: unknown[] = [];
	readonly events: unknown[] = [];
	storedData: unknown = null;
	saveCount = 0;

	constructor(
		readonly app: App,
		readonly manifest: unknown,
	) {}

	addCommand<T extends { id: string; name: string }>(command: T): T {
		this.commands.push(command);
		return command;
	}

	registerEvent(ref: unknown): void {
		this.events.push(ref);
	}

	registerMarkdownPostProcessor(processor: unknown): unknown {
		this.postProcessors.push(processor);
		return processor;
	}

	addSettingTab(tab: unknown): void {
		this.settingTabs.push(tab);
	}

	loadData(): Promise<unknown> {
		return Promise.resolve(structuredClone(this.storedData));
	}

	saveData(data: unknown): Promise<void> {
		this.storedData = structuredClone(data);
		this.saveCount++;
		return Promise.resolve();
	}
}

/** Records every Setting created so tests can find and drive controls by name. */
export class Setting {
	static readonly created: Setting[] = [];
	name = "";
	isHeading = false;
	toggleChange: ((value: boolean) => unknown) | null = null;
	toggleValue: boolean | null = null;
	buttonClicks: (() => unknown)[] = [];

	constructor(readonly containerEl: unknown) {
		Setting.created.push(this);
	}

	setName(name: string): this {
		this.name = name;
		return this;
	}

	setDesc(): this {
		return this;
	}

	setHeading(): this {
		this.isHeading = true;
		return this;
	}

	addToggle(build: (toggle: ToggleStub) => unknown): this {
		const toggle: ToggleStub = {
			setValue: (value) => {
				this.toggleValue = value;
				return toggle;
			},
			onChange: (callback) => {
				this.toggleChange = callback;
				return toggle;
			},
		};
		build(toggle);
		return this;
	}

	addButton(build: (button: ButtonStub) => unknown): this {
		const button: ButtonStub = {
			setButtonText: () => button,
			setWarning: () => button,
			onClick: (callback) => {
				this.buttonClicks.push(callback);
				return button;
			},
		};
		build(button);
		return this;
	}
}

interface ToggleStub {
	setValue(value: boolean): ToggleStub;
	onChange(callback: (value: boolean) => unknown): ToggleStub;
}

interface ButtonStub {
	setButtonText(text: string): ButtonStub;
	setWarning(): ButtonStub;
	onClick(callback: () => unknown): ButtonStub;
}

const containerStub = (): { empty(): void; createEl(): unknown } => ({ empty: () => undefined, createEl: () => ({}) });

export class PluginSettingTab {
	readonly containerEl = containerStub();
	constructor(
		readonly app: App,
		readonly plugin: unknown,
	) {}
}

export class Modal {
	static opened = 0;
	readonly titleEl = { setText: (): void => undefined };
	readonly contentEl = containerStub();
	constructor(readonly app: App) {}
	open(): void {
		Modal.opened++;
		(this as unknown as { onOpen?: () => void }).onOpen?.();
	}
	close(): void {
		(this as unknown as { onClose?: () => void }).onClose?.();
	}
}
