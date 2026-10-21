# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/prd.md`
2. `tasks/prd-24-doctor-fix-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Fix command without prompts

## Outcome

`context-brake fix` runs the DEC-10 sequence without prompts: `--yes`, `--yes --force`, `--harness`, `--dry-run`, and `--json` work; a run without a TTY and without `--yes` stops with `CONFIRMATION_REQUIRED`; the not-installed and nothing-to-fix stops work; text and JSON output and exit codes follow the TechSpec; the help lists `fix`.

## Dependencies and boundaries

- Depends on: T02, T03
- Unblocks: T05, T06
- In scope: CMP-14 (flag resolution only), CMP-15, CMP-16, CMP-17, `fix` in `CLI_ERROR_COMMANDS`, `tests/helpers/fix-world.ts`.
- Out of scope: TTY questions and confirmation (T05; until then an interactive run behaves as a run without a TTY), the published schema file and README (T06).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-14 | `prd.md#functional-requirements` | Non-interactive command behavior |
| FR-16 | `prd.md#functional-requirements` | CLI help |
| NFR-01, NFR-02, NFR-03, NFR-05 | `prd.md#non-functional-requirements` | Writes, consent, output, exit codes |
| DEC-08, DEC-09, DEC-10, DEC-12, DEC-15, DEC-16 | `techspec.md#technical-decisions` | Sequence, text, help, labels |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `cli-output.md`, `file-changes.md`, `tests.md`
- Existing code: `src/cli/commands/remove.ts` (write command pattern), `src/cli/init-flow.ts` (`outputReport`), `src/cli/confirmation.ts`, `src/cli/composition-root.ts`, `src/cli/main.ts:13-24`, `src/cli/output/doctor-text.ts` (header line, cards), `src/cli/output/card.ts`, `tests/helpers/in-process-cli.ts`, `tests/helpers/fake-process-runner.ts`, `tests/helpers/fake-overhead-measurer.ts`
- Contract: `techspec.md#contracts-and-data`, `techspec.md#integrations-and-interfaces`

## Work

- [ ] T04.1 `tests/helpers/fix-world.ts`: an installed Claude Code fixture and the mutations of the TechSpec Test approach.
- [ ] T04.2 `src/cli/fix-decisions.ts`: resolve decisions from flags (`--yes`, `--force`, `--harness`) into planner overrides and skip reasons.
- [ ] T04.3 `src/cli/commands/fix.ts`: DEC-10 sequence with `diagnoseDoctor`, `planInit`, `NodeChangeApplier`, `buildFixReport`.
- [ ] T04.4 `src/cli/output/fix-text.ts`: DEC-12 text and DEC-16 labels; `--json` through `renderJsonOutput`.
- [ ] T04.5 Dispatch in `argument-parser.ts` and `composition-root.ts`, help (DEC-15), `handleParseError` for `fix`, `fix` in `CLI_ERROR_COMMANDS`.

## Acceptance criteria

- After `fix --yes` on a world with only `automatic` findings, `doctor` exits 0 (OBJ-01); `autoRestart` stays in the config (FR-03).
- `--yes` keeps a modified file and reports it `skipped`; `--yes --force` replaces it; `--yes --force --harness claude-code` installs claude-code.
- No TTY and no `--yes`: exit 2, `CONFIRMATION_REQUIRED`, no file change.
- `--dry-run`: no file change; outcomes `planned` and `skipped`.
- A second `fix --yes` after a full fix writes nothing.
- Exit codes 0, 1, 2, and 64 per DEC-08.

## Verification

- Unit: TC-17 (`tests/unit/fix-text.test.ts`).
- Integration: TC-10, TC-13, TC-14, TC-15, TC-16, TC-18, TC-19, TC-20, TC-25 (`tests/integration/fix-command.test.ts`), in process with `fakeOverheadMeasurer` and `fakeProcessRunner`.
- End-to-end: not applicable (T06).
- Manual: none.
- Platforms: Windows local.
- Commands: touched suites by path; `npm run typecheck`; `npm run lint`.
- Environment dependency: none.
- Expected evidence: passing suites; file hashes compared before and after.

## Affected files

- Modify: `src/cli/argument-parser.ts`, `src/cli/composition-root.ts`, `src/cli/main.ts`, `src/core/contracts/diagnostics.ts`
- Create: `src/cli/fix-decisions.ts`, `src/cli/commands/fix.ts`, `src/cli/output/fix-text.ts`, `tests/helpers/fix-world.ts`, `tests/unit/fix-text.test.ts`, `tests/integration/fix-command.test.ts`

## Observability and recovery

- Operational signal: the fix report.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `context-brake fix` runs the DEC-10 sequence without prompts (`runFix` in `src/cli/commands/fix.ts`): stops `not_installed` and `nothing_to_fix`, unreadable config skips every fixable finding, flag decisions (`decideByFlags` + `toDecisions` in `src/cli/fix-decisions.ts`; `--harness` applies only when `NO_PROJECT_HARNESS` is reported), `planInit` with the overrides, dry run, `CONFIRMATION_REQUIRED` without `--yes` when the plan has changes, apply, second diagnosis, report. Text output: summary line, `Plan`, `Conflicts`, `Result` cards, dry-run note, final doctor header (`formatDoctorHeader`, now exported from `doctor-text.ts`). Help lists `fix`; `handleParseError` and `CLI_ERROR_COMMANDS` know `fix`.
- Changed files: created `src/cli/fix-decisions.ts`, `src/cli/commands/fix.ts`, `src/cli/output/fix-text.ts`, `src/cli/output/fix-rows.ts` (row builders split out for the 100-line limit, as CMP-16 allows), `src/cli/output/harness-labels.ts` (DEC-16; no label map existed in `src/`), `tests/unit/fix-text.test.ts`, `tests/integration/fix-command.test.ts`, `tests/integration/fix-stops.test.ts` (second file for the lint `max-lines` limit); modified `src/cli/argument-parser.ts`, `src/cli/composition-root.ts`, `src/cli/main.ts`, `src/core/contracts/diagnostics.ts`, `src/cli/output/doctor-text.ts`, `tests/helpers/fix-world.ts` (bridge path, runtime error seed, hashes, `fixJson`, `outcomeOf`).
- Checks: TC-10, TC-13 to TC-16, TC-18 to TC-20, TC-25 in `fix-command` and `fix-stops` (12 tests) pass; TC-17 `fix-text` (5 tests) pass; `doctor-arguments`, `init-arguments`, `cli-output-text` pass; `npm run typecheck`, `npm run lint`, `npm run schemas:check` pass. The applier failure case uses a file at `.claude/hooks`, so the hook write fails and `ASSET_MISSING` is `failed` with exit 2. Quality profile over the task files: no hit.
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21.
- Open items: an interactive terminal run still behaves like a run without a TTY until T05.

### ADR candidates

None - direct TechSpec implementation (DEC-08 to DEC-10, DEC-12, DEC-15, DEC-16).
