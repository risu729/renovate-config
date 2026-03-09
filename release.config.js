// Ref: https://semantic-release.gitbook.io/semantic-release/usage/configuration

/**
 * @type {import("semantic-release").Options}
 */
const config = {
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/github",
	],
	// oxlint-disable-next-line eslint/no-template-curly-in-string
	tagFormat: "${version}",
};

export default config;
