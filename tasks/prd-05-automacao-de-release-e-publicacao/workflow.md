# Workflow and Decisions — prd-05-automacao-de-release-e-publicacao

## Feature Summary

- Feature: `prd-05-automacao-de-release-e-publicacao` (Automation of release and publication to npm)
- Workspace: `D:/MyProjects/ContextBrake`
- Status: `active`
- Git base: `eb2f386583771f03334ecbf23afbd5361814e5f7`
- Predecessors: `prd-01-instalacao-deteccao-diagnostico`, `prd-01.1-pendencias-da-instalacao`, `prd-02-telemetria-zonas-e-freio`, `prd-03-plano-checkpoint-e-boot`, `prd-04-runner-de-reinicio-automatico` (`completed`)

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-HIL-01 | 2026-09-24 | Product | PRD (`FR-01`–`FR-07`, `NFR-01`–`NFR-04`, `OBJ-01`–`OBJ-05`, `US-01`–`US-05`) approved as-is. PI-01–PI-03 accepted as non-blocking. Human text: "(Recommended) Approve as-is: accept FR-01–FR-07 and NFR-01–NFR-04, and proceed to TechSpec and planning". | APPROVED |
| DEC-PAUSE-HIL1 | 2026-09-24 | Session continuity | After HIL 1, chose "(Recommended) Continue in this session: proceed directly to drafting the TechSpec". Proceeding to draft TechSpec and task plan. | RECORDED |
| DEC-HIL-02 | 2026-09-24 | Architecture & Plan | TechSpec (`DEC-01`–`DEC-07`, `CMP-01`–`CMP-06`, `TC-01`–`TC-07`, `QA-01`–`QA-06`) and task plan (`T01`–`T03`) approved as-is, authorizing implementation and corrections within these contracts. Preparatory refactoring not recommended. CLI QA will not run at acceptance (skipped per user decision; feature affects CI/CD and scripts, verified via unit/integration and package smoke tests). Human text: "(Recommended) Approve as-is: accept TechSpec, DAG, tasks T01–T03, and authorize implementation"; "(Recommended) Skip CLI QA: feature affects CI/CD and scripts, verified via unit/integration and package smoke tests". | APPROVED |
| DEC-PAUSE-HIL2 | 2026-09-24 | Session continuity | After HIL 2, chose "(Recommended) Continue in this session: proceed directly to executing T01". Proceeding to T01 execution in this session. | RECORDED |
| DEC-PAUSE-T01 | 2026-09-24 | Session continuity | After T01, chose "(Recommended) Continue in this session: proceed directly to executing T02". Proceeding to T02 execution in this session. | RECORDED |
| DEC-PAUSE-T02 | 2026-09-24 | Session continuity | After T02, chose "(Recommended) Continue in this session: proceed directly to executing T03". Proceeding to T03 execution in this session. | RECORDED |
| DEC-PAUSE-T03 | 2026-09-24 | Session continuity | After T03 (all tasks complete), chose "(Recommended) Snapshot and end session: context snapshot is saved; resume in a new session to run code review under the independence rule". Proceeding to end session before review. | RECORDED |
| DEC-HIL-03 | 2026-09-24 | Acceptance | Delivery approved and accepted at HIL 3 as-is. All tasks complete, code review APPROVED, Quality Profile clean (0 blocking, 0 reservations). Human text: "(Recommended) Accept delivery: approve HIL 3 and complete feature prd-05-automacao-de-release-e-publicacao". | APPROVED |

## Milestone History

