// ref: https://cspell.org/docs/Configuration

"use strict";

/**
 * @type {import("@cspell/cspell-types").CSpellUserSettings}
 */
module.exports = {
	version: "0.2",
	language: "en",
	dictionaries: ["typescript", "node", "npm", "bash", "markdown"],
	enableGlobDot: true,
	useGitignore: true,
	ignorePaths: [
		".git/",
		// ignore auto-generated files
		".gitignore",
		"bun.lock",
		"default.json",
		// ignore license files
		"LICENSE",
		// ignore test data
		"test/fixtures/",
		"test/__snapshots__/",
	],
	words: [
		"risu",
		"biomejs",
		"taplo",
		"yamlfmt",
		"ghalint",
		"pinact",
		"commitlint",
		"jschema",
		"buni",
		"jsonata",
	],
};
