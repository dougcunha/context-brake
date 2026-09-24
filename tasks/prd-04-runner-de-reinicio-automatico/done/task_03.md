# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Preflight, approval model, and runner prompt

## Outcome

`core` can:

- Tell whether a plan is runnable (DEC-21).
- List the validation command of each non-completed step with its approval hash (DEC-10).
- Report which hashes are unapproved in a given approval set.
- Render the exact versioned runner prompt, including the previous-failure clause and its budget (DEC-03).

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T04
- In scope: `run-preflight.ts` and `runner-prompt.ts`, with unit tests that assert exact text.
- Out of scope: persisting approvals (T05) and prompting the user (T08).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF2, RF14 | `prd.md#execução-de-sessões`, `#segurança-da-execução` | Boot routine reference; confirmation listing |
| CA-02, CA-10 | `prd.md#critérios-de-aceitação` | Next session receives the validation result; nothing runs without confirmation |
| DEC-03, DEC-10, DEC-21 | `techspec.md#technical-decisions` | Prompt, hashes, runnable plan |
| CMP-04, CMP-05 | `techspec.md#components-and-flow` | Preflight and prompt |
| TC-02, TC-07, TC-08 | `techspec.md#test-approach` | Unit scenarios |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`
- Existing code:
  - `src/core/services/reset-notice.ts:1`: the signal constant.
  - `src/core/services/boot-summary.ts`: the token estimation behind the budgets.
  - `src/core/validation/plan-validator.ts`.
- Contract: `techspec.md#contracts-and-data` (runner prompt text and budget)

## Work

- [x] T03.1 Implement the runnable-plan checks:
  - List steps that lack a validation command.
  - Report a complete plan.
  - Delegate an invalid plan to the PRD-03 validator.
- [x] T03.2 Implement `approvalHash(taskId, stepId, command)` behind a hasher port in `run-ports.ts`, so `core` never imports `node:crypto` directly. Add the function that lists unapproved commands.
- [x] T03.3 Implement the runner prompt:
  - `RUNNER_PROMPT_VERSION = 1`.
  - The failure clause, with the tail truncated to 2,000 characters.
  - A test that the reference prompt stays within 800 estimated tokens.

## Acceptance criteria

- The same command text in the same step yields the same hash; any character change yields a new hash.
- The prompt text matches the TechSpec template exactly for a reference fixture, both with and without a previous failure.
- `core` imports no `infrastructure` or `cli` module (QA-05).

## Verification

- Unit: TC-07 (listing), TC-08, and the prompt's exact text and budget.
- Integration: not applicable.
- End-to-end: covered by T09 (CA-10 and CA-02).
- Platforms: platform-independent.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: `tests/unit/run-preflight.test.ts` and `tests/unit/runner-prompt.test.ts` green.

## Affected files

- Create: `src/core/services/run-preflight.ts`, `src/core/services/runner-prompt.ts`, `tests/unit/run-preflight.test.ts`, `tests/unit/runner-prompt.test.ts`
- Modify: `src/core/contracts/run-ports.ts` (hasher port)

## Observability and recovery

- Operational signal: none.
- Recovery: none needed.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - **`run-preflight.ts` (CMP-04, DEC-10, DEC-21).**
    - `assessPlan(input, filePath)` parses through `parseTaskPlan`, so an invalid plan throws the PRD-03 `InvalidPlanError` with the file and rule. It then returns `complete` when no step is open (including an empty plan, "nothing to run"), `missing_commands` with the open step ids whose `validationCommand` is null or blank, or `runnable`. Each result carries the parsed plan.
    - `approvalHash` returns `hasher.sha256(JSON.stringify([taskId, stepId, command]))`. The array encoding keeps field boundaries unambiguous and keeps `1` distinct from `"1"`.
    - `listValidationCommands` lists the command and hash of each open step. `unapprovedCommands` filters by the hashes in `ApprovalsFile`.
  - **`runner-prompt.ts` (CMP-05, DEC-03).**
    - `RUNNER_PROMPT_VERSION = 1`. `renderRunnerPrompt` renders the TechSpec template exactly, using `SESSION_RESET_SIGNAL`.
    - The failure clause is `The last validation of this step failed (exit <code>|exit unknown|timed out). Output tail:
<tail>
`. The tail is truncated to its last 2,000 characters.
  - **Hasher port.** `Hasher` was added to `run-ports.ts`, so `core` imports no `node:crypto`. The tests use a `node:crypto` fake.
- Changed files:
  - Created `src/core/services/run-preflight.ts` (44 lines) and `src/core/services/runner-prompt.ts` (32 lines).
  - Created `tests/unit/run-preflight.test.ts` and `tests/unit/runner-prompt.test.ts`.
  - Modified `src/core/contracts/run-ports.ts` (86 lines).
- Checks:
  - `npm run typecheck`: clean.
  - `npm run build`: exit 0.
  - `npm run lint`: the same 14 pre-existing errors in prd-03 QA evidence, with none in T03 files.
  - `npm run coverage`: exit 0. 180 files and 1,091 tests passed, both services are at 100% on every metric, and the overall statement coverage is 93.76%.
  - Measured prompt size (o200k_base): 78 tokens without a failure, and 717 tokens with the reference 2,000-character test-output tail, against a budget of 800.
- Validated state: Git base `eb2f386` with the T01–T03 changes uncommitted, on Windows 11 with Git Bash, Node v24.19.0, and npm 11.17.0.
- Quality profile:
  - QA-01–QA-07: empty, and `core` has no `node:crypto` import.
  - QA-08: no declaration with 4 or more parameters. The largest file is `run-ports.ts` at 86 lines.
  - No reservation hits.
- Open items:
  1. **Budget scope.** The 800-token budget holds for the reference fixture, as specified. A pathological 2,000-character tail, such as dense non-ASCII text, could exceed it, because truncation is by characters, as the TechSpec states.
  2. **For T04 and T08.** `assessPlan` covers the plan only. DEC-21's checkpoint validation reuses the existing `parseStateCheckpoint` / `assertCheckpointMatchesPlan` at the call site.
  3. **For T05.** `Hasher` needs a `node:crypto` implementation in `infrastructure`.

### ADR candidates

None - direct TechSpec implementation or local decision.
