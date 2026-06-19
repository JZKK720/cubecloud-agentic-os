# Auto-Discovery + Ambient Tool Suggestions — Design Doc

**Date:** 2026-06-19
**Status:** Approved
**Author:** Brainstorm session (sp-brainstorm skill)
**Hand-off:** Planning phase (sp-plan / cubecloud-plan)

---

## 1. Outcome

A first-timer opens Agent Desktop on a Cubecloud-provisioned machine. The desktop scans localhost, finds the running Hermes (and/or IronClaw) gateway, auto-connects, and lands them in the Chat screen — all within 10 seconds, zero configuration, zero port knowledge. A subtle "Enhance your agent" panel in the sidebar shows optional tools (CodeGraph, Graphify, EverOS, Headroom, Agent-Reach) that the user can install with one click when they're ready.

**Key insight:** no wizard, no setup form, no "pick your runtime" screen. The desktop just finds what's running and connects. The tool suggestions are ambient — they live in the sidebar or a quiet banner, not a blocking modal. The user's first experience is the Chat screen, not a setup flow.

Agent Desktop is an **essential AI-agent tool for SMEs and prosumers**, not just a developer tool. The harness tools (CodeGraph, Graphify, EverOS, etc.) are swappable to suit different workloads. A law firm doesn't need CodeGraph; a coding shop doesn't need Agent-Reach's XiaoHongShu channel. The desktop is the **operating layer**; the tools are the **workload configuration**.

## 2. User

**Primary:** A first-timer on a Cubecloud-provisioned machine. They don't know what Docker is, they don't know what port Hermes is on, they don't know what an API key is. They know they have "an AI agent" and they want to talk to it.

**Secondary:** A developer who already runs Hermes/IronClaw in Docker and wants a GUI. They know ports but don't want to type them.

**Tertiary (later):** An OEM/operator deploying Agent Desktop to a team fleet. They need auto-discovery reliable enough that non-technical users don't call support.

**How many:** Today — 1. Near-term — dozens (OEM pilots). Long-term — thousands.

**How often:** Daily. Auto-discovery runs once (first launch), then connection is cached. Tool suggestions are ambient — seen every session, acted on once.

## 3. Smallest version (MVP)

Three pieces only:

### Piece 1: Auto-scan on first launch

When no connection is configured, silently probe localhost on known runtime ports:
- Hermes: 8642, 8644, 8789
- IronClaw: 3231 (`/api/health`)
- OpenClaw: 18789

Uses existing `diagnoseRemoteConnection()` — no new probe logic. Parallel scan, 3-second timeout each. Results ranked: healthy > auth-required > unreachable.

- **One healthy gateway found:** auto-connect. Land in Chat. Done.
- **Multiple healthy gateways found:** one-click picker ("We found 2 agents: Hermes on :8789, IronClaw on :3231. Which one?"). Two buttons. No form.
- **Zero healthy gateways found:** fall back to current Welcome screen (manual connect). Auto-scan result shown as hint.

**Out of scope:** no Docker API scanning, no LAN discovery, no network scanning. Localhost HTTP probes only.

### Piece 2: Connection caching

Once auto-connected, save connection config (URL + runtime type) to existing profile config. On next launch, skip scan and connect directly. If saved connection fails, re-scan.

Mostly already implemented — the desktop already caches connection config. The only change is that auto-scan writes the config instead of the user typing it.

### Piece 3: Ambient tool suggestions

A small, non-blocking panel at the bottom of the sidebar (or dismissible banner on first Chat load):

> **Enhance your agent**
> CodeGraph · Graphify · EverOS · Headroom · Agent-Reach
> Click to install →

Clicking opens a simple list with one-click install buttons. No wizard, no modal, no blocking flow. User can dismiss and come back later via existing screens.

**Out of scope:** no auto-install, no API key prompts during suggestion, no recommendation algorithm. Static list with install buttons.

### Explicitly out of scope for MVP

- Docker API scanning
- LAN/network discovery
- Auto-install of support tools
- Understand-Anything deep analysis button (V2.10.7x)
- OEM fleet management

## 4. Cost of nothing

**The SME wall:** A law firm opens Agent Desktop, sees a port-entry form, closes it. The product that was supposed to be their AI workspace looks like a Kubernetes dashboard.

**The prosumer friction:** A prosumer who wants research tools (Graphify + Agent-Reach) or writing tools (EverOS) has to find, install, and configure them outside the desktop. The desktop isn't essential; it's a launcher.

**The swappable-surfaces promise breaks:** "The value is the managed operating layer, not which tool is running" is theoretical if the user can't discover, install, and swap tools from inside the desktop.

