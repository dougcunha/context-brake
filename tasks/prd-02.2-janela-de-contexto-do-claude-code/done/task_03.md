# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md`
2. `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Install and remove the bridge

## Outcome

Every Claude Code install ships `.claude/hooks/context-brake-statusline.mjs`. The two flags behave as follows:

- **`init --statusline-bridge`:** writes `statusLine` into `.claude/settings.local.json` as the DEC-02 pipeline around the previous effective command, and records the previous value in `.context-brake/runtime/claude-statusline.json`.
- **A later `init` without the flag:** keeps the bridge and changes nothing.
- **`init --no-statusline-bridge` or `remove`:** restores the previous local value byte for byte, or removes the key and the file the bridge created.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T04
- In scope:
  - `statusline-state.ts` (DEC-07);
  - `statusline-planner.ts` (DEC-02, DEC-09, DEC-11);
  - `planner.ts` delegation for install and remove, and the bridge asset in the Claude install plan;
  - the flags in `init-arguments.ts` and `HarnessContext.statuslineBridge`, set in `detection-collector.ts` (DEC-08);
  - the snapshot list in `snapshot-helper.ts`.
- Out of scope: doctor warnings and report (T04); README (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Opt-in install in local settings |
| FR-02 | `prd.md#functional-requirements` | Previous command in local, project, user order; `padding` and `refreshInterval` kept |
| FR-08 | `prd.md#functional-requirements` | Restore on removal |
| US-02, US-05 | `prd.md#stories-and-journeys` | Keep and restore the status line |
| NFR-06 | `prd.md#non-functional-requirements` | Paths with spaces, accents, Windows roots |
| DEC-01, DEC-02, DEC-07, DEC-08, DEC-09, DEC-11 | `techspec.md#technical-decisions` | Install decisions |
| CMP-08–CMP-10, CMP-13 | `techspec.md#components-and-flow` | Components |
| TC-10–TC-15 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/file-changes.md` (plan before writing, touch only owned keys, atomic writes, refuse unparseable files), `code-standards.md`, `tests.md` (byte-for-byte preservation on reruns).
- Existing code:
  - `src/infrastructure/harnesses/claude-code/planner.ts:15-98` — current install and remove.
  - `src/infrastructure/storage/json-document-editor.ts:7-45` — in-place set and remove.
  - `src/cli/init-arguments.ts:13-43` and `src/core/services/delegated-snapshot-merge.ts:15-37` — flag pattern and mutual exclusion.
  - `src/core/contracts/adapter.ts:12-17` — `HarnessContext`.
  - `src/cli/detection-collector.ts:32` — context building.
  - `src/cli/snapshot-helper.ts:6-15` — snapshot list.
  - `src/core/contracts/changes.ts:5` — `runtime_state` owner.
- Contract or integration: `techspec.md#contracts-and-data` (local `statusLine`, local state, CLI).
- Harness reference: the Status line section written in T01 (settings shape, shell, Windows paths).

## Work

