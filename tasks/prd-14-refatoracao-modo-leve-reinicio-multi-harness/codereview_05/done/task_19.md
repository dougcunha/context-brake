# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_05/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T19 — A committed handoff claim is never answered neutral by the session-start deadline

## Outcome

Once a session-start claim decides to deliver the handoff, the hook deadline can no longer answer neutral: the host waits for the claim and returns the resume text. If the deadline answered first, the claim delivers nothing and the handoff stays pending. No run ends with the handoff archived and no resume instruction.

## Dependencies and boundaries

- Depends on: T18 (`codereview_04/done/task_18.md`); exception HIL decision on the session-start deadline contract (prd-10 FR-10, DEC-11)
- Unblocks: T20, re-review `codereview_06`
- In scope: an atomic check-and-commit on `HookDeadline` (a synchronous `commit()` that returns `false` when the deadline has already expired and otherwise disables the timer, so the race resolves with the work); a core port replacing the bare `ExpiryCheck` passed to `HandoffStore.claim` (peek and commit); the store's second check becomes the commit, with the restore on `false`; both hosts pass the new port; host-level tests.
- Out of scope: CR-02 (T20); the optional improvements in `codereview_05/codereview.md#findings`; deadlines of events other than `session_reset`; `extendTo` margins, which shrink the window without excluding it.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_05/CR-01 | `codereview.md#findings` | Awaited I/O after the last expiry check (prune, lock release) lets the deadline answer neutral while the claim archives the handoff; reopens codereview_03/CR-01 |

## Requirements

- TechSpec Errors (`techspec.md:98`), FR-02, FR-03: a timed-out session-start claim leaves the handoff pending; a delivered claim reaches the next session as resume text.
- Mutual exclusion: exactly one of {deadline answers neutral, claim commits} wins, decided synchronously, with no `await` between the check and the commit.
- After the commit, the hook may exceed the 5,000 ms session-start deadline (prd-10 FR-10, DEC-11) by the post-commit local I/O only: the archive prune and the lock release. Requires the exception HIL amendment; harness session-start timeouts are 30 s or more (`docs/research/harness-integrations.md`).
- codereview_04/CR-01 stays resolved: a claim that delivers nothing deletes no archived handoff.

## Context to recover on demand

- TechSpec: `techspec.md#errors-security-and-recovery`, Implementation deviations (`techspec.md:230-238`); prd-10 `techspec.md` DEC-11
- Rules and skills: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md` (hosts only)
- Code: `src/infrastructure/runtime/hook-deadline.ts` (`run`, `schedule`, `isExpired`); `src/core/contracts/hook-phase.ts` (`ExpiryCheck`); `src/core/contracts/handoff.ts:12`; `src/core/services/{brake-engine,session-reset-handler}.ts`; `src/infrastructure/runtime/{in-process-host,process-hook-host}.ts`; `src/infrastructure/storage/node-handoff-store.ts`

## Work

- [x] T19.1 Add `commit(): boolean` to `HookDeadline`: returns `false` when already expired; otherwise marks the deadline committed and clears the timer; the timer callback does nothing once committed. Unit-test both orders with fake timers.
- [x] T19.2 Replace the `ExpiryCheck` parameter of `HandoffStore.claim` with a named core port (peek and commit), threaded through `RuntimeInput` and `ResetHooks`; both hosts pass the deadline's methods.
- [x] T19.3 In `NodeHandoffStore`, keep the first peek before the move; replace the second check with `commit()`, restoring and returning `null` when it returns `false`. Adapt the expiry tests to the port without weakening their assertions.
- [x] T19.4 Add host-level tests (in-process host and `runProcessHook` with a short `sessionStartDeadlineMilliseconds`) whose deadline fires during the prune or the lock release, asserting the handoff is either delivered with resume text or still pending, never archived without an instruction.
- [x] T19.5 Append the DEC-02 (codereview_05 T19) deviation line and the session-start deadline amendment to the TechSpec Implementation deviations.

## Acceptance criteria

- With the deadline firing after the commit, the host returns the resume text naming an existing archived file, and `handoff.md` is gone.
- With the deadline firing before the commit, the host answers neutral, `handoff.md` keeps its content, and the archive is unchanged.
- A sweep of deadlines from 1 to 40 ms over the host leaves no run with the handoff archived and no resume text.
- Existing expiry, lock, deadline, and failure-policy suites pass.

## Verification

- Unit: `tests/unit/hook-deadline.test.ts` (commit before and after expiry, fake timers); `tests/unit/session-reset-handler.test.ts`.
- Integration: `tests/integration/handoff-deadline.test.ts` (host-level cases), `node-handoff-store-expiry.test.ts`, `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts`. The new host cases fail against the T18 code (mutation check).
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI.
- Environment dependency: none.
- Commands: `npx vitest run` over the suites above; `npm run lint`; `npm run typecheck`; at the end of the round, `npm run build` and `npm run coverage`.
- Expected evidence: suites green, mutation failure recorded, coverage result.

## Affected files

- Modify: `src/infrastructure/runtime/hook-deadline.ts`, `src/core/contracts/hook-phase.ts`, `src/core/contracts/handoff.ts`, `src/core/services/brake-engine.ts`, `src/core/services/session-reset-handler.ts`, `src/infrastructure/runtime/in-process-host.ts`, `src/infrastructure/runtime/process-hook-host.ts`, `src/infrastructure/storage/node-handoff-store.ts`
- Modify: `tests/unit/hook-deadline.test.ts`, `tests/integration/handoff-deadline.test.ts`, `tests/integration/node-handoff-store-expiry.test.ts`
- Modify: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` (Implementation deviations only)

