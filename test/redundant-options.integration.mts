// Keep the preset free of options that only repeat what Renovate already uses.
/* oxlint-disable import/no-nodejs-modules, node/no-sync */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import process from "node:process";
import test from "node:test";
import { pathToFileURL, URL } from "node:url";
import { isDeepStrictEqual } from "node:util";

// oxlint-disable-next-line import/no-relative-parent-imports
import preset from "../default.json" with { type: "json" };

type Config = Record<string, unknown>;

const executable =
	process.env["RENOVATE_EXECUTABLE"] ??
	execFileSync("mise", ["which", "renovate"], { encoding: "utf8" }).trim();
const renovateUrl = pathToFileURL(realpathSync(executable));
const loadRenovate = (path: string) => import(new URL(path, renovateUrl).href);
const { getConfig } = await loadRenovate("./config/defaults.js");
const { mergeChildConfig } = await loadRenovate("./config/index.js");
const { resolveConfigPresets } = await loadRenovate("./config/presets/index.js");
const { init } = await loadRenovate("./logger/index.js");

await init();
const {
	$schema: _schema,
	extends: extended,
	ignorePresets,
	packageRules: ownRules,
	...ownOptions
} = preset as Config & { packageRules: Config[] };
// Renovate's defaults plus every preset this one extends, without its own options.
const inherited: Config = mergeChildConfig(
	getConfig(),
	(await resolveConfigPresets({ extends: extended, ignorePresets })).config,
);
const effective: Config = mergeChildConfig(inherited, ownOptions);
const inheritedRules = (inherited["packageRules"] ?? []) as Config[];

test("top-level options differ from Renovate's defaults and extended presets", () => {
	for (const [key, value] of Object.entries(ownOptions)) {
		assert.ok(
			!isDeepStrictEqual(value, inherited[key]),
			`${key} repeats the inherited value ${JSON.stringify(inherited[key])}`,
		);
	}
});

test("package rule options differ from the value Renovate would use anyway", () => {
	for (const rule of ownRules) {
		const otherRules = [...inheritedRules, ...ownRules.filter((other) => other !== rule)];
		const options = Object.entries(rule).filter(
			([key]) => key !== "description" && !key.startsWith("match"),
		);
		for (const [key, value] of options) {
			// Another rule setting the same option can make an equal value meaningful.
			const contested = otherRules.some((other) => Object.hasOwn(other, key));
			assert.ok(
				contested || !isDeepStrictEqual(value, effective[key]),
				`${key} in ${JSON.stringify(rule)} repeats the top-level value ${JSON.stringify(effective[key])}`,
			);
		}
	}
});
