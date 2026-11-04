# Formiqo

**Make Markdown beautiful.**

Formiqo is an [Obsidian](https://obsidian.md) plugin for people who copy Markdown from ChatGPT, Claude, Gemini, GitHub, Stack Overflow and documentation sites. It fixes broken Markdown as you paste it, tidies notes on demand, and makes the Reading View cleaner.

[![Obsidian 1.1.0+](https://img.shields.io/badge/Obsidian-1.1.0%2B-7c3aed?logo=obsidian&logoColor=white)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Offline](https://img.shields.io/badge/works-offline-success)

> 📖 **New to Formiqo? Read the [user guide](docs/README.md) before you start.** It takes about five minutes.

---

## The problem it solves

You copy a table from a chat assistant, paste it into Obsidian, and get this:

```
\| | Dev | Staging |
\| --- | --- | --- |
\| Directory | `/var/www/dev` | `/var/www/staging` |
```

With Formiqo, the same paste gives you a working table:

```
| | Dev | Staging |
| --- | --- | --- |
| Directory | `/var/www/dev` | `/var/www/staging` |
```

Code examples, math and everything else that was already fine stay exactly as they were.

## Features

### 🩹 Paste repair
- Turns escaped `\|` table pipes into real tables, but only when the lines really are a table.
- Adds missing or mismatched table separator rows and fills in missing cells.
- Converts `•` bullets and `☐`/`☑` checkboxes copied from web pages into Markdown lists and tasks.
- Fixes `##Heading`, `[text] (url)` links, non-breaking spaces that break lists, and code blocks with no closing fence.
- Stays out of the way when your paste is already fine, is source code, or lands inside a code block.
- One **Undo** removes the whole paste.

### 🧹 Formatting commands
- **Format selected Markdown** and **Format current document** tidy bullets, list numbering, heading spacing, tables, quotes, rules and whitespace.
- **Fix Markdown tables** repairs tables and nothing else.
- Only the lines that change are touched, so your cursor stays put. Each command is one **Undo** step.

### 🎨 Reading View
- Clean tables (wide ones scroll sideways), framed code blocks with language labels, refined inline code, clear heading hierarchy, even list spacing, styled blockquotes, and images scaled down to fit.
- Uses your theme's colours and accent colour, in light and dark mode. Every visual setting can be changed with a CSS snippet.

### 🛡️ Safe by design
- Never rewrites code, math, frontmatter, callout syntax, HTML, `%% comments %%` or `[[wikilinks]]`.
- Checks every result before applying it. If any word or number would change, nothing is changed.
- Runs entirely on your device: no network, no AI services, no tracking.

## Installation

Formiqo isn't in the community plugin browser yet. To install it manually:

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/cachewraith/formiqo/releases), or [build from source](CONTRIBUTING.md#development-setup).
2. Put them in `YourVault/.obsidian/plugins/formiqo/`.
3. Reload Obsidian and enable **Formiqo** under **Settings → Community plugins**.

Full instructions: [Getting started](docs/getting-started.md). Requires Obsidian 1.1.0 or newer.

## Quick start

| Do this | And Formiqo… |
|---|---|
| Paste Markdown | Repairs it if it's broken; otherwise pastes normally |
| <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>P</kbd> → **Formiqo: Format current document** | Tidies the whole note |
| Select text → **Formiqo: Format selected Markdown** | Tidies just that part |
| <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>P</kbd> → **Formiqo: Fix Markdown tables** | Repairs broken tables only |
| Switch to Reading View (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>E</kbd>) | Shows the enhanced styling |

Everything can be switched on or off in **Settings → Formiqo**.

## Documentation

| Guide | |
|---|---|
| [Getting started](docs/getting-started.md) | Install and try it in two minutes |
| [Paste formatting](docs/paste-formatting.md) | What happens when you paste, and when Formiqo doesn't step in |
| [Commands](docs/commands.md) | The five commands in detail |
| [Formatting rules](docs/formatting-rules.md) | Every rule, with before/after examples |
| [Reading View](docs/reading-view.md) | What's styled and how to customize it |
| [Settings](docs/settings.md) | Every setting explained |
| [FAQ & troubleshooting](docs/faq.md) | Common questions, problems and privacy |

## Known limitations

- `#Heading` with a single `#` is not fixed, because `#word` is an Obsidian tag. `##Heading` and deeper are fixed.
- Pastes into the middle of a line, and pastes with several cursors, are left to Obsidian.
- Formiqo works on the clipboard's plain text. It doesn't change the output of Obsidian's own HTML-to-Markdown conversion; use **Fix Markdown tables** afterwards if needed.
- Table columns aren't padded to equal widths.
- The Reading View styling applies to rendered notes, not to Live Preview.

More in the [FAQ](docs/faq.md).

## Contributing

Bug reports and ideas are welcome. Please use the [issue templates](https://github.com/cachewraith/formiqo/issues/new/choose). To work on the code, see [CONTRIBUTING.md](CONTRIBUTING.md) for setup, architecture, tests and release steps. Changes are listed in the [CHANGELOG](CHANGELOG.md).

## License

[MIT](LICENSE) © 2026 cachewraith
