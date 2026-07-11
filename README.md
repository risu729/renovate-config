# Risu's renovate-config

This is a [Renovate Shareable Config Presets](https://docs.renovatebot.com/config-presets/) to be used in my projects.

## Usage

Features:

- Extends Renovate best-practice defaults and pins versions.
- Enables automerge for minor, patch, digest, and pin updates.
- Removes hourly and concurrent PR limits.
- Adds custom managers for Biome versions, mise tools, hk Pkl imports, hk-config raw URL imports, GitHub Actions workflow pins, and other tool-specific files used in my repositories.
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
	"extends": ["github>risu729/renovate-config#3.17.3"]
}
```

## License

[MIT](LICENSE)
