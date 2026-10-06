# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T14 — Make the store-failure seed test wait for its log record

## Outcome

`tests/integration/claude-mod-restart.test.ts` "sends the seed and logs an internal error when the store write fails after the clear" no longer depends on a fixed 20 ms wait and passes under the full `npm run coverage` load.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: a bounded wait helper in `tests/fixtures/claude-mod-scene.ts` and its use in that test.
- Out of scope: product code; other mod tests unless they assert records written after a rejected store call.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/CR-02 | `codereview.md#Findings` | the test failed once in the full run; it reads the log right after a fixed 20 ms `flush` |
| `tests.md` | Repeatable | no dependency on timing |

## Requirements

- Add `waitForCodes(scene, count)` that polls `readCodes` until it has `count` records or a bound (for example 2 s) passes, then returns what it read; the test asserts on its result.
- Keep `settleClear` unchanged for the other tests.

## Context to recover on demand

- Code: `tests/fixtures/claude-mod-scene.ts:settleClear`, `readCodes`, `flush`; `tests/integration/claude-mod-restart.test.ts:76-84`.
- Rules: `tests.md`, `code-standards.md`.

## Work

- [x] T14.1 Add the bounded wait helper.
- [x] T14.2 Use it in the store-failure test.

## Acceptance criteria

- The test passes alone and in the full coverage run; the helper never waits past its bound.

## Verification

- Integration: `claude-mod-restart` run 5 times in a row; full `npm run coverage` green.
- End-to-end: not applicable. Manual: none. Platforms: Windows here; CI. Environment dependency: none.
- Commands: `npx vitest run tests/integration/claude-mod-restart.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage` (background).
- Expected evidence: repeated passes and the coverage summary.

## Affected files

- Modify: `tests/fixtures/claude-mod-scene.ts`, `tests/integration/claude-mod-restart.test.ts`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: revert the helper.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `waitForCodes(scene, count)` in `tests/fixtures/claude-mod-scene.ts` polls `readCodes` with `flush` until `count` records exist or `WAIT_FOR_CODES_MILLISECONDS` (2 000) passes; the store-failure seed test asserts on it. `settleClear` unchanged.
- Changed files: `tests/fixtures/claude-mod-scene.ts` (91 lines), `tests/integration/claude-mod-restart.test.ts`.
- Checks: `claude-mod-restart` 5 runs in a row, 9 passed each; ESLint clean. Integrated check after T13 and T14: `npm run coverage` passed, 321 files, 2050 passed, 3 skipped, 0 failed; all files 96.07% statements, 91.89% branches, 97.07% functions.
- Validated state: worktree on `c7529c5` plus all corrections through T14; Windows 11, Git Bash.
- Open items: the root cause (timing under load) stays inferred, not instrumented; the bounded wait removes the dependency either way.
