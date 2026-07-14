# Fix: Use github.event.created for tag-push build gating

## Overview

Copilot review on PR #3 identified that the outer release workflow's `should_build` output still derives from `steps.check.outputs.exists` (a `git ls-remote` query). Because the outer workflow triggers on `push: tags: v*`, the tag always exists on `origin` by the time the workflow runs, so `exists` is always `true` on tag push — builds still skip on the first tag push (same failure mode the PR intended to fix). The fix is to use `github.event.created` (a GitHub Actions payload field that is `true` on new tag creation, `false` on re-push) instead of querying remote tags.

The inner workflow (`agent-desktop/.github/workflows/release.yml`) triggers on `push: branches: release`, not tag push, so the `git ls-remote` check is valid there — no change needed.

## Tasks

### Task 1: Fix should_build in outer release workflow to use github.event.created

**Files:**
- Modify: `.github/workflows/release.yml`

**Step 1: Replace the should_build decision step**

In the `Decide whether to build` step, change the tag-push branch from checking `steps.check.outputs.exists` to checking `github.event.created`. This distinguishes a new tag creation (`created=true` → build) from a re-push/update (`created=false` → skip).

**Step 2: Verify**

Run: `git diff .github/workflows/release.yml`
Expected: The `should_build` step's `elif` branch now checks `github.event.created == 'true'` instead of `steps.check.outputs.exists == 'false'`.

**Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "fix(release): use github.event.created for tag-push build gating

Copilot review identified that should_build still derived from
git ls-remote (steps.check.outputs.exists). On the outer workflow's
push: tags: v* trigger, the tag always exists on origin by the time
the workflow runs, so builds still skipped on the first tag push.
Use github.event.created to distinguish new tag creation from
re-push without querying remote state."
```

---

## Self-review

- **Is every task 2–5 minutes?** Yes — single file, single step block. ✓
- **Is every step complete?** Yes — the exact code replacement is specified. ✓
- **Is every verification step runnable?** Yes — `git diff`. ✓
- **Is the order optimal?** Yes — one task, no dependencies. ✓
- **Does the smoke test cover the user-facing outcome?** The verification confirms the logic change; the real smoke test is running the workflow on a tag push and seeing builds execute. ✓