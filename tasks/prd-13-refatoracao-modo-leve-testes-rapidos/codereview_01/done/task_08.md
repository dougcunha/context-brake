# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T08 — The budget gate honors Vitest's exit code

## Outcome

`npm run test:budget` exits 1 with `TEST_RUN_FAILED` whenever Vitest exits non-zero or is killed, even when the JSON report says `success: true`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_01
- In scope: pass Vitest's resolved exit code into the budget evaluation in `scripts/check-test-budget.ts` and `scripts/test-budget.ts`, and cover the case in `tests/unit/test-budget.test.ts`.
- Out of scope: report format and budget value.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#Findings` | Exit code discarded; unhandled errors pass the gate |
| FR-06, DEC-07 | `../prd.md`; `../techspec.md#technical-decisions` | "Exits non-zero when the run fails" |

## Requirements

- A non-zero or `null` Vitest exit code yields exit 1 and `TEST_RUN_FAILED`. Failed tests are still listed when the report names them.
- An exit code of 0 with `success: true` keeps the current behavior.

## Context to recover on demand

- Rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`.
- Code: `scripts/check-test-budget.ts:runVitest,main`; `scripts/test-budget.ts:evaluateBudget`.

## Work

- [x] T08.1 Carry the exit code into `evaluateBudget` and fail on non-zero or `null`.
- [x] T08.2 Unit tests: `success: true` with exit 1 fails; a killed run (`null`) fails.

## Acceptance criteria

- The new unit cases pass, and the existing ones still pass.
- `npm run test:budget` on the current tree still exits 0.

## Verification

- Unit: `tests/unit/test-budget.test.ts`.
- Integration: one `npm run test:budget` run.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows (local).
- Environment dependency: none.
- Commands: `npx vitest run tests/unit/test-budget.test.ts`, `npm run test:budget`, `npm run lint`, `npm run typecheck`.
- Expected evidence: unit results and the budget output.

## Affected files

- Modify: `scripts/check-test-budget.ts`, `scripts/test-budget.ts`, `tests/unit/test-budget.test.ts`

## Observability and recovery

- Operational signal: the budget output.
- Recovery: revert the three files.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result (CR-01, FR-06, DEC-07): `scripts/check-test-budget.ts` keeps the exit code `runVitest` resolves and passes it as `vitestExitCode` to `evaluateBudget`. `scripts/test-budget.ts` returns exit 1 with `[ERROR] TEST_RUN_FAILED: the test run failed (Vitest exit code <n>); ...` when the report says `success: false` or Vitest exited non-zero or `null`, and still lists the failed tests.
- Changed files: `scripts/check-test-budget.ts`, `scripts/test-budget.ts`, `tests/unit/test-budget.test.ts`.
- Checks: `tests/unit/test-budget.test.ts` passes 9 tests; the new `it.each` covers exit 1 and `null` with `success: true`. `npm run typecheck` and `rtk proxy npx eslint` are clean. `npm run test:budget` on the current tree exits 0 at 107.8 s.
- Validated state: base `cca3a29` plus T01-T07 and round 1; Windows 11, Git Bash.
- Open items: none.
