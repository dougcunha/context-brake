# Code review report — PRD-01 installation, detection, and diagnostics

## Summary

- Status: REJECTED
- Git scope: Not delimited by `--base` — clean worktree at `3347b735e8d9a9804671157fee2e73dad8ce6240`; see limitations
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_05/codereview.md`
- Review focus: current PRD/TechSpec acceptance state, T16 HIL closure, and corrections T17–T22 against the implementation they reference
- Blocking result: the required default test gate is not repeatable, and the archived T16 record contradicts its closed HIL decision

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read in full; CA-20 exception included |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read in full; DEC-01 included |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read; T01–T22 located |
| Original tasks | `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_1.md` through `task_6.md` | read/located |
| Correction tasks | `codereview_01/done/task_07.md` through `task_09.md`, `codereview_02/done/task_10.md`, `codereview_03/done/task_11.md`, `codereview_04/done/task_12.md` through `task_16.md`, and `codereview_05/done/task_17.md` through `task_22.md` | read/located; current handoffs read in full |
| Previous reviews | `codereview_01` through `codereview_05` | preserved; SHA-256 checked before this report |
| Implementation | clean worktree at `3347b735`; correction implementation at `58082e5`; T16/DEC documentation closure in `3347b735` | limited by absence of `--base`; handoffs and commit boundaries used without inventing a base |
| Project rules | `AGENTS.md`, `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md` | read and applied |

No source or task file was changed by this review. The prior report hashes were:

| Report | SHA-256 |
| --- | --- |
| `codereview_01/codereview.md` | `b87794d7e697df8de2ac2f0634c461a6d8750f67b99071b3e5917f29ae0466f6` |
| `codereview_02/codereview.md` | `bd73511334e8adda098040cd6d7ef81570cb79d012fbfd713d842171f912773b` |
| `codereview_03/codereview.md` | `57a2f35fe1ac8644e32b78e83432318cb856efb9700e631d51af38fe80f01f75` |
| `codereview_04/codereview.md` | `dc94048e236e74426367dccd3780f097cea6605fed6b3dfe7c787baf9d96404b` |
| `codereview_05/codereview.md` | `2e2b65e49ab7870d1cc3b8367da7af22768abf8e1e0bb1738f1340e598bd9897` |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect all eight harnesses | `src/infrastructure/harnesses/registry.ts`, per-harness detectors | `detection-service`, `harness-registry`, IT-16, E2E-01/02 | conformant | all focused and complete-suite validations ultimately passed |
| RF2 | Report signal origin and version | detectors, `detection-collector.ts`, `version-service.ts` | detection/version unit tests | conformant | structured detection and version cases pass |
| RF3 | Shared instruction files are not harness proof | `detection-service.ts`, descriptors | IT-16, E2E-03 | conformant | cross-signal fixtures pass |
| RF4 | Explicit include/exclude overrides detection | `argument-parser.ts`, `argument-validator.ts`, selection flow | IT-03 and CLI tests | conformant | explicit exclusion behavior passes |
| RF5 | Register documented project integration | planners/adapters for eight harnesses | adapter suites, IT-01/02, E2E-01/02 | conformant | integration assets and package checks pass |
| RF6 | Preserve user configuration | per-harness planners and JSON/YAML/TOML editing | preservation/idempotency suites, IT-01, E2E-04 | conformant | three-run idempotency passes in E2E-10 evidence |
| RF7 | Leave malformed harness file unchanged and continue peers | adapter planners, change plan | IT-04, E2E-05 | conformant | invalid fixture and partial-install tests pass |
| RF8 | Assign and report support level | `support-service.ts`, adapter capabilities, output formatters | support/report/doctor tests | conformant | complete/partial/cooperative cases pass |
| RF9 | Warn below verified minimum version | `version-service.ts`, common version probes | adapter-version and doctor tests | conformant | unverified floor is a stable warning after T12 |
| RF10 | Create project protocol asset | `protocol-service.ts`, packaged runtime assets | protocol, runtime-assets, package-assets | conformant | generated asset currency and package smoke pass |
| RF11 | Add a short marked reference to existing instruction files | `instruction-service.ts`, markers | instruction suites, IT-05/06 | conformant | block size/reference and linked-file paths pass |
| RF12 | Do not create instruction files unless requested | `instruction-service.ts`, init options | IT-06 and E2E fixture flows | conformant | existing-only policy passes |
| RF13 | Write a shared symlink target once and preserve the link | file identity planning and change applier | IT-05, linked-root and E2E-10 CA-07 | conformant | local plus explicit `CI=true` link suites pass with zero skips |
| RF14 | Preview legacy migration and require confirmation | `legacy-preview.ts`, init confirmation | legacy preview unit/E2E | conformant | byte-preservation path passes |
| RF15 | Create default `context-brake.config.json` | `installation-builder.ts`, `project-config-store.ts` | configuration tests, E2E-01 | conformant | generated configuration validates against schema |
| RF16 | Validate configuration on every execution with field/value/rule | `configuration-validator.ts`, command composition | invalid-config and schema tests | conformant | invalid-zone diagnostics pass |
| RF17 | Publish editor schema | generated schemas and package exports | schema currency/package contents | conformant | `schemas:check` and package smoke pass |
| RF18 | Dry-run lists changes without writes | change-plan flow and CLI output | IT-08/15, E2E-06/09 | conformant | snapshot and serial built-CLI checks pass |
| RF19 | Safe removal preserves unrelated/state files by default | `removal-service.ts`, `commands/remove.ts` | IT-09, E2E-07 | conformant | safe removal suite passes |
| RF20 | Doctor reports detection, integration, version, support, and gaps | `doctor-service.ts`, adapter diagnostics | doctor unit/IT-11/12/E2E-08 | conformant | text/JSON findings agree in tests |
| RF21 | Doctor validates config, markers, protocol, plan, and checkpoint | `doctor-checks.ts` | doctor checks and E2E-08 | conformant | diagnostic scenarios pass |
| RF22 | Measure per-harness integration overhead against target | `overhead-measurer.ts`, `p95.ts` | overhead-p95 and IT-14 | conformant, gate affected by CR-01 | IT-14 passes alone/serialized and in the successful full runs; one default run returned zero samples under contention |
| RF23 | Human/JSON parity and distinct exit codes | report service, text/JSON outputs, exit codes | report/output/exit-code tests, E2E-08 | conformant | schema-valid JSON and exit cases pass |
| CA-01 | Non-interactive Claude install | init composition and Claude adapter | E2E-01, E2E-10 | conformant | T16 Windows/WSL evidence and current E2E-10 pass |
| CA-02 | Detect/configure Codex and Cursor | registry and two adapters | E2E-02 | conformant | built CLI case passes |
| CA-03 | Shared `AGENTS.md` alone yields warning, no install | detection service and exit codes | E2E-03, IT-16 | conformant | case passes |
| CA-04 | Exclude Copilot and configure only Cursor | explicit selection | IT-03 | conformant | case passes |
| CA-05 | Three installs preserve user data and create one integration | planners, transaction/change engine | E2E-04, E2E-10 | conformant | idempotency evidence passes |
| CA-06 | Invalid harness config remains unchanged; peers continue | plan builder/adapters | IT-04, E2E-05 | conformant | case passes |
| CA-07 | Linked `AGENTS.md` target changed once; link preserved | identity/path handling | IT-05, linked-root, E2E-10 | conformant | explicit local/CI link-policy runs pass |
| CA-08 | Instruction marker block is at most ten lines and points to protocol | markers/protocol service | instruction unit/IT-06 | conformant | block assertions pass |
| CA-09 | No instruction file created without option | instruction policy | IT-06 | conformant | case passes |
| CA-10 | Legacy content is byte-identical without migration confirmation | legacy preview/confirmation | IT-07 and E2E legacy preview | conformant | case passes |
| CA-11 | Preview changes no files | change plan/dry-run | IT-08/15, E2E-06/09 | conformant | snapshot and quick-start dry-run pass |
| CA-12 | Removal deletes owned integration/reference/protocol but preserves plan/checkpoint | removal service | IT-09, E2E-07 | conformant | case passes |
| CA-13 | Invalid zone ordering exits with field/value/rule | configuration validator | invalid-config suite | conformant | case passes |
| CA-14 | Doctor detects manually removed integration and exits error | doctor service | IT-11, E2E-08 | conformant | case passes |
| CA-15 | Copilot partial support explains fail-open timeout | Copilot diagnostic metadata | IT-12, E2E-08 | conformant | case passes |
| CA-16 | Doctor reports detected/minimum version and affected capability | version service | IT-13 and adapter-version tests | conformant, gate affected by CR-01 | IT-13 passes serialized and in successful full runs; one parallel run timed out |
| CA-17 | `doctor --json` validates and matches human findings | JSON output/report service | E2E-08 and schema tests | conformant | case passes |
| CA-18 | Doctor reports measured p95 and target status | overhead measurer/reporting | IT-14 | conformant, gate affected by CR-01 | dedicated rerun produced 20 samples; one parallel run produced zero |
| CA-19 | README init/doctor flow completes without diagnostic errors within two minutes | built CLI workflow | E2E-09 | conformant, gate affected by CR-01 | serialized current run: 4.678 s workflow and 0.368 s dry-run; first parallel run exceeded the internal 5 s assertions |
| CA-20 | Critical scenarios on accepted platform matrix | E2E-10/shell runner and CI matrix | E2E-10; T16 recorded runs | conformant by DEC-01 | revision `58082e5`: Ubuntu WSL2 and Windows × Node 20/22/24; Windows PowerShell/Git Bash; macOS explicitly waived, not claimed as executed |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` — audit only | OK | only this immutable review report was added; no implementation/task correction |
| `code-standards.md` | OK | lint, typecheck, build, dependency audit, and coverage pass |
| `javascript-typescript.md` | OK | TypeScript typecheck and ESLint pass; correction files remain typed and narrowly scoped |
| `node.md` | OK | process/path behavior exercised on Node 24 locally and Node 20/22/24 in T16 evidence |
| `tests.md` — FIRST/Independent | OK | temp-repository and link-capability isolation verified |
| `tests.md` — FIRST/Repeatable | NOT OK | `.agents/rules/tests.md:24`; identical default `npm test` first failed 11 tests and later passed all 218; CR-01 |
| `harness-adapters.md` | OK | adapter-owned payload/config shapes and fixture-based tests remain isolated |
| `file-changes.md` | OK | atomic/idempotent/dry-run/symlink suites pass |
| `cli-output.md` | OK | text/JSON output, paths, actions, diagnostics, and exit-code suites pass |
| `AGENTS.md` completion gates | NOT OK | build/lint/typecheck/coverage passed, but the required `npm test` gate is nondeterministic; CR-01 |