**The OEM story is dead:** Cubecloud can't sell "an AI agent for your business" if the first screen is a port form and the tools are invisible.

**The cost is market entry.** Not technical debt — the product never reaches the audience it was built for.

## 5. Cost of wrong

**Wrong #1 — Auto-connects to wrong runtime.** Exit ramp: one-click picker when multiple gateways found. Never auto-pick with ambiguity.

**Wrong #2 — Silent auth failure.** Exit ramp: detect 401/403, show clear prompt: "Your agent requires a key. Ask your administrator."

**Wrong #3 — Tool suggestions are noise.** Exit ramp: contextual, dismissible, non-blocking. User self-selects.

**Wrong #4 — Built a wizard, not a product.** Exit ramp: first screen is always Chat. Auto-discovery behind a splash. Tool suggestions are ambient. No wizard. Ever.

**Wrong #5 — Over-engineered the scan.** Exit ramp: localhost HTTP probes only. Three ports, three seconds. If it fails, fall back to manual.

**Worst-case wrong:** SME users still need a walkthrough after 6 months. Exit ramp: remove runtime picker, default to Hermes always, make fallback a single Settings link.

## 6. Upside

**Agent Desktop becomes the essential AI-agent tool, not a launcher.** The auto-discovery turns "a machine with Docker containers" into "an AI agent you can talk to."

**The swappable-surfaces contract becomes real.** "Swap CodeGraph for Graphify" goes from a theoretical promise to a button. SMEs pick workload tools from a list.

**The OEM channel unlocks.** Cubecloud ships a machine → user opens Agent Desktop → it finds the agent → user picks tools → user is productive in 60 seconds.

**The moat compounds.** Every tool integrated becomes a reason to use Agent Desktop over Hermes's own desktop or raw CLI. The foundation — auto-discovery + ambient suggestions — is what makes the first tool install happen.

**Asymmetric ratio:** ~2-3 days build cost. Payoff: entire SME/prosumer market entry.

## 7. Metric

Three metrics, measured from app launch:

**1. Time-to-first-chat (TTFCh)**
- Target: under 15 seconds for pre-configured machine
- Measurement: `app.launched` → `chat.firstMessage` in local JSON log
- The "it just worked" number

**2. Setup completion rate**
- Target: 90%+ reach Chat screen without abandoning
- Measurement: `app.launched` → `chat.screenVisible` in local log
- The "port-knowledge wall is gone" number

**3. Tool activation rate**
- Target: 30%+ install at least one tool within first week
- Measurement: `tools.installClicked` → `tools.installSucceeded` per tool
- The "swappable-surfaces contract is real" number

**No cloud telemetry.** All metrics are local JSON logs. Respects "local-first, data-stays-in-house."

**Review date:** 30 days after first OEM pilot.

## 8. Kill signal (redesign triggers, not shutdown)

User commitment: **won't quit, will build on top and improve.** This is a foundation, not an experiment.

**Redesign trigger 1 — SMEs still need a walkthrough after 6 months.** Redesign: remove runtime picker, default to Hermes always, fallback is a Settings link.

**Redesign trigger 2 — Tool suggestions ignored (< 10% activation).** Redesign: kill sidebar panel, rely on per-screen install CTAs (which already exist).

**Redesign trigger 3 — Auto-discovery breaks repeatedly.** Redesign: make port list configurable via `cubecloud-discovery.json` in userData.

**What never gets killed:** Chat screen as the first experience. The port-knowledge wall is gone permanently.

---

## Design constraints (from skills applied)

**Karpathy guidelines:**
- Simplicity first: minimum code that achieves "connect first, suggest later"
- Surgical changes: touch the Welcome flow, not rewrite the app
- Goal-driven: success = first-timer lands in Chat within 15 seconds, zero config

**gstack design review:**
- First 200ms: user sees "Connecting to your agent..." not a form
- One primary action: Chat. Everything else is secondary.
- Empty state: "No agent runtime detected. Click here to install one." — not a blank form
- Synchronous feedback: spinner immediately, not a blank screen

**gstack eng review:**
- Load-bearing assumption: Hermes/IronClaw already running on localhost. If false, fallback to manual connect.
- Build order: (1) auto-scan, (2) auto-connect, (3) ambient tool suggestions
- Security boundary: auto-connect respects auth. 401/403 → prompt for token, not skip.
- Smallest vertical slice: auto-scan → auto-connect → land in Chat. Exercises every layer.

---

**Design approved. Next: planning phase (sp-plan / cubecloud-plan).**