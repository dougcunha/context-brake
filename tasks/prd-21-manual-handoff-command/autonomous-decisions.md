# Autonomous decisions — 21-manual-handoff-command

## AUTO-01 — ContextBrake check — 2026-10-21 00:00

- Question: does `context-brake.config.json` support an autonomous run?
- Options: none; check only.
- Choice: no warning. `activeHarnesses` has `claude-code`; `autoRestart.maxConsecutiveRestarts` is 10; `snapshot.command` is `sdd-snapshot`; `snapshot.resumeCommand` is `sdd-orchestrate-flow`.
- Reason: `context-brake.config.json` at the repository root.
- Reversal: not applicable.

## AUTO-02 — HIL 1 — 2026-10-21 16:41

- Question: approve the PRD `prd.md` (FR-01..FR-14, NFR-01..NFR-07) as the product contract?
- Options: A (recommended) — approve, and carry P-02, P-04, P-05 to the TechSpec as technical questions; B — correct the requirements first.
- Choice: A.
- Reason: coverage check passes: H-01 (mode A, `/handoff`, optional focus) maps to FR-01..FR-14; every FR has an observable criterion; the acceptance gate of the PRD is checked. P-01 and P-03 are decided in the PRD itself (keep existing codes and seed text). P-02 (command after `/clear`), P-04 (name clash), and P-05 (minimum version) are technical questions that the TechSpec resolves or records; none removes or adds an obligation.
- Reversal: edit `prd.md`; the change invalidates the TechSpec and the plan.

## AUTO-03 — sdd-create-techspec / FR-13 — 2026-10-21 16:53

- Question: FR-13 asks that `MOD_VERSION` changes, but `MOD_VERSION` must equal the `package.json` version (DEC-10 of PRD-11, `tests/integration/claude-mod-bundle.test.ts:44-47`). Bump the package version in this feature?
- Options: A (recommended) — keep the invariant; the next release bump changes `MOD_VERSION`; B — bump `package.json` now.
- Choice: A (TechSpec DEC-09).
- Reason: a version bump is release work, and H-02 authorizes no release; breaking the invariant would break the drift check. The FR-13 criterion "greater than 1.0.0" already holds (1.2.0). Accepted open item for HIL 3.
- Reversal: bump `package.json` and `MOD_VERSION` together in a release commit; low cost.

## AUTO-04 — HIL 2 — 2026-10-21 16:53

- Question: approve the TechSpec (DEC-01..DEC-13, TC-01..TC-17) and the plan T01..T04, and authorize implementation and corrections within this contract? Does CLI QA run?
- Options: A (recommended) — approve; QA runs (QA-E2E-01 by a delegated runner); MA-01..MA-05 stay as essential manual acceptance for the user at HIL 3; B — revise the TechSpec.
- Choice: A.
- Reason: every FR and NFR maps to a task or a decision (tasks.md coverage gate); no preparatory refactoring (absorbed in DEC-13); the TechSpec has essential manual acceptance, so QA runs (autonomous-mode.md, Gates). Open questions P-02, P-04, P-05 have a decision and a live check each.
- Reversal: edit the TechSpec or the plan; affected tasks go back to pending.

## AUTO-05 — sdd-plan-corrections codereview_01 — 2026-10-21 17:38

- Question: which items of `codereview_01` (REJECTED) become correction tasks?
- Options: A (recommended) — T05 for CR-01 plus the optional unknown-id improvement in the same function; CR-02 closed by the state record R-04 and refreshed hashes; B — CR-01 only.
- Choice: A.
- Reason: CR-01 is a High block on the seed path (DEC-07, NFR-04). The unknown-id case is the same function and the same obligation (the seed must reach the new session); waiting the full cap is what DEC-07 already says when no switch can be confirmed. CR-02 is a flow-state gap, not code.
- Reversal: drop the unknown-id part of T05; low cost.

## AUTO-06 — Reservations HIL (codereview_02) — 2026-10-21 17:53

- Question: `codereview_02` is APPROVED WITH RESERVATIONS with no finding and 2 optional improvements: a `doctor` signal for a host without `$.clock.after`, and a test for an id read that fails during the poll. Correct them or finalize?
- Options: A (recommended) — finalize; both become accepted open items; B — open a correction round for the test.
- Choice: A.
- Reason: neither is a finding; the first needs a new reason code or `doctor` finding, which FR-12 and the PRD out-of-scope list exclude; the second covers a branch the reviewer verified by reading (the poll goes on to the cap). A round would require a third review for no requirement.
- Reversal: add the test or the diagnostic in a later feature; low cost.

