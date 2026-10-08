# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T16 — `init --no-auto-restart` deletes the restart logs

## Outcome

`init --no-auto-restart` plans and applies the deletion of `.context-brake/runtime/restart/**` as `remove` does, and the dry run lists it.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `init.ts` loads the restart log snapshots when `--no-auto-restart` is given; `planRestartExtras` plans their deletion when restart is not wanted.
- Out of scope: other runtime state under `.context-brake/runtime/`; `remove`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/CR-02 | `codereview.md#findings` | `init --no-auto-restart` leaves the restart logs (DEC-14, T09) |

## Requirements

- DEC-14: `remove` and `--no-auto-restart` delete the restart logs under `runtime/` and keep the handoffs.
- Only files under `.context-brake/runtime/restart/` are deleted; other runtime state stays.

## Context to recover on demand

- TechSpec: DEC-14
- Rules and skills: file-changes, cli-output, tests
- Code: `src/cli/commands/init.ts`, `src/cli/commands/remove.ts:loadRuntimeStateSnapshots`, `src/core/services/restart-install-extras.ts`, `src/core/services/removal-helper.ts:planRuntimeStateDeletions`

## Work

- [x] T16.1 Load restart log snapshots in `init` under `--no-auto-restart` and add their deletions in the restart extras.
- [x] T16.2 Extend `tests/integration/init-auto-restart.test.ts`: a Pi restart log and another runtime file; the log is deleted, the other file stays, and the dry run lists the deletion.

## Acceptance criteria

- After `init --no-auto-restart`, no file remains under `.context-brake/runtime/restart/`; other runtime files are unchanged.

## Verification

- Unit: see Work
- Integration: `tests/integration/init-auto-restart.test.ts`
- End-to-end: not applicable
- Manual: none
- Platforms: Windows locally; Linux and macOS in CI
- Environment dependency: none
- Commands: `npx vitest run tests/integration/init-auto-restart.test.ts`, `npm run lint`, `npm run typecheck`
- Expected evidence: the named suites green

## Affected files

- Modify: `src/cli/commands/init.ts`, `src/core/services/installation-service.ts`, `src/core/services/restart-install-extras.ts`, `tests/integration/init-auto-restart.test.ts`

## Observability and recovery

- Operational signal: delete changes in the init report
- Recovery: restart logs are recreated by the next session with restart on

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `init --no-auto-restart` snapshots the files under `.context-brake/runtime/restart/` (`collectRestartLogSnapshots` in `src/cli/snapshot-helper.ts`). When restart is not wanted, `planRestartExtras` plans their deletion through `planRuntimeStateDeletions`, so the dry run lists the deletions and the applied run removes the logs. Other runtime state is untouched.
- Changed files: src/cli/snapshot-helper.ts; src/cli/commands/init.ts; src/core/services/installation-service.ts; src/core/services/restart-install-extras.ts; tests/integration/init-auto-restart.test.ts.
- Checks: a new case asserts the dry-run delete of `.context-brake/runtime/restart/pi/s1.json`, its removal when applied, and `runtime/keep.json` intact. Every suite that exercises `--no-auto-restart` passed (6 files, 37 tests). `npx eslint .` and `npm run typecheck` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T15; Windows 11, Node 24.
- Open items: empty `runtime/restart/<harness>/` folders can remain after the applied run, because `init` applies without `pruneRuntime`.
