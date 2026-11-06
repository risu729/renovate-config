// Exercise Renovate's real update pipeline; replace only the platform I/O boundary.
/* oxlint-disable import/no-nodejs-modules, node/no-sync */
// Keep each sequential integration scenario and its assertions together.
/* oxlint-disable eslint/max-statements, eslint/max-lines-per-function, eslint/no-loop-func */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import process from "node:process";
import test from "node:test";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

// oxlint-disable-next-line import/no-relative-parent-imports
import preset from "../default.json" with { type: "json" };

const executable =
	process.env["RENOVATE_EXECUTABLE"] ??
	execFileSync("mise", ["which", "renovate"], { encoding: "utf8" }).trim();
const renovateUrl = pathToFileURL(realpathSync(executable));
const loadRenovate = (path: string) => import(new URL(path, renovateUrl).href);
const { getConfig } = await loadRenovate("./config/defaults.js");
const { GlobalConfig } = await loadRenovate("./config/global.js");
const { mergeChildConfig } = await loadRenovate("./config/index.js");
const { resolveConfigPresets } = await loadRenovate("./config/presets/index.js");
const { init } = await loadRenovate("./logger/index.js");
const { default: platformApis } = await loadRenovate("./modules/platform/api.js");
const { setPlatformApi } = await loadRenovate("./modules/platform/index.js");
const { platformScmImpls } = await loadRenovate("./modules/platform/scm.js");
const { api: semver } = await loadRenovate("./modules/versioning/semver/index.js");
const { applyPackageRules } = await loadRenovate("./util/package-rules/index.js");
const { filterInternalChecks } = await loadRenovate(
	"./workers/repository/process/lookup/filter-checks.js",
);
const { branchifyUpgrades } = await loadRenovate("./workers/repository/updates/branchify.js");
const { computeInternalChecksStatus, setStability } = await loadRenovate(
	"./workers/repository/update/branch/status-checks.js",
);
const { ensurePr } = await loadRenovate("./workers/repository/update/pr/index.js");
const { checkAutoMerge } = await loadRenovate("./workers/repository/update/pr/automerge.js");

await init();
GlobalConfig.set({ localDir: fileURLToPath(new URL("../", import.meta.url)), platform: "github" });
const config = mergeChildConfig(getConfig(), (await resolveConfigPresets(preset)).config);
Object.assign(config, {
	baseBranch: "main",
	errors: [],
	repoIsOnboarded: true,
	semanticCommits: "disabled",
	warnings: [],
});

interface Dependency {
	datasource: string;
	depName: string;
	manager: string;
	packageFile: string;
	packageName: string;
}

const dependencies: Dependency[] = [
	["npm", "lodash", "npm", "package.json", "lodash"],
	["pypi", "requests", "pip_requirements", "requirements.txt", "requests"],
	["crate", "serde", "cargo", "Cargo.toml", "serde"],
	[
		"github-tags",
		"actions/checkout",
		"github-actions",
		".github/workflows/ci.yml",
		"actions/checkout",
	],
	[
		"github-release-attachments",
		"jdx/mise",
		"github-actions",
		".github/workflows/ci.yml",
		"jdx/mise",
	],
	["github-releases", "hk", "regex", "hk.pkl", "jdx/hk"],
	["github-releases", "github:jdx/hk", "mise", "mise.toml", "jdx/hk"],
	["docker", "node", "dockerfile", "Dockerfile", "node"],
].map(([datasource, depName, manager, packageFile, packageName]) => ({
	datasource: datasource!,
	depName: depName!,
	manager: manager!,
	packageFile: packageFile!,
	packageName: packageName!,
}));

