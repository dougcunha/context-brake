# T15 — Repair broken TechSpec links and stale task-location evidence

## Outcome

All local links and task locations identified by CR-05 resolve to the existing PRD-01 artifacts, while historical reports and substantive handoff evidence remain unchanged.

## Dependencies and boundaries

- Depends on: —
- Unblocks: `codereview_04/CR-05`, T16.
- In scope: the six broken `techspec.md` links and five stale self-location entries enumerated by CR-05; local link/path validation after the edits.
- Out of scope: editing any `codereview.md`, changing task requirements or completion claims, moving files, repairing unreported prose, or creating a new manifest.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_04/CR-05` | `codereview.md#findings` | Six original handoff links resolve to missing `done/techspec.md`, and five recorded task locations omit their actual `done/` segment. |

## Requirements

- In `done/task_1.md` through `done/task_6.md`, change only each linked `./techspec.md` target to `../techspec.md`; preserve the link label and surrounding guidance.
- Update the stale self-location evidence in `done/task_2.md`, `done/task_3.md`, `done/task_4.md`, and `done/task_5.md` to their actual `done/task_N.md` paths.
- Update `codereview_02/done/task_10.md` to its actual `codereview_02/done/task_10.md` path.
- Resolve links relative to the containing Markdown file, not the repository root.
- Preserve prior review reports byte-for-byte and avoid changing unrelated historical wording.

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — target of the repaired links.
- Rules and skills: `AGENTS.md`, `sdd-execute-task`, `sdd-review-code` source/link integrity rule.
- Code: `done/task_1.md:49`, `task_2.md:48,112`, `task_3.md:54,143`, `task_4.md:51,140`, `task_5.md:57,176`, `task_6.md:47`, and `codereview_02/done/task_10.md:91` — exact CR-05 evidence.

## Work

- [x] T15.1 Repair the six relative TechSpec link targets without altering link text or surrounding task content.
- [x] T15.2 Replace the five stale self-location strings with the actual current paths under `done/`.
- [x] T15.3 Run the local Markdown link resolver across the whole feature and an exact stale-path scan; inspect the diff to prove only the eleven reported references changed.
- [x] T15.4 Compare hashes for all `codereview.md` files before and after the correction and record the result.

## Acceptance criteria

- All six repaired TechSpec links resolve to the existing feature `techspec.md` from their containing files.
- The five corrected self-location entries name files that exist at those exact paths.
- The feature-wide local Markdown link resolver reports zero broken local targets attributable to CR-05, and the old eleven target strings are absent at the cited locations.
- No report, task state marker, requirement, implementation file, or substantive handoff claim changes.

## Verification

- Unit: not applicable; this is documentation integrity work.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: run the feature-wide local Markdown link resolver, verify the five literal paths exist, and inspect the focused diff.
- Platforms: platform-independent path validation using repository-relative `/` separators.
- Environment dependency: none.
- Commands: local link/path scans; `npm test` is optional because no executable source or test behavior changes.
- Expected evidence: eleven focused reference edits, zero broken targets for CR-05, and unchanged hashes for every review report.

## Affected files

- Modify: `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_1.md`, `done/task_2.md`, `done/task_3.md`, `done/task_4.md`, `done/task_5.md`, `done/task_6.md`, `codereview_02/done/task_10.md`.
- Create: —

## Observability and recovery

- Operational signal: Markdown navigation opens the authoritative TechSpec and every recorded self-location exists.
- Recovery: revert the eleven reference-only edits; no runtime state or user file is involved.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. Eleven reference-only edits, no other content changed. The six TechSpec link targets in `done/task_1.md` (line 49), `done/task_2.md` (48), `done/task_3.md` (54), `done/task_4.md` (51), `done/task_5.md` (57), and `done/task_6.md` (47) now read `../techspec.md` instead of `./techspec.md`, which resolves from their containing file to the existing feature TechSpec; link label, surrounding guidance, and line positions are unchanged. The five stale self-location entries now name their real paths: `done/task_2.md:112`, `done/task_3.md:143`, `done/task_4.md:140`, `done/task_5.md:176` (each gained the `done/` segment) and `codereview_02/done/task_10.md:91` (gained `done/`). Links were resolved relative to the containing Markdown file with repository-relative `/` separators, so the already-correct `.../techspec.md` code spans elsewhere in those files were left untouched.
- Changed files:
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_1.md`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_2.md`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_3.md`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_4.md`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_5.md`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_02/done/task_10.md`
- Checks:
  - Feature-wide local Markdown link resolver over all 23 Markdown artifacts under `tasks/prd-01-instalacao-deteccao-diagnostico/` (external `http(s)`/`mailto`/anchor targets skipped): **0 broken local link targets**, down from the six `done/techspec.md` misses CR-05 reported.
  - Exact string scan at the cited locations: the old relative TechSpec target appears 0 times and the `../techspec.md` target appears once in each of the six task files; the five old self-location strings are absent (count 0) while each corrected form appears exactly once. An earlier apparent match on the old target was a false positive — `../techspec.md` contains that substring — so the check now matches the literal Markdown link target.
  - Existence check: all five recorded self-location paths (`done/task_2.md`, `done/task_3.md`, `done/task_4.md`, `done/task_5.md`, `codereview_02/done/task_10.md`) exist at exactly those paths; all six repaired links resolve.
  - Diff scope: eleven single-line replacements, so no line was added or removed and no task state marker, requirement, implementation file, or substantive handoff claim changed.
  - SHA-256 before and after are identical for every review report: `codereview_01/codereview.md` b87794d7e697df8de2ac2f0634c461a6d8750f67b99071b3e5917f29ae0466f6, `codereview_02/codereview.md` bd73511334e8adda098040cd6d7ef81570cb79d012fbfd713d842171f912773b, `codereview_03/codereview.md` 57a2f35fe1ac8644e32b78e83432318cb856efb9700e631d51af38fe80f01f75, `codereview_04/codereview.md` dc94048e236e74426367dccd3780f097cea6605fed6b3dfe7c787baf9d96404b.
  - `npm test` was not run: no executable source or test behavior changed by this task.
- Validated state: worktree state (the repository still has zero commits and no `HEAD`); Node v24.19.0, Windows 11. Platform-independent — the checks are repository-relative path validations with `/` separators.
- Open items: one further stale self-location string exists that CR-05 did not report — `done/task_6.md:98` reads `tasks/prd-01-instalacao-deteccao-diagnostico/task_6.md` and omits the `done/` segment. It is deliberately left unchanged because T15's boundaries put unreported prose out of scope and T15.3 requires proving that only the eleven reported references changed; it is recorded here for the reviewer or HIL to decide whether to fold it into a follow-up correction.

