# Code review report — Installation, Detection, and Diagnostics

## Summary

- Status: REJECTED
- Git scope: `Not delimited — see limitations` (repository has zero commits, no `HEAD`, and no remote; reviewed the full worktree, using the `codereview_04` correction handoffs T12–T15 and pending T16 as the change boundary)
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_04/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read in full |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read in full |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read; links T01–T11, records T12–T16 in prose |
| Correction tasks under review | `codereview_04/done/task_12.md`–`task_15.md`, `codereview_04/task_16.md` | read in full |
| Reconciled earlier task | `codereview_03/done/task_11.md` | read in full |
| Previous reports | `codereview_01/` through `codereview_04/codereview.md` | `codereview_04` read in full; all four hashes checked |
| Implementation | Worktree `src/`, `tests/`, `.github/workflows/ci.yml`, `vitest.config.ts`, `package.json`, `README.md` | limited to the all-untracked worktree and handoff inventory |

The skill was invoked as `--prd prd-01-instalacao-deteccao-diagnostico --num 4`. The skill defines only `--prd` and `--base`, so `--num 4` was read as a request to re-review the `codereview_04` correction round. `codereview_04/` already holds an immutable report, so this report uses the next free suffix, `codereview_05/`.

`git rev-list --count --all` returned `0`, `git rev-parse HEAD` failed, and `git remote -v` returned nothing. With no base and no resolvable commit, the reviewable set is the current worktree. The change boundary comes from the T12–T15 handoffs:
- **T12:** `src/core/services/doctor-service.ts` and the doctor, report, text, E2E-07/08, E2E-09, and linked-root E2E tests.
- **T13:** `codereview_03/done/task_11.md` and `tasks.md`.
- **T14:** `tests/helpers/link-capability.ts`, its unit test, and the four link suites.
- **T15:** seven task handoffs.

Generated `dist/` was rebuilt for execution; it is not a source surface.

