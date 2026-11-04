# Getting started

## Requirements

- Obsidian **1.1.0 or newer**, on desktop or mobile.
- Community plugins turned on (**Settings → Community plugins → Turn on community plugins**).

## Install

Formiqo is not in the Obsidian community plugin browser yet, so for now you install it by hand.

### Option 1: from a GitHub release

1. Open the [Releases page](https://github.com/cachewraith/formiqo/releases) and download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Open your vault folder and go to `.obsidian/plugins/`. The `.obsidian` folder is hidden; on macOS press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>.</kbd> in Finder to show it.
3. Create a folder named `formiqo` and put the three files inside:

   ```
   YourVault/.obsidian/plugins/formiqo/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

4. Restart Obsidian, or click the refresh icon in **Settings → Community plugins**.
5. Turn on **Formiqo** in the list of installed plugins.

### Option 2: build from source

You need [Bun](https://bun.sh).

```bash
git clone https://github.com/cachewraith/formiqo.git
cd formiqo
bun install
bun run build
```

The three files appear in `dist/`. Copy them into `.obsidian/plugins/formiqo/` as in option 1.

## Try it in two minutes

**1. Paste a broken table.** Copy this text exactly, including the backslashes:

```
\| | Dev | Staging |
\| --- | --- | --- |
\| Directory | `/var/www/dev` | `/var/www/staging` |
```

Paste it on an empty line in a note. Formiqo inserts a working table:

```
| | Dev | Staging |
| --- | --- | --- |
| Directory | `/var/www/dev` | `/var/www/staging` |
```

Press **Undo** once and the paste disappears completely.

**2. Tidy a note.** Write a few messy lines:

```
##Setup
* one
+ two
1. first
3. second
```

Open the command palette (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>P</kbd>) and run **Formiqo: Format current document**:

```
## Setup

- one
- two
1. first
2. second
```

**3. Look at the Reading View.** Switch the note to Reading View (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>E</kbd>). Tables, code blocks and headings now have Formiqo's styling.

## Before you rely on it

- Read [Paste formatting](paste-formatting.md) to learn when Formiqo changes a paste and when it doesn't.
- Formiqo is careful, but it's new software. Try it on a copy of a few notes first, or make sure your vault is backed up or synced.
- To turn Formiqo off quickly, use **Enable Formiqo** in its settings, or the toggle commands described in [Commands](commands.md).

Next: [Paste formatting →](paste-formatting.md)
