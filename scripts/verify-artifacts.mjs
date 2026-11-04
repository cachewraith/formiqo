/**
 * Verifies the plugin manifest and the production artifacts in dist/.
 * Run after `bun run build` (it is the last step of `bun run validate`).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const errors = [];
const check = (condition, message) => {
	if (!condition) errors.push(message);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const SEMVER = /^\d+\.\d+\.\d+$/;

// ------------------------------------------------------------------ manifest
const manifest = readJson("manifest.json");
const pkg = readJson("package.json");
const versions = readJson("versions.json");

for (const field of ["id", "name", "version", "minAppVersion", "description", "author"]) {
	check(typeof manifest[field] === "string" && manifest[field].length > 0, `manifest.${field} must be a non-empty string`);
}
check(typeof manifest.isDesktopOnly === "boolean", "manifest.isDesktopOnly must be a boolean");
check(/^[a-z0-9-]+$/.test(manifest.id ?? ""), "manifest.id may only contain lowercase letters, digits and dashes");
check(!/obsidian/i.test(manifest.id ?? ""), "manifest.id must not contain 'obsidian'");
check(!/obsidian/i.test(manifest.name ?? ""), "manifest.name must not contain 'Obsidian'");
check(SEMVER.test(manifest.version ?? ""), "manifest.version must be x.y.z");
check(SEMVER.test(manifest.minAppVersion ?? ""), "manifest.minAppVersion must be x.y.z");
check((manifest.description ?? "").length <= 250, "manifest.description must be at most 250 characters");
check(!/^this plugin/i.test(manifest.description ?? ""), "manifest.description should not start with 'This plugin'");
check(pkg.version === manifest.version, `package.json version (${pkg.version}) must match manifest (${manifest.version})`);
check(versions[manifest.version] === manifest.minAppVersion, "versions.json must map the manifest version to its minAppVersion");

// ----------------------------------------------------------------- artifacts
const distDir = "dist";
const expected = ["main.js", "manifest.json", "styles.css"];
const present = readdirSync(distDir).sort();
check(JSON.stringify(present) === JSON.stringify(expected), `dist/ must contain exactly ${expected.join(", ")} (found: ${present.join(", ")})`);

for (const file of expected) {
	const size = statSync(path.join(distDir, file)).size;
	check(size > 0, `dist/${file} must not be empty`);
}
check(readFileSync("dist/manifest.json", "utf8") === readFileSync("manifest.json", "utf8"), "dist/manifest.json differs from manifest.json");
check(readFileSync("dist/styles.css", "utf8") === readFileSync("src/rendering/styles.css", "utf8"), "dist/styles.css differs from the source stylesheet");

// ------------------------------------------------------------------- bundle
const bundle = readFileSync("dist/main.js", "utf8");
check(!bundle.includes("sourceMappingURL"), "production main.js must not contain an inline source map (run `bun run build`)");
const forbidden = {
	"fetch(": "network request",
	XMLHttpRequest: "network request",
	WebSocket: "network request",
	requestUrl: "network request",
	"eval(": "code evaluation",
	"new Function": "code evaluation",
	innerHTML: "HTML injection",
	outerHTML: "HTML injection",
	insertAdjacentHTML: "HTML injection",
};
for (const [needle, reason] of Object.entries(forbidden)) {
	check(!bundle.includes(needle), `main.js contains '${needle}' (${reason})`);
}

// Load the bundle with a stubbed `obsidian` module to prove it is a valid CommonJS plugin.
const required = new Set();
class Stub {}
const obsidianStub = { Plugin: Stub, PluginSettingTab: Stub, Modal: Stub, Setting: Stub, Notice: Stub, MarkdownView: Stub };
const sandboxModule = { exports: {} };
try {
	vm.runInNewContext(bundle, {
		module: sandboxModule,
		exports: sandboxModule.exports,
		require: (name) => {
			required.add(name);
			if (name === "obsidian") return obsidianStub;
			throw new Error(`unexpected runtime dependency '${name}'`);
		},
	});
	const PluginClass = sandboxModule.exports.default;
	check(typeof PluginClass === "function", "main.js must export the plugin class as default");
	check(PluginClass?.prototype instanceof Stub, "the exported class must extend obsidian.Plugin");
	check(typeof PluginClass?.prototype?.onload === "function", "the plugin class must implement onload()");
	check(typeof PluginClass?.prototype?.onunload === "function", "the plugin class must implement onunload()");
} catch (error) {
	errors.push(`main.js failed to load: ${error instanceof Error ? error.message : String(error)}`);
}
check(JSON.stringify([...required]) === JSON.stringify(["obsidian"]), `main.js must only require 'obsidian' (required: ${[...required].join(", ")})`);

// ------------------------------------------------------------------- report
if (errors.length > 0) {
	console.error(`✗ Artifact verification failed:\n  - ${errors.join("\n  - ")}`);
	process.exit(1);
}
const kb = (file) => `${(statSync(path.join(distDir, file)).size / 1024).toFixed(1)} KB`;
console.log(`✓ manifest valid: ${manifest.id}@${manifest.version} (minAppVersion ${manifest.minAppVersion})`);
console.log(`✓ dist/: main.js ${kb("main.js")}, styles.css ${kb("styles.css")}, manifest.json ${kb("manifest.json")}`);
console.log("✓ bundle loads, exports a Plugin subclass, requires only 'obsidian', and contains no network/eval/HTML-injection APIs");
