# Workflow and Decisions — prd-16-configuracao-guiada-assistente-no-init

## Feature Summary

- Feature: `prd-16-configuracao-guiada-assistente-no-init`
- Workspace: `D:/MyProjects/ContextBrake`
- Status: `active` (implementation)
- Git base: `b216aba`
- Slice set (prefix `configuracao-guiada`): prd-15-configuracao-guiada-higiene-e-exclusao → prd-16-configuracao-guiada-assistente-no-init. Shared decisions (triage, slicing, product decisions) live in `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/workflow.md`.

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-HIL-01 | 2026-10-08 | HIL 1 (set) | Approved with prd-15; see DEC-HIL-01 in `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/workflow.md` (OI-16-01 automatic trigger with TTY plus --interactive; OI-16-02 assistant asks the restart limit). | APPROVED |
| DEC-HIL-02 | 2026-10-08 | HIL 2 (prd-16) | Plan "Approve as drafted (Recommended)": TechSpec DEC-01..10 and tasks T01..T06, CLI QA on the built CLI for non-TTY parts, no preparatory refactoring; implementation and in-contract corrections authorized. OI-01 "Skip it (Recommended)": the restart question is skipped when no selected harness has a restart mode. OI-02 "Leave it not measured": the real-terminal TTY probe (FR-10 measurement, TC-15, OBJ-05) is deferred; the fallback is tested in process. OI-03: follow the 180 s budget rule. Session: continue here. | APPROVED |
| DEC-HIL-03 | 2026-10-08 | Reservations HIL (codereview_02) | "Finalize, correct none (Recommended)": codereview_02 CR-01 (default harness preselection excludes a harness detected after the first install), CR-02 (--interactive drops typed configuration flags; no-flag printed command restarts the assistant), CR-03 (TechSpec test-file names for TC-01 and TC-03) are accepted open items, plus one QA-06 test-helper hit. Session: continue here. | APPROVED |
| DEC-HIL-04 | 2026-10-08 | HIL 3 | "Accept (Recommended)": delivery accepted with review codereview_02 (APPROVED WITH RESERVATIONS, DEC-HIL-03), QA qa_01 (APPROVED), and the open limitation that TC-15, FR-10 measurement, and OBJ-05 are not measured. No commit or push requested. | APPROVED |
| DEC-HIL-05 | 2026-10-08 | Post-acceptance change | "Pode fazer o 1 pelo menos, pra eu ver se é suficiente": rich prompts (`@clack/prompts`) behind the existing prompt port, line prompts kept as fallback. Experiment; review and QA not re-run. | APPROVED |

## Milestones

- 2026-10-08: PRD drafted after prd-15 under the approved slicing (DEC-SLICE-01 in the prd-15 workflow). HIL 1 pending for the set.
- 2026-10-08: HIL 1 approved (DEC-HIL-01). Waits for prd-15 to complete before its TechSpec.
- 2026-10-08 (resume): prd-15 completed and pushed (fa07b4c); git base moved to b216aba (user commits 9479c0b Codex rollout usage and b216aba budget 180 s; neither touches init). TechSpec (DEC-01..10, TC-01..15) and plan T01..T06 drafted. HIL 2 pending with OI-01 (restart question skipped when no selected harness has a restart mode), OI-02 (FR-10 measurement needs the person's real terminals), OI-03 (PRD NFR-03 says 120 s; rule is 180 s). CLI QA on the built CLI for the non-TTY parts; manual acceptance for the terminal probe.
- 2026-10-08: HIL 2 approved (DEC-HIL-02). Implementation starts at T01 in this session.
- 2026-10-08: T01..T05 implemented and approved by evidence (T05: `init` runs the assistant, confirms once through the port, cancels cleanly; coverage 247 files, 1377 tests, 94.58%, 186 s wall). The `tasks.md` hash in the checkpoint was refreshed after state and link updates only (no contract change). Open for HIL 3: `init --interactive` with typed configuration flags drops them (only `--dry-run` is kept); a no-flag printed command (`context-brake init`) restarts the assistant on a terminal. Wall time again slightly above 180 s under machine load; T06 measures with `npm run test:budget`.
- 2026-10-08: T06 done (README, terminal-tty.md; gates green: budget 120.6 s, coverage 94.58 %, 1377 tests). Delegated review codereview_01 received: REJECTED (CR-01 blocking: a snapshot or resume command starting with `-` makes the printed command unreplayable). Worktree check after the review: only the codereview_01 folder added. Routed to sdd-plan-corrections within HIL 2 authorization (DEC-HIL-02).
- 2026-10-08: Correction round 1 for codereview_01: task_01 (CR-01) done and moved to codereview_01/done/ (coverage 1379 tests, green). CR-02 and CR-03 left as HIL 3 design points; CR-04 bookkeeping (tasks.md hash refreshed; TC-01 and TC-03 live in tests/unit/init-max-restarts-arguments.test.ts). Re-review codereview_02 delegated to a new reviewer.
- 2026-10-08: Re-review codereview_02 received: APPROVED WITH RESERVATIONS (no block; CR-01 of codereview_01 resolved; worktree check clean). Reservations HIL opened: CR-01 default harness preselection, CR-02 typed flags dropped with --interactive, CR-03 TechSpec test-file names (plus one QA-06 test-helper hit).
- 2026-10-08: QA qa_01 received: APPROVED (worktree check clean). HIL 3 opened.
- 2026-10-08: HIL 3 accepted (DEC-HIL-04); checkpoint completed and snapshot closed.
- 2026-10-08 (post-acceptance change): the person found the wizard "muito rudimentar" and asked for option 1 (rich prompts on the existing port) "pelo menos pra ver se é suficiente". Authorized as DEC-HIL-05; TechSpec amended with DEC-11 (`@clack/prompts`, escape hatch `CONTEXT_BRAKE_PLAIN_PROMPTS=1`). Implemented as an experiment; review and QA were not re-run for this change.
- 2026-10-08: the person tried the rich prompts and accepted them ("Ficou otimo, pode fechar assim"); committed with the TechSpec amendment DEC-11. Review and QA were not re-run for this change; TC-15 real-terminal measurement remains open.
