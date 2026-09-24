# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T09 — End-to-end acceptance

## Outcome

The built CLI, with the fake harness on `PATH`, demonstrates CA-01–CA-14:

- Step completion, with corrections and retries.
- Every stop condition, with its exit code and preserved state.
- Ctrl+C that leaves no surviving harness process, followed by a second run that resumes.
- The 20×10 autonomy objective.
- Step approval without a TTY.
- `wrap` telemetry inside a runner session.

## Dependencies and boundaries

- Depends on: T08
- Unblocks: —
- In scope:
  - Fake-harness scenarios: complete a step, fail validation, false completion, no checkpoint, hang, cross the ceiling through the built hooks, non-zero exit, and call `wrap`.
  - Fixture repositories.
  - TC-20–TC-24.
- Out of scope: real harnesses. The optional manual acceptance is recorded in the TechSpec.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| CA-01–CA-14 | `prd.md#critérios-de-aceitação` | All acceptance criteria end to end |
| Objectives | `prd.md#objetivos` | Autonomy, independent validation, safe stop, limits, anti-loop, calibration |
| DEC-22 | `techspec.md#technical-decisions` | Fake harness |
| TC-20–TC-24 | `techspec.md#test-approach` | End-to-end scenarios |

## Context to recover on demand

- Applicable rules: `tests.md`, `node.md`
- Existing code:
  - `tests/e2e/e2e-simulated-long-task.test.ts`: long simulated runs, and how they are sized.
  - `tests/support/harness-simulator/process-driver.ts`.
  - `tests/test-lanes.ts`.
- Contract: `techspec.md#test-approach`, and the TechSpec risk "20×10 autonomy test duration"

## Work

- [x] T09.1 Extend the fake harness with scenario-driven agent behavior, invoking the built hooks for `SessionStart` and one `PostToolUse` per session.
- [x] T09.2 Write TC-20 and TC-21: steps, corrections, retries, and the four stop conditions, checking plan bytes for CA-06.
- [x] T09.3 Write TC-22 and verify the resume. It sends SIGINT on POSIX; on Windows it is skipped with the reason, and `tests/unit/shutdown.test.ts` covers the behavior.
- [x] T09.4 Write TC-23 (a 10-step plan × 20 runs, with no input) and TC-24 (`--approve-steps` without a TTY, and the `wrap` block).
- [x] T09.5 Run the full gate serialized, and record timings and platform limits in the handoff.

## Acceptance criteria

- 20 of 20 autonomy runs exit 0 with all steps completed.
- After SIGINT: exit 130, no fake-harness pid alive, and a valid plan and checkpoint. The next run completes from the pending step.
- CA-06: the plan and checkpoint bytes are identical before and after the stop.
- CA-12: the wrapped command's output is followed by that session's telemetry block.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: TC-20–TC-24 against fixture repositories with the built CLI.
- Manual: an optional run on a real harness (TechSpec "Manual acceptance"), owned by the user; not a gate.
- Platforms: Linux, macOS, and Windows specified; local evidence is Windows / Node 24 (PI-03).
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none beyond Git and Node.
- Expected evidence: the end-to-end suites green in serialized `npm test` and `npm run coverage` runs (≥ 80%).

## Affected files

- Modify: `tests/support/fake-harness/*`
- Create:
  - Tests: `tests/e2e/e2e-run-steps.test.ts`, `e2e-run-stops.test.ts`, `e2e-run-interrupt.test.ts`, `e2e-run-autonomy.test.ts`, `e2e-run-approval-wrap.test.ts`.
  - Fixture repositories under `tests/fixtures/runner/`.

## Observability and recovery

- Operational signal: test timings recorded in the handoff.
- Recovery: none needed.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the built CLI demonstrates CA-01–CA-14 end to end against the fake harness (DEC-22, TC-20–TC-24).
  - **Fake harness (T09.1).**
    - `fake-harness.mjs` now follows a per-session script. A counter file next to the scenario numbers the sessions, and `sessions[n-1]` overrides the scenario defaults for session `n`.
    - The default session id is `fake-session-<n>`, so each session gets its own ledger. Session 1 keeps the old `fake-session-1`.
    - `fake-agent.mjs` holds the agent behavior. It reads the active step from the runner prompt. It runs the installed hook script (`.claude/hooks/context-brake.mjs` or `.codex/hooks/context-brake.mjs`, as written by `context-brake init`) for `SessionStart` (source `startup`) and for one `PostToolUse` per session, with the harness payload on stdin.
    - Optional agent actions: write `work/step-<id>.txt` (`work`), mark the step `COMPLETED` (`markComplete`), write a fresh checkpoint (`checkpoint`), size the `PostToolUse` output (`toolCharacters`), and call the built `context-brake wrap` (`wrap`). Before calling `wrap`, the agent waits until `run.json` names its session.
    - A `journal` JSONL line per session records the index, session id, step, prompt, run id, and boot hook output. `hang.pidFile` is now optional.
    - `FakeSession` and `FakeScenario` in `install.ts` describe the new fields. `useScenario` resets the counter and sets the journal.
  - **Fixture and helpers.**
    - `tests/fixtures/runner/acceptance-project/` is the fixture repository.
    - `tests/helpers/run-acceptance.ts` copies the fixture and runs the built `init --yes --harness <h>` on a sealed `PATH`. It then sets `runner.criticalGraceSeconds` to 1 and writes the plan. It also provides `workCommand`, `workSteps`, `runAcceptance` (with `--approve-commands --json`, parsing the summary), `readJournal`, `readStateBytes`, and `readRunRecord`.
    - Every run goes through `runEnvironment`, the sealed `PATH` with the real-harness guard (L-10).
  - **Suites (T09.2–T09.4).**
    - `e2e-run-steps.test.ts` (TC-20): a 3-step plan on both harnesses, with a false completion followed by a retry, and the boot in every session.
    - `e2e-run-stops.test.ts` (TC-21): repeated failure, 5-session cap, no checkpoint (byte-identical plan and checkpoint), and a hanging validation.
    - `e2e-run-interrupt.test.ts` (TC-22): SIGINT, 130, no surviving pid, valid state, then resume. This case is POSIX only. It also has a resume-after-stop case that runs on every platform (RF13, `resumedFrom`).
    - `e2e-run-autonomy.test.ts` (TC-23): 20 runs × 10 steps, alternating Claude Code and Codex CLI, 5 concurrent runs. Each run has one session that crosses the ceiling through the built `PostToolUse` hook and is stopped with `critical_ceiling`.
    - `e2e-run-approval-wrap.test.ts` (TC-24): `--approve-steps` without a TTY, and `wrap` on both harnesses.
