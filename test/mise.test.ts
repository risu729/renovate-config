import { expect, test } from "bun:test";

import jsonata from "jsonata";

// oxlint-disable-next-line import/no-relative-parent-imports
import config from "../default.json" with { type: "json" };

const expression = config.customManagers
	.find((manager) => manager.description === "Updates mise tools (shorthands)")
	?.matchStrings.at(0);

test("mise tools JSONata expression ignores configs without tools", async () => {
	expect(expression).toBeDefined();

	const result = await jsonata(expression!).evaluate({
		tasks: {
			test: {
				run: "bun test",
			},
		},
	});
	expect(result).toEqual([]);
});

test("mise tools JSONata expression extracts shorthand tools", async () => {
	expect(expression).toBeDefined();

	const result = await jsonata(expression!).evaluate({
		tools: {
			bun: "1.3.14",
			hk: {
				version: "1.48.0",
			},
			"npm:typescript": "6.0.3",
		},
	});
	expect(result).toEqual([
		{
			currentValue: "1.3.14",
			depName: "bun",
		},
		{
			currentValue: "1.48.0",
			depName: "hk",
		},
	]);
});
