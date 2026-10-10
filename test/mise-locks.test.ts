import { expect, test } from "bun:test";

import { Glob } from "bun";

// oxlint-disable-next-line import/no-relative-parent-imports
import config from "../default.json" with { type: "json" };

const disabledPaths = config.packageRules
	.filter((rule) => rule.enabled === false)
	.flatMap((rule) => rule.matchFileNames ?? [])
	.map((pattern) => new Glob(pattern));

test.each([
	[".mise/locks/yamllint/1.38.0/pyproject.toml", true],
	[".mise/locks/yamllint/1.38.0/uv.lock", true],
	[".mise/locks/oxfmt/0.72.0/package.json", true],
	[".mise/locks/oxfmt/0.72.0/aube-lock.yaml", true],
	["tools/.mise/locks/yamllint/1.38.0/pyproject.toml", true],
	["unix/home/.config/mise/locks/yamllint/1.38.0/pyproject.toml", true],
	["unix/home/.config/mise/locks/mise.personal/npm-cli/1.0.0/package.json", true],
	["mise.toml", false],
	["mise.lock", false],
	[".mise/config.toml", false],
	["unix/home/.config/mise/config.toml", false],
	["unix/home/.config/mise/mise.personal.lock", false],
	["package.json", false],
	["services/processor/pyproject.toml", false],
	["services/processor/uv.lock", false],
	["locks/pyproject.toml", false],
	[".mise/locks-example/package.json", false],
] as const)("generated mise graph protection selects the right scope: %s", (path, disabled) => {
	expect(disabledPaths.some((pattern) => pattern.match(path))).toBe(disabled);
});
