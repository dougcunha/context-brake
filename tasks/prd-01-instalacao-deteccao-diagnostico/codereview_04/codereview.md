# Code review report — Installation, Detection, and Diagnostics

## Summary

- Status: REJECTED
- Git scope: `Not delimited — see limitations` (repository has zero commits and no remote; reviewed the full worktree, all handoffs, all correction handoffs, and the three previous reports)
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_03/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read in full |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read in full |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read; links tasks 1–6 only |
| Original handoffs | `done/task_1.md` through `done/task_6.md` | read in full |
| Correction handoffs | `codereview_01/done/task_07.md` through `task_09.md`; `codereview_02/done/task_10.md`; `codereview_03/done/task_11.md` | read in full; tasks 7–11 are not linked from `tasks.md` |
| Previous reports | `codereview_01/codereview.md`, `codereview_02/codereview.md`, `codereview_03/codereview.md` | read in full |
| Implementation | Worktree `src/`, `tests/`, `schemas/`, `assets/`, `scripts/`, `.github/`, `README.md`, `AGENTS.md`, and package files | limited to the all-untracked worktree and handoff inventory |

`git rev-list --count --all` returned `0`, `HEAD` does not exist, and `git remote -v` returned no remote. No `--base` was supplied and no commit can be resolved, so the reviewable set is the entire current worktree. Generated `dist/` output was rebuilt from that state for execution but is ignored and is not a source surface.