The local Markdown link resolver found 0 broken local targets (23 Markdown files, 21 local links). The SHA-256 hashes of all four previous reports match the values recorded in T13 and T15: `b87794d7…`, `bd735113…`, `57a2f35f…`, `dc94048e…`. External vendor links were not reopened: T12–T15 changed no adapter contract, and `codereview_04` confirmed their reachability on the same date (2026-09-14).

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect all eight MVP harnesses | `src/infrastructure/harnesses/registry.ts`, per-harness detectors | IT-16 | conformant | Sequential rerun passed 215/215 |
| RF2 | Evidence origin and version provenance | `detection-service.ts`, `detection-collector.ts` | UT-03, UT-15 | conformant | Current suite green |
| RF3 | Shared instruction files are not harness proof | detector evidence policy | UT-01, IT-16 | conformant | Current suite green |
| RF4 | Explicit include/exclude overrides detection | `argument-validator.ts`, `detection-service.ts` | UT-02, IT-03 | conformant | Current suite green |
| RF5 | Register through documented mechanisms | eight planners, five runtime assets | IT-01, IT-02, package tests | conformant | `assets:check` passed; `package:smoke` verified 187 files |
| RF6 | Preserve user integrations and bytes | JSON/JSONC editor, planners | UT-04, UT-19, IT-01 | conformant | Current suite green |
| RF7 | Isolate invalid harness config | planner conflicts | UT-05, IT-04, E2E-05 | conformant | Current suite green |
| RF8 | Derive and display support level | `support-service.ts` | UT-18 | conformant | Doctor repro keeps `full` for Claude and Cursor while warning on the floor |
| RF9 | Warn below a verified version floor | `version-service.ts`, `support-service.ts` | UT-15, IT-13 | conformant | Injected floors prove comparison; every real adapter floor defaults to `null` (`src/infrastructure/harnesses/common/version-probes.ts:10`) |
| RF10 | Create project protocol | `protocol-service.ts` | protocol unit, E2E-01 | conformant | Current suite green |
| RF11 | Bounded reference block | `instruction-markers.ts`, `instruction-service.ts` | UT-07, IT-06 | conformant | Current suite green |
| RF12 | No instruction files without explicit option | `instruction-service.ts` | UT-08, IT-06 | conformant | Current suite green |
| RF13 | Deduplicate linked instruction files, keep links | physical identity, snapshot `realPath` | UT-06, IT-05, E2E-10 | conformant locally | IT-05 and E2E-10 CA-07 executed on this host; both can pass silently when link creation fails (CR-04) |
| RF14 | Legacy preview without implicit deletion | `legacy-preview.ts`, `init.ts` | legacy unit/E2E | conformant | Current suite green |
| RF15 | Versioned default configuration | `configuration.ts`, `installation-builder.ts` | configuration/README tests | conformant | Current suite green |
| RF16 | Config field, value, and rule on failure | `configuration-validator.ts` | UT-12, IT-10 | conformant | Current suite green |
| RF17 | Publish current schemas | `schemas/`, generation scripts | schema/package checks | conformant | `schemas:check` passed; `finding.code` stays an open `^[A-Z0-9_]+$` pattern, so T12 needed no schema change |
| RF18 | Dry-run the exact plan | init/remove, `ChangePlan` | UT-10, IT-08, E2E-06 | conformant | Current suite green |
| RF19 | Remove only owned content; state needs consent | `removal-service.ts`, `removal-helper.ts` | UT-11, IT-09, E2E-07 | conformant | Current suite green |
| RF20 | Doctor reports integration, version, support, limitations | `doctor-service.ts:31-46`, output renderers | UT-13, T12 unit cases, E2E-08, E2E-09 | conformant | Built-CLI repro: two installed integrations produce exactly two `VERSION_FLOOR_UNVERIFIED` warnings |
| RF21 | Validate config, markers, protocol, state | `doctor-checks.ts` | doctor unit, IT-10 | conformant | Current suite green |
| RF22 | Measure p95 and compare with target | `overhead-measurer.ts`, `p95.ts` | UT-17, IT-14, E2E-08 | conformant | Repro p95 81.3 and 93.6 ms; workspace 96.9 ms; all `pass` against 100 ms. Status propagation of a failed target remains OI-02 |
| RF23 | Equivalent text/JSON findings, stable exits | `report-service.ts:29-33`, `text.ts`, exit constants | UT-16, UT-20, E2E-09 | conformant | JSON and text both exit 1 with the same code; stderr empty |
| CA-01 | Claude `init --yes` installs and summarizes | init pipeline | E2E-01, E2E-10 | conformant | E2E-10 PowerShell and Git Bash passed with `CI=true` |
| CA-02 | Codex and Cursor install together | multi-adapter planning | IT-02, E2E-02 | conformant | Current suite green |
| CA-03 | `AGENTS.md`-only warns without installing | detection policy | UT-01, E2E-03 | conformant | Current suite green |
| CA-04 | Copilot exclusion leaves Cursor only | selection policy | UT-02, IT-03 | conformant | Current suite green |
| CA-05 | Three installs are byte-idempotent | planners/change plan | UT-04, E2E-04, E2E-10 | conformant | E2E-10 idempotency passed in both Windows shells |
| CA-06 | Invalid adapter file untouched, peers continue | conflict isolation | UT-05, IT-04, E2E-05 | conformant | Current suite green |
| CA-07 | Symlinked `AGENTS.md` written once, link survives | instruction identity | UT-06, IT-05, E2E-10 | conformant locally | Executed on this host; silent-pass path in `e2e-10-fixtures.ts:63-64` and `symlink-junction.test.ts:18-22` (CR-04) |
| CA-08 | Reference block ≤ 10 lines | block renderer | UT-07, IT-06 | conformant | Current suite green |
| CA-09 | Missing instruction files stay absent | instruction planner | UT-08, IT-06 | conformant | Current suite green |
| CA-10 | Legacy block unchanged, migration previewed | legacy preview path | legacy unit/E2E | conformant | Current suite green |
| CA-11 | Dry-run changes nothing, lists plan | command/apply split | UT-10, IT-08, E2E-06 | conformant | Current suite green |
| CA-12 | Removal preserves content and state | conservative removal | UT-11, IT-09, E2E-07 | conformant | Current suite green |
| CA-13 | Invalid zone ordering exits with structured error | config validator | UT-12, IT-10 | conformant | Current suite green |
| CA-14 | Removed integration diagnosed missing/error | doctor adapter checks | UT-13, IT-11 | conformant | Error precedence over the new warning covered in `doctor-service.test.ts:85-91` |
| CA-15 | Copilot partial with timeout impact | Copilot capabilities | UT-14, IT-12 | conformant | Current suite green |
| CA-16 | Old harness shows detected/minimum/capability | version gate | UT-15, IT-13 | conformant | Injected floors; an unknown floor is now a stable warning instead of silent `healthy` |
| CA-17 | Doctor JSON valid and equal to text | canonical `DoctorReport` | UT-16, E2E-08, E2E-09 | conformant | E2E-09 parses with `doctorReportSchema`; text shows `[WARN] VERSION_FLOOR_UNVERIFIED` |
| CA-18 | Doctor shows p95 and target result | benchmark/report path | UT-17, IT-14, E2E-08 | conformant | IT-14 passed in isolation and rerun; failed once under suite load with `sampleCount` 0 (CR-03) |
| CA-19 | README quick start error-free under two minutes | README, built CLI | E2E-09 | conformant in behavior; gate unstable | Zero error findings, `warnings`/exit 1. The test timed out at the 30,000 ms runner limit in 2 of 3 full runs (CR-03) |
| CA-20 | CA-01/05/07 on Linux, macOS, Windows (PowerShell, Git Bash) | `.github/workflows/ci.yml`, E2E-10 | E2E-10 | not verifiable | Windows only; no commit, remote, or CI artifact; T16 pending (CR-01) |
| TechSpec `CapabilityProfile` unknown floor | Emit `VERSION_FLOOR_UNVERIFIED`; claim no compatibility | `doctor-service.ts:31-46` | `doctor-service.test.ts:51-91`, `report-service.test.ts:48-59`, `cli-output-text.test.ts:67-91`, E2E-08, E2E-09 | conformant | `codereview_04/CR-02` resolved |
| TechSpec `ChangePlan.projectRoot` | Absolute canonical root | `main.ts`, `composition-root.ts`, snapshot propagation | linked-root suites | conformant | Linked-root integration and E2E passed with `CI=true` |
| TechSpec Testing Approach / `tests.md` Repeatable | Tests do not depend on the machine environment | `tests/helpers/link-capability.ts:8-10` | `tests/unit/link-capability.test.ts:36-43` | non-conformant | Test fails with `CI=true` (CR-02) |
| `tests.md` Platforms | Link setup failures skip with a reason or fail in CI, never pass silently | `requireLink` in four suites; not used by E2E-10 or IT-05 | four link suites, E2E-10, IT-05 | non-conformant | Nine `codereview_04/CR-04` branches corrected; two silent paths remain (CR-04) |
| SDD task state | Every task has consistent location, state, evidence | task files and manifest | checkbox scan | pending | T01–T15 all checked under `done/`; T16 has 4 unchecked items at `codereview_04/task_16.md` (consistent, but incomplete) |
| SDD source links and locations | Links and recorded locations resolve | task handoffs | link resolver, path scan | conformant with residual | 0 broken links; one false self-location at `done/task_6.md:98` (CR-05) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | NOT OK | `npm run lint` passes all configured limits; `tests/helpers/link-capability.ts:7,32` add comments against the no-comment rule (CR-06) |
| `javascript-typescript.md` | OK for T12–T15 changes | Strict typecheck and lint pass. The pre-existing `tests/e2e/e2e-10-fixtures.ts:27` discards the link error, which is part of CR-04 |
| `node.md` | OK | Build passes; `dependencies:check` finds 3 runtime packages with no install scripts; runtime audit reports 0 vulnerabilities |
| `tests.md` | NOT OK | CR-02 (environment-dependent unit test), CR-03 (timeout-bound mandatory E2E), CR-04 (silent link-setup pass) |
| `harness-adapters.md` | N/A | No adapter, fixture, or vendor contract changed in T12–T15 |
| `file-changes.md` | OK | No production file-change path changed; linked-root and concurrency suites pass with `CI=true` |
| `cli-output.md` | OK | `[WARN]` label rendered, exit constants unchanged, `doctor --json` writes one schema-valid document with empty stderr |
| Hexagonal architecture (`AGENTS.md`) | OK | `doctor-service.ts:1-8` imports only core contracts and services |
| `sdd-review-code` | NOT OK in reviewed artifacts | T16 incomplete (CR-01); one false recorded location (CR-05) |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 (derived) | At most 100 lines/file, 30 lines/function, 3 parameters | blocking | `npm run lint` | 0 | OK |
| QA-02 (derived) | At least 80% lines/statements/functions/branches | blocking | `npm run coverage` | 0 threshold hits | OK in sequential rerun: 91.34% statements, 82.82% branches, 96.15% functions, 91.34% lines. The first coverage run failed on the E2E-09 timeout before reporting (CR-03) |
| QA-03 (derived) | Strict TypeScript check | blocking | `npm run typecheck` | 0 | OK |
| — | Formal TechSpec `QA-NN` profile and Terrain baseline | — | TechSpec read in full | missing | gap; see limitations |

