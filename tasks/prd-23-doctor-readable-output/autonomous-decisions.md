# Autonomous decisions — prd-23-doctor-readable-output

## AUTO-01 — HIL 2 — 2026-10-21 12:17

- Question: Approve the TechSpec and the plan T01-T03, and authorize implementation and corrections within the contract?
- Options: A (recommended) — approve and implement; B — correct the TechSpec or plan first.
- Choice: A
- Reason: every FR/NFR maps to a task (`tasks.md#coverage-gate`); terrain clean, no preparatory refactoring (`techspec.md#terrain-baseline`); DEC-11 already confirmed by the user (workflow H-02).
- Reversal: revert the task commits; no persisted format changes.

## AUTO-02 — HIL 2 / CLI QA — 2026-10-21 12:17

- Question: Run CLI QA (`sdd-execute-qa`) after the review?
- Options: A (recommended) — no QA; B — run QA.
- Choice: A
- Reason: the TechSpec has no end-to-end case (`techspec.md#test-approach`, "End-to-end: not changed"); the only manual check, TC-14, is a README diff review that the delegated code review covers; the manual `doctor` run in T02/T03 is a developer check, not essential acceptance.
- Reversal: run `sdd-execute-qa` later on the same diff.

## AUTO-03 — ContextBrake check — 2026-10-21 12:17

- Question: Does `context-brake.config.json` support an autonomous run?
- Options: —
- Choice: no warning: `claude-code` active, `autoRestart.maxConsecutiveRestarts` 10, `snapshot.command` `sdd-snapshot`, `snapshot.resumeCommand` `sdd-orchestrate-flow`.
- Reason: `context-brake.config.json` at `419c0bd` plus worktree.
- Reversal: —

## AUTO-04 — sdd-execute-task T02 — 2026-10-21 12:30

- Question: 3 integration suites not listed in the TechSpec (`doctor-active-sessions`, `doctor-exclusion`, `debug-mode-lifecycle`) assert the old doctor text. Update them in T02?
- Options: A (recommended) — update their text assertions to the new card rows, keeping the same behavior checks; B — escalate as a contract deviation.
- Choice: A
- Reason: the PRD changes the text layout (FR-02, FR-05, FR-07, FR-08) and the tests check the same behaviors; no obligation is added or removed; TechSpec "Tests to revalidate" was incomplete.
- Reversal: revert the 3 test edits with the feature.

## AUTO-05 — Reservations HIL (codereview_01) — 2026-10-21 12:52

- Question: codereview_01 is `APPROVED WITH RESERVATIONS` with CR-01 (text run of TC-13 does not assert exit code 2) and CR-02 (no formatter test of the `OK` header with overhead `fail`, TC-04). Correct them or finalize?
- Options: A (recommended) — correct both in one test-only task and re-review; B — finalize with both as accepted open items.
- Choice: A
- Reason: both fit the approved contract (TC-04, TC-13 in `techspec.md#test-approach`) and widen no scope; `autonomous-mode.md` Gates: reservations that fit the contract are corrected. The review limitations (FR-14 help wording decided by DEC-11/H-02; FR-09 JSON by construction; muted card labels outside scope; Windows-only; budget not run) become accepted open items.
- Reversal: revert the test additions; no production code changes.

## AUTO-06 — HIL 3 automatic acceptance — 2026-10-21 13:12

- Question: Accept the delivery of prd-23?
- Options: A (recommended) — accept; B — open another correction round.
- Choice: A
- Reason: latest review `codereview_02/codereview.md` is `APPROVED`; QA disabled by A-02 (no end-to-end case, TC-14 covered by the review); tasks T01-T03 and correction T04 complete; no essential manual validation pending. Accepted open items: FR-14 PRD text names the CLI help (DEC-11 decides it); FR-09 JSON evidence by construction; muted card row labels (`card.ts`, shared with `init`); Windows-only local validation; `test:budget` 193.9 s > 180 s under machine load, not attributable to the feature (`codereview_02/codereview.md#limitations-and-open-items`); FR-10 verbose prints a code row plus a message note (TechSpec contract). ADR candidates: none.
- Reversal: reopen the feature through `sdd-orchestrate-flow`; nothing was committed.
