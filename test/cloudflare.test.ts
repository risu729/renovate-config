import { expect, test } from "bun:test";

// oxlint-disable-next-line import/no-relative-parent-imports
import config from "../default.json" with { type: "json" };

const manager = config.customManagers.find(
	(customManager) =>
		customManager.description === "Updates compatibilityDate in cloudflare.config.ts",
);

const extract = (content: string) => {
	expect(manager).toBeDefined();
	return manager!.matchStrings.flatMap((pattern) =>
		Array.from(
			content.matchAll(new RegExp(pattern, "gu")),
			(match) => match.groups?.["currentValue"],
		),
	);
};

test.each([
	["cloudflare.config.ts", true],
	["workers/api/cloudflare.config.ts", true],
	["cf.config.ts", false],
	["cloudflare.config.js", false],
	["cloudflare.config.mjs", false],
	["cloudflare.config.cjs", false],
	["cloudflare.config.mts", false],
	["cloudflare.config.cts", false],
	["not-cloudflare.config.ts", false],
	["cloudflare.config.ts.bak", false],
] as const)("Cloudflare config file matching: %s", (path, matches) => {
	expect(manager).toBeDefined();
	expect(
		manager?.managerFilePatterns.some((pattern) =>
			new RegExp(pattern.slice(1, -1), "u").test(path),
		),
	).toBe(matches);
});

test.each(["compatibilityDate", '"compatibilityDate"', "'compatibilityDate'"])(
	"Cloudflare config extracts literal dates for %s",
	(key) => {
		for (const quote of ['"', "'", "`"]) {
			expect(
				extract(`export default defineConfig({
	worker: {
		name: "api",
		${key}:\n\t\t\t${quote}2026-09-27${quote},
	},
});`),
			).toEqual(["2026-09-27"]);
		}
	},
);

test("Cloudflare config extracts multiple modes without evaluating the module", () => {
	expect(
		extract(`export default defineConfig(({ mode }) => {
	if (mode === "staging") {
		return { worker: { compatibilityDate: "2026-09-27" } };
	}
	return { worker: { compatibilityDate: "2026-09-28" } };
});`),
	).toEqual(["2026-09-27", "2026-09-28"]);
});

test("Cloudflare config ignores computed values, line comments, and unrelated properties", () => {
	expect(
		extract(`export default defineConfig({
	worker: {
		// compatibilityDate: "2026-09-27",
		otherCompatibilityDate: "2026-09-27",
		compatibility_date: "2026-09-27",
		compatibilityDate: process.env.COMPATIBILITY_DATE,
	},
});`),
	).toEqual([]);
	expect(extract('const compatibilityDate = "2026-09-27";')).toEqual([]);
	expect(extract('({ compatibilityDate: "20260927" })')).toEqual([]);
	expect(extract("({ compatibilityDate: \"2026-09-27' })")).toEqual([]);
});

test("Cloudflare and Wrangler config use the same compatibility date datasource", () => {
	const wrangler = config.customManagers.find(
		(customManager) => customManager.description === "Updates compatibility_date in wrangler.toml",
	);
	expect(wrangler).toBeDefined();
	expect(manager).toMatchObject({
		datasourceTemplate: wrangler!.datasourceTemplate,
		depNameTemplate: wrangler!.depNameTemplate,
		versioningTemplate: wrangler!.versioningTemplate,
	});
});
