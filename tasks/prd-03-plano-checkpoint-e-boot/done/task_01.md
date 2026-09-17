# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Plan and checkpoint entities, schemas, and validators

## Outcome

`task_plan.json` and `state_checkpoint.json` have versioned entity definitions, `zod/mini` schemas, and strict validators that reject inconsistent files with errors naming the file, the field path, and the violated rule.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T03, T04, T08
- In scope: entity types, schemas, the `PlanStore` and `CheckpointStore` port declarations, strict validation including cross-field consistency, and dedicated error classes.
- Out of scope: reading or writing files (T02), git fields' meaning (T03), JSON Schema publication (T08), and any change to `NodePlanValidationReader`, which stays tolerant by `DEC-06`.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF4 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Plan fields: task, current step, and per-step id, title, description, status, validation command, artifacts |
| RF5 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Checkpoint fields: git state, working memory, modified files, timestamp |
| RF7 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Unique ids, at most one `IN_PROGRESS`, active step present in the plan |
| RF8 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Accept the known schema version or name the required migration |
| CMP-01, CMP-02, CMP-04, CMP-05 | `techspec.md#components-and-flow` | Entities, schemas, and validators |
| DEC-06, DEC-07, DEC-08 | `techspec.md#technical-decisions` | Tolerant reader preserved; issue-list errors; `schemaVersion: 1` |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/javascript-typescript.md` (Zod for all external data, literal unions, dedicated error classes), `code-standards.md` (100-line files, 30-line functions), `tests.md`.
- Existing code: `src/core/contracts/session-ledger.ts` — the `zod/mini` schema and literal-union convention to mirror; `src/core/contracts/configuration.ts:56` — `strictObject` style.
- Existing code: `src/core/validation/configuration-validator.ts` — the exact `{path, received, rule}` issue shape and error class to mirror for both files.
- Existing code: `src/infrastructure/runtime/plan-validation-reader.ts` — the tolerant reader that must keep working unchanged.
- Contract or integration: `techspec.md#contracts-and-data`.

## Work

- [x] T01.1 Add `src/core/contracts/task-plan.ts`: `PLAN_STEP_STATUSES` literal union, step and plan types, `zod/mini` schema with `schemaVersion: 1`, and the `PlanStore` port.
- [x] T01.2 Add `src/core/contracts/state-checkpoint.ts`: checkpoint type, git-state and working-memory shapes with nullable git fields, schema, and the `CheckpointStore` port.
- [x] T01.3 Add `src/core/validation/plan-validator.ts`: strict parse plus consistency rules, raising a dedicated error carrying the issue list.
- [x] T01.4 Add `src/core/validation/checkpoint-validator.ts`: strict parse plus the cross-file rule that the active step exists in the plan.
- [x] T01.5 Unit tests for valid files, each consistency rule, syntax errors, and an unknown `schemaVersion`.

## Acceptance criteria

- A plan with two `IN_PROGRESS` steps fails validation and the error names the violated rule.
- A plan whose `currentStepId` is absent from `steps` fails validation.
- Duplicate step ids fail validation.
- A step without a validation command is valid, since the PRD lists it as an edge case rather than an error.
- A checkpoint whose `activeStepId` is absent from the plan fails the cross-file check.
- A file with an unrecognized `schemaVersion` produces an error naming the required migration, never a silent acceptance.
- Every error exposes file, field path, and rule; no generic `Error` is thrown.

## Verification

- Unit: valid and invalid plans and checkpoints, each consistency rule, missing optional fields, and version mismatch.
- Integration: not applicable; this task adds no adapter.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: passing unit suites for both validators and coverage at or above the 80% threshold.

## Affected files

- Create: `src/core/contracts/task-plan.ts`, `src/core/contracts/state-checkpoint.ts`, `src/core/validation/plan-validator.ts`, `src/core/validation/checkpoint-validator.ts`, `tests/unit/plan-validator.test.ts`, `tests/unit/checkpoint-validator.test.ts`
- Modify: —

## Observability and recovery

