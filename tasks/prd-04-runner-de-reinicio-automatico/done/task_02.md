# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Session evaluation and run limits

## Outcome

Pure `core` services decide three things for a finished session:

- Whether to stop without writing because no fresh checkpoint exists (RF9).
- What the plan becomes after the validation outcome. On a pass, the step advances. On a fail, unvalidated `COMPLETED` and `FAILED` statuses are reverted and the corrections are listed.
- Whether the anti-loop or any limit stops the run, before or during a session.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T04
- In scope: `session-evaluation.ts` and `run-limits.ts`, with unit tests that use in-memory plans and an injected clock.
- Out of scope: running the validation command (T05), writing files (T04 and T05), and the loop itself (T04).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF4, RF5, RF9 | `prd.md#avanço-de-passos`, `#limites-e-condições-de-parada` | Advancement, corrections, missing checkpoint |
| RF7, RF8 | `prd.md#limites-e-condições-de-parada` | Ceilings and anti-loop |
| DEC-07, DEC-09 | `techspec.md#technical-decisions` | Evaluation order; limit enforcement points |
| CMP-06, CMP-07 | `techspec.md#components-and-flow` | Evaluation and limits services |
| TC-02, TC-03, TC-04, TC-05, TC-06 | `techspec.md#test-approach` | Unit scenarios |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`
- Existing code:
  - `src/core/contracts/task-plan.ts`: `findActiveStep`, `findNextStep`, and the step statuses.
  - `src/core/validation/plan-validator.ts` and `checkpoint-validator.ts`.
  - `src/core/services/reset-notice.ts`: `hasResetSignal`.
- Contract: `techspec.md#technical-decisions` DEC-07, DEC-09

## Work

- [x] T02.1 Implement checkpoint freshness (`valid && timestamp ≥ sessionStart`) and the RF9 stop decision keyed by end reason.
- [x] T02.2 Implement plan reconciliation on a pass without mutating the input. The assigned step becomes `COMPLETED`, the next non-completed step becomes `IN_PROGRESS`, and `currentStepId` points to it.
- [x] T02.3 Implement corrections on a fail, and for any other step the agent completed without a runner-recorded pass; return `statusCorrections`.
- [x] T02.4 Implement the limit checks:
  - Pre-session checks.
  - The session deadline, `min(session, total)`.
  - The token-total check.
  - The consecutive-failure counter per step.

## Acceptance criteria

- Evaluation never proposes a plan write when it returns `no_checkpoint`.
- Reconciled plans pass the PRD-03 strict validator: a single `IN_PROGRESS` step and a valid `currentStepId`.
- Anti-loop behavior with a limit of 2:
  - A failure, then a pass, then a failure on another step does not trigger it.
  - Two consecutive failures of the same step do.
- Each limit stop names the limit that fired. When the last step completes, the stop is `completed`, even if a limit would also fire.

## Verification

- Unit: TC-02 (evaluation part), TC-03, TC-04, TC-05 (limits part), and TC-06; boundary values at exactly the limit.
- Integration: not applicable.
- End-to-end: covered later by T09.
- Platforms: platform-independent.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: `tests/unit/session-evaluation.test.ts` and `tests/unit/run-limits.test.ts` green, citing the TC IDs.

## Affected files

- Create: `src/core/services/session-evaluation.ts`, `src/core/services/run-limits.ts`, `tests/unit/session-evaluation.test.ts`, `tests/unit/run-limits.test.ts`

## Observability and recovery