## AUTO-07 — QA BLOCKED / HIL 3 — 2026-10-21 18:03

- Question: `qa_01` is BLOCKED with no failure; MA-01..MA-05 (essential manual acceptance) need a person in an interactive Claude Code session. Accept the feature?
- Options: A — the user runs MA-01..MA-05 and reports the result; B — accept with MA-01..MA-05 as open items.
- Escalated: depends on an essential manual validation, with no other eligible unit (escalation rubric); automatic acceptance is not allowed with essential manual validation pending.
- Reason: `qa_01/qa.md#manual-acceptance`; `techspec.md#test-approach`.
- Reversal: not applicable (decision belongs to the user).

## AUTO-08 — Reservations HIL (codereview_03) — 2026-10-21 19:14

- Question: `codereview_03` is APPROVED WITH RESERVATIONS with no finding; one optional improvement (a throwing `$.clock.after` resets the counter but sends no prompt, untested) and 3 workflow items (`.gitignore` diff from an `init` run, snapshot behind, TechSpec "Risks" text). Correct or finalize?
- Options: A (recommended) — finalize the code; fix the TechSpec text and the snapshot (no code); keep `.gitignore` out of the feature; B — open a round for the clock edge case.
- Choice: A.
- Reason: no finding; the edge case prints the failure line and records `ERROR_INTERNAL` (NFR-05 holds), and the counter reset follows a typed command (A-03). The `.gitignore` change was written at 18:48 by an `init` run in the repository (same time as the installed bundle), not by this feature's code.
- Reversal: add a test or reorder the reset in a later feature; low cost.

## AUTO-09 — QA BLOCKED / HIL 3 — 2026-10-21 19:26

- Question: `qa_03` is BLOCKED with no failure; the BUG-01 fix passes in the kit; MA-01..MA-05 need the user's live retest. Accept?
- Escalated: essential manual validation with no other eligible unit (escalation rubric).
- Reason: `qa_03/qa.md#manual-acceptance`.
- Reversal: not applicable (decision belongs to the user).

## AUTO-10 — HIL 3 after the `/handoff` restart — 2026-10-21 19:39

- Question: the restart log and the first prompt of this session show `/clear` and the seed after the `/handoff` turn (R-11). Confirm that no key was pressed (MA-01 rest, MA-04), then run MA-02, MA-03, MA-05, or accept with them open?
- Escalated: essential manual validation with no other eligible unit (escalation rubric).
- Reason: `qa_03/qa.md#manual-acceptance`; `workflow.md#R-11`; `.context-brake/runtime/restart/claude-code/6dfc9257-899c-4dea-ba41-561e09c1db04.json`.
- Reversal: not applicable (decision belongs to the user).

## AUTO-11 — HIL 3 after the second `/handoff` restart — 2026-10-21 19:44

- Question: the restart log of `3adf7c09` and the first prompt of this session show `/clear` and the seed after the second `/handoff` (R-12). Confirm MA-02, then run MA-03 and MA-05, or accept with them open?
- Escalated: essential manual validation with no other eligible unit (escalation rubric).
- Reason: `qa_03/qa.md#manual-acceptance`; `workflow.md#R-12`; `.context-brake/runtime/restart/claude-code/3adf7c09-4d6b-4ef6-abb7-1cc1217fda4f.json`.
- Reversal: not applicable (decision belongs to the user).

## AUTO-12 — HIL 3 after the MA-03 `/handoff` restart — 2026-10-21 19:47

- Question: the transcript and restart log of `abf64f4b` show the `/handoff` turn after the typecheck turn, then `/clear` and the seed (R-13). Confirm MA-03, then run MA-05, or accept with it open?
- Escalated: essential manual validation with no other eligible unit (escalation rubric).
- Reason: `qa_03/qa.md#manual-acceptance`; `workflow.md#R-13`; `.context-brake/runtime/restart/claude-code/abf64f4b-2ef9-4665-b8d6-1e6c6c1be6df.json`.
- Reversal: not applicable (decision belongs to the user).