## Quality profile

The TechSpec defines gates but no formal `QA-NN` profile or Terrain baseline. The following profile is derived without discounting any current hit.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | ESLint clean | blocking | `npm run lint` | 0 of 0 | OK |
| QA-02 | TypeScript clean | blocking | `npm run typecheck` | 0 of 0 | OK |
| QA-03 | Coverage at least 80% | blocking | `npm run coverage` | 0 of 0 | OK — 91.34% statements, 82.81% branches, 96.15% functions, 91.34% lines |
| QA-04 | Mandatory suite is green and repeatable | blocking | `npm test` | 1 new/aggravated of 1 | NOT OK — first run 11 failed/207 passed; second run 218 passed |
| QA-05 | Generated/package assets are current | blocking | `npm run assets:check`, `npm run schemas:check`, `npm run package:smoke` | 0 of 0 | OK |
| QA-06 | Runtime dependency policy and audit | blocking | `npm run dependencies:check`, `npm audit --omit=dev` | 0 of 0 | OK |

- Terrain baseline: missing — every hit treated as new, see limitations
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 0
- Suggested escalation: `$sdd-plan-corrections` for CR-01 and CR-02; no automatic correction was performed

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal boundaries and dependency injection | YES | core contracts/services remain independent of CLI/infrastructure wiring |
| Adapter ownership of vendor formats | YES | schemas/planners/detectors remain inside each harness adapter |
| Transactional, idempotent, link-safe file changes | YES | unit/integration/E2E suites plus `CI=true` link run pass |
| IT-01 through IT-16 | PARTIAL | all pass in successful/serialized validation, but IT-13 and IT-14 failed in one default parallel run; CR-01 |
| E2E-01 through E2E-10 | PARTIAL | functional reruns pass, but multiple process-heavy files timed out together in one required default run; CR-01 |
| Build-order completion gate | PARTIAL | every named command passed at least once, but `npm test` is not repeatable |
| DEC-01 — macOS evidence waiver | YES | `techspec.md:570-574`; T16 provides the accepted WSL2/Windows Node matrix |
| T16 recorded state matches DEC-01 | NO | `task_16.md:42,49,61-62,66` still asserts nine inspected/passing cells and an open/pending decision; CR-02 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_1.md` | COMPLETE | package/config/schema foundation; current gates pass |
| T02 | `done/task_2.md` | COMPLETE | detection, selection, versions, and support tests pass |
| T03 | `done/task_3.md` | COMPLETE | safe change engine and file-behavior tests pass |
| T04 | `done/task_4.md` | COMPLETE | eight adapters, fixtures, and runtime assets pass |
| T05 | `done/task_5.md` | COMPLETE | init/remove/doctor workflows pass |
| T06 | `done/task_6.md` | COMPLETE | packaging/documentation delivery; stale self-location corrected by T21 |
| T07 | `codereview_01/done/task_07.md` | COMPLETE | first-review correction archived |
| T08 | `codereview_01/done/task_08.md` | COMPLETE | first-review correction archived |
| T09 | `codereview_01/done/task_09.md` | COMPLETE | first-review correction archived |
| T10 | `codereview_02/done/task_10.md` | COMPLETE | second-review correction archived |
| T11 | `codereview_03/done/task_11.md` | COMPLETE | third-review correction archived; ledger reconciled by T13 |
| T12 | `codereview_04/done/task_12.md` | COMPLETE | version-floor uncertainty emits stable warning |
| T13 | `codereview_04/done/task_13.md` | COMPLETE | correction ledger and links reconciled |
| T14 | `codereview_04/done/task_14.md` | COMPLETE | link capability policy explicit and CI-enforced |
| T15 | `codereview_04/done/task_15.md` | COMPLETE | TechSpec links and task evidence repaired |
| T16 | `codereview_04/done/task_16.md` | COMPLETE WITH INVALID LEDGER | HIL accepted six matrix cells plus macOS waiver, but stale pending/nine-cell assertions remain; CR-02 |
| T17 | `codereview_05/done/task_17.md` | COMPLETE | ambient `CI` is stubbed before both local and CI assertions |
| T18 | `codereview_05/done/task_18.md` | COMPLETE | asset bundler import is side-effect free; stale-check regression passes |
| T19 | `codereview_05/done/task_19.md` | COMPLETE | E2E-09 gets a 150 s runner bound while retaining CA-19 assertions |
| T20 | `codereview_05/done/task_20.md` | COMPLETE | all reviewed link creation paths use `attemptLink`/`requireLink`; CI-focused run has zero skips |
| T21 | `codereview_05/done/task_21.md` | COMPLETE | T06 self-location fixed; local Markdown links resolve |
| T22 | `codereview_05/done/task_22.md` | COMPLETE | added helper comments removed without code change |

All T01–T22 task files were uniquely located, and the feature tree contains no unchecked task checkbox. The manifest lists T01–T11 in its table and records T12–T22 only in prose; see OI-03.

## Executed validations

- Profile and scope: built TypeScript CLI, unit/integration/E2E suites, generated schemas/assets, packed npm contents, runtime dependencies, symlink policy, and current Windows environment
- Validated state: clean `master` worktree at `3347b735`, Windows NT 10.0.26200.0, Node 24.19.0, npm 11.17.0
- Reused evidence: T16 handoff for immutable revision `58082e5`; `3347b735` changes only PRD/TechSpec/task closure documents, so the validated runtime tree is unchanged
- Manual acceptance: HIL decision in PRD CA-20 and TechSpec DEC-01 accepts the WSL2/Windows equivalent runs and waives macOS evidence

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm install --ignore-scripts` | blocked/interrupted after more than three minutes without output | install reproducibility; current `node_modules` remained usable and T16 records successful clean installs |
| `npm run build` | passed | compiled CLI, schemas, runtime assets |
| `npm run typecheck` | passed | QA-02 |
| `npm run lint` | passed | QA-01 and code rules |
| `npm test` — first exact run | failed: 11 failed, 207 passed, 8 failed files, 1 unhandled error | CR-01; failures spanned IT-13, IT-14, E2E-04, E2E-07/08/09/10, linked-root, and package contents |
| affected 8 files with `--no-file-parallelism --reporter=verbose` | passed: 26/26 in 51.13 s | isolates CR-01 to suite-level contention; all previously failing cases pass |
| `npm run coverage` | passed: 218/218; 91.34/82.81/96.15/91.34% | QA-03, full functional coverage |
| `npm test` — second exact run | passed: 218/218 in 19.30 s | demonstrates nondeterminism rather than a stable functional failure |
| `npm run schemas:check` | passed | RF17, QA-05 |
| `npm run dependencies:check` | passed: 3 runtime dependencies, no install scripts | QA-06 |
| `npm run assets:check` | passed | runtime asset currency, T18 |
| `npm run package:smoke` | passed: 187 package files | packaging and built CLI |
| `npm audit --omit=dev` | passed: 0 vulnerabilities | dependency safety |
| `CI=true` link helper + IT-05 + E2E-10 | passed: 14/14, zero skips | RF13, CA-07, CA-20, T17/T20 |
| feature Markdown link resolver | passed: 30 files, 22 local links, 0 broken | T21 and evidence integrity |
| `git diff --check 8401e7f..HEAD` | passed | correction diff hygiene |
| prior-review SHA-256 verification | passed for all five reports | immutable review history |

