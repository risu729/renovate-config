import { expect, test } from "bun:test";

import jsonata from "jsonata";

// oxlint-disable-next-line import/no-relative-parent-imports
import config from "../default.json" with { type: "json" };

const githubActionsExpression = config.customManagers
	.find((manager) => manager.description === "Updates mise versions in GitHub Actions")
	?.matchStrings.at(0);

const group = config.packageRules.find((rule) => rule.groupName === "mise");

test("mise version pins and the official container share one stable group", () => {
	expect(group).toMatchObject({
		groupName: "mise",
		groupSingleUpdates: true,
		groupSlug: "mise",
		matchDatasources: ["github-releases", "github-release-attachments", "github-tags", "docker"],
		matchPackageNames: ["jdx/mise", "ghcr.io/jdx/mise"],
		separateMajorMinor: false,
		separateMinorPatch: false,
	});
	// Match package identities, including custom managers without depNameTemplate.
	expect(group).not.toHaveProperty("matchDepNames");
	// Also group digest-only updates and initial digest pins.
	expect(group).not.toHaveProperty("matchUpdateTypes");
});

test.each(["jdx/mise-action", "jdx/hk", "ghcr.io/jdx/mise-action", "ghcr.io/other/mise"])(
	"mise grouping excludes unrelated packages: %s",
	(packageName) => {
		expect(group?.matchPackageNames).not.toContain(packageName);
	},
);

test("mise grouping uses strict release filtering while retaining the release cooldown", () => {
	expect(config.minimumReleaseAge).toBe("1 day");
	expect(config.minimumReleaseAgeBehaviour).toBe("timestamp-optional");
	expect(group).not.toHaveProperty("minimumReleaseAge");
	// Runtime pins wait for age; unrelated dependencies can still create early PRs.
	expect(group?.internalChecksFilter).toBe("strict");
	expect(group).not.toHaveProperty("platformAutomerge");
	expect(group).not.toHaveProperty("prCreation");
	expect(config).toMatchObject({
		internalChecksFilter: "flexible",
		platformAutomerge: false,
		prCreation: "immediate",
	});
});

test("mise grouping preserves datasource lookup and Docker digest pinning", () => {
	expect(group).not.toHaveProperty("overrideDatasource");
	expect(group).not.toHaveProperty("overridePackageName");
	expect(group).not.toHaveProperty("versioning");
	expect(group).not.toHaveProperty("pinDigests");
	expect(group).not.toHaveProperty("minimumGroupSize");
});

test("mise GitHub Actions JSONata expression extracts composite action versions", async () => {
	expect(githubActionsExpression).toBeDefined();

	const result = await jsonata(githubActionsExpression!).evaluate({
		runs: {
			steps: [
				{
					uses: "jdx/mise-action@e6a8b3978addb5a52f2b4cd9d91eafa7f0ab959d",
					with: {
						version: "2026.6.13",
					},
				},
			],
			using: "composite",
		},
	});
	expect(result).toEqual({
		currentValue: "2026.6.13",
	});
});
