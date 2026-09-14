# T13 — Reconcile the completed T11 ledger and link prior correction tasks

## Outcome

The feature ledger presents one consistent, navigable account of T07–T11: T11's verified work items agree with its completion handoff and `done/` location, and the existing feature task manifest links each prior correction task to its source finding and state without altering historical review reports.

## Dependencies and boundaries

- Depends on: —
- Unblocks: `codereview_04/CR-03`, T16.
- In scope: independently verifying T11.1–T11.5, reconciling their checkboxes, and adding an additive correction-lineage section to the existing feature `tasks.md` for T07–T11.
- Out of scope: creating a new correction manifest, moving task files, rewriting handoff claims, modifying any `codereview.md`, changing implementation, or marking work complete without evidence.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_04/CR-03` | `codereview.md#findings` | `codereview_03/done/task_11.md` has five unchecked work items despite a completion handoff and `done/` location, while the feature manifest links only T01–T06. |

## Requirements

- Validate each T11 work item against its named source/test surface and the completed handoff before changing `[ ]` to `[x]`; if any item cannot be proven, leave it unchecked and record the exact open evidence instead of normalizing appearances.
- Preserve T11's substantive requirements, acceptance criteria, handoff evidence, and location. Only reconcile state markers and any directly associated state text proven stale.
- Extend the existing `tasks.md` additively with T07–T11, using valid relative links to their `done/task_*.md` files, their source review/finding, and their observed state.
- Keep the original T01–T06 entries and all prior `codereview.md` files byte-for-byte unchanged.
- Do not create `codereview_04/tasks.md`, a correction manifest, or another parallel source of task state.

## Context to recover on demand

- TechSpec: task-state and evidence obligations in `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`; T11's specific contract is in its task file.
- Rules and skills: `AGENTS.md`, `sdd-execute-task`, `sdd-review-code` task-state and source-integrity rules.
- Code: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_03/done/task_11.md` — contradictory work ledger/handoff; `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` — existing feature manifest; T07–T10 handoffs — lineage and completion evidence.

## Work

- [x] T13.1 Check T11.1–T11.5 against the named changed files, focused regression tests, and recorded/current gate evidence; record any discrepancy before editing state.
- [x] T13.2 Mark only independently verified T11 work items complete and make its state text internally consistent without changing the completion history.
- [x] T13.3 Add a clearly separated correction-lineage table to the existing feature `tasks.md` linking T07–T11 to their actual `done/` paths, source review/finding, and state.
- [x] T13.4 Resolve every new local Markdown link and run a state scan proving T11 has no handoff/checkbox contradiction.

## Acceptance criteria

- T11.1–T11.5 are checked only where the implementation and tests prove completion; its `done/` location, work ledger, and Handoff no longer contradict one another.
- `tasks.md` retains T01–T06 and contains valid, unique links for T07, T08, T09, T10, and T11 with their source finding and state.
- No prior review report changes, no task moves, and no new manifest/index file are present.
- A reviewer can navigate from the feature manifest to every prior correction handoff without relying on filesystem discovery.

## Verification

- Unit: not applicable; this is artifact-state reconciliation.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: compare T11.1–T11.5 with their named files/tests; scan for unchecked T11 items, duplicate task IDs, and unresolved local Markdown links.
- Platforms: platform-independent Markdown validation.
- Environment dependency: none; all required evidence exists in the worktree and the completed T11 handoff.
- Commands: `npm test` to confirm referenced T11 regression evidence remains green; run the feature's local Markdown link resolver and task-state scan.
- Expected evidence: zero contradictory T11 items, one valid manifest entry per T07–T11, zero broken links introduced, and unchanged hashes for prior review reports.

## Affected files

- Modify: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_03/done/task_11.md`, `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md`.
- Create: —

## Observability and recovery

