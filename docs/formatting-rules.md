# Formatting rules

Formiqo's rules are grouped into eight areas. You can switch each area on or off in [Settings](settings.md) under **Formatting**.

Every rule runs in one of two contexts:

- **Paste**: repairs only. Formiqo fixes what is clearly broken and leaves working Markdown alone.
- **Commands**: repairs plus consistent style. Used by **Format selected Markdown** and **Format current document**.

Formiqo never edits protected content (code, math, frontmatter, callout syntax, HTML, comments, wikilinks). After every run it also checks that no words, numbers or protected lines changed. If anything would have, your text is left exactly as it was.

---

## Tables

**Setting:** *Fix Markdown tables*

**On paste and in commands**

- **Escaped pipes** become real table pipes, but only when the lines are clearly a table: there is a separator row, or there are several rows framed like `| a | b |`. Escaped pipes in sentences and inside code stay as they are.

  ```
  \| Name | Role |          →   | Name | Role |
  \| --- | --- |                 | --- | --- |
  \| Ada | Engineer |            | Ada | Engineer |
  ```

- **A missing separator row** is added. This only happens when every row has pipes on both ends with spaces around them and the same number of columns:

  ```
  | Name | Role |            →   | Name | Role |
  | Ada | Engineer |              | --- | --- |
                                  | Ada | Engineer |
  ```

- **A separator with the wrong number of columns** is rebuilt, and alignment (`:---`, `:---:`, `---:`) is kept.
- **Rows with missing cells** are padded with empty cells. Extra cells are never removed.
- **Non-breaking spaces** next to table pipes become normal spaces.
- **Blank lines** are added between a table and a paragraph directly above or below it. Without them, the table may not render, or the next line may become a table row.

**In commands only**

- Each row is rewritten in one consistent form, `| a | b |`, and the separator as `| --- | :---: |`:

  ```
  |a|b|      →   | a | b |
  |-|:-:|        | --- | :---: |
  |1|2|          | 1 | 2 |
  ```

- Tables without outer pipes get them. Columns are **not** padded to equal widths, because widths can't be measured reliably for Asian scripts and emoji.

`[[Note|alias]]` and `` `a|b` `` inside cells are kept intact.

---

## Headings

**Setting:** *Normalize headings*

**On paste and in commands**

- `##Heading` becomes `## Heading` (two to six `#`). A single `#word` is left alone because it is an Obsidian **tag**.

**In commands only**

- One space after the `#` marks: `##   Title` becomes `## Title`.
- Optional closing hashes are removed: `## Title ##` becomes `## Title`. Hashes that are part of the text, like `C#` or a `#tag`, are kept.
- Top-level headings get a blank line before and after. There is no blank line between frontmatter and a first heading.
- Indentation is kept, because inside a list it is what attaches the heading to the item.
- Headings underlined with `===` or `---` are left as they are.

---

## Lists and tasks

**Setting:** *Normalize lists*

**On paste and in commands**

| Before | After |
|---|---|
| `• item`, `◦ item`, `▪ item`, `● item` | `- item` (indentation kept) |
| `☐ task` | `- [ ] task` |
| `☑ done`, `☒ done` | `- [x] done` |
| `- [ ]Task` | `- [ ] Task` |

`- []` is **not** turned into a task, because in technical writing it usually means an empty array.

**In commands only**

- `*` and `+` bullets become `-`. Empty items are left alone.
- Extra spaces after a marker are reduced to one (`-   item` becomes `- item`). This is skipped when it could change indented code inside the item.
- `[X]` becomes `[x]`. Custom task states such as `[-]`, `[>]`, `[/]` and `[?]` are kept.
- **Inconsistent numbering is fixed**, counting up from the first number:

  ```
  1. a      →   1. a
  3. b          2. b
  7. c          3. c
  ```

  Lists numbered `1. 1. 1.` are left alone on purpose, as are lists that already count correctly from any start number. Nested lists are numbered independently.
- Indentation (tabs or spaces) is never changed.

---

## Blockquotes

**Setting:** *Normalize blockquotes* (commands only)

- `>text` becomes `> text`, and `>>text` becomes `> > text`.
- Empty quote lines become a bare `>`.
- Callouts (`> [!note]`) are left exactly as written while **Preserve Obsidian callouts** is on.

---

## Horizontal rules

**Setting:** *Normalize horizontal rules* (commands only)

- `***`, `* * *`, `___`, `- - -` and `-----` become `---`.
- If the rule sits directly under text, a blank line is added first. Otherwise `---` would turn that text into a heading.
- A line of dashes directly under text is already a heading underline, so it is left alone.
- To avoid creating frontmatter by accident, rules on the first line, and in notes whose first line is `---`, are not changed.

---

## Links

**Setting:** *Repair links*

**On paste and in commands**

- A link broken by a space is joined: `[the docs] (https://example.com)` becomes `[the docs](https://example.com)`. The same applies to images.
- This only happens when the target is clearly a link: `http(s)://`, `mailto:`, `obsidian://`, `file://`, or a file such as `.md`, `.png`, `.jpg`, `.gif`, `.svg`, `.webp`, `.pdf` or `.canvas`.
- It never happens for task boxes like `- [ ] (https://…)` or `- [/] (https://…)`, footnotes, or `[a][b]` reference links.

**In commands only**

- Padding inside parentheses is trimmed: `[a]( https://x.y )` becomes `[a](https://x.y)`. Link titles are kept.

---

## Code fences

**Setting:** *Tidy code fences*

The **content** of a code block is never touched, not even trailing spaces.

**On paste and in commands**

- A code block with no closing ```` ``` ```` would swallow the rest of your note, so the closing fence is added. Inside a quote, it's added where the quote ends.

**In commands only**

- Stray spaces before the language are removed: ```` ```   js ```` becomes ```` ```js ````.
- Top-level code blocks get a blank line between them and adjacent paragraphs.

---

## Whitespace

**Setting:** *Normalize whitespace*

**On paste and in commands**

- Non-breaking spaces (common in text copied from web pages) after `-`, `1.`, `>`, `#` and inside `[ ]` become normal spaces, so the line is recognised as Markdown. Non-breaking spaces inside ordinary text are kept.
- Deep indentation (4+ columns) is only converted inside lists, so prose is never turned into a code block.

**In commands only**

- Trailing spaces are removed. Two or more spaces at the end of a line are a deliberate line break, so they are kept as exactly two.
- Runs of blank lines are reduced to one.
- When formatting a whole note, it ends with exactly one line break.

Next: [Reading View →](reading-view.md)
