# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T06 — TechSpec describes the approved deviations and the estimated-path window

## Outcome

`techspec.md` matches the code and the decisions: DEC-07 names owner `harness_entry`, DEC-09 names `AdapterPlan.findings`, and DEC-06 states which window the estimated reading uses, per DEC-HIL-04 (per-harness window precedence). A new TC-22 names the estimated-path window assertion.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T07
- In scope: `techspec.md` DEC-06, DEC-07, DEC-09, test table (TC-22), and a compatibility note if PRD 2.1 behavior changes; TC-22 row in `tasks.md` traceability.
- Out of scope: code; PRD text (FR-06 and OBJ-01 already require the behavior).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-07 | `codereview.md#findings` | DEC-07 and DEC-09 still describe the pre-deviation design |
| codereview_01/CR-01 | `codereview.md#findings` | DEC-06 keeps `resolveUsage` unchanged, which conflicts with FR-06 and OBJ-01 |

## Requirements

- DEC-07 records owner `harness_entry` and why (`NodeChangeApplier` infers `removeState` for `runtime_state`), citing DEC-HIL-03 of `workflow.md`.
- DEC-09 records optional `AdapterPlan.findings`, collected by `installation-service.ts`, for the unparseable user-settings warning, citing DEC-HIL-03.
- DEC-06 records DEC-HIL-04: the window follows per-harness precedence on measured and estimated readings alike, harness-reported window (Pi, Oh-My-Pi) > status line window (Claude Code bridge) > `contextWindowCeiling`. `mergeMeasurements` picks the window regardless of reset staleness (only tokens are dropped, FR-06), and the `resolveUsage` estimated branch uses `measured.contextWindow ?? contextWindowCeiling`. It records the PRD 2.1 impact: Pi and Oh-My-Pi readings with `tokens: null` now use the harness window instead of the ceiling; harnesses with no window source are unchanged (OBJ-03).
- TC-22 is added to the test table: an estimated reading after a reset, with a recorded window of 1,000,000, yields `windowTokens: 1000000`; an in-process reading with `tokens: null` and `contextWindow: 200000` yields `windowTokens: 200000`.

## Context to recover on demand

- TechSpec: `techspec.md#technical-decisions` (DEC-06, DEC-07, DEC-09), `#test-approach`
- Manifest: `tasks.md#problems-and-solutions` (T03 deviation)
- Rules and skills: `sdd-create-techspec` format conventions

## Work

- [x] T06.1 Amend DEC-07 and DEC-09 with the approved deviations and their decision ID.
- [x] T06.2 Amend DEC-06 with DEC-HIL-04 and its PRD 2.1 impact.
- [x] T06.3 Add TC-22 and map it in the traceability of `tasks.md`.

## Acceptance criteria

- No DEC in the TechSpec contradicts the code for state owner, adapter findings, or window choice.
- TC-22 exists and points to `tests/unit/session-zone-statusline.test.ts` and `tests/unit/usage-resolver.test.ts`.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: reread DEC-06, DEC-07, DEC-09 against `session-zone.ts`, `usage-resolver.ts`, `statusline-planner.ts`, `installation-service.ts`.
- Platforms: not applicable.
- Environment dependency: none (DEC-HIL-04 decided).
- Commands: none.
- Expected evidence: diff of `techspec.md` and `tasks.md`.

## Affected files

- Modify: `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md`, `tasks/prd-02.2-janela-de-contexto-do-claude-code/tasks.md`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: revert the document edit.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: TechSpec DEC-06 amended with the per-harness window precedence (DEC-HIL-04) and its PRD 2.1 impact; DEC-07 records owner `harness_entry` and the reason; DEC-09 records `AdapterPlan.findings`; overview paragraph and CMP-07a aligned; TC-22 added and mapped in `tasks.md`.
- Changed files: `techspec.md` (overview, DEC-06, DEC-07, DEC-09, CMP-07a, TC-22), `tasks.md` (traceability row TC-22).
- Checks: Reread DEC-06/07/09 against `session-zone.ts:mergeMeasurements`, `usage-resolver.ts:resolveUsage`, and the T03 deviation in `tasks.md#problems-and-solutions`; no `runtime_state` left for the state file (line 24 cites the owner enum only). No code, so no gates.
- Validated state: HEAD 5917593 plus uncommitted worktree, 2026-09-26.
- Open items: DEC-06 text describes the target behavior; T07 implements it. DEC-02 command format changes in T09, which amends DEC-02.