The PRD, TechSpec, manifest, all eleven handoffs/correction handoffs, and previous reports were cross-checked. All local Markdown links under the feature were resolved from their containing file. Six handoff links are broken (CR-05). The external vendor links in the PRD and TechSpec returned current content on 2026-09-14; the Pi link redirects from `badlogic/pi-mono` to `earendil-works/pi`. Reachability was checked, but adapter behavior was not re-specified because T11 did not change an adapter contract.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect all eight MVP harnesses | `src/infrastructure/harnesses/registry.ts` and per-harness detectors | IT-16 | conformant | Registry exposes eight descriptors; cross-signal suite passed |
| RF2 | Preserve evidence origin and detected version provenance | `detection-service.ts`, `detection-collector.ts` | UT-03, UT-15 | conformant | `HarnessDetection.evidence`, `version`, and `versionSource` are present in canonical reports |
| RF3 | Shared instruction files are not harness proof | detector evidence policy | UT-01, IT-16 | conformant | `AGENTS.md`-only and generic `.agents/` fixtures do not activate a harness |
| RF4 | Explicit include/exclude overrides detection | `argument-validator.ts`, `detection-service.ts` | UT-02, IT-03 | conformant | Contradictory selection returns `INVALID_ARGUMENTS` |
| RF5 | Register through each documented harness mechanism | eight harness planners and five built runtime assets | IT-01, IT-02, package tests | conformant | Adapter and package suites passed; 187 packaged files verified |
| RF6 | Preserve existing user integrations and bytes | surgical JSON/JSONC editor and planners | UT-04, UT-19, IT-01, minified suites | conformant | Pretty, minified, comment, and linked-config cases passed |
| RF7 | Isolate invalid harness config and continue peers | planner conflicts and installation aggregation | UT-05, IT-04, E2E-05 | conformant | Invalid file remains unchanged and peer installation completes |
| RF8 | Derive and display support level | `support-service.ts`, adapter capability tables | UT-18 | conformant | Exhaustive support mapping passed |
| RF9 | Warn when a detected version is below a verified floor | `version-service.ts`, `support-service.ts` | UT-15, IT-13 | conformant | Injected old/current fixtures prove the generic comparison path; unknown-floor contract is separately non-conformant in CR-02 |
| RF10 | Create the project protocol | `protocol-service.ts` | protocol unit, E2E-01 | conformant | Generated protocol and packaged source passed current checks |
| RF11 | Add a bounded reference block | `instruction-markers.ts`, `instruction-service.ts` | UT-07, IT-06 | conformant | Canonical block is three lines and points to the configured protocol |
| RF12 | Do not create instruction files without explicit option | `instruction-service.ts` | UT-08, IT-06 | conformant | Existing-only policy passed |
| RF13 | Deduplicate linked instruction files and preserve links | physical identity and snapshot `realPath` | UT-06, IT-05, E2E-10 | conformant | Windows PowerShell and Git Bash link cases passed locally |
| RF14 | Preview legacy migration without implicit deletion | `legacy-preview.ts`, `installation-service.ts`, `init.ts` | legacy unit/E2E | conformant | `LEGACY_BLOCK_DETECTED` is emitted and the file remains byte-identical without the flag |
| RF15 | Create versioned default configuration | `configuration.ts`, `installation-builder.ts` | configuration and README tests | conformant | `DEFAULT_CONFIG` and documentation example validate |
| RF16 | Report config field, value, and violated rule | `configuration-validator.ts` | UT-12, IT-10 | conformant | Cross-field failures retain structured issue evidence |
| RF17 | Publish current configuration/report schemas | `schemas/`, schema generation scripts | schema and package checks | conformant | Schema currency and package smoke passed |
| RF18 | Dry-run the exact plan without writes | init/remove commands and `ChangePlan` | UT-10, IT-08, E2E-06 | conformant | Dry-run/apply path sets match and dry-run does not write |
| RF19 | Remove only owned content; state requires explicit consent | `removal-service.ts`, `removal-helper.ts` | UT-11, IT-09, E2E-07 | conformant | Modified assets conflict; state stays unless `--remove-state` is selected |
| RF20 | Doctor reports integration, version, support, and limitations | `doctor-service.ts`, output renderers | UT-13, IT-11, E2E-08 | conformant with TechSpec gap | Core fields render; the required unknown-floor finding/status is absent (CR-02) |
| RF21 | Doctor validates config, markers, protocol, and optional state | `doctor-checks.ts` | doctor unit, IT-10 | conformant | Read-only checks passed |
| RF22 | Measure p95 and compare with target | `overhead-measurer.ts`, `p95.ts` | UT-17, IT-14, E2E-08 | conformant | Workspace doctor measured `67.5ms/100ms (pass)`; failed-target health propagation remains OI-02 |
| RF23 | Equivalent text/JSON findings and stable exit codes | `report-service.ts`, output modules, exit constants | UT-16, UT-20, E2E-08 | conformant | 0/1/2, 64, and 130 mapping tests passed |
| CA-01 | Claude `init --yes` installs and summarizes support | init pipeline | E2E-01, E2E-10 | conformant | Current Windows suite passed |
| CA-02 | Codex and Cursor install together | multi-adapter planning | IT-02, E2E-02 | conformant | Current suite passed |
| CA-03 | `AGENTS.md`-only repository warns without installing | detection policy | UT-01, E2E-03 | conformant | Exit 1 and explicit selection guidance passed |
| CA-04 | Copilot exclusion leaves Cursor only | selection policy | UT-02, IT-03 | conformant | Current suite passed |
| CA-05 | Three installs are byte-idempotent | planners/change plan | UT-04, E2E-04, linked-root suites | conformant | Standard, minified, harness-link, and root-link cases passed |
| CA-06 | Invalid adapter file is untouched and peers continue | conflict isolation | UT-05, IT-04, E2E-05 | conformant | Current suite passed |
| CA-07 | Symlinked `AGENTS.md` is written once and link survives | instruction identity | UT-06, IT-05, E2E-10 | conformant locally | PowerShell and Scoop Git Bash cases passed; suite can silently return if link setup fails (CR-04) |
| CA-08 | Reference block is at most ten lines | block renderer | UT-07, IT-06 | conformant | Three-line block asserted |
| CA-09 | Missing instruction files stay absent by default | instruction planner | UT-08, IT-06 | conformant | Current suite passed |
| CA-10 | Legacy block remains unchanged and migration is previewed | legacy preview path | legacy unit/E2E | conformant | Current suite passed |
| CA-11 | Dry-run changes nothing and lists the applicable plan | command/apply split | UT-10, IT-08, E2E-06 | conformant | Current suite passed |
| CA-12 | Removal preserves unrelated content and state | conservative removal | UT-11, IT-09, E2E-07 | conformant | Current suite passed |
| CA-13 | Invalid zone ordering exits with structured error | config validator | UT-12, IT-10 | conformant | Current suite passed |
| CA-14 | Removed integration is diagnosed as missing/error | doctor adapter checks | UT-13, IT-11, E2E-08 | conformant | Current suite passed |
| CA-15 | Copilot is partial with timeout fail-open impact | Copilot capabilities | UT-14, IT-12, E2E-08 | conformant | Current suite passed |
| CA-16 | Old harness reports detected/minimum/capability | generic version gate | UT-15, IT-13, E2E-08 | conformant for injected floor | TechSpec permits injected version fixtures; no released minimum has been claimed |
| CA-17 | Doctor JSON validates and matches human findings | canonical doctor report | UT-16, E2E-08 | conformant | Current suite and schema check passed |
| CA-18 | Doctor shows measured p95 and target result | benchmark/report path | UT-17, IT-14, E2E-08 | conformant | Current suite and live doctor output passed |
| CA-19 | README quick start is error-free under two minutes | README and built CLI | E2E-09 | conformant locally | Current run completed the workflow in about 6.3 seconds; core dry-run in about 1.6 seconds |
| CA-20 | CA-01/05/07 pass on Linux, macOS, and Windows PowerShell/Git Bash | `.github/workflows/ci.yml`, E2E-10 | E2E-10 | not verifiable | Windows PowerShell 5.1 and Scoop Git Bash passed; no Linux/macOS run artifact exists (CR-01) |
| TechSpec `ChangePlan.projectRoot` | Absolute canonical root | `main.ts:41`, `composition-root.ts:46`, canonical snapshot propagation | linked-root unit/integration/E2E | conformant | `codereview_03/CR-01` repro now passes; plan root and config/manifest targets are canonical |
| TechSpec unknown version floor | Doctor reports `VERSION_FLOOR_UNVERIFIED` and does not claim compatibility | limitation text only; no diagnostic finding | none | non-conformant | Live doctor returns `healthy`, exit 0, `findings: []` while saying the minimum floor is unverified (CR-02) |
| SDD task state | Every task has consistent location/state/evidence | T11 implementation and handoff exist | current gates | non-conformant | T11.1–T11.5 are unchecked while the handoff claims completion (CR-03) |
| `tests.md` link policy | Unsupported link creation is skipped with an explicit reason | linked-root and linked-config tests | nine affected branches | non-conformant | Tests use a bare `return` when setup fails (CR-04) |
| SDD source links | All artifact links are intact | original task handoffs | local link resolver | non-conformant | Six `./techspec.md` links resolve to missing `done/techspec.md` (CR-05) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | `npm run lint` passed; configured file/function/parameter limits report zero hits |
| `javascript-typescript.md` | OK | Strict typecheck and lint passed; no reviewed correction path introduces an unsafe external-data boundary |
| `node.md` | OK | Build/tests passed; runtime dependency script check found three runtime packages and zero install scripts; runtime audit found zero vulnerabilities |
| `tests.md` | NOT OK | Coverage passes, but nine link-capability setup failures return from a passing test without an explicit skip reason (CR-04) |
| `harness-adapters.md` | OK for reviewed correction | T11 does not change vendor contracts; current official/repository documentation links remain reachable |
| `file-changes.md` | OK for linked-root correction | Canonical root/target suites pass, links survive, and genuine concurrency rejection remains covered |
| `cli-output.md` | OK | Text/JSON projections and stable exit mappings pass; CR-02 originates in missing domain findings, not renderer divergence |
| Hexagonal architecture (`AGENTS.md`) | OK | T11 keeps root resolution in CLI/infrastructure and passes snapshots into core; no reverse dependency was introduced |
| `sdd-review-code` | NOT OK in reviewed artifacts | Current review follows the skill, but the feature artifacts have inconsistent task state and broken links (CR-03, CR-05) |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 (derived) | At most 100 lines/file, 30 lines/function, and 3 parameters | blocking | `npm run lint` | 0 | OK |
| QA-02 (derived) | At least 80% lines/statements/functions/branches | blocking | `npm run coverage` | 0 | OK: 91.09% lines/statements, 96.14% functions, 82.10% branches |
| QA-03 (derived) | Strict TypeScript check | blocking | `npm run typecheck` | 0 | OK |
| — | Formal TechSpec QA-NN profile and Terrain baseline | — | `rg "Quality profile|Terrain|QA-[0-9]+" techspec.md` | missing | gap; see limitations |

