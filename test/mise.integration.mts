// This Node-only integration test uses Renovate's native modules and synchronous fixture setup.
/* oxlint-disable import/no-nodejs-modules, node/no-sync */
// Renovate shares repository caches, so exercise dependencies sequentially.
/* oxlint-disable eslint/no-await-in-loop */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import process from "node:process";
import test from "node:test";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

// oxlint-disable-next-line import/no-relative-parent-imports
import preset from "../default.json" with { type: "json" };

interface ExtractedDependency {
	currentDigest?: string;
	currentValue?: string;
	datasource: string;
	depName: string;
	depType?: string;
	packageName?: string;
}

interface Dependency extends ExtractedDependency {
	manager: string;
	packageFile: string;
	packageName: string;
}

// Use the mise-pinned installation, without adding a second Renovate dependency.
// The override also allows testing against the version running on hosted Renovate.
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
const { extractPackageFile: extractActions } = await loadRenovate(
	"./modules/manager/github-actions/extract.js",
);
const { extractPackageFile: extractJsonata } = await loadRenovate(
	"./modules/manager/custom/jsonata/index.js",
);
const { extractPackageFile: extractDocker } = await loadRenovate(
	"./modules/manager/dockerfile/extract.js",
);
const { api: semver } = await loadRenovate("./modules/versioning/semver/index.js");
const { applyPackageRules } = await loadRenovate("./util/package-rules/index.js");
const { filterInternalChecks } = await loadRenovate(
	"./workers/repository/process/lookup/filter-checks.js",
);
const { branchifyUpgrades } = await loadRenovate("./workers/repository/updates/branchify.js");
const { computeInternalChecksStatus } = await loadRenovate(
	"./workers/repository/update/branch/status-checks.js",
);

await init();
const fixtureUrl = new URL("./fixtures/mise/", import.meta.url);
GlobalConfig.set({ dryRun: "full", localDir: fileURLToPath(fixtureUrl), platform: "github" });
const config = mergeChildConfig(getConfig(), (await resolveConfigPresets(preset)).config);
Object.assign(config, {
	errors: [],
	repoIsOnboarded: true,
	semanticCommits: "disabled",
	warnings: [],
});
const customManager = preset.customManagers.find(
	(manager) => manager.description === "Updates mise versions in GitHub Actions",
);
assert.ok(customManager);

const dependencies: Dependency[] = [];
for (const [fixture, packageFile] of [
	["workflow.yml", ".github/workflows/ci.yml"],
	["action.yml", "action.yml"],
] as const) {
	const content = readFileSync(new URL(fixture, fixtureUrl), "utf8");
	const native: { deps: ExtractedDependency[] } | null = await extractActions(
		content,
		packageFile,
		{},
	);
	assert.ok(native);
	const custom: { deps: ExtractedDependency[] } | null = await extractJsonata(
		content,
		packageFile,
		customManager,
	);
	assert.ok(custom);
	for (const [manager, extracted] of [
		["github-actions", native],
		["jsonata", custom],
	] as const) {
		for (const dependency of extracted.deps) {
			dependencies.push({
				...dependency,
				manager,
				packageFile,
				packageName: dependency.packageName ?? dependency.depName,
			});
		}
	}
}
const docker: { deps: ExtractedDependency[] } | null = extractDocker(
	readFileSync(new URL("Dockerfile", fixtureUrl), "utf8"),
	"Dockerfile",
	{},
);
assert.ok(docker);
for (const dependency of docker.deps) {
	dependencies.push({
		...dependency,
		manager: "dockerfile",
		packageFile: "Dockerfile",
		packageName: dependency.packageName ?? dependency.depName,
	});
}
const miseDependencies = dependencies.filter((dependency) =>
	["jdx/mise", "ghcr.io/jdx/mise"].includes(dependency.packageName),
);
assert.equal(miseDependencies.length, 5);

for (const packageFile of [".github/workflows/ci.yml", "action.yml"]) {
	test(`native extraction and grouping: ${packageFile}`, async () => {
		const dependency = miseDependencies.find(
			(candidate) =>
				candidate.manager === "github-actions" && candidate.packageFile === packageFile,
		);
		assert.ok(dependency);
		assert.partialDeepStrictEqual(dependency, {
			currentValue: "2026.11.0",
			datasource: "github-release-attachments",
			depType: "uses-with",
		});
		const matched = await applyPackageRules(mergeChildConfig(config, dependency), "test");
		assert.partialDeepStrictEqual(matched, {
			datasource: dependency.datasource,
			groupName: "mise",
			groupSlug: "mise",
			internalChecksFilter: "none",
			minimumReleaseAge: "1 day",
			platformAutomerge: false,
		});
		if (packageFile === ".github/workflows/ci.yml") {
			assert.equal(dependency.currentDigest, "a".repeat(64));
			assert.equal(matched.currentDigest, dependency.currentDigest);
		}
	});
}

test("mise-action remains outside the mise runtime group", async () => {
	const actions = dependencies.filter((dependency) => dependency.packageName === "jdx/mise-action");
	assert.equal(actions.length, 2);
	for (const dependency of actions) {
		const matched = await applyPackageRules(mergeChildConfig(config, dependency), "test");
		assert.notEqual(matched.groupName, "mise");
	}
});

const selectUpdate = async (dependency: Dependency, ageHours: number) => {
	const dependencyConfig = await applyPackageRules(
		mergeChildConfig(config, { ...dependency, currentVersion: "2026.11.0" }),
		"test",
	);
	const timestamp =
		dependency.datasource === "docker"
			? {}
			: { releaseTimestamp: new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString() };
	const selected = await filterInternalChecks(dependencyConfig, semver, "test", [
		{
			releaseTimestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
			version: "2026.11.1",
		},
		{ version: "2026.11.2", ...timestamp },
	]);
	// Before the fix, native uses-with selects the older 2026.11.1 here.
	assert.equal(selected.release?.version, "2026.11.2");
	return {
		...selected.release,
		newValue: selected.release.version,
		newVersion: selected.release.version,
		pendingChecks: selected.pendingChecks,
		updateType: "patch",
		...(dependency.currentDigest
			? { newDigest: `${dependency.datasource === "docker" ? "sha256:" : ""}${"b".repeat(64)}` }
			: {}),
	};
};

for (const [ageHours, stabilityStatus] of [
	[1, "yellow"],
	[48, "green"],
] as const) {
	test(`native pins, custom pins and Docker stay synchronized at ${ageHours} hours`, async () => {
		const packageFiles: Record<string, { deps: unknown[]; packageFile: string }[]> = {};
		for (const dependency of miseDependencies) {
			const files = (packageFiles[dependency.manager] ??= []);
			files.push({
				deps: [
					{
						...dependency,
						updates: [await selectUpdate(dependency, ageHours)],
					},
				],
				packageFile: dependency.packageFile,
			});
		}
		const { branches } = await branchifyUpgrades(config, packageFiles);
		assert.equal(branches.length, 1);
		const [branch] = branches;
		assert.partialDeepStrictEqual(branch, {
			branchName: "renovate/mise",
			platformAutomerge: false,
			prCreation: "immediate",
		});
		assert.equal(branch.upgrades.length, miseDependencies.length);
		assert.equal((await computeInternalChecksStatus(branch)).stabilityStatus, stabilityStatus);
	});
}