- Changed files:
  - Modified: `tests/support/fake-harness/fake-harness.mjs`, `tests/support/fake-harness/install.ts`, `tests/helpers/run-project.ts` (journal field and counter reset).
  - Created: `tests/support/fake-harness/fake-agent.mjs`, `tests/helpers/run-acceptance.ts`, `tests/fixtures/runner/acceptance-project/{README.md,src/app.mjs}`, `tests/e2e/e2e-run-steps.test.ts`, `e2e-run-stops.test.ts`, `e2e-run-interrupt.test.ts`, `e2e-run-autonomy.test.ts`, `e2e-run-approval-wrap.test.ts`.
  - No `src/` change. `tests/test-lanes.ts` needed no change, because `tests/e2e/` is already a process-lane directory.
- Checks (final state, 2026-09-24, serialized):
  - `npm run build`: pass.
  - `npm run typecheck`: pass.
  - `npm run lint`: 14 errors, all the prd-03 `qa_01/evidence/*.mjs` baseline (L-05); none new.
  - `npm run coverage`: exit 0. 219 files; 1,361 tests pass and 1 is skipped (TC-22 SIGINT on Windows). All files 94.81% lines, 89.67% branches. Wall time 8m23s.
  - The new suites were rerun after the last edit (the `fake-agent.mjs` regex change), together with `harness-session-stop.test.ts`: green.
- Timings (Windows 11, Node v24.19.0, under coverage): autonomy 77.6 s (98.1 s without coverage); steps 26.2 s; stops 17.2 s; approval and wrap 8.7 s; interrupt 5.6 s. A reset-signal session costs about 1 s; a critical-ceiling session about 2–3 s (1 s ledger poll, 1 s grace, then the tree kill).
- Acceptance evidence:
  - 20 of 20 autonomy runs exit 0 with 10/10 steps `COMPLETED` and 11 sessions each. Each run has exactly one `critical_ceiling` session, with `finalZone: CRITICAL`, on the expected step (CA-14).
  - CA-06: plan and checkpoint bytes are identical before and after the `no_checkpoint` stop, and validation is `not_run`.
  - CA-12: the `wrap` stdout is the command output, a blank line, then a line matching the v1 telemetry block. No `WARN`, and the session's run id matches the summary.
  - CA-04/05/07: exits 4/3/4 with `repeated_failure`, `limit_reached` (`maxSessions`, 5 sessions, 6th step pending), and `timed_out` twice. The decision request names the step and the output tail on stderr.
  - CA-08: exit 4 `step_not_approved` after 1 session, with statuses `COMPLETED, IN_PROGRESS, PENDING`.
  - CA-09 after SIGINT: exit 130, no fake-harness pid alive, valid state, then resume from step 2. The assertions are written but **not executed locally**, because the case is skipped on Windows. The resume-after-stop case passes locally.
- Validated state: HEAD `eb2f386` plus the uncommitted T01–T09 worktree; Windows 11, Node v24.19.0; fake harness only, on a sealed `PATH`; no real harness, network, or credentials.
- Quality profile over the touched TypeScript and `.mjs` test files: QA-01–QA-08 have no hits. The QA-04 regex also matched `RegExp.exec` in `fake-agent.mjs`, a false positive; it was replaced with `String.match` so the sweep is empty. No file is above 100 non-blank lines. No reservation hits.
- Open items:
  1. **Platforms (PI-03).** The TC-22 SIGINT case, the POSIX `sh` entrypoints, and `/bin/sh` validation run only in CI. Windows coverage of the interrupt behavior comes from `tests/unit/shutdown.test.ts`, `tests/integration/run-command-interrupt.test.ts`, and the resume-after-stop case.
  2. **Observation for the review (no change made).** `finalZone` in a session line can be `null` even when the hooks wrote the ledger. The ledger watcher polls every 1 s and does not take a final reading when the session ends, so a session that ends within 1 s of its `PostToolUse` misses it. `critical_ceiling` sessions always record their zone. This touches DEC-06 and RF17 calibration quality, not a gate; TC-20 therefore does not assert `finalZone` for short sessions.
  3. **Interpretation.** The fake harness runs the installed hook script directly with `node` and the documented payload, as the existing simulator does (`tests/helpers/built-hook.ts`). It does not execute the command strings from `.claude/settings.json` or `.codex/hooks.json`, because the Codex command needs `git` on `PATH` and the sealed `PATH` excludes it.
  4. Manual acceptance on a real harness (TechSpec "Manual acceptance") is optional, owned by the user, and not a gate.

### ADR candidates

None - direct TechSpec implementation or local decision.