- [x] T03.1 Create `statusline-state.ts`: strict v1 schema, read (a file that does not parse counts as absent), and serialization.
- [x] T03.2 Create `statusline-planner.ts`:
  - resolve the previous command across the three scopes;
  - build the pipeline or bare command with quoting rules, returning `STATUSLINE_UNSUPPORTED_PATH` for a root containing `"`, `` ` ``, `$`, or `\`;
  - plan the `settings.local.json` update or restore, and the state-file create, update, or delete.
- [x] T03.3 Delegate from `planner.ts`, including the bridge asset in every Claude install; keep `planner.ts` at or under 100 lines.
- [x] T03.4 Add `--statusline-bridge` and `--no-statusline-bridge` with the DEC-08 errors; thread `HarnessContext.statuslineBridge` through `detection-collector.ts` without growing `init.ts`.
- [x] T03.5 Add `.claude/settings.local.json` and `.claude/hooks/context-brake-statusline.mjs` to `STANDARD_HARNESS_PATHS`.
- [x] T03.6 Write TC-10 to TC-15.

## Acceptance criteria

- **Previous command (TC-10).** With a previous command in the local, project, or user scope, the local `statusLine.command` wraps the highest-precedence one and copies `padding` and `refreshInterval`. With none, the command has no `--pipe`.
- **Roots (TC-11).** A root with `"`, `$`, or a backtick yields `STATUSLINE_UNSUPPORTED_PATH` and no write. Spaces, accents, and Windows roots produce a quoted forward-slash path.
- **Idempotency and restore (TC-12).** Two installs and a flagless `init` change nothing. `--no-statusline-bridge` restores a local file with other keys and comments byte for byte.
- **Created file (TC-13).** When the bridge created the local file, `remove` deletes it and the state file.
- **Unparseable settings (TC-14).** Unparseable local or project settings give a conflict and no write. Unparseable user settings give a finding and a normal install.
- **Arguments (TC-15).** Both flags together, or a flag without `claude-code` targeted, give argument errors. `--dry-run` lists both files without writing.

## Verification

- Unit: TC-10 and TC-11 in `tests/unit/statusline-planner.test.ts`; TC-15 in the new `tests/unit/init-arguments.test.ts`.
- Integration: TC-12 to TC-14 in `tests/integration/statusline-install.test.ts`, with temporary repositories and a temporary `userHome`.
- End-to-end: covered by TC-21 in T04.
- Manual: none.
- Platforms: Linux, macOS, Windows (CI), including Windows drive-letter roots.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: test count and exit code; existing Claude install and removal suites (`claude-preservation`, `safe-removal`, `runtime-state-removal`, `e2e-03-04`) stay green; quality profile over the diff.

## Affected files

- Modify:
  - `src/infrastructure/harnesses/claude-code/planner.ts`
  - `src/cli/init-arguments.ts`
  - `src/cli/detection-collector.ts`
  - `src/core/contracts/adapter.ts`
  - `src/cli/snapshot-helper.ts`
- Create:
  - `src/infrastructure/harnesses/claude-code/statusline-state.ts`
  - `src/infrastructure/harnesses/claude-code/statusline-planner.ts`
  - `tests/unit/statusline-planner.test.ts`
  - `tests/unit/init-arguments.test.ts`
  - `tests/integration/statusline-install.test.ts`

## Observability and recovery

