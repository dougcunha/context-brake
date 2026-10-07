# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T13 — Point the TC-01 traceability row at its real proof

## Outcome

The `tasks.md` traceability row for TC-01 names the tests that prove it: `tests/unit/main.test.ts` and `npm run package:smoke`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_03
- In scope: the TC-01 row in `../tasks.md` (line 43).
- Out of scope: other rows; the DAG; the TechSpec.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/OI-03 | `codereview.md#Findings` | TC-01 mapped to `e2e-09`, which does not hold the proof |
| DEC-HIL-RES-01 | `../workflow.md#Human Decisions Log` | Reservation chosen for correction |

## Requirements

- Only the evidence column changes; the row keeps its IDs and tasks.

## Context to recover on demand

- Evidence: `codereview_01/codereview.md#TechSpec adherence` (TC-01 level).

## Work

- [x] T13.1 Replace `e2e-09` with `tests/unit/main.test.ts` and `npm run package:smoke` in the TC-01 row.

## Acceptance criteria

- `rg -n "e2e-09" ../tasks.md` returns nothing on the TC-01 row.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: read the row.
- Platforms: any.
- Environment dependency: none.
- Commands: `rg -n "TC-01" tasks/prd-12-refatoracao-modo-leve-modo-unico/tasks.md`.
- Expected evidence: the updated row.

## Affected files

- Modify: `tasks/prd-12-refatoracao-modo-leve-modo-unico/tasks.md`

## Observability and recovery

- Operational signal: none.
- Recovery: restore the row.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result (OI-03, DEC-HIL-RES-01): the `tasks.md` TC-01 row now names `tests/unit/main.test.ts` and `npm run package:smoke` instead of `e2e-09`. The IDs and tasks are unchanged.
- Changed files: `tasks/prd-12-refatoracao-modo-leve-modo-unico/tasks.md`. This adds to the hash drift from the DEC-HIL-02 approval that the reviews recorded.
- Checks: `rg -n "TC-01" tasks.md` shows line 43 with the new evidence.
- Validated state: manifest at round 3.
- Open items: none.
