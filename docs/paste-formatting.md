# Paste formatting

When automatic paste formatting is on (the default), Formiqo checks every paste. If the pasted text contains **broken** Markdown, Formiqo inserts a repaired version instead. Otherwise it steps aside and Obsidian pastes as usual.

## What gets repaired

| You paste… | Formiqo inserts… |
|---|---|
| `\| a \| b \|` (escaped table pipes) | `\| a \| b \|` (a real table) |
| A table with no `\| --- \|` separator row | The same table with a separator row added |
| A table whose separator has the wrong number of columns | A matching separator; alignment colons are kept |
| Table rows with missing cells | Rows padded with empty cells |
| A table stuck to the paragraph above or below | The table with blank lines around it, so it renders |
| `##Heading` | `## Heading` |
| `• item` / `◦ item` / `▪ item` | `- item` |
| `☐ task` / `☑ done` / `☒ done` | `- [ ] task` / `- [x] done` |
| `- [ ]Task` | `- [ ] Task` |
| Non-breaking spaces after `-`, `1.`, `>` or `#` | Normal spaces, so the line is recognised as a list, quote or heading |
| `[text] (https://example.com)` | `[text](https://example.com)` |
| A code block whose closing ```` ``` ```` is missing | The same block with its closing fence added |

For every rule, with examples, see [Formatting rules](formatting-rules.md).

Paste formatting only **repairs**. It never restyles Markdown that already works: `*` bullets stay `*`, `***` stays `***`, and spacing you chose is kept. Use the [commands](commands.md) for full tidying.

## What is never changed

- Fenced and indented **code blocks**, including their language (```` ```js ````), plus `inline code`
- **YAML frontmatter** (the properties block at the top of a note)
- **Callout syntax** such as `> [!note]`
- **Math**: `$inline$` and `$$block$$`
- **HTML** blocks and tags
- **Comments**: `%% … %%`
- **Wikilinks and embeds**: `[[Note|alias]]` and `![[image.png|300]]`, even inside tables
- Escaped pipes in ordinary sentences, e.g. `use a\|b here`. They are only treated as table pipes when the lines are clearly a table.

## When Formiqo stays out of the way

Formiqo lets Obsidian paste normally when:

- the text has **nothing to repair**,
- the text looks like **source code**, such as a JavaScript or Python snippet,
- your cursor is **inside a code block**, math block, frontmatter, comment or HTML block,
- you are pasting **files or images**,
- you have **more than one cursor**,
- you paste into the **middle of a line**, unless the pasted text starts with a line break,
- another plugin has **already handled** the paste.

Ordinary pastes never show a notification.

## Undo

A Formiqo paste is a single step. Press **Undo** once and the whole paste is removed, exactly as with a normal paste.

## Pasting without formatting

To paste text exactly as copied:

1. Run **Formiqo: Toggle automatic paste formatting** from the command palette (or turn off **Automatic paste formatting** in settings).
2. Paste.
3. Run the toggle command again to turn it back on.

You can give the toggle command a hotkey in **Settings → Hotkeys**.

## Copying from websites and chat apps

When you copy, apps usually put two versions on the clipboard: plain text and formatted (HTML) text. Formiqo works on the **plain text**:

- If the plain text needs repair, Formiqo inserts the repaired plain text.
- If it doesn't, Obsidian handles the paste. That may include Obsidian's own HTML-to-Markdown conversion, which Formiqo doesn't alter.

If a pasted table still looks broken afterwards, select it and run **Formiqo: Fix Markdown tables**.

Next: [Commands →](commands.md)
