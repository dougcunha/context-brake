# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Git inspector and divergence detection

## Outcome

The checkpoint's recorded commit and working-tree state are compared against the repository, producing named divergences; without git, repository checks are omitted and the omission is reported.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T04, T07
- In scope: the `GitInspector` port, its Node implementation over the existing `ProcessRunner`, and the pure divergence service.
- Out of scope: writing git state into the checkpoint, which agents do; running the validation command, which belongs to the runner PRD; and any commit made by the CLI, explicitly out of scope in the PRD.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF14 | `prd.md#verificação-do-estado-herdado` | Commit exists, belongs to the current branch history, and the tree is clean |
| RF16 | `prd.md#verificação-do-estado-herdado` | Work without git, omitting repository checks and reporting the omission |
| CMP-03, CMP-09, CMP-16 | `techspec.md#components-and-flow` | Port, divergence service, and inspector |
| DEC-09 | `techspec.md#technical-decisions` | Git runs through `ProcessRunner`, never a shell string |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/node.md` (`execFile` or `spawn` with an argument array, never a shell command string, always a timeout), `tests.md` (repeatable tests, no dependency on the developer's machine).
- Existing code: `src/core/contracts/processes.ts` — the `ProcessRunner` port, `ProcessRequest`, and `ProcessResult`.
- Existing code: `src/infrastructure/process/node-process-runner.ts` — `spawn` with `shell: false`, timeout, and process-tree kill; reuse rather than duplicate.
- Existing code: `src/core/services/gitignore-service.ts` — existing git-adjacent service for naming conventions only; it does not invoke git.
- Contract or integration: `techspec.md#errors-security-and-recovery`.

## Work

- [ ] T03.1 Add `src/core/contracts/git.ts`: `GitInspector` port, `GitState`, and `GitDivergence` types, with an explicit unavailable state.
- [ ] T03.2 Add `src/infrastructure/git/git-inspector.ts` reading branch, head commit, ancestry of a recorded commit, and tree cleanliness, each as a separate argument-array invocation with a timeout.
- [ ] T03.3 Add `src/core/services/git-divergence.ts` comparing a checkpoint's git state with a reading and returning named divergences.
- [ ] T03.4 Tests: unit for the divergence service with a port fake; integration against a temporary git repository for ancestry, dirty tree, and absent git.

## Acceptance criteria

- A commit that is not an ancestor of the current branch head produces a divergence naming both the recorded and the current commit.
- Uncommitted changes produce a pending-changes divergence.
- A recorded commit absent from the repository is reported as missing, distinctly from the out-of-history case.
- When git is not installed or the directory is not a repository, no repository check runs, no error is raised, and the result states that the checks were omitted.
- Git is never invoked through a shell string, and every invocation carries a timeout.
- The divergence service is pure and takes its clock and inputs as arguments, so tests are deterministic.

## Verification

- Unit: divergence combinations using a `GitInspector` fake, including the unavailable state.
- Integration: a temporary git repository exercising ancestry, dirty tree, missing commit, and a non-repository directory; skipped with a stated reason when git is unavailable.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: git on `PATH` for the integration scenarios; the suite skips with a stated reason rather than passing silently.
- Expected evidence: passing suites covering each divergence kind and the no-git path.

## Affected files

- Create: `src/core/contracts/git.ts`, `src/infrastructure/git/git-inspector.ts`, `src/core/services/git-divergence.ts`, `tests/unit/git-divergence.test.ts`, `tests/integration/git-divergence.test.ts`
- Modify: `tests/test-lanes.ts`

## Observability and recovery

- Operational signal: divergences surface in the boot (T04) and in `plan status` (T07).
- Recovery: read-only; the inspector never mutates the repository.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
