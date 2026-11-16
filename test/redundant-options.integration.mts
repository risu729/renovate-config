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

// Update types (such as lockFileMaintenance) and managers apply before packageRules.
// A rule may then need to restore the top-level value.
const nestedConfigs = Object.values(effective).filter(
	(value): value is Config => typeof value === "object" && value !== null && !Array.isArray(value),
);

test("top-level options differ from Renovate's defaults and extended presets", () => {
	const repeated = Object.entries(ownOptions)
		.filter(([key, value]) => isDeepStrictEqual(value, inherited[key]))
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
	assert.deepEqual(repeated, []);
});

test("package rule options differ from the value Renovate would use anyway", () => {
	const repeated = ownRules.flatMap((rule, index) => {
		// Only an earlier rule or a nested config can change the value a rule restores.
		const earlier = [...inheritedRules, ...ownRules.slice(0, index), ...nestedConfigs];
		return Object.entries(rule)
			.filter(([key]) => key !== "description" && !key.startsWith("match"))
			.filter(
				([key, value]) =>
					isDeepStrictEqual(value, effective[key]) &&
					!earlier.some((other) => Object.hasOwn(other, key)),
			)
			.map(([key, value]) => `packageRules[${index}].${key}: ${JSON.stringify(value)}`);
	});
	assert.deepEqual(repeated, []);
});
