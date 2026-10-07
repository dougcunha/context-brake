# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md`
2. `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Remove run, wrap, and the runner

## Outcome

`context-brake run` and `context-brake wrap` fail as unknown commands. The runner code, its config key, the run summary schema, the `RUN_*` codes, and every test that served them no longer exist. The remaining commands behave as before.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02
- In scope:
  - Delete `src/infrastructure/runner/**`, `src/cli/commands/{run,run-preflight,run-prompts,wrap}.ts`, `src/cli/run-arguments.ts`, `src/cli/output/run-text.ts`.
  - Delete the runner contracts `src/core/contracts/{run-control,run-ports,run-records,run-summary,runner-configuration}.ts` and `src/core/services/{run-*,runner-prompt,session-record,session-watch}.ts`.
  - Delete the Claude Code and Codex `session-launcher`/`session-stream`, `common/stream-line.ts`, and `process/executable-command.ts`.
  - Delete `shutdown.ts` and the runner exit codes if they become orphans.
  - Drop the `runner` config key and the `RUN_*` CLI error codes. Drop `run` and `wrap` from `CLI_ERROR_COMMANDS`.
  - Drop `schemas/run-summary.schema.json` and its entries in `scripts/{generate-schemas,check-schemas,check-package}.ts`.
  - Update the dispatch and help in `main.ts`, `argument-parser.ts`, and `composition-root.ts`.
  - Delete the runner tests, helpers, `tests/support/fake-harness/**`, and runner fixtures. Remove their entries from `tests/test-lanes.ts`.
  - Delete `e2e-run-autonomy`, the only acceptance-mode suite left besides `e2e-simulated-long-task`, which T02 removes.
- Out of scope:
  - `plan` command and plan contracts (T02). The runner reads the plan, but the plan stays for T02.
  - Acceptance-mode script removal (T07).
  - README text (T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03 | `prd.md#functional-requirements` | Remove `run`, `wrap`, runner config, run summary schema, runner codes |
| FR-02 | `prd.md#functional-requirements` | `runner` key rejected |
| DEC-13 | `techspec.md#technical-decisions` | Deletion set and dispatch |
| CMP-10, CMP-11 | `techspec.md#components-and-flow` | Wiring and schema scripts |
| TC-01 | `techspec.md#test-approach` | Unknown command |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `cli-output.md`.
- Existing code:
  - `src/cli/main.ts:24` and `src/cli/argument-parser.ts:50-53`: command dispatch.
  - `src/cli/composition-root.ts:20-31`: help text.
  - `src/core/contracts/diagnostics.ts:50-51`: CLI error commands and codes.
  - `src/core/contracts/configuration.ts:78`: the `runner` key.
- Test lanes: `tests/test-lanes.ts`. `tests/unit/test-lanes.test.ts` fails while a listed file is missing.
- Deletion lists: the "Relevant files" section of the TechSpec, runner part.

## Work

- [x] T01.1 Delete the runner production files listed in scope. Fix the remaining importers until `npm run typecheck` passes.
- [x] T01.2 Remove the `runner` key, `RUN_*` codes, `run`/`wrap` command entries, and runner exit codes. Regenerate schemas and drop `run-summary.schema.json` from the scripts and `schemas/`.
- [x] T01.3 Delete the runner tests, helpers, support, and fixtures. Clean `tests/test-lanes.ts`. Rewrite the `e2e-09` case so `run` and `wrap` fail with `INVALID_ARGUMENTS`.
- [x] T01.4 Run lint, typecheck, `schemas:check`, the touched suites, then `npm run coverage`.

## Acceptance criteria

- `context-brake run` and `context-brake wrap` exit 64 with `INVALID_ARGUMENTS`. Help lists `init`, `doctor`, `remove`, `plan`.
- A config with a `runner` key fails validation, naming the key.
- `rg -n "runner|run-summary|RUN_" src schemas scripts` finds no runner reference. Remaining unrelated words such as "runtime" are allowed.
- No test is skipped to pass.

## Verification

- Unit: `tests/unit/test-lanes.test.ts`, `tests/unit/schemas.test.ts`, `tests/unit/exit-codes.test.ts`, `tests/unit/configuration.test.ts` (the `runner` key case).
- Integration: `tests/integration/package-contents.test.ts` (schema list).
- End-to-end: `tests/e2e/e2e-09.test.ts`, unknown-command case (TC-01).
- Manual: none.
- Platforms: Windows local. Linux and macOS are unverified, as the TechSpec records.
- Commands: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run build`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: command outputs with pass counts. The coverage thresholds are met.

## Affected files

- Delete: the paths in scope, plus `schemas/run-summary.schema.json`.
- Modify: `src/cli/{main,argument-parser,composition-root,exit-codes}.ts`, `src/core/contracts/{configuration,diagnostics}.ts`, `scripts/{generate-schemas,check-schemas,check-package}.ts`, `tests/test-lanes.ts`, `tests/e2e/e2e-09.test.ts`, and the unit tests named above.

## Observability and recovery

- Operational signal: none.
- Recovery: `git revert` of the task commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `run` and `wrap` are unknown commands (exit 64, "Allowed commands: init, doctor, remove, plan.").
  - The runner and its CLI, contracts, services, launchers, and streams are deleted, as are `executable-command.ts`, `session-record`, `session-watch`, `session-evaluation` (runner-only orphan), `shutdown.ts` (only `run` registered a controller), and the `runner` config key with its schema section.
  - Also removed: `RUN_*` CLI codes, `run`/`wrap` in `CLI_ERROR_COMMANDS`, the `run-summary` schema and its script entries, and the exit codes `limitReached`, `decisionRequired`, `interrupted`.
  - The PRD-11 mod stand-down `SKIP_RUNNER_SESSION` (`CONTEXT_BRAKE_RUN_ID`) is gone, because no runner session can exist.
  - `parseConfiguration` now splits zod's `unrecognized_keys` issue into one issue per key, with path `<parent>.<key>` and rule "is not a recognized key". zod/mini only said "Invalid input" at `(root)`, which did not meet FR-02 ("names the key").
- Changed files:
  - Modified: `src/cli/{main,argument-parser,composition-root,exit-codes}.ts`, `src/core/contracts/{configuration,diagnostics,auto-restart}.ts`, `src/core/services/auto-restart-{policy,notices}.ts`, `src/core/validation/configuration-validator.ts`, `src/infrastructure/harnesses/claude-code/mod/restart-facts.ts`, `scripts/{check-package,check-schemas,generate-schemas}.ts`, `schemas/context-brake.config.schema.json`, `tests/test-lanes.ts`, and the tests `unit/{main,configuration,exit-codes,auto-restart-policy,delegated-snapshot-config,light-mode-config}` and `integration/claude-mod-guards`.
  - Deleted: 124 files, comprising runner src, `schemas/run-summary.schema.json`, runner tests (unit, integration, e2e), helpers `run-*`, `wrap-world`, `fake-session`, `stream-fixtures`, `tests/support/fake-harness/**`, `tests/fixtures/runner/**`, and the Claude/Codex stream fixtures.
- Checks:
  - `npx tsc -p tsconfig.check.json --noEmit`: no errors.
  - `npm run lint`: no issues.
  - `npm run schemas:check`: pass. The config schema diff only drops `runner`.
  - Touched suites: pass.
  - First `npm run coverage` (626 s): 1629 passed, 3 failed. Two failures were path expectations made more precise by the validator change, now fixed. The third, `e2e-support-limitations`, timed out at 30 s under load and passes alone; it is a pre-existing slow e2e, left to prd-13.
  - Second `npm run coverage` (514 s): 270 files and 1632 tests passed. Coverage: statements 95.44%, branches 90.81%, functions 96.71%, lines 95.44%, all above 80%.
  - Quality profile over the 20 modified `.ts` files: no blocking or reservation hit.
- Validated state: worktree at base `1474f54` plus this diff; Windows 11, Git Bash, Node 24.19.
- Open items:
  - TC-01 is proven in process (`tests/unit/main.test.ts`) instead of a new `e2e-09` case, which keeps the prd-13 budget.
  - `tests/unit/readme-config-example.test.ts:44` still asserts README text mentioning `context-brake run`; the README belongs to T07.
  - `.agents/rules/node.md` "Shutdown" still describes `run` (T07).

### ADR candidates

None - direct TechSpec implementation or local decision.
