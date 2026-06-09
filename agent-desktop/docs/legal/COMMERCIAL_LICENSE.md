# Commercial License

> **Status: DRAFT.** This document is published in good faith to
> describe the commercial-relicensing path for organizations that
> cannot or will not satisfy the AGPL-3.0 §13 (remote network
> interaction) source-disclosure obligation. The full commercial-
> license SKU, pricing tiers, support levels, and SLA terms are
> TBD by Cubecloud leadership and will be published when the
> Cubecloud commercial entity is in place. Until then, contact
> the address below for ad-hoc commercial-license conversations.

## 1. Why this document exists

The top-level `LICENSE` makes Cubecloud-original work available
under three alternative licenses:

1. **AGPL-3.0-or-later** (primary), with its §13 network-source
   obligation.
2. **Apache-2.0** (compatibility).
3. **MIT** (compatibility).

For most private, single-user, and enterprise-intranet
deployments, none of these pose a problem — the consumer picks
one and follows its terms. For organizations that want to
**run a Cubecloud-derivative service on a network server and
keep their modifications proprietary**, the AGPL-3.0 §13
obligation is the obstacle. The Apache-2.0 and MIT options
drop that obligation but are "compatibility" licenses — they
were offered so that downstream consumers with an Apache-2.0
or MIT house license can adopt Cubecloud-original work into
their own stack, not as a way to opt out of copyleft for
commercial-service use.

A **commercial license** is the third path. It is a paid
license, signed by the Cubecloud Contributors (or their
successor entity), that grants the licensee the right to run
a Cubecloud-derivative service on a network server without
the AGPL-3.0 §13 source-disclosure obligation, in exchange
for a license fee. This document is the placeholder for that
agreement.

## 2. What a commercial license will grant

The published commercial-license agreement will, in its final
form, grant the licensee (subject to the negotiated scope):

- A non-exclusive, non-transferable, worldwide license to
  reproduce, modify, and run the **then-current version** of
  Cubecloud-original work on a network server, without the
  AGPL-3.0 §13 source-disclosure obligation.
- A non-exclusive, non-transferable, worldwide license to
  distribute Cubecloud-derivative works to licensee
  customers as part of a paid service offering.
- A non-exclusive, non-transferable license to use the
  Cubecloud trademarks to identify the licensee as an
  authorized Cubecloud service provider (subject to the
  brand-use rules in `docs/legal/TRADEMARK_POLICY.md` and
  the commercial-license-specific brand schedule).

## 3. What a commercial license will NOT grant

- The commercial license does **not** retroactively license
  past versions. Licensees who want a version-history
  commercial grant must negotiate that scope explicitly.
- The commercial license does **not** grant rights to
  Cubecloud trademarks outside the licensee-specific brand
  schedule. Brand rules in `TRADEMARK_POLICY.md` continue
  to apply.
- The commercial license does **not** grant rights to
  third-party dependencies listed in `NOTICE`. Each
  dependency is governed by its own license.
- The commercial license does **not** replace the DCO
  sign-off requirement in `CONTRIBUTING.md` for any
  modifications the licensee contributes back to the
  Cubecloud project.

## 4. Pricing tiers (TBD)

The published commercial-license agreement will offer tiers
roughly aligned to:

- **Self-hosted, internal use** — small annual fee, capped
  number of end users.
- **Hosted service, single-tenant** — mid-tier annual fee,
  per-deployment pricing.
- **Hosted service, multi-tenant** — enterprise pricing,
  per-active-tenant or per-revenue-share basis.
- **OEM / embedded** — partner-specific, negotiated.

The exact numbers are TBD.

## 5. How to inquire

Until the Cubecloud commercial entity is in place, commercial-
license inquiries should be sent to the security / governance
contact in `SECURITY.md`. The full contact form will be added
when the commercial entity is formed.

## 6. No legal advice

This document is published in good faith to make the
commercial-relicensing path visible. It is not legal advice
and is not yet a binding agreement. A signed commercial-
license agreement is required to actually grant the rights
described in §2.
