# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T08 — Restart modes in init and capabilities

## Outcome

`init --auto-restart` works for any target set that includes a harness with a restart mode, reports `AUTO_RESTART_MODE` (automatic, semi-automatic, or not available, with the reason) per active harness, and installs `.context-brake/.gitignore` for the handoff files. Codex CLI, Cursor, GitHub Copilot CLI, and Antigravity CLI declare their DEC-10 state and impact text.

## Dependencies and boundaries

- Depends on: T03, T06, T07
- Unblocks: T09
- In scope: `init-arguments.ts` target check and its message; mode findings; ignore-file planning in the manifest; process-harness capability texts; `--dry-run` listing.
- Out of scope: doctor and remove (T09).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07, FR-08, FR-10 | `prd.md#functional-requirements` | Init per harness; capability state |
| NFR-04, NFR-05 | `prd.md#non-functional-requirements` | Untracked handoffs; nothing installed with restart off |
| DEC-10, DEC-11, DEC-12 | `techspec.md#technical-decisions` | States, target check, findings, ignore file |
| CMP-11, CMP-12 | `techspec.md#components-and-flow` | Files |
| TC-10, TC-13 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `file-changes.md`, `cli-output.md`, `tests.md` (user file changes, second run).
- Existing code: `src/cli/init-arguments.ts:62-71`; `src/cli/commands/init.ts:43-63`; `src/core/services/installation-builder.ts` (94 lines; put additions in a new file); `src/infrastructure/harnesses/*/capabilities.ts`; manifest runtime assets (`installation-service.ts:60`).
- Contract: TechSpec "Contracts and data", finding codes.

## Work

- [x] T08.1 Replace the claude-only check with "at least one selected harness has a restart mode"; message names the harnesses and how to fix.
- [x] T08.2 Add `AUTO_RESTART_MODE` findings from each adapter's restart mode, in a new core service file.
- [x] T08.3 Plan `.context-brake/.gitignore` (`handoff.md`, `handoffs/`, LF) as a manifest runtime asset when `autoRestart` is on; removed on `--no-auto-restart` when unmodified.
- [x] T08.4 Update the four process-harness `capabilities.ts` impact texts per DEC-10.
- [x] T08.5 TC-13 in process: each harness fixture, twice; without claude-code; Antigravity only fails; foreign content byte-identical.

## Acceptance criteria

- TC-13 passes; the second `init` run plans no change.
- `npm run schemas:check` passes with no schema change.

## Verification

- Unit: mode-finding builder.
- Integration: `tests/integration/init-auto-restart.test.ts` via `runInProcessCli`.
- End-to-end: `e2e-init` stays green.
- Manual: not applicable.
- Platforms: all, through CI.
- Commands: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, touched suites by path.
- Environment dependency: none.
- Expected evidence: passing suites; dry-run output listing the ignore file.

## Affected files

- Modify: `src/cli/init-arguments.ts`, `src/cli/commands/init.ts`, `src/core/services/installation-builder.ts` (wiring only), `src/infrastructure/harnesses/{codex-cli,cursor,github-copilot-cli,antigravity-cli}/capabilities.ts`, existing init tests.
- Create: `src/core/services/restart-mode-findings.ts`, ignore-file planner module, `tests/integration/init-auto-restart.test.ts`.

## Observability and recovery

- Operational signal: init findings.
- Recovery: `init --no-auto-restart`.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `core/services/restart-install-extras.ts` classifies each harness restart mode from its capability profile (automatic when `auto_restart` is not unsupported; semi-automatic when the impact starts with "Semi-automatic restart"; otherwise not available), adds one `AUTO_RESTART_MODE` finding per active harness when restart is wanted, and plans `.context-brake/.gitignore` (`handoff.md`, `handoffs/`) as a manifest runtime asset (created with restart on; deleted with restart off only when unmodified). `assertAutoRestartTarget` now needs one active harness with a restart mode and checks `--auto-restart` only (`--no-auto-restart` always works); the argument-time Claude-only check is gone. Process-harness capability texts follow DEC-10; snapshots include the restart files and the ignore file. README documents restart per harness and the handoff.
- Changed files: src/core/services/{restart-install-extras.ts (new), installation-service.ts}; src/cli/{init-arguments.ts, commands/init.ts, snapshot-helper.ts}; src/infrastructure/harnesses/{codex-cli,cursor,github-copilot-cli,antigravity-cli}/capabilities.ts; README.md; tests: integration/init-auto-restart.test.ts (new), unit/auto-restart-arguments.test.ts, unit/harness-adapters.test.ts.
- Checks: typecheck ok; `npx eslint .` exit 0; `npm run schemas:check` exit 0 (no schema change); build ok; init, auto-restart, e2e-init, argument, adapter, and installation suites 91 passed; init-auto-restart 4 passed (modes, second run unchanged, `--no-auto-restart` deletes, Antigravity-only fails). Quality profile: no hits.
- Validated state: Windows 11, Node 24.19.0, base a31e183 plus T01-T08 diff.
- Open items: the restart-mode classification reads the impact text prefix; a new harness must start its semi-automatic impact with "Semi-automatic restart". `installation-service.ts` is at 89 lines.

### ADR candidates

None - direct TechSpec implementation or local decision.