- Terrain baseline: missing. The TechSpec defines no quality profile or Terrain baseline; the derived gates above were run as absolute checks.
- Hits discounted by baseline: none; there is no baseline to subtract.
- Reservations accumulated in the feature: 3 (OI-01, OI-02, OI-03).
- Suggested escalation: no trigger fired. The TechSpec defines no reservation-trigger table, so no escalation skill is suggested.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal ports/adapters and acyclic flow | YES | T12 derivation lives in core and imports no infrastructure or CLI module |
| Durable self-contained runtime assets | YES | `assets:check` and `package:smoke` (187 files) passed |
| Machine-only detections remain candidates | YES | Detection suites green |
| Surgical edits preserve bytes; invalid input refused | YES | JSON/JSONC and conflict suites green |
| Per-file atomicity and optimistic concurrency | YES | `FILE_CHANGED_SINCE_PREVIEW` E2E passed with `CI=true` |
| Canonical `FileChange.realPath` and `ChangePlan.projectRoot` | YES | T10/T11 suites green |
| Legacy migration requires separate consent | YES | Legacy suites green |
| Conservative removal; explicit state deletion | YES | Removal suites green |
| Stable exit codes 0/1/2, 64, 130 | YES | Constants unchanged; the new warning reuses existing precedence (`report-service.ts:29-33`) |
| Unknown floor emits `VERSION_FLOOR_UNVERIFIED` and claims no compatibility | YES | `doctor-service.ts:31-46`; built-CLI repro and workspace doctor |
| Unknown floor leaves support profile unchanged | YES | Repro integrations stay `installed`/`full` with `minimumVersion: null` |
| Benchmark targets 100/15 ms; failure yields `unavailable`, never a fabricated zero | YES | p95 passes; the IT-14 failure under load reported `sampleCount` 0 with `unavailable`, not a zero p95 |
| Tests use no machine or environment dependence | PARTIAL | `link-capability.test.ts:36-43` depends on ambient `CI` (CR-02) |
| Linux/macOS/Windows CI acceptance evidence | PARTIAL | Windows PowerShell and Git Bash only (CR-01) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_1.md` | COMPLETE | TechSpec link repaired by T15; gates green |
| T02 | `done/task_2.md` | COMPLETE | Link and self-location repaired by T15 |
| T03 | `done/task_3.md` | COMPLETE | Link and self-location repaired by T15 |
| T04 | `done/task_4.md` | COMPLETE | Link and self-location repaired by T15 |
| T05 | `done/task_5.md` | COMPLETE | Link and self-location repaired by T15 |
| T06 | `done/task_6.md` | COMPLETE with false recorded location | Link repaired by T15; line 98 still omits `done/` (CR-05); CA-20 platform evidence is incomplete (CR-01) |
| T07–T09 | `codereview_01/done/task_07.md`–`task_09.md` | COMPLETE | Linked from `tasks.md`; regression suites green |
| T10 | `codereview_02/done/task_10.md` | COMPLETE | Self-location repaired by T15; linked from `tasks.md` |
| T11 | `codereview_03/done/task_11.md` | COMPLETE | 5/5 items checked with a reconciliation note at line 42; linked from `tasks.md` |
| T12 | `codereview_04/done/task_12.md` | COMPLETE | Derivation and tests verified; built-CLI repro matches the handoff. The added second benchmarked doctor run in E2E-09 contributes to CR-03 |
| T13 | `codereview_04/done/task_13.md` | COMPLETE | T11 ledger consistent; lineage rows T07–T11 with valid links; reports unchanged. OI-03 notes T12–T16 are not rows |
| T14 | `codereview_04/done/task_14.md` | COMPLETE per ledger, acceptance defect | Nine bare returns removed and all eight affected tests executed with `CI=true`; its policy unit test fails when `CI=true` (CR-02) |
| T15 | `codereview_04/done/task_15.md` | COMPLETE | Eleven enumerated references fixed; 0 broken links; the handoff itself reports the residual `done/task_6.md:98` (CR-05) |
| T16 | `codereview_04/task_16.md` | INCOMPLETE (pending) | T16.1–T16.4 unchecked; handoff "Pending execution"; no commit, remote, or CI run exists |

## Executed validations

- **Profile and scope:**
  - Host: Windows 11 Pro 10.0.26200; Node v24.19.0; npm 11.17.0; git 2.55.0.windows.5; GNU bash 5.3.15 (MSYS).
  - E2E-10 ran its `powershell.exe` and Git Bash variants as selected by `tests/e2e/shell-runner.ts`.
  - No Linux or macOS host or CI run was available. Following the CLI policy in `AGENTS.md`, end-to-end tests ran the built CLI in temporary fixture directories.
- **Validated state:**
  - Current worktree, rebuilt into `dist/`. No source, test, task, or report file changed during the review; the reviewer wrote only to its scratchpad and to this report.
  - The first `npm test` (10:20:55–10:21:41) ran with no other reviewer process. The first `npm run coverage` (10:21:41–10:22:24) overlapped a 1.3 s single-file Vitest run for about its last 3 seconds.
  - The rerun executed every command sequentially with no overlap.
- **Reused evidence:**
  - No handoff gate result was reused.
  - External vendor link reachability from `codereview_04` (same date, no adapter change) was reused.
- **Manual acceptance:**
  - The T12 manual check was re-executed with the built CLI on a new Claude + Cursor fixture.
  - No interactive TTY confirmation session was run, and the TechSpec identifies no essential manual-only criterion.

| Command or check | Result | Obligations covered |
| --- | --- | --- |
| `npm install --ignore-scripts` | passed; npm reported 3 moderate advisories in the development tree | dependency installation |
| `npm run build` | passed | build, schemas, runtime assets |
| `npm run typecheck` | passed | QA-03 |
| `npm run lint` | passed | QA-01 |
| `npm test` (first run) | failed: 2 failed / 213 passed. E2E-09 `Test timed out in 30000ms`; IT-14 `expected +0 to be 20` | CR-03 |
| `npm run coverage` (first run) | failed: 1 failed / 214 passed, E2E-09 timeout | CR-03 |
| `npx vitest run tests/e2e/e2e-09.test.ts tests/integration/doctor-benchmark.test.ts` (isolated) | passed 3/3; E2E-09 workflow 6,729 ms, IT-14 2,753 ms | CR-03 isolation |
| `npx vitest run --reporter=verbose` (sequential rerun) | passed 215/215, 0 skipped; E2E-09 28,605 ms, IT-14 12,450 ms | UT-01–UT-20, IT-01–IT-16, E2E-01–E2E-10 on this host |
| `npm run coverage` (sequential rerun) | passed 215/215; 91.34 / 82.82 / 96.15 / 91.34 | QA-02 |
| `npm run schemas:check` | passed | RF17 |
| `npm run dependencies:check` | passed: 3 runtime packages, no install scripts | `node.md` |
| `npm run assets:check` | passed | runtime asset currency |
| `npm run package:smoke` | passed: 187 packaged files | RF5, RF17 |
| `npm audit --omit=dev` | passed: 0 vulnerabilities | runtime dependency risk |
| `CI=true npx vitest run tests/unit/link-capability.test.ts` | failed 1/7, run twice: "expected [Function] to throw error including 'skipped: no link privilege' but got 'no link privilege'" | CR-02 |
| `CI=true npx vitest run` over the four T14 link suites, IT-05, and E2E-10 | 21 passed, 0 skipped; every link scenario executed on this host | RF13, CA-01, CA-05, CA-07 (Windows), `codereview_04/CR-04` |
| Built CLI on a Claude + Cursor fixture: `init --yes`, `doctor --json`, `doctor` | init exit 0; JSON exit 1 `warnings` with two `VERSION_FLOOR_UNVERIFIED` warnings (claude-code, cursor), integrations `installed`/`full`/`minimumVersion: null`, p95 81.3 and 93.6 ms `pass`; text exit 1 with matching `[WARN]` lines; stderr empty in both | RF20, RF23, CA-16, CA-17, `codereview_04/CR-02` |
| Workspace `node dist/src/cli/main.js doctor --json` | exit 1 `warnings`; one `VERSION_FLOOR_UNVERIFIED` for claude-code; p95 96.9 ms `pass` | RF20, RF22 |
| Local Markdown link resolver over the feature | passed: 23 files, 21 local links, 0 broken | `codereview_04/CR-05` |
| Stale self-location scan (`tasks/prd-01-…/task_` without `done/`) | 1 hit: `done/task_6.md:98` | CR-05 |
| Checkbox/state scan over all task files | T01–T15 fully checked; T16 has 4 unchecked | `codereview_04/CR-03`, CR-01 |
| Bare-return and skip scan over `tests/` | 0 in the four T14 suites; remaining silent paths at `e2e-10-fixtures.ts:64` and `symlink-junction.test.ts:21` | CR-04 |
| SHA-256 of `codereview_01`–`04` reports | identical to values recorded by T13/T15 | report immutability |
| `git rev-list --count --all`, `git rev-parse HEAD`, `git remote -v` | `0`; unknown revision; no remote | scope limitation, CR-01 |
| Dynamic CA-07 silent-pass harness (`tsx` importing `e2e-10-fixtures.ts`) | blocked: Vitest refuses to load outside its runner | CR-04 relies on static evidence |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | CA-20; T16; TechSpec E2E-10 and build-order item 8; persistent `codereview_04/CR-01` | `git rev-list --count --all` = 0, no `HEAD`, no remote. `codereview_04/task_16.md:38-41` leaves T16.1–T16.4 unchecked and its handoff reads "Pending execution". The only execution evidence is this Windows host, where E2E-10 passed 6/6 across PowerShell and Git Bash. | Linux and macOS acceptance for CA-01, CA-05, and CA-07 is unproven for the current code. Missing essential platform evidence blocks approval. | Execute T16 after CR-02 and CR-04 are corrected: bind the corrected tree to one commit and record nine green Node 20/22/24 × Ubuntu/macOS/Windows jobs with E2E-10 case output. This requires repository and CI authorization from the HIL. |
| CR-02 | High | T14 acceptance ("a deterministic policy test that does not require real link privileges"); `tests.md` FIRST Repeatable; TechSpec Testing Approach | `tests/unit/link-capability.test.ts:36-43` calls `requireLink` at line 38 and expects the local skip path, without stubbing `CI`. `tests/helpers/link-capability.ts:8-10` reads the ambient `process.env.CI`. Running the file with `CI=true` fails ("expected [Function] to throw error including 'skipped: no link privilege' but got 'no link privilege'"), reproduced twice. | GitHub Actions sets `CI=true`, so `npm test` and `npm run coverage` would fail in all nine jobs of `.github/workflows/ci.yml`. T16 cannot produce green evidence, and CR-01 cannot close. | Stub a non-CI value, for example `vi.stubEnv('CI', 'false')`, before the local-skip call at line 38. Then run the file with `CI` unset and with `CI=true`. |
| CR-03 | Medium | CA-19 (E2E-09 mandatory gate); CA-18 (IT-14); T12 change to E2E-09 | **First gate run:** `npm test` failed E2E-09 with "Test timed out in 30000ms" (`tests/e2e/e2e-09.test.ts:59`) and IT-14 with `sampleCount` 0 instead of 20 (`tests/integration/doctor-benchmark.test.ts:29`); `npm run coverage` failed on the same E2E-09 timeout. **Sequential rerun:** 215/215 passed, E2E-09 at 28,605 ms (1.4 s under the limit), IT-14 at 12,450 ms. **In isolation:** 6,729 ms and 2,753 ms. **Contract:** E2E-09 asserts a 120,000 ms workflow bound (`e2e-09.test.ts:10,28,41`) but inherits `testTimeout: 30000` (`vitest.config.ts:5`). **T12:** added a second benchmarked `doctor` run (`e2e-09.test.ts:38`); each run spawns 23 sequential Node processes per installed process integration (`src/infrastructure/diagnostics/overhead-measurer.ts:40-42`). | Mandatory gates are non-deterministic under normal suite parallelism: E2E-09 failed in two of three full runs on this host. The runner timeout, not the CA-19 two-minute bound, decides the outcome, and slower CI runners are exposed to the same limit. | **E2E-09 (proven):** give the workflow test a timeout above its own `MAX_USER_WORKFLOW_MS`, so the asserted CA-19 bound is the effective one. **IT-14:** cause still pending. The symptom matches one process sample exceeding the 2,000 ms per-sample timeout, which discards every sample (`overhead-measurer.ts:27,77-78`), but this was not isolated. |
| CR-04 | Medium | `tests.md` Platforms; CA-07 and CA-20; T16 requirement "without a silent link-capability return"; residual of `codereview_04/CR-04` | `tests/e2e/e2e-10-fixtures.ts:23-30` catches every symlink error and returns `false`; `testSymlinkTarget` then returns at line 64 before any assertion. `tests/integration/symlink-junction.test.ts:18-22` (IT-05) does the same with a bare `return`. Neither path uses `requireLink`, and `vitest.config.ts` does not require assertions. Both executed on this host because link capability is present. | On a runner that cannot create a file symlink, E2E-10 CA-07 (every shell variant) and IT-05 report passed with zero assertions. A green CI matrix then cannot prove CA-07, so CA-20 evidence stays unreliable even after T16. | Route both setups through `attemptLink(target, link, 'file')` and `requireLink(ctx, attempt, link)`, so they skip locally with a reason and fail under CI, as T14 did for the nine enumerated branches. |
| CR-05 | Low | `sdd-review-code` location integrity; residual of `codereview_04/CR-05`; T15 open item | `done/task_6.md:98` records `tasks/prd-01-instalacao-deteccao-diagnostico/task_6.md`, a path that does not exist; the file is under `done/`. T15 fixed the eleven enumerated references and reported this one as out of its scope (`codereview_04/done/task_15.md:90`). | One recorded handoff location is still false, so task-location evidence is not fully self-contained. | Change the entry to `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md`. |
| CR-06 | Low | `code-standards.md` "Do Not Add Comments" | `tests/helpers/link-capability.ts:7` and `:32` add JSDoc comments. The line 32 comment restates what `requireLink` does, and the line 7 reason is already expressed by the name `ciRequiresLinks`. Outside this helper, the TypeScript tree has two comment lines (`runtime-assets.ts`, `antigravity-cli/detector.ts`). | New code deviates from the explicit comment rule; no behavioral effect. | Remove both comments. |

## Optional improvements

| ID | Severity | Source | Evidence | Impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| OI-01 | Low | persistent `codereview_04/OI-01` | `src/cli/commands/init.ts:45-50,72` writes `LEGACY_BLOCK_DETECTED` to stderr before authorization, and `src/cli/output/text.ts:24` renders the same finding again in the final report. | Human `init --yes` output repeats the warning. | Suppress the duplicate in the final human report, or document the intended repetition. |
| OI-02 | Low | persistent `codereview_04/OI-02` | `src/core/services/doctor-service.ts:47-51` stores `overhead` but adds no finding; `report-service.ts:29-33` derives status only from findings. Current p95 values are 81.3, 93.6, and 96.9 ms against a 100 ms target. | A failed target cannot change status or exit code, and the measured margins are narrow. | Add a warning finding such as `OVERHEAD_TARGET_EXCEEDED`, with text, JSON, and status tests. |
| OI-03 | Low | T13 manifest navigation | `tasks.md:25-31` lists T07–T11 with links and states; T12–T16 appear only in prose at `tasks.md:33`, as code-span paths. | Location and state are recorded, but T12–T16 cannot be reached from the lineage table. | Add T12–T16 rows with relative links, source findings, and states. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_04/CR-01` | persistent | No commit, remote, or CI artifact; T16 pending → CR-01 |
| `codereview_04/CR-02` | resolved | `doctor-service.ts:31-46`. T12 unit, report, text, E2E-08, and E2E-09 tests pass. The built CLI emits one warning per diagnosed integration with `warnings`/exit 1, and errors still win |
| `codereview_04/CR-03` | resolved | `codereview_03/done/task_11.md` has 5/5 items checked with a reconciliation note; `tasks.md:25-31` links T07–T11 with states and source findings |
| `codereview_04/CR-04` | resolved for its nine enumerated branches | No bare returns in the four suites; every branch routes through `requireLink`; all eight affected tests executed with `CI=true`. Residual defects: CR-02 (policy test) and CR-04 (two unenumerated silent paths) |
| `codereview_04/CR-05` | resolved for its eleven enumerated references | Resolver: 0 broken local links; the five corrected locations exist. Residual: CR-05 |
| `codereview_04/OI-01` | persistent reservation | → OI-01 |
| `codereview_04/OI-02` | persistent reservation | → OI-02 |
| `codereview_01/CR-01`–`CR-03`, `codereview_02/CR-01`, `codereview_03/CR-01` | resolved (no regression) | Their regression suites pass in the sequential 215/215 run and in the `CI=true` link run |

