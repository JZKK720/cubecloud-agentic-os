# Cubecloud Trademark and Brand Use Policy

**Effective date:** 2026-06-06
**Status:** Active (replaces the prior working draft; updated
for the V2.5 dual-license posture)

This document is the binding brand and trademark policy for the
Cubecloud project. It is published alongside the dual-license
`LICENSE` that governs the source code (AGPL-3.0-or-later OR
Apache-2.0 OR MIT for Cubecloud-original work, with the
inherited `hermes-desktop` framework code carved out as
hard-MIT), and it is intended to make explicit that the code
license and the brand license operate independently. **None
of the three offered code licenses grants any rights to the
Cubecloud trademarks, logos, names, screenshots, or branded
visual assets.** Those rights are reserved by the Cubecloud
Contributors and are licensed separately under the terms below.

## 1. Scope and relationship to the code license

The dual-license in `LICENSE` permits broad reuse, modification,
and redistribution of the source code in this repository, under
your choice of AGPL-3.0-or-later, Apache-2.0, or MIT. The
hermes-desktop framework code that hosts the Cubecloud-original
modules is hard-MIT and remains so. **The code license does
NOT grant any rights to**:

- the **Cubecloud** name, logotype, wordmark, or any confusingly
  similar mark;
- the **Agent Desktop** product name (as distributed by the
  Cubecloud Contributors) or any confusingly similar product name;
- the **Cubecloud wordmark / mark / logo** SVG files committed to
  `build/branding/` and `src/renderer/src/assets/cubecloud-*.svg`;
- branded screenshots, splash screens, packaging art, marketing
  imagery, or trade dress;
- the design system, color palette, typography choices, and
  visual layout tokens used in those assets.

The AGPL-3.0 §6, Apache-2.0 §6, and MIT "no trademark grant"
language all preserve trademark rights of the licensor. None of
the three licenses grants any right to the Cubecloud trademarks
by implication; this policy is the only document that grants
rights to those marks, and it grants only the limited rights
described below.

If you fork this codebase and rebrand, you must also remove or
replace the Cubecloud marks. You can keep the code (under any
of the three offered licenses). You cannot keep the marks.

## 2. Covered marks and assets

| Mark / asset | Identifier | Where it lives | Status |
|--------------|-----------|----------------|--------|
| **Cubecloud** | Company + product name (word form) | `README.md`, `CONTRIBUTING.md`, in-app UI | Trademark |
| **Cubecloud** | Logotype + wordmark (SVG) | `build/branding/cubecloud-logo.svg`, `build/branding/cubecloud-mark.svg` | Trademark |
| **Cubecloud** | In-app wordmark + splash background | `src/renderer/src/assets/cubecloud-wordmark.svg`, `cubecloud-splash-bg.svg`, `cubecloud-mark.svg` | Trademark |
| **Agent Desktop** | Product display name | `package.json` `productName`, splash screen, installer metadata | Trademark (as applied to the Cubecloud distribution) |
| **Cubecloud Contributors** | Collective copyright line | `LICENSE`, all Cubecloud-original file headers | Trademark (as applied to the Cubecloud distribution) |
| **Cubecloud-acquired Cubecloud mark** | Splash animation, app icon set | `build/icon.ico`, `build/icon.icns`, `build/icon.png` (when regenerated from Cubecloud-owned source art) | Trademark |

This list is non-exhaustive. If you create a new Cubecloud-branded
asset during the rebrand, it is automatically covered by this
policy unless explicitly carved out by counsel.

## 3. Allowed nominative use (no permission needed)

You MAY, without prior approval:

- **Refer to Cubecloud by name in descriptive text.** For
  example: "this fork was derived from Cubecloud v0.6.0", or
  "compatible with the Cubecloud OpenCode agent loop" — provided
  the use is factual and does not imply endorsement.
- **Link to this repository or to `cubecloud-contributors` GitHub
  org pages** for attribution or for the purpose of pointing users
  at the upstream source.
- **Reproduce the three offered license texts** verbatim when
  redistributing source code. See `licenses/AGPL-3.0.txt`,
  `licenses/Apache-2.0.txt`, and `licenses/MIT.txt`. Downstream
  redistributors may keep all three in their distribution even
  if they only adopt one — the dual-license structure is
  alternatives, not additive.
- **Cite the Cubecloud project in academic, journalistic, or
  review contexts** with truthful statements about its function.

These uses are nominative fair use and do not require written
permission.

## 4. Prohibited uses (require written permission)

You MAY NOT, without prior written approval from the Cubecloud
Contributors:

- **Ship a fork, build, or distribution under the Cubecloud name
  or a confusingly similar name.** Examples of confusingly similar:
  `Cubecloud-X`, `CubeCloud`, `CubecloudOS`, `CubeCloud Desktop`,
  `cubed cloud`, `cumulus cloud`, or any name that an ordinary
  consumer could plausibly confuse with Cubecloud. (When in doubt,
  use a different name and link back to Cubecloud as the upstream.)
- **Use the Cubecloud logo, wordmark, or mark** on a fork, build,
  distribution, package listing, marketplace entry, Docker image,
  npm package, social account, or domain. The Cubecloud SVG files
  in `build/branding/` and `src/renderer/src/assets/` are NOT
  reusable for non-Cubecloud distributions.
