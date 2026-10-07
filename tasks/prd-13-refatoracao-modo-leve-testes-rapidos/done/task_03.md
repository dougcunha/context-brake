# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md`
2. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Init and remove smoke, scenarios in process

## Outcome

`tests/e2e/e2e-init.test.ts` and `tests/e2e/e2e-remove.test.ts` run the built CLI against temporary fixture repositories. The install and removal scenarios of the mapping run in process, and their e2e files are deleted.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T04
- In scope: the mapping rows (`techspec.md#e2e-scenario-mapping-fr-04-nfr-03`) for `e2e-01-02`, `e2e-03-04`, `e2e-05-06`, the init and remove parts of `e2e-07-08`, `e2e-10` (idempotency and symlink in process; install per shell to `tests/integration/cli-shells.test.ts`), `e2e-linked-project-root`, `e2e-minified-config`, `e2e-remove-invalid-config`, `e2e-symlinked-harness-config`, `e2e-user-hook-preservation`, and `auto-restart`.
- Out of scope: doctor, mode, and hook rows (T04); lane lists (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04, NFR-03, NFR-04 | `prd.md` | Smoke set; mapped scenarios; shell coverage |
| DEC-03 | `techspec.md#technical-decisions` | Smoke set and mapping |
| CMP-06, CMP-07 | `techspec.md#components-and-flow` | Smoke files; in-process tests |
| TC-10 | `techspec.md#test-approach` | Mapping rows of this task |

## Context to recover on demand

- Applicable skills and rules: `tests.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`; quality profile QA-01 to QA-07 and the Terrain baseline in `techspec.md#quality-profile`, `file-changes.md`
- Existing code: `tests/helpers/delegated-world.ts:runCli`; `tests/helpers/light-world.ts`; `tests/e2e/cli-runner.ts`; `tests/e2e/shell-runner.ts`; the e2e files in scope.

## Work

- [x] T03.1 Write `e2e-init` (Claude install, rerun idempotency) and `e2e-remove` (remove deletes owned files) against the built CLI.
- [x] T03.2 Move each in-scope scenario to its in-process destination, keeping its assertions, then delete its e2e file.
- [x] T03.3 Move the per-shell install of `e2e-10` to `tests/integration/cli-shells.test.ts`.

## Acceptance criteria

- Every in-scope mapping row has a passing test at its destination, listed in the handoff with the final file.
- No behavior a deleted e2e file asserted is left without a test.

## Verification

- Unit: none.
- Integration: the destination suites.
- End-to-end: `tests/e2e/e2e-init.test.ts`, `tests/e2e/e2e-remove.test.ts` against the built CLI.
- Manual: none.
- Platforms: Windows, PowerShell and Git Bash through `cli-shells`.
- Commands: `npm run build`, `npx vitest run <touched suites>`, `npm run lint`, `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: the mapping rows with final files and passing suites.

## Affected files

- Create: `tests/e2e/e2e-init.test.ts`, `tests/e2e/e2e-remove.test.ts`, `tests/integration/cli-shells.test.ts`, and the in-process destinations named in the mapping
- Modify: existing destination suites
- Delete: the in-scope e2e files

## Observability and recovery

- Operational signal: none beyond the test output.
- Recovery: restore the deleted e2e files from Git.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result (FR-04, NFR-03, NFR-04, DEC-03):
  - **In-process runner.** `src/cli/main.ts:main` takes an optional `Partial<CommandEnv>` (`projectRoot`, `overheadMeasurer`), so a test can run the real entry point in process: argument parsing, the exit-64 path, and rendering. No user-visible change.
  - `tests/helpers/in-process-cli.ts:runInProcessCli(args, cwd, env?)` keeps `runBuiltCli`'s signature and result shape. It spies stdout and stderr, sets and restores env overrides such as `HOME`, and passes the fake measurer.
  - **Moved scenarios.** Each scenario moved with `git mv` and kept its assertions; only the runner call changed. Mapping rows, with final files:

    | Mapping row | Final file(s) |
    | --- | --- |
    | `e2e-01-02` | `tests/integration/init-install.test.ts`; smoke `tests/e2e/e2e-init.test.ts` |
    | `e2e-03-04` | `tests/integration/init-detection.test.ts` |
    | `e2e-05-06` | `tests/integration/init-plan.test.ts` |
    | `e2e-07-08` | `tests/integration/init-remove-footprint.test.ts` (E2E-08 doctor schema now in process; T04 adds the built doctor smoke); smoke `tests/e2e/e2e-remove.test.ts` |
    | `e2e-10` | per-shell install in `tests/integration/cli-shells.test.ts` (process lane, shell quoting); idempotency and symlink in `tests/integration/init-idempotency.test.ts` (in process); fixtures moved to `tests/helpers/cli-fixtures.ts` |
    | `e2e-linked-project-root` | `tests/integration/linked-project-root-lifecycle.test.ts` |
    | `e2e-minified-config` | `tests/integration/minified-config-lifecycle.test.ts` (`minified-config.test.ts` already existed) |
    | `e2e-remove-invalid-config` | `tests/integration/remove-invalid-config.test.ts` |
    | `e2e-symlinked-harness-config` | `tests/integration/symlinked-harness-lifecycle.test.ts` |
    | `e2e-user-hook-preservation` | `tests/integration/user-hook-preservation.test.ts` |
    | `auto-restart` | `tests/integration/auto-restart-lifecycle.test.ts` |

  - **Smoke files** against the built CLI: `e2e-init` (Claude install, then a second run byte-identical over the owned files) and `e2e-remove` (owned files deleted, `PostToolUse` gone from settings).
  - `cli-shells` joins `PROCESS_LANE_FILES`, because it is on the DEC-04 list. T05 sets the rest of the list.
- Changed files: `src/cli/main.ts`; `tests/test-lanes.ts`; created `tests/helpers/in-process-cli.ts`, `tests/integration/init-idempotency.test.ts`, `tests/e2e/e2e-init.test.ts`, `tests/e2e/e2e-remove.test.ts`; moved the 11 e2e files and the fixtures listed above.
- Checks (Windows 11, Git Bash, after `npm run build`):
  - The 12 destination suites pass: 25 tests, in 0.3-2.7 s per file. `cli-shells` covers PowerShell and Git Bash.
  - `e2e-init`, `e2e-remove`, `test-lanes`, `bench-config`, and `main`: 5 files, 14 tests pass.
  - `rtk proxy npx eslint .` and `npm run typecheck` are clean. The quality profile finds no blocking hit, and moved files keep their measured state.
- Validated state: base `cca3a29` plus T01, T02, T06, and T03.
- Open items: none. `tests/e2e/shell-runner.ts` stays in place for the T04 shell suites.

### ADR candidates

None - direct TechSpec implementation or local decision.