## Limitations and open items

- **No Git base or Terrain commit.** The repository is entirely untracked, so attribution relies on handoffs and the current filesystem; no correction can be isolated as a commit range.
- **Undefined argument.** `--num 4` is not a skill argument. It was read as a re-review of the `codereview_04` round, and the report took the next free suffix, `codereview_05`.
- **No quality profile.** The TechSpec has no formal `QA-NN` profile, no reservation triggers, and no Terrain baseline. Derived gates ran as absolute checks, with nothing subtracted.
- **CA-20 on Linux and macOS is not verifiable.** Resolving CR-01 needs HIL authorization to create a commit and a remote and to run CI. CR-02 must be corrected first, or every CI job will fail.
- **CI mode simulated on Windows only.** This host can create links, so the CI-failure branch of `requireLink` ran only through the unit policy test, not through a real failed link.
- **CR-04 rests on static evidence.** The dynamic harness could not load `tests/e2e/e2e-10-fixtures.ts` outside the Vitest runner.
- **CR-03 timing is load-dependent.** Three full runs and one isolated run were sampled. The first coverage run overlapped a 1.3 s reviewer command for about 3 seconds; the first `npm test` failure and the rerun had no overlap.
- **No interactive TTY session.** Automated non-TTY, `--yes`, dry-run, text, and JSON paths passed.
- **Dev-tree advisories only.** npm reports 3 moderate advisories in the development dependency tree; the runtime-only audit reports 0 vulnerabilities. They are recorded, not raised as a runtime finding.

## Conclusion

The `codereview_04` corrections largely hold:
- **T12:** `doctor` now emits a stable `VERSION_FLOOR_UNVERIFIED` warning per integration without changing support profiles, verified from unit tests through the built CLI.
- **T13:** the T11 ledger and the correction lineage are reconciled.
- **T14:** the nine enumerated silent link returns are gone, and those scenarios execute on this host.
- **T15:** every enumerated broken link is repaired.
- **Gates:** static gates, schemas, assets, package smoke, and coverage thresholds pass on the sequential rerun.

Approval is still not available:
- **CR-01:** CA-20 lacks Linux and macOS evidence, and T16 is incomplete.
- **CR-02:** T14's policy unit test fails whenever `CI=true`, which would turn every declared CI job red and block T16.
- **CR-03:** E2E-09 timed out at the 30 s runner limit in two of three full runs, below its own two-minute CA-19 bound.
- **CR-04:** E2E-10 CA-07 and IT-05 can still pass silently when link creation fails.
- **CR-05 and CR-06:** one false task location and two comments violating the coding standard.

Missing essential evidence, an incomplete task, a non-conformant testing rule, and a mandatory test that fails intermittently each require **REJECTED** under the skill's status rules.
