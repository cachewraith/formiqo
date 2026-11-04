# Contributing to Formiqo

Thanks for helping! This guide covers setup, the project layout, the rules the code follows, and how releases are made.

## Development setup

Requirements: [Bun](https://bun.sh) 1.x. Vitest and ESLint also need Node.js.

```bash
git clone https://github.com/cachewraith/formiqo.git
cd formiqo
bun install
```

### Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Watch mode with inline source maps |
| `bun run build` | Production build: `main.js` at the repo root, plus a ready-to-install copy of `main.js`, `manifest.json` and `styles.css` in `dist/` |
| `bun run typecheck` | `tsc --noEmit` in strict mode, over `src/` and `tests/` |
| `bun run lint` | ESLint with type-aware rules plus security rules |
| `bun run test` | Run the Vitest suite once |
| `bun run test:watch` | Vitest in watch mode |
| `bun run verify` | Check the manifest and the built files (run after `build`) |
| `bun run validate` | Everything: typecheck → lint → test → build → verify |

### Working against a test vault

Use a separate test vault, never your real one.

```bash
# Option A: every build is also copied into the vault
OBSIDIAN_PLUGIN_DIR="/path/to/TestVault/.obsidian/plugins/formiqo" bun run dev

# Option B: symlink dist/ (macOS/Linux; on Windows use mklink /D or option A)
bun run build
ln -s "$PWD/dist" "/path/to/TestVault/.obsidian/plugins/formiqo"
```

After a rebuild, reload the plugin by turning it off and on in **Community plugins**, or run **Reload app without saving**. The community [Hot Reload](https://github.com/pjeby/hot-reload) plugin can reload it automatically.

## Project layout

```
src/
├── main.ts                       Plugin lifecycle: wires settings, commands, paste, rendering
├── types/index.ts                Shared engine types
├── core/
│   ├── markdown-scanner.ts       Line classifier: frontmatter, fences, math, HTML, comments, indented code
│   ├── markdown-analyzer.ts      Classifies clipboard text: empty / plain / markdown / code / mixed
│   ├── formatting-pipeline.ts    Runs formatters in order, re-scanning between them
│   ├── markdown-normalizer.ts    Public entry point: edges → pipeline (until stable) → validation
│   └── validation.ts             Safety net that rejects destructive output
├── formatters/                   One file per rule area (tables, headings, lists, …) + ordered registry
├── editor/
│   ├── editor-integration.ts     Selection widening, minimal diffs, single-transaction edits
│   ├── paste-handler.ts          `editor-paste` handler
│   └── editor-commands.ts        Command palette commands
├── rendering/
│   ├── reading-view.ts           Body classes (main and popout windows), re-render
│   └── markdown-postprocessor.ts Table scroll wrappers, code language labels
├── settings/                     Types, defaults, validation/migration, settings tab
└── utils/                        Text, block syntax, inline spans, line diff
styles.css                        Scoped Reading View stylesheet (kept at the root, where releases expect it)
main.js                           Build output (git-ignored)
tests/                            Mirrors src/; fixtures/, regressions/, mocks/
scripts/verify-artifacts.mjs      Manifest and bundle checks
docs/                             User documentation
```

### How text flows through the engine

```
input ─► split edges ─► scan ─► formatters (re-scan before each) ─► repeat until stable ─► validate ─► output
                                                                                               └─► on failure: original text
```

### Design decisions

- **A line-aware scanner, not remark/unified.** Turning Markdown into a syntax tree and printing it back rewrites the whole document and loses syntax the parser doesn't know, such as callouts, `%% comments %%`, wikilinks, embeds, block references and tags. Formiqo labels each line, edits only Markdown lines, and leaves everything else byte-for-byte as it was. There are no runtime dependencies.
- **Two modes.** Paste uses *repair*: fix only what is broken. Commands use *normalize*: repairs plus consistent style.
- **A safety validator.** After formatting, every protected line must still be present and in order, and all letters and digits must be unchanged (ordered-list numbers and task boxes excepted). No frontmatter may be created and no content line may be removed. Anything else is rejected, and the original text is kept.
- **Obsidian's `editor-paste` event** rather than a raw CodeMirror 6 DOM handler. It is the documented hook and cooperates with other plugins through `evt.defaultPrevented`. Edits go through Obsidian's `Editor` API (`replaceSelection`, `transaction`), so each one is a single undo step.
- **Minimal edits.** The commands diff old and new text by line (Myers' algorithm) and replace only changed lines, so the cursor and scroll position stay put.
- **Reading View styles are switched on by body classes.** Every CSS rule is scoped to `.markdown-preview-view`, behind `.formiqo-reading`.
- **Compatibility.** `minAppVersion` is 1.1.0, the version that added `editor-paste`. The settings tab uses `display()` and `setWarning()`, which Obsidian deprecated in 1.13 but still supports. Their replacements don't exist on older versions.

## Code rules

ESLint and the tests enforce these:

- Engine code (`src/core`, `src/formatters`, `src/utils`, `src/types`) must not import `obsidian`.
- Formatters must be **idempotent**: formatting twice gives the same result as formatting once. They must never edit lines the scanner marks as protected.
- No Node APIs in `src/` (the plugin must run on mobile), no network calls, no `eval` or `new Function`, no `innerHTML`/`outerHTML`.
- No runtime dependencies without discussion.
- Don't use `Array.prototype.at` or other ES2022+ APIs in `src/`; older Obsidian installers run older Electron versions.
- Keep [`docs/`](docs/README.md) in sync with any behaviour change.

## Tests

- Each formatter has its own test file in `tests/formatters/`, covering both modes.
- `tests/fixtures/` holds whole-document fixtures. The original escaped-table problem (`regression-escaped-table.*`) must always pass.
- `tests/regressions/` holds one test per bug found in review or reported by users. **Every bug fix needs a regression test.**
- `tests/core/idempotency.fuzz.test.ts` formats thousands of generated documents twice and checks that the second pass changes nothing.
- Editor tests run against a real CodeMirror 6 state with undo history (`tests/editor/cm-editor.ts`). Obsidian's API is replaced by the small mock in `tests/mocks/obsidian.ts`.

## Pull requests

1. Fork and create a branch from `main`.
2. Make a focused change, with tests.
3. Run `bun run validate`. It must pass.
4. In the pull request, describe the problem and the fix, with before/after Markdown where relevant.

## Continuous integration

- `.github/workflows/ci.yml` runs on every push and pull request. It runs `bun run validate`, then Obsidian's official [`obsidian-workflows`](https://github.com/obsidianmd/obsidian-workflows) checks, which use the same ESLint and stylelint rules as the community directory's automated review.
- To reproduce the directory's lint locally, the important rules are: no `eslint-disable` of `@typescript-eslint/no-deprecated`, every `eslint-disable` comment needs a `-- reason`, and no `innerHTML`.

## Releasing

Releases are built by GitHub Actions, never uploaded by hand. That way every release carries a build attestation, which the community directory checks.

1. Update the version in `manifest.json` and `package.json`, and add `"<version>": "<minAppVersion>"` to `versions.json`.
2. Add an entry to [`CHANGELOG.md`](CHANGELOG.md).
3. Run `bun run validate`, then commit and push to `main`.
4. Tag the commit with the bare version number (no `v` prefix) and push the tag:

   ```bash
   git tag 1.0.1 && git push origin 1.0.1
   ```

5. `.github/workflows/release.yml` validates the plugin, builds it, attests `main.js` and `styles.css`, and creates a **draft** release with `main.js`, `manifest.json` and `styles.css`.
6. Check the draft on the [Releases page](https://github.com/cachewraith/formiqo/releases), paste the changelog entry into it, and publish.
