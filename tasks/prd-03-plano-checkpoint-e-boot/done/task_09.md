# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T09 — Simulated boot and long-task acceptance

## Outcome

Simulated sessions prove that an agent using only the boot runs the indicated validation command within three tool calls before editing, and that agents following the protocol reach the red zone leaving a valid checkpoint and a `checkpoint:` commit with a clean working tree.

## Dependencies and boundaries

- Depends on: T05, T06
- Unblocks: —
- In scope: extending the existing harness simulator with boot-driven new sessions, documented post-compaction delivery in Claude Code, Codex CLI, Pi, and Oh-My-Pi, and the red-zone checkpoint routine, then asserting the acceptance criteria.
- Out of scope: measuring real model adherence, which the PRD excludes under "Verificação por simulação", and automatic session restart, which belongs to the runner PRD.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF15 | `prd.md#verificação-do-estado-herdado` | Run the validation command before any edit and fix inherited state on failure |
| RF9, CA-05, DEC-15 | `prd.md#boot-no-início-da-sessão`, `techspec.md#technical-decisions` | Simulate new-session boot on all six supported harnesses and post-compaction boot only on the four documented channels |
| CA-11 | `prd.md#critérios-de-aceitação` | Validation command run within three tool calls, before any edit |
| CA-17 | `prd.md#critérios-de-aceitação` | 20 simulated sessions per full-level harness leave a valid checkpoint and a prefixed commit |
| TC-11, TC-17 | `techspec.md#test-approach` | Simulated boot adherence and long-task acceptance |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/tests.md` (repeatable, self-validating, own temporary directory, platform matrix), `harness-adapters.md`.
- Existing code: `tests/support/harness-simulator/` — built by prd-02; `scenarios.ts` holds the catalog, seed, and call builders, `agent-profiles.ts` the scripted profiles, `process-driver.ts` the documented payloads and response parsing, `in-process-driver.ts` the built-extension mock, and `session-recorder.ts` the recorder, ledger, and git helpers.
- Existing code: `tests/e2e/e2e-simulated-long-task.test.ts` — the existing long-task suite; prd-02 recorded that it runs 100 concurrent tests in roughly 128 seconds on Windows, so narrow with `-t "<harness>"` while iterating.
- Existing code: `tests/helpers/git-capability.ts` — `runGit` and the skip policy to reuse rather than duplicate.
- Existing code: `tests/test-lanes.ts` — end-to-end suites register through the `tests/e2e/` directory glob; unit files must avoid the process-lane marker strings.

## Work

- [x] T09.1 Extend the simulator so a new session delivers the boot on each supported harness and the scripted agent acts only on its content; add post-compaction scenarios for Claude Code, Codex CLI, Pi, and Oh-My-Pi.
- [x] T09.2 Add a boot-adherence profile asserting the validation command runs within three tool calls, before any edit.
- [x] T09.3 Extend the red-zone profile to write both files, run validation, and commit with the `checkpoint:` prefix.
- [x] T09.4 Assert across the full-level harnesses that each session ends with a valid checkpoint, a prefixed commit, and a clean tree with both files updated.

## Acceptance criteria

- In a simulated session seeded with an in-progress plan, the agent that reads only the boot runs the indicated validation command within three tool calls and performs no edit before it.
- The simulator asserts boot delivery on new sessions for all six supported harnesses and after compaction for Claude Code, Codex CLI, Pi, and Oh-My-Pi; it does not claim reinjection for Cursor or GitHub Copilot CLI after compaction.
- Across 20 simulated sessions per full-level harness, every session leaves a checkpoint passing the T01 validators.
- Every such session produces a commit whose message begins with `checkpoint:` followed by the step title.
- After each session the working tree is clean and both state files are updated, with neither file included in the commit.
- No session is blocked by the brake while performing the red-zone save, since the critical allowlist already permits the plan and checkpoint writes, the validation command, and the git commands.
- Simulated sessions remain deterministic, using fixed clocks and seeded ledgers rather than wall-clock time or randomness.

## Verification

- Unit: not applicable.
- Integration: not applicable; this task exercises whole simulated sessions.
- End-to-end: the simulated boot suite and the extended long-task suite, run against fixture repositories in temporary directories.
- Manual: none.
- Platforms: Linux, macOS, Windows; local evidence is expected on Windows only, and the cross-platform matrix remains the open item carried from prd-02.
- Commands: `npm run build`, `npm test`, `npm run coverage`
- Environment dependency: git on `PATH` for the commit assertions; suites skip with a stated reason when git is unavailable. No real Pi, Oh-My-Pi, or OpenCode installation exists, so those harnesses are exercised through documented fixtures only.
- Expected evidence: per-harness session counts, the tool-call index at which validation ran, and the recorded commit messages.

## Affected files

- Modify: `tests/support/harness-simulator/scenarios.ts`, `tests/support/harness-simulator/agent-profiles.ts`, `tests/support/harness-simulator/session-recorder.ts`, `tests/e2e/e2e-simulated-long-task.test.ts`
- Create: `tests/e2e/e2e-simulated-boot.test.ts`

## Observability and recovery

- Operational signal: session recordings name the harness, the tool-call sequence, and the resulting commit.
- Recovery: tests run in temporary directories removed at the end; no repository state persists.

## Handoff

- Produced result: Extended harness simulator drivers (`process-driver.ts`, `in-process-driver.ts`, `session-recorder.ts`, `agent-profiles.ts`, `scenarios.ts`) to simulate startup boot on all 6 harnesses, compaction boot delivery on 4 harnesses, non-delivery on Cursor and Copilot CLI, and red-zone save sequence writing both `task_plan.json` and `state_checkpoint.json` with commit subject `checkpoint: step 1`. Created `tests/e2e/e2e-simulated-boot.test.ts` asserting boot delivery across all harnesses and validation command execution within 3 tool calls before edit. Updated `tests/e2e/e2e-simulated-long-task.test.ts` asserting clean working tree, checkpoint schema validity, commit subject format, and exclusion of state files from git commits across 20 simulated sessions per full-level harness.
- Changed files:
  - `tests/support/harness-simulator/session-recorder.ts`
  - `tests/support/harness-simulator/process-driver.ts`
  - `tests/support/harness-simulator/in-process-driver.ts`
  - `tests/support/harness-simulator/scenarios.ts`
  - `tests/support/harness-simulator/agent-profiles.ts`
  - `tests/e2e/e2e-simulated-boot.test.ts`
  - `tests/e2e/e2e-simulated-long-task.test.ts`
- Checks: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run dependencies:check`, `npm run build`, `npm run package:smoke`, `npm test` (168 test files, 946 tests passed), `npm run coverage` (all suites passing with coverage criteria met).
- Validated state: Node.js 20+, Windows 11 (PowerShell/cmd), Vitest 3.2.7. All 20 sessions per full-level harness verified with valid checkpoints, prefixed commits, and clean working trees.
- Open items: Multi-platform matrix (Linux, macOS) remains in CI per prd-02.
- ADR candidates: None - direct TechSpec implementation or local decision.

### Correction reconciliation (CR-02, CR-03; T11 after T12)

- The original clean-tree claim above was incomplete: `codereview_01/codereview.md` found that `failure_above_ceiling` could leave `context-brake.config.json` modified in a counted session. The earlier passing suite did not prove CA-17 for every session.
- `codereview_01/done/task_12.md#Handoff` records the correction. The test now captures and restores the exact installed configuration after asserting `INVALID_CONFIG`, then requires an empty `git status --porcelain` for every counted session. Checkpoint validity, the `checkpoint: step 1` commit, and exclusion of both state files from the commit remain asserted.
- Current evidence: `npm run coverage -- --maxWorkers=2` passed the full suite, including 20 sessions for each of the five full-level harnesses; all five `failure_above_ceiling` sessions finished with a clean tree. T12 also passed build, lint, typecheck, and `git diff --check`. This is Windows 11 / Node 24 evidence; the Linux/macOS and Node 20/22 matrix remains open.
- T09 was reopened for CR-03 and closed again on T12's corrected CA-17 evidence. T11 repaired its manifest link to this file. The immutable first review remains `REJECTED` until independent re-review.
