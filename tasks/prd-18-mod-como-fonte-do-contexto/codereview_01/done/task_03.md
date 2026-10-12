# Stable execution context

Load in this exact order:

1. `tasks/prd-18-mod-como-fonte-do-contexto/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T03 — Align the TechSpec with the files that exist and state what "reporting" means

## Outcome

The TechSpec names the components and test files that exist, and the README says that `contextWindow.mod: reporting` means a session has reported a reading (no freshness bound), so a reader can trace TC-02 and understand the doctor output.

## Dependencies and boundaries

- Depends on: T01, T02
- Unblocks: —
- In scope: `techspec.md` (CMP-07, Relevant files, TC-02 to TC-09 file names, the DEC-04 report-once rule), the README context-source section.
- Out of scope: the PRD (its approval stays valid), code, and `MOD_VERSION` (CR-06 stays on the release checklist).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-05 | `codereview.md#findings` | TechSpec lists files that do not exist |
| codereview_01/CR-03 | `codereview.md#findings` | `reporting` has no freshness bound and the meaning is not stated |

## Requirements

- Every file named in the TechSpec's component table, test table, and relevant files exists or is marked as replaced.
- The README states that `reporting` means a valid reading file exists for any past session in this repository.

## Context to recover on demand

- TechSpec: `Components and flow`, `Test approach`, `Relevant files`.
- Code: the list of created files in `done/task_02.md` and `done/task_03.md` handoffs.

## Work

- [x] T03.1 Replace `context-source-diagnostics.ts` and `tests/unit/context-reading-mod.test.ts` with the real files in CMP-07, the test table, and Relevant files.
- [x] T03.2 Add to DEC-04 that a failure or a missing window is reported once until another record follows it.
- [x] T03.3 Add one sentence to the README context-source section defining `reporting`, and note CR-06 on the release checklist in the TechSpec rollout.

## Acceptance criteria

- No path in the TechSpec's tables points to a missing file (checked with a listing).
- The README sentence exists and matches `readClaudeContextWindow`.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: a listing of every path named in the TechSpec tables against the repository.
- Platforms: not applicable.
- Environment dependency: none.
- Commands: `npm run lint`
- Expected evidence: the listing shows no missing path.

## Affected files

- Modify: `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md`, `README.md`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the documents.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: the TechSpec names `context-readings-scan.ts`, `project-root.ts`, and `tests/integration/claude-mod-reading.test.ts` instead of the missing files, DEC-04 records the report-once rule and the runtime ignore, the rollout section carries the release checklist for CR-06, and the README defines `reporting` as a reading reported at some point.
- Changed files: `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md`, `README.md`.
- Checks: listing of the paths named in the TechSpec tables against the repository showed none missing; `npm run lint` clean.
- Validated state: base `63fd5cb` plus the uncommitted diff.
- Open items: CR-06 (`MOD_VERSION` bump) stays on the release checklist; no freshness bound for `reporting` (CR-03), as the README now states.
