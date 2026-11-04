import { builtinModules } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import esbuild from "esbuild";

const production = process.argv[2] === "production";
/** main.js and styles.css live at the repository root, where Obsidian's release tooling expects them. */
const outFile = "main.js";
/** dist/ gets a ready-to-install copy of the three runtime files. */
const outDir = "dist";

/**
 * Optional: set OBSIDIAN_PLUGIN_DIR to a vault's `.obsidian/plugins/formiqo`
 * folder and every build is mirrored there for live testing.
 */
const vaultPluginDir = process.env.OBSIDIAN_PLUGIN_DIR;

const RUNTIME_FILES = ["main.js", "manifest.json", "styles.css"];

async function copyRuntimeFiles() {
	const targets = [outDir, vaultPluginDir].filter(Boolean);
	for (const target of targets) {
		await mkdir(target, { recursive: true });
		for (const file of RUNTIME_FILES) {
			await copyFile(file, path.join(target, file));
		}
	}
}

/** Copies the runtime files to dist/ (and the vault) after every successful build. */
const runtimeFilesPlugin = {
	name: "formiqo-runtime-files",
	setup(build) {
		build.onEnd(async (result) => {
			if (result.errors.length > 0) return;
			await copyRuntimeFiles();
			console.log(`[formiqo] build complete -> ./main.js, ${[outDir, vaultPluginDir].filter(Boolean).join(", ")}`);
		});
	},
};

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtinModules,
	],
	format: "cjs",
	platform: "browser",
	target: "es2020",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	minify: production,
	legalComments: "none",
	outfile: outFile,
	plugins: [runtimeFilesPlugin],
});

if (production) {
	await context.rebuild();
	await context.dispose();
} else {
	await context.watch();
}
