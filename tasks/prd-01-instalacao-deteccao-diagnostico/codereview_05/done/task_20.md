# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_05/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T20 — Route E2E-10 CA-07 and IT-05 link setup through the explicit link-capability policy

## Outcome

The E2E-10 "preserves symbolic link (CA-07, CA-20)" case, in every shell variant, and IT-05 either verify that the link exists and then run their assertions, skip locally with a concrete reason, or fail under CI. Neither can pass silently when link creation fails, so a green run proves CA-07 actually executed.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T16
- In scope: link setup in `tests/e2e/e2e-10-fixtures.ts` (`tryCreateSymlink`, `testSymlinkTarget`), passing the Vitest context from `tests/e2e/e2e-10.test.ts`, and link setup in `tests/integration/symlink-junction.test.ts`, all through the existing `attemptLink` and `requireLink` helper; a link-exists assertion before the behavior assertions.
- Out of scope: helper semantics and comments (T22); the policy unit test (T17); the four suites T14 already routed; production link handling; `tests/e2e/shell-runner.ts`; `.github/workflows/ci.yml`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_05/CR-04 | `codereview.md#findings` | `tests/e2e/e2e-10-fixtures.ts:23-30` discards every symlink error and `testSymlinkTarget` returns at line 64 before any assertion. `tests/integration/symlink-junction.test.ts:18-22` returns bare. On a runner that cannot create a file symlink, CA-07 and IT-05 report passed with zero assertions. |
| PRD | CA-07, CA-20 | The linked `AGENTS.md` scenario must pass on Linux, macOS, and Windows in PowerShell and Git Bash. |
| `codereview_04/task_16.md` | Requirements | Each required platform slice must show E2E-10 CA-07 executed "without a silent link-capability return". |

## Requirements

- No link setup in E2E-10 or IT-05 may catch an error and return, or return `false` without a skip or failure decision.
- Link creation goes through `attemptLink(target, link, 'file')`, keeping the relative `CLAUDE.md` target the scenario uses today. The decision goes through `requireLink(ctx, attempt, link)`: skip locally with the reason, fail when `CI` requires links.
- Each successful path asserts that `AGENTS.md` is a symbolic link before running `init --yes`.
- Every shell variant (`powershell` and `bash` on Windows; `bash` and `native` on POSIX) runs the same CA-07 assertions.
- IT-05 keeps its `try/finally` cleanup, and E2E-10 keeps its `afterEach` cleanup, including when setup skips or fails.
- Files stay within 100 lines, functions within 30 lines and 3 parameters; remove helpers left unused.

## Context to recover on demand

- TechSpec: `Integration Tests` IT-05; `End-to-End Tests` E2E-10.
- Rules and skills: `.agents/rules/tests.md` (Platforms), `.agents/rules/code-standards.md`, `.agents/rules/javascript-typescript.md` (Errors: never catch only to ignore), `AGENTS.md` (CLI end-to-end policy), `sdd-execute-corrections`.
- Code: `tests/e2e/e2e-10-fixtures.ts:23-30,59-68` — silent setup; `tests/e2e/e2e-10.test.ts:16-18` — test callbacks that do not receive the Vitest context; `tests/integration/symlink-junction.test.ts:12-36` — IT-05; `tests/helpers/link-capability.ts` — `attemptLink`, `requireLink`, `linkExists`.

## Work

- [x] T20.1 Replace the E2E-10 CA-07 setup with `attemptLink` plus `requireLink`, and pass the Vitest context from `e2e-10.test.ts` for every shell variant.
- [x] T20.2 Replace the IT-05 setup the same way, keeping `try/finally` cleanup.
- [x] T20.3 Add a symbolic-link assertion before the CLI or planner call in both scenarios; remove `tryCreateSymlink` if nothing else uses it.
- [x] T20.4 In a scratch copy only (never committed), force link creation to fail, for example by pre-creating `AGENTS.md` as a regular file. Confirm a named skip without `CI` and a failure carrying the reason with `CI=true`.
- [x] T20.5 Build, run E2E-10 and IT-05 with `CI` unset and with `CI=true`, and run repository gates.

## Acceptance criteria

