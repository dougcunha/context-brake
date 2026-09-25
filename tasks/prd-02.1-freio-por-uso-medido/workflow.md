# Workflow and Decisions — prd-02.1-freio-por-uso-medido

## Feature Summary

- Feature: `prd-02.1-freio-por-uso-medido` (Brake by measured context usage)
- Workspace: `D:/MyProjects/ContextBrake`
- Git base: `3b94a9c0ead1432bc5476982803486a940cdcba0` (worktree clean at start)
- Coordinator session: `d7fb8954-89bb-4626-bf8d-06349cdf2926`

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-REQ-01 | 2026-09-25 | Request | User asked to run the SDD flow for a PRD-02 revision after the catalogo-2-0 incident (agent stopped at turn 10/12): turns lose blocking power (optional, off by default), Claude Code measures usage from transcript `usage` with estimate fallback, protocol without `task_plan.json` must not order a stop. Folder `prd-02.1` follows the `prd-01.1` precedent, as named by the user. | RECORDED |
| DEC-HIL-01 | 2026-09-25 | Product | HIL 1: PRD 2.1 (OBJ-01..04, FR-01..10, NFR-01..06) approved as written (prd.md sha256 788b5e4b…); user chose to continue in this session. | APPROVED |
| DEC-HIL-02 | 2026-09-25 | Architecture & Plan | HIL 2: TechSpec (DEC-01..13, CMP-01..13, TC-01..23, QA-01..08) and plan T01..T05 approved; implementation and in-contract corrections authorized; CLI QA runs in step 6 with manual acceptance in a real Claude Code session. | APPROVED |
| DEC-HIL-03 | 2026-09-25 | Product/Tech | DEC-07 open item: unparseable transcript lines are skipped without logging; only file I/O failures are logged. NFR-02 updated accordingly (non-material narrowing decided by the user). | APPROVED |
| DEC-HIL-04 | 2026-09-25 | Exception (BLK-01) | Reconcile with prd-06 through option A: a single port `PlanPresence.exists()` (file exists, valid or not); T02 `withPlan`/`withoutPlan` texts chosen in plan mode through `ZoneGuidance`; block v2 with `action`; remove `readPlanPresence`/`hasPlan`; update TechSpec DEC-06 and the prd-06 tests (v2, optional turn fields). User chose to continue in this session. | APPROVED |
| DEC-HIL-05 | 2026-09-25 | Reservations (codereview_01) | User chose "Finalize, go to QA": OI-01, OI-02, OI-03 recorded as accepted open items; proceed to sdd-execute-qa (step 6). User chose to continue in this session (the review session authored no code). | APPROVED |
| DEC-HIL-06 | 2026-09-25 | Exception (manual acceptance) | User chose "Authorize a headless run": the QA session runs `claude -p` in a scratch repo with the built package installed and a prompt making 30+ tool calls, using the user's Claude usage, and reads the ledger as manual-acceptance evidence. | APPROVED |
| DEC-HIL-07 | 2026-09-25 | Acceptance (HIL 3) | User chose "Accept and close": current delivery accepted (codereview_01 APPROVED WITH RESERVATIONS, OI-01..OI-03 accepted; qa_01 APPROVED). No commit or push requested. | APPROVED |

## Events

