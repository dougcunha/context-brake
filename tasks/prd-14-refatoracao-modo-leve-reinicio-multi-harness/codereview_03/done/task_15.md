# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T15 — A handoff claim never archives a handoff the session did not receive

## Outcome

When the session-start deadline answers first, or when the archive prune fails, the handoff stays pending in `.context-brake/handoff.md` for the next session instead of being archived undelivered.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `HandoffStore.claim` takes an optional expiry check; `NodeHandoffStore` prunes before the move, checks expiry before the move, and moves the handoff back when expiry is seen after it; `HookDeadline` exposes the expiry; both hosts pass it through `RuntimeInput` to the session-reset handler.
- Out of scope: the deadline values; the snapshot-mode deadline answer (`deadlineBootDecision`).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/CR-01 | `codereview.md#findings` | Deadline or prune failure archives the handoff without delivery (FR-03, FR-02, OBJ-04, TechSpec Errors, T03) |

## Requirements

- FR-03: a handoff is delivered to one new session and is never consumed without delivery.
- TechSpec Errors: a failed or timed-out session start leaves the session's inputs intact.
- A prune failure surfaces as an error before the handoff moves.
- Restoring never overwrites a newer `handoff.md`.

## Context to recover on demand

- TechSpec: DEC-02; Errors, security, and recovery
- Rules and skills: code-standards, node, file-changes, tests
- Code: `src/core/services/session-reset-handler.ts`, `src/core/services/brake-engine.ts:RuntimeInput`, `src/infrastructure/runtime/hook-deadline.ts`, `in-process-host.ts`, `process-hook-host.ts`, `src/infrastructure/storage/node-handoff-store.ts`

## Work

- [x] T15.1 Add the expiry check to `HookDeadline`, `RuntimeInput`, and both hosts; pass it from `handleSessionReset` to `claim`.
- [x] T15.2 In the store, prune to one below the limit before reserving, skip the move when expired, and move back (exclusive copy, then delete) when expiry is seen after the move.
- [x] T15.3 Tests: a deadline that fires during the ledger step leaves the handoff pending; expiry after the move restores it; a prune failure rejects with the handoff still pending; the handler passes the check to the store.

## Acceptance criteria

- The handoff stays pending in all three failure cases.
- Existing store, lock, and deadline cases keep their results.

## Verification

- Unit: see Work
- Integration: `tests/integration/node-handoff-store*.test.ts`, a new deadline integration case, `tests/unit/session-reset-handler.test.ts`, `tests/unit/hook-deadline.test.ts`
- End-to-end: not applicable
- Manual: none
- Platforms: Windows locally; Linux and macOS in CI
- Environment dependency: none
- Commands: `npx vitest run <suites>`, `npm run lint`, `npm run typecheck`
- Expected evidence: the named suites green

## Affected files

- Modify: `src/core/contracts/handoff.ts`, `src/core/services/session-reset-handler.ts`, `src/core/services/brake-engine.ts`, `src/infrastructure/runtime/hook-deadline.ts`, `src/infrastructure/runtime/in-process-host.ts`, `src/infrastructure/runtime/process-hook-host.ts`, `src/infrastructure/storage/node-handoff-store.ts`
- Create: a lock helper module if the store passes 100 lines; test files as needed

## Observability and recovery

- Operational signal: the existing `DEADLINE_EXCEEDED` runtime error record
- Recovery: the handoff stays pending for the next session start

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `HookDeadline` exposes `isExpired`; both hosts pass it in `RuntimeInput`; `handleSessionReset` takes `ResetHooks { onPhase, isExpired }` and hands the check to `HandoffStore.claim(isExpired?)`. `NodeHandoffStore.claim` prunes the archive to one below the limit before the move, so a prune failure rejects with the handoff still pending; it skips the move when the deadline already expired; and when expiry is seen after the move, it copies the archived file back with `COPYFILE_EXCL` and deletes the archived copy (a newer `handoff.md` wins and the archived copy stays). The lock helpers moved to `handoff-claim-lock.ts` to keep the store under 100 lines.
- Changed files: src/core/contracts/{hook-phase,handoff}.ts; src/core/services/{session-reset-handler,brake-engine}.ts; src/infrastructure/runtime/{hook-deadline,in-process-host,process-hook-host}.ts; src/infrastructure/storage/node-handoff-store.ts; src/infrastructure/storage/handoff-claim-lock.ts (new); tests/unit/{session-reset-handler,hook-deadline}.test.ts; tests/integration/node-handoff-store-expiry.test.ts (new); tests/integration/handoff-deadline.test.ts (new).
- Checks: a 40 ms deadline with a 150 ms ledger answers through the deadline and leaves `handoff.md` pending; the same test fails when the handler stops passing the check (mutation). Expired-before-move, expired-after-move, newer-handoff-at-restore, and prune-failure cases pass. Store, lock, deadline, handler, semi-automatic, and runtime suites ran twice (76 tests each); `npx eslint .` and `npm run typecheck` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T14; Windows 11, Node 24.
- Open items: a deadline that fires after the last expiry check (between the restore decision and the host's race) is not covered; the window holds only in-memory continuations, with no I/O. The snapshot-mode deadline answer is unchanged.
