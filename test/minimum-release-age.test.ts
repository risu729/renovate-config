import { expect, test } from "bun:test";

import { Glob } from "bun";

// oxlint-disable-next-line import/no-relative-parent-imports
import config from "../default.json" with { type: "json" };

const exceptions = config.packageRules.filter((rule) => rule.minimumReleaseAge === "0 days");

test("release cooldown exceptions are limited to owned GitHub and npm packages", () => {
	expect(config.minimumReleaseAge).toBe("1 day");
	expect(config.minimumReleaseAgeBehaviour).toBe("timestamp-optional");
	expect(exceptions).toHaveLength(2);
	expect(exceptions).toEqual([
		expect.objectContaining({
			matchDatasources: ["github-releases", "github-tags"],
			matchPackageNames: ["risu729/**"],
		}),
		expect.objectContaining({
			matchDatasources: ["npm"],
			matchPackageNames: ["@risu729/**"],
		}),
	]);
	for (const rule of exceptions) {
		// Custom managers can use short dependency names, such as hk-config.
		expect(rule).not.toHaveProperty("matchDepNames");
		expect(rule).not.toHaveProperty("matchManagers");
		expect(rule).not.toHaveProperty("matchUpdateTypes");
	}
});

test.each([
	["github-releases", "risu729/hk-config", true],
	["github-releases", "risu729/renovate-config", true],
	["github-tags", "risu729/wrangler-deploy-action", true],
	["npm", "@risu729/tsconfigs", true],
	["npm", "@risu729/renovate-config", true],
	["github-releases", "jdx/hk", false],
	["github-releases", "jdx/mise", false],
	["github-tags", "actions/checkout", false],
	["github-releases", "risu729-other/hk-config", false],
	["github-tags", "other/risu729", false],
	["github-releases", "@risu729/tsconfigs", false],
	["npm", "@risu729-other/tsconfigs", false],
	["npm", "risu729-package", false],
	["npm", "risu729/hk-config", false],
	["docker", "risu729/image", false],
	["gitlab-tags", "risu729/hk-config", false],
] as const)("release cooldown exception for %s %s: %s", (datasource, packageName, exempt) => {
	const matches = exceptions.some(
		(rule) =>
			rule.matchDatasources?.includes(datasource) &&
			rule.matchPackageNames?.some((pattern) => new Glob(pattern).match(packageName)),
	);
	expect(matches).toBe(exempt);
});

test("dependencies use strict filtering without delegating automerge", () => {
	expect(config).toMatchObject({
		internalChecksFilter: "strict",
		platformAutomerge: false,
		prCreation: "immediate",
	});
	for (const rule of config.packageRules) {
		if (rule.groupName === "mise") {
			expect(rule.internalChecksFilter).toBe("strict");
		} else {
			expect(rule).not.toHaveProperty("internalChecksFilter");
		}
		expect(rule).not.toHaveProperty("platformAutomerge");
		expect(rule).not.toHaveProperty("prCreation");
	}
});