- EV-01 (2026-09-25): PRD written at `prd.md`; awaiting HIL 1.
- EV-02 (2026-09-25): HIL 1 approved; starting TechSpec in the same session.
- EV-03 (2026-09-25): TechSpec (DEC-01..13, CMP-01..13, TC-01..23, QA-01..08) and plan (T01..T05) written; awaiting HIL 2.
- EV-04 (2026-09-25): HIL 2 approved (DEC-HIL-02, DEC-HIL-03); PRD NFR-02, TechSpec and tasks updated for DEC-HIL-03; user chose snapshot and continue.
- EV-05 (2026-09-25): T01 done (usage-only CRITICAL, optional turn limits); gates green, coverage 94.87%.
- EV-06 (2026-09-25): user chose snapshot and end session after T01; next: T02.
- EV-07 (2026-09-25): session resumed from checkpoint; T02 done (block v2, plan-aware YELLOW/RED actions, readPlanPresence port); gates green, coverage 94.89%.
- EV-08 (2026-09-25): user chose snapshot and end session after T02; next: T03.
- EV-09 (2026-09-25): session 9cb0b74b resumed from checkpoint; T03 done (lastResetAt, nullable window, stale drop); gates green, coverage 94.89%.
- EV-10 (2026-09-25): user chose snapshot and end session after T03; next: T04.
- EV-11 (2026-09-25): session 4b74f2de resumed; T04 implemented (reader, async Claude input, tests, e2e). During validation the user merged upstream `5492604` (prd-06 delegated snapshot + PR #1); the autostash pop conflicted in `configuration.ts`, `block-message.ts`, `brake-engine.ts`, `session-zone.ts`, `telemetry-block.ts`, `wrap-telemetry.ts`, `runtime-composition.ts`. The stash is kept as `stash@{0}`. prd-06 overlaps T02: port `PlanPresence.exists()` (file exists, valid or not) and `ZoneGuidance.actionFor` versus T02 `readPlanPresence`/`hasPlan` (valid plan only) and `planPresent` in the block. Exception HIL opened (BLK-01).
- EV-12 (2026-09-25): BLK-01 resolved under DEC-HIL-04 (option A; plan check without the section limited to YELLOW/RED, recorded in TechSpec DEC-06). T04 done; gates green, coverage 95.39%. `stash@{0}` kept for the user.
- EV-13 (2026-09-25): user chose to end the session after T04; next: T05.
- EV-14 (2026-09-25): session 4fd3373a resumed from checkpoint; worktree matches EV-12 (7 files still flagged unmerged in the index, no conflict markers); starting T05.
- EV-15 (2026-09-25): T05 done (LEGACY_TURN_LIMITS, init normalization, Claude context_usage unknown, README/research/docs, O-01 repo config and code-standards example); gates green, coverage 95.43% lines, package:smoke pass. All tasks T01–T05 done; next: global review (sdd-review-code) in a session that did not author the code.
- EV-16 (2026-09-25): user chose to end the session after T05; next: global review in a new session.
- EV-17 (2026-09-25): session bdc9931c resumed from checkpoint (authored no code of this feature); worktree matches EV-15; starting global review (sdd-review-code).
- EV-18 (2026-09-25): global review `codereview_01/codereview.md` issued: APPROVED WITH RESERVATIONS (no blocking findings; OI-01 QA-08 test line counts, OI-02 legacy 7/10 turn limits stay active until `init --yes` (product risk, spec-conformant), OI-03 unparseable transcript timestamp never stale). Gates re-run: lint, typecheck, build, schemas:check, coverage 95.43% lines, package:smoke pass; one boot-git-delivery flake in the first coverage run (passes in isolation and in the second run). Reservations HIL opened.
- EV-19 (2026-09-25): reservations HIL answered (DEC-HIL-05): finalize with OI-01..OI-03 accepted; starting QA in session bdc9931c.
- EV-20 (2026-09-25): QA automated runs done (qa_01/evidence): 27/28 driver checks passed with the built CLI and hook; S1.11 reclassified as observation OBS-01 (pre-existing generic doctor config-error message); real-transcript reader check passed. Manual acceptance (real Claude Code session) pending; question asked to the user.
- EV-21 (2026-09-25): manual acceptance route decided (DEC-HIL-06): headless claude -p run in a scratch repo.
- EV-22 (2026-09-25): manual acceptance passed in a headless Claude Code 2.1.282 session (37 calls, measured throughout, GREEN to 42%, YELLOW at 57%/63%, RED at 69%, no deny; qa_01/evidence/manual-session.md). `qa_01/qa.md` issued: APPROVED (OBS-01 pre-existing generic doctor config message). HIL 3 opened.
- EV-23 (2026-09-25): HIL 3 accepted (DEC-HIL-07); feature completed. Open for the user: commit, index cleanup of 7 unmerged flags, stash@{0}, Linux/macOS CI after push, accepted reservations OI-01..OI-03, OBS-01.
