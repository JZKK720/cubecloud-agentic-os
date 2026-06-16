# Releasing agent-desktop

The release pipeline lives in `.github/workflows/release.yml`. It runs
on pushes to the `release` branch and via manual `workflow_dispatch`.
A real release cuts a tag, builds signed artifacts on all three
platforms, publishes a GitHub Release, and (manually, via the
`winget-publish` workflow) opens a PR against `microsoft/winget-pkgs`.

## Required secrets

The `release.yml` workflow reads the following secrets. Configure them
at **Settings -> Secrets and variables -> Actions** on the fork before
running a non-dry-run release.

### Code signing (macOS)

| Secret             | What it is                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `CSC_LINK`         | base64 of the `.p12` Developer ID Application certificate, exported from Keychain Access.   |
| `CSC_KEY_PASSWORD` | Password for the `.p12` above.                                                              |

The `check_macos_secrets` job fails the release immediately if either
is missing, so the macOS build doesn't waste 10+ minutes per arch
before failing at notarization.

### Notarization (macOS)

| Secret           | What it is                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ASC_API_KEY`    | base64 of the App Store Connect API `.p8` key. Generate at https://appstoreconnect.apple.com/access/api (App Manager role, "App Store Connect API" key). |
| `ASC_KEY_ID`     | The 10-character key ID, e.g. `AB12CD34EF`.                                                                             |
| `ASC_ISSUER_ID`  | The 10-character issuer ID (UUID-ish, no dashes).                                                                       |

Without all three, the release still builds but produces an ad-hoc
signed `.dmg` that opens on the developer's machine and is rejected
by Gatekeeper on everyone else's. **Do not skip notarization** —
Microsoft Defender SmartScreen and macOS Gatekeeper will both block
the artifact, and Electron's auto-updater will refuse to install the
delta.

### Telemetry (build-time only)

| Secret              | What it is                                              |
| ------------------- | ------------------------------------------------------- |
| `VITE_POSTHOG_KEY`  | PostHog project API key. Bundled into the renderer.     |
| `VITE_POSTHOG_HOST` | PostHog ingest host (e.g. `https://us.i.posthog.com`).  |

These are not required for a build to succeed, but builds without
them will ship with telemetry disabled. Local dev builds default to
the public PostHog project, so this is only meaningful for the OEM
release channel.

## Optional secrets

| Secret              | What it does                                                                  |
| ------------------- | ----------------------------------------------------------------------------- |
| `SNAPCRAFT_TOKEN`   | Pushes the Linux `.snap` to the global stable channel on the Snap Store.      |
| `WINGET_PKGS_TOKEN` | Opens a PR against `microsoft/winget-pkgs` from the `winget-publish` workflow. |

## How to cut a release

1. Bump `version` in `package.json` and `package-lock.json`.
2. Add a `changelogs/<version>.md` entry summarising user-facing changes.
3. Open a PR to `main`. The CI workflow runs `npm run typecheck`,
   `npm test`, and the bundled catalog.
4. Once merged, fast-forward the `release` branch to the same commit.
5. Watch the `Release` workflow on the `release` branch. By default
   it's a dry run — the prepare job computes the version, all four
   platform jobs build, and `generate_winget` produces the winget
   manifests, but no tag is pushed and no GitHub Release is created.
6. If everything looks green, re-run the workflow with `dry_run =
   false` from the Actions UI. This creates the `v<version>` tag,
   publishes the GitHub Release, and uploads the `winget-manifests-*`
   artifact.
7. Manually trigger the `winget-publish` workflow with the same
   version. It will re-derive the manifest from the published GitHub
   Release asset and open a PR against `microsoft/winget-pkgs`. The
   winget-pkgs review bot runs ~5-30 minutes; the PR typically
   merges within a day.

## Verifying a release locally

`npm run build:unpack` produces an unpacked `dist/` directory with
the Electron app binary that you can launch directly. This is the
fastest way to sanity-check a code change before paying the cost of
a full NSIS/dmg/rpm/snap round-trip. It does **not** produce signed
artifacts and should not be used as a release artifact.

For a signed local build (e.g. to debug a signing failure), set the
`CSC_LINK` / `CSC_KEY_PASSWORD` / `ASC_API_KEY` / `ASC_KEY_ID` /
`ASC_ISSUER_ID` env vars in your shell and run `npm run build:mac`
on macOS, or `npm run build:win` on Windows. The notarize step only
runs on macOS.
