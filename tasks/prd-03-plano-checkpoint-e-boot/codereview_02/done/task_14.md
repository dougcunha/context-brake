# T14 — Make Copilot CLI startup boot reliable in the full suite

## Outcome

The built Copilot CLI session-start hook consistently delivers the valid-state boot in the simulator, including when the full test suite runs.

## Dependencies and boundaries

- Depends on: —
- Unblocks: independent re-review of `codereview_02/CR-01`.
- In scope: trace the missing boot result through the built hook, simulator transport, and bounded runtime path; correct the proven cause.
- Out of scope: changing the documented six-harness startup guarantee, treating empty output as success, or broadening the compaction guarantee.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_02/CR-01` | `codereview.md#Findings` | One full run returned no Copilot CLI startup boot |
| RF9, CA-05; TC-05 | `prd.md#Boot no início da sessão`, `techspec.md#Test approach` | Startup boot must reach every supported harness |

## Requirements

- Capture the installed hook's exit code and stderr in a failing test assertion without logging plan, checkpoint, or prompt content.
- Determine whether the missing context comes from hook failure, a deadline, a transport parser, or fixture interaction before changing production behavior.
- Preserve the vendor-documented output field, the runtime failure policy, and the 1,000-token boot budget.

## Context to recover on demand

- TechSpec: DEC-01/02, DEC-15, TC-05; approved `DEC-EX-T05`.
- Rules: `code-standards.md`, `node.md`, `tests.md`, `harness-adapters.md`.
- Code: `tests/e2e/e2e-simulated-boot.test.ts`, `tests/support/harness-simulator/process-driver.ts`, `tests/helpers/built-hook.ts`, `src/infrastructure/harnesses/github-copilot-cli/runtime.ts`, `src/infrastructure/runtime/process-hook-host.ts`.

## Work

- [x] T14.1 Preserve hook exit and safe stderr code evidence on a missing startup context; focused and serialized full-lane runs did not reproduce the earlier null result.
- [x] T14.2 No production or fixture cause was proven after two serialized full runs passed; retain diagnostics and leave production behavior intact.
- [x] T14.3 Rerun focused startup delivery, built-hook integration, and the full validation lane; record the remaining uncertainty.
- [x] T14.4 Under `DEC-EX-T14`, make the SessionStart timeout report a safe omission instead of silent empty stdout, keeping the 1500 ms hook deadline and the `DEC-EX-CR01` process boundary intact.
- [x] T14.5 Under `DEC-EX-T14`, register `tests/integration/boot-git-delivery.test.ts` in the process lane and add a `built-hook` marker in `tests/test-lanes.ts`.
- [x] T14.6 Under `DEC-EX-T14B`, race the boot Git inspection against an internal sub-budget that degrades to the existing `checks_omitted` path on overrun so boot content still delivers, keeping the 1500 ms hook deadline and the `DEC-EX-CR01` process boundary intact.

## Acceptance criteria

- Valid active state yields task, active step, constraints, and validation command in Copilot CLI startup context; invalid and completed state retain their existing behavior.
- The test reports exit code and a safe error summary when delivery fails, so a null context cannot hide hook failure.
- Two serialized full-suite runs pass this startup case without a skip or weakened assertion; failures owned by T15 or T16 remain independently tracked. The integrated full coverage gate must pass before re-review.

## Verification

- Unit: parser and failure-policy checks if the cause lies there.
- Integration: built Copilot CLI hook in a temporary fixture repository; assert delivered context and failure evidence.
- End-to-end: `e2e-simulated-boot` startup case and full built-CLI suite.
- Manual: none.
- Platforms: Linux, macOS, Windows; local Windows evidence with the existing matrix limit.
- Environment dependency: Node 20+ and Git on `PATH` for repository fixtures.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: hook result or error trace, passing focused case, and a full coverage result.

## Affected files

- Modify: `tests/e2e/e2e-simulated-boot.test.ts`, `tests/support/harness-simulator/process-driver.ts`, `tests/helpers/built-hook.ts`; production runtime files only if evidence proves a defect.
- Create: focused fixture or test helper only if needed to preserve the 100-line file limit.

## Observability and recovery

- Operational signal: failed test prints safe hook exit and error metadata; hook stdout remains the harness response channel.
- Recovery: revert only the diagnosed transport or runtime change; retain a focused regression test.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `createProcessSession.boot` now fails with the installed hook's exit code and a safe `ContextBrake: CODE` marker when stdout is empty. It no longer reports only `null` in that case. The earlier Copilot startup null was not reproduced, so no production adapter or deadline was changed.
- Changed files: `tests/support/harness-simulator/process-driver.ts` only; this task file records the evidence. The helper remains exactly 100 lines and introduces no new QA-01 through QA-06 or QA-08 hit.
- Checks: `npm run lint`, `npm run typecheck`, focused Copilot startup test, `npm test -- --maxWorkers=2` (170 files, 954 tests), and `npm run coverage -- --maxWorkers=2` passed on the final assertion; an earlier diagnostic coverage run also passed. `git diff --check` passed. The build and package smoke from `codereview_02` remain valid because no runtime asset changed.
- Validated state: Windows 11, Node 24, Git available, built runtime assets. Three serialized full-suite passes (two coverage, one test) observed no missing boot. The initial review's three failed full runs remain in the immutable report, including the single Copilot null; the new diagnostic did not capture a recurrence.
- Open items: T15 and T16 separately handle the doctor-sample and overhead failures in `codereview_02/CR-01`. Independent re-review still must decide whether the new repeatable full-pass evidence closes the finding. Linux/macOS and Node 20/22 matrix remains the accepted evidence limit.