// The mock receives real status-check and PR requests. A green CI check alone is
// Insufficient while Renovate's non-required stability check is still pending.
let stabilityStatus = "green";
let ciStatus = "green";
let mergeCalls = 0;
const createdPrOptions: { usePlatformAutomerge: boolean }[] = [];
platformApis.set("github", {
	createPr: (request: { platformPrOptions: { usePlatformAutomerge: boolean } }) => {
		createdPrOptions.push(request.platformPrOptions);
		return Promise.resolve({ number: 1 });
	},
	getBranchPr: () => Promise.resolve(null),
	getBranchStatus: () => Promise.resolve(ciStatus === "green" ? stabilityStatus : ciStatus),
	getBranchStatusCheck: () => Promise.resolve(stabilityStatus),
	massageMarkdown: (body: string) => body,
	mergePr: () => {
		mergeCalls += 1;
		return Promise.resolve(true);
	},
	setBranchStatus: (request: { state: string }) => {
		stabilityStatus = request.state;
		return Promise.resolve();
	},
});
platformScmImpls.set(
	"github",
	class {
		// The SCM boundary has no state; production behavior is not stubbed elsewhere.
		// oxlint-disable-next-line eslint/class-methods-use-this
		isBranchModified = () => Promise.resolve(false);
	},
);
setPlatformApi("github");

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const makeBranch = async (dependency: Dependency, ageHours?: number) => {
	const dependencyConfig = await applyPackageRules(
		mergeChildConfig(config, {
			...dependency,
			currentValue: "1.0.0",
			currentVersion: "1.0.0",
		}),
		"test",
	);
	assert.partialDeepStrictEqual(dependencyConfig, {
		internalChecksFilter: "none",
		platformAutomerge: false,
		prCreation: "immediate",
	});
	const selected = await filterInternalChecks(dependencyConfig, semver, "test", [
		{ releaseTimestamp: hoursAgo(72), version: "1.0.1" },
		{
			...(typeof ageHours === "undefined" ? {} : { releaseTimestamp: hoursAgo(ageHours) }),
			version: "1.0.2",
		},
	]);
	assert.equal(selected.release?.version, "1.0.2");
	assert.equal(selected.pendingChecks, false);
	const { branches } = await branchifyUpgrades(config, {
		[dependency.manager]: [
			{
				deps: [
					{
						...dependency,
						currentValue: "1.0.0",
						currentVersion: "1.0.0",
						updates: [
							{
								...selected.release,
								newValue: "1.0.2",
								newVersion: "1.0.2",
								pendingChecks: selected.pendingChecks,
								updateType: "patch",
							},
						],
					},
				],
				packageFile: dependency.packageFile,
			},
		],
	});
	// Best-practice presets can also generate a lock-file-maintenance branch.
	for (const candidate of branches) {
		assert.partialDeepStrictEqual(candidate, {
			platformAutomerge: false,
			prCreation: "immediate",
		});
	}
	const releaseBranches = branches.filter(
		(candidate: { updateType: string }) => candidate.updateType !== "lockFileMaintenance",
	);
	assert.equal(releaseBranches.length, 1);
	const [branch] = releaseBranches;
	assert.equal(branch.upgrades.length, 1);
	assert.partialDeepStrictEqual(branch, {
		automerge: true,
		platformAutomerge: false,
		prCreation: "immediate",
	});
	Object.assign(branch, await computeInternalChecksStatus(branch), {
		isConflicted: false,
		pruneBranchAfterAutomerge: false,
	});
	return branch;
};

for (const dependency of dependencies) {
	test(`${dependency.manager}/${dependency.datasource}: PR before cooldown, merge after cooldown`, async () => {
		stabilityStatus = "green";
		ciStatus = "green";
		mergeCalls = 0;
		createdPrOptions.length = 0;
		const young = await makeBranch(dependency, 1);
		assert.equal(young.stabilityStatus, "yellow");
		await setStability(young);
		const result = await ensurePr(young);
		assert.equal(result.type, "with-pr");
		assert.equal(createdPrOptions.length, 1);
		assert.equal(createdPrOptions[0]?.usePlatformAutomerge, false);
		assert.partialDeepStrictEqual(await checkAutoMerge(result.pr, young), {
			automerged: false,
			prAutomergeBlockReason: "BranchNotGreen",
		});
		assert.equal(mergeCalls, 0);

		const mature = await makeBranch(dependency, 48);
		assert.equal(mature.stabilityStatus, "green");
		await setStability(mature);
		ciStatus = "red";
		assert.equal((await checkAutoMerge(result.pr, mature)).automerged, false);
		assert.equal(mergeCalls, 0);
		ciStatus = "green";
		assert.equal((await checkAutoMerge(result.pr, mature)).automerged, true);
		assert.equal(mergeCalls, 1);
	});
}

test("missing timestamps retain the existing optional-timestamp behavior", async () => {
	const branch = await makeBranch(dependencies[0]!);
	assert.equal(branch.stabilityStatus, "green");
});

for (const [datasource, packageName] of [
	["github-releases", "risu729/hk-config"],
	["github-tags", "risu729/wrangler-deploy-action"],
	["npm", "@risu729/tsconfigs"],
]) {
	test(`owned-package exception remains immediate: ${packageName}`, async () => {
		const branch = await makeBranch(
			{
				...dependencies[0]!,
				datasource: datasource!,
				depName: packageName!,
				packageName: packageName!,
			},
			1,
		);
		assert.equal(branch.upgrades[0].minimumReleaseAge, "0 days");
		assert.equal(branch.stabilityStatus, "green");
	});
}

test("one young upgrade keeps a mixed group pending", async () => {
	const mature = await makeBranch(dependencies[0]!, 48);
	const young = await makeBranch(dependencies[1]!, 1);
	const status = await computeInternalChecksStatus({
		...mature,
		upgrades: [...mature.upgrades, ...young.upgrades],
	});
	assert.equal(status.stabilityStatus, "yellow");
});

for (const [updateType, automerge] of [
	["major", false],
	["minor", true],
	["patch", true],
	["digest", true],
	["pin", true],
	["pinDigest", false],
] as const) {
	test(`existing automerge policy is preserved for ${updateType} updates`, async () => {
		const matched = await applyPackageRules(
			mergeChildConfig(mergeChildConfig(config, config[updateType]), {
				...dependencies[0],
				updateType,
			}),
			"test",
		);
		assert.partialDeepStrictEqual(matched, {
			automerge,
			platformAutomerge: false,
			prCreation: "immediate",
		});
	});
}
