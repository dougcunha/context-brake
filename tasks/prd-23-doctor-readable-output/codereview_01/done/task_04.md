# Stable execution context

Load in this exact order:

1. `tasks/prd-23-doctor-readable-output/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T04 — Assert the exit code of the text run and the OK header with slow overhead

## Outcome

TC-13 checks the exit code of the text `doctor` run, and TC-04 checks that a healthy report with overhead `fail` keeps the header `OK` while the harness row shows `WARN`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: test assertions for CR-01 and CR-02.
- Out of scope: production code; the review limitations accepted in A-03.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | Text run of TC-13 does not assert exit code 2 |
| codereview_01/CR-02 | `codereview.md#findings` | No formatter test of the `OK` header with overhead `fail` (TC-04, FR-06) |

## Requirements

- TC-13: the invalid-configuration text run exits with code 2 (`techspec.md#test-approach`).
- TC-04 / FR-06: overhead `fail` with no warning finding keeps the header `ContextBrake doctor: OK (no problems found)` and prints `WARN` on the harness row.

## Context to recover on demand

- TechSpec: `techspec.md#test-approach` (TC-04, TC-13)
- Rules and skills: `tests.md`, `code-standards.md`
- Code: `tests/integration/config-repair-errors.test.ts:56-58`; `tests/unit/doctor-text.test.ts` (`format`, `report` helpers)

## Work

- [x] T04.1 Add `expect(text.code).toBe(2)` to the text run in `config-repair-errors.test.ts`.
- [x] T04.2 Add a `formatDoctorReport` case in `doctor-text.test.ts` with a healthy report and overhead `fail`.

## Acceptance criteria

- Both new assertions pass on the current code.
- No production file changes.

## Verification

- Unit: the new `doctor-text.test.ts` case.
- Integration: `config-repair-errors.test.ts`.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: platform-independent.
- Environment dependency: none.
- Commands: `npx vitest run tests/unit/doctor-text.test.ts tests/integration/config-repair-errors.test.ts`, then `npx eslint` on both files.
- Expected evidence: both suites pass.

## Affected files

- Modify: `tests/integration/config-repair-errors.test.ts`, `tests/unit/doctor-text.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the 2 test edits.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: CR-01: the text run in `config-repair-errors.test.ts` asserts `text.code` 2. CR-02: `doctor-text.test.ts` renders a healthy report with overhead `fail` 133.7/100 and asserts the header `ContextBrake doctor: OK (no problems found)` and the harness row ending in `overhead 134 ms / 100 ms WARN`.
- Changed files: `tests/integration/config-repair-errors.test.ts`, `tests/unit/doctor-text.test.ts`. No production file.
- Checks: `npx vitest run tests/unit/doctor-text.test.ts tests/integration/config-repair-errors.test.ts` 2 files, 12 tests passed; `npx eslint` on both files clean; QA-01, QA-02 on both files: no hit.
- Validated state: base `419c0bd` plus the pre-existing prd-22 diff and T01-T04, Windows 11, Node.js 24.20.0, Git Bash.
- Open items: none.