- **Republish Cubecloud-branded screenshots, splash screens, or
  marketing imagery** as if they were the official release of a
  different product. If you fork, you must regenerate the
  previews with your own branding before publishing.
- **Use Cubecloud marks in a way that implies sponsorship,
  endorsement, partnership, certification, or official status** of
  your fork, your hosted service, or your commercial offering.
- **Register a domain, social-media handle, package name, or
  marketplace listing** that contains the Cubecloud name or a
  confusingly similar mark, regardless of whether you intend to
  use it for a related product. (Example: registering
  `cubecloud-help.com` for a support service for a fork is
  prohibited even if the content is helpful.)
- **Use Cubecloud marks on paid plans, hosted services, or
  managed integrations** that could be mistaken for the official
  Cubecloud paid tier. (See `PAID_SERVICES_TERMS.md` for what
  the official paid tier is.)

## 5. Build / distribution rules

If you fork the codebase and ship a public distribution:

1. Replace every Cubecloud SVG in `build/branding/` and
   `src/renderer/src/assets/` with your own brand assets. Do
   not ship the originals.
2. Replace the `productName` in `package.json` and the
   `CUBECLOUD_*` environment variables with your own. Do not
   keep `productName: "Agent Desktop"` (the Cubecloud-distributed
   name) under your fork's identity.
3. Replace the splash screen and the `docs/index.html` landing
   page, if any, with your own branded equivalents.
4. Keep the `LICENSE` and `NOTICE` files intact and unmodified.
   The `LICENSE` file is the binding dual-license notice; do
   not remove or rewrite it. The `NOTICE` file is the REUSE-
   compliant third-party attribution catalog; do not remove
   upstream attributions.
5. Add a `FORK-NOTICE.md` (or equivalent) at the repo root that
   states:
   > This is a fork of Cubecloud vX.Y.Z. It is not affiliated with,
   > endorsed by, or maintained by the Cubecloud Contributors.
   > Cubecloud is a trademark of the Cubecloud Contributors.

## 6. Cosmetic / compatibility uses (allowed with conditions)

The following are allowed without written permission, **as long
as they do not create a false impression of official status**:

- **App icon, tray icon, and taskbar entries showing a Cubecloud
  logo when running the unmodified upstream binary.** This is
  permitted because the user is using the actual Cubecloud
  distribution.
- **Internal documentation** (PRIVACY.md, SECURITY.md, your fork's
  own ABOUT page) that names Cubecloud as the upstream and links
  to this repository.
- **Compatibility claims in your fork's README**: "this fork
  retains API compatibility with Cubecloud's `everos-sidecar-*`
  IPC channels as of v0.6.0." This is descriptive, not
  endorsement-seeking, and is permitted.

## 7. Reporting misuse

If you see a fork, distribution, hosted service, or marketplace
listing that uses the Cubecloud marks in violation of this policy,
open an issue titled `TRADEMARK: <short description>` on this
repository or contact the Cubecloud Contributors through the
project's normal channels. We do not commit to a specific response
time but we do commit to reviewing.

## 8. No license to Cubecloud marks is granted by any other document

The MIT `LICENSE`, the `LICENSE-NOTICE`, the `CUBECLOUD-EULA.md`
draft, and the `PAID_SERVICES_TERMS.md` draft all reference
Cubecloud marks but **do not grant any rights to those marks**.
The only document that grants rights to the Cubecloud marks is
this one, and it grants only the limited rights described above.

## 9. Trademarks of upstream projects

This policy does NOT govern the trademarks of upstream projects
that Cubecloud derives from or adapts. Specifically:

- **Hermes** is a trademark of its respective rightsholder.
  Cubecloud is a successor project; we do not claim Hermes as
  our mark.
- **Odysseus** is a trademark of the Odysseus Contributors.
  This project has not vendored or merged Odysseus source
  code; the trademark is acknowledged here for the same
  reason we vendored `licenses/Odysseus-MIT.txt` — should
  any Cubecloud distribution in the future include adapted
  Odysseus code, it must not present itself as "Odysseus"
  or as an official Odysseus release. See
  `ACKNOWLEDGMENTS.md` (in the original Odysseus repository)
  for their separate brand-use policy.
- **opencode** is a trademark of its respective rightsholder.
  This project has not vendored or merged opencode source
  code; the trademark is acknowledged here because we vendored
  `licenses/opencode-MIT.txt` for future-reference purposes.
  Should any Cubecloud distribution in the future include
  adapted opencode code, it must not present itself as
  "opencode" or as an official opencode release. We do not
  claim "opencode" as our mark.
- **EverOS** is a trademark of its respective rightsholder.
  The optional sidecar integration in `src/main/everos-sidecar.ts`
  spawns the `everos` Python binary **only if the user has
  installed it themselves**; the binary is not bundled,
  shipped, installed, or managed by this repository. The
  sidecar is not, and does not represent, an official
  EverOS build. We do not claim "EverOS" as our mark.

Upstream project trademarks are governed by their own policies.

## 10. Reservation of rights

The Cubecloud Contributors reserve all rights not expressly granted
in this policy. The policy may be amended at any time; the
amendment applies prospectively to new uses, and previously
granted permissions continue for the duration of the grant.

## 11. No legal advice

This policy is published in good faith to make our brand
expectations clear. It is not a substitute for legal counsel. If
you have a complex question about whether a specific use is
permitted, consult your own counsel and (if you need clarity from
us) reach out via the channels above.