The first default test run accumulated 661.99 s of test execution in 111.24 s wall time. The same eight affected files all passed when file parallelism was disabled, and a subsequent unchanged default run passed. This is sufficient to prove an orchestration/repeatability defect; it does not prove a deterministic product defect in the affected cases.

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | `.agents/rules/tests.md:24`; required `npm test`; TechSpec IT-13/IT-14/E2E-04/07/08/09/10 | `vitest.config.ts:5` provides only a 30 s global timeout while process/benchmark-heavy files run with default file parallelism. One exact run failed 11 tests across eight files and emitted a spawn `ENOENT` after timeout cleanup; the unchanged affected set passed 26/26 with `--no-file-parallelism`, and the next exact full run passed 218/218. `overhead-measurer.ts:27` also converts process starvation beyond 2 s into an unavailable zero-sample result. | The mandatory gate can reject a conformant revision or mask real regressions behind timeout/cleanup noise. CA-16/18/19 and package/link evidence are not repeatable in the repository's default test mode. | Put child-process/benchmark-heavy integration and E2E files in a controlled execution lane (for example a separate Vitest project or file-serialization policy), while retaining the product-level CA-19 thresholds. Add a regression that runs the configured lanes and proves the default `npm test` command is repeatably green; do not solve this only by globally increasing timeouts. |
| CR-02 | Medium | T16 task state; TechSpec DEC-01 | `codereview_04/done/task_16.md:42` checks inspection of all nine jobs and line 49 still requires all nine to pass, although line 45 says only six ran and macOS was waived. Lines 61–62 remain `PENDING`, and line 66 calls the HIL decision open, while `techspec.md:570-574` closes it and the handoff at lines 85/103 records the accepted result. | The task ledger cannot be used as a single reliable completion record: a future review or orchestrator can infer both “closed” and “pending,” or falsely report macOS as executed. | Reconcile the T16 body, acceptance criteria, environment dependency, and HIL status to DEC-01. Preserve the historical fact that six cells passed and three macOS cells did not run; mark the waiver as the reason for closure instead of checking or asserting nine passing cells. |

