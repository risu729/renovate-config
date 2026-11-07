# Risu's renovate-config

This is a [Renovate Shareable Config Presets](https://docs.renovatebot.com/config-presets/) to be used in my projects.

## Usage

Features:

- Extends Renovate best-practice defaults and pins versions.
- Enables automerge for minor, patch, digest, and pin updates.
- Removes hourly and concurrent PR limits.
- Creates early update branches and PRs while the one-day release cooldown is pending, but prefers a mature candidate over a newer pending one (`internalChecksFilter: flexible`). The newest pending version is selected only when no eligible candidate exists in that update bucket. This avoids repeatedly resetting the selected target's cooldown when a mature update is available; it does not create a separate PR for every young release. This replaces Renovate's three-day wait for npm. Renovate performs automerge itself after checks pass (`platformAutomerge: false`). Own GitHub releases and tags (`risu729/**`) and npm packages (`@risu729/**`) remain exempt from the cooldown. Releases without timestamps remain eligible (`timestamp-optional`).
- Keeps mise runtime pins and the official container in the same `renovate/mise` branch, with strict filtering as a scoped exception. Docker/GHCR updates can arrive first because their datasource does not provide release timestamps. Timestamped mise pins join the same branch after the cooldown. CI must reject mismatched versions until they catch up; grouping alone does not synchronize version selection. Frequent container releases can keep that PR failing until releases settle. This preset does not install that consistency check in consumer repositories. Follow-up and upstream container timestamp support are tracked in [#2898](https://github.com/risu729/renovate-config/issues/2898).
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
	"extends": ["github>risu729/renovate-config#3.23.0"]
}
```

## Development

Run `mise run build` to build `default.json` from `src/default.json5`. The task reuses
unchanged inputs and restores missing or modified output from its local cache.
Use `mise run --force build` to regenerate the file explicitly.

Run `mise run test` for the Bun unit tests and the Node integration tests. The
integration tests use the mise-pinned Renovate installation to extract fixtures,
apply the preset, and verify grouping and release-age checks without remote lookups.
They intentionally exercise Renovate internals so changes are caught when its pin updates.
To check another installation, set `RENOVATE_EXECUTABLE` to its `renovate` executable.

## License

[MIT](LICENSE)
