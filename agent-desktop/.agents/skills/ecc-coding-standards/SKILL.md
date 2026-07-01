---
name: ecc-coding-standards
description: Use when starting a new project, reviewing code, refactoring, or onboarding a new contributor in TypeScript / JavaScript / React / Node.js / adjacent stacks. Triggers: "best practices", "conventions", "code style", "what's the right way to do this", "lint rules", "naming conventions", "TypeScript strict", "coding standards".
license: MIT
metadata:
  author: Adapted from JZKK720/ECC
  source: https://github.com/JZKK720/ECC
  version: "1.0.0"
---

# Coding Standards & Best Practices

Universal coding conventions. Not exhaustive — language- and framework-specific patterns live in dedicated skills (`react-patterns`, `python-patterns`, etc.). This skill is the common floor.

## File organisation

```
src/
├── app/                    # Application bootstrap (routes, providers, layouts)
├── components/             # Reusable presentational + container components
│   ├── ui/                 # Generic, no-business-logic primitives
│   ├── forms/              # Form-specific components
│   └── layouts/            # Page-level layouts
├── hooks/                  # Custom React hooks (or composables / signals)
├── lib/                    # Utilities, configs, low-level helpers
│   ├── api/                # API clients
│   ├── utils/              # Pure helper functions
│   └── constants/          # Application-wide constants
├── types/                  # TypeScript types
└── styles/                 # Global styles, design tokens
```

## Naming

- **Variables & functions**: `camelCase` (TS/JS) or `snake_case` (Python).
- **Types & classes**: `PascalCase`.
- **Constants**: `UPPER_SNAKE_CASE` for true compile-time constants; `camelCase` for runtime config.
- **Files**: `kebab-case` for everything except React components, which are `PascalCase.tsx`.
- **Booleans**: prefix with `is`, `has`, `should`, `can` (e.g. `isLoading`, `hasPermission`).

## Functions

- One function, one job. If the function's name needs "and" in it (`fetchAndParse`), split it.
- Keep functions short. <40 lines is a soft target. >100 lines is almost always a refactor signal.
- Prefer pure functions for anything testable. Push I/O and side effects to the edges.
- Default parameters beat `undefined` magic. `function connect(host = "localhost")` beats `if (!host) host = "localhost"`.

## Errors

- Throw, don't return-error-objects. The type system is your friend.
- Custom error classes for anything the caller is expected to handle differently.
- Include context in error messages: what you tried, what went wrong, what the user can do.
- Never swallow an error silently. If you must catch and discard, leave a `// TODO: figure out why this fails` comment.

## Async

- `async/await`, never `.then()` chains (except for fire-and-forget).
- Always `await` or explicitly `void` a promise. Floating promises are a common source of "why didn't this run" bugs.
- `Promise.all` for parallel, `Promise.allSettled` when you want to keep going on partial failure.
- Set timeouts on external calls. Default to 30s unless you have a reason.

## TypeScript

- `strict: true` in tsconfig. Non-negotiable.
- Prefer `type` over `interface` unless you need declaration merging.
- Discriminated unions over optional fields.
- `unknown` over `any` at API boundaries. Narrow before use.
- `readonly` for any data you don't intend to mutate.

## React

- Functional components, hooks-only (no class components).
- One component per file, named export.
- Co-locate component-specific styles, tests, and types.
- Memoize only when you've measured a re-render problem. Premature memo is a common bug.
- Side effects in `useEffect` only. Initial state in `useState`/`useReducer`.

## State management

- Local state first (component-level). Lift up only when siblings need it.
- Global state (Redux, Zustand, Context) only for cross-cutting concerns (auth, theme, feature flags).
- Server state in a query library (TanStack Query, SWR, Apollo). Don't roll your own.
- URL state in the URL. Don't put filters / pagination in local state.

## Testing

- Test the public interface, not the implementation. Tests should survive refactors.
- One assertion per test (loosely — multi-assertion tests are fine for "this should produce X" patterns).
- Name tests by behaviour, not method: `it("rejects empty email")` not `it("testValidateEmail")`.
- Don't test third-party libraries.
- Use fixtures, not mocks for everything. Mocks are for seams where you control the implementation; fakes are for seams where you don't.

## Comments

- Don't restate the code. `// increment counter` above `counter++` is noise.
- Explain *why*, not *what*. The what is the code's job.
- Reference issues / tickets when relevant: `// See JIRA-1234 for context`.
- Delete comments that lie. If you change code, update or remove the comment that described it.

## Imports

- Group by: stdlib, third-party, local. Blank line between groups.
- Order within a group: alphabetical.
- Prefer named imports. Default imports for the "primary" export only.
- No deep relative paths: `../../../../utils` is a smell. Use path aliases (`@/utils`).

## Type safety

- Never `as any`. If you need a cast, write a type guard.
- Never `// @ts-ignore` without a follow-up issue. `@ts-expect-error` is acceptable when you're tracking the fix.
- Never `eslint-disable` without a comment explaining why.
- Never `// FIXME` without an issue. If it matters, file the issue; if it doesn't, fix it now.

## Performance

- Measure before optimising. The hot path is rarely where you think it is.
- Premature memoisation is a common bug source. Wait for the profiler.
- Use `React.memo`, `useMemo`, `useCallback` when the dependency array is *stable* and the render cost is *measurable*.
- For lists, use stable `key` props. Index as `key` is fine only for static, unchanging lists.

## Security

- Never commit secrets. Use environment variables, never hard-code.
- Validate input at the boundary. Trust internal types.
- Sanitise output that goes to a renderer / DOM. The default for any user-supplied HTML should be "escape it."
- Don't roll your own crypto. Use the platform's primitives.
- Auth checks at the *edge* of every endpoint, not deep in the business logic.

## Source / license

Adapted from [mattpocock/ECC · coding-standards](https://github.com/JZKK720/ECC), MIT.
