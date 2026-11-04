# FAQ & troubleshooting

## Safety and privacy

**Can Formiqo damage my notes?**
Formiqo is built to avoid it.
- It never rewrites code, math, frontmatter, callout syntax, HTML, comments or wikilinks.
- Every result is checked before it is applied. If any word, number or protected line would change, Formiqo makes no change and tells you.
- Every paste and every command is a single **Undo** step.

As with any tool that edits files, keep your vault backed up or synced.

**Does Formiqo send my data anywhere?**
No. Formiqo works entirely on your device. It makes no network requests, uses no AI service, collects no analytics and never logs what you paste.

**Does it work on mobile?**
It is built to: Formiqo uses no desktop-only features and is marked as mobile-compatible. Most testing so far has been on desktop, so please [report](https://github.com/cachewraith/formiqo/issues) anything that behaves differently on a phone or tablet.

## Paste problems

**I pasted, but nothing changed.**
That usually means there was nothing to repair. Formiqo also leaves the paste to Obsidian when:
- the text looks like source code,
- you paste inside a code block, math block, frontmatter, comment or HTML block,
- you paste into the middle of a line,
- you have several cursors.

See [When Formiqo stays out of the way](paste-formatting.md#when-formiqo-stays-out-of-the-way). Also check that **Enable Formiqo** and **Automatic paste formatting** are on.

**A table I pasted still looks broken.**
Select it and run **Formiqo: Fix Markdown tables**. If it is still broken, please [open an issue](https://github.com/cachewraith/formiqo/issues) with the exact text.

**I want to paste text exactly as copied.**
Run **Toggle automatic paste formatting**, paste, then run it again. See [Pasting without formatting](paste-formatting.md#pasting-without-formatting).

**Formiqo changed something I didn't expect.**
Press **Undo** once. Then turn off the related rule under **Settings → Formiqo → Formatting**, and please [tell us about it](https://github.com/cachewraith/formiqo/issues).

**Why wasn't `#Heading` fixed?**
In Obsidian, `#word` is a tag, so Formiqo can't safely tell the two apart. `##Heading` and deeper levels are fixed.

**Another paste plugin stopped working, or Formiqo did.**
Formiqo checks whether another plugin has already handled a paste and steps aside if so. Whichever plugin runs first wins. If two plugins clash, turn off paste formatting in one of them.

## Command problems

**"Format selected Markdown" doesn't appear.**
It only appears when text is selected and **Enable Formiqo** is on.

**I see "no changes made – a safety check failed".**
Formiqo found that the result could have changed your text, so it changed nothing. Your note is untouched. Please [report it](https://github.com/cachewraith/formiqo/issues) with the text that caused it.

**My numbered list wasn't renumbered.**
Lists numbered `1. 1. 1.` are intentional in Markdown and are left alone. A list is also left alone if renumbering would change a marker's width (e.g. `9.` → `10.`) in a way that could detach indented content below it.

## Reading View problems

**I don't see any styling.**
- Make sure you're in Reading View (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>E</kbd>). Live Preview isn't restyled.
- Check that **Enable Formiqo** and **Enhanced Reading View** are on.

**Formiqo clashes with my theme.**
Turn off the specific feature under **Settings → Formiqo → Reading View**, or adjust it with a [CSS snippet](reading-view.md#customizing-with-a-css-snippet).

**There's no language label on my code block.**
Labels come from the language after the opening fence (```` ```python ````). Blocks without a language get no label.

## Reporting a problem

[Open an issue](https://github.com/cachewraith/formiqo/issues/new/choose) and include:
- your Obsidian and Formiqo versions,
- the exact text you pasted or formatted (remove anything private),
- what you expected and what happened.
