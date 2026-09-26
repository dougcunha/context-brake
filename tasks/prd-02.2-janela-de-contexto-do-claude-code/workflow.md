# Workflow and Decisions — prd-02.2-janela-de-contexto-do-claude-code

## Feature Summary

- Feature: `prd-02.2-janela-de-contexto-do-claude-code` (Real context window in Claude Code)
- Workspace: `D:/MyProjects/ContextBrake`
- Git base: `5917593` (T01–T05 and this flow's artifacts are uncommitted; dogfooding changes from `init` on this repository are outside the feature, see `codereview_01/codereview.md#sources-and-scope`)
- Coordinator session: `33e595e5-7996-4a90-bd7a-54c61013c5bf` (from 2026-09-26; earlier sessions ran without a checkpoint)

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-HIL-01 | 2026-09-25 | Product | HIL 1: PRD 2.2 approved, with the bridge in `.claude/settings.local.json`. Reconstructed on 2026-09-26 from `context-snapshot.md` D-01; the implementation and review that followed are consistent with it. | APPROVED (reconstructed) |
| DEC-HIL-02 | 2026-09-25 | Architecture & Plan | HIL 2: TechSpec (DEC-01..13, CMP-01..14, TC-01..21) and plan T01..T05 approved, with no preparatory refactoring. Reconstructed from snapshot D-02. | APPROVED (reconstructed) |
| DEC-HIL-03 | 2026-09-25 | Exception (T03) | Two deviations: state file owner `harness_entry` instead of `runtime_state` (DEC-07), and optional `AdapterPlan.findings` (DEC-09). Recorded in `tasks.md#problems-and-solutions` and snapshot D-04. | APPROVED |
| DEC-HIL-04 | 2026-09-26 | Exception (codereview_01 round 1) | CR-01: user asked "Adote a que tem mais precisão para cada harness ao invés de forçar um padrão." Adopted per-harness precedence for the window on both measured and estimated readings: harness-reported window (Pi, Oh-My-Pi) > status line window (Claude Code bridge) > `contextWindowCeiling`; the window is chosen regardless of reset staleness, only tokens are dropped (FR-06). Implemented as option A (`resolveUsage` estimated branch uses `measured.contextWindow ?? ceiling`) plus `mergeMeasurements` keeping the window from a stale reading. CR-04: commit to a new branch, push, and open a draft PR at T12 authorized. OI-01 and OI-02 join the round as T13 and T14. User chose to continue in this session. | APPROVED |
| DEC-HIL-05 | 2026-09-26 | Exception (BLK-01) | User chose "Revise budgets": amend PRD NFR-01/OBJ-04, TechSpec DEC-13 and TC-20. Bridge: at most 50 ms p95 over one Node start (CI rule: measured − baseline ≤ 50 + p95 of an empty `node -e`). Hooks with 200 `statusline` lines: at most 120 ms p95 on CI. Bridge design unchanged. Implemented as codereview_01/T15; CI rerun on PR #2 closes T12. User chose to continue in this session. | APPROVED |

## Events

- EV-01 (2026-09-25): T01–T05 implemented and moved to `done/`; manual acceptance reported as passed by the user (`done/task_05.md#handoff`).
- EV-02 (2026-09-25): global review `codereview_01/codereview.md` issued in a session that authored no code: REJECTED (CR-01 High; CR-02–CR-04 Medium; CR-05–CR-07 Low; OI-01, OI-02 optional).
- EV-03 (2026-09-26): session 33e595e5 started `sdd-orchestrate-flow`; no checkpoint existed, so state was reconciled from the snapshot, manifest, and review, and this file and `checkpoint.json` were created. This session authored no code of the feature.
- EV-04 (2026-09-26): correction round 1 planned from codereview_01 as T06–T12 in `codereview_01/`. CR-01 (DEC-06 amendment) and CR-04 (CI run needs a push) need an exception HIL decision.
- EV-05 (2026-09-26): exception HIL answered (DEC-HIL-04); T06/T07 contracts updated to the per-harness precedence; T13 (OI-01) and T14 (OI-02) added; starting sdd-execute-corrections with T06.
- EV-06 (2026-09-26): T06–T11, T13, T14 done in session 33e595e5 (full suite 263/263, 95.39% statements). Starting T12 under DEC-HIL-04: branch `feat/prd-02.2-claude-context-window`, commit of the feature paths only (src, tests, assets, scripts, schemas, docs, README, this folder); dogfooding files and `.agents/settings.local.json` stay uncommitted.
- EV-07 (2026-09-26): T12 pushed commit `66e46cf` to `feat/prd-02.2-claude-context-window` with draft PR #2. CI run 36256275030: ubuntu passes; macOS and Windows fail only TC-20 (bridge +62 to +68 ms vs 50 on Windows and macOS Node 22/24; PreToolUse +105.8 vs 100 once on macOS Node 20). CR-03 proven on all 9 jobs. BLK-01 opened: NFR-01/OBJ-04 contract decision (exception HIL). Evidence in `codereview_01/task_12.md#handoff`.
- EV-08 (2026-09-26): BLK-01 answered (DEC-HIL-05); T15 planned in `codereview_01/`.
