import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

/** Security guardrails: the plugin must never execute, inject or transmit content. */
const securityRules = {
	"no-eval": "error",
	"no-implied-eval": "off",
	"@typescript-eslint/no-implied-eval": "error",
	"no-new-func": "error",
	"no-restricted-globals": [
		"error",
		{ name: "fetch", message: "Formiqo must not make network requests." },
		{ name: "XMLHttpRequest", message: "Formiqo must not make network requests." },
		{ name: "WebSocket", message: "Formiqo must not make network requests." },
	],
	"no-restricted-syntax": [
		"error",
		{ selector: "MemberExpression[property.name=/^(innerHTML|outerHTML)$/]", message: "Never inject HTML; use DOM APIs." },
		{ selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: "Never inject HTML; use DOM APIs." },
		{ selector: "CallExpression[callee.property.name='requestUrl'], CallExpression[callee.name='requestUrl']", message: "Formiqo must not make network requests." },
	],
	"no-restricted-imports": [
		"error",
		{ patterns: [{ group: ["node:*", "fs", "path", "child_process", "electron"], message: "Plugin code must run on desktop and mobile without Node APIs." }] },
	],
};

export default defineConfig(
	{ ignores: ["dist/", "node_modules/", "coverage/", "main.js"] },
	js.configs.recommended,
	{
		files: ["**/*.ts"],
		extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
		languageOptions: {
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
		},
		rules: {
			"@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
			"@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
			"@typescript-eslint/consistent-type-imports": "error",
		},
	},
	{
		files: ["src/**/*.ts"],
		rules: {
			...securityRules,
			"no-console": ["error", { allow: ["error", "warn"] }],
		},
	},
	{
		files: ["tests/**/*.ts"],
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
		},
	},
	{
		files: ["**/*.mjs"],
		languageOptions: {
			globals: { process: "readonly", console: "readonly", URL: "readonly" },
		},
	},
);
