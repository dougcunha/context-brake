# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T01 — The tracked-files check works in the shipped CLI

## Outcome

`init` reports `GITIGNORE_TRACKED_FILES` on the built CLI when a listed file is already tracked by Git, without any injected process runner.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: a real `NodeProcessRunner` as the default in `src/cli/init-flow.ts` for the tracked-files query; a test that drives `main()` without `overrides.runner`.
- Out of scope: other uses of `env.runner` (version probes keep their current behavior).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | The CLI never injects a runner, so FR-08, US-04, and DEC-07 pass only on stubs |

## Requirements

- With no runner in `CommandEnv`, the tracked-files query uses a `NodeProcessRunner` (the pattern of `statusline-diagnostics.ts:62`).
- The finding stays informational (severity `ok`) and never changes the exit code.

## Context to recover on demand

- TechSpec: `techspec.md` DEC-07.
- Rules and skills: `code-standards.md`, `node.md` (child processes), `tests.md` (a process starts only when the behavior depends on one; here the test spies the runner).
- Code: `src/cli/init-flow.ts` (`extraFindings`), `src/infrastructure/git/git-context.ts`, `src/infrastructure/process/node-process-runner.ts`, `tests/helpers/in-process-cli.ts` (always injects a runner).

## Work

- [x] T01.1 `extraFindings` passes `env.runner ?? new NodeProcessRunner()` to `trackedOwnedFiles`.
- [x] T01.2 Test `tests/integration/init-gitignore-default-runner.test.ts`: call `main(['init', '--dry-run', '--json'], { projectRoot })` with no runner while spying `NodeProcessRunner.prototype.run` to return a `git ls-files` listing; expect the finding and that the spy received `git` with `ls-files`.

## Acceptance criteria

- The test fails before the change (no finding) and passes after.
- Existing tests that inject a runner still pass unchanged.
- `init-flow.ts` stays at or below 100 lines.

## Verification

- Unit: none. Integration: `npm test -- tests/integration/init-gitignore-default-runner.test.ts tests/integration/init-gitignore-tracked.test.ts`.
- End-to-end: the QA run repeats the committed-config scenario on the built CLI. Manual: none.
- Platforms: Linux, macOS, Windows.
- Environment dependency: none.
- Commands: the tests above, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Expected evidence: a test citing `FR-08`, `CR-01`.

## Affected files

- Modify: `src/cli/init-flow.ts`
- Create: `tests/integration/init-gitignore-default-runner.test.ts`

## Observability and recovery

- Operational signal: the finding. Recovery: revert the change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: extraFindings passes env.runner ?? new NodeProcessRunner() to trackedOwnedFiles, so the shipped CLI queries Git for tracked files; the test drives main() with no runner and checks that a runner reaches trackedOwnedFiles and the finding is reported (mutation check: the test fails without the default).
- Changed files: modified src/cli/init-flow.ts (77 lines); created tests/integration/init-gitignore-default-runner.test.ts (mocks git-context.js so no process starts and no process-lane entry is needed)
- Checks: npm run lint and typecheck exit 0; npm run coverage exit 0: 258 files, 1456 tests, 94.78% lines, 119.4 s wall (one combined run for the three corrections); quality sweep over the touched files: no hit, no file above 100 lines.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: none
