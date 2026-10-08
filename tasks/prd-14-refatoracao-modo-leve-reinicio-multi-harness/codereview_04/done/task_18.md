# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_04/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T18 — An undelivered claim leaves the handoff archive untouched

## Outcome

A handoff claim that the session-start deadline skips or undoes deletes no archived handoff: the archive holds the same files before and after, and the handoff stays pending. A delivered claim still leaves exactly the most recent `HANDOFF_ARCHIVE_LIMIT` (10) archived handoffs, and a prune failure still rejects with the handoff pending.

## Dependencies and boundaries

- Depends on: T15 (`codereview_03/done/task_15.md`)
- Unblocks: re-review `codereview_05`
- In scope: the order of steps in `NodeHandoffStore.claim`. Under the claim lock: pending check, expiry check, reserve the name, move, final expiry check (restoring when expired), and only then prune the archive to `HANDOFF_ARCHIVE_LIMIT`. A prune failure after the move restores the handoff and rethrows. Matching expiry tests on a full archive, and the HIL 3 amendment line.
- Out of scope: the optional improvements in `codereview_04/codereview.md#findings`, which are not findings: the copy-then-delete crash window in `restoreHandoff`, a `runProcessHook` pass-through test, the Oh-My-Pi ready-impact assertion, empty `runtime/restart/<harness>/` folders, and the items carried from codereview_03. The residual in-memory window after the last expiry check, disclosed by T15, stays as is.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_04/CR-01 | `codereview.md#findings` | A claim skipped or undone by the session-start deadline prunes the archive first and deletes the oldest archived handoff (FR-03, `techspec.md:82`, T15) |

## Requirements

- FR-03: one delivery; the archive keeps the most recent N = 10 handoffs. A claim that delivers nothing changes nothing in the archive.
- TechSpec Contracts and data (`techspec.md:82`): at most 10 archive files, oldest deleted by name order.
- TechSpec Errors (`techspec.md:98`) and T15: a failed or timed-out session-start claim leaves the handoff pending, and a prune failure rejects with `handoff.md` still pending and no `.claim.lock` left behind.
- Every irreversible deletion in the claim runs after the final decision to deliver. A transient eleventh file between the move and the prune is acceptable; no archived handoff is deleted on a path that returns `null`.

## Context to recover on demand

- TechSpec: `techspec.md#contracts-and-data`, `techspec.md#errors`, Implementation deviations (`techspec.md:230-237`)
- Rules and skills: `code-standards.md`, `javascript-typescript.md`, `node.md` (async I/O in process), `tests.md`, `file-changes.md`
- Code: `src/infrastructure/storage/node-handoff-store.ts` (`claim`, `claimLocked`, `restoreHandoff`, `pruneArchive`); `src/infrastructure/storage/handoff-claim-lock.ts` (lock unchanged)
- Tests: `tests/integration/node-handoff-store-expiry.test.ts` (expiry and prune-failure cases, `expiresAfter` helper); `tests/integration/node-handoff-store.test.ts:44` (happy path on a full archive already asserted)

## Work

- [x] T18.1 Reorder `NodeHandoffStore.claim` so the final expiry check and the restore run inside the lock, and the prune runs last with `HANDOFF_ARCHIVE_LIMIT`. Keep exactly two expiry checks (before the move and after it), so `expiresAfter(1)` still means "expired during the move".
- [x] T18.2 On a prune failure after the move, restore the handoff with the existing `restoreHandoff` and rethrow, with the lock released.
- [x] T18.3 Add full-archive expiry cases to `node-handoff-store-expiry.test.ts`: `claim(() => true)` and `claim(expiresAfter(1))` each return `null`, leave `handoff.md` intact, and leave the same 10 archive files. Update the prune-failure case to also assert the archive files are unchanged, and retitle it if "before the move" no longer describes the mechanism.
- [x] T18.4 Append a DEC-02 (codereview_04 T18) line to the Implementation deviations list in `techspec.md`, stating that the prune now runs after the move and the final expiry check, which supersedes "prunes the archive before the move" in the T15 line.

