# Detection Catalog — TypeScript / Node.js

Classification reference for `architectural-analysis`. Each SKILL step names the section to load when classifying that dimension's findings. Where ContextBrake's rules set a stricter threshold than common practice, the catalog uses the project threshold and names the rule.

## Dead code

Categories:
- **Dead** — an exported function, class, type, or constant imported nowhere; a module no other module imports and no entry point loads; a Zod schema never used to parse or to infer a used type; a CLI option never read; a constant never read.
- **Possibly dead** (needs verification) — reached only from commented-out code, only from other dead code, only from another unused export, or only from tests covering a retired feature; exported only so tests can reach it.
- **Internal dead code** — unexported function never called; variable assigned and never read; parameter never used; branch unreachable after an exhaustive `switch`.

Not dead — treat as USED even with no static import:
- referenced from `package.json` (`bin`, `main`, `exports`, `types`, `scripts`) or build and test configuration
- a hook, plugin, or extension entrypoint that a harness loads by path or by directory convention, such as `.opencode/plugins/`, `.pi/extensions/`, or a hook command string in harness configuration
- loaded through dynamic `import()` with a computed or string path
- named by string key in configuration, fixtures, or JSON schemas
- the public surface of a published package, even when unused inside the repository
- a port implementation wired in the composition root
- a test file or helper the test runner configuration discovers
- a Zod schema whose inferred type is used, even when parsing happens elsewhere
- declaration merging or module augmentation

Confidence: **HIGH** (no reference anywhere, including configuration and fixtures), **MEDIUM** (only indirect or uncertain use), **LOW** (plausible dynamic import, string path, or harness-convention use).

## Duplication

Confirm by reading the implementations — same logic, same cases handled, one could replace the other — not by matching names. Generics and overloads hide duplication: the same algorithm under different type parameters still counts. Classify and rank:
- **Exact (CRITICAL)** — identical or near-identical code; a copy-pasted function, guard clause, or helper module. A bug fix means editing every copy.
- **Similar logic (HIGH)** — same algorithm, different implementation, parameters, or name. Inconsistency risk.
- **Conceptual (MEDIUM)** — competing ways to do one thing: two path helpers, hand-rolled JSON editing beside a format-preserving editor, several `Result` types, manual validation beside Zod.
- **Contract (HIGH)** — the same shape declared repeatedly: a TypeScript type restated by an unrelated Zod or JSON schema, identical harness payload types per adapter, option types duplicated per command.

## Anti-patterns

- **God module** — a file above 100 lines (`.agents/rules/code-standards.md`), a module with 10+ exports, or a function or class holding many responsibilities.
- **Circular dependency** — a runtime import cycle between modules, or a catch-all `utils` or `shared` module that everything imports to avoid one. A cycle only through `import type` is lower risk.
- **Tight coupling** — `core` importing `node:fs`, `node:child_process`, or `process.env`, or reading `Date.now()` directly instead of depending on a port.
- **Layer violation** — `src/core` importing `src/infrastructure` or `src/cli`; harness-specific payload types leaking into `core`; terminal formatting inside adapters.
- **Global mutable state** — module-level `let` or mutable singletons shared across invocations; caches without invalidation.
- **Blocking the host process** — synchronous I/O (`readFileSync`, `execSync`, `spawnSync`) or long CPU work in code that runs inside a harness process.
- **Async misuse** — a floating promise that is neither awaited, returned, nor handled; an `async` callback passed to an API that ignores its promise, such as `forEach`; a child process or network call without a timeout.
- **Unsafe process execution** — a shell command string built from paths, payloads, or configuration; `shell: true`.
- **Stdout pollution** — `console.log` or `process.stdout.write` on a hook response path outside the response writer.
- **Exception control flow** — a generic `throw new Error(...)` for failures the user can fix, errors signalling expected outcomes, an empty `catch`.
- **Shotgun surgery** — one feature change forces edits across many files (poor cohesion).
- **Feature envy** — a function using more of another module's data than its own.

## Type-safety issues

- **Compiler posture** — `strict` absent or `false` in a `tsconfig`: most checks disappear. Report it once per configuration; it raises the severity of everything else in this section. `noUncheckedIndexedAccess` absent raises index-access findings; `skipLibCheck` is lower severity.
- **`any`** — explicit `any`, `as any`, `<any>`, or an untyped `JSON.parse` result used directly.
- **Suppression** — `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` without an explanation, `eslint-disable`: name the diagnostic being silenced and say whether the underlying problem is fixed or merely hidden.
- **Non-null assertion** — `x!.y`, `= x!`: asserts presence without proof and can hide a runtime `TypeError`.
- **Unsafe cast** — `as T` on external data without validation; `as unknown as T` double casts.
- **Unvalidated external input** — configuration, plan and checkpoint files, harness payloads, or command output used without a schema.
- **Contract duplication** — the same shape declared in several places (cross-reference Duplication → Contract).
- **Missing precision** — primitive obsession (ids as bare `string`), string values that should be literal unions, `Record<string, unknown>` passed deep into logic, exported functions without explicit return types.

## Code smells

- **Long function** — over 30 lines (`.agents/rules/code-standards.md`).
- **Long parameter list** — 4+ parameters; prefer a parameter object that names a domain concept.
- **Complex conditional** — nesting 3+ deep, boolean expressions spanning lines, nested ternaries, or a `switch` over 10+ cases without an exhaustiveness check.
- **Magic number/string** — unexplained literals, and repeated marker strings, file names, environment variable names, or exit codes; name them as constants.
- **Commented-out code** — delete it; git history preserves it.
- **Swallowed error** — an empty `catch` or `.catch(() => {})` with no report and no rethrow.
- **Poor naming** — context-free abbreviations (`cfg`, `tmp`, `msg`), `utils`, `helpers`, or `manager` modules that name no responsibility, boolean functions without `is`, `has`, or `can`, inconsistent casing.
