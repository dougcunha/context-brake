# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T10 — Reconcile the manifest state with the finished tasks

## Outcome

`tasks.md#State` marks T06 and T07 done (T07 with the DEC-MA-02 and DEC-MA-03 waiver), the superseded MA-01 open item in the T07 handoff is marked resolved, and the drift of `tasks.md` from its approved hash is recorded so the next review can attribute it.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `tasks.md#State`, the superseded open item in `done/task_07.md#Handoff`, a recovery record in `workflow.md`, and the `tasks.md` hash in `checkpoint.json#approved_sources`.
- Out of scope: code; task contracts other than state; the T05 capability item (T11).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#Findings` | `tasks.md` marks T06 and T07 pending while both are in `done/`; `done/task_07.md:85` keeps a superseded open item |
| codereview_01 limitation | `codereview.md#Limitations and open items` | `tasks.md` hash differs from the approved hash without attribution |

## Requirements

- `## State`: `[x] T06 — done`; `[x] T07 — done (MA-01 light mode on Windows; full mode, loop guard and POSIX waived by DEC-MA-02 and DEC-MA-03)`.
- `done/task_07.md`: prefix the "Superseded open item" line with `Resolved by DEC-MA-03:` and drop the sentence "The task stays at the root until the maintainer records the result."; keep the rest of the history.
- `workflow.md`: add a recovery record stating that `tasks.md` differs from the DEC-HIL-02 approved version only in `## State` and `## Problems and solutions`; update the `tasks.md` sha256 in `checkpoint.json#approved_sources` and point it at that record.

## Context to recover on demand

- Rules and skills: `sdd-orchestrate-tasks` (manifest owner), `.claude/skills/sdd-orchestrate-flow/references/hil-state.md`.
- Files: `tasks.md#State`, `done/task_07.md#Handoff`, `workflow.md#Human Decisions Log`.

## Work

- [x] T10.1 Update `tasks.md#State` for T06 and T07.
- [x] T10.2 Mark the superseded open item in `done/task_07.md` as resolved.
- [x] T10.3 Record the manifest drift in `workflow.md` and refresh the `tasks.md` entry of `approved_sources`.

## Acceptance criteria

- `tasks.md#State` and `done/` agree for T01 to T07.
- No handoff states that a finished task stays at the root.
- `approved_sources` hash for `tasks.md` matches the file and names the recovery record.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: reread the three files.
- Platforms: any.
- Environment dependency: none.
- Commands: `sha256sum tasks/prd-11-reinicio-automatico-no-claude-code/tasks.md`
- Expected evidence: hash in `checkpoint.json` equals the command output.

## Affected files

- Modify: `tasks/prd-11-reinicio-automatico-no-claude-code/tasks.md`, `done/task_07.md`, `workflow.md`, `checkpoint.json`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: `checkpoint.previous.json` keeps the prior index.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `tasks.md#State` marks T06 and T07 done (T07 with the DEC-MA-02/DEC-MA-03 waiver); `done/task_07.md:85` now reads "Resolved by DEC-MA-03: superseded open item T07.4 …" without the stays-at-root sentence; `workflow.md` record REC-T10 attributes the manifest drift to `## State` and `## Problems and solutions`; `approved_sources` for `tasks.md` carries sha256 `0677629c…` under REC-T10.
- Changed files: `tasks.md`, `done/task_07.md`, `workflow.md`, `checkpoint.json`.
- Checks: `sha256sum tasks.md` equals the `approved_sources` entry; reread State (T01-T07 all `[x]`, matching `done/`); `grep "stays at the root" done/task_07.md` empty.
- Validated state: worktree on `c7529c5` plus the feature diff; no code touched.
- Open items: none.
