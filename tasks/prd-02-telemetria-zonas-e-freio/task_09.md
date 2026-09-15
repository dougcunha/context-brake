# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T09 — Simulated accuracy, end-to-end brake flow, and long-task efficacy

## Outcome

A deterministic simulator installs ContextBrake with the built CLI in temporary repositories and proves three acceptance criteria: the estimate stays within 10 percentage points of the tokenizer-backed measured value in simulated Pi and Oh-My-Pi sessions (CA-11); the built CLI drives a real session from green to critical with the documented block, deny, allowlist, and `doctor --json` output (CA-01, CA-14, CA-15, CA-17, CA-18); and 20 long-task sessions per full-level harness execute no out-of-allowlist call at or above the ceiling while every session saves the checkpoint and commits (CA-21).

## Dependencies and boundaries

- Depends on: T05, T08
- Unblocks: —
- In scope: `tests/support/harness-simulator/{scenarios,agent-profiles,process-driver,in-process-driver,session-recorder}.ts`, `tests/e2e/{e2e-simulated-usage,e2e-brake,e2e-simulated-long-task}.test.ts`, and any calibration of the estimation constants in the harness runtime descriptors.
- Out of scope: real harness runs and model compliance (explicitly out of scope in the PRD); harnesses whose measurement is not through the vendor API.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| CA-11, measurement objective | `prd.md#critérios-de-aceitação` | Estimate within 10 percentage points of measured |
| CA-01, CA-14, CA-15, CA-17, CA-18 | `prd.md#critérios-de-aceitação` | End-to-end block, deny, allowlist, cooperative finding, block record |
| CA-21, efficacy objective | `prd.md#critérios-de-aceitação` | No out-of-allowlist call above the ceiling; every session saves and commits |
| RF6, RF7, RF8, RF12, RF17, RF18, RF19, RF20, RF21 | `prd.md#principais-funcionalidades` | The obligations those criteria exercise end to end |
| DEC-05, DEC-06, DEC-08, DEC-10, DEC-11, DEC-19 | `techspec.md#technical-decisions` | Estimation and calibration; block, allowlist, mode, findings; simulator |
| CMP-26, CMP-27 | `techspec.md#components-and-flow` | Simulator support and acceptance suites |
| TC-13, TC-20 (end to end), TC-23, TC-27 | `techspec.md#test-approach` | The three acceptance suites |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/tests.md` (the built CLI runs as a child process against fixture repositories; fakes must follow documented formats; deterministic, no clock or network), `.agents/rules/node.md` (argument arrays for child processes), `.agents/rules/harness-adapters.md` (documented payload semantics), `.agents/rules/cli-output.md` (JSON parity and exit codes).
- Existing code: `tests/e2e/cli-runner.ts` (`runBuiltCli`), `tests/e2e/shell-runner.ts`, `tests/e2e/e2e-09.test.ts` (install and timing patterns); the built assets from T06 and T07; `js-tiktoken` from T02; the estimation constants in the harness runtime descriptors.
- Contract or integration: `techspec.md#contracts-and-data` for block, block message, and doctor findings; `techspec.md#test-approach` TC-13, TC-23, TC-27; `techspec.md#observability-and-rollout` for exit codes.
- Harness reference: all sections of `docs/research/harness-integrations.md` for the documented event and response formats the drivers honor.

## Work

- [ ] T09.1 Implement `scenarios.ts` and `agent-profiles.ts`: a fixed catalog of simulated sessions (code, JSON, log, and prose outputs; assistant text between calls; windows of 128,000 and 200,000 tokens) and agent behaviors (compliant, ignores yellow, ignores red, parallel batches, compaction, subagent, shell-operator tricks, writes outside the allowlist, injected failure above the ceiling).
- [ ] T09.2 Implement `process-driver.ts` and `in-process-driver.ts`: install with the built CLI in a temporary repository; for process harnesses spawn the installed hook with documented payloads and execute a simulated tool only when the documented response allows it; for Pi and Oh-My-Pi load the built extension with a mock API whose `getContextUsage()` returns the `o200k_base` count of the simulated context.
- [ ] T09.3 Implement `session-recorder.ts` and `tests/e2e/e2e-simulated-usage.test.ts` asserting, for every reading, `|measured − estimated| ≤ 10` percentage points; recalibrate `baselineTokens` and `tokensPerTurn` per harness if the bound fails and record the final constants.
- [ ] T09.4 Create `tests/e2e/e2e-brake.test.ts`: install Claude Code and Codex CLI, drive the installed Claude Code hook from `GREEN` to `CRITICAL` asserting the block at `YELLOW`/`RED`, the denied code read, and the allowed save sequence, then assert `doctor --json` carries `BRAKE_BLOCKS_RECORDED` and the `BRAKE_COOPERATIVE` finding for Codex CLI with exit code 1 and text/JSON parity.
- [ ] T09.5 Create `tests/e2e/e2e-simulated-long-task.test.ts`: 20 sessions for each full-level harness (Claude Code, Cursor, Copilot, Pi, Oh-My-Pi), recording attempted, executed, and denied calls, and asserting no non-allowlisted call executes at or after `CRITICAL`, the save sequence completes, the checkpoint parses, and the `checkpoint:` commit exists when the protocol instructs it.

## Acceptance criteria

- The simulator installs the built CLI, drives at least one process harness and both in-process measured harnesses, and produces identical ledgers across repeated runs with no network, wall-clock dependency, or prompt content.
- Every simulated usage reading reports `source=estimated` with the measured API value in the same ledger line; the difference never exceeds 10 percentage points.
- The E2E brake run produces the exact documented block and deny responses, leaves the repository byte-stable outside ContextBrake-owned files, and `doctor --json` validates against the published schema with the same findings as the text output.
- In all long-task sessions of the five full-level harnesses, no out-of-allowlist call runs at or after the ceiling, the save sequence completes, and the checkpoint parses; a session whose fixture is missing is skipped with the reason recorded, never silently passed.
- Temporary repositories are removed per test.

## Verification

- Unit: not applicable — the simulator is test support consumed by its suites.
- Integration: not applicable.
- End-to-end: `tests/e2e/e2e-simulated-usage.test.ts`, `tests/e2e/e2e-brake.test.ts`, `tests/e2e/e2e-simulated-long-task.test.ts` (built CLI plus built assets in temporary repositories).
- Manual: none; the simulated scope is the PRD's acceptance mechanism.
- Platforms: Linux, macOS, Windows (PowerShell and Git Bash launchers where the existing E2E matrix requires them).
- Commands: `npm run build`, `npx vitest run tests/e2e/e2e-simulated-usage.test.ts tests/e2e/e2e-brake.test.ts tests/e2e/e2e-simulated-long-task.test.ts`, `npm run coverage`
- Environment dependency: none; no real harness, credential, or network is required.
- Expected evidence: the three suites passing with the calibration constants, the per-harness session counts, and the executed/denied record.

## Affected files

- Create: `tests/support/harness-simulator/{scenarios,agent-profiles,process-driver,in-process-driver,session-recorder}.ts`, `tests/e2e/{e2e-simulated-usage,e2e-brake,e2e-simulated-long-task}.test.ts`
- Modify: `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` only if recalibration is required; `tests/test-lanes.ts` if the support files need lane registration

## Observability and recovery

- Operational signal: a failed session prints the attempted, executed, and denied calls per harness, and the accuracy margin per reading; the constants are the tunable knob.
- Recovery: reverting the constants restores the previous estimates; temporary repositories are removed per session and no user file is touched.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
