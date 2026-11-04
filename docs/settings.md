# Settings

Open **Settings → Formiqo** (under *Community plugins*). Changes take effect immediately. Every setting is **on** by default.

## General

| Setting | What it does |
|---|---|
| **Enable Formiqo** | Master switch. When off, paste formatting and Reading View styling stop, and the formatting commands are hidden. The two toggle commands stay available. |
| **Automatic paste formatting** | Repair broken Markdown when you paste. See [Paste formatting](paste-formatting.md). |
| **Enhanced Reading View** | Apply Formiqo's styling to rendered notes. See [Reading View](reading-view.md). |

## Formatting

Choose which kinds of fixes Formiqo makes. These apply to pasting and to the **Format** commands. Details and examples: [Formatting rules](formatting-rules.md).

| Setting | Covers |
|---|---|
| **Fix Markdown tables** | Escaped pipes, separator rows, missing cells, table spacing |
| **Normalize headings** | `##Heading`, spacing, closing hashes |
| **Normalize lists** | `•` bullets, `☐` checkboxes, task boxes, bullet style, numbering |
| **Normalize blockquotes** | `> ` quote prefixes (commands only) |
| **Normalize horizontal rules** | `***` / `___` → `---` (commands only) |
| **Normalize whitespace** | Non-breaking spaces in markers; trailing spaces and extra blank lines (commands only) |
| **Tidy code fences** | Closing unclosed code blocks; fence spacing |
| **Repair links** | `[text] (url)` → `[text](url)` |

The **Fix Markdown tables** *command* always runs, even if the table setting is off.

## Preservation

Choose what Formiqo must never rewrite. Leave these on unless you have a specific reason.

| Setting | Protects |
|---|---|
| **Preserve code blocks** | Fenced and indented code blocks |
| **Preserve inline code** | `` `inline code` `` |
| **Preserve YAML frontmatter** | The properties block at the top of a note |
| **Preserve Obsidian callouts** | Callout markers: `> [!note]` and the `>` at the start of each callout line. Tables and lists *inside* a callout are still repaired. |
| **Preserve embedded HTML** | HTML blocks and inline tags |
| **Preserve mathematical expressions** | `$inline$` and `$$block$$` math |

Turning one off lets the formatting rules work inside that content too. For example, with **Preserve code blocks** off, an escaped table inside a code example gets repaired. Obsidian `%% comments %%` are always preserved. Even with preservation off, Formiqo's safety check still refuses any change that would alter your words or numbers.

## Reading View

| Setting | What it styles |
|---|---|
| **Table styling** | Borders, padding, header, striping |
| **Responsive tables** | Sideways scrolling for wide tables |
| **Code block styling** | Code blocks with language labels, and inline code |
| **Typography enhancements** | Headings, paragraph spacing, links, horizontal rules |
| **List spacing** | Lists, nested lists, task checkboxes |
| **Blockquote styling** | Quotes (callouts keep their native look) |

## Reset

**Reset to defaults** asks for confirmation, then restores every setting above.

## Where settings are stored

In your vault at `.obsidian/plugins/formiqo/data.json`. The file only appears after you change a setting. If it is damaged or out of date, Formiqo repairs it on startup and falls back to the default for any setting it can't read.

Next: [FAQ & troubleshooting →](faq.md)
