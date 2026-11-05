# Changelog

All notable changes to Formiqo are listed here. Versions follow [Semantic Versioning](https://semver.org/).

## [1.1.0] – 2026-11-05

### Added
- **Studio style** (off by default): an alternative, editor-like look.
  - *Studio style in Reading View* replaces Formiqo's own Reading View look: system and code fonts, crisp headings, blue links, framed code blocks with syntax colours, striped tables, quotes, rules and highlights.
  - *Studio style in the editor* applies to Live Preview and Source mode: coloured headings, links and list markers, a violet cursor and selection, and code fonts.
  - New command **Toggle Studio style** switches both.

## [1.0.1] – 2026-11-04

Addresses the community directory's review of 1.0.0.

### Changed
- On Obsidian 1.13 and newer, Formiqo's settings use the new declarative settings API, so they appear in Obsidian's settings search. Older versions keep the previous settings screen, which shows the same options.
- Wide display equations: the scroll container now targets Obsidian's `.math-block` wrapper instead of MathJax's internal element.
- Links in the Reading View no longer change underline thickness on hover (that property is only partly supported in older Obsidian versions). The underline offset stays.

### Security
- Development tooling: `minimatch` is pinned to 11.0.1 or newer (GHSA-g3hv-75wg-m249). This affects ESLint and typescript-eslint only; nothing ships in the plugin.

## [1.0.0] – 2026-11-04

First release.

### Added
- **Paste formatting:** repairs broken Markdown as you paste. Fixes escaped table pipes, missing or mismatched table separators, missing cells, `##Heading`, `•` bullets, `☐`/`☑` checkboxes, `- [ ]Task`, non-breaking spaces in list, quote and heading markers, `[text] (url)` links, and unclosed code fences. Text that is already valid, plain text and source code are pasted unchanged.
- **Commands:** *Format selected Markdown*, *Format current document*, *Fix Markdown tables*, *Toggle automatic paste formatting*, *Toggle enhanced Reading View*.
- **Formatting in commands:** consistent bullets, renumbering of inconsistently numbered lists, heading and code-fence spacing, canonical tables, blockquote and horizontal-rule style, whitespace cleanup.
- **Reading View styling:** tables (with sideways scrolling for wide ones), code blocks with language labels, inline code, typography, lists, blockquotes, responsive images. Follows your theme and accent colour; customizable through CSS variables.
- **Protection:** code, math, frontmatter, callout syntax, HTML, comments and wikilinks are never rewritten, and a safety check refuses any change to words or numbers.
- **Settings:** individual switches for every formatting area, preservation option and Reading View feature, plus reset to defaults.
