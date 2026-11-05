# Reading View

Formiqo makes rendered notes easier to read. It **styles** Obsidian's own Reading View; it doesn't replace it. Obsidian still renders your Markdown, highlights code syntax and draws math with MathJax.

Switch a note to Reading View with <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>E</kbd>.

## What changes

| Element | Formiqo styling | Setting |
|---|---|---|
| Tables | Borders, rounded corners, comfortable padding, a distinct header, subtle striping and row highlight on hover | *Table styling* |
| Wide tables | Scroll sideways instead of spilling off the page | *Responsive tables* |
| Code blocks | Framed box, readable line height, sideways scrolling instead of wrapping, language label (e.g. `typescript`) in the corner | *Code block styling* |
| Inline code | Subtle background, border and padding | *Code block styling* |
| Headings | Clear spacing between sections; level-2 headings get a thin underline | *Typography enhancements* |
| Paragraphs, links, rules | Comfortable line height, refined link underline, lighter horizontal rules | *Typography enhancements* |
| Lists | Even spacing between items and nested lists; muted bullet colour; aligned task checkboxes | *List spacing* |
| Blockquotes | Accent-coloured left border with a light tint. Callouts keep their native look and only get consistent spacing | *Blockquote styling* |
| Images | Scale down to fit the page without distortion; sizes you set with `![[image.png\|300]]` are respected | Always on |
| Display math | Very wide equations scroll sideways | Always on |

All of this switches off at once with **Enhanced Reading View** in settings, or with the command **Toggle enhanced Reading View**. Changes apply immediately.

## Themes

Formiqo has no colours of its own. It uses your theme's colours and your **accent colour**, so it works in light mode, dark mode and with community themes. If a theme already styles tables or code heavily, you can turn off the matching Formiqo setting.

Styling applies to rendered notes: Reading View, embedded notes and hover previews. The editor (Live Preview and Source mode) is only restyled if you turn on [Studio style](#studio-style) for the editor. The rest of Obsidian's interface is never restyled.

## Studio style

Studio style is an alternative, editor-like look for reading and writing. It is **off by default**. Turn it on in **Settings → Formiqo → Studio style**, or run **Toggle Studio style** to switch the Reading View and editor together.

**Studio style in Reading View** gives rendered notes:

- your system's interface font (San Francisco on macOS, Segoe UI on Windows, Lato or your system sans-serif on Linux) and a clean code font (SF Mono, Menlo, Consolas or similar), at a 1.5 line height
- crisp, compact headings, with a line under level 1 and 2 headings
- blue links without an underline until you hover
- framed code blocks with syntax colours and a language label, and inline code on a soft grey background
- bordered, striped tables; muted quotes with a thick grey bar; a solid grey horizontal rule; yellow highlights

It replaces Formiqo's own Reading View look. *Responsive tables* and code language labels still apply.

**Studio style in the editor** applies to Live Preview and Source mode:

- the same text and code fonts
- **pink, bold headings**, teal links, and italic quotes
- list markers coloured by level (indigo, orange, green)
- a violet cursor and selection colour
- inline code and code blocks in the code font, with syntax colours

Both work in light and dark mode. Your **font size** and your theme's **background** are kept. Only the note area is restyled; the sidebars and the rest of the interface are not.

> **Linux tip:** for the intended look, install the Lato font (on Arch: `sudo pacman -S ttf-lato`; on Debian/Ubuntu: `sudo apt install fonts-lato`), then restart Obsidian.

To fine-tune Studio style, override any `--formiqo-studio-*` variable in a CSS snippet, for example `--formiqo-studio-font`, `--formiqo-studio-mono`, `--formiqo-studio-heading` or `--formiqo-studio-link`. The full list is in the "Studio style" section of `styles.css`.

## Customizing with a CSS snippet

Every measurement Formiqo uses is a CSS variable you can override.

1. Create a file such as `formiqo-tweaks.css` in your vault's `.obsidian/snippets/` folder.
2. Turn it on in **Settings → Appearance → CSS snippets**.

```css
body.formiqo-reading {
	--formiqo-radius: 4px;                    /* corner rounding of tables and code */
	--formiqo-table-stripe-bg: transparent;   /* remove row striping */
	--formiqo-line-height: 1.6;               /* paragraph and list line height */
}
```

| Variable | Controls |
|---|---|
| `--formiqo-radius` | Corner rounding of tables and code blocks |
| `--formiqo-radius-small` | Corner rounding of inline code and blockquotes |
| `--formiqo-border` | Border colour |
| `--formiqo-block-gap` | Space above and below tables, code blocks and quotes |
| `--formiqo-line-height` | Line height of paragraphs and list items |
| `--formiqo-table-header-bg` | Table header background |
| `--formiqo-table-stripe-bg` | Background of every other table row |
| `--formiqo-table-hover-bg` | Background of the row under the mouse |
| `--formiqo-cell-padding-y`, `--formiqo-cell-padding-x` | Table cell padding |
| `--formiqo-code-padding` | Code block padding |
| `--formiqo-accent-tint`, `--formiqo-accent-tint-strong` | Tint used for striping and blockquotes |

Formiqo adds these classes to `<body>` while a feature is on, which is useful for more specific snippets: `formiqo-reading`, `formiqo-tables`, `formiqo-responsive-tables`, `formiqo-code`, `formiqo-typography`, `formiqo-lists`, `formiqo-blockquotes`.

Next: [Settings →](settings.md)