- Operational signal: validation issues surface through the error's issue list, consumed by the CLI in T02 and T07.
- Recovery: pure additions; removing the new files restores the prior state.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `task_plan.json` and `state_checkpoint.json` have versioned `zod/mini` schemas (`schemaVersion: 1`), strict validators raising dedicated errors that carry a `{path, received, rule}` issue list, and the `PlanStore` / `CheckpointStore` port declarations. Consistency rules enforced: unique step ids, at most one `IN_PROGRESS`, `currentStepId` present in `steps`, and the cross-file rule that `activeStepId` exists in the plan. A non-matching `schemaVersion` reports the required migration (RF8, CA-16) instead of a bare type error. Step-selection helpers (`findActiveStep`, `findNextStep`, `findLastCompletedStep`, `isPlanComplete`) are included for T04's boot. `NodePlanValidationReader` was deliberately left untouched, keeping the runtime path tolerant per `DEC-06`.
- Changed files: created `src/core/contracts/task-plan.ts`, `src/core/contracts/state-checkpoint.ts`, `src/core/validation/plan-validator.ts`, `src/core/validation/checkpoint-validator.ts`, `src/core/validation/issues.ts`, `tests/unit/plan-validator.test.ts`, `tests/unit/checkpoint-validator.test.ts`. No existing file was modified.
- Checks: `npm run lint` → `ESLint: No issues found`. `npm run typecheck` → clean. `npm run build` → succeeded. `npm run coverage` → exit code 0, 148 test files, 834 tests passed, 93.27% statements overall (threshold 80); `core/contracts` 98.9%, `core/validation` 88.34%, `state-checkpoint.ts` 100%, `task-plan.ts` 95.16%, validators 83.78% / 100% / 85.18%, `issues.ts` 90.47%. Baseline before this task was 146 files / 813 tests, so the delta is exactly the +2 files / +22 tests added here. Provenance: the full-suite coverage run executed at the state immediately before one final additive unit test (`findNextStep` with no active step); after adding it, `npm run lint`, `npm run typecheck`, and `npx vitest run` over `plan-validator`, `checkpoint-validator`, and `test-lanes` were re-run → 3 files, 26 tests passed. The full suite was not re-run for that one pure, additive unit-lane test.
- Validated state: Git base `86961bb` with T01 changes uncommitted; pre-existing prd-02 closure files preserved untouched. Windows 11, Git Bash, Node v24.19.0, npm 11.17.0. Linux and macOS remain unverified, consistent with `PI-03` and prd-02 `O-04`.
- Quality profile: blocking rules `QA-01`–`QA-05` all returned empty over the task diff; reservations `QA-06` (generic `throw new Error(`) and `QA-08` (clock or randomness in `core`) also empty; `QA-07` largest touched file is 86 lines against the 100-line limit. No new or aggravated hit, and nothing charged against the Terrain baseline. One transient lint failure (`max-lines-per-function`, a 36-line `describe` in `plan-validator.test.ts`) was introduced and fixed within the task by splitting it into `task plan contract` and `task plan consistency rules`.
- Open items:
  1. **Deviation disclosed:** `src/core/validation/issues.ts` was added although `task_01.md` listed no such file. It holds the shared issue-shape helpers so the two new validators do not duplicate them; without it the same block would appear in three places and trip the escalation trigger. Same layer, no contract or scope change.
  2. `src/core/validation/configuration-validator.ts` keeps its own private `toIssue` / `valueAtPath`. Adopting `issues.ts` there is a possible later cleanup, deliberately left out because T01 only reads that file and preparatory-refactoring rules exempt read-only code.
  3. Uncovered lines are the syntax-error helpers and the non-matching rethrow branches (`issues.ts:21-22`, and the syntax/rethrow paths in both validators). T02's stores are their first real callers and will exercise them; tests were not added now to avoid raising coverage without proving behavior.
  4. `PlanStore` and `CheckpointStore` are declared but unimplemented until T02, as scoped.

### ADR candidates

None - direct TechSpec implementation or local decision.
