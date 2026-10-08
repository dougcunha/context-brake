# Stable execution context

Load in this exact order:

1. `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md`
2. `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Add --max-restarts and the new flag parsing

## Outcome

`init --max-restarts N` (1..10) writes `autoRestart.maxConsecutiveRestarts = N` when restart is on now or through `--auto-restart`; every misuse is an argument error that names the rule. `--interactive` parses, and `--interactive` with `--yes` or `--json` is rejected. `hasConfigurationFlag` exists for the trigger rule.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T04
- In scope: `ParsedInitArgs.interactive` and `maxRestarts`; parse-time range, integer, and `--no-auto-restart` checks; `mergeAutoRestart` with `maxRestarts`; the config summary text for the new value; `hasConfigurationFlag`.
- Out of scope: the TTY check for `--interactive`, the assistant, prompts (T02..T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-09 | `prd.md#functional-requirements` | `--max-restarts` rules and errors |
| FR-01 | `prd.md#functional-requirements` | `--interactive` conflicts with `--yes` and `--json` (parse-time part) |
| DEC-01, DEC-08, DEC-10 | `techspec.md#technical-decisions` | Trigger inputs, merge rules, size absorption |
| CMP-01, CMP-02 | `techspec.md#components-and-flow` | `init-arguments.ts`, `auto-restart-merge.ts` |
| TC-01, TC-02, TC-03 | `techspec.md#test-approach` | Merge and parse unit tests; integration |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (100-line files, 30-line functions, three parameters), `javascript-typescript.md`, `cli-output.md`, `tests.md`.
- Existing code: `src/cli/init-arguments.ts` (65 lines: `INIT_OPTIONS`, `parseInit`, the two `assert*` functions); `src/core/services/auto-restart-merge.ts` (`mergeAutoRestart`, `applyAutoRestart`, `AutoRestartUpdate`); `src/core/contracts/auto-restart.ts` (limits); `src/core/services/installation-builder.ts` (`AUTO_RESTART_SUMMARY`); `src/cli/init-config-updates.ts` (`autoRestartUpdate`); `src/cli/argument-validator.ts` (`CliArgumentError`, exit 64).
- Contract or integration: `techspec.md#contracts-and-data`.

## Work

- [x] T01.1 Add `interactive` and `max-restarts` to `INIT_OPTIONS` and `ParsedInitArgs`; validate an integer in `MIN..MAX_CONSECUTIVE_RESTARTS` at parse time (rule named in the message); reject `--no-auto-restart` with `--max-restarts`, and `--interactive` with `--yes` or `--json`.
- [x] T01.2 Extend `AutoRestartFlags`/`AutoRestartUpdate`: `mergeAutoRestart` takes `maxRestarts`; restart off in the configuration and no `--auto-restart` is an error; `set` carries an optional `maxConsecutiveRestarts`; with restart already on, N replaces the stored value; `applyAutoRestart` writes it (default otherwise).
- [x] T01.3 Pass `maxRestarts` from `planConfigUpdates`; extend the config change summary with the value.
- [x] T01.4 Add `hasConfigurationFlag(args)`; if `init-arguments.ts` would pass 100 lines, move the two `assert*` functions to `src/cli/init-assertions.ts`.
- [x] T01.5 Tests: `tests/unit/auto-restart-merge.test.ts` (TC-01), `tests/unit/init-arguments.test.ts` additions (TC-01, TC-03), `tests/integration/init-max-restarts.test.ts` (TC-02).

## Acceptance criteria

- `init --auto-restart --max-restarts 3 --yes` on a fixture with a restart-capable harness writes `maxConsecutiveRestarts: 3`; a later `init --max-restarts 5 --yes` changes it to 5; `--max-restarts 11`, `0`, `2.5`, `abc` exit `64` naming the 1..10 rule.
- `--max-restarts 3` without restart on (no `--auto-restart`, none configured) and with `--no-auto-restart` exit `64` naming the rule; existing `--auto-restart` and `--no-auto-restart` behavior is unchanged.
- `--interactive --yes` and `--interactive --json` exit `64` naming both flags.
- `hasConfigurationFlag` is true for each configuration flag listed in DEC-01 and false for `--dry-run`, `--yes`, `--json`, `--interactive`.
- Every touched `src/` file is at or below 100 lines; no function above 30 lines.

## Verification

- Unit: merge matrix and parser cases, `hasConfigurationFlag` matrix.
- Integration: `runInProcessCli` on a temporary directory with a detected Claude Code project.
- End-to-end: not applicable here (TC-14 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows (no path logic).
- Commands: `npm test -- tests/unit/auto-restart-merge.test.ts tests/unit/init-arguments.test.ts tests/integration/init-max-restarts.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: passing tests citing `FR-09`, `TC-01`..`TC-03`; lint, typecheck, coverage green.

## Affected files

- Modify: `src/cli/init-arguments.ts`, `src/core/services/auto-restart-merge.ts`, `src/cli/init-config-updates.ts`, `src/core/services/installation-builder.ts`, `tests/unit/init-arguments.test.ts`
- Create: `src/cli/init-assertions.ts` (only if needed), `tests/unit/auto-restart-merge.test.ts` (or extend the existing one), `tests/integration/init-max-restarts.test.ts`

## Observability and recovery

- Operational signal: the config change summary shows the limit.
- Recovery: revert the commit; the flag disappears.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `init --max-restarts N` (1..10) writes `autoRestart.maxConsecutiveRestarts`: with `--auto-restart` and no stored restart it turns restart on with N; with restart already on it replaces the value (unchanged value keeps the file). Misuse is an argument error naming the rule: out of range or non-integer (`--max-restarts must be an integer from 1 to 10.`), with `--no-auto-restart`, or while restart is off without `--auto-restart` (`--max-restarts needs restart to be on: add --auto-restart.`). `--interactive` parses; with `--yes` or `--json` it is rejected naming the flag. `hasConfigurationFlag(args)` exists (true for each DEC-01 configuration flag, false for `--dry-run`, `--yes`, `--json`, `--interactive`). The config change summary shows the limit.
- Changed files: modified `src/cli/init-arguments.ts` (77 lines; `interactive` and `maxRestarts` are optional on `ParsedInitArgs` so existing hand-built args in tests compile unchanged), `src/core/services/auto-restart-merge.ts` (34), `src/core/services/installation-builder.ts` (82), `src/cli/init-config-updates.ts`; created `src/cli/init-option-rules.ts` (23; parse-time rules), `tests/unit/init-max-restarts-arguments.test.ts`, `tests/integration/init-max-restarts.test.ts`. The assertion move to `init-assertions.ts` was not needed.
- Checks: `npm run lint`, `npm run typecheck` clean; `npm run coverage`: 237 files, 1301 tests passed, 138.5 s (budget 180 s), 94.37%; quality sweep over the five touched `src/` files returned no hit and no file above 100 lines.
- Validated state: HEAD `b216aba` plus the uncommitted working tree; Windows 11, Node 24.19.
- Open items: none blocking. A negative number must be passed as `--max-restarts=-1` because Node's parser reads `-1` as an option; the result is still an argument error (the tests use the `=` form).

### ADR candidates

None - direct TechSpec implementation or local decision.
