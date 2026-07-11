import { expect, test } from "bun:test";

import jsonata from "jsonata";

// oxlint-disable-next-line import/no-relative-parent-imports
import config from "../default.json" with { type: "json" };

const githubActionsExpression = config.customManagers
	.find((manager) => manager.description === "Updates mise versions in GitHub Actions")
	?.matchStrings.at(0);

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
