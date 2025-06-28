// ref: https://cspell.org/docs/Configuration

"use strict";

/**
 * @type {import("@cspell/cspell-types").CSpellUserSettings}
 */
module.exports = {
	dictionaries: ["typescript", "node", "npm", "bash", "markdown"],
	enableGlobDot: true,
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
	language: "en",
	useGitignore: true,
	version: "0.2",
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
