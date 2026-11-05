# Commands

Open the command palette (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>P</kbd>) and type **Formiqo**. Formiqo doesn't assign any hotkeys; you can add your own in **Settings → Hotkeys**.

| Command | What it does |
|---|---|
| **Format selected Markdown** | Tidies the selected text |
| **Format current document** | Tidies the whole note |
| **Fix Markdown tables** | Repairs tables only |
| **Toggle automatic paste formatting** | Turns paste repair on or off |
| **Toggle enhanced Reading View** | Turns the Reading View styling on or off |
| **Toggle Studio style** | Turns [Studio style](reading-view.md#studio-style) on or off for the Reading View and the editor together |

## Format selected Markdown

Available only when text is selected.

- The selection is widened to **whole lines and whole blocks**. If you select half a table or start inside a code block, the entire table or block is included, so a structure is never formatted in pieces.
- Everything outside that range is left untouched.
- Afterwards the formatted text stays selected, so you can see what was covered.

## Format current document

Applies every enabled [formatting rule](formatting-rules.md) to the whole note: the repairs that pasting does, plus consistent style (`-` bullets, renumbered lists, spaced headings, tidy tables and more).

Only lines that actually change are replaced, so your cursor and scroll position stay where they were.

## Fix Markdown tables

Repairs broken tables and nothing else: escaped pipes, missing or wrong separator rows, and missing cells. It works on the selection if there is one, otherwise on the whole note. It runs even if **Fix Markdown tables** is turned off in settings, because running it is an explicit request.

This is the command to use after pasting from somewhere Formiqo couldn't fix automatically.

## Toggles

**Toggle automatic paste formatting** and **Toggle enhanced Reading View** flip the matching setting and confirm with a short message.

**Toggle Studio style** switches [Studio style](reading-view.md#studio-style) for both the Reading View and the editor. If either is on, both are turned off; otherwise both are turned on. Give it a hotkey to compare the two looks quickly.

All three toggles stay available even when **Enable Formiqo** is off.

## Messages and undo

Each formatting command shows a short message:

- *Formiqo: fixed tables, lists in the document.* lists the kinds of fixes made.
- *Formiqo: nothing to fix in the document.* means the text was already fine.
- *Formiqo: no changes made – a safety check failed (…)* means Formiqo refused to apply a result that could have damaged your text, so nothing changed. Please [report it](https://github.com/cachewraith/formiqo/issues) with the text that caused it.

Each command is **one undo step**: press **Undo** once to get your text back exactly as it was.

> The three formatting commands are hidden while **Enable Formiqo** is off.

Next: [Formatting rules →](formatting-rules.md)
