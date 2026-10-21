# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/prd.md`
2. `tasks/prd-24-doctor-fix-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Planner inputs for fix

## Outcome

`planInit(env, request)` returns the `init` plan without printing, and `executeInit` uses it with unchanged output. The planner keeps a modified owned asset when its path is in `overwritePaths`, and the Claude Code status line request `'keep'` plans no status line change on the bridge and the mod source.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T04
- In scope: CMP-04 (`'keep'`), CMP-07, CMP-08, CMP-09.
- Out of scope: the `fix` command (T04, T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03 | `prd.md#functional-requirements` | Plan reruns init with the current configuration |
| FR-05, FR-06 | `prd.md#functional-requirements` | Replace, reinstall, forget, and skip can be planned |
| NFR-01, NFR-02 | `prd.md#non-functional-requirements` | Writes only through the plan; consent |
| DEC-03, DEC-04, DEC-05 | `techspec.md#technical-decisions` | `planInit`, `overwritePaths`, `'keep'` |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `file-changes.md`, `harness-adapters.md`, `tests.md`
- Existing code: `src/cli/init-flow.ts:56-77`, `src/core/services/asset-currency.ts:152-179`, `src/core/services/installation-service.ts:55-89`, `src/infrastructure/harnesses/claude-code/statusline-planner.ts:23-33`, `claude-code/context-source.ts:14-18`, `claude-code/statusline-migration.ts:21-25`
- Contract: `techspec.md#technical-decisions` DEC-03 to DEC-05

## Work

- [ ] T02.1 Create `src/cli/init-plan.ts` with `planInit(env, request)` (request: `harness`, `excludeHarness`, `statuslineBridge`, config updates, `overwritePaths`, `noAutoRestart`); `executeInit` calls it.
- [ ] T02.2 `protectModifiedAssets` takes `{ manifest, snapshots, overwritePaths }`; `InstallationInput.overwritePaths` reaches it; update the callers.
- [ ] T02.3 Add `'keep'` to `StatuslineBridgeRequest`; `planStatuslineInstall` returns an empty plan for it before the source choice; `decideContextSource` treats it as `'default'`.

## Acceptance criteria

- `init` output, plan, and exit codes do not change (existing suites pass).
- A modified asset in `overwritePaths` is a planned change, and its manifest entry gets the new hash; without it, the conflict stays.
- `'keep'` gives no change to `.claude/settings.local.json`, the status line state, or the bridge script, for Claude Code below 2.1.287 and at 2.1.287 or later.

## Verification

- Unit: TC-06 (the existing suite for `protectModifiedAssets`, or `tests/unit/asset-currency.test.ts`).
- Integration: TC-07 (`tests/integration/statusline-keep.test.ts`, version through `tests/helpers/claude-version-runner.ts`); TC-24 (existing `tests/integration/init-*.test.ts` touched suites).
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows local.
- Commands: touched suites by path; `npm run typecheck`; `npm run lint`.
- Environment dependency: none.
- Expected evidence: passing suites.

## Affected files

- Modify: `src/cli/init-flow.ts`, `src/core/services/asset-currency.ts`, `src/core/services/installation-service.ts`, `src/core/contracts/adapter.ts`, `src/infrastructure/harnesses/claude-code/statusline-planner.ts`, `src/infrastructure/harnesses/claude-code/context-source.ts`
- Create: `src/cli/init-plan.ts`, `tests/integration/statusline-keep.test.ts`

## Observability and recovery

- Operational signal: none new.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `planInit(env, request)` in `src/cli/init-plan.ts` plans without output; `request` = `harness`, `excludeHarness`, `statuslineBridge`, `noAutoRestart`, optional `configUpdates(config)` (absent = `KEEP_UPDATES`, new export of `init-config-updates.ts`), optional `overwritePaths`. `executeInit` builds the request from its args and keeps its asserts, preview, confirmation, and apply. `protectModifiedAssets(changes, { manifest, snapshots, overwritePaths })` keeps a modified asset whose path is in the set; its manifest entry then takes the planned hash, because only conflicted paths keep the old entry (`installation-service.ts`). `'keep'` returns the empty status line plan before the source choice.
- Changed files: created `src/cli/init-plan.ts`, `tests/integration/statusline-keep.test.ts`; modified `src/cli/init-flow.ts`, `src/cli/init-config-updates.ts` (`KEEP_UPDATES`, not listed in the task), `src/core/services/asset-currency.ts`, `src/core/services/installation-service.ts`, `src/core/contracts/adapter.ts`, `src/infrastructure/harnesses/claude-code/statusline-planner.ts`, `tests/unit/asset-currency.test.ts`. `context-source.ts` needed no change: `decideContextSource` only special-cases `'install'`, so `'keep'` already follows the `'default'` source choice.
- Checks: TC-06 and TC-07 (8 tests) pass; TC-24: 65 integration suites matching init, statusline, mod, gitignore, asset, exclusion, config-repair, auto-restart, install plus `tests/unit/installation*.test.ts`: 270 tests pass; `npm run typecheck` pass; `npm run lint` pass. Quality profile over the task files: one QA-06 match at `tests/unit/asset-currency.test.ts:12`, a pre-existing `it.each` callback with one destructured parameter (not a 4-parameter declaration; line not changed by this task).
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21.
- Open items: with the mod source, `'keep'` still lets the mod plan change other keys of `.claude/settings.local.json`; the `statusLine` value stays the same (TC-07 asserts the planned `statusLine`, not the whole file). This matches DEC-05 (no status line change).

### ADR candidates

None - direct TechSpec implementation (DEC-03, DEC-04, DEC-05).
