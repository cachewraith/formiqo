# Changelog

All notable changes to Formiqo are listed here. Versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] – 2026-11-04

First release.

### Added
- **Paste formatting:** repairs broken Markdown as you paste. Fixes escaped table pipes, missing or mismatched table separators, missing cells, `##Heading`, `•` bullets, `☐`/`☑` checkboxes, `- [ ]Task`, non-breaking spaces in list, quote and heading markers, `[text] (url)` links, and unclosed code fences. Text that is already valid, plain text and source code are pasted unchanged.
- **Commands:** *Format selected Markdown*, *Format current document*, *Fix Markdown tables*, *Toggle automatic paste formatting*, *Toggle enhanced Reading View*.
- **Formatting in commands:** consistent bullets, renumbering of inconsistently numbered lists, heading and code-fence spacing, canonical tables, blockquote and horizontal-rule style, whitespace cleanup.
- **Reading View styling:** tables (with sideways scrolling for wide ones), code blocks with language labels, inline code, typography, lists, blockquotes, responsive images. Follows your theme and accent colour; customizable through CSS variables.
- **Protection:** code, math, frontmatter, callout syntax, HTML, comments and wikilinks are never rewritten, and a safety check refuses any change to words or numbers.
- **Settings:** individual switches for every formatting area, preservation option and Reading View feature, plus reset to defaults.