### Optional observations

| ID | State | Evidence and possible improvement |
| --- | --- | --- |
| OI-01 | persistent from `codereview_05` | Legacy block discovery can emit a duplicate warning through overlapping diagnostics. Consolidating the source would improve output clarity but is not required by a failed obligation. |
| OI-02 | persistent from `codereview_05` | A measured overhead status of `fail` is not independently promoted to a warning finding. Product policy should decide whether it affects exit status before code changes. |
| OI-03 | persistent from `codereview_05` | `tasks.md:33` summarizes T12–T22 but the manifest table does not link them individually. All files were locatable, so this is lineage usability rather than missing evidence. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_05/CR-01` | resolved by decision and accepted evidence | PRD CA-20 exception and TechSpec DEC-01 accept revision-bound Ubuntu WSL2/Windows × Node 20/22/24 evidence; macOS is explicitly waived rather than claimed as passed. T16 ledger inconsistency is a new documentation-state finding, CR-02. |
| `codereview_05/CR-02` | resolved | T17 stubs ambient `CI` before both branches; focused `CI=true` run passes. |
| `codereview_05/CR-03` | partially resolved; remaining cause carried into CR-01 | T19 fixes E2E-09's runner timeout and the test passes serialized. IT-14 and broader process-heavy suite contention reproduced in the default gate. |
| `codereview_05/CR-04` | resolved | T20 routes reviewed link paths through `attemptLink`/`requireLink`; caller trace and 14/14 CI-focused run cover the known paths. |
| `codereview_05/CR-05` | resolved | T21 corrects T06 self-location; feature link resolver reports zero broken local links. |
| `codereview_05/CR-06` | resolved | T22 removes the added generic comments; implementation behavior is unchanged. |
| `codereview_05/OI-01` | persistent | duplicate legacy-warning path remains optional |
| `codereview_05/OI-02` | persistent | overhead fail-to-warning policy remains unspecified |
| `codereview_05/OI-03` | persistent | correction tasks remain summarized in prose rather than linked in the manifest table |
| T18 OBS-01/OBS-02 | resolved additional corrections | bundler import no longer writes assets; the stale-asset regression and `assets:check` pass |

## Limitations and open items

- No `--base` was supplied. The review did not silently select one; it used the clean current worktree, handoff boundaries, and the three local commits to establish provenance. There is no configured remote.
- `npm install --ignore-scripts` produced no output for more than three minutes and was interrupted. This limits a fresh-install rerun in the current session, but T16 records successful clean install gates on all six accepted Node/platform cells, and every subsequent local package/build/test command used the existing installation successfully.
- The WSL service could not be reopened during this review because its localhost relay timed out. The SHA-bound T16 handoff and recorded hashes remain the accepted evidence under DEC-01; this environment failure does not reopen CA-20.
- macOS remains unverified by explicit product decision. This is not a review finding under DEC-01; a later observed macOS defect would be new evidence.
- The TechSpec has no formal `QA-NN` profile or Terrain baseline, so no current hit was discounted as pre-existing.
- Vendor documentation was not revalidated because this review did not change a harness adapter and no current evidence showed a vendor-contract divergence.
- Interactive terminal rendering was not manually exercised; output behavior is covered by unit/E2E assertions and package smoke.

## Conclusion

The implementation remains broadly conformant with RF1–RF23 and CA-01–CA-20, including the product-owner-approved CA-20 exception. Corrections T17–T22 resolve the corresponding prior code and evidence findings, and all functional cases pass in controlled or successful full runs.

Approval is nevertheless withheld. A required exact `npm test` run failed across eight process-heavy files and then passed unchanged, violating the repository's repeatability rule and making the release gate unreliable. Separately, T16's archived body still says both “all nine passed/open and pending” and “six passed/decision closed.” CR-01 and CR-02 must be corrected and re-reviewed; no implementation correction is included here.