- Operational signal: the manifest and T11 ledger expose consistent links, source findings, checkboxes, and state to reviewers and correction tooling.
- Recovery: revert only the additive manifest section and checkbox/state edits; implementation and immutable review reports remain untouched.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. Every T11 work item was independently re-verified against the current worktree before any marker changed, and all five are now `[x]`, so the file's ledger, `done/` location, and Handoff agree. A short reconciliation note was added to the Work section recording that T11's original `doctor` exit-0 expectation is intentionally superseded by `codereview_04/CR-02` (T12) while T11.4 and T11.5 stay complete. `tasks.md` gained an additive `## Correction lineage` section listing T07–T11 with valid relative links to their real `done/` paths, their source review/finding, and their state; T01–T06 and every prior `codereview.md` are untouched, and no new manifest or parallel state source was created.
- Verification evidence per item (all read from the current worktree, not from the handoff):
  - T11.1 — `src/cli/main.ts:2,41-42` imports `realpath` and resolves `process.cwd()` through `realpath(process.cwd()).catch(() => process.cwd())` before building the env; `src/cli/composition-root.ts` canonicalizes `env.projectRoot` the same way before dispatch, which is what makes `ChangePlan.projectRoot` canonical.
  - T11.2 — `src/infrastructure/storage/path-boundary.ts` has `findExistingAncestor` plus `resolveCanonicalPath` that canonicalizes the nearest existing ancestor and re-appends the missing segments, and `isWithinRepository` compares canonical root against canonical target in both directions.
  - T11.3 — `planConfigChange` (`installation-builder.ts:26`) and `planManifestChange` (`:51`) take `snapshot.realPath` with a logical fallback; `installation-service.ts:70,79,90` passes `input.allSnapshots` into both planners and `createChangePlan`; `removal-service.ts:34,42,45-49` does the same for config/manifest/protocol deletions; `manifest-store.ts:26-31` `planSave` uses `snapshot?.realPath`. A scan of `src/core/**` found zero imports of `infrastructure/` or `cli/`.
  - T11.4 — `tests/unit/path-boundary.test.ts:26-27` holds the linked-root confinement case ('accepts missing path under linked root and rejects outside paths or links'); `tests/integration/linked-project-root.test.ts` holds the linked-root, symlinked-config, and linked-`.context-brake/` idempotency cases; `tests/e2e/e2e-linked-project-root.test.ts` runs the built CLI `init --yes` twice plus `doctor` and `remove --dry-run` on a junctioned root. All three files exist and all pass in the current suite.
  - T11.5 — the gates are green in this session: `npm run lint`, `npm run typecheck`, `npm test` (62 files, 215 tests), `npm run coverage` (91.34/82.10+ thresholds met), `npm run build`, `npm run schemas:check`, `npm run dependencies:check`, and `npm run package:smoke` all passed.
- Changed files:
  - `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_03/done/task_11.md` (five state markers plus the reconciliation note)
  - `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` (additive `## Correction lineage` section)
- Checks:
  - T11 state scan: 0 unchecked items remain, 5 checked; no contradiction with the completion Handoff or the `done/` location.
  - `tasks.md` link resolver: 11 local links (the 6 original T01–T06 entries plus the 5 new lineage rows), 0 broken.
  - Lineage scan: exactly 5 rows with IDs T07, T08, T09, T10, T11 and no duplicate task IDs.
  - `tasks.md` T01–T06: all six original entry lines still present byte-for-byte.
  - SHA-256 of all four `codereview.md` files re-checked and identical to their pre-correction values (b87794d7…01, bd735113…02, 57a2f35f…03, dc94048e…04) — no prior report was modified.
  - `npm test` — passed: 62 files, 215 tests, so the T11 regression evidence referenced by the ledger is green.
- Validated state: worktree state (the repository still has zero commits and no `HEAD`); Node v24.19.0, Windows 11. Artifact-state reconciliation only — no implementation, configuration, or platform behavior was touched, so platform coverage is not a factor for this task.
- Open items: none for T13. Two carried-forward observations for the reviewer/HIL, both intentionally out of this task's scope: T11's historical Handoff still describes `doctor` as healthy/exit 0 because it is immutable completion history from before T12, and `tasks.md` now points at `codereview_04/` for the pending T12–T16 round without listing them individually.

