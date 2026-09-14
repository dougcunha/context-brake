# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_05/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T21 — Correct the last false self-location in the T06 handoff

## Outcome

The changed-files evidence in `done/task_6.md` names its own file at the path where it actually exists, so every recorded task location in the feature resolves.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T16
- In scope: the single stale string at `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md:98`; the feature-wide link resolver and stale-path scan afterward.
- Out of scope: any other wording in `done/task_6.md`, task state markers, requirements, every `codereview.md`, and implementation files.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_05/CR-05 | `codereview.md#findings` | `done/task_6.md:98` records `tasks/prd-01-instalacao-deteccao-diagnostico/task_6.md`, a path that does not exist; T15 fixed the eleven references enumerated by `codereview_04/CR-05` and left this one as an open item. |

## Requirements

- Replace only `tasks/prd-01-instalacao-deteccao-diagnostico/task_6.md` on line 98 with `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md`.
- Keep the line position, list formatting, and every other byte of the file unchanged.
- All five `codereview.md` files keep identical SHA-256 hashes.

## Context to recover on demand

- TechSpec: not applicable.
- Rules and skills: `AGENTS.md`, `sdd-execute-corrections`, `sdd-review-code` location integrity rule.
- Code: `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md:98` — stale entry; `codereview_04/done/task_15.md:90` — T15 open item that recorded it.

## Work

- [x] T21.1 Record SHA-256 hashes of `codereview_01`–`codereview_05/codereview.md`.
- [x] T21.2 Replace the stale path on line 98 with the existing `done/` path.
- [x] T21.3 Run the feature-wide local Markdown link resolver and the stale self-location scan (`tasks/prd-01-instalacao-deteccao-diagnostico/task_` or `codereview_NN/task_` without `done/` for archived tasks); confirm the report hashes are unchanged.

## Acceptance criteria

- `done/task_6.md:98` names `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md`, and that file exists.
- The stale self-location scan returns zero hits for archived tasks; the pending `codereview_04/task_16.md` location remains valid.
- The diff is one single-line replacement, and all five report hashes are unchanged.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: link resolver, stale-path scan, and hash comparison; owner: executor.
- Platforms: platform-independent repository-relative path validation.
- Environment dependency: none.
- Commands: the feature-wide local Markdown link resolver and stale-path scan; `npm test` is not required because no executable file changes.
- Expected evidence: zero broken local links, zero stale archived self-locations, and identical report hashes.

## Affected files

- Modify: `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md`
- Create: —

## Observability and recovery

- Operational signal: the recorded T06 location opens the archived handoff.
- Recovery: revert the single-line edit.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. Line 98 of `done/task_6.md` now reads `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md`. It is a single-line replacement; no other byte of the file changed.
- Changed files: `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md`.
- Checks:
  - `git diff --numstat` for the file: 1 insertion, 1 deletion; the diff touches only line 98; the named file exists.
  - Feature-wide local Markdown link resolver: 30 Markdown files, 21 local links, 0 broken.
  - Stale self-location scan: no recorded task location without `done/` remains for an archived task. The three remaining textual matches quote the old string rather than claim a location: `codereview_04/done/task_15.md:90` (T15 open item), `codereview_05/codereview.md:206` (CR-05 evidence), and this task's Traceability and Requirements.
  - SHA-256 of every review report, before and after, identical: `codereview_01` b87794d7…, `codereview_02` bd735113…, `codereview_03` 57a2f35f…, `codereview_04` dc94048e…, `codereview_05` 2e2b65e4….
  - `npm test` was not required because no executable file changed.
- Validated state: uncommitted worktree on top of commit `8401e7f`; Windows 11 with Git Bash path checks; platform-independent repository-relative validation.
- Open items: none.
