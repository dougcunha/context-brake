# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/codereview_02/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T08 — Close the test reservations of codereview_02

## Outcome

The prd-24 doctor text tests live in their own file under 100 lines, the TTY skip case asserts the `.gitignore` block, and `--yes --force` with an inactive bridge has an automated case.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: tests only.
- Out of scope: production code; accepted open items of workflow A-05.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_02/OI-01 | `codereview.md#findings` | `tests/unit/doctor-text.test.ts` above 100 lines (QA-07) |
| codereview_02/OI-02 | `codereview.md#findings` | `s` case does not assert `.gitignore` (T07.2) |
| codereview_02/OI-03 | `codereview.md#findings` | no `--yes --force` bridge reinstall case (FR-06, TC-13) |

## Requirements

- Move the prd-24 TC-03 block out of `tests/unit/doctor-text.test.ts` into `tests/unit/doctor-fix-pointer.test.ts`; both files at or below 100 lines.
- The `s` case runs inside a `.git` folder and keeps `.gitignore` byte-identical.
- `fix --yes --force` on an inactive-bridge fixture reports `STATUSLINE_BRIDGE_INACTIVE` `fixed` and the local status line points to the bridge.

## Context to recover on demand

- Rules: `tests.md`, `code-standards.md`.
- Code: `tests/unit/doctor-text.test.ts:96-112`, `tests/integration/fix-interactive.test.ts`, `tests/integration/fix-command.test.ts`, `tests/helpers/fix-world.ts`.

## Work

- [ ] T08.1 Move TC-03 tests to `tests/unit/doctor-fix-pointer.test.ts`.
- [ ] T08.2 Add `.git` and `.gitignore` to the `s` case.
- [ ] T08.3 Add the `--yes --force` bridge case.

## Acceptance criteria

- The 3 touched or new test files pass and are at or below 100 lines; lint and typecheck pass.

## Verification

- Unit: `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-fix-pointer.test.ts`.
- Integration: `tests/integration/fix-interactive.test.ts`, `tests/integration/fix-command.test.ts`.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows local.
- Environment dependency: none.
- Commands: touched suites by path; `npm run typecheck`; `npm run lint`.
- Expected evidence: passing suites; line counts.

## Affected files

- Modify: `tests/unit/doctor-text.test.ts`, `tests/integration/fix-interactive.test.ts`, `tests/integration/fix-command.test.ts`
- Create: `tests/unit/doctor-fix-pointer.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: OI-01: the prd-24 TC-03 block moved to `tests/unit/doctor-fix-pointer.test.ts` (36 lines; `doctor-text.test.ts` back to 94 lines). OI-02: the TTY `s` case runs inside a `.git` folder and asserts `.gitignore` unchanged and still listing the bridge script. OI-03: `fix --yes --force` on an inactive bridge reports `STATUSLINE_BRIDGE_INACTIVE` `fixed` and the local status line points to the bridge.
- Changed files: created `tests/unit/doctor-fix-pointer.test.ts`; modified `tests/unit/doctor-text.test.ts`, `tests/integration/fix-interactive.test.ts`, `tests/integration/fix-command.test.ts`. No production code.
- Checks: the 4 suites: 29 tests pass; `npm run lint` pass; `npm run typecheck` pass; line counts 91, 83, 94, 36.
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21.
- Open items: none; the accepted open items of workflow A-05 stay with their owners.