## Acceptance criteria

- With 10 archived handoffs and a pending handoff, `claim(() => true)` and `claim(expiresAfter(1))` return `null`; `handoff.md` keeps its content; the archive lists the same 10 files.
- With 10 archived handoffs, a delivered claim leaves exactly 10: the oldest is gone and the new one is present (`node-handoff-store.test.ts:44`, unchanged).
- A prune failure rejects; `handoff.md` keeps its content; no `.claim.lock` remains; the archive gained no file.
- The existing expiry, newer-handoff-at-restore, lock, and deadline cases pass unchanged.

## Verification

- Unit: not applicable (the store is covered by integration suites on a temporary directory).
- Integration: `tests/integration/node-handoff-store-expiry.test.ts`, `node-handoff-store.test.ts`, `node-handoff-store-lock.test.ts`, `handoff-deadline.test.ts`; `tests/unit/session-reset-handler.test.ts`. Each new full-archive case fails against the current order (mutation check), then passes.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI (NFR-02, `node:fs/promises` only).
- Environment dependency: none.
- Commands: `npx vitest run tests/integration/node-handoff-store-expiry.test.ts tests/integration/node-handoff-store.test.ts tests/integration/node-handoff-store-lock.test.ts tests/integration/handoff-deadline.test.ts tests/unit/session-reset-handler.test.ts`; `npm run lint`; `npm run typecheck`; at the end of the round, `npm run coverage` on an idle machine (O-08).
- Expected evidence: the listed suites green, the mutation failure recorded in the handoff, lint and typecheck exit 0, and the coverage result.

## Affected files

- Modify: `src/infrastructure/storage/node-handoff-store.ts`
- Modify: `tests/integration/node-handoff-store-expiry.test.ts`
- Modify: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` (Implementation deviations only)

## Observability and recovery

- Operational signal: none new. A prune failure still surfaces as the claim's rejection, which the hosts already handle.
- Recovery: reverting the change restores the T15 order; the archive format is unchanged.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `NodeHandoffStore.claim` now runs every step under the claim lock in this order: pending check plus first expiry check, reserve the name, move, second expiry check (restore and return `null` when expired), then `pruneArchive(archive, HANDOFF_ARCHIVE_LIMIT)`. A prune failure goes through `pruneOrRestore`, which restores the handoff with the existing `restoreHandoff` and rethrows; the lock is released by the existing `finally`. A delivered claim leaves a transient eleventh file only between the move and the prune. Exactly two expiry checks remain, so `expiresAfter(1)` still means "expired during the move".
- Changed files: src/infrastructure/storage/node-handoff-store.ts (94 lines); tests/integration/node-handoff-store-expiry.test.ts (new full-archive cases `() => true` and `expiresAfter(1)`; the prune-failure case retitled and now asserts the archive is unchanged); tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md (DEC-02 codereview_04 T18 deviation line).
- Checks: mutation check: against the T15 order, both full-archive expiry cases failed (archive 10 → 9) and the other four passed. After the change: `npx vitest run` over node-handoff-store-expiry, node-handoff-store, node-handoff-store-lock, handoff-deadline (integration), and session-reset-handler (unit): 5 files, 24 tests green. The existing full-archive happy path (`node-handoff-store.test.ts:44`) passes unchanged. `npx eslint` over the two code files and `npm run typecheck` exit 0. Blocking quality-profile patterns (QA-01..QA-04, QA-06, QA-07) over the touched files: no hits besides the pre-existing `writeFileSync` in the test's concurrent-writer callback.
- Validated state: worktree on a31e183 plus the feature diff and T10-T18; Windows 11, Node 24.
- Open items: none for CR-01. `restoreHandoff` still copies and then deletes (optional improvement in codereview_04, out of scope). The residual in-memory window after the last expiry check, disclosed by T15, is unchanged.
