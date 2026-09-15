# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T10 — Remove swallowed cleanup error in directory pruner test

## Outcome

`tests/integration/directory-pruner.test.ts` cleans up its temporary test directory without swallowing errors with an empty `.catch(() => {})`, eliminating the blocking QA-03 violation while reliably cleaning up test fixtures.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T12
- In scope: Replace the empty catch in `tests/integration/directory-pruner.test.ts:30` with resilient cleanup matching `tests/integration/runtime-state-removal.test.ts:40` (`maxRetries: 5, retryDelay: 100`) or standard error-propagating cleanup.
- Out of scope: Other test files, application runtime logic.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | Empty `.catch(() => {})` in `tests/integration/directory-pruner.test.ts:30` violates blocking quality rule QA-03 and hides potential fixture leaks |

## Requirements

- Adhere to TechSpec QA-03: zero occurrences of empty `catch` or `.catch(() => {})`.
- Adhere to `.agents/rules/tests.md`: robust, non-swallowing cleanup of temporary directories.

## Context to recover on demand

- TechSpec: `quality-profile` QA-03
- Rules and skills: `.agents/rules/tests.md`, `.agents/rules/code-standards.md`
- Code: `tests/integration/directory-pruner.test.ts` — test file containing the finding; `tests/integration/runtime-state-removal.test.ts:40` — reference cleanup pattern.

## Work

- [x] T10.1 In `tests/integration/directory-pruner.test.ts`, replace `await rm(dir, { recursive: true, force: true }).catch(() => {});` with `await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });`.
- [x] T10.2 Verify with QA-03 command that 0 hits remain across the test file and run the test suite.

## Acceptance criteria

- `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' tests/integration/directory-pruner.test.ts` returns 0 hits.
- `tests/integration/directory-pruner.test.ts` passes cleanly without swallowed errors or resource leaks.

## Verification

- Unit: not applicable.
- Integration: `npx vitest run tests/integration/directory-pruner.test.ts` passes cleanly.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Environment dependency: none.
- Commands: `npm run lint`, `npx vitest run tests/integration/directory-pruner.test.ts`
- Expected evidence: Test passes; QA-03 scan produces 0 hits on the file.

## Affected files

- Modify: `tests/integration/directory-pruner.test.ts`

## Observability and recovery

- Operational signal: Vitest test report output.
- Recovery: Revert `tests/integration/directory-pruner.test.ts` with git.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Replaced swallowed `.catch(() => {})` with `{ maxRetries: 5, retryDelay: 100 }` in `tests/integration/directory-pruner.test.ts`, fully resolving CR-01 and eliminating the blocking QA-03 violation.
- Changed files: `tests/integration/directory-pruner.test.ts`.
- Checks: `rg` QA-03 check returned 0 hits; `npx vitest run tests/integration/directory-pruner.test.ts` passed.
- Validated state: Clean test execution on Windows 11 / Node 24; no leaked fixtures or empty catch blocks.
- Open items: None.
