# Risu's renovate-config

This is a [Renovate Shareable Config Presets](https://docs.renovatebot.com/config-presets/) to be used in my projects.

## Usage

Features:

- Extends Renovate best-practice defaults and pins versions.
- Enables automerge for minor, patch, digest, and pin updates.
- Removes hourly and concurrent PR limits.
- Uses strict filtering in Renovate's normal version-candidate selection to wait for the one-day release cooldown before creating update branches and PRs (`internalChecksFilter: strict`). An eligible mature candidate is preferred over a newer pending one; when every candidate in an update bucket is pending, no new branch or PR is created. Eligible updates still create PRs immediately (`prCreation: immediate`). This replaces Renovate's three-day wait for npm. Renovate performs automerge itself after checks pass (`platformAutomerge: false`). Own GitHub releases and tags (`risu729/**`) and npm packages (`@risu729/**`) remain exempt from the cooldown. Releases without timestamps remain eligible (`timestamp-optional`). Consumer `followTag` rules do not use the same mature-version fallback, so a frequently moving tag can still delay updates.
- Keeps mise runtime pins and the official container in the same `renovate/mise` branch, with the same strict release filtering. The group matches the Docker Hub image `jdxcode/mise`, not `ghcr.io/jdx/mise`: Renovate only reads Docker release timestamps from Docker Hub, so GHCR tags skipped the cooldown and moved ahead of the pins. mise pushes the Docker Hub tag from the same build, shortly after the GitHub release is published, so the tag can mature up to about an hour after the pins; for that window a branch can hold mismatched versions until the next run. Repositories still using `ghcr.io/jdx/mise` fall out of the group. Same-tag digest timestamps and upstream container timestamp support are tracked in [#2898](https://github.com/risu729/renovate-config/issues/2898).
- A package manager can impose its own safeguards. For example, mise may refuse to generate `mise.lock` for a tool younger than its 24-hour `minimum_release_age`. Manual merges and consumer overrides are not prevented by this preset.
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
	"extends": ["github>risu729/renovate-config#3.23.3"]
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