- Terrain baseline: missing. The TechSpec has no formal quality profile or Terrain baseline. Repository gates were treated as absolute checks, not as a zero-delta baseline.
- Hits discounted by baseline: none; no baseline exists from which to subtract.
- Reservations accumulated in the feature: 2 current optional improvements (OI-01 and OI-02). `codereview_03/OI-03` is treated as CR-04 here because `tests.md` expressly forbids silent pass-through.
- Suggested escalation: no profile trigger can fire because the TechSpec defines no reservation-trigger table. No escalation skill is suggested.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal ports/adapters and acyclic dependency flow | YES | Current typecheck/lint and T11 dependency direction |
| Durable self-contained runtime assets | YES | Asset currency and package smoke passed; five runtime assets packed |
| Machine-only detections remain candidates | YES | Detection suites and live doctor output |
| Surgical edits preserve user bytes and refuse invalid input | YES | Pretty/minified/JSONC and isolated-conflict suites passed |
| Per-file atomicity and optimistic concurrency | YES | Change-applier and linked-config concurrency tests passed |
| Canonical `FileChange.realPath` and `ChangePlan.projectRoot` | YES | T10/T11 regression suites passed in the current run |
| Legacy migration requires separate consent | YES | Legacy preview/migration suites passed |
| Conservative removal and explicit state deletion | YES | Removal unit/integration/E2E suites passed |
| Existing config is authoritative; unmanaged protocol conflicts | YES | Config/protocol checks passed |
| Stable exit codes 0/1/2, 64, 130 | YES | UT-20 and CLI E2E passed |
| Unknown version floor emits `VERSION_FLOOR_UNVERIFIED` | NO | Code search has zero occurrences; live doctor reports healthy with an unverified-floor limitation (CR-02) |
| Benchmark reports 100ms process / 15ms in-process targets | YES | Current benchmark suites and live process measurement passed |
| Linux/macOS/Windows acceptance evidence | PARTIAL | Windows PowerShell/Git Bash passed; no Linux/macOS execution artifact (CR-01) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_1.md` | COMPLETE with broken TechSpec link | Package/config/schema foundation; current gates pass |
| T02 | `done/task_2.md` | COMPLETE with broken/stale paths | Detection/version/support policy; current suites pass |
| T03 | `done/task_3.md` | COMPLETE with broken/stale paths | Safe change engine; current suites pass |
| T04 | `done/task_4.md` | COMPLETE with broken/stale paths | Eight adapters and research; current suites pass |
| T05 | `done/task_5.md` | COMPLETE with broken/stale paths | Init/remove/doctor; current suites pass apart from CR-02 |
| T06 | `done/task_6.md` | COMPLETE with broken TechSpec link; platform evidence incomplete | Packaging/docs/CI exist; CA-20 is not proven on Linux/macOS |
| T07 | `codereview_01/done/task_07.md` | COMPLETE, unlinked extra | Minified JSON/editor isolation remains green |
| T08 | `codereview_01/done/task_08.md` | COMPLETE, unlinked extra | Legacy preview remains green |
| T09 | `codereview_01/done/task_09.md` | COMPLETE, unlinked extra | README validation remains green |
| T10 | `codereview_02/done/task_10.md` | COMPLETE, unlinked extra with stale self-path | Canonical harness targets remain green |
| T11 | `codereview_03/done/task_11.md` | INCOMPLETE/INCONSISTENT | Handoff claims implementation, but T11.1–T11.5 remain `[ ]` and the task is not in `tasks.md` (CR-03) |

The original manifest links tasks 1–6 and marks them `[x]`. Correction tasks T07–T11 exist only below previous review folders. Their finding traceability is present inside each file, but no additive manifest/index links them.

## Executed validations

- Profile and scope: all-untracked worktree on Windows 11; Node v24.19.0, npm 11.17.0, git 2.55.0.windows.5, Windows PowerShell 5.1.26100.9444, Scoop Git Bash (`MINGW64_NT-10.0-26200`, GNU bash 5.3.15).
- Validated state: current source rebuilt into `dist/`; commands below ran after reading all review sources and applicable rules.
- Reused evidence: no previous local gate result was reused. Handoff platform claims were treated as historical only because there is no commit/CI artifact binding them to this worktree.
- Manual acceptance: no interactive TTY confirmation session was run. The TechSpec assigns required acceptance to automated CLI tests; no essential manual-only criterion was identified.

| Command or check | Result | Obligations covered |
| --- | --- | --- |
| `npm install --ignore-scripts` | passed; up to date; npm reported 3 moderate dev-tree advisories | dependency installation |
| `npm run build` | passed | build, schemas, runtime assets |
| `npm run typecheck` | passed | QA-03 |
| `npm run lint` | passed | QA-01 and code rules |
| `npm test` | passed: 61 files, 203 tests | UT-01–UT-20, IT-01–IT-16, E2E-01–E2E-10 on this host |
| `npm run coverage` | passed: 61 files, 203 tests; 91.09/82.10/96.14/91.09 | QA-02 and test pyramid |
| `npm run schemas:check` | passed | RF17 |
| `npm run dependencies:check` | passed: 3 runtime packages, zero install scripts | `node.md` |
| `npm run assets:check` | passed | runtime asset currency |
| `npm run package:smoke` | passed: 187 packaged files | RF5, RF17, CA-19 packaging |
| `npm audit --omit=dev --json` | passed: zero runtime vulnerabilities | runtime dependency risk |
| `node dist/src/cli/main.js doctor --json` | exit 0, `healthy`, `findings: []`, while `minimumVersion: null` and limitation says compatibility cannot be claimed | CR-02 repro |
| Local Markdown link resolver over feature artifacts | failed: six missing `done/techspec.md` targets | CR-05 |
| Checkbox/state scan over all handoffs | failed: T11.1–T11.5 unchecked; all earlier work items checked | CR-03 |
| ID presence scan over `tests/` | passed: no UT-01–20, IT-01–16, E2E-01–10, or CA-01–20 ID absent | mapped-test inventory |
| External PRD/TechSpec link opens | passed for all listed vendor/repository URLs; Pi redirected to its current repository | source-link reachability |
| Current E2E-10 | passed six Windows tests under PowerShell and Scoop Git Bash | Windows part of CA-20 only |

The three moderate npm advisories are confined to the development dependency tree; the runtime-only audit is clean. They were already recorded in the Task 1 handoff and are not raised as a new runtime finding.

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | CA-20; Task 6.4–6.7; TechSpec E2E-10/platform requirements | `git rev-list --count --all` = 0, no remote, and therefore no CI run artifact; current execution proves only Windows PowerShell and Scoop Git Bash. `.github/workflows/ci.yml` declares Linux/macOS/Windows but declaration is not execution evidence. | The required Linux and macOS acceptance slices are not verifiable for the current code/configuration. The review status rules prohibit approval with missing essential platform evidence. | Bind the worktree to a commit and provide a green CI matrix artifact for Node 20/22/24 on Ubuntu, macOS, and Windows, including E2E-10, or provide equivalent recorded runs on those platforms. Re-run after CR-04 so a green link scenario proves execution rather than a silent return. |
| CR-02 | Medium | TechSpec `CapabilityProfile` degradation rule: unknown floor must report `VERSION_FLOOR_UNVERIFIED`; RF20 diagnostic transparency | `src/core/services/support-service.ts:42-46` adds only free-text limitation data; `src/core/services/doctor-service.ts:31-46,74` never converts it to a finding; `src/core/services/report-service.ts:69-76` derives status solely from findings. Code/test/schema search finds zero `VERSION_FLOOR_UNVERIFIED` occurrences. Live workspace doctor returns `healthy`, exit 0, `findings: []`, `supportLevel: full`, `minimumVersion: null`, alongside “version compatibility cannot be claimed.” | Human and machine consumers receive a healthy result even though the TechSpec requires a warning with a stable code. Automation cannot distinguish unverified compatibility through findings or exit status. | Emit one warning `DiagnosticFinding` with code `VERSION_FLOOR_UNVERIFIED` for each diagnosed integration whose floor is unknown, include harness/impact/remediation, and add text/JSON/schema/status tests proving doctor exits with warnings rather than healthy while preserving the support profile. |
| CR-03 | Medium | `sdd-review-code` task-state requirement; T11 work ledger | `codereview_03/done/task_11.md:36-40` leaves T11.1–T11.5 unchecked, while `:71-75` provides a completion handoff and the file sits under `done/`. `tasks.md:5-10` links only T01–T06, so T11 has no manifest state to resolve the conflict. | Reviewers and correction tooling cannot determine the authoritative T11 state from the artifacts. An inconsistent/incomplete task state is an explicit rejection condition even though the implementation and tests are present. | Reconcile T11’s checkboxes with independently verified evidence and add an additive correction index/manifest linking T07–T11 with their state and source finding. Do not alter previous review reports. |
| CR-04 | Medium | `tests.md` Platforms rule; T10.4/T10.5; T11.4 verification contract | `tests/integration/linked-project-root.test.ts:42,63,76-77`, `tests/e2e/e2e-linked-project-root.test.ts:51`, `tests/integration/symlinked-harness-config.test.ts:41,69`, and `tests/e2e/e2e-symlinked-harness-config.test.ts:35,57` use bare `return` when link creation fails. | On a runner lacking symlink/junction capability, nine required regression paths are reported as passed without executing assertions. This can produce false evidence for RF13/CA-07/CA-20 and the T10/T11 corrections. | Use Vitest’s runtime skip mechanism with an explicit capability reason, or fail on CI platforms where link capability is required. Add an assertion/report that the platform variant actually executed. |
| CR-05 | Low | `sdd-review-code` source/link integrity requirement | `done/task_1.md:49`, `task_2.md:48`, `task_3.md:54`, `task_4.md:51`, `task_5.md:57`, and `task_6.md:47` link `./techspec.md`, which resolves to missing `done/techspec.md`; the real file is `../techspec.md`. Stale self-locations also remain at `task_2.md:112`, `task_3.md:143`, `task_4.md:140`, `task_5.md:176`, and `codereview_02/done/task_10.md:91`. | The immutable evidence graph contains broken navigation and claims paths that do not exist, so task-to-spec and handoff-location evidence is not self-contained. Approval requires intact links. | Correct the six relative links to `../techspec.md` and update stale location evidence to the actual `done/` paths while preserving report history and substantive handoff content. |

## Optional improvements

| ID | Severity | Source | Evidence | Impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| OI-01 | Low | `codereview_02/OI-01`, `codereview_03/OI-01` | `src/cli/commands/init.ts:45-50,72` emits the legacy preview before authorization and the final text report renders the same finding again. | Human `init --yes` output contains the same warning on stderr and stdout. | Preserve pre-confirmation visibility but suppress the duplicate in the final human report, or document the intentional two-stream repetition. |
| OI-02 | Low | `codereview_03/OI-02`; doctor health semantics | `diagnoseHarness` stores an overhead result but adds only adapter findings; `buildDoctorReport` derives status from findings, so `overhead.status === 'fail'` cannot affect status or exit code. | Automation can receive `healthy` even when the displayed p95 misses its target. | Convert a failed overhead target into a warning finding such as `OVERHEAD_TARGET_EXCEEDED`, with text/JSON/status coverage. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | resolved | Minified JSON and planner-isolation unit/integration/E2E suites passed in both current test runs |
| `codereview_01/CR-02` | resolved | Legacy preview unit/E2E suites passed and the file remains unchanged without `--migrate-legacy` |
| `codereview_01/CR-03` | resolved | README configuration regression test passed |
| `codereview_02/CR-01` | resolved | Harness-directory link/junction install and concurrency suites passed; all adapter targets remain canonical |
| `codereview_03/CR-01` | resolved | Linked project-root unit/integration/E2E suites passed; current plan root and config/manifest targets are canonical and repeated init is a no-op |
| `codereview_03/OI-01` | persistent reservation | Duplicate legacy rendering path remains present |
| `codereview_03/OI-02` | persistent reservation | Failed overhead status still does not create a finding |
| `codereview_03/OI-03` | persistent and escalated to CR-04 | All affected link tests still use bare `return`; T11 added the same pattern |

## Limitations and open items

- No Git base or Terrain commit exists. The entire repository is untracked, so source attribution is limited to handoffs and the current filesystem; no correction can be isolated as a commit range.
- The TechSpec contains no formal `QA-NN` quality profile, no reservation triggers, and no Terrain baseline. Repository gates were run as absolute checks; no baseline subtraction was possible.
- CA-20 remains not verifiable for Linux and macOS. A declared CI matrix is not a run artifact, and there is no commit or remote from which one could be retrieved.
- Correction tasks T07–T11 are unlinked extras outside `tasks.md`. T11 additionally has contradictory checkbox/handoff state (CR-03).
- External vendor links were checked for reachability only. This review did not re-implement or change harness adapters, so it did not rewrite adapter research from current vendor behavior.
- No interactive TTY confirmation session was executed. Automated non-TTY, `--yes`, dry-run, text, and JSON paths passed; the TechSpec does not identify an essential manual-only case.
- Dev dependency installation reports three moderate advisories; the runtime-only audit reports zero vulnerabilities. With no Terrain baseline, the report records rather than discounts the dev-tree advisories, but they are not a runtime/security finding in this review.

## Conclusion

The `codereview_03/CR-01` correction is implemented and verified: linked project roots, symlinked configuration, linked manifests, and linked harness directories pass current unit, integration, and built-CLI E2E coverage, and repeat installation is byte-idempotent. Every local quality gate is green, including 203 tests across 61 files and all four coverage thresholds.

Approval is still not available. CA-20 lacks essential Linux/macOS execution evidence (CR-01); doctor violates the explicit unknown-version-floor diagnostic contract by returning healthy without `VERSION_FLOOR_UNVERIFIED` (CR-02); T11’s task state contradicts its completion handoff (CR-03); link regression tests can silently pass without running (CR-04); and six source links plus five recorded task locations are stale or broken (CR-05). Under the skill’s status rules, missing essential evidence, a non-conformant TechSpec contract, inconsistent task state, and broken links require **REJECTED**.
