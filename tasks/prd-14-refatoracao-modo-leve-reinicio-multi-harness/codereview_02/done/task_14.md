# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_02/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T14 — One handoff claim at a time, on every platform

## Outcome

Concurrent `NodeHandoffStore.claim()` calls deliver the handoff to exactly one claimer on Windows, Linux, and macOS, and every returned path names an existing archived file.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `src/infrastructure/storage/node-handoff-store.ts` (claim serialization with an exclusive lock file and a stale-lock limit); `tests/integration/node-handoff-store.test.ts` (repeated concurrency variant, stale-lock recovery).
- Out of scope: the `HandoffStore` port shape; delivery callers; archive naming.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_02/CR-01 | `codereview.md#findings` | Two concurrent claims both return a path on Windows, one naming a missing file (FR-03, TC-03, DEC-02, NFR-02; T03 incomplete) |

## Requirements

- FR-03: a handoff is delivered to one new session only.
- The claim holds an exclusive lock (`open(…, 'wx')`) in the archive folder around the existence check, reservation, and rename; a claimer that finds the lock held returns `null`.
- A lock older than a named limit is treated as left by a crashed claimer: it is removed and the claim proceeds, so delivery never blocks forever.
- The lock is removed after every claim, success or failure, and is never counted as an archived handoff.

## Context to recover on demand

- TechSpec: DEC-02
- Rules and skills: code-standards, node, file-changes, tests
- Code: `src/infrastructure/storage/node-handoff-store.ts`; `tests/integration/node-handoff-store.test.ts`

## Work

- [x] T14.1 Wrap the claim in an exclusive lock file with a stale-lock limit.
- [x] T14.2 Add a repeated variant (many concurrent pairs in one run) asserting exactly one delivery and an existing archived file per pair.
- [x] T14.3 Add a stale-lock case: an old lock does not block the claim; a fresh lock makes the claim return `null`.

## Acceptance criteria

- The repeated variant passes on Windows across repeated runs of the suite.
- Existing store cases keep their results; no lock file remains after a claim.

## Verification

- Unit: not applicable
- Integration: `tests/integration/node-handoff-store.test.ts`, plus `tests/unit/session-reset-handler.test.ts` and `tests/integration/semi-auto-restart.test.ts` for delivery callers
- End-to-end: not applicable
- Manual: none
- Platforms: Windows locally; Linux and macOS in CI
- Environment dependency: none
- Commands: `npx vitest run tests/integration/node-handoff-store.test.ts` (repeated), `npm run lint`, `npm run typecheck`
- Expected evidence: green repeated runs

## Affected files

- Modify: `src/infrastructure/storage/node-handoff-store.ts`, `tests/integration/node-handoff-store.test.ts`

## Observability and recovery

- Operational signal: none beyond the delivered resume text
- Recovery: a leftover lock expires after the stale limit

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `NodeHandoffStore.claim()` takes an exclusive lock (`handoffs/.claim.lock`, `open(…, 'wx')`) before re-checking the handoff, reserving the archive name, renaming, and pruning; a claimer that finds a fresh lock returns `null`; a lock older than `STALE_CLAIM_LOCK_MS` (30 s, measured with the injected clock) is removed and taken over; the lock is removed in `finally`. The archive prune still counts only `.md` files.
- Changed files: src/infrastructure/storage/node-handoff-store.ts; tests/integration/node-handoff-store-lock.test.ts (new: 100 sequential concurrent claim pairs asserting one delivery and an existing archived file each, fresh lock → `null`, stale lock taken over). The existing TC-03 case in tests/integration/node-handoff-store.test.ts is unchanged.
- Checks: stress run in a scratch test (removed afterward): without the lock, 10 and 13 of 200 sequential pairs delivered twice; with the lock, 0 of 400. The new repeated case fails 3 of 3 runs with the lock disabled and passes 3 of 3 with it (~0.8 s). `npx eslint .` and `npm run typecheck` exit 0; delivery callers (`session-reset-handler`, `semi-auto-restart`, `omp-session-switch`, `doctor-remove-restart`) 21 tests green; `npm run coverage` 215 files / 1152 tests green, 94.04% lines, 83.0 s with the CPU at about 39%.
- Validated state: worktree on a31e183 plus the feature diff and T10-T13; Windows 11, Node 24.
- Open items: two claimers that both find the same stale lock at the same instant could both take it over; this needs a crashed claim plus a simultaneous double session start, and is accepted as residual risk. Linux and macOS rely on CI.
