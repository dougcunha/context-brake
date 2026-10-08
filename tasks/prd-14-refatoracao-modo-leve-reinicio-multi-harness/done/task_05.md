# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Run the Claude Code mod on the neutral restart flow

## Outcome

The Claude Code mod calls `handleTurnEnd` through a `ModHost`-backed `RestartHost`, applies the handoff gate with the turn start it already tracks, and writes the v2 log under `.context-brake/runtime/restart/claude-code/`. Every PRD-11 simulated-host scenario keeps its result.

## Dependencies and boundaries

- Depends on: T03, T04
- Unblocks: T09
- In scope: `claude-code/mod/*`, the mod bundle, its tests, the mod version bump.
- Out of scope: Claude diagnostics move (T09); install planner changes beyond paths (T08/T09).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04, FR-05, FR-09, FR-12, NFR-01 | `prd.md#functional-requirements` | Gate, neutral flow, guards, detector, safety |
| DEC-04, DEC-05, DEC-06, DEC-07, DEC-16 | `techspec.md#technical-decisions` | Adapter shape and facts |
| CMP-08 | `techspec.md#components-and-flow` | Files |
| TC-07, TC-11 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `harness-adapters.md`, `node.md`, `tests.md`.
- Existing code: `src/infrastructure/harnesses/claude-code/mod/{restart-flow,restart-facts,mod-guards,mod-log,mod-info,turn-state,hooks,register,host}.ts`; `assets/runtime/claude-code-mod.ts`; existing mod tests under `tests/integration/`.
- Harness reference: `docs/research/harness-integrations.md` Claude Code section (mods).

## Work

- [x] T05.1 Build the `RestartHost` adapter over `ModHost` (`openSession` = `/clear` then seed; `handoff.pendingSince` via `$.fs.stat`; turn start from `turn-state.ts`).
- [x] T05.2 Move the log to `runtime/restart/claude-code/` with schema v2 and bump `MOD_VERSION`.
- [x] T05.3 Keep `DISABLE_AUTO_COMPACT` and surfaces in the Claude facts builder.
- [x] T05.4 Update mod tests: same PRD-11 outcomes, new path and code name; add handoff-mode cases (missing, stale, fresh) and TC-11 marker shapes.

## Acceptance criteria

- TC-07 passes with unchanged PRD-11 outcomes.
- In handoff mode, a marker reply with no fresh handoff does not run `/clear` and logs the skip code.

## Verification

- Unit: not applicable beyond T04.
- Integration: Claude mod simulated-host suites.
- End-to-end: existing smoke set stays green.
- Manual: not applicable.
- Platforms: all, through CI.
- Commands: `npm run lint`, `npm run typecheck`, `npm run build` (mod bundle), touched suites by path.
- Environment dependency: none.
- Expected evidence: passing suites; QA-06 clean on the mod files.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/mod/*.ts`, mod tests.
- Create: `src/infrastructure/harnesses/claude-code/mod/restart-host.ts` (adapter).

## Observability and recovery

- Operational signal: v2 log per session.
- Recovery: revert the task commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the Claude Code mod calls the neutral `handleTurnEnd` through `createModRestartHost` (`mod/restart-host.ts`): guards in `$.store` via `modGuardStore`, handoff mtime via `$.fs.exists/stat`, turn start from `turn-state.ts`, `openSession` = `/clear` then mark seeded and submit the seed in parallel (seed failure → `ERROR_INTERNAL`, clear failure → rollback + `ERROR_RESTART_REJECTED`), `DISABLE_AUTO_COMPACT` and surfaces kept in `restart-facts.ts`. `mod-config.ts` adds the restart mode; the log moved to `.context-brake/runtime/restart/claude-code/` (v2).
- Changed files: src/infrastructure/harnesses/claude-code/mod/{restart-host (new),restart-flow,mod-guards,restart-facts,mod-config,mod-info,hooks}.ts; src/core/services/restart-flow.ts (`reportRestart` takes `Pick<RestartHost, "log" | "notify">`); tests/fixtures/claude-mod-scene.ts (snapshot command by default, `handoff` option, log path from `MOD_LOG_DIR`); tests/integration/claude-mod-handoff.test.ts (new).
- Checks: typecheck ok; `npx eslint .` "No issues found" (exit 0); build ok; Claude mod, doctor, and simulator suites 55 passed, including every PRD-11 scenario unchanged and the three handoff-gate cases. Quality profile over the diff: no hits.
- Validated state: Windows 11, Node 24.19.0, base a31e183 plus T01-T05 diff.
- Open items: `MOD_VERSION` stays `1.0.0` (deviation from DEC-05): a test pins it to the package version so doctor detects drift; the moved log directory and v2 schema already make doctor report an older running mod as not loaded until Claude Code restarts. The PRD-11 scene now runs in snapshot mode, because a default configuration with restart on and no snapshot command is handoff mode.

### ADR candidates

None - direct TechSpec implementation or local decision.
