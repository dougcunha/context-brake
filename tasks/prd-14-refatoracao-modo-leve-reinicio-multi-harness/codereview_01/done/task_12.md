# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T12 — `init --no-auto-restart` names the kept handoffs in both modes

## Outcome

`init --no-auto-restart` reports `AUTO_RESTART_HANDOFF_KEPT` with the handoff paths in the dry run as well as when applied, as `remove` does.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `src/cli/commands/init.ts` dry-run branch; `tests/integration/init-auto-restart.test.ts`.
- Out of scope: `remove` (already conformant).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-04 | `codereview.md#findings` | Dry run omits the kept handoffs; applied path untested (FR-13, DEC-14, TC-14) |

## Requirements

- FR-13: the command output names where the handoffs are kept.
- No finding when there are no handoffs.

## Context to recover on demand

- TechSpec: DEC-14
- Rules and skills: cli-output, file-changes, tests
- Code: `src/cli/commands/init.ts`, `src/cli/commands/remove.ts`, `src/cli/handoff-findings.ts:keptHandoffFindings`

## Work

- [x] T12.1 Add the kept-handoff findings to the dry-run report when `args.noAutoRestart`.
- [x] T12.2 Extend the `--no-auto-restart` test with a pending handoff and an archive, asserting the finding in dry run and applied.

## Acceptance criteria

- Both modes report `Session handoffs were kept: .context-brake/handoff.md, .context-brake/handoffs/.`
- The handoffs stay on disk after the applied run.

## Verification

- Unit: not applicable
- Integration: `tests/integration/init-auto-restart.test.ts`
- End-to-end: not applicable
- Manual: none
- Platforms: Windows locally; Linux and macOS in CI
- Environment dependency: none
- Commands: `npx vitest run tests/integration/init-auto-restart.test.ts`, `npm run lint`, `npm run typecheck`
- Expected evidence: the new assertions pass

## Affected files

- Modify: `src/cli/commands/init.ts`, `tests/integration/init-auto-restart.test.ts`

## Observability and recovery

- Operational signal: `AUTO_RESTART_HANDOFF_KEPT` finding
- Recovery: revert the branch change

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `init --no-auto-restart` computes the kept-handoff findings before the dry-run branch and adds them to both the dry-run and applied reports, as `remove` does.
- Changed files: src/cli/commands/init.ts; tests/integration/init-auto-restart.test.ts (new describe with a pending handoff and an archive, asserting `AUTO_RESTART_HANDOFF_KEPT` in dry run and applied and the handoff left intact).
- Checks: `npx vitest run tests/integration/init-auto-restart.test.ts` — 5 tests passed; `npm run lint` and `npm run typecheck` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T11; Windows 11, Node 24.
- Open items: none. Resolves the `init --no-auto-restart --dry-run` gap noted in done/task_09.md.
