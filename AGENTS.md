# Agent Instructions

This repository publishes the Renovate preset that every related repository
extends. [README.md](README.md) lists its features for consumers; keep that list
accurate when the preset changes.

## Language

Use English for everything published to GitHub: repository files, code comments,
commit messages, branch names, and the titles, descriptions and comments of pull
requests and issues. Do not translate existing content only to change its
language. Preserve intentional localizations, locale-specific fixtures, quoted
source text, and data whose exact wording is required for correctness.

## Development

`mise install` installs the pinned tools, and mise installs Bun dependencies
automatically (`[deps.bun]` in [`mise.toml`](mise.toml)). Outside CI, the
postinstall hook also runs `hk install --mise`, which installs the git hooks.

| Task                       | Command                 |
| -------------------------- | ----------------------- |
| Lint and format with fixes | `mise run check`        |
| Lint without fixes         | `mise run check --lint` |
| Regenerate `default.json`  | `mise run build`        |
| Unit and integration tests | `mise run test`         |

Edit [`src/default.json5`](src/default.json5) only.
[`default.json`](default.json) is generated from it by `mise run build`, and the
hk `build` step fails when the two differ. `renovate-config-validator --strict`
checks both files and this repository's own
[`.github/renovate.json5`](.github/renovate.json5).

The integration tests (`test/*.integration.mts`) run the mise-pinned
`npm:renovate` against fixtures and deliberately exercise Renovate internals, so
a Renovate update that changes those internals fails here first. When one does,
read the Renovate source at the new version to see what changed. This
repository's own Renovate configuration extends the preset from the default
branch (`github>risu729/renovate-config`), so a preset change applies here as
soon as it merges.

## Releases

Every push to `main` runs semantic-release
([`.github/workflows/release.yml`](.github/workflows/release.yml)), which
creates a tag and a GitHub release. The release job does not wait for CI.
Merging a PR therefore releases whatever its commit type implies. With the
default `releaseRules` of `@semantic-release/commit-analyzer` (13.0.1, as
resolved by `npm:semantic-release` 25.0.9; `lib/default-release-rules.js`):

- `feat` releases a minor version.
- `fix` and `perf` release a patch version. A revert releases a patch only when
  its message contains `This reverts commit <sha>`, as GitHub's Revert button
  produces; a bare `revert:` header releases nothing.
- A `BREAKING CHANGE:` footer, or `!` after the type such as
  `feat!: drop Node.js 22`, releases a major version, even with a type such as
  `chore!:`. [`.releaserc.json`](.releaserc.json) sets `breakingHeaderPattern`
  for both the commit analyzer and the release notes generator, and
  `conventional-commits-parser` (6.4.0; `dist/CommitParser.js`) adds a
  `BREAKING CHANGE` note when it matches, so the release notes list the commit
  under BREAKING CHANGES too.
- Other types, such as `chore`, `ci`, `docs`, `refactor` and `test`, release
  nothing. Renovate uses `chore(deps)` and `ci(deps)` here, so dependency
  updates alone do not release.

