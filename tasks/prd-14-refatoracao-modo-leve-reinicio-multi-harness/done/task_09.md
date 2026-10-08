# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T09 — Doctor and remove for restart on every harness

## Outcome

`doctor` reports, per harness with restart on, ready, not loaded or outdated, and the last skip reason, using the existing `AUTO_RESTART_*` codes with `harness` set, plus one `AUTO_RESTART_HANDOFF` finding for the handoff mode and pending state. `remove` and `init --no-auto-restart` delete every restart artifact and keep `.context-brake/handoff.md` and `.context-brake/handoffs/`, naming them. The full suite stays within 120 s.

## Dependencies and boundaries

- Depends on: T05, T08
- Unblocks: —
- In scope: shared restart diagnostics, Claude diagnostics on top of it, per-adapter `diagnose`, handoff finding, removal plans, budget check.
- Out of scope: new restart behavior.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-10, FR-11, FR-13 | `prd.md#functional-requirements` | Doctor per harness; removal |
| NFR-03 | `prd.md#non-functional-requirements` | Budget |
| DEC-13, DEC-14, DEC-17 | `techspec.md#technical-decisions` | Diagnostics, removal, diagnostics move |
| CMP-13, CMP-14 | `techspec.md#components-and-flow` | Files |
| TC-12, TC-14, TC-15 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `file-changes.md`, `cli-output.md`, `tests.md`.
- Existing code: `src/infrastructure/harnesses/claude-code/auto-restart-diagnostics.ts:13-82`; `claude-code/auto-restart-planner.ts`; `src/cli/commands/doctor.ts:35`, `remove.ts:45`; `storage/runtime-state-files.ts`; manifest asset deletion (`removal-helper.ts`).
- Contract: TechSpec "Contracts and data", finding codes.

## Work

- [x] T09.1 Add `common/restart-diagnostics.ts` and rebase the Claude diagnostics on it; wire `diagnose` for automatic harnesses from T06/T07 and the semi-automatic READY finding.
- [x] T09.2 Add `AUTO_RESTART_HANDOFF` (doctor) and `AUTO_RESTART_HANDOFF_KEPT` (remove and `--no-auto-restart`).
- [x] T09.3 Ensure removal plans delete the restart files, the ignore file, and `runtime/restart/`, and never the handoffs.
- [x] T09.4 TC-12 and TC-14 in process per harness fixture.
- [x] T09.5 Run `npm run test:budget` and record the time (TC-15).

## Acceptance criteria

- TC-12, TC-14 pass; TC-15 ≤ 120 s.
- `npm run schemas:check` passes.

## Verification

- Unit: finding builders.
- Integration: `tests/integration/doctor-auto-restart.test.ts`, `tests/integration/remove-auto-restart.test.ts`.
- End-to-end: `e2e-doctor`, `e2e-remove` stay green.
- Manual: not applicable.
- Platforms: all, through CI.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run test:budget`.
- Environment dependency: none.
- Expected evidence: passing suites and the budget output.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/auto-restart-diagnostics.ts`, `claude-code/adapter.ts`, `{pi,oh-my-pi,opencode}/adapter.ts`, `src/cli/commands/{doctor,remove}.ts`, restart planners, existing doctor/remove tests.
- Create: `src/infrastructure/harnesses/common/restart-diagnostics.ts`, `tests/integration/doctor-auto-restart.test.ts`, `tests/integration/remove-auto-restart.test.ts`.

## Observability and recovery

- Operational signal: doctor findings.
- Recovery: revert the task commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `common/restart-diagnostics.ts` reads the newest v2 log per harness (`latestRestartLog`) and `diagnoseInProcessRestart` reports `AUTO_RESTART_OUTDATED_MOD` (restart file missing or older component), `AUTO_RESTART_NOT_LOADED`, `AUTO_RESTART_READY`, and `AUTO_RESTART_LAST_SKIP` with `harness` set, for Pi and Oh-My-Pi; their restart modules record a loaded entry on `session_start` (and `session_switch` on Oh-My-Pi). Claude diagnostics now use the shared log reader after their version and settings checks. `core/services/restart-doctor-findings.ts` adds `AUTO_RESTART_READY` for each installed semi-automatic harness and one `AUTO_RESTART_HANDOFF` (snapshot command or markdown handoff, pending or not); `cli/handoff-findings.ts` adds `AUTO_RESTART_HANDOFF_KEPT` to `remove` and `init --no-auto-restart`. Removal already deletes the restart files (T06), the ignore file (manifest asset), and `runtime/restart/`; handoffs stay.
- Changed files: src/infrastructure/harnesses/common/{restart-diagnostics.ts, in-process-restart-support.ts} (new), common/in-process-restart-log.ts, claude-code/auto-restart-diagnostics.ts, {pi,oh-my-pi}/{adapter,restart}.ts; src/core/services/restart-doctor-findings.ts (new); src/cli/handoff-findings.ts (new), src/cli/commands/{doctor,remove,init}.ts; tests: integration/doctor-remove-restart.test.ts (new), integration/claude-mod-restart.test.ts (waits for the async rejection codes).
- Checks: typecheck ok; `npx eslint .` "No issues found"; `npm run schemas:check` exit 0; `npm run test:budget`: 82.6 s wall (budget 120 s); `npm run coverage`: 212 files, 1138 tests passed, coverage 94.08% statements, 90.05% branches, 94.66% functions, 94.08% lines. Quality profile over the diff: no new hits.
- Validated state: Windows 11, Node 24.19.0, base a31e183 plus T01-T09 diff.
- Open items: the Claude mod rejection test read the log right after a fixed flush and failed once under coverage; it now waits for the two codes (no timeout raised). Observed, not changed: after install and remove, an empty `"hooks": {}` in `.codex/hooks.json` comes back as `{
  }` (pre-existing Codex updater formatting; JSON content unchanged).

### ADR candidates

None - direct TechSpec implementation or local decision.
