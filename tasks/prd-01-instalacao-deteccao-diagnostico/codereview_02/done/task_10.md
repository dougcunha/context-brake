# T10 — Canonicalize harness change targets so symlinked or junctioned configs match snapshots and installs stay idempotent

## Outcome

On a repository whose harness configuration path is reached through a symlink or junction, `context-brake init` registers the integration (exit 0) and a second run is a byte-identical no-op; genuine concurrent edits still fail with `FILE_CHANGED_SINCE_PREVIEW`. The planned `RealPath` and the snapshot `realPath` use one canonical form.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: canonical target resolution for harness planned changes (install and remove); the shared helper; reuse in all eight planners; unit, integration, and end-to-end regression coverage for symlinked/junctioned harness configs.
- Out of scope: changing snapshot logic, `change-applier` precondition semantics, the JSON editor, vendor schemas, capability tables, or the instruction-file symlink handling already covered by RF13/CA-07.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_02/CR-01 | `codereview.md#findings` | TechSpec `FileChange.realPath` ("canonical target for deduplication and writing") and `file-changes.md` symlink resolution are violated: planners set `realPath` with `resolve()`, snapshots are canonical, `matchSnapshot` never matches, and the existing config fails with a false `FILE_CHANGED_SINCE_PREVIEW` (exit 2, integration not registered) |

## Requirements

- Planned `realPath` for every harness config and runtime asset must equal the canonical path used by `snapshotFile` (`src/infrastructure/storage/node-file-system.ts:25`), so `matchSnapshot` (`src/core/services/change-plan-service.ts:21-24`) resolves the real bytes and hash.
- Canonicalization must work when the target does not exist yet (create), by resolving the nearest existing ancestor directory and re-appending the missing segments, without escaping the repository root.
- The link or junction must survive; writes must still land on the real target (existing `atomic-writer` behavior).
- A genuinely changed file between plan and apply must keep reporting `FILE_CHANGED_SINCE_PREVIEW`; nothing may broaden the precondition to accept stale content.
- Non-symlinked repositories and all current behavior must not regress.

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — "FileChange", "ChangePlan", "Per-file atomicity with optimistic concurrency", "Known Risks" (Windows symlink privileges).
- Rules and skills: `file-changes.md` (resolve links, write atomically, stay inside root), `harness-adapters.md`, `javascript-typescript.md`, `node.md`, `tests.md`; `sdd-execute-corrections`.
- Code: `src/infrastructure/storage/path-boundary.ts` (`resolveCanonicalPath`, `assertWithinRepository`) — reuse the canonical resolver; `src/infrastructure/storage/node-file-system.ts:11-29` — snapshot `realPath`; `src/core/services/change-plan-service.ts:21-24` — matching; the eight `src/infrastructure/harnesses/*/planner.ts` — `realPath` construction.

## Work

- [x] T10.1 Add a shared async helper that returns the canonical target for a planned change: resolve `realpath` when the path exists, otherwise canonicalize the nearest existing ancestor directory and re-append the missing segments (POSIX-normalized, repository-boundary checked). Place it beside the harness helpers and reuse `path-boundary.ts` rather than duplicating boundary logic.
- [x] T10.2 Use the helper to set `realPath` for every planned change in all eight install and remove planners (`claude-code`, `codex-cli`, `cursor`, `github-copilot-cli`, `opencode`, `pi`, `oh-my-pi`, `antigravity-cli`), covering both harness config files and runtime assets.
- [x] T10.3 Add a unit test for the helper: existing file, missing file under a symlinked/junctioned ancestor, nested missing segments, and an out-of-root path rejected.
- [x] T10.4 Add an integration regression fixture where a harness config directory is a symlink or junction (for example `.claude` → `.agents` with a user `UserHook`): assert the planned `realPath` matches the snapshot `realPath`, the entry is registered, the link survives, user content is preserved, and a second plan reports no changes. Skip with an explicit reason only when the runner cannot create a link.
- [x] T10.5 Add an end-to-end scenario that runs the built CLI against the junction/symlink fixture: `init --yes` exits 0, a second `init --yes` is byte-identical, and a genuine concurrent edit still yields `FILE_CHANGED_SINCE_PREVIEW`.
- [x] T10.6 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`, and `npm run package:smoke`; confirm all gates stay green and the codereview_02/CR-01 repro no longer fails.

## Acceptance criteria

- On a repository whose `.claude` is a junction or symlink to `.agents`, `context-brake init --yes` exits 0, registers exactly one Claude Code integration, leaves the link a link, preserves the user's existing hooks, and a second run changes nothing.
- The same holds for at least one other symlinked/junctioned adapter config (for example `.cursor` or `.agents`).
- The reviewed repro from `codereview_02` (junction fixture) changes from `FILE_CHANGED_SINCE_PREVIEW`/exit 2 to success.
- A file modified after planning still fails with `FILE_CHANGED_SINCE_PREVIEW` (existing IT-15 stays green).
- No regression for the standard non-symlinked fixtures.

## Verification

- Unit: new helper tests for existing, missing-under-link, nested-missing, and out-of-root paths.
- Integration: new fixture covering a symlinked/junctioned harness config; assert snapshot/plan identity, byte-idempotent second run, and link preservation; existing `tests/integration/change-applier.test.ts` and symlink instruction tests stay green.
- End-to-end: built CLI on the `codereview_02` junction fixture; rerun E2E-01, E2E-04 (idempotency), E2E-05 (partial installation), and E2E-07 (removal) per the CLI policy in `AGENTS.md`.
- Manual: not applicable.
- Platforms: Linux, macOS, and Windows (PowerShell and Git Bash); the junction variant avoids the Windows symlink privilege, the symlink variant is skipped with an explicit reason when the runner cannot create links.
- Environment dependency: none beyond optional link privileges for the symlink variant.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`, `npm run package:smoke`.
- Expected evidence: new failing-then-passing tests, plan/snapshot identity assertion, a green junction E2E, and coverage at or above the 80% thresholds.

