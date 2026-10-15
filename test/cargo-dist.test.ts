import { expect, test } from "bun:test";

import { file, TOML } from "bun";
import jsonata from "jsonata";

// oxlint-disable-next-line import/no-relative-parent-imports
import config from "../default.json" with { type: "json" };

const manager = config.customManagers.find(
	(customManager) => customManager.description === "Updates dist version in dist.toml",
);
const group = config.packageRules.find((rule) => rule.groupName === "cargo-dist");

test.each([
	["dist.toml", true],
	["dist-workspace.toml", true],
	["crates/cli/dist.toml", true],
	["crates/cli/dist-workspace.toml", true],
	["not-dist.toml", false],
	["dist-workspace.toml.bak", false],
] as const)("cargo-dist config file matching: %s", (path, matches) => {
	expect(manager).toBeDefined();
	expect(
		manager?.managerFilePatterns.some((pattern) =>
			new RegExp(pattern.slice(1, -1), "u").test(path),
		),
	).toBe(matches);
});

test("cargo-dist config extracts the version used by the mise tool", async () => {
	expect(manager).toBeDefined();
	const dist = TOML.parse(
		await file(`${import.meta.dir}/fixtures/cargo-dist/dist-workspace.toml`).text(),
	);
	const mise = TOML.parse(await file(`${import.meta.dir}/fixtures/cargo-dist/mise.toml`).text());
	const result = await jsonata(manager!.matchStrings[0]!).evaluate(dist);
	expect(result).toEqual({ currentValue: "0.32.0" });
	expect(mise).toEqual({ tools: { "cargo-dist": "0.32.0" } });
});

test.each([
	[{ dist: { "cargo-dist-version": "0.32.0" }, version: "9.9.9" }, { currentValue: "0.32.0" }],
	[{ dist: { "cargo-dist-version": "0.33.0" }, version: "9.9.9" }, { currentValue: "0.33.0" }],
	[
		{ dist: { "cargo-dist-version": "1.0.0-rc.1+build.2" }, version: "9.9.9" },
		{ currentValue: "1.0.0-rc.1+build.2" },
	],
] as const)("cargo-dist config extracts the exact version from %j", async (dist, expected) => {
	expect(manager).toBeDefined();
	const result = await jsonata(manager!.matchStrings[0]!).evaluate(dist);
	expect(result).toEqual(expected);
});

test("cargo-dist config follows GitHub releases without writing the tag prefix", () => {
	expect(manager).toMatchObject({
		datasourceTemplate: "github-releases",
		depNameTemplate: "cargo-dist",
		packageNameTemplate: "axodotdev/cargo-dist",
	});
	expect(manager?.extractVersionTemplate).toBeDefined();
	const release = new RegExp(manager!.extractVersionTemplate!, "u").exec("v0.33.0");
	expect(release?.groups?.["version"]).toBe("0.33.0");
});

test.each(["cargo-dist", "aqua:axodotdev/cargo-dist", "github:axodotdev/cargo-dist"])(
	"cargo-dist config and mise tool share a group: %s",
	(depName) => {
		expect(group).toBeDefined();
		expect(group?.matchDepNames).toContain(depName);
		expect(group?.matchDepNames).toContain(manager?.depNameTemplate);
	},
);
