# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_05/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T20 — The archive prune never deletes the handoff the claim just archived

## Outcome

A delivered claim keeps the handoff it just archived regardless of the clock: the prune deletes only the oldest of the other archived names, down to nine, so the archive holds ten files including the new one, and the returned path exists.

## Dependencies and boundaries

- Depends on: T19 (same file, `node-handoff-store.ts`)
- Unblocks: re-review `codereview_06`
- In scope: `pruneArchive` excluding the reserved name; a test with a clock earlier than a full archive.
- Out of scope: the optional improvements in `codereview_05/codereview.md#findings` (eleven files after a restore that meets a newer handoff).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_05/CR-02 | `codereview.md#findings` | With the clock behind the archive names, the prune after the move deletes the just-archived handoff and the claim returns a missing path |

## Requirements

- FR-03: the archive keeps the most recent N = 10 handoffs, and the delivered one is among them.
- FR-02: the resume text names an existing file.
- `file-changes.md`: ContextBrake deletes only what it no longer needs.

## Context to recover on demand

- TechSpec: `techspec.md:82` (archive at most 10 files, oldest by name order)
- Rules and skills: `code-standards.md`, `tests.md`
- Code: `src/infrastructure/storage/node-handoff-store.ts` (`pruneArchive`, `pruneOrRestore`)

## Work

- [x] T20.1 Pass the reserved name to the prune; exclude it from the candidates and keep the most recent `HANDOFF_ARCHIVE_LIMIT - 1` of the others.
- [x] T20.2 Add a case to `node-handoff-store.test.ts`: ten archived names later than the clock, a claim returns a path that exists, and the archive holds ten files including it.

## Acceptance criteria

- With a full archive named after the clock, `claim()` returns `.context-brake/handoffs/<clock stamp>.md`, the file exists with the handoff content, and the archive holds ten files.
- The existing full-archive happy path (`node-handoff-store.test.ts:44`) and the T18/T19 expiry cases pass unchanged.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/node-handoff-store.test.ts`, `node-handoff-store-expiry.test.ts`. The new case fails against the T18 prune (mutation check).
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI.
- Environment dependency: none.
- Commands: `npx vitest run tests/integration/node-handoff-store.test.ts tests/integration/node-handoff-store-expiry.test.ts`; `npm run lint`; `npm run typecheck`.
- Expected evidence: suites green and the mutation failure recorded.

## Affected files

- Modify: `src/infrastructure/storage/node-handoff-store.ts`
- Modify: `tests/integration/node-handoff-store.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: reverting restores the T18 prune.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `pruneArchive(archive, delivered)` excludes the name the claim just archived from the candidates and keeps the most recent `HANDOFF_ARCHIVE_LIMIT - 1` of the others, so a delivered claim always ends with ten files including its own, whatever the clock. `pruneOrRestore` passes `basename(archived)`.
- Changed files: src/infrastructure/storage/node-handoff-store.ts (92 lines); tests/integration/node-handoff-store.test.ts (new clock-behind case; the concurrency case moved to its own `describe` to respect the 30-line function limit).
- Checks: mutation check: against the T18/T19 prune, the new case failed (claim rejected with ENOENT after deleting its own archived file). After the change: node-handoff-store, node-handoff-store-expiry, node-handoff-store-lock, handoff-deadline: 4 files, 18 tests green; `npx eslint` over both files and `npm run typecheck` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T20; Windows 11, Node 24.
- Open items: none for CR-02. The eleven-file case after a restore that meets a newer handoff stays an optional improvement of codereview_05.
