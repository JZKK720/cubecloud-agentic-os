# Contributing to Agent Desktop

Thanks for your interest in contributing to Agent Desktop! Whether it's a bug fix, a new feature, improved docs, or just a typo — every contribution helps.

This project is inspired by hermes-desktop and now developed as Cubecloud Agent Desktop; contributions should align with Cubecloud's product direction and coding standards.

## Languages

- English: `CONTRIBUTING.md`
- 简体中文: `CONTRIBUTING.zh-CN.md`
- 日本語: `CONTRIBUTING.ja-JP.md`

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the app in development mode:**

   ```bash
   npm run dev
   ```

## Making Changes

1. Create a new branch from `main`:

   ```bash
   git checkout -b your-branch-name
   ```

2. Make your changes. Keep commits focused — one logical change per commit.

3. Run checks before submitting:

   ```bash
   npm run lint
   npm run typecheck
   ```

4. Test your changes locally with `npm run dev` to make sure everything works as expected.

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a pull request against `main` on the upstream repo.
3. Write a clear description of what you changed and why.
4. If your PR addresses an open issue, reference it (e.g., `Fixes #42`).

### Keep Pull Requests Small

Please keep PRs small and focused — they are much easier to review and merge. PRs that touch too many files or bundle unrelated changes will likely be asked for splitting up or may not be accepted.

- Stick to one logical change per PR (one fix, one feature, one refactor).
- If you find yourself touching many unrelated files, split the work into multiple PRs.
- Avoid bundling formatting/style sweeps with functional changes.
- Smaller PRs get reviewed and merged faster.

A maintainer will review your PR and may request changes. Once approved, it will be merged.

## Reporting Bugs

