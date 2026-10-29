# Risu's renovate-config

This is a [Renovate Shareable Config Presets](https://docs.renovatebot.com/config-presets/) to be used in my projects.

## Usage

Features:

- Extends Renovate best-practice defaults and pins versions.
- Enables automerge for minor, patch, digest, and pin updates.
- Removes hourly and concurrent PR limits.
- Waits one day after a release before raising its update, for every datasource (replacing Renovate's three-day wait for npm), so mise's 24-hour `minimum_release_age` accepts the new version.
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
	"extends": ["github>risu729/renovate-config#3.22.0"]
}
```

## License

[MIT](LICENSE)
