# Formiqo

**Make Markdown beautiful.**

Formiqo is an Obsidian plugin that repairs malformed Markdown as you paste it, normalizes whole notes on demand, and gives the Reading View a cleaner, more readable look. It is built for people who copy technical content from ChatGPT, Claude, Gemini, GitHub, Stack Overflow and documentation sites.

Formiqo works fully offline. It makes no network requests, collects no data, never logs clipboard contents, and uses Obsidian's own Markdown renderer.

---

## Contents

1. [Features](#features)
2. [Screenshots](#screenshots)
3. [Installation](#installation)
4. [Building](#building)
5. [Testing](#testing)
6. [Development workflow](#development-workflow)
7. [Architecture](#architecture)
8. [Configuration](#configuration)
9. [Usage examples](#usage-examples)
10. [Known limitations](#known-limitations)
11. [Contributing](#contributing)
12. [License](#license)

---

## Features

### Intelligent paste formatting

When you paste, Formiqo checks the clipboard's plain text. If the text contains broken Markdown, Formiqo inserts a repaired version instead. Otherwise it steps aside and Obsidian pastes normally. Paste formatting only repairs things that are demonstrably broken; it doesn't restyle Markdown that is already valid.

| Problem in pasted text | What Formiqo does |
|---|---|
| `\\| a \\| b \\|` escaped table delimiters | Unescapes them, but **only** inside a block that is structurally a table |
| Table without a separator row | Inserts `\| --- \| --- \|`, but only if every row looks like `\| a \| b \|` (pipes on both ends, spaces around them, same column count) |
| Separator with the wrong number of columns | Rebuilds it, keeping `:---:` alignment |
| Rows with missing cells | Pads them (extra cells are never dropped) |
| Non-breaking spaces around table pipes or in a separator | Turns them into regular spaces |
| Table glued to a paragraph | Adds the blank lines needed for it to render |
| `##Heading` | `## Heading` (a single `#word` is an Obsidian tag and is left alone) |
| `• item`, `◦ item`, `▪ item` | `- item` |
| `☐ task` / `☑ done` | `- [ ] task` / `- [x] done` |
| `- [ ]Task` | `- [ ] Task` |
| `-` + NBSP + `item`, `>` + NBSP, `#` + NBSP | Regular spaces, so the syntax parses |
| `[text] (https://…)` | `[text](https://…)` |
| Unclosed ```` ``` ```` fence | Closes it, so it can't swallow the rest of your note |

These are never modified: code blocks and their language identifiers, inline code, YAML frontmatter, Obsidian callout syntax (`> [!note]`), `$math$` and `$$math$$`, HTML, `%% comments %%`, `[[wikilinks]]` (including `|alias` pipes inside table cells) and `![[embeds]]`.

Paste formatting is skipped when:

- the clipboard text looks like source code,
- the cursor is inside a code block, math block, frontmatter, comment or HTML block,
- files (images, attachments) are being pasted,
- you have multiple cursors,
- the text is pasted into the middle of a line (unless the pasted text itself starts with a line break), because its first line joins the existing text,
- another plugin has already handled the paste.

A Formiqo paste is a single editor transaction, so one **Undo** removes it completely.

### Markdown normalization engine

The engine is pure TypeScript and independent of Obsidian. It powers both paste repair and the formatting commands. It is:

- **Deterministic and idempotent.** Formatting twice gives the same result as formatting once. This is verified by fixtures and by a seeded fuzz test over thousands of generated documents.
- **Non-destructive.** After every run, a validation step checks that every protected line (code, math, HTML, comments, frontmatter) survived verbatim, that no content line was removed, that no YAML frontmatter was created, and that the words and numbers in the text are unchanged. If any check fails, the original text is kept.
- **Minimal.** The formatting commands diff old and new text by line and replace only the lines that changed, so your cursor, scroll position and folds stay put.

When you run a command, Formiqo also applies style normalization on top of the repairs: `*`/`+` bullets become `-`, inconsistent ordered lists are renumbered (lists numbered `1. 1. 1.` are left alone on purpose), `>>text` becomes `> > text`, `***` becomes `---`, trailing whitespace is trimmed (two-space hard breaks are kept), repeated blank lines are collapsed, headings and code fences get surrounding blank lines, and tables are rewritten as `| a | b |`.

### Enhanced Reading View

Formiqo styles Obsidian's native Reading View with scoped CSS and a small post-processor. It doesn't replace the Markdown renderer, syntax highlighting or MathJax.

- **Tables:** clean borders, rounded corners, consistent padding, a distinct header, subtle striping and row hover, and horizontal scrolling for wide tables.
- **Code blocks:** a framed container, comfortable line height, horizontal scrolling, and a language label taken from the fence's language identifier.
- **Inline code:** subtle background, border and padding.
- **Headings and typography:** clear heading hierarchy and spacing, comfortable line height, refined link underlines and rules.
- **Lists:** consistent item spacing, readable nested lists, aligned task checkboxes.
- **Blockquotes:** accent border and tint. Callouts keep their native look; only their spacing is adjusted.
- **Images:** responsive (`max-width: 100%`) without distortion, and widths set with `![[img.png|300]]` are respected.
- **Math:** wide display equations scroll instead of overflowing.

All colors come from Obsidian theme variables, so light themes, dark themes, custom themes and your accent color all work. Every rule is scoped to rendered Markdown behind Formiqo's own body classes, and an automated test enforces this, so no other part of Obsidian's UI is restyled. Popout windows are supported.

### Commands

| Command | What it does |
|---|---|
| **Format selected Markdown** | Formats the selection, widened to whole lines and whole blocks (tables, code blocks, paragraphs). The result stays selected. |
| **Format current document** | Normalizes the whole note, changing only lines that need it. |
| **Fix Markdown tables** | Repairs tables only: in the selection if there is one, otherwise in the whole note. |
| **Toggle automatic paste formatting** | Turns paste repair on or off. |
| **Toggle enhanced Reading View** | Turns the Reading View styling on or off. |

Each command shows a short notice saying what it fixed, or that there was nothing to fix. Ordinary pastes never show a notice. Formiqo assigns no default hotkeys; you can add your own in **Settings → Hotkeys**.

---

## Screenshots

> _Placeholders. Replace them with real captures before publishing._

| | |
|---|---|
| ![Paste repair: escaped table before and after](docs/screenshots/paste-repair.png) | ![Reading View tables in the light theme](docs/screenshots/reading-light.png) |
| ![Reading View code blocks in the dark theme](docs/screenshots/reading-dark.png) | ![Settings tab](docs/screenshots/settings.png) |

---

## Installation

### Manual installation (any vault)

1. Build the plugin (see [Building](#building)) or download a release.
2. In your vault, create the folder `.obsidian/plugins/formiqo/`.
3. Copy these three files into it, and nothing else:

   ```
   .obsidian/plugins/formiqo/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

4. In Obsidian, open **Settings → Community plugins**, turn off **Restricted mode** if needed, and enable **Formiqo**.

### Developer installation (live link to a test vault)

Use a dedicated test vault, not your main one.

**Option A: build straight into the vault.** Every build is mirrored into the folder you point at:

```bash
OBSIDIAN_PLUGIN_DIR="/path/to/TestVault/.obsidian/plugins/formiqo" bun run dev
```

**Option B: symlink `dist/`** (macOS/Linux):

```bash
bun run build
ln -s "$PWD/dist" "/path/to/TestVault/.obsidian/plugins/formiqo"
```

On Windows, use `mklink /D` from an elevated prompt, or use option A.

After a rebuild, reload the plugin by turning it off and on in **Community plugins**, or by running **Reload app without saving**. The community [Hot Reload](https://github.com/pjeby/hot-reload) plugin can do this automatically.

---

## Building

Requirements: [Bun](https://bun.sh) 1.x. Node.js is used under the hood by Vitest and ESLint.

```bash
bun install          # install dependencies
bun run build        # production build -> dist/main.js, dist/manifest.json, dist/styles.css
bun run dev          # watch mode with inline source maps
```

`dist/` only ever contains the three runtime files. The `obsidian` API, Electron and CodeMirror are external and never bundled. Formiqo has **no runtime dependencies**.

---

## Testing

```bash
bun run test         # run the full Vitest suite once
bun run test:watch   # watch mode
bun run typecheck    # tsc --noEmit (strict mode, src + tests)
bun run lint         # ESLint (type-aware, plus security rules)
bun run validate     # typecheck → lint → test → build → artifact verification
```

What the suite covers:

- **Formatters:** every formatter tested on its own, in both repair and normalize modes.
- **Regression:** the original escaped-table problem is a permanent fixture (`tests/fixtures/regression-escaped-table.*`). Tests also check that escaped pipes in code blocks and in prose are left alone. Every issue found in code review has its own test in `tests/regressions/`.
- **Preservation:** an Obsidian note containing frontmatter, a callout, inline and block math, a code block, a comment, HTML, tasks, wikilinks and embeds must come out byte-for-byte unchanged.
- **Idempotency:** fixtures, plus a seeded fuzz test (400 random documents × 3 scopes × 2 modes).
- **Editor integration:** runs against a real CodeMirror 6 `EditorState` with undo history. It covers single-step undo and redo, cursor preservation, selection widening and reselection, and paste behaviour (`defaultPrevented`, disabled settings, files, multi-cursor, code-block context, mid-line pastes).
- **Plugin lifecycle:** command registration, event registration through `registerEvent`, settings persistence, migration, validation and reset, body classes on unload, popout windows, and Reading View re-rendering.
- **Reading View:** post-processor DOM changes, plus static checks that every CSS selector is scoped and that no colors are hard-coded.

`bun run validate` ends with `scripts/verify-artifacts.mjs`. That script validates `manifest.json`, checks that `package.json`, `manifest.json` and `versions.json` agree, and checks that `dist/` holds exactly the three runtime files. It also scans the bundle for network, `eval` and HTML-injection APIs, and loads `main.js` in a sandbox to confirm it exports a `Plugin` subclass and only requires `obsidian`.

---

## Development workflow

1. `bun install`
2. `OBSIDIAN_PLUGIN_DIR=… bun run dev` and enable Formiqo in a test vault.
3. Change code, and add or update tests next to the feature under `tests/`.
4. Run `bun run validate` before committing.

Conventions:

- Formatting logic lives in `src/core` and `src/formatters` and must not import `obsidian`.
- Formatters must be idempotent and must never edit lines the scanner marks as protected.
- Every new formatter rule needs a test, and a fixture if it interacts with other rules.
- Plugin code must not use Node APIs, network APIs, `eval` or `innerHTML`. ESLint enforces this.

---

## Architecture

```
src/
├── main.ts                       Plugin lifecycle: wires settings, commands, paste, rendering
├── types/index.ts                Shared engine types
├── core/
│   ├── markdown-scanner.ts       Line classifier: frontmatter, fences, math, HTML, comments, indented code
│   ├── markdown-analyzer.ts      Classifies clipboard text: empty / plain / markdown / code / mixed
│   ├── formatting-pipeline.ts    Runs formatters in order, re-scanning between them
│   ├── markdown-normalizer.ts    Public entry point: edges → pipeline (to a fixed point) → validation
│   └── validation.ts             Safety net that rejects destructive output
├── formatters/
│   ├── index.ts                  Ordered registry
│   ├── whitespace-formatter.ts   NBSP repair, trailing whitespace, blank lines
│   ├── code-formatter.ts         Fence closing and tidying (never touches code content)
│   ├── heading-formatter.ts
│   ├── table-formatter.ts        Escaped pipes, separators, padding, canonical rows
│   ├── list-formatter.ts         Bullets, tasks, safe renumbering
│   ├── blockquote-formatter.ts   Quote markers; callout-aware
│   ├── horizontal-rule-formatter.ts
│   ├── link-formatter.ts
│   └── shared.ts
├── editor/
│   ├── editor-integration.ts     Selection widening, minimal diffs, one-transaction edits
│   ├── paste-handler.ts          `editor-paste` handler
│   └── editor-commands.ts        Command palette commands
├── rendering/
│   ├── reading-view.ts           Body classes (main and popout windows), re-render
│   ├── markdown-postprocessor.ts Table scroll wrappers and code language labels
│   └── styles.css                Scoped Reading View stylesheet
├── settings/
│   ├── settings.ts               Types, validation, migration, engine options
│   ├── settings-defaults.ts
│   ├── settings-host.ts          Interface that commands and the settings tab depend on
│   └── settings-tab.ts
└── utils/
    ├── text-utils.ts             Whitespace and line helpers
    ├── markdown-utils.ts         Block syntax: quotes, list items, headings, rules
    ├── inline-spans.ts           Code spans, inline math, wikilinks, inline HTML
    └── line-diff.ts              Myers line diff for minimal editor changes
```

How text flows through the engine:

```
input ─► split edges ─► scan ─► formatters (re-scan before each) ─► repeat until stable ─► validate ─► output
                                                                                               └─► on failure: original text
```

Design decisions:

- **A line-aware scanner instead of remark/unified.** Round-tripping through an AST reprints the whole document and loses syntax the parser doesn't know about, such as Obsidian callouts, `%%comments%%`, wikilinks, embeds, block references and tags. Formiqo classifies lines, edits only Markdown lines, and leaves everything else byte-for-byte intact. That also keeps the bundle small (~36 KB) with no runtime dependencies.
- **Two modes.** Pasting uses *repair* mode (fix only what is broken). The commands use *normalize* mode (repairs plus consistent style).
- **Obsidian's `editor-paste` event** instead of a raw CodeMirror 6 DOM handler. It is the documented paste hook, Obsidian dispatches it from its CodeMirror paste handling, and it coordinates with other plugins through `evt.defaultPrevented`. Edits use Obsidian's `Editor` API (`replaceSelection`, `transaction`), which maps to single CodeMirror transactions, so undo works as usual. Formiqo doesn't register its own CodeMirror extensions because none are needed.
- **Reading View styling is gated by body classes.** Settings take effect immediately, and turning a feature off restores the native look.

---

## Configuration

Open **Settings → Formiqo**.

**General** (top of the tab)

| Setting | Default | Effect |
|---|---|---|
| Enable Formiqo | on | Master switch. When off, paste formatting and Reading View styling stop, and the formatting commands are hidden. The toggle commands stay available. |
| Automatic paste formatting | on | Repair Markdown on paste. |
| Enhanced Reading View | on | Apply Formiqo's styling to rendered notes. |

**Formatting:** each formatter can be turned off on its own: *Fix Markdown tables*, *Normalize headings*, *Normalize lists*, *Normalize blockquotes*, *Normalize horizontal rules*, *Normalize whitespace*, *Tidy code fences*, *Repair links*. These apply to paste formatting and to the formatting commands. **Fix Markdown tables** (the command) always runs the table repair.

**Preservation:** *Preserve code blocks*, *inline code*, *YAML frontmatter*, *Obsidian callouts*, *embedded HTML*, *mathematical expressions*. When one is on (the default), formatting rules never apply inside that kind of content. Turning one off lets the rules apply there too, for example to repair an escaped table inside a code example. *Preserve Obsidian callouts* keeps the callout markers as written; tables and lists inside a callout are still repaired. Obsidian `%% comments %%` are always preserved. Even with preservation off, the safety validation still refuses any result that would change words or lose lines.

**Reading View:** *Table styling*, *Responsive tables*, *Code block styling* (includes inline code), *Typography enhancements*, *List spacing*, *Blockquote styling*.

**Reset to defaults** restores every setting after you confirm.

Settings are stored with Obsidian's plugin data API in `.obsidian/plugins/formiqo/data.json`. Missing, outdated, unknown or invalid values are repaired automatically on load. The data is versioned so future releases can migrate it.

**Customizing the look:** every visual constant is a CSS variable you can override in a CSS snippet. For example:

```css
body.formiqo-reading {
	--formiqo-radius: 4px;
	--formiqo-table-stripe-bg: transparent;
	--formiqo-line-height: 1.6;
}
```

---

## Usage examples

**Pasting a table from a chat assistant.** You copy this:

```
\| | Dev | Staging |
\| --- | --- | --- |
\| Directory | `/var/www/dev` | `/var/www/staging` |
```

Formiqo pastes this:

```
| | Dev | Staging |
| --- | --- | --- |
| Directory | `/var/www/dev` | `/var/www/staging` |
```

**Pasting from a rendered web page.**

```
• Install dependencies          →   - Install dependencies
☐ Configure the server          →   - [ ] Configure the server
```

**Formatting a messy note** with *Format current document*:

```
##Setup                         ## Setup
* one                     →
+ two                           - one
1. first                        - two
3. second                       1. first
>quote                          2. second
***                             > quote

                                ---
```

---

## Known limitations

- **`#Heading` with a single hash is not repaired**, because `#word` is an Obsidian tag. `##Heading` through `######Heading` are repaired.
- **Setext headings** (`Title` underlined with `===` or `---`) are kept as they are.
- **`- []`** is not turned into a task, because in technical writing it is usually a literal empty array.
- **Paste formatting uses the clipboard's plain text.** If the plain text needs no repair, Obsidian's own paste runs, including its optional HTML-to-Markdown conversion. Formiqo doesn't post-process that conversion's output. Run **Fix Markdown tables** afterwards if needed.
- **Pasting with multiple cursors**, and **pasting into the middle of a line**, are left to Obsidian.
- **Table cells:** inline code is treated as one unit when splitting cells. Formiqo never edits inside code spans, even though GitHub Flavored Markdown technically splits cells on `|` inside code. Columns are not padded to equal widths, because display width is unreliable for CJK text and emoji.
- **Indentation** (tabs or spaces) is never converted, and indented headings keep their indentation (it attaches them to list items). Ordered lists are not renumbered if a change in marker width (`9.` → `10.`) could detach indented content.
- **Blank-line separation** around tables, headings and fences is only added at the top level, not inside lists or quotes.
- **Reading View styling** applies to rendered Markdown (Reading View, embeds, hover previews). Live Preview isn't restyled.
- **Code block language labels** need a language on the fence (```` ```js ````).
- The settings tab uses Obsidian's imperative `display()` API, so it works on every version back to `minAppVersion` 1.1.0. Obsidian 1.13 deprecated this API in favour of declarative settings definitions, but it still works there.
- Automated tests run the plugin against a mocked Obsidian API and a real CodeMirror 6 editor state, not inside a running Obsidian app. Check new releases in a real vault before publishing.

---

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and create a feature branch.
2. Keep changes focused. Engine code must stay free of `obsidian` imports.
3. Add tests for every behaviour change. Bug fixes should come with a regression test or fixture.
4. Make sure `bun run validate` passes.
5. Describe the problem and the fix in the pull request, with before/after Markdown if relevant.

Please don't add runtime dependencies or network access, and don't change user text outside the intended range.

---

## License

[MIT](LICENSE) © 2026 Formiqo contributors
