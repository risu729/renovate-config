import { expect, test } from "bun:test";

import jsonata from "jsonata";

// oxlint-disable-next-line import/no-relative-parent-imports
import config from "../default.json" with { type: "json" };
import response from "./fixtures/npm-registry-miniflare.json" with { type: "json" };

test("wrangler-compatibility-date JSONata expression", async () => {
	const expression =
		config.customDatasources["wrangler-compatibility-date"].transformTemplates.at(0);
	expect(expression).toBeDefined();

	const result = await jsonata(expression!).evaluate(response);
	expect(result).toMatchSnapshot();
});