Put the `!` or the `BREAKING CHANGE:` footer in a commit message or in the
squash commit message when merging; the PR description is not part of the
squash commit. Tags look like `3.23.2`. Consumers receive a release only when
Renovate updates their pin (see [Related Repositories](#related-repositories)).

## Change Workflow

- Keep one scope per pull request.
- Branch from the latest `main`, or from a prerequisite PR's branch when
  stacking under the global agent rules. Do not push to `main` directly.
- Write commit messages and PR titles as Conventional Commits, for example
  `fix: skip release cooldown for owned packages` or
  `chore(deps): update dependency hk to v2.12.0`.
- Pull requests are squash-merged. GitHub uses the PR title as the squash commit
  subject only for multi-commit PRs; a single-commit PR keeps its commit
  subject, and the commit body is the concatenated commit messages, not the PR
  description. When merging, set the squash commit subject to the PR title.
- Every PR not opened by Renovate, including documentation-only PRs, needs a
  review by a reviewer that did not write the change (for an agent-authored PR,
  a separate review agent) before merging. Address each finding and summarize
  the review in the PR description.
- Before merging, wait until every CI job has finished. The required `CI Check`
  job runs only to fail when another job failed or was cancelled, so it shows as
  skipped when everything passed. CodeQL is also required. Never skip, disable
  or weaken a test or check to get CI green.
- Do not write an ADR, code or a PR for a design still under discussion with the
  owner. Propose it to the owner first and start only after explicit approval.
- Branches of merged PRs are deleted automatically. Delete branches of closed or
  abandoned PRs and other stale branches you created; leave `renovate/*`
  branches to Renovate.
- Do not merge a PR in a repository outside the five listed in
  [Related Repositories](#related-repositories) unless the owner says to.
- Merging to `main` can publish a release (see [Releases](#releases)).

## Design Decisions

Record every design decision in this repository. Nothing should live only in a
chat, an issue thread or agent memory.

- Large decisions get an ADR at `docs/adr/NNNN-kebab-case-title.md`, numbered
  from `0001`, with Status, Context, Decision and Consequences sections. The
  status of a new ADR is `Accepted (YYYY-MM-DD)`, since designs under discussion
  are not written down yet. A replaced ADR stays in place with its status set to
  `Superseded by NNNN`.
- Smaller decisions go in the `docs/` page, README section or AGENTS.md section
  that owns the behavior.
- Rules for agents live in this file only. Do not add `CLAUDE.md` or other
  agent-specific instruction files.
- Recorded decisions are the current design and stay in force until a change is
  approved. They are not proof that the design is right: when a better design
  exists, propose it with its reasoning.

## External Tools

This repository depends heavily on mise, hk, Renovate and semantic-release. When
their behavior matters and is unclear, read their source code at the version in
use (`mise.toml`, `mise.lock`, `package.json` and `bun.lock`) instead of
guessing or relying on documentation alone. Cite the file and line you relied
on, as a permalink at the tag or commit of that version (or the npm package
version when there is no tag), in the PR or document that depends on it.

## Related Repositories

These repositories are maintained together. The shared configuration
repositories release independently; consumers pin a released version, and
Renovate updates the pin.

- [renovate-config](https://github.com/risu729/renovate-config) provides the
  Renovate preset. Consumers extend it in `.github/renovate.json5`, for example
  `extends: ["github>risu729/renovate-config#3.23.2"]`.
- [hk-config](https://github.com/risu729/hk-config) provides hk `presets.pkl`
  and `helpers.pkl`. Consumers amend and import them in `hk.pkl` by tagged URL,
  for example
  `https://raw.githubusercontent.com/risu729/hk-config/v3.1.0/presets.pkl`.
- [tsconfigs](https://github.com/risu729/tsconfigs) provides the npm package
  `@risu729/tsconfigs`. Consumers pin it in `package.json`, for example
  `"@risu729/tsconfigs": "3.0.1"`, and extend it from `tsconfig.json`.

[dotfiles](https://github.com/risu729/dotfiles) and
[github-notification-cleanup](https://github.com/risu729/github-notification-cleanup)
consume all three. The shared repositories also consume each other:
renovate-config uses hk-config and tsconfigs, tsconfigs uses renovate-config and
hk-config, and hk-config uses renovate-config.

The shared configuration repositories are also used by other repositories of
risu729 outside these five. Before changing a shared configuration, check how
the change affects every consumer that is not archived. Find consumers with
`gh search code <pin> --owner risu729`, using `risu729/renovate-config`,
`risu729/hk-config` or `@risu729/tsconfigs` as the pin without quotes. Code
search covers only default branches and excludes forks, and its results do not
show whether a repository is archived, so check each one with
`gh api repos/risu729/<repo> --jq .archived` and skip archived ones.

When a change needs consumers to adapt, update them instead of adding backward
compatibility to the shared configuration. Release the shared configuration
first, then open a PR in each consumer that pins the new release, and link those
PRs from the shared configuration PR. Do not merge consumer PRs outside these
five repositories unless the owner says to (see
[Change Workflow](#change-workflow)).

## Renovate Pull Requests

Check open Renovate PRs in all five repositories listed above every day.

Merge a Renovate PR by hand only when it is a major update, or a grouped PR
containing one, that meets all of these conditions:

- It needs no code or configuration change in this repository.
- It brings no new feature that this repository would want to adopt.
- It does not affect this repository or its consumers (see
  [Related Repositories](#related-repositories)). A major update that changes
  what this repository publishes is never merged by an agent.

Judge these from the release notes and changelog, and from the source at the
new version when they are unclear, and follow the merge rules in
[Change Workflow](#change-workflow). Do not merge any other Renovate PR by
hand; Renovate automerges what its settings allow. When a major update fails a
condition, do not change code for it; report to the owner what it would need.

The [shared preset][preset] (consumers pin a release of it, so check the pinned
tag when it differs from `main`) waits one day after a timestamped release
(`minimumReleaseAge`), except for `risu729/**` and `@risu729/**` packages. It
automerges minor, patch, pin, digest and lock file maintenance updates, and
every update of mise itself, including majors, since mise uses CalVer. Renovate
merges them itself after checks pass (`platformAutomerge: false`). A Renovate PR
that stays open usually has a failing check or is a major update.

When a Renovate PR fails, find the root cause instead of retrying. The same
update often lands in several of the repositories at once, for example a shared
dev tool such as hk, oxlint or mise. Check the same update in the other
repositories, fix the cause once, and apply the same fix to every affected
repository. When the cause is in a shared configuration repository, fix it there
with a `fix:` or `feat:` commit so that a release is published; consumers
receive it through the Renovate update of their pin.

[preset]: https://github.com/risu729/renovate-config/blob/main/src/default.json5
