import config from "../default.json" with { type: "json" };
import response from "./response.json" with { type: "json" };
import output from "./output.json" with { type: "json" };
import { expect, test } from "bun:test";
import jsonata from "jsonata";

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
	expect(result).toStrictEqual(output);
});
