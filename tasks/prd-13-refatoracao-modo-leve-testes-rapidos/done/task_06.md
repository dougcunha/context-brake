# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md`
2. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Test budget check

## Outcome

`npm run test:budget` runs the default suite through `node node_modules/vitest/vitest.mjs run --reporter=json`, with no shell. It prints the wall time and the ten slowest files, and exits 1 when the run fails or exceeds 120 s. `release:check` runs it after `test:bench`.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T07
- In scope: `scripts/check-test-budget.ts` with a pure evaluator (report and wall time in; lines and exit code out); `tests/unit/test-budget.test.ts`; the `test:budget` script; `release:check`.
- Out of scope: worker tuning (T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06, OBJ-04 | `prd.md` | Budget check |
| DEC-07 | `techspec.md#technical-decisions` | Script design |
| CMP-08, CMP-09 | `techspec.md#components-and-flow` | Script and npm scripts |
| TC-07 | `techspec.md#test-approach` | Evaluator |

## Context to recover on demand

- Applicable skills and rules: `tests.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`; quality profile QA-01 to QA-07 and the Terrain baseline in `techspec.md#quality-profile`, `cli-output.md` (labels)
- Contract: `techspec.md#contracts-and-data` (output lines and exit codes).

## Work

- [x] T06.1 Write the evaluator and its unit test: within budget, over budget, failed run, and top-ten order.
- [x] T06.2 Write the runner part (spawn without a shell, temporary report, missing `dist/` message) and the npm scripts.

## Acceptance criteria

- `npm run test:budget` prints `Test run: <s>s wall (budget 120s)` and the ten slowest files, and exits 0 within the budget or 1 above it.
- QA-04 finds no `shell: true`, `exec`, or `execSync`.

## Verification

- Unit: `tests/unit/test-budget.test.ts` (TC-07).
- Integration: one `npm run test:budget` run, output recorded; its exit depends on the budget state at that point.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows (local).
- Commands: `npx vitest run tests/unit/test-budget.test.ts`, `npm run test:budget`, `npm run lint`, `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: the unit results and the budget output.

## Affected files

- Create: `scripts/check-test-budget.ts`, `tests/unit/test-budget.test.ts`
- Modify: `package.json`

## Observability and recovery

- Operational signal: none beyond the test output.
- Recovery: remove the script entries.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result (FR-06, DEC-07):
  - `scripts/test-budget.ts` holds the pure part: `TEST_BUDGET_SECONDS = 120`, `SLOWEST_FILE_COUNT = 10`, the zod report schema, and `evaluateBudget`, which returns the output lines and exit code.
  - `scripts/check-test-budget.ts` runs `process.execPath node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<temp>` with no shell and a 20 min kill timeout. It measures wall time with `performance.now()`, prints the report, and removes the temporary directory.
  - When `dist/src/cli/main.js` is missing, it fails with `TEST_RUN_FAILED`, naming `npm run build`.
  - `package.json` gains `test:budget`. `release:check` runs it after `test:bench`.
  - The evaluator and the runner sit in separate files so the unit test imports no top-level script.
- Changed files: created `scripts/test-budget.ts`, `scripts/check-test-budget.ts`, `tests/unit/test-budget.test.ts`; modified `package.json`.
- Checks:
  - `tests/unit/test-budget.test.ts`: 6 tests pass (TC-07). They cover within budget, exactly at the budget, over it, a failed run, the top-ten order with relative paths, and an invalid report.
  - `rtk proxy npx eslint` is clean, after splitting one `describe` over 30 lines. `npm run typecheck` is clean.
  - QA-04 (`exec`, `execSync`, `shell: true`) finds nothing.
  - Real run after T01 and T02: `Test run: 216.6s wall (budget 120s)`, followed by the ten slowest files (all e2e but one). It exits 1 with `[ERROR] TEST_BUDGET_EXCEEDED: the run took 216.6s, above the 120s budget; ...`, as expected before T03-T05. Test stderr noise passes through, because stderr is inherited.
- Validated state: base `cca3a29` plus T01, T02, and T06; Windows 11, Git Bash.
- Open items: none. T07 records the passing runs.

### ADR candidates

None - direct TechSpec implementation or local decision.
