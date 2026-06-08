---
name: po-tdd
description: Use when writing or modifying code, and the user wants test-first, red-green-refactor discipline. Triggers: "TDD this", "red-green-refactor", "test-first", "vertical slice", "write the test first", "behaviour test not implementation test", "no production code without a failing test".
license: MIT
metadata:
  author: Adapted from JZKK720/poskills
  source: https://github.com/JZKK720/poskills
  version: "1.0.0"
---

# Test-Driven Development

## Philosophy

**Core principle:** Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: they exercise real code paths through public APIs. They describe *what* the system does, not *how* it does it. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

**Bad tests** are coupled to implementation. They mock internal collaborators, test private methods, or verify through external means (like querying a database directly instead of using the interface). The warning sign: your test breaks when you refactor, but behavior hasn't changed. If you rename an internal function and tests fail, those tests were testing implementation, not behavior.

## Anti-pattern: horizontal slices

**DO NOT write all tests first, then all implementation.** This is "horizontal slicing" — treating RED as "write all tests" and GREEN as "write all code."

This produces **crap tests**:

- Tests written in bulk test *imagined* behavior, not *actual* behavior.
- You end up testing the *shape* of things (data structures, function signatures) rather than user-facing behavior.
- Tests become insensitive to real changes — they pass when behavior breaks, fail when behavior is fine.
- You outrun your headlights, committing to test structure before understanding the implementation.

**Correct approach: vertical slices via tracer bullets.** One test → one implementation → repeat. Each test responds to what you learned from the previous cycle. Because you just wrote the code, you know exactly what behavior matters and how to verify it.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
  ...
```

## Workflow

### 1. Planning

When exploring the codebase, use the project's domain glossary so that test names and interface vocabulary match the project's language, and respect ADRs in the area you're touching.

Before writing any code:

- [ ] Confirm with the user what interface changes are needed.
- [ ] Confirm with the user which behaviors to test (prioritise).
- [ ] Identify opportunities for deep modules (small interface, deep implementation).
- [ ] Design interfaces for testability.
- [ ] List the behaviors to test (not implementation steps).
- [ ] Get user approval on the plan.

Ask: "What should the public interface look like? Which behaviors are most important to test?"

**You can't test everything.** Confirm with the user exactly which behaviors matter most. Focus testing effort on critical paths and complex logic, not every possible edge case.

### 2. Tracer bullet

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior → test fails
GREEN: Write minimal code to pass → test passes
```

This is your tracer bullet — proves the path works end-to-end.

### 3. Incremental loop

For each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:

- One test at a time.
- Only enough code to pass the current test.
- Don't anticipate future tests.
- Keep tests focused on observable behavior.

### 4. Refactor

After all tests pass, look for refactor candidates:

- [ ] Extract duplication.
- [ ] Deepen modules (move complexity behind simple interfaces).
- [ ] Apply SOLID principles where natural.
- [ ] Consider what new code reveals about existing code.
- [ ] Run tests after each refactor step.

**Never refactor while RED.** Get to GREEN first.

## Checklist per cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```

## When TDD doesn't fit

TDD is a tool, not a religion. Skip the loop when:

- **Spike / exploration code** — throwaway scripts to learn an unknown API. Write the spike, throw it away, then TDD the real thing.
- **Pure config changes** — bumping a version, renaming a constant. Test if it's worth testing; usually no.
- **Visual / aesthetic tweaks** — colors, spacing, copy. The user *is* the test.
- **1:1 port from a known-correct reference** — if you're translating a paper's algorithm line-by-line and there's a reference implementation, the TDD "test" is "does the output match the reference." Run that, not TDD.

## Mocking guidelines

- **Mock at the seam**, not deep inside. The seam is the natural interface boundary.
- **Don't mock what you own.** If you control the implementation, use the real one. Mocks are for things outside your control (network, time, third-party APIs).
- **Prefer fakes over mocks.** A simple in-memory implementation beats a magic mock that asserts call counts.
- **One mock per test.** Multiple mocks means multiple seams means the test is testing too much.

## Source / license

Adapted from [mattpocock/skills · tdd](https://github.com/JZKK720/poskills), MIT.