- Operational signal: `init` output states whether a previous status line was preserved or none existed.
- Recovery: `init --no-statusline-bridge` or `remove`.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - Every Claude install plans `.claude/hooks/context-brake-statusline.mjs` (DEC-01); `remove` deletes it.
  - `init --statusline-bridge` writes `statusLine` in `.claude/settings.local.json` as the DEC-02 command (pipeline around the previous command, or the bare bridge without one), copying `padding` and `refreshInterval`, and records `.context-brake/runtime/claude-statusline.json` (DEC-07 shape).
  - Previous command (DEC-09): local, project, user (`getUserHome(context.userHome)`, the same fallback other adapters use, because the CLI never sets `userHome`), skipping the bridge's own command (detected by the script path). Unparseable local or project settings give `INVALID_HARNESS_CONFIG` with no status line write; unparseable user settings give the warning `STATUSLINE_USER_SETTINGS_INVALID` and install proceeds.
  - A flagless `init` re-plans only when the state exists and the local `statusLine` is still the bridge (idempotent, refreshes the root); if the user replaced the local status line, nothing is overwritten (T04's `STATUSLINE_BRIDGE_INACTIVE` covers that case).
  - `init --no-statusline-bridge` and `remove` restore `previousLocal` (or remove the key), delete the local file when the bridge created it and it is `{}`, and delete the state. The local value is touched only while it is still the bridge.
  - A root with `"`, `` ` ``, `$`, or `\` (after converting Windows separators) gives `STATUSLINE_UNSUPPORTED_PATH`.
- Decisions taken with the user on 25/09/2026 (recorded in `tasks.md` Problems and solutions):
  - The state file is planned with owner `harness_entry`, not DEC-07's `runtime_state`: a `runtime_state` change makes `NodeChangeApplier` infer `removeState` (`init.ts` builds it without options) and the pruner reports `.context-brake/runtime` as not empty, so restore and `remove` would exit 1.
  - `AdapterPlan` gains optional `findings`, collected by `installation-service.ts` (now 100 lines) for the user-settings warning.
- Changed files:
  - Created: `src/infrastructure/harnesses/claude-code/statusline-state.ts` (CMP-09), `statusline-settings.ts` (scope reading, previous resolution, command building), `statusline-planner.ts` (install), `statusline-restore.ts` (restore), `tests/unit/statusline-planner.test.ts` (TC-10, TC-11, state), `tests/unit/init-arguments.test.ts` (TC-15 flags), `tests/integration/statusline-install.test.ts` (TC-12, TC-13, TC-14, TC-15 dry run).
  - Modified: `src/infrastructure/harnesses/claude-code/planner.ts` (delegation; 99 lines after folding the four event calls into `HOOK_EVENTS` and the three conflict returns into `invalidConfigPlan`), `adapter.ts` (passes the context), `src/core/contracts/adapter.ts` (`StatuslineBridgeRequest`, `HarnessContext.statuslineBridge`, `AdapterPlan.findings`), `src/core/services/installation-service.ts`, `src/cli/init-arguments.ts`, `src/cli/detection-collector.ts`, `src/cli/commands/init.ts` (same line count), `src/cli/snapshot-helper.ts` (settings.local.json, bridge script, and state file), `src/infrastructure/harnesses/claude-code/statusline-bridge.ts` (default context built lazily so importing the flag constant does not touch `process.stdin`), `tests/test-lanes.ts`, and `planClaudeInstall` callers in `tests/integration/minified-config.test.ts` and `tests/unit/idempotent-adapter-merge.test.ts`.
- Checks: `npm run build`, `npm run typecheck`, and `npm run lint` exit 0. New suites: `statusline-planner.test.ts` + `init-arguments.test.ts` (26 with the split) and `statusline-install.test.ts` + `statusline-install-invalid.test.ts` (7) pass. Existing Claude install and removal suites pass (`e2e-03-04`, `e2e-user-hook-preservation`, `claude-preservation`, `doctor-manual-removal`, `minified-config`, `runtime-state-removal`, `safe-removal`, `adapter-planners`, `idempotent-adapter-merge`, `removal-conflicts`, `removal-service`, `package-assets`, `doctor-asset-currency`, `init-delegated-snapshot`: 60 tests). Full `npm run coverage -- --coverage.reportOnFailure`: 251 of 253 files, 1,676 passed, all files 95.27% statements / 90.58% branches. Its failures: `symlinked-harness-config` was a real fixture gap (the test's own snapshot list lacked the always-planned bridge asset, giving `SNAPSHOT_MISSING`); I added the path and it passes (6/6 with the next file). `init-legacy-turn-limits` failed under load for the second time in this session and passes alone. After that run, only test files changed (the split below and the symlink fixture), each rerun green.
- Quality profile over the task diff: QA-01 to QA-10 no hits. A first QA-10 reservation (`statusline-install.test.ts` at 111 physical lines) was removed by moving shared helpers to `tests/helpers/statusline-world.ts` and TC-14 to `tests/integration/statusline-install-invalid.test.ts` (both registered in the process lane).
- Validated state: HEAD 5917593 plus the T01–T03 working-tree diff; Windows 11, Node 20+, Git Bash.
- Open items:
  - DEC-02 edge: a previous command ending in a shell comment (`cmd # note`) would comment out the closing `)` of `( <previous> )`. The TechSpec fixes that exact format; recorded for review.
  - `init` only rejects the flags when `--harness`/`--exclude-harness` exclude `claude-code`; when Claude Code is simply not detected, the flag has no effect.

### ADR candidates

None - direct TechSpec implementation or local decision.
