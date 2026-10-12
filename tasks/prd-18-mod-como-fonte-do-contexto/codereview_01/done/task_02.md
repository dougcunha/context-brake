# Stable execution context

Load in this exact order:

1. `tasks/prd-18-mod-como-fonte-do-contexto/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T02 — Prove idempotency by plan, and prove the reading file stays out of Git

## Outcome

The tests state what the acceptance criteria say: a second `init` plans no change and a dry run prints the same plan as the run (path, kind, and summary), and a publish by the mod leaves `git status` clean in a project that has the ContextBrake `.gitignore` block.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: —
- In scope: assertions in `init-mod-first.test.ts` and `init-mod-migration.test.ts`; one test of `git status` after a publish.
- Out of scope: production code.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-04 | `codereview.md#findings` | Idempotency and dry-run equality are proven by bytes and path lists only |
| codereview_01/CR-02 | `codereview.md#findings` | The promised `git status` check after a publish is missing |

## Requirements

- FR-04: a second `init` plans no change. FR-06: `--dry-run` prints the same plan as the run.
- TechSpec risk: the reading directory sits under `.context-brake/runtime/`, which the project `.gitignore` block covers.

## Context to recover on demand

- TechSpec: `Risks and open items`, `TC-06`, `TC-08`.
- Rules and skills: `tests.md` (processes only when the behavior depends on one), `ts-tests`.
- Code: `tests/integration/init-mod-first.test.ts`, `init-mod-migration.test.ts`, `tests/helpers/statusline-world.ts` (`InstallReportView.plan.changes`), `tests/helpers/gitignore-world.ts`, `tests/integration/claude-mod-reading.test.ts`.

## Work

- [x] T02.1 In the idempotency test, assert that the plan of the second `init` has no changes (the report's `plan.changes` entries all unchanged or absent, as the existing reports express it).
- [x] T02.2 In the dry-run test, compare path, kind, and summary of every change between the dry run and the run.
- [x] T02.3 Add a test that runs `init` (so the `.gitignore` block exists), lets the mod publish, and checks `git status --porcelain` shows nothing under `.context-brake/`; list it in `PROCESS_LANE_FILES` only if it starts `git`.

## Acceptance criteria

- The strengthened assertions fail if a second run plans a rewrite or the dry run differs in `kind` or summary (checked by a temporary mutation).
- The `git status` test passes with the block and shows why the block is the mitigation.
- No new blocking hit; no test file above 100 lines.

## Verification

- Unit: not applicable.
- Integration: the three test files above.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; CI for the others.
- Environment dependency: `git` on the PATH for T02.3 (the suite already requires it).
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run test:budget`
- Expected evidence: passing suite within the budget.

## Affected files

- Modify: `tests/integration/init-mod-first.test.ts`, `tests/integration/init-mod-migration.test.ts`
- Create: `tests/integration/mod-reading-git-status.test.ts` (and `tests/test-lanes.ts` only if it spawns `git`)

## Observability and recovery

- Operational signal: none.
- Recovery: revert the test changes.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: the second-`init` test asserts an empty plan, the dry-run test compares the whole change list with the run, and a new process-lane test proves with real `git status` that no `context-readings` path shows up after `init` and a publish. The test exposed a real gap: with the mod publishing before any hook, `.context-brake/runtime/.gitignore` did not exist and the reading was untracked; the mod now makes sure that file exists before its first write (`ensureRuntimeIgnore`), and `runtime-paths.ts` reuses the shared constant.
- Changed files: `tests/integration/init-mod-first.test.ts`, `init-mod-migration.test.ts`; created `tests/integration/mod-reading-git-status.test.ts`; `tests/test-lanes.ts` and `tests/unit/test-lanes.test.ts` (new process-lane file); `src/core/contracts/context-reading.ts` (runtime ignore constants), `src/infrastructure/runtime/runtime-paths.ts`, `mod/context-reading.ts`.
- Checks: the new test failed before the production fix and passes after; `npm run coverage` 252 files, 1259 tests; `npm run test:budget` 111.4 s; lint and typecheck clean.
- Validated state: base `63fd5cb` plus the uncommitted diff; Windows with `git` on the PATH.
- Open items: none.
