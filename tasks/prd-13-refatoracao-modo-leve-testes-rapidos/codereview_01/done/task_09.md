# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T09 — Amend DEC-03, DEC-04, and DEC-06 to the decided state

## Outcome

The TechSpec matches the code and DEC-EXC-01:
- the process list holds the 12 files and allows the two capability probe unit tests;
- DEC-06 names only the global worker cap;
- DEC-03 places the in-process plugin round trips in `runtime-in-process.test.ts`.

The lane test name traces to the amended list.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_01
- In scope: `../techspec.md` (DEC-03, DEC-04, DEC-06, the mapping rows for `e2e-codex-hook-root` and `e2e-statusline-bridge`, the process-test table, the risk on worker caps, and an amendment note); the TC-06 test name in `tests/unit/test-lanes.test.ts`; re-hash of `techspec.md` and `tasks.md` under DEC-EXC-01.
- Out of scope: code behavior; the optional fake runner (DEC-EXC-01: not included).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#Findings` | Process list and guard test diverge from DEC-04 |
| codereview_01 limitations | `codereview.md#Limitations and open items` | DEC-06 and DEC-03 deviations without a decision |
| DEC-EXC-01 | `../workflow.md#Human Decisions Log` | Amendment approved |

## Requirements

- The TechSpec process table lists exactly `PROCESS_LANE_FILES` and names the two probe tests with their reason.
- The amendment is marked with its date and DEC-EXC-01, and IDs are preserved.

## Context to recover on demand

- `../techspec.md#technical-decisions`, `#tests-allowed-to-start-a-process-fr-05-dec-04`, `#risks-and-open-items`.
- `tests/test-lanes.ts:PROCESS_LANE_FILES`.

## Work

- [x] T09.1 Amend the TechSpec sections and add the amendment note.
- [x] T09.2 Rename the TC-06 test to cite DEC-EXC-01; re-hash `techspec.md` and `tasks.md` in `../checkpoint.json` under DEC-EXC-01.

## Acceptance criteria

- The TechSpec process table equals `PROCESS_LANE_FILES` plus the two probe tests.
- `tests/unit/test-lanes.test.ts` passes.

## Verification

- Unit: `tests/unit/test-lanes.test.ts`.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: read the amended sections.
- Platforms: any.
- Environment dependency: none.
- Commands: `npx vitest run tests/unit/test-lanes.test.ts`, `npm run lint`.
- Expected evidence: the amended table and the passing lane test.

## Affected files

- Modify: `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`, `tests/unit/test-lanes.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the amendment.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result (CR-02 and the DEC-03 and DEC-06 limitations, DEC-EXC-01):
  - `techspec.md` DEC-03, DEC-04, and DEC-06 each carry an "Amended 2026-10-07 (DEC-EXC-01)" note.
  - The mapping rows for `e2e-codex-hook-root` and `e2e-statusline-bridge` name their final files and their remaining process.
  - The process table lists the 12 lane files and a row for the `git-capability` and `process-capability` unit probes.
  - The worker-cap risk now says that no per-lane cap exists in Vitest 3.2.7.
  - The TC-06 test is renamed "keeps the process lane equal to the TechSpec list as amended by DEC-EXC-01".
  - `techspec.md` and `tasks.md` are re-hashed under DEC-EXC-01 in `checkpoint.json`.
- Changed files: `techspec.md`, `tests/unit/test-lanes.test.ts`.
- Checks: each amended line contains its DEC-EXC-01 text or file names (grep). `tests/unit/test-lanes.test.ts` passes 7 tests. `rtk proxy npx eslint` is clean.
- Validated state: TechSpec as amended; code unchanged by this task apart from the test name.
- Open items: none.