### Reopening (DEC-EX-T14)

- Reopened on 2026-09-22 by the DAG owner after the exception HIL approved "Reopen T14 and correct". The original handoff above stands as the evidence of the first completion; nothing in it is retracted.
- Reason: T14.2's "no production or fixture cause was proven" is outdated. A later full run proved the mechanism for the same empty-output family: `src/core/services/failure-policy.ts:53` resolves any non-`pre_tool` failure to `neutral`, `src/infrastructure/runtime/process-hook-host.ts:31,53-58` maps the 1500 ms deadline there, and `writeDecision` then writes empty stdout with exit 0. `tests/integration/boot-git-delivery.test.ts` "names both commits when the recorded commit is outside history" failed exactly so (`SyntaxError: Unexpected end of JSON input` at `deliveredBoot`) and passed 5/5 alone and in the coverage run. Full evidence: `workflow.md#Correction-round-2` and `codereview_02/done/task_15.md#Handoff`.
- Approved scope added as T14.4 and T14.5: a safe omission report on the SessionStart timeout path (deadline and `DEC-EX-CR01` process boundary retained) and the `tests/test-lanes.ts` registration of `boot-git-delivery.test.ts` with a `built-hook` marker. T14's IDs, outcome, acceptance criteria, and boundaries are retained.
- Completion rule: close again only after reviewing current evidence and the affected dependents (T15's handoff, T16's state, and the integrated full coverage gate).

### Second completion (DEC-EX-T14, T14.4 and T14.5)

- Produced result: the SessionStart timeout now reports a safe omission in the documented session-start field instead of silent empty stdout: `renderBootOmission` returns `[ContextBrake boot v1] Boot omitted: the internal deadline elapsed. Validate the plan and checkpoint state before continuing.`, and `resolveFailure` emits it as a `context` decision only for `session_reset` + `DEADLINE_EXCEEDED` when `session_boot` is supported (OpenCode, `session_boot: unsupported`, keeps `NEUTRAL` and never claims a boot omission). The 1500 ms hook deadline, the `DEC-EX-CR01` process boundary, the failure policy for `pre_tool`, and the 1,000-token boot budget are unchanged. `tests/integration/boot-git-delivery.test.ts` is registered in `PROCESS_LANE_FILES` and `built-hook` is a process marker, so the T23 guard keeps every built-hook test in the serialized process lane after the parallel lane.
- Changed files: `src/core/services/boot-summary.ts` (`renderBootOmission`), `src/core/services/failure-policy.ts` (`FailureResolutionInput.descriptor`, the omission branch, `sessionBootSupported`), `src/infrastructure/runtime/process-hook-host.ts`, `src/infrastructure/runtime/in-process-host.ts`, and `src/infrastructure/harnesses/common/in-process-support.ts` (descriptor plumbing), `tests/test-lanes.ts` (T14.5), `tests/unit/boot-omission.test.ts` (new focused regression: exact omission text, supported/unsupported capability gate, non-deadline boundary), `tests/unit/failure-policy.test.ts` (descriptor on existing constructions). `techspec.md`'s Failure policy paragraph was amended under `DEC-EX-T14` so the contract matches the approved correction.
- Checks: `npm run build`, `npm run lint`, `npm run typecheck`, `git diff --check` passed; focused unit run 37/37 including the T23 lane guard. Two serialized full-suite runs pass the startup case without skips or weakened assertions: `npm test` 171 files / 958 tests and `npm run coverage` 171 files / 958 tests at 93.52% statements (integrated gate). All changed files stay within the 100-line limit.
- Validated state: Windows 11, Node 24, Git available, built runtime assets. Quiet-machine evidence: five built-hook SessionStart runs with real Git inspection delivered the full boot in 676–810 ms against the 1500 ms deadline; under concurrent load the inspection can still lose the race and then reports the safe omission, which is the residual DEC-EX-T14 kept by holding the deadline intact.
- Open items: T16 remains for CR-01's built post-tool overhead slice; the round's integrated full coverage gate for independent re-review runs after T16. RV-01 and the Linux/macOS and Node 20/22 matrix remain as recorded. T15's handoff and T16's pending state were reviewed before this completion per the reopening rule.

### Reopening 2 (DEC-EX-T14B)

