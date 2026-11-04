import { builtinModules } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import esbuild from "esbuild";

const production = process.argv[2] === "production";
const outDir = "dist";

/**
 * Optional: set OBSIDIAN_PLUGIN_DIR to a vault's `.obsidian/plugins/formiqo`
 * folder and every build is mirrored there for live testing.
 */
const vaultPluginDir = process.env.OBSIDIAN_PLUGIN_DIR;

const STATIC_FILES = [
	{ from: "manifest.json", to: "manifest.json" },
	{ from: "src/rendering/styles.css", to: "styles.css" },
];

async function copyStaticFiles() {
	const targets = [outDir, vaultPluginDir].filter(Boolean);
	for (const target of targets) {
		await mkdir(target, { recursive: true });
		for (const file of STATIC_FILES) {
			await copyFile(file.from, path.join(target, file.to));
		}
		if (target !== outDir) {
			await copyFile(path.join(outDir, "main.js"), path.join(target, "main.js"));
		}
	}
}

/** Copies manifest/styles (and mirrors to the vault) after every successful build. */
const staticFilesPlugin = {
	name: "formiqo-static-files",
	setup(build) {
		build.onEnd(async (result) => {
			if (result.errors.length > 0) return;
			await copyStaticFiles();
			console.log(`[formiqo] build complete -> ${[outDir, vaultPluginDir].filter(Boolean).join(", ")}`);
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
	outfile: path.join(outDir, "main.js"),
	plugins: [staticFilesPlugin],
});

if (production) {
	await context.rebuild();
	await context.dispose();
} else {
	await context.watch();
}
