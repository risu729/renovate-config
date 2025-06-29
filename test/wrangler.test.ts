import { expect, test } from "bun:test";
import jsonata from "jsonata";
import config from "../default.json" with { type: "json" };
// cspell:ignore miniflare
import response from "./fixtures/npm-registry-miniflare.json" with {
	type: "json",
	type: "json",
};

test("wrangler-compatibility-date JSONata expression", async () => {
	const expression =
		config.customDatasources[
			"wrangler-compatibility-date"
		].transformTemplates.at(0);
	if (!expression) {
		throw new Error(
			"No transformTemplates found in wrangler-compatibility-date customDatasource",
		);
	}

	const result = await jsonata(expression).evaluate(response);
	expect(result).toMatchSnapshot();
});
