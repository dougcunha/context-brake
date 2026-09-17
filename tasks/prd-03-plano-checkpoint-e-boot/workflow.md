# Workflow and Decisions — prd-03-plano-checkpoint-e-boot

## Feature Summary

- Feature: `prd-03-plano-checkpoint-e-boot` (Plan, checkpoint, and boot)
- Workspace: `D:/MyProjects/ContextBrake`
- Status: `implementation` (Gates HIL 1 and HIL 2 approved; next gate HIL 3)
- Git base: `86961bb`
- Predecessor: `prd-02-telemetria-zonas-e-freio`, `completed` and accepted at HIL 3 on 2026-09-17

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-HIL-01 | 2026-09-17 | Product | PRD (`RF1`–`RF20`, `CA-01`–`CA-17`) approved as-is. `RF`/`CA` identifiers kept (PI-01 resolved per `AGENTS.md` and prd-02 precedent). PI-02 (simulation-based verification) and PI-03 (Windows-only platform evidence) accepted as non-blocking. | APPROVED |
| DEC-HIL-02 | 2026-09-17 | Architecture & Plan | TechSpec (`DEC-01`–`DEC-14`, `CMP-01`–`CMP-22`, `TC-01`–`TC-18`, `QA-01`–`QA-08`) and the `T01`–`T09` plan approved, authorizing implementation and corrections within these contracts. Preparatory refactoring not recommended (no target file crosses a structural threshold). CLI QA **will run** at acceptance via `sdd-execute-qa`, in a session that authored none of the code. | APPROVED |

## Baseline and pre-existing changes

Recorded at flow start, so later diffs are not attributed to this feature:

- `tasks/prd-02-telemetria-zonas-e-freio/context-snapshot.md` — modified (prd-02 closure)
- `tasks/prd-02-telemetria-zonas-e-freio/checkpoint.json`, `qa_01/`, `workflow.md` — untracked (prd-02 closure)
- `.agents/scheduled_tasks.lock` — untracked, unrelated

## Coverage findings (HIL 1 preparation)

Checked the PRD against repository reality before presenting the gate.

- **New work, confirmed absent.** `plan init` / `plan status` (RF1, RF19): `src/cli/commands/` holds only `doctor.ts`, `init.ts`, `remove.ts`. Plan and checkpoint schemas (RF6): `schemas/` holds only `context-brake.config.schema.json`, `doctor-report.schema.json`, `install-report.schema.json`. Plan and checkpoint entities and validation (RF4, RF5, RF7, RF8) have no implementation.
- **Already partly built, extend rather than create.** `renderProtocol` in `src/core/services/protocol-service.ts` already emits the `## Starting a new session` routine referencing a boot summary, so RF13 extends existing generation.
- **Declared but unused configuration.** `stateStorage.instructCheckpointCommit` and `stateStorage.bootMaxTokens` are defined in `src/core/contracts/configuration.ts:56`, defaulted at `:60` (`true` and `1000`), and are **required** properties of the published `schemas/context-brake.config.schema.json`. Neither is read by any production code path; both appear only in four integration test fixtures. `zoneActionClause` in `src/core/services/zone-actions.ts:26` does not accept `instructCheckpointCommit`, and the `RED` protocol text at `:13` hardcodes the `checkpoint: <step title>` commit sentence. RF17, RF18, RF12, and CA-08/CA-14 therefore consist partly of wiring keys that already ship as required.
- **Research backing confirmed.** The session-start injection matrix behind RF9 and the high-level constraints is documented per harness in `docs/research/harness-integrations.md:9-14`, with Pi at `:130` explicitly deferring the boot to PRD-03 and Antigravity's indirect `PreInvocation`/`injectSteps` path at `:165`.
- **Test rules already anticipate the commands.** `.agents/rules/tests.md` names `plan init` and `plan status` among the critical end-to-end flows and sets the 1,000-token boot summary budget, matching CA-08.

## Pending items for HIL 1

- **PI-01 (non-blocking, identifier scheme).** The PRD uses `RF`/`CA` in Portuguese. `sdd-create-prd` step 3 prescribes `OBJ`/`US`/`FR`/`NFR` for new drafting, but `AGENTS.md` sanctions `RF`/`CA` for PRDs still written in Portuguese, and prd-02's decision log records `RF1`–`RF22` / `CA-01`–`CA-23`. Recommendation: keep `RF`/`CA` for consistency with the sibling PRDs; renumbering would break existing traceability.
- **PI-02 (verification reach).** CA-11 and CA-17 depend on simulated sessions. prd-02 left no real Pi, Oh-My-Pi, or OpenCode installation available (`O-02` in its closed snapshot), so per-harness boot delivery will be verified against documented fixtures and the existing `tests/support/harness-simulator/`, not real captures. The PRD already states this limit under "Verificação por simulação".
- **PI-03 (platform reach).** prd-02 was validated on Windows / Node 24 only; the Linux/macOS × Node 20/22/24 CI matrix (`O-04`) has still not run and will equally bound this feature's acceptance evidence.

## Milestone History

1. **Flow start (2026-09-17)**: State reconciled for a feature that had only `prd.md` (tracked, unmodified, committed in `2471b3d`). No prior checkpoint, workflow, TechSpec, or task plan existed, so no prior approval was on record. Checkpoint created and HIL 1 opened.
2. **HIL 1 approved (2026-09-17)**: PRD accepted as the product contract without changes. User chose to continue in the same session; the independence rule does not apply to TechSpec authoring. Stage advanced to design and planning (`sdd-create-techspec`, then `sdd-plan-tasks`), targeting HIL 2.
3. **TechSpec and plan written (2026-09-17)**: `techspec.md` records `DEC-01`–`DEC-14`, `CMP-01`–`CMP-22`, `TC-01`–`TC-18`, and `QA-01`–`QA-08`. Terrain measured at `86961bb`: no target file crosses a structural threshold, so **preparatory refactoring is not recommended** and the baseline rows are clean; the one saturation risk (`argument-parser.ts` growth) is absorbed under `DEC-14`. `tasks.md` decomposes the work into `T01`–`T09` with an acyclic DAG. Plan verified before the gate: all nine task links resolve and no template placeholders remain. HIL 2 opened.
4. **HIL 2 approved (2026-09-17)**: Solution and plan accepted without changes; CLI QA confirmed for acceptance. User chose to continue in the same session. Stage advanced to implementation via `sdd-orchestrate-tasks`, one task per run beginning at `T01`, with a session pause after each.