Found a bug? [Open an issue](https://github.com/JZKK720/cubecloud-agentic-os/issues/new) with:

- A clear title and description.
- Steps to reproduce the issue.
- What you expected to happen vs. what actually happened.
- Your OS and app version, if relevant.

## Requesting Features

Have an idea? [Open an issue](https://github.com/JZKK720/cubecloud-agentic-os/issues/new) and describe:

- The problem you're trying to solve.
- How you'd like it to work.
- Any alternatives you've considered.

## Project Structure

```text
src/main/                Electron main process, IPC handlers, hermes integration
src/preload/             Secure renderer bridge
src/renderer/src/        React app and UI components
resources/               App icons and packaged assets
build/                   Packaging resources
docs/                    Architecture docs and legal policies (Cubecloud-original)
docs/legal/              Active legal policies: TRADEMARK, EULA,
                         PAID_SERVICES, COMMERCIAL_LICENSE
scripts/                 Cubecloud-original smoke / capture / verify scripts
tests/                   Unit tests (Vitest)
licenses/                Vendored copies of the three offered licenses
                         (AGPL-3.0, Apache-2.0, MIT) and reference-only
                         upstream project licenses
```

## Code Style

- The project uses TypeScript, React, and Electron.
- Run `npm run lint` to check for lint errors.
- Run `npm run typecheck` to verify type safety.
- Follow existing patterns and conventions in the codebase.
- New Cubecloud-original files should include an
  `SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)`
  header (see `BRANDING_AND_LICENSE.md` §"V2.5 transitions landed"
  for the rationale and the per-file convention).

## Community

- Cubecloud community channels are still being finalized during the rebrand. Use repository issues for coordination in the meantime.
- Check the [Hermes Agent documentation](https://hermes-agent.nousresearch.com/docs/) for current runtime behavior while Cubecloud-specific docs are being written.

## License

By contributing, you agree that your contributions will be
licensed under the project's dual-license terms as described in
[`LICENSE`](LICENSE): **AGPL-3.0-or-later OR Apache-2.0 OR MIT**,
applied at the consumer's choice, for Cubecloud-original work.
The inherited `hermes-desktop` framework code that hosts the
Cubecloud-original modules remains hard-MIT and is unaffected
by your contribution. See `BRANDING_AND_LICENSE.md` §"V2.5
transitions landed" for the full diff that established the
dual-license posture.

In short:

- The code you contribute to Cubecloud-original paths (V2.3
  modules, renderer rebuilds, state layer, scripts, docs, new
  files) becomes available to downstream consumers under any
  one of the three offered licenses.
- The framework code that your contribution imports or links
  against (the inherited `hermes-desktop` parts) keeps its
  upstream MIT terms and is not affected by your contribution.
- Brand assets, hosted services, and paid features are
  **not** part of the contribution license; they are
  separately governed by `docs/legal/TRADEMARK_POLICY.md`,
  `docs/legal/CUBECLOUD-EULA.md`, `docs/legal/PAID_SERVICES_TERMS.md`,
  and `docs/legal/COMMERCIAL_LICENSE.md`.

## Developer Certificate of Origin (DCO)

This project uses the [Developer Certificate of Origin 1.1](https://developercertificate.org/) (DCO) in lieu of a full Contributor License Agreement. The DCO is a lightweight, legally binding statement that you wrote the contribution or have the right to submit it under the project's open-source license.

### How to sign off

Append a `Signed-off-by:` line to your commit message:

```text
Signed-off-by: Your Name <your.email@example.com>
```

You must use a real name (no pseudonyms or anonymous handles). The
email doesn't have to match your GitHub account, but it must be a
verifiable address. CI will reject commits without a valid
`Signed-off-by:` line.

### Why DCO instead of a CLA

- **Zero friction.** No web forms, no PDF sign-back, no CLA bot
  blocking your PR.
- **Per-commit, not per-repo.** You sign every commit you make;
  you don't sign away future work to a single CLA document.
- **Standard for open source.** The Linux kernel, Docker, Kubernetes,
  and most major CNCF projects use DCO.
- **Legally equivalent for our case.** Both DCO and CLA require you
  to assert authorship; the DCO does it per-commit so we never have
  to track a separate CLA repository.

### DCO and the dual-license

The DCO is a **contribution-side** mechanism. It certifies that
you have the right to submit the code under the project's
license. The project's **license** is a **distribution-side**
mechanism (see `LICENSE` and `BRANDING_AND_LICENSE.md` §"V2.5
transitions landed"). They are independent and they are not
substitutes for each other.

What this means in practice:

- By signing off, you are not picking AGPL-3.0 vs Apache-2.0
  vs MIT for the consumer. The consumer picks. You are
  certifying that you have the right to make the contribution
  available under any of the three offered licenses (and,
  where your contribution touches the inherited framework,
  under the framework's hard-MIT terms).
- If you are contributing on behalf of an employer, the DCO
  affirms that your employer has authorized the contribution
  under the project's license terms. If you cannot make that
  affirmation, do not sign off; instead, ask your employer's
  open-source office to review the dual-license posture in
  `LICENSE` and the framework carve-out before you sign.

### Example

```bash
git commit -s -m "feat(channels): add canary IPC for Cubecloud daemon"
# The -s flag auto-appends:
# Signed-off-by: Your Name <your.email@example.com>
```

If you forget `-s`, edit the commit message with `git commit
--amend -s` before pushing.

## Reporting Vulnerabilities

For security reports, follow [`SECURITY.md`](SECURITY.md) —
please do not post secrets, API keys, private logs, personal
documents, or public IPs in issues or pull requests. Security
fixes follow the same DCO sign-off rule as feature commits;
the time pressure is not a license loophole.

## Acknowledgments

The full upstream credits live in [`ACKNOWLEDGMENTS.md`](ACKNOWLEDGMENTS.md).
The third-party attribution catalog lives in [`NOTICE`](NOTICE).
If your contribution is based on someone else's work (a fix from
an upstream project, a pattern from a reference codebase, a
transcribed algorithm), credit them in your commit message and
add them to `NOTICE` if appropriate.
