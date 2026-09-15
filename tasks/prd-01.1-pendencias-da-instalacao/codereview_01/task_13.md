# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T13 — Reconcile manifest, TechSpec, and task handoff traceability

## Outcome

Traceability tables in `tasks.md` and `techspec.md` accurately point to the test files that actually implement and verify `FR-09`/`TC-05` and `FR-12`/`TC-08`, and `done/task_02.md` clearly documents that `remove.ts` manifest rewriting was not applicable.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope:
  - In `tasks/prd-01.1-pendencias-da-instalacao/tasks.md` and `techspec.md`, update references from `safe-removal.test.ts` to `tests/integration/runtime-state-removal.test.ts` and `tests/integration/directory-pruner.test.ts`.
  - In `tasks.md` and `techspec.md`, update references for `FR-12` / `TC-08` / `RF9` to include `tests/unit/support-service-version-gating.test.ts`.
  - In `tasks/prd-01.1-pendencias-da-instalacao/done/task_02.md`, update work item T02.4 to clarify that manifest rewrite in `remove.ts` is not applicable, aligning with handoff open items.
- Out of scope: Application or test code changes.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-04 | `codereview.md#findings` | Traceability citations in `tasks.md` and `techspec.md` point to unchanged test files, and T02.4 in `done/task_02.md` lacked non-applicable qualification |

## Requirements

- All source-to-test traceability entries in `tasks.md` and `techspec.md` must link to actual test files providing the verified coverage.
- Markdown links and table entries must remain consistent and valid.

## Context to recover on demand

- TechSpec: `test-plan` (TC-05, TC-08)
- Rules and skills: `.agents/skills/sdd-plan-tasks`, `.agents/skills/sdd-review-code`
- Code: `tasks/prd-01.1-pendencias-da-instalacao/tasks.md`, `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`, `tasks/prd-01.1-pendencias-da-instalacao/done/task_02.md`

## Work

- [x] T13.1 Update `tasks.md` rows for FR-09, US-06, FR-12, and RF9 to cite `tests/integration/runtime-state-removal.test.ts`, `tests/integration/directory-pruner.test.ts`, and `tests/unit/support-service-version-gating.test.ts`.
- [x] T13.2 Update `techspec.md` table entries for TC-05 and TC-08 with the real test suite files.
- [x] T13.3 Update `done/task_02.md` T02.4 description to record that the `remove.ts` clause was not applicable per handoff open items.

## Acceptance criteria

- Traceability matrices in `tasks.md` and `techspec.md` correctly reference existing test files containing the assertions.
- `done/task_02.md` work item T02.4 accurately reflects actual implementation scope.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: Inspect git diff in `tasks.md`, `techspec.md`, `done/task_02.md`.
- Platforms: Platform-independent.
- Environment dependency: none.
- Commands: git diff inspection.
- Expected evidence: Clean diff aligning traceability links.

## Affected files

- Modify: `tasks/prd-01.1-pendencias-da-instalacao/tasks.md`, `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`, `tasks/prd-01.1-pendencias-da-instalacao/done/task_02.md`

## Observability and recovery

- Operational signal: Markdown links and table entries resolve.
- Recovery: Revert modified files with git.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Reconciled traceability across `tasks.md`, `techspec.md`, and `done/task_02.md`, fully resolving CR-04.
- Changed files: `tasks/prd-01.1-pendencias-da-instalacao/tasks.md`, `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`, `tasks/prd-01.1-pendencias-da-instalacao/done/task_02.md`.
- Checks: `git diff` confirms exact alignment of test file links and qualifications.
- Validated state: Consistent test traceability resolving to actual test files.
- Open items: None.