- The three files contain no bare `return` or `catch` that discards a link setup error.
- On a host that can create links, E2E-10 CA-07 passes in every shell variant and IT-05 passes, with `CI` unset and with `CI=true`, and none of them skipped.
- With link creation forced to fail, the tests report a skip with the reason locally and fail with the reason under `CI=true`.
- E2E-10 CA-01, CA-05, and all other IT and E2E suites stay green.

## Verification

- Unit: not applicable; routing is covered by `tests/unit/link-capability.test.ts` (T17).
- Integration: `tests/integration/symlink-junction.test.ts` (IT-05) with `CI` unset and `CI=true`.
- End-to-end: `tests/e2e/e2e-10.test.ts` against the built CLI in temporary fixture repositories, per the CLI policy in `AGENTS.md`.
- Manual: T20.4 forced-failure simulation in a scratch copy; expected skip locally and failure with `CI=true`; owner: executor.
- Platforms: Windows PowerShell and Git Bash (local); Linux WSL 2 `bash` and `native` variants; the full matrix is T16.
- Environment dependency: none for implementation; link capability is present on the local Windows host and on WSL ext4.
- Commands: `npm run build`, `npx vitest run tests/e2e/e2e-10.test.ts tests/integration/symlink-junction.test.ts`, `CI=true npx vitest run tests/e2e/e2e-10.test.ts tests/integration/symlink-junction.test.ts`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: verbose Vitest output showing CA-07 executed per shell variant, the simulation output for both policy branches, a silent-return scan with zero hits, and all gates green.

## Affected files

- Modify: `tests/e2e/e2e-10-fixtures.ts`, `tests/e2e/e2e-10.test.ts`, `tests/integration/symlink-junction.test.ts`
- Create: —

## Observability and recovery

- Operational signal: Vitest reports CA-07 and IT-05 as passed after a verified link, as skipped with a capability reason locally, or as failed with the reason under CI.
- Recovery: revert the three test files; production code and user repositories are unaffected.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. The E2E-10 CA-07 fixture and IT-05 now create `AGENTS.md` through `attemptLink('CLAUDE.md', agentsPath, 'file')`, decide through `requireLink(ctx, attempt, agentsPath)`, and assert that `AGENTS.md` is a symbolic link before running `init --yes` or the planner. `tryCreateSymlink` and its discarded `catch` were removed. `e2e-10.test.ts` passes the Vitest context for every shell variant. IT-05 cleanup stays in `finally`, and E2E-10 cleanup stays in `afterEach`.
- Changed files: `tests/e2e/e2e-10-fixtures.ts` (+8 −15), `tests/e2e/e2e-10.test.ts` (+1 −1), `tests/integration/symlink-junction.test.ts` (+5 −7).
- Checks:
  - Silent-return scan (`return;`, `catch {`, `tryCreateSymlink`) over the three files: no matches.
  - Windows: E2E-10 and IT-05 passed 7/7 with `CI` unset and 7/7 with `CI=true`, covering CA-01, CA-05, and CA-07 in the PowerShell and Git Bash variants; 0 skipped.
  - WSL: 7/7 with `CI=true` in the `bash` and `native` variants. In the full suite (218/218), CA-07 `bash` took 462 ms, CA-07 `native` 523 ms, and IT-05 65 ms.
  - T20.4 forced-failure simulation, run only in the WSL scratch copy `~/cb-work` (not synced back), with `AGENTS.md` pre-created as a regular file:
    - `CI` unset: 3 skipped, each carrying "unavailable file link capability on linux: EEXIST: file already exists, symlink 'CLAUDE.md' -> '…/AGENTS.md'"; 4 passed.
    - `CI=true`: the same 3 tests failed with that reason; 4 passed.
  - Gates: Windows `npm run build`, lint, typecheck, three full suites (see T19 for the unrelated run 1 timeout), and coverage 218/218; WSL build, lint, typecheck, and full suite 218/218.
- Validated state: uncommitted worktree on top of commit `8401e7f` with T17–T22 applied. Windows 11, Node v24.19.0, Windows PowerShell and Git Bash variants. WSL 2 Ubuntu 26.04, Node v24.21.0, PATH without `/mnt` entries.
- Open items: none. The forced-failure simulation ran on Linux only; the skip/fail routing is platform-independent and is covered on both platforms by `tests/unit/link-capability.test.ts` (T17).