- Reopened on 2026-09-22 by the DAG owner after the exception HIL approved "Bound the Git budget". Both prior handoffs above stand as evidence of the first and second completions; nothing in them is retracted. T14's IDs, outcome, acceptance criteria, and boundaries are retained.
- Reason: the second completion's integrated gate evidence was overturned by a later `npm run coverage` run (957/958). `tests/e2e/e2e-simulated-boot.test.ts` "runs validation command within three tool calls before any edit" uses a git-repo fixture (`e2e-simulated-boot.test.ts:33-34`) whose serial Git inspection chain (`git-inspector.ts:18-52`: discover, repo check, branch, head, status, cat-file, merge-base; `GIT_TIMEOUT_MS` 3000 ms per command) lost the 1500 ms hook deadline under coverage-run load and received the `DEC-EX-T14` safe omission instead of boot content. Quiet-machine boot totals are 676-810 ms; the load window is the race. Full evidence: `workflow.md#Correction-round-2` and `codereview_02/done/task_16.md#Handoff`.
- Approved scope added as T14.6: race the boot Git inspection against an internal sub-budget that degrades to the existing `checks_omitted` path on overrun so boot content still delivers (task, steps, constraints, validation command), keeping the 1500 ms hook deadline and the `DEC-EX-CR01` process boundary intact. No parallel-inspection expansion was authorized; the `checks_omitted` degradation contract (RF16, TC-12) is preserved as-is.
- Completion rule: close again only after the integrated full coverage gate passes and the affected dependents (T15's handoff, T16's handoff, and the boot git-delivery and boot-adherence suites) are reviewed.

### Third completion (DEC-EX-T14B, T14.6)

- Produced result: the boot Git inspection now races an internal sub-budget of `BOOT_GIT_BUDGET_MS` (1000 ms) wired only into the boot path (`runtime-composition.ts`); `NodeGitInspector.inspect` runs the serial chain under `runWithinDeadline` and clamps every command timeout (discovery included) to the remaining budget, so no child process outlives the budget and an overrun resolves to `{status: 'unavailable', reason: 'inspection_failed'}` — the existing `checks_omitted` path (RF16, TC-12 unchanged). Boot content (task, active step, constraints, validation command) still delivers on overrun; `plan status` keeps the unbounded 3000 ms-per-command inspection. The 1500 ms hook deadline and the `DEC-EX-CR01` process boundary are intact (process host untouched; `NodeProcessRunner` with argument arrays and timeouts remains the only process path). Calibration: a quiet-machine real chain measured 374-515 ms (discover 81-115 ms plus six commands at 43-85 ms) against quiet built-hook totals of 676-810 ms, so 1000 ms keeps about 2x chain headroom for healthy inspections while cutting the 3000 ms-per-command tail that lost the deadline.
- Changed files: `src/infrastructure/git/git-inspector.ts` (options object, budget race, clamped per-command timeouts), `src/infrastructure/runtime/runtime-composition.ts` (`BOOT_GIT_BUDGET_MS` and wiring), `tests/unit/git-inspection-budget.test.ts` (new: chain completion within budget, degradation on overrun, timeout clamping, unbounded default, exhausted budget runs nothing, error propagation), `tests/integration/git-inspection-budget.test.ts` (new: real-git overrun degrades to the checks_omitted source state and the boot still delivers task and validation content), `tests/test-lanes.ts` (the new integration file is registered in the process lane as the T23 guard requires for `NodeProcessRunner` tests), `tests/unit/boot-reader.test.ts` (content delivery asserted alongside `checks_omitted`). `techspec.md`'s Failure policy paragraph was amended under `DEC-EX-T14B` so the contract matches the approved correction. All files stay within the 100-line limit (largest: `git-inspector.ts` at 96 lines).
- Checks: `npm run build`, `npm run lint`, `npm run typecheck`, `git diff --check` passed. Focused runs: `git-inspection-budget` unit 6/6, `git-inspection-budget` integration 2/2, `git-divergence` 5/5, `boot-reader` 3/3, `test-lanes` guard green (17/17 in the first focused pass). Quality profile over touched files: QA-01, QA-04, QA-05, QA-06 zero hits; QA-02, QA-03, QA-08 not applicable (no `core` or in-process adapter change); QA-07 largest touched file 96 lines. Integrated gate: `npm run coverage` 173 files / 966 tests at 93.55% statements, and `npm test` 173 files / 966 tests, both fully green and serialized. One intermediate `npm test` run reported a single load-sensitive timeout in `tests/e2e/e2e-support-limitations.test.ts` (doctor text and JSON, with an EBUSY cleanup follow-up) that passed 2/2 in isolation and is outside this task's slice (doctor measurement family).
- Validated state: Windows 11, Node 24, Git available, built runtime assets. The startup case passed in three serialized full-suite runs without a skip or weakened assertion; the quiet-machine full boot delivery remains 676-810 ms. A new focused regression proves content delivery under budget overrun deterministically (1 ms budget against a real repository).
- Open items: the independent re-review must still resolve `codereview_02/CR-01`; the `e2e-simulated-boot` fixture's git-line assertions still require chain completion and now degrade safely instead of losing the deadline; RV-01 and the Linux/macOS and Node 20/22 matrix remain as recorded. T15's and T16's handoffs and the boot git-delivery and boot-adherence suites were reviewed before this completion per the reopening rule.
