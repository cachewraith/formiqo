import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			// The `obsidian` package ships type definitions only; tests use a minimal runtime mock.
			obsidian: fileURLToPath(new URL("./tests/mocks/obsidian.ts", import.meta.url)),
		},
	},
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
});
