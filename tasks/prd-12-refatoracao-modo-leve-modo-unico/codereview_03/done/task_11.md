# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T11 — Drop the plan fixtures from the runtime tests

## Outcome

No test writes a `task_plan.json` file. `runtime-overhead` and `runtime-light-mode` prepare only the config they need.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_03
- In scope: remove the `task_plan.json` writes in `tests/integration/runtime-overhead.test.ts:73-75` and `tests/integration/runtime-light-mode.test.ts:25`. Rename the light-mode test "injects nothing at session start even with a plan file present" so it no longer names the plan file.
- Out of scope: source changes; other suites.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/OI-01 | `codereview.md#Findings` | Plan fixtures left in runtime tests after plan mode was removed |
| DEC-HIL-RES-01 | `../workflow.md#Human Decisions Log` | Reservation chosen for correction |
| NFR-03 | `prd.md#Non-functional requirements` | Tests of removed features deleted |

## Requirements

- The tests keep asserting the same runtime behavior; only the plan setup goes.

## Context to recover on demand

- Rules: `tests.md`, `code-standards.md`.

## Work

- [x] T11.1 Remove the plan fixture writes and any import they leave unused; rename the light-mode test.

## Acceptance criteria

- `rg -n "task_plan" tests/integration/runtime-overhead.test.ts tests/integration/runtime-light-mode.test.ts` returns nothing.
- Both suites pass.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/runtime-overhead.test.ts`, `tests/integration/runtime-light-mode.test.ts`.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows (local).
- Environment dependency: none.
- Commands: `npx vitest run <the two suites>` (DEC-PROC-02), `npm run lint`, `npm run typecheck`.
- Expected evidence: empty `rg`, passing suites, clean lint and typecheck.

## Affected files

- Modify: `tests/integration/runtime-overhead.test.ts`, `tests/integration/runtime-light-mode.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: restore the fixture lines.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result (OI-01, NFR-03, DEC-HIL-RES-01): no test writes `task_plan.json` anymore. `runtime-overhead.test.ts` lost the plan object and its write. `runtime-light-mode.test.ts` lost the write, and its test is renamed "injects nothing at session start".
- Changed files: `tests/integration/runtime-overhead.test.ts`, `tests/integration/runtime-light-mode.test.ts`.
- Checks: `rg -n "task_plan"` over both files returns nothing. `npx vitest run` over `cli-output-text`, `init-snapshot`, `runtime-light-mode`, and `runtime-overhead`: 4 files, 27 tests pass. `rtk proxy npx eslint .` and `npm run typecheck` are clean.
- Validated state: base `1474f54` plus T01-T10 and round 3; Windows 11, Git Bash.
- Open items: none.
