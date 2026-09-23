# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — `plan status` command

## Outcome

`context-brake plan status` shows steps and their statuses, the active step, the last checkpoint's date and commit, the counts of constraints and decisions, and the validity of both files, with `--json` emitting the same findings as one document matching a published schema.

## Dependencies and boundaries

- Depends on: T02, T03
- Unblocks: —
- In scope: the status service, its report schema, text and JSON rendering, the command path, and upgrading `doctor`'s state-file check from syntax to schema validation.
- Out of scope: modifying the plan, which only agents do, and boot behavior.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF19 | `prd.md#status-da-tarefa` | Steps and statuses, active step, checkpoint date and commit, counts, and file validity |
| RF20 | `prd.md#status-da-tarefa` | JSON output carrying the same data |
| RF7 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Validation before any use, surfaced through `doctor` as well |
| CMP-10, CMP-14, CMP-19, CMP-21 | `techspec.md#components-and-flow` | Status service, doctor checks, command, and rendering |
| DEC-12 | `techspec.md#technical-decisions` | Modeled on `doctor`: core service, report schema, shared findings |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/cli-output.md` (results on stdout, one JSON document matching the published schema, text status labels, honor `NO_COLOR`, never depend on color alone), `tests.md`.
- Existing code: `src/cli/commands/doctor.ts:29-58` — the command shape to mirror: read config safely, build a report, render text or JSON, return the report's exit code.
- Existing code: `src/core/contracts/diagnostics.ts:22` — `doctorReportSchema`, the report-schema precedent; `:7` — the shared finding shape.
- Existing code: `src/cli/output/text.ts:40-55` — `renderDoctorText`, the rendering precedent with text labels.
- Existing code: `src/core/services/doctor-checks.ts:55-69` — `checkStateFiles`, which only tries `JSON.parse` today and must gain schema-level findings.
- Existing code: `src/cli/exit-codes.ts` — reuse `EXIT_CODES` and `exitCodeForSeverities`.

## Work

- [x] T07.1 Add `src/core/services/plan-status.ts` building the report from both files plus a git reading.
- [x] T07.2 Add the report schema alongside the existing diagnostics schemas and export its type.
- [x] T07.3 Add the `plan status` path to `src/cli/commands/plan.ts`, with text and `--json` rendering.
- [x] T07.4 Upgrade `checkStateFiles` to report schema violations, keeping the existing invalid-JSON finding.
- [x] T07.5 Tests: unit for the report, end-to-end for text and JSON, and an integration check that `doctor` reports a schema-invalid state file.

## Acceptance criteria

- With a plan of five steps of which two are complete, `plan status --json` emits valid JSON listing all five steps, the active step, and the validity of both files.
- The text output labels every status in words, so meaning never depends on color, and honors `NO_COLOR`.
- The JSON document matches the published schema and carries the same findings as the text output.
- The last checkpoint's date and commit and the counts of constraints and decisions appear in both outputs.
- An invalid plan or checkpoint is reported as invalid with the file, field path, and rule, and the exit code reflects the error rather than success.
- With no plan present, the command explains that no plan exists instead of failing with a stack trace.
- `doctor` reports a schema-invalid state file, not only malformed JSON.

## Verification

- Unit: report construction for complete, partial, empty, and invalid inputs, with a git fake.
- Integration: `doctor` against fixture repositories holding a schema-invalid plan and a malformed one.
- End-to-end: built CLI for `plan status` and `plan status --json`, validating the document against the published schema.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: git on `PATH` for the commit-bearing scenarios; those cases skip with a stated reason otherwise.
- Expected evidence: schema-validated JSON output and text assertions including the status labels.

## Affected files

- Create: `src/core/services/plan-status.ts`, `tests/unit/plan-status.test.ts`, `tests/e2e/e2e-plan-status.test.ts`, `tests/integration/doctor-state-schema.test.ts`
- Modify: `src/core/contracts/diagnostics.ts`, `src/core/services/doctor-checks.ts`, `src/cli/commands/plan.ts`, `src/cli/output/text.ts`, `src/cli/output/json.ts`, `tests/test-lanes.ts`

## Observability and recovery

- Operational signal: this command is the user-facing progress and validity view.
- Recovery: read-only; it never writes either file.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `context-brake plan status` implemented with text status labels, `--json` parity matching `planStatusReportSchema`, divergence check against active git commit, clean missing-plan handling, and `doctor` state-file schema integrity validation.
- Changed files:
  - `src/core/contracts/diagnostics.ts`
  - `src/core/services/plan-status.ts`
  - `src/core/services/doctor-checks.ts`
  - `src/cli/plan-arguments.ts`
  - `src/cli/argument-parser.ts`
  - `src/cli/commands/plan.ts`
  - `src/cli/output/text.ts`
  - `src/cli/composition-root.ts`
  - `tests/unit/plan-status.test.ts`
  - `tests/unit/plan-arguments.test.ts`
  - `tests/unit/doctor-checks.test.ts`
  - `tests/integration/plan-status-command.test.ts`
  - `tests/integration/doctor-state-schema.test.ts`
  - `tests/e2e/e2e-plan-status.test.ts`
  - `tests/test-lanes.ts`
  - `tests/support/harness-simulator/scenarios.ts`
  - `tests/e2e/e2e-brake.test.ts`
- Checks: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run schemas:check`, `npm run dependencies:check`.
- Validated state: Node.js 20+, Windows (PowerShell), all 167 test files and 930 tests passing.
- Open items: None.

### ADR candidates

None - direct TechSpec implementation or local decision