1. **Flow start (2026-09-24)**: State reconciled for `prd-05-automacao-de-release-e-publicacao`. PRD (`FR-01`–`FR-07`, `NFR-01`–`NFR-04`) present; initial checkpoint and workflow created. HIL 1 opened.
2. **HIL 1 approved (2026-09-24)**: PRD approved as-is (`DEC-HIL-01`). User continued in the same session (`DEC-PAUSE-HIL1`). Advanced to `sdd-create-techspec` and `sdd-plan-tasks`.
3. **TechSpec and plan written (2026-09-24)**: `techspec.md` (`DEC-01`–`DEC-07`, `CMP-01`–`CMP-06`, `TC-01`–`TC-07`, `QA-01`–`QA-06`) and `tasks.md` (`T01`–`T03`) created. Preparatory refactoring not recommended. HIL 2 opened.
4. **HIL 2 approved (2026-09-24)**: Architecture and task plan approved as-is (`DEC-HIL-02`). CLI QA skipped per user decision. User continued in same session (`DEC-PAUSE-HIL2`).
5. **T01 completed (2026-09-24)**: T01 is done, with evidence in `done/task_01.md#Handoff`. `scripts/check-release-tag.ts` implemented and tested with 12 unit tests in `tests/unit/check-release-tag.test.ts`. Added `release:verify-tag` and `release:check` to `package.json`. Added `tasks/**` and `.agents/**` to `eslint.config.js` ignores so `npm run lint` passes cleanly. T02 and T03 are now eligible.
6. **T02 completed (2026-09-24)**: T02 is done, with evidence in `done/task_02.md#Handoff`. `.github/workflows/release.yml` created with tag triggers, `workflow_dispatch`, minimal permissions (`contents: write`, `id-token: write`), full pre-release gate, npm provenance publish, and GitHub release creation. Created `tests/unit/release-workflow.test.ts` (5 tests passing). T03 is now eligible.
7. **T03 completed (2026-09-24)**: T03 is done, with evidence in `done/task_03.md#Handoff`. Created `docs/release-guide.md` with complete maintainer release guide. Confirmed via `npm run package:smoke` that `docs/release-guide.md` is excluded from the published npm package files. All implementation tasks (T01, T02, T03) are completed. Implementation phase closed. Ready for review phase (`sdd-review-code`).
8. **Code review approved (2026-09-24)**: Global code review completed (`codereview_01/codereview.md`) with status `APPROVED`. All obligations (`FR-01`–`FR-07`, `NFR-01`–`NFR-04`, `DEC-01`–`DEC-07`, `TC-01`–`TC-07`) verified conformant. Quality Profile verified with 0 blocking hits and 0 reservations. Author-independence limitation recorded (review executed in resumed authoring session; mitigated by comprehensive regex checks and fresh test suite runs). CLI QA skipped per `DEC-HIL-02`. Advanced directly to Step 6 Acceptance (HIL 3).
9. **HIL 3 accepted & Feature completed (2026-09-24)**: Final delivery accepted by user (`DEC-HIL-03`). All requirements met, documentation complete, workflows and scripts verified. Feature `prd-05-automacao-de-release-e-publicacao` marked `completed`.

Recorded at flow start, so later diffs are not attributed to this feature:

- Git base commit: `eb2f386583771f03334ecbf23afbd5361814e5f7`
- Pre-existing uncommitted worktree changes from completed feature `prd-04-runner-de-reinicio-automatico` (runner, wrap, session lifecycle, schemas, run summary, tests, and task tracking files).
- Baseline repository checks: `typecheck`, `schemas:check`, and `package:smoke` all pass on the current worktree.

## Coverage findings (HIL 1 preparation)

Checked the PRD against repository reality before presenting the gate:

- **New work, confirmed absent:**
  - `.github/workflows/release.yml` (FR-01, FR-02, FR-03, FR-04, FR-05) does not exist yet; currently only `.github/workflows/ci.yml` exists.
  - Script `npm run release:check` (FR-06) is not yet registered in `package.json`.
  - Documentation `docs/release-guide.md` (FR-07) does not exist yet.
- **Already built, reuse rather than duplicate:**
  - Pipeline validation sequence (FR-02): `npm run schemas:check`, `npm run dependencies:check`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, and `npm run package:smoke` already exist as scripts in `package.json` and are exercised in `ci.yml`.
  - Content boundary verification (NFR-02): `scripts/check-package.ts` already enforces that no forbidden directories (`tests/`, `.github/`, `.agents/`, `tasks/`) or uncompiled `.ts` files are included in the published npm package.
- **Research and operational dependencies:**
  - npm Provenance requires GitHub Actions OIDC (`id-token: write`) and `npm publish --access public --provenance`.
  - GitHub Release creation (FR-05) requires `contents: write` permission and `actions/create-release` or GitHub CLI / `gh release create`.
  - Tag consistency verification (FR-03) requires a script or shell check comparing the tag name (`${GITHUB_REF#refs/tags/v}`) to the `"version"` field in `package.json`.

## Pending items for HIL 1

- **PI-01 (non-blocking, identifier scheme).** The PRD uses `FR-01`–`FR-07`, `NFR-01`–`NFR-04`, `OBJ-01`–`OBJ-05`, `US-01`–`US-05` in bilingual structure (headings in English, requirements text in Portuguese), conforming to `AGENTS.md`. Recommendation: keep as-is.
- **PI-02 (non-blocking, GitHub Secrets & OIDC execution reach).** Publishing to npm with provenance cannot be fully executed in a local development environment because it requires GitHub Actions OIDC tokens and repository secrets (`NPM_TOKEN`). Verification during implementation will validate workflow syntax, scripts, dry-run package packing, and local `release:check`. Recommendation: accept as planned; actual release execution occurs on repository tag push by the maintainer.
- **PI-03 (non-blocking, package files list).** `docs/release-guide.md` is developer/maintainer documentation; the TechSpec should explicitly specify whether it belongs in the npm package tarball (`files` in `package.json`) or remains in the repository root documentation only. Recommendation: keep in repository documentation without packaging into npm distribution files, preserving minimal package footprint.
