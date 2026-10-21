# Autonomous decisions — prd-24-doctor-fix-command

## AUTO-01 — ContextBrake check — 2026-10-21

- Question: Does `context-brake.config.json` support an autonomous run?
- Options: —
- Choice: no warning: `claude-code` active, `autoRestart.maxConsecutiveRestarts` 10, `snapshot.command` `sdd-snapshot`, `snapshot.resumeCommand` `sdd-orchestrate-flow`.
- Reason: `context-brake.config.json` in the worktree.
- Reversal: —

## AUTO-02 — HIL 1 — 2026-10-21

- Question: Approve `prd.md` (FR-01..FR-16, NFR-01..NFR-05), including the author decision FR-11 (`fix` needs an existing installation)?
- Options: A (recommended) — approve; B — correct requirements first.
- Choice: A
- Reason: the PRD covers the request (one command that tries to correct every doctor warning) with the classification table, the consent decision of the user (NFR-02, `--force`), and observable criteria per FR; FR-11 is the smallest scope and keeps `init` as the only first-install path (`autonomous-mode.md`, step 3: smallest scope); no escalation item applies (no scope change, no contradiction with code found).
- Reversal: edit `prd.md` and rerun the TechSpec stage.

## AUTO-03 — HIL 2 — 2026-10-21

- Question: Approve the TechSpec (DEC-01..DEC-16) and the plan T01-T06, and authorize implementation and corrections within the contract?
- Options: A (recommended) — approve and implement; B — correct the TechSpec or plan first.
- Choice: A
- Reason: every FR/NFR maps to a task (`tasks.md#coverage-gate`); no preparatory refactoring (`techspec.md#terrain-baseline`: only `diagnostics.ts` crosses a threshold and DEC-14 absorbs it); DEC-05 (status line `keep`) and DEC-04 (`overwritePaths`) touch harness planning and user files, and the PRD decides them (FR-05, FR-06, NFR-02); no DEC contradicts the PRD.
- Reversal: revert the task commits; no persisted format change (optional schema fields only).

## AUTO-04 — HIL 2 / CLI QA — 2026-10-21

- Question: Run CLI QA (`sdd-execute-qa`) after the review?
- Options: A (recommended) — run QA; B — no QA.
- Choice: A
- Reason: the TechSpec has an end-to-end case (TC-21) and a manual acceptance script for the TTY flow (`techspec.md#test-approach`); `autonomous-mode.md` Gates: CLI QA runs in that case.
- Reversal: skip QA in a later decision; no code effect.

## AUTO-05 — sdd-plan-corrections codereview_01 — 2026-10-21

- Question: Plan CR-01 (High) of codereview_01 as one correction task?
- Options: A (recommended) — one task (`codereview_01/task_07.md`) that carries the previous manifest's bridge asset forward for `'keep'`; B — escalate.
- Choice: A
- Reason: `REJECTED` opens a correction round within the A-02 authorization; the fix restores DEC-05 ("Skip must change nothing") without a contract change.
- Reversal: revert T07.

## AUTO-06 — Reservations HIL (codereview_02) — 2026-10-21

- Question: codereview_02 is `APPROVED WITH RESERVATIONS` with OI-01 (`doctor-text.test.ts` 112 lines), OI-02 (`s` case does not assert `.gitignore`), OI-03 (no `--yes --force` bridge reinstall case). Correct them or finalize?
- Options: A (recommended) — correct OI-01 to OI-03 in one test-only task and re-review; B — finalize with them as accepted open items.
- Choice: A
- Reason: all 3 fit the approved contract (QA-07, T07.2, FR-06/TC-13) and widen no scope (`autonomous-mode.md` Gates: reservations that fit the contract are corrected). Accepted open items: (1) `STATUSLINE_BRIDGE_ABSENT` group after an opt-out needs a PRD decision; (2) `test:budget` 219.6 s and coverage 229 s on a loaded machine, repository owner; (3) `.agents/rules/tests.md` e2e list, repository owner; (4) extending DEC-06 to the bridge asset path is a TechSpec change, TechSpec owner.
- Reversal: revert the test task.

## AUTO-07 — Reservations HIL (codereview_03) — 2026-10-21

- Question: codereview_03 is `APPROVED WITH RESERVATIONS` with OI-01 (the doctor `finding()`/`report()` test factories in 3 files; T08 added the third). Correct it or finalize?
- Options: A (recommended) — move the factories to one helper in `tests/helpers/` (test-only task) and re-review; B — finalize with OI-01 as an accepted open item.
- Choice: A
- Reason: fits the approved contract (quality profile duplication trigger, `techspec.md#quality-profile`) and widens no scope; T08 caused the third copy. The heavy-audit suggestion stays with the HIL 3 summary. `test:budget` 215.2 s and the flaky `node-process-runner` timing test under load stay accepted open items for the repository owner (A-05).
- Reversal: revert the test task.

## AUTO-08 — Reservations HIL (codereview_04) — 2026-10-21

- Question: codereview_04 is `APPROVED WITH RESERVATIONS` with no finding and no optional improvement; the reservation is NFR-04 (Linux and macOS not verified locally). Correct or finalize?
- Options: A (recommended) — finalize the review cycle; record NFR-04 on Linux and macOS as an accepted open item for CI; B — another round.
- Choice: A
- Reason: no actionable item fits a local correction; the TechSpec assigns Linux and macOS to CI (`techspec.md#test-approach`). Accepted open items of A-05 stay. Next: CLI QA (A-03).
- Reversal: run the suite on Linux and macOS in CI and open a correction round on failure.

## AUTO-09 — HIL 3 — 2026-10-21

- Question: Accept the delivery automatically?
- Options: A — automatic acceptance; B (recommended) — escalate with the real-terminal manual script.
- Escalated: essential manual validation pending (`autonomous-mode.md`, Automatic acceptance). The TechSpec manual acceptance script (QA owner) is NOT VERIFIABLE in qa_01; the clack `askUi` path, the default on a real terminal, has no automated test.
- Reason: `techspec.md#test-approach` (Manual acceptance), `qa_01/qa.md#manual-acceptance`, AUTO-04.
- Reversal: —

## AUTO-10 — HIL 3 answer — 2026-10-21

- Question: —
- Options: —
- Choice: human acceptance recorded (workflow H-02); feature completed with codereview_04 and qa_01 as evidence; the real-terminal script is an accepted open item.
- Reason: user answer to the AUTO-09 escalation.
- Reversal: reopen through a new review on request.