- Operational signal: the services return corrections and stop reasons for the log (T04 and T05).
- Recovery: none needed (pure code).

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - **`session-evaluation.ts` (CMP-06, DEC-07).**
    - `isCheckpointFresh` requires a checkpoint that is present, strictly valid (the caller passes `null` for missing or invalid), consistent with the plan (`checkpointAgainstPlanIssues`), and timestamped at or after the session start.
    - `decideSessionGate` returns `no_checkpoint` for an invalid plan (the invalid state folds into `no_checkpoint`), or for a non-`reset_signal` end without a fresh checkpoint. Otherwise it returns `step_removed` when the assigned step is no longer in the plan, or `validate`. The gate never proposes a write.
    - `reconcilePlan` is pure and works in two phases over the post-session plan. First it reverts statuses: the assigned step becomes `COMPLETED` on a pass, or moves from `COMPLETED` or `FAILED` back to `IN_PROGRESS` on a fail, and any other step completed without a prior `COMPLETED` returns to its status at session start (`PENDING` for steps the agent added). Then it normalizes to one `IN_PROGRESS` step: on a pass, the next open step after the assigned one, else the first open step, else `null`. `statusCorrections` comes from diffing both phases, excluding the runner's own transitions, and `changed` tells the caller whether a write is needed.
  - **`run-limits.ts` (CMP-07, DEC-08, DEC-09, RF8).**
    - `recordValidation` / `isRepeatedFailure`: the failure streak per step. A pass or a different step resets it.
    - `exceededRunLimit` checks `maxSessions`, then `maxTotalMinutes`, then `maxTotalTokens`, each with `>=`.
    - `decideBeforeSession` checks completion first, then `repeated_failure`, then `limit_reached` with the limit named.
    - `sessionDeadline` returns `min(session, total)` tagged with the limit that set it. `sessionLimitEnd` returns `token_limit`, `run_timeout`, or `session_timeout`, and `runLimitForEnd` maps the end reasons to a run limit.
- Changed files:
  - Created `src/core/services/session-evaluation.ts` (76 lines) and `src/core/services/run-limits.ts` (63 lines).
  - Created `tests/unit/session-evaluation.test.ts`, `tests/unit/session-corrections.test.ts`, `tests/unit/run-limits.test.ts`, and `tests/helpers/run-plans.ts`.
- Checks:
  - `npm run typecheck`: clean.
  - `npm run build`: exit 0.
  - `npm run lint`: the same 14 pre-existing errors in `tasks/prd-03-plano-checkpoint-e-boot/qa_01/evidence/*.mjs`, with none in T02 files.
  - `npm run coverage`: exit 0. 178 files and 1,065 tests passed. `session-evaluation.ts` and `run-limits.ts` are at 100% statements, branches, and functions, and the overall statement coverage is 93.72%.
  - The TC coverage is TC-02 (evaluation part), TC-03, TC-04, TC-05 (limits part), and TC-06, with boundaries at exactly each limit and at the session-start timestamp.
- Validated state: Git base `eb2f386` with the T01 and T02 changes uncommitted, on Windows 11 with Git Bash, Node v24.19.0, and npm 11.17.0.
- Quality profile:
  - QA-01–QA-07: empty over the six files.
  - QA-08: no declaration with 4 or more parameters. The largest file is `run-limits.test.ts` at 78 lines.
  - No reservation hits.
  - Lint caught and the task fixed a nested arrow in `session-evaluation.ts` (`no-restricted-syntax`) and the test-file size limits. The fix split the tests into `session-corrections.test.ts` and moved the shared fixtures to `tests/helpers/run-plans.ts`.
- Open items:
  1. **Interpretation (`session_timeout`).** It ends only the session. `runLimitForEnd` returns `null`, so the run continues through the normal gate: without the reset signal, a stale checkpoint stops with `no_checkpoint`. `run_timeout` and `token_limit` map to `maxTotalMinutes` and `maxTotalTokens` for `limit_reached`. T04 must evaluate the session before applying the limit, so that a final step completed in that session reports `completed`.
  2. **Interpretation (`step_removed`).** It is a gate outcome that DEC-07 does not name. It implements "a removed active step ends the session evaluation with a plan re-read" from the Errors section. T04 decides what follows: re-read, with no validation and no anti-loop count.
  3. **Interpretation (limit comparisons).** Limits compare with `>=`, so reaching a ceiling exactly stops the run.
  4. **For T04.** Reconciliation reverts other steps to their status at session start, so T04 must pass the plan as it was snapshotted when the session began.
  5. **Extra file.** `tests/helpers/run-plans.ts` was added outside the task's file list, as shared fixtures for the three test files. It is test-only.

### ADR candidates

None - direct TechSpec implementation or local decision.
