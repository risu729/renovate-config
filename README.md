# Risu's renovate-config

This is a [Renovate Shareable Config Presets](https://docs.renovatebot.com/config-presets/) to be used in my projects.

## Usage

Features:

- Extends Renovate best-practice defaults and pins versions.
- Enables automerge for minor, patch, digest, and pin updates.
- Removes hourly and concurrent PR limits.
- Creates update branches and PRs immediately for every dependency, including versions still waiting for the one-day release cooldown. This replaces Renovate's three-day wait for npm. Renovate performs automerge itself, after the release-age check and other checks pass, rather than delegating it to the hosting platform. Own GitHub releases and tags (`risu729/**`) and npm packages (`@risu729/**`) remain exempt from the cooldown. Releases without timestamps remain eligible (`timestamp-optional`).
- Creating a PR does not bypass a package manager's safeguards. For example, mise may still refuse to generate `mise.lock` for a tool younger than its 24-hour `minimum_release_age`; Renovate can retry after the version is old enough. Manual merges and consumer overrides are not prevented by this preset.
- Adds custom managers for Biome versions, mise tools, hk Pkl imports, hk-config raw URL imports, GitHub Actions workflow pins, and other tool-specific files used in my repositories.
- Updates Cloudflare compatibility dates in `wrangler.json`, `wrangler.jsonc`, `wrangler.toml`, and `cloudflare.config.ts`, using Miniflare releases. The TypeScript manager extracts date literals directly after `compatibilityDate:` without evaluating TypeScript. Use a standalone `YYYY-MM-DD` literal for automatic updates; imported values need manual updates.
- Normalizes dependency labels while keeping custom-manager-only labels quiet.

Add the following to your `renovate.json` file:

```json
{
	"extends": ["github>risu729/renovate-config"]
}
```

or to use a specific version:

```json
{
	"extends": ["github>risu729/renovate-config#3.22.3"]
}
```

## Development

Run `mise run test` for the Bun unit tests and the Node integration tests. The
integration tests use the mise-pinned Renovate installation to extract fixtures,
apply the preset, and verify grouping and release-age checks without remote lookups.
They intentionally exercise Renovate internals so changes are caught when its pin updates.
To check another installation, set `RENOVATE_EXECUTABLE` to its `renovate` executable.

## License

[MIT](LICENSE)