## Affected files

- Modify: `src/infrastructure/harnesses/common/path-helpers.ts` (or a new `change-target.ts` in the same folder) and the eight `src/infrastructure/harnesses/*/planner.ts`; `tests/integration/change-applier.test.ts` if shared assertions are extended.
- Create: `tests/unit/change-target.test.ts`, `tests/integration/symlinked-harness-config.test.ts`, `tests/e2e/e2e-symlinked-harness-config.test.ts`, and fixtures under `tests/fixtures/harnesses/<harness>/`.

## Observability and recovery

- Operational signal: plan `realPath` equals the snapshot `realPath`; `FILE_CHANGED_SINCE_PREVIEW` appears only for real concurrent changes.
- Recovery: changes are planned before writing and applied per-file atomically; a rejected file is left untouched and the link target is never replaced.

## Handoff

- Produced result:
  Implemented `resolveChangeTarget` in `src/infrastructure/harnesses/common/change-target.ts` to canonicalize existing files via `realpath` and missing files by resolving the nearest existing ancestor directory and appending missing segments with repository confinement. Integrated `resolveChangeTarget` into all eight harness install and remove planners (`claude-code`, `codex-cli`, `cursor`, `github-copilot-cli`, `opencode`, `pi`, `oh-my-pi`, `antigravity-cli`) for both configuration files and runtime assets. Added comprehensive unit tests in `tests/unit/change-target.test.ts`, integration tests in `tests/integration/symlinked-harness-config.test.ts`, and E2E regression tests in `tests/e2e/e2e-symlinked-harness-config.test.ts`. Verified that on junctioned/symlinked harness configurations, `init --yes` exits 0, registers integrations, preserves user settings and symbolic links, second runs are byte-identical no-ops, and genuine concurrent modifications still trigger `FILE_CHANGED_SINCE_PREVIEW` (exit 2).
- Changed files:
  - Created:
    - `src/infrastructure/harnesses/common/change-target.ts`
    - `tests/unit/change-target.test.ts`
    - `tests/integration/symlinked-harness-config.test.ts`
    - `tests/e2e/e2e-symlinked-harness-config.test.ts`
  - Modified:
    - `src/infrastructure/harnesses/claude-code/planner.ts`
    - `src/infrastructure/harnesses/codex-cli/planner.ts`
    - `src/infrastructure/harnesses/cursor/planner.ts`
    - `src/infrastructure/harnesses/github-copilot-cli/planner.ts`
    - `src/infrastructure/harnesses/opencode/planner.ts`
    - `src/infrastructure/harnesses/pi/planner.ts`
    - `src/infrastructure/harnesses/oh-my-pi/planner.ts`
    - `src/infrastructure/harnesses/antigravity-cli/planner.ts`
    - `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_02/done/task_10.md`
- Checks and command outputs:
  - `npm run lint`: passed (0 errors, 0 warnings across all files).
  - `npm run typecheck`: passed (0 TypeScript errors).
  - `npm test`: passed (59 test files, 198 tests passed).
  - `npm run coverage`: passed (all thresholds >= 80%: 91.24% lines, 91.24% statements, 96.18% functions, 81.65% branches; `change-target.ts` at 94.59% lines).
  - `npm run build`: passed (schemas generated, runtime assets built, TypeScript compiled).
  - `npm run package:smoke`: passed (187 packaged files, schemas/assets/bin verified, CLI smoke execution passed).
  - `npm run schemas:check`: passed.
  - `npm run dependencies:check`: passed (3 runtime dependencies, no install scripts).
- Validated state:
  - Worktree on Windows 11 (win32), Node.js v24.19.0, npm 11.17.0.
  - CR-01 repro resolved: junction fixture `.claude` -> `.agents` installs successfully (exit 0) and stays idempotent.
  - Concurrency safety verified: genuine modifications between plan and apply reject with `FILE_CHANGED_SINCE_PREVIEW` and exit 2.
- Open items:
  - None.
