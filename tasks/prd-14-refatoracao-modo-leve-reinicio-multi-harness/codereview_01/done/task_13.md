# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T13 — Doctor test for an outdated in-process restart component

## Outcome

A doctor test proves that a Pi restart log whose `componentVersion` differs from `RESTART_COMPONENT_VERSION` yields `AUTO_RESTART_OUTDATED_MOD`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: one case in `tests/integration/doctor-remove-restart.test.ts`.
- Out of scope: production code unless the case exposes a defect; trimming the suite's runtime.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-05 | `codereview.md#findings` | TC-12 "stale running module" untested for in-process harnesses (FR-11) |

## Requirements

- FR-11 / TC-12: doctor reports a stale running module per harness.

## Context to recover on demand

- TechSpec: DEC-13
- Rules and skills: tests
- Code: `src/infrastructure/harnesses/common/restart-diagnostics.ts:logFindings`, `src/infrastructure/harnesses/common/in-process-restart-state.ts:RESTART_COMPONENT_VERSION`

## Work

- [x] T13.1 Add a case writing a Pi log with a different `componentVersion` and asserting `AUTO_RESTART_OUTDATED_MOD` for `pi`.

## Acceptance criteria

- The case passes and fails if the version comparison is removed.

## Verification

- Unit: not applicable
- Integration: `tests/integration/doctor-remove-restart.test.ts`
- End-to-end: not applicable
- Manual: none
- Platforms: Windows locally; Linux and macOS in CI
- Environment dependency: none
- Commands: `npx vitest run tests/integration/doctor-remove-restart.test.ts`
- Expected evidence: new case green

## Affected files

- Modify: `tests/integration/doctor-remove-restart.test.ts`

## Observability and recovery

- Operational signal: `AUTO_RESTART_OUTDATED_MOD` finding
- Recovery: test-only change

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: a doctor case writes a Pi restart log with `componentVersion: '0.9.0'` and asserts only `AUTO_RESTART_OUTDATED_MOD` for `pi`; the outdated and Oh-My-Pi cases moved into their own describe to keep each callback under 30 lines.
- Changed files: tests/integration/doctor-remove-restart.test.ts.
- Checks: `npx vitest run tests/integration/doctor-remove-restart.test.ts` — 5 tests passed; `npm run lint` and `npm run typecheck` exit 0. The case fails if the version comparison in `restart-diagnostics.ts:logFindings` is removed, since READY would be reported instead.
- Validated state: worktree on a31e183 plus the feature diff and T10-T12; Windows 11, Node 24.
- Open items: none.
