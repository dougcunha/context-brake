# Code review report: PRD-01 installation, detection, and diagnostics

## Summary

- Status: REJECTED
- Git scope: `Not delimited: see limitations`
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_07/codereview.md`
- Review target: the T25-T28 correction worktree over `501f28f`, plus every still-applicable PRD-01 and TechSpec obligation

T26 and T27 resolve their predecessor findings. T28 resolves the Codex Windows command and root-warning implementation, but its required current POSIX and CI evidence is incomplete. T25 preserves user hook entries but still deletes a trailing comment during the install/remove round trip. Four older PRD findings also remain: incorrect capability/support reporting, the absent `.gitignore` lifecycle, invalid overhead measurement, and two inaccurate README statements.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read in full |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read in full at the worktree state |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read in full |
| Previous review | `codereview_07/codereview.md` | read in full; predecessor report hashes rechecked |
| Correction tasks | `codereview_07/done/task_25.md` through `task_28.md` | read in full; all checkboxes marked complete |
| Project rules | `AGENTS.md`, `C:\Users\Admin\.codex\RTK.md`, and applicable `.agents/rules/*.md` | read and applied |
| Vendor contracts | [Codex hooks](https://learn.chatgpt.com/docs/hooks), [Antigravity hooks](https://antigravity.google/docs/hooks/), and vendor links recorded in `docs/research/harness-integrations.md` | current public contracts rechecked |
| Implementation | unstaged worktree over `501f28f`: 27 tracked modifications and 21 untracked files, including 43 implementation/documentation/test files and 5 prior-review artifacts | bounded by the diff and T25-T28 handoffs; no staged changes |

No `--base` revision was supplied. The implementation is not committed, so this review uses `501f28f` as the parent state only where a correction-delta comparison is needed. Existing review reports were not modified.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect supported harnesses | detector registry and per-harness detectors | detection unit/integration suites | conformant | full suite passes |
| RF2 | Recognize project-level installations | detection and project-root probes | fixture and diagnostic suites | conformant | existing evidence remains green |
| RF3 | Report support level | `support-service.ts:46-54` | support service tests | non-conformant | level derivation conflicts with the approved support contract; CR-02 |
| RF4 | Plan changes and conflicts before writing | change-plan service and adapter planners | planning/conflict suites | conformant | preview and apply paths pass |
| RF5 | Install documented harness integration | harness planners, T26 Antigravity shape, T28 Codex variants | hook registration, integration, E2E | conformant | current Windows and local integration checks pass |
| RF6 | Preserve existing user configuration | item-level Codex/Cursor updaters | `codex-cursor-user-hooks.test.ts` | non-conformant | trailing comments are deleted on removal; CR-01 |
| RF7 | Make repeated initialization idempotent | installation and JSON updater services | repeated-init suites | conformant | current tests pass |
| RF8 | Report truthful capability support and limitations | adapter capability tables | support and adapter suites | non-conformant | supported/unsupported declarations and derived levels are inconsistent; CR-02 |
| RF9 | Diagnose installed integrations | adapter `diagnose` methods | unit, integration, E2E doctor cases | conformant | T28 root warning is wired and passes locally |
| RF10 | Manage instruction markers safely | instruction policy and markers | instruction-policy and symlink suites | conformant | current tests pass |
| RF11 | Install the full context protocol | protocol asset and installation plan | package and instruction suites | conformant | asset/package checks pass |
| RF12 | Preview changes without mutation | CLI preview and change plans | preview/E2E suites | conformant | current tests pass |
| RF13 | Produce structured JSON output | CLI serializers | CLI and E2E suites | conformant | current tests pass |
| RF14 | Remove owned installation artifacts | removal service and adapter planners | removal integration/E2E suites | conformant | T27 isolates invalid-config conflicts and valid removals continue |
| RF15 | Preserve plan/checkpoint state by default | removal policy | removal suites | conformant | existing state-preservation cases pass |
| RF16 | Load and validate project configuration | config loader/schema | config unit/integration suites | conformant | schema and suite pass |
| RF17 | Keep generated schema current | schema generator and checked schema | `schemas:check` | conformant | command passes |
| RF18 | Keep commands and aliases idempotent | CLI command wiring | CLI/E2E suites | conformant | full suite passes |
| RF19 | Apply user-file changes safely | change applier, JSON editors, removal validation | file-change and removal suites | non-conformant | comment loss remains despite conflict isolation; CR-01 |
| RF20 | Explain support limitations accurately | support formatter and adapter definitions | support snapshots/tests | non-conformant | current output can overclaim coverage or downgrade documented full support; CR-02 |
| RF21 | Diagnose missing prerequisites | doctor services | diagnostics suites | non-conformant | state-file ignore prerequisite cannot be diagnosed because RF24 is absent; CR-03 |
| RF22 | Measure hook overhead against the installed invocation | `overhead-measurer.ts` | doctor overhead tests | non-conformant | wrong handler/event is measured for several adapters; CR-04 |
| RF23 | Package and run without dependency scripts | package metadata and checks | dependency/package smoke checks | conformant | both commands pass |
| RF24 | Manage state-file `.gitignore` entries | no implementation | no UT-21-25, IT-17/18, or E2E-11 implementation | pending | TechSpec delegates it, but the approved PRD still requires it; CR-03 |
| CA-01 | Detect the fixture harnesses | detectors | detection suites | conformant | tests pass |
| CA-02 | Show planned file operations | change plan/CLI | preview tests | conformant | tests pass |
| CA-03 | Install selected harnesses | planners/change applier | init E2E | conformant | tests pass |
| CA-04 | Re-run init safely | idempotent planners | repeated-init tests | conformant | tests pass |
| CA-05 | Preserve pre-existing hooks/configuration | JSON item updaters | user-hook preservation integration/E2E | non-conformant | a valid trailing comment disappears; CR-01 |
| CA-06 | Report unsupported/unknown versions | capability gating | support tests | conformant | version-gating tests pass |
| CA-07 | Remove only ContextBrake-owned entries | removal planners | removal and legacy-hook suites | non-conformant | entries survive, but adjacent user comments can be removed; CR-01 |
| CA-08 | Keep state unless explicitly removed | removal service | removal suites | conformant | tests pass |
| CA-09 | Diagnose installation state | doctor/adapters | diagnostic suites | conformant | tests pass |
| CA-10 | Return machine-readable diagnostics | CLI JSON output | E2E JSON cases | conformant | tests pass |
| CA-11 | Preserve instruction content outside markers | instruction editor | byte-preservation/symlink tests | conformant | tests pass |
| CA-12 | Preserve user files through init/remove | change applier and JSON span editing | file-change suites | non-conformant | CR-01; `.gitignore` ownership is also absent under CR-03 |
| CA-13 | Reject malformed owned markers safely | instruction policy | malformed-marker fixtures | conformant | tests pass |
| CA-14 | Package runtime assets | asset bundler/package | `assets:check`, `package:smoke` | conformant | both pass |
| CA-15 | Print the approved support matrix | support service and adapter capability declarations | support tests | non-conformant | tests encode internally inconsistent claims; CR-02 |
| CA-16 | Respect project config and aliases | config/CLI | configuration suites | conformant | tests pass |
| CA-17 | Provide actionable doctor findings | diagnostic helpers | adapter diagnostic tests | conformant | T28 message, impact, and remediation match the correction contract |
| CA-18 | Report overhead without breaking doctor | overhead measurer | doctor tests | non-conformant | output exists, but the measured invocation is not the installed one; CR-04 |
| CA-19 | Document the installation/removal flow accurately | README | package smoke and manual comparison | non-conformant | Oh-My-Pi path and marker-line count are wrong; CR-05 |
| CA-20 | Pass required platform scenarios on Ubuntu, macOS, and Windows | CI matrix and shell execution tests | current local Windows run only | not verifiable | current correction worktree has no CI run, and its POSIX test is skipped locally; CR-06 |
| CA-21 | Add and remove the owned `.gitignore` block | no implementation | none | pending | CR-03 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` | OK | reviewed PRD, TechSpec, tasks, handoffs, callers/effects, rules, profile, tests, and predecessor findings; wrote only this new report |
| `RTK.md` | OK | repository shell commands were issued through `rtk` |
| `code-standards.md`, `javascript-typescript.md`, `node.md` | OK | lint/typecheck/build pass; correction-scope QA-01 to QA-06 has zero hits |
| Hexagonal dependency rule | OK | no correction adds a `core` import from `infrastructure` or `cli` |
| `harness-adapters.md` | OK for T26/T28 registration shapes | current Codex and Antigravity contracts were rechecked; research was updated |
| `file-changes.md` | NOT OK | an install/remove round trip removes user-authored trailing comments; CR-01 |
| `cli-output.md` | OK | T27 uses an expected conflict and T28 uses a structured warning |
| `tests.md` | NOT OK | T28 requires both POSIX shells when available and current CI evidence; the test only executes `sh -lc`; CR-06 |
| `antislop` and `antislop-copywriting` | OK | report states observed behavior directly and avoids unsupported claims |

## Quality profile

The TechSpec profile was executed over the 35 TypeScript files in the correction set. Its declared Terrain baseline at `99643a5` covers only the later RF24 target files and therefore does not cover these files. The predecessor implementation HEAD `501f28f` was used only as a supplementary correction baseline. Because all six scans returned zero total hits, no discount was needed.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | TechSpec QA-01 `rg` over correction files | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | TechSpec QA-02 `rg` | 0 new of 0 | OK |
| QA-03 | empty `catch` or `.catch(() => {})` | blocking | TechSpec QA-03 `rg -U` | 0 new of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | TechSpec QA-04 `rg` | 0 new of 0 | OK |
| QA-05 | generic `throw new Error(` | reservation | TechSpec QA-05 `rg` | 0 new of 0 | OK |
| QA-06 | 4+ parameters or TypeScript file above 100 lines | reservation | TechSpec QA-06 `rg` plus line count | 0 new of 0 | OK |

- Terrain baseline: present in the TechSpec but not applicable to the correction files; `501f28f` used as supplementary baseline.
- Hits discounted by baseline: 0.
- Reservations accumulated in the correction set: 0.
- Suggested escalation: `sdd-plan-refactoring` for the 5 duplicated install-validation blocks. The trigger is advisory only; that skill is not installed in this session and was not executed.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal boundaries and dependency direction | YES | QA-04 has zero hits |
| T25 item-level JSON editing preserves unrelated bytes | NO | `json-span-utils.ts:42-44` repositions a trailing comment so owned-entry removal deletes it; CR-01 |
| DEC-03 Antigravity uses `PreInvocation` without blanket allow | YES | updater/runtime asset register the documented named-hook shape and return only `injectSteps` |
| Removal validates each harness config and isolates conflicts | YES | shared `validateRemovalConfig`, adapter-owned asset paths, unit/integration/E2E evidence |
| DEC-04 Codex has POSIX and Windows command variants and requires a git root | PARTIAL | implementation and current Windows execution pass; required POSIX/bash/current-CI proof is absent; CR-06 |
| Capability profile and support-level contract | NO | `deriveLevel` and several adapter tables conflict with the approved matrix; CR-02 |
| `IgnoreBlock`, DEC-02 build step 9, UT-21-25, IT-17/18, E2E-11 | NO | no source or tests implement the contract; CR-03 |
| `OverheadMeasurement` exercises the exact installed invocation | NO | process event argv is omitted and in-process registration retains only the last handler; CR-04 |
| Vitest coverage thresholds at or above 80% | YES | 91.96% statements, 84.37% branches, 95.84% functions, 91.96% lines |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01-T06 | `done/task_1.md` through `done/task_6.md` | COMPLETE | unchanged predecessor work; current gates pass |
| T07-T09 | `codereview_01/done/` | COMPLETE | archived handoffs; current gates pass |
| T10 | `codereview_02/done/task_10.md` | COMPLETE | archived handoff; current gates pass |
| T11 | `codereview_03/done/task_11.md` | COMPLETE | archived handoff; current gates pass |
| T12-T15 | `codereview_04/done/` | COMPLETE | archived handoffs; current gates pass |
| T16 | `codereview_04/done/task_16.md` | COMPLETE | ledger reconciled by T24 |
| T17-T22 | `codereview_05/done/` | COMPLETE | archived handoffs; current gates pass |
| T23 | `codereview_06/done/task_23.md` | COMPLETE | two Vitest lanes remain enforced; current suite has no timeout or unhandled error |
| T24 | `codereview_06/done/task_24.md` | COMPLETE | historical platform ledger remains intact; it does not prove the current worktree |
| T25 | `codereview_07/done/task_25.md` | INCOMPLETE | user entries survive, but the byte-preservation acceptance criterion fails for a trailing comment; CR-01 |
| T26 | `codereview_07/done/task_26.md` | COMPLETE | documented `PreInvocation` registration and no blanket allow; focused and full tests pass |
| T27 | `codereview_07/done/task_27.md` | COMPLETE | corrupt harness config becomes an isolated conflict; repaired E2E test and full suite pass |
| T28 | `codereview_07/done/task_28.md` | INCOMPLETE | Windows behavior and doctor warning pass; required `bash -lc` and current platform-matrix evidence are absent; CR-06 |

All 28 task files were uniquely located and contain no unchecked checkbox. T25 and T28 are marked incomplete here because their observed acceptance evidence contradicts their checked state. `tasks.md` does not index T25-T28, so correction lineage is available only through `codereview_07`.

## Executed validations

- Profile and scope: built CLI, runtime assets, schemas, unit/integration/E2E suites, package contents, dependency scripts, file-diff hygiene, task/link integrity, focused JSON round trips, registered hook strings, and current vendor contracts.
- Validated state: unstaged correction worktree over `501f28f`; Windows 11 Pro, PowerShell, Node 24.19.0, npm 11.17.0.
- Reused evidence: predecessor reports and historical CI establish the unchanged baseline only. They do not establish CA-20 for the current uncommitted correction files.
- Manual acceptance: current Windows Codex command execution was exercised. No real vendor harness binary was run. WSL has Ubuntu but no native `node`, so it could not execute the current POSIX suite.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | compiled CLI, schemas, runtime assets |
| `npm run lint` | passed | code standards and size checks |
| `npm run typecheck` | passed | TypeScript contracts |
| `npm test` | passed: 74 files, 276 passed, 1 POSIX-only test skipped on Windows | unit, integration, E2E obligations; CR-06 remains |
| `npm run coverage` | passed: 91.96 / 84.37 / 95.84 / 91.96% | TechSpec coverage thresholds |
| `npm run schemas:check` | passed | RF17 |
| `npm run assets:check` | passed | runtime asset currency |
| `npm run dependencies:check` | passed: 3 runtime dependencies, no install scripts | RF23 |
| `npm run package:smoke` | passed: 200 packaged files verified | package surface and built CLI |
| `git diff --check` | passed | whitespace and patch hygiene |
| feature Markdown link scan | passed: 38 Markdown files, 24 local links, 0 broken | task/report integrity |
| task inventory scan | passed: 28 unique task files, 0 missing, 0 duplicate, 0 unchecked | task traceability |
| TechSpec QA-01 to QA-06 over 35 TypeScript files | passed: 0 hits | quality profile |
| Codex and Cursor trailing-comment round-trip probe | failed preservation: user entry remains, trailing comment present after install and absent after remove for both harnesses | RF6, RF19, CA-05, CA-07, CA-12, T25; CR-01 |
| invalid-shape JSON removal probe | passed safely: `INVALID_HARNESS_CONFIG`, no mutation | T27 |
| current Codex registered Windows command probe | passed under `cmd.exe /C` from a nested git directory, exit 0, empty stdout | DEC-04 Windows slice |
| `wsl.exe -l -q`; native `node --version` in Ubuntu | Ubuntu present; blocked because native `node` is not installed | T28 POSIX evidence limitation |
| predecessor SHA-256 verification | passed for `codereview_01` through `codereview_07` | immutable review history |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | RF6, RF19, CA-05, CA-07, CA-12, T25, `file-changes.md` | `json-span-utils.ts:42-44` appends the owned item after the prior item's trailing comment. Removing the owned line then removes that comment. The focused Codex and Cursor round trip produced `commentAfterInstall=true`, `commentAfterRemove=false`, `userAfterRemove=true`. Existing tests at `codex-cursor-user-hooks.test.ts:21-35,46-60` put the comment inside the object and assert containment, so they do not exercise the failing layout or byte equality. | Valid user-authored comments are silently lost during a nominally ownership-scoped remove. | Keep the trailing trivia attached to the original item when inserting, then add exact-byte round-trip fixtures with a comment between the user item and the array close for every registered event. |
| CR-02 | High | RF3, RF8, RF20, CA-15, TechSpec capability contract | `support-service.ts:46-54` requires every capability for `full`; Codex and Copilot declare `context_usage` and `timeout_fail_closed` unsupported, while Claude/Cursor declare every capability supported. `antigravity-cli/adapter.ts:15` still declares `pre_tool_block` supported after T26 removed its `PreToolUse` hook. | `support` can downgrade integrations the PRD calls full and can claim enforcement or telemetry that the installed hook does not provide. Users cannot make a reliable install decision from the reported matrix. | Complete the approved PRD 1.1 support decision, represent tool/event coverage explicitly, and align each adapter declaration, derived level, limitation, and test with the installed channel. |
| CR-03 | High | RF21, RF24, CA-12, CA-21, TechSpec DEC-02/build step 9 | No source or test implements `IgnoreBlock`, state-file ignore markers, `STATE_FILES_NOT_IGNORED`, UT-21-25, IT-17/18, or E2E-11. README lines 32, 123, and 193 claim state files are ignored, while line 117 calls that behavior planned. | Local plan/checkpoint files can be committed accidentally, removal cannot manage its owned ignore block, and published documentation contradicts runtime behavior. | Implement the TechSpec ignore-block service, ownership manifest entry, doctor check, init/remove integration, and listed tests before claiming the state files are ignored. |
| CR-04 | Medium | RF22, CA-18, TechSpec `OverheadMeasurement` | `overhead-measurer.ts:48-52` overwrites one in-process handler for every `api.on` call and times only the last registration; the process path invokes only the asset path without the installed event argument. Antigravity's sample still targets `PreToolUse` although T26 installs `PreInvocation`. | The reported p50/p95 values do not measure the installed hook path and can mislead doctor users about overhead. | Benchmark each adapter's exact installed command/event pair and select the named in-process handler instead of the last registration. Add a regression that fails when an installed event changes. |
| CR-05 | Low | CA-19, README accuracy | `README.md:63` says Oh-My-Pi uses `.omp/hooks/`, while implementation and TechSpec use `.omp/extensions/`. `README.md:116` calls the managed marker a four-line pointer although the canonical block is three lines. | Users receive incorrect setup and file-change expectations. | Correct the path and describe the marker block without a stale line count. |
| CR-06 | Medium | CA-20, T28 acceptance and verification, `tests.md` platform rule | `codex-hook-command-shells.test.ts:73-75` covers only `sh -lc`; T28 also requires `bash -lc` when available and requires missing prerequisites to fail under `CI=true`. The helpers at lines 12 and 24 do not establish that policy. The T28 handoff records only Windows 11/Node 24, and the current uncommitted worktree has no Ubuntu/macOS/Windows CI run. | The most platform-sensitive correction is marked complete without the evidence needed to show that its registered POSIX command works on both required shells and supported Node/platform jobs. | Add the specified bash case and explicit prerequisite behavior, run the current correction commit through Ubuntu, macOS, and Windows on Node 20/22/24, and record the run ID and shell exit/stdout evidence in the handoff. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_07/CR-01` | persistent, narrowed to current CR-01 | hook entries now survive, but adjacent user comments do not |
| `codereview_07/CR-02` | resolved | Antigravity uses documented `PreInvocation` and does not return an automatic allow decision |
| `codereview_07/CR-03` | persistent as current CR-02 | support derivation and adapter capability claims remain unchanged; Antigravity now adds a concrete mismatch |
| `codereview_07/CR-04` | persistent as current CR-03 | RF24/CA-21 source and tests remain absent |
| `codereview_07/CR-05` | persistent as current CR-04 | overhead measurement code remains unchanged and the Antigravity fixture is now stale |
| `codereview_07/CR-06` | resolved | invalid harness config is an isolated conflict; valid harnesses continue removal |
| `codereview_07/CR-07` | resolved at implementation level | `commandWindows` and `CODEX_ROOT_NOT_GIT_TOPLEVEL` are implemented and pass current Windows checks; current cross-platform completion evidence is separately tracked by CR-06 |
| `codereview_07/CR-08` | persistent as current CR-05 | both README statements remain unchanged |

## Limitations and open items

- No base revision or committed correction SHA was supplied. The worktree scope is recoverable from the current diff and T25-T28 handoffs, but it is not an immutable Git range.
- The local environment is Windows. The full suite skips the POSIX-only shell test, and Ubuntu under WSL lacks a native Node installation. Historical green CI predates T25-T28 and cannot prove the current worktree.
- No real Claude, Codex, Cursor, Copilot, Antigravity, OpenCode, Pi, or Oh-My-Pi binary was executed. Registration shapes were checked against current vendor documentation and repository fixtures.
- The TechSpec Terrain baseline targets RF24 follow-up files, not the T25-T28 correction set. All current profile scans nevertheless had zero hits, so baseline uncertainty does not affect the profile result.
- `tasks.md` does not enumerate T25-T28. Their handoffs are unique and complete as files, but the feature manifest does not expose this correction lineage.

## Conclusion

The correction set materially improves the implementation: Antigravity no longer auto-approves tools, invalid removal configs are isolated, Codex has a Windows command, and doctor detects an unusable Codex root. It is still not acceptable against the approved PRD. T25 deletes valid user comments, T28 lacks required current platform evidence, and four feature obligations from the prior review remain unresolved. The review is therefore REJECTED.
