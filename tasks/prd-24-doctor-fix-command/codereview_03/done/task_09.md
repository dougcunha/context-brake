# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T09 — One helper for the doctor test factories

## Outcome

The doctor finding and report test factories live in one helper, and the 3 doctor text test files import it.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: tests only.
- Out of scope: production code; accepted open items of workflow A-05.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/OI-01 | `codereview.md#findings` | `finding()` in 3 files, `report()` in 2 files |

## Requirements

- One `tests/helpers/doctor-fixtures.ts` with `doctorFinding(code, severity, extra?)` and `doctorReport(overrides)`, same values as the local factories.
- `doctor-rows.test.ts`, `doctor-text.test.ts`, `doctor-fix-pointer.test.ts` keep their assertions and import the helper.

## Context to recover on demand

- Rules: `tests.md`, `code-standards.md`.
- Code: `tests/unit/doctor-rows.test.ts`, `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-fix-pointer.test.ts`.

## Work

- [x] T09.1 Create the helper.
- [x] T09.2 Replace the local factories in the 3 files.

## Acceptance criteria

- No local `finding()` or `report()` doctor factory remains in the 3 files; the suites pass; lint and typecheck pass.

## Verification

- Unit: the 3 suites.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows local.
- Environment dependency: none.
- Commands: touched suites by path; `npm run typecheck`; `npm run lint`.
- Expected evidence: passing suites.

## Affected files

- Modify: `tests/unit/doctor-rows.test.ts`, `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-fix-pointer.test.ts`
- Create: `tests/helpers/doctor-fixtures.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `tests/helpers/doctor-fixtures.ts` exports `doctorFinding` (with the optional `extra` of the `doctor-rows` version) and `doctorReport`. The 3 files import them as `finding` and `report`, so their call sites and assertions did not change; unused `DiagnosticFinding` type imports were removed from `doctor-rows.test.ts` and `doctor-text.test.ts`.
- Changed files: created `tests/helpers/doctor-fixtures.ts`; modified `tests/unit/doctor-rows.test.ts`, `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-fix-pointer.test.ts`. No production code.
- Checks: the 3 suites: 22 tests pass; `npm run lint` pass; `npm run typecheck` pass; a search finds no local doctor `finding()` factory in `tests/unit/`.
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21.
- Open items: none.