## Observability and recovery

- Operational signal: a committed claim produces no `DEADLINE_EXCEEDED` record; an uncommitted expiry records it as today.
- Recovery: reverting restores the T18 behavior.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `HookDeadline.commit()` returns `false` once the deadline has answered and otherwise clears the timer, so `run` resolves with the work. The core port `ClaimDeadline` (`isExpired`, `commit`) in `hook-phase.ts` replaces the bare `ExpiryCheck` in `HandoffStore.claim`, `RuntimeInput` (`deadline`), and `ResetHooks` (`deadline`); both hosts pass their `HookDeadline` as `deadline`. `NodeHandoffStore` peeks before the move and commits after it, restoring and returning `null` when the commit fails; the prune and the lock release run after a successful commit, where no neutral answer is possible.
- Changed files: src/core/contracts/{hook-phase,handoff}.ts; src/core/services/{brake-engine,session-reset-handler}.ts; src/infrastructure/runtime/{hook-deadline,in-process-host,process-hook-host}.ts; src/infrastructure/storage/node-handoff-store.ts; tests/unit/{hook-deadline,session-reset-handler}.test.ts; tests/integration/{handoff-deadline,node-handoff-store-expiry}.test.ts; techspec.md (two deviation lines).
- Checks: new cases: `HookDeadline` commit before and after expiry (unit); deadline elapsing right after the commit, during the prune and lock release, still delivers the resume text (fake `setTimeout`, real filesystem); `runProcessHook` with a 40 ms session-start deadline and a 150 ms `mapInput` leaves `handoff.md` pending. Mutation checks: with the store's commit replaced by `isExpired()`, the commit case fails; with the process host's `deadline` pass-through removed, the process-hook case fails; both restored. Scratch sweep over `createInProcessRuntime` (deadlines 1-40 ms × 8, full archive): 264 delivered with an existing archived path, 56 pending, 0 lost (scratchpad `t19/sweep.mts`). Suites: handoff-deadline, node-handoff-store{,-expiry,-lock}, session-reset-handler, hook-deadline, in-process-host-deadline, process-hook-host-deadline: 8 files, 40 tests green. `npx eslint` over the touched trees and `npm run typecheck` exit 0; blocking quality patterns over the touched source files: no hits.
- Validated state: worktree on a31e183 plus the feature diff and T10-T19; Windows 11, Node 24.
- Open items: the in-process host's pass-through is covered by the typecheck and the scratch sweep, not by a suite case. The session-start deadline amendment (DEC-HIL-05) is listed for HIL 3.
