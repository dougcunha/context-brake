# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/prd.md`
2. `tasks/prd-24-doctor-fix-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Fix report core

## Outcome

`fixReportSchema` validates the fix report. `buildFixReport` turns the first diagnosis, the second diagnosis, the decisions, and the applier outcomes into one outcome per finding and an exit code. `parseFix` parses and validates the `fix` arguments.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T04
- In scope: CMP-03, CMP-12, CMP-13 (`fix-arguments.ts` only; the dispatch is T04).
- Out of scope: the command flow, prompts, text output, the published schema file.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-09, FR-10, FR-13 | `prd.md#functional-requirements` | Outcomes, restart note data, exit codes |
| FR-14 | `prd.md#functional-requirements` | JSON report contract; `--json` needs `--yes` or `--dry-run` |
| NFR-05 | `prd.md#non-functional-requirements` | Exit codes from `EXIT_CODES` |
| DEC-06, DEC-07, DEC-08, DEC-09, DEC-14 | `techspec.md#technical-decisions` | Rules |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`
- Existing code: `src/cli/exit-codes.ts`, `src/cli/argument-parser.ts`, `src/cli/argument-validator.ts`, `src/cli/init-option-rules.ts` (`assertInteractiveCompatible` pattern), `src/core/services/report-service.ts` (report building pattern)
- Contract: `techspec.md#contracts-and-data` (fix report)

## Work

- [ ] T03.1 Create `src/core/contracts/fix-report.ts` with `fixReportSchema` and `FixReport`.
- [ ] T03.2 Create `src/core/services/fix-outcomes.ts`: grouping, DEC-06, DEC-07, DEC-08, report build. The service marks a fixed restart-gated finding with the harness id; T04 formats the label. Exit code values come in as input, so `core` does not import `cli`.
- [ ] T03.3 Create `src/cli/fix-arguments.ts` with `ParsedFixArgs` and `parseFix` (DEC-09).

## Acceptance criteria

- Every DEC-07 branch gives the listed outcome and detail.
- Exit codes follow DEC-08.
- `--json` alone, `--force` alone, and an unknown harness raise `CliArgumentError`.

## Verification

- Unit: TC-08 (`tests/unit/fix-outcomes.test.ts`), TC-09 (`tests/unit/fix-arguments.test.ts`).
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows local.
- Commands: touched suites by path; `npm run typecheck`; `npm run lint`.
- Environment dependency: none.
- Expected evidence: passing suites.

## Affected files

- Create: `src/core/contracts/fix-report.ts`, `src/core/services/fix-outcomes.ts`, `src/cli/fix-arguments.ts`, `tests/unit/fix-outcomes.test.ts`, `tests/unit/fix-arguments.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `fixReportSchema` (`FIX_STOPS` = `not_installed`, `nothing_to_fix`; plan conflicts reuse `planConflictSchema`); `buildFixReport(run)` with `FixRun` = mode, stopped, before, after, plan, `skipped` map (key `code|harness|path` from `findingKey`), applier outcomes, `errorExitCode`, `restartNote(harness)`. The service exports `findingKey`, `problemsOf`, `NOT_INSTALLED_REASON`, `KEPT_STATUSLINE_REASON` for T04. Restart-gated `fixed` outcomes always carry the restart note (DEC-07). `parseFix` rejects `--json` and `--force` without `--yes` or `--dry-run` and unknown harness ids with `CliArgumentError`; an unknown flag throws the `node:util` parse error, which `parseCliArgs` turns into `CliArgumentError` once T04 adds the dispatch.
- Changed files: created `src/core/contracts/fix-report.ts`, `src/core/services/fix-outcomes.ts`, `src/cli/fix-arguments.ts`, `tests/unit/fix-outcomes.test.ts`, `tests/unit/fix-arguments.test.ts`. Also fixed a T02 test type error in `tests/integration/statusline-keep.test.ts:21` (`change.content ?? null`); see `tasks.md#problems-and-solutions`.
- Checks: TC-08 and TC-09 plus `statusline-keep`: 19 tests pass; `npm run typecheck` pass; `npm run lint` pass. Quality profile over the task files: no hit; largest file `fix-outcomes.ts` 81 lines.
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation (DEC-06 to DEC-09, DEC-14).
