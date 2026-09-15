# Code review report — PRD-01 installation, detection, and diagnostics

## Summary

- Status: REJECTED
- Git scope: Not delimited by `--base` — see limitations. Re-review delta traced as `3347b73..501f28f` (the `codereview_06` validated revision to the clean HEAD). Feature obligations were audited on the full HEAD tree.
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_06/codereview.md`
- Review focus:
  - T23 and T24, the corrections for `codereview_06`;
  - every code change since `codereview_06`: `1d4bbb5`, `fd7fc74`, `e490569`, `99643a5`;
  - the PRD and TechSpec amendments of 2026-09-14: RF24, CA-21, amended CA-12, CA-15, and the support-level rule;
  - current conformance of RF1–RF24 and CA-01–CA-21.
- Blocking result:
  - T23 and T24 resolve both `codereview_06` findings.
  - The CLI still deletes user hooks in Codex CLI and Cursor configurations (proven with the built CLI).
  - The Antigravity hook auto-approves every tool call.
  - Support levels contradict the amended CA-15 and the capability matrix.
  - RF24 and CA-21 have no implementation.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read in full; RF24, CA-21, amended CA-12, CA-15, CA-20 verification, and the support-level rule included |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read in full (712 lines); `DEC-01` (superseded), `DEC-02`, build step 9, and RF24 quality profile and baseline included |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read; T01–T06 checked; T07–T11 in table; T12–T24 in prose (line 33) |
| Original tasks | `done/task_1.md` … `done/task_6.md` | located; unchanged since `codereview_06` |
| Correction tasks | `codereview_01/done/task_07–09`, `codereview_02/done/task_10`, `codereview_03/done/task_11`, `codereview_04/done/task_12–16`, `codereview_05/done/task_17–22`, `codereview_06/done/task_23–24` | located; T16, T23, T24 read in full |
| Related PRD | `tasks/prd-01.1-pendencias-da-instalacao/prd.md` | read; used only to trace which findings already have a planned vehicle |
| Previous reviews | `codereview_01` … `codereview_06` | preserved; SHA-256 recorded below |
| Implementation | clean worktree at `501f28ffb413aca2ce11d311ce1af7f4dcc9946e`; delta `3347b73..501f28f` (29 TypeScript files, 448+/89−) | limited by absence of `--base` |
| Project rules | `AGENTS.md`, `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md` | read and applied |
| Vendor documentation | Claude Code hooks, GitHub Copilot hooks reference, Codex hooks, Cursor hooks, Antigravity hooks | rechecked 2026-09-14 for the adapters changed in `e490569` and `99643a5` |

Prior report SHA-256 before writing this report:

| Report | SHA-256 |
| --- | --- |
| `codereview_01/codereview.md` | `b87794d7e697df8de2ac2f0634c461a6d8750f67b99071b3e5917f29ae0466f6` |
| `codereview_02/codereview.md` | `bd73511334e8adda098040cd6d7ef81570cb79d012fbfd713d842171f912773b` |
| `codereview_03/codereview.md` | `57a2f35fe1ac8644e32b78e83432318cb856efb9700e631d51af38fe80f01f75` |
| `codereview_04/codereview.md` | `dc94048e236e74426367dccd3780f097cea6605fed6b3dfe7c787baf9d96404b` |
| `codereview_05/codereview.md` | `2e2b65e49ab7870d1cc3b8367da7af22768abf8e1e0bb1738f1340e598bd9897` |
| `codereview_06/codereview.md` | `9fd6e5bef2d26e8a4555b064060a348d961d6214f8085be64750d2a1d0a89000` |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect the eight MVP harnesses | per-harness detectors, `registry.ts` | IT-16, E2E-01/02 | conformant | 5/5 local runs and CI run 34904046341 green |
| RF2 | Report signal origin and version | detectors, `version-service.ts` | detection/version unit tests | conformant | unchanged since `codereview_06`; suites pass |
| RF3 | Shared instruction files are not harness proof | `detection-service.ts` | IT-16, E2E-03 | conformant | suites pass |
| RF4 | Explicit include/exclude overrides detection | `argument-parser.ts`, detection service | IT-03, CLI tests | conformant | suites pass |
| RF5 | Register the documented extension mechanism | adapter planners; exec form for Claude (`claude-merger.ts:6-12`), `exec`/`args`/`cwd` for Copilot (`github-copilot-cli/planner.ts:13-20`) | `hook-registration-paths.test.ts`, `package-assets.test.ts` | conformant | Claude `args` exec form and placeholder expansion, and Copilot `exec`/`args`/`cwd`, match the vendor docs. The Codex TechSpec variant gap is CR-07. |
| RF6 | Preserve existing user integrations in the same files | `codex-cli/planner.ts:26-34`, `cursor/planner.ts:21-30` | none for Codex/Cursor user hooks (fixtures `tests/fixtures/harnesses/{codex-cli,cursor}/user-hooks.json` are referenced by no test) | non-conformant | CR-01; probe P1/P2 |
| RF7 | Leave invalid harness config unchanged and continue with peers during installation | planners' `INVALID_HARNESS_CONFIG` conflicts | IT-04, E2E-05 | conformant | suites pass (removal path: CR-06) |
| RF8 | Support level per the capability matrix and the explicit-deny rule | `support-service.ts:46-54`, adapter `CAPABILITIES` | `support-service.test.ts:14-18`, `harness-adapters.test.ts:19-22` | non-conformant | CR-03 |
| RF9 | Warn below the minimum version | `version-service.ts`, `support-service.ts` | UT-15, IT-13 | conformant | suites pass |
| RF10 | Create the project protocol file | `protocol-service.ts` | protocol suites | conformant | creation verified; alignment with the 2026-09-14 decisions not assessed (see limitations) |
| RF11 | Short marked reference in instruction files | `instruction-service.ts` | UT-07, IT-06 | conformant | suites pass |
| RF12 | No new instruction files without option | `instruction-service.ts` | UT-08, IT-06 | conformant | suites pass |
| RF13 | Symlinked instruction pair written once, link kept | identity planning, applier | IT-05, E2E-10 | conformant | E2E-10 passed in all 9 CI jobs |
| RF14 | Legacy `CONTEXTOPS` preview and explicit confirmation | `legacy-preview.ts` | IT-07, E2E legacy preview | conformant | suites pass; duplicate warning is OI-01 |
| RF15 | Default `context-brake.config.json` | `installation-builder.ts`, config store | E2E-01 | conformant | suites pass |
| RF16 | Validate config every run with field, value, rule | configuration validator | UT-12, IT-10 | conformant | suites pass |
| RF17 | Publish the config schema | `schemas/` | `schemas:check`, package smoke | conformant | both pass |
| RF18 | Dry-run lists changes without writing | change plan, `SNAPSHOT_MISSING` conflict (`change-plan-service.ts:28-30,47-50`) | IT-08, IT-15, E2E-06, `change-plan-service.test.ts` | conformant | `fd7fc74` turns silent drops into conflicts per TechSpec `ChangePlan.conflicts` |
| RF19 | Remove owned content only; state and its `.gitignore` block only on explicit confirmation | `removal-service.ts`, adapter `planRemove` | IT-09, E2E-07 | non-conformant | CR-01 (user hooks emptied), CR-04 (no `.gitignore` handling), CR-06 (one invalid config aborts all removals) |
| RF20 | Doctor lists state, version, support level, missing capabilities with impact | `doctor-service.ts`, adapter profiles | IT-11/12, E2E-08 | non-conformant | CR-03: Claude Code and Cursor report `context_usage` as supported |
| RF21 | Doctor validates config, markers, protocol, plan, checkpoint | `doctor-checks.ts` | doctor suites | pending | `.gitignore` block check (TechSpec `gitignore-checks.ts`, UT-25) absent; CR-04 |
| RF22 | Measure each integration's overhead against the target | `overhead-measurer.ts` | IT-14 | non-conformant | CR-05 |
| RF23 | Text/JSON parity and distinct exit codes | report service, outputs, exit codes | UT-16, UT-20, E2E-08 | conformant | suites pass |
| RF24 | Owned `.gitignore` block for plan and checkpoint | none | none (UT-21–25, IT-17, IT-18, E2E-11 absent) | pending | CR-04 |
| CA-01 | Non-interactive Claude install | init + Claude adapter | E2E-01, E2E-10 | conformant | local and CI green |
| CA-02 | Codex and Cursor configured together | registry, two adapters | IT-02, E2E-02 | conformant | suites pass |
| CA-03 | `AGENTS.md` alone → no install, warning exit | detection service | E2E-03 | conformant | suites pass |
| CA-04 | Exclude Copilot, configure only Cursor | explicit selection | IT-03 | conformant | suites pass |
| CA-05 | Three installs keep user integrations identical and add exactly one ContextBrake integration | Codex/Cursor planners | E2E-04 covers Claude only | non-conformant | CR-01: first Codex/Cursor install already deletes the user entry |
| CA-06 | Invalid harness config untouched, peers configured | planners | IT-04, E2E-05 | conformant | suites pass |
| CA-07 | Linked `AGENTS.md` receives one block, link kept | identity handling | IT-05, E2E-10 | conformant | CI 9/9 |
| CA-08 | Block ≤ 10 lines and points to protocol | markers | UT-07, IT-06 | conformant | suites pass |
| CA-09 | No instruction file created without option | instruction policy | IT-06 | conformant | suites pass |
| CA-10 | Legacy block byte-identical without confirmation | legacy preview | IT-07 | conformant | suites pass |
| CA-11 | Dry-run changes nothing and lists every change | change plan | IT-08, E2E-06 | conformant | suites pass |
| CA-12 | Removal keeps other file content; plan/checkpoint remain on disk and ignored by git | removal service, planners | IT-09, E2E-07 | non-conformant | CR-01 (Codex/Cursor user hooks emptied on remove), CR-04 (not ignored by git) |
| CA-13 | Invalid zone order exits with field/value/rule | validator | UT-12, IT-10 | conformant | suites pass |
| CA-14 | Manually removed integration → `doctor` error | doctor service | IT-11, E2E-08 | conformant | suites pass |
| CA-15 | Copilot shown as `full` with the timeout limitation | `github-copilot-cli/adapter.ts:16-22`, `support-service.ts:50-54` | tests assert `partial` | non-conformant | CR-03 |
| CA-16 | Old version shows detected, minimum, affected capability | version service | UT-15, IT-13 | conformant | suites pass |
| CA-17 | `doctor --json` schema-valid and equal to text findings | JSON output | E2E-08 | conformant | suites pass |
| CA-18 | `doctor` shows measured p95 and target status | overhead measurer, output | IT-14 | conformant | output contract met; what is measured is CR-05 under RF22 |
| CA-19 | README flow yields an error-free doctor within 2 minutes | built CLI | E2E-09 | conformant | E2E-09 passed in every run; README inaccuracies in CR-08 |
| CA-20 | CA-01/05/07 on Linux, macOS, Windows (PowerShell, Git Bash) | E2E-10, CI matrix | E2E-10 | conformant | CI run 34881898428 on `1d4bbb5` and run 34904046341 on HEAD: 9/9 jobs green, `e2e-10.test.ts` passed in every job |
| CA-21 | Three installs keep one `.gitignore` block and user bytes; created when absent | none | none | pending | CR-04 |
| PRD objective | Transparency of guarantees | adapter capability profiles | — | non-conformant | CR-03 |
| PRD constraint | Non-intrusion: change only ContextBrake entries | Codex/Cursor planners, Antigravity hook asset | — | non-conformant | CR-01, CR-02 |
| T23 | Repeatable default `npm test` via lanes | `vitest.config.ts:17-36`, `tests/test-lanes.ts` | `tests/unit/test-lanes.test.ts` | conformant | 5/5 consecutive local runs green; lanes 47 + 18 files, disjoint |
| T24 | T16 ledger consistent with `DEC-01` | `codereview_04/done/task_16.md` | contradiction scan by reading | conformant | lines 5–7, 48–58, 84, 128–131 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` — audit only | OK | only this report was added; no code, task, or prior report changed |
| `code-standards.md` — size, functions, parameters | OK | lint passed; largest changed file 89 lines; QA-06 0 hits |
| `code-standards.md` — comments | OK | comments added in `antigravity-cli-hook.ts:3` and `cursor-hook.ts:4` state a documented harness constraint. The Antigravity comment's claim is wrong; see CR-02. |
| `javascript-typescript.md` | OK | typecheck and lint passed. `assets/runtime/` is outside `tsconfig.check.json` (OI-06). |
| `node.md` — stdout belongs to the harness | OK | process hooks write one JSON document or nothing (`process-hook.ts:37-41`); `package-assets.test.ts` asserts exact stdout |
| `tests.md` — FIRST / Repeatable | OK | 5/5 consecutive default runs: 255/255 each, no skip, timeout, or unhandled error |
| `tests.md` — required scenarios for user file changes | NOT OK | no Codex/Cursor test runs the existing `user-hooks.json` fixtures; CR-01 |
| `harness-adapters.md` — only documented behavior | NOT OK | `.agents/rules/harness-adapters.md:13-15`; Antigravity `allow` auto-approves (CR-02); undocumented `context_usage` support claims (CR-03); undocumented benchmark payload fields (CR-05) |
| `harness-adapters.md` — emit only documented fields | OK | `e490569` removed the mixed multi-vendor response; per-harness responses match the docs rechecked for Claude, Codex, Copilot, and Cursor |
| `file-changes.md` — touch only what ContextBrake owns | NOT OK | `.agents/rules/file-changes.md:17-19`; CR-01 |
| `file-changes.md` — refuse unparsable files and continue | NOT OK | `.agents/rules/file-changes.md:25`; removal aborts every harness (CR-06) |
| `cli-output.md` — expected errors are not unexpected | NOT OK | `.agents/rules/cli-output.md:28-29`; invalid Codex config on `remove` returns `UNEXPECTED_ERROR` (CR-06) |
| `AGENTS.md` — harness research updated with adapter change | OK | `e490569` and `99643a5` updated `docs/research/harness-integrations.md` for the path and response contracts they changed |
| `AGENTS.md` — completion gates | OK | lint, typecheck, build, tests, and coverage passed locally and in CI |

## Quality profile

The TechSpec profile (`techspec.md:636-667`) is written for the RF24 follow-up, and its Terrain baseline covers only the RF24 target files at `99643a5`. No RF24 file exists yet, so the same commands ran over the 29 TypeScript files changed in `3347b73..501f28f`. For files outside that baseline, each command was repeated on the file content at `3347b73`, so a hit counts as new only if the delta introduced it.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | TechSpec QA-01 `rg` over delta files | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | TechSpec QA-02 `rg` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | TechSpec QA-03 `rg -U` | 0 new of 3 | pre-existing — `tests/integration/change-applier.test.ts:31,57,81` identical at `3347b73` |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | TechSpec QA-04 `rg` over `src/core/services/change-plan-service.ts` | 0 new of 0 | OK |
| QA-05 | Generic `throw new Error(` | reservation | TechSpec QA-05 `rg` | 0 new of 9 | pre-existing — `scripts/asset-bundler.ts:63` (1 at `3347b73`), `scripts/check-package.ts` (8 at `3347b73`) |
| QA-06 | 4+ parameters or `.ts` file above 100 lines | reservation | TechSpec QA-06 `rg` plus line count | 0 new of 0 | OK — max 89 lines |

- Terrain baseline: TechSpec baseline applied where it covers files (none touched). For the delta files it is missing, so the parent revision `3347b73` was measured as evidence (see limitations).
- Hits discounted by baseline: 12 (3 QA-03, 9 QA-05), all present at `3347b73`.
- Reservations accumulated in the feature: 0 new; 9 pre-existing QA-05 hits in `scripts/`.
- Suggested escalation (to the HIL, not executed): the TechSpec trigger "same block duplicated in three or more places" fires on touched planners:
  - the read/validate/`INVALID_HARNESS_CONFIG` conflict block repeats in 5 install planners (`claude-code`, `codex-cli`, `cursor`, `github-copilot-cli`, `antigravity-cli`);
  - the removal path that discards the `validateJsonDocument` result repeats in 4 planners (`claude-code/planner.ts:76`, `codex-cli/planner.ts:72`, `cursor/planner.ts:68`, `antigravity-cli/planner.ts:72`), which is the root of CR-06.
  - Suggested skills: `sdd-plan-refactoring` for planner validation consolidation; `sdd-plan-corrections` for CR-01 to CR-08.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal boundaries | YES | QA-04 0 hits; `change-plan-service.ts` imports only core contracts |
| `ChangePlan.conflicts`: planned change without snapshot is `SNAPSHOT_MISSING` | YES | `change-plan-service.ts:28-30,47-50`; `change-plan-service.test.ts` covers delete/update/create and absent-file delete |
| Integration Points — Claude Code registration | YES | exec form `command: node`, `args: [${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs, <event>]`. Vendor docs confirm that `args` spawns without a shell and expands placeholders in every `args` element. The legacy relative entry is replaced (`hook-registration-paths.test.ts:300-309`). |
| Integration Points — Copilot "`exec` and `args` where supported" | YES | `github-copilot-cli/planner.ts:13-20`. Vendor docs: `exec` is CLI-only, must not be combined with `command`, and `cwd` is relative to the repository root. |
| Integration Points — Codex "register platform-specific command variants" | NO | `codex-cli/planner.ts:12-16` registers only `command`; no `commandWindows` (documented in `docs/research/harness-integrations.md:52`); CR-07 |
| Technical Dependencies — git optional at runtime (`techspec.md:574`) | NO | the registered Codex command requires `git rev-parse` at hook time; probe P4 exits 1 outside a repository; CR-07 |
| `CapabilityProfile` — tool coverage capability (`techspec.md:192`) and levels per PRD 1.1 rule | NO | `CAPABILITY_IDS` has no tool-coverage entry; `deriveLevel` requires `context_usage` and `timeout_fail_closed` (`support-service.ts:46-54`); CR-03 |
| UT-14 — "Support is `full`" for Copilot | NO | `support-service.test.ts:14-18` and `harness-adapters.test.ts:19-22` assert `partial`; CR-03 |
| `OverheadMeasurement` / key decision "synthetic fixtures exercise the exact installed asset path" | PARTIAL | the asset file is executed, but the in-process handler is the last registered, event argv is not passed, and payload fields are undocumented; CR-05 |
| `InstallationManifest.packageVersion` — "ContextBrake version that produced the assets" | PARTIAL | `installation-builder.ts:48` falls back to `'1.0.0'` and no caller passes `packageVersion`; correct today only because `package.json` is `1.0.0`; OI-04 |
| `DEC-02`, `IgnoreBlock`, build step 9, UT-21–25, IT-17, IT-18, E2E-11 | NO | no `gitignore-service.ts`, `gitignore-markers.ts`, `gitignore-checks.ts`, `ignore_block` owner, or tests; CR-04 |
| `DEC-01` — superseded by CI evidence | YES | `gh run view 34904046341`: 9/9 jobs `success` on `501f28f`; `e2e-10.test.ts` passed in all 9 |
| Vitest thresholds ≥ 80% | YES | 91.39% statements, 83.19% branches, 96.19% functions, 91.39% lines |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01–T06 | `done/task_1.md` … `done/task_6.md` | COMPLETE | unchanged since `codereview_06`; gates pass |
| T07–T09 | `codereview_01/done/` | COMPLETE | archived |
| T10 | `codereview_02/done/task_10.md` | COMPLETE | archived |
| T11 | `codereview_03/done/task_11.md` | COMPLETE | archived |
| T12–T15 | `codereview_04/done/` | COMPLETE | archived |
| T16 | `codereview_04/done/task_16.md` | COMPLETE | ledger reconciled by T24; superseded statements labeled |
| T17–T22 | `codereview_05/done/` | COMPLETE | archived |
| T23 | `codereview_06/done/task_23.md` | COMPLETE | two Vitest projects (`vitest.config.ts:17-36`); membership regression `tests/unit/test-lanes.test.ts`; `testTimeout` 30,000 ms and `package.json` scripts unchanged; 5 consecutive green runs reproduced here |
| T24 | `codereview_06/done/task_24.md` | COMPLETE | `task_16.md` states closure, six executed cells, and waived macOS cells; superseded text labeled |

All T01–T24 files were uniquely located, and no task checkbox is unchecked. The manifest has no task for TechSpec build step 9 (RF24). The TechSpec assigns that work to PRD 1.1 FR-01, so the PRD-01 manifest reads as complete while RF24 and CA-21 are pending (CR-04).

## Executed validations

- Profile and scope:
  - built TypeScript CLI;
  - unit, integration, and E2E suites in both Vitest lanes;
  - generated schemas and runtime assets;
  - packed npm contents and runtime dependency audit;
  - built-CLI probes against temporary fixture repositories;
  - vendor documentation for five process-hook harnesses.
- Validated state: clean `master` at `501f28f`; Windows 11 Pro NT 10.0.26200, Node 24.19.0, npm 11.17.0, Git Bash. The worktree stayed clean after all gates and probes.
- Reused evidence:
  - GitHub Actions run 34904046341 on the same HEAD, for Ubuntu, macOS, and Windows × Node 20/22/24;
  - run 34881898428 on `1d4bbb5`, for the CA-20 verification recorded in the PRD.
  - The T23 WSL 2 runs were not reused as current evidence: they predate `1d4bbb5`–`501f28f`.
- Manual acceptance: none essential beyond the above; real harness binaries were not executed (see limitations).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (8 s) | build, schemas, assets |
| `npm run typecheck` | passed | QA gates, `javascript-typescript.md` |
| `npm run lint` | passed | `code-standards.md` limits |
| `npm test` × 5 consecutive | passed each: 65 files, 255/255 tests, 0 skipped, 0 timeouts, 0 unhandled errors; 50.2 / 53.1 / 61.2 / 55.6 / 60.2 s | `codereview_06/CR-01`, T23, all RF/CA suites |
| `npm run coverage` | passed: 255/255; 91.39 / 83.19 / 96.19 / 91.39% | TechSpec thresholds |
| `npx vitest list --filesOnly --project parallel` and `--project process` | 47 and 18 files; no file in both lanes | T23 lane membership |
| `npm run schemas:check` | passed | RF17 |
| `npm run dependencies:check` | passed: 3 runtime dependencies, no install scripts | TechSpec dependencies |
| `npm run assets:check` | passed | runtime asset currency |
| `npm run package:smoke` | passed | packaging, built CLI |
| `npm audit --omit=dev` | passed: 0 vulnerabilities | dependency safety |
| TechSpec QA-01–QA-06 over delta files, repeated at `3347b73` | 12 hits, all pre-existing | Quality profile |
| `gh run view 34904046341` | 9/9 jobs `success`; `e2e-10.test.ts` result lines present in every job | CA-20, NFR platform matrix |
| `gh run view 34880328906` (commit `2b65929`, T23/T24) | failed in 6 of 9 jobs: 3 jobs reported a stale `schemas/context-brake.config.schema.json`, 3 failed `change-applier.test.ts` deletion (CA-12) | Fixed by `1d4bbb5` (`.gitattributes` LF, canonical temp dirs) and `fd7fc74` (`SNAPSHOT_MISSING`). Later runs on `1d4bbb5`, `634d0f6`, `ea34845`, `99643a5`, `ffc86be`, `f2227e1`, `501f28f` are green. |
| Probe P1 — built `init --yes` then `remove --yes` on a Codex repo with a user `PreToolUse` hook | both exit 0; user hook present 0 times after init; `PreToolUse`, `PostToolUse`, `SessionStart` are `[]` after remove | CR-01 |
| Probe P2 — same flow on Cursor with user `preToolUse` and `afterFileEdit` hooks | both exit 0; user `preToolUse` hook deleted by init; `afterFileEdit` kept; ContextBrake arrays emptied on remove | CR-01 |
| Probe P3 — `remove --yes --json` with a corrupted `.codex/hooks.json` and a valid Cursor install | exit 2, `UNEXPECTED_ERROR` "Invalid JSON document…"; Codex bytes unchanged; Cursor hooks and asset left installed | CR-06 |
| Probe P4 — registered Codex command via `sh -c` from a subdirectory | outside git: exit 1, `fatal: not a git repository`, module not found; inside git: exit 0 | CR-07 |
| Vendor docs fetch (Claude Code, Copilot, Codex, Cursor, Antigravity) | Claude `args` exec form confirmed; Copilot `exec`/`args`/`cwd` and empty `preToolUse` output confirmed; Antigravity `decision` required and `allow` "Automatically allows the tool execution"; Codex `commandWindows` exists | RF5, CR-02, CR-07 |
| prior-report SHA-256 | recorded above | immutable history |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | RF6, CA-05, RF19, CA-12; PRD non-intrusion constraint; `file-changes.md:17-19` | **Install:** `codex-cli/planner.ts:26-34` and `cursor/planner.ts:21-30` call `setJsonProperty(['hooks', <event>], [ContextBrake entry])`. `json-document-editor.ts:12-15` replaces the whole existing array span, so every user entry in `PreToolUse`/`PostToolUse`/`SessionStart` (Codex) or `preToolUse`/`postToolUse`/`sessionStart` (Cursor) is overwritten. **Remove:** the same function writes `[]`. **Proof:** probes P1 and P2 with the built CLI, both exiting 0 with no warning. **Tests:** `tests/fixtures/harnesses/codex-cli/user-hooks.json` and `cursor/user-hooks.json` exist, but no test references them; CA-05 is exercised only for Claude Code. | A user's own tool-call hooks, often security or policy guards, are silently deleted by `init` and again by `remove`. The dry-run shows only "Register Codex hooks", and `doctor` reports healthy afterwards. Not tracked by PRD 1.1. | Cause proven. Merge by owned entry identity, as `claude-merger.ts` `mergeHookGroups` does: replace or remove only entries whose command references the ContextBrake hook file, and keep every other array element byte-preserved. Add integration and E2E cases using the existing `user-hooks.json` fixtures: three installs plus removal, asserting user entries survive. |
| CR-02 | High | PRD non-intrusion constraint; `harness-adapters.md:13-15`; research `docs/research/harness-integrations.md:144` | `assets/runtime/antigravity-cli-hook.ts:3-4,8` answers every `PreToolUse` with `{ "decision": "allow" }`, and the comment calls this "staying neutral". The Antigravity docs (rechecked 2026-09-14) and the project research both say `allow` "Automatically allows the tool execution", and the docs give no pass-through value. The same response was part of the pre-`e490569` combined object; `e490569` re-established it and added the incorrect rationale. | Installing ContextBrake auto-approves every Antigravity tool call, bypassing the user's normal approval prompts. It weakens the user's permission policy before any brake logic exists. | Cause proven; the replacement value is a decision. Stop emitting blanket auto-approval. Either choose a documented response that does not bypass user grants (the docs describe `ask` as prompting while respecting "Always Allow"), or defer the `PreToolUse` registration until PRD-02 needs it. Record the choice in the research section and assert the emitted value in `package-assets.test.ts`. |
| CR-03 | High | CA-15, RF8, RF20; PRD support-level rule (`prd.md:146`) and matrix (`prd.md:137-144`); TechSpec UT-14 and `CapabilityProfile` | `support-service.ts:46-54` returns `full` only when all five capabilities, including `context_usage` and `timeout_fail_closed`, are `supported`. Contrary to the amended rule, timeout and context usage therefore lower the level. **Adapters:** `github-copilot-cli/adapter.ts:20-21` yields `partial`. `claude-code/adapter.ts:15` and `cursor/adapter.ts:14` mark `context_usage` supported, while the PRD matrix and research say it reaches only the status line or `preCompact`. **Tool coverage:** no tool-coverage capability exists. **Tests:** `support-service.test.ts:14-18`, `harness-adapters.test.ts:19-22`, and `copilot-failure-policy.test.ts:45-46` assert `partial`. **README:** `README.md:57,60` say Claude context usage does not reach hooks and Copilot is Full, contradicting CLI output. | `init` and `doctor` misstate guarantees. Copilot's level is wrong, and Claude Code and Cursor claim context usage that the integration never receives. This defeats the PRD objective "Transparência de garantias", and PRD-02 depends on these declarations. | Cause proven. Derive levels from explicit-deny coverage, post-tool telemetry, and session boot only, with timeout and failure as limitations. Add the tool-coverage capability, mark `context_usage` unsupported for Claude Code and Cursor, and realign the three tests to UT-14. Planned vehicle: PRD 1.1 FR-02, FR-03, FR-04. |
| CR-04 | High | RF24, CA-21, amended RF19, CA-12, RF21; TechSpec `DEC-02`, `IgnoreBlock`, build step 9 | No `.gitignore` service, markers, doctor check, `ignore_block` owner, or tests exist: `src/core/services/` has no `gitignore-*` file; grep for `ignore_block`, `STATE_FILES_NOT_IGNORED`, `# CONTEXTBRAKE:START` over `src`, `schemas`, `tests` finds nothing; UT-21–25, IT-17, IT-18, E2E-11 are absent. `tasks.md` has no task for step 9. `README.md:123` already tells users state files "stay git-ignored" and that `--remove-state` deletes "their `.gitignore` block". | CA-21 cannot pass, and CA-12's "ignored by git" clause fails. The README documents behavior the package does not ship, so users may commit local state. | Implementation pending; no code cause to diagnose. Deliver TechSpec build step 9 (planned vehicle: PRD 1.1 FR-01) with UT-21–25, IT-17, IT-18, E2E-11. Until then, the README wording at line 123 does not match the shipped behavior. |
| CR-05 | Medium | RF22; TechSpec `OverheadMeasurement` and key decision "Benchmark the integration" | **In-process:** `overhead-measurer.ts:48-52` stores the handler from every `mockApi.on` call and keeps the last one. `pi-extension.ts:7-9` and `omp-extension.ts:7-9` register `tool_call`, `tool_result`, then `before_agent_start`, so the benchmark times `before_agent_start`. **Process:** `overhead-measurer.ts:26` spawns the hook without the event argument that every registration passes. **Fixtures:** they rely on undocumented fields — Copilot `event` and Antigravity `hookName`/`toolName` (`github-copilot-cli/adapter.ts:77`, `antigravity-cli/adapter.ts:78`) — while the docs define Copilot `toolName`/`toolArgs` without an event field and Antigravity `toolCall.name`/`toolCall.args` (research lines 90, 142). | The reported p95 is not the cost of the pre-tool path the harness pays. Handlers are trivial today, so values stay close, but they diverge once PRD-02 adds brake logic. | Cause proven. Invoke the registered `tool_call` handler for Pi and Oh-My-Pi, pass the registered event name to process samples, and use documented payload shapes. Planned vehicle: PRD 1.1 FR-05, FR-06. |
| CR-06 | Medium | RF19, CA-12; `file-changes.md:25`; `cli-output.md:28-29`; TechSpec data flow step 4 | `planCodexRemove` (`codex-cli/planner.ts:70-73`) and its counterparts (`cursor/planner.ts:66-69`, `antigravity-cli/planner.ts:70-73`, `claude-code/planner.ts:76`) call `validateJsonDocument(raw)`, discard the result, then call the editor, which throws on invalid JSON. Probe P3: `remove --yes --json` exits 2 with `UNEXPECTED_ERROR`. The Codex file stays untouched, but the valid Cursor integration is not removed. | One malformed harness file blocks removal for every harness and is reported as an unexpected crash instead of a per-file conflict with path and remediation. Not tracked by PRD 1.1. | Cause proven. In each `planRemove`, return an `INVALID_HARNESS_CONFIG` conflict when validation fails, mirroring `planInstall`, and let removal continue for the other harnesses. Add a removal test with one invalid and one valid harness. |
| CR-07 | Medium | TechSpec Integration Points, Codex row (`techspec.md:453`) and Technical Dependencies (`techspec.md:574`) | `codex-cli/planner.ts:12-16` (changed in `99643a5`) registers only `command: node "$(git rev-parse --show-toplevel)/.codex/hooks/context-brake.mjs" <event>`. No `commandWindows` variant is registered, although the TechSpec requires platform-specific variants and `docs/research/harness-integrations.md:52` documents the field. Probe P4: outside a git repository the command exits 1 (`fatal: not a git repository`, module not found). The TechSpec says git is optional at runtime and no-git repositories still support install, doctor, and remove; `doctor` does not flag the dependency. | In a repository without git, every Codex hook invocation fails; Codex reports hook failures, and failure behavior is undocumented. Windows behavior depends on an undocumented shell. Not tracked by PRD 1.1. | Cause proven for the missing variant and the no-git failure. Either register a git-independent invocation and a `commandWindows` variant, or record a `DEC` that makes git a Codex runtime requirement and have `doctor` report it. Cover the chosen commands in `hook-registration-paths.test.ts`. |
| CR-08 | Low | CA-19 (README flow); PRD 1.1 FR-13 | `README.md:63` lists Oh-My-Pi as "Hooks in `.omp/hooks/`", while the adapter installs `.omp/extensions/context-brake.js` (`overhead-measurer.ts:20`, TechSpec Integration Points). `README.md:116` describes a "4-line pointer", while the block is three lines including markers (TechSpec UT-07). | Users following the README look in the wrong directory and misjudge the context footprint. | Cause proven. Correct both lines (planned vehicle: PRD 1.1 FR-13). |

### Optional observations

| ID | State | Evidence and possible improvement |
| --- | --- | --- |
| OI-01 | persistent from `codereview_06/OI-01` | The legacy-warning code did not change in the delta, and PRD 1.1 (2026-09-14) still reports the duplicate warning. Planned vehicle: PRD 1.1 FR-10. |
| OI-03 | persistent from `codereview_06/OI-03` | `tasks.md:33` still summarizes T12–T24 in prose; all files were locatable. |
| OI-04 | new | `installation-builder.ts:48` falls back to `packageVersion: '1.0.0'`, and no CLI caller passes `packageVersion`. It is correct only while `package.json` is `1.0.0`, and wrong after the first release bump. Planned vehicle: PRD 1.1 FR-07. |
| OI-05 | new | `e490569` removed the outer `try/catch` from `runProcessHook` (`process-hook.ts:37-41`). No throwing path was found. On Copilot a non-zero exit denies the call, and Cursor `failClosed` blocks on crash, so a future uncaught error would block every tool call. A final guard would keep `harness-adapters.md` "never ends with an uncaught exception" robust. |
| OI-06 | new | `tsconfig.check.json` includes `src`, `tests`, and `scripts`, but not `assets/runtime/`, so the hook sources added in `e490569` are bundled without type checking; lint does cover them. Planned vehicle: PRD 1.1 NFR-01. |
| OI-07 | new | The T23 membership regression detects process-heavy files only through textual markers (`tests/test-lanes.ts:17-26`). A test that starts processes indirectly, such as esbuild through `scripts/asset-bundler.js` in `tests/unit/asset-bundler.test.ts`, stays in the parallel lane. No contention appeared in 5 local runs or 9 CI jobs. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_06/CR-01` | resolved | T23 lanes: `vitest.config.ts:17-36`, `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`. 5 consecutive default runs 255/255 with no timeout or unhandled error; lanes disjoint (47/18). CI run 34904046341: 9/9 jobs green. Global `testTimeout` still 30,000 ms. |
| `codereview_06/CR-02` | resolved | T24: `codereview_04/done/task_16.md:5-7` states closure with six executed and three waived cells; superseded nine-cell and pending statements are labeled (lines 7, 35–37, 52–54, 67–69, 79–82, 88, 95, 102); Handoff open items reference `DEC-01` and T23 (lines 128–131). The later CI verification that supersedes `DEC-01` is recorded in `tasks.md:33`, PRD CA-20, and TechSpec `DEC-01`. |
| `codereview_06/OI-01` | persistent | carried as OI-01 |
| `codereview_06/OI-02` | resolved by decision | PRD 1.1 FR-05 and out-of-scope list: product decision of 2026-09-14 keeps the overhead target status informative, without a finding or exit-code effect |
| `codereview_06/OI-03` | persistent | carried as OI-03 |

## Limitations and open items

- **Scope boundary:** no `--base` was supplied. The delta boundary `3347b73` comes from the `codereview_06` validated state and the T23/T24 handoffs; it is not a user-selected base. Feature obligations were checked on the full HEAD tree.
- **Quality baseline:** the TechSpec Terrain baseline covers only RF24 target files at `99643a5`. For the delta files, pre-existing hits were established by rerunning the profile commands on their `3347b73` content.
- **Vendor docs:** docs were rechecked through a page fetch that summarizes content, and no harness binary was run. Claude exec form, Copilot `exec`/`cwd`, and Cursor/Antigravity responses are verified against documentation only. Pi, Oh-My-Pi, and OpenCode docs were not rechecked because their adapters did not change in the delta.
- **Cursor `allow`:** the docs make `permission` mandatory in `preToolUse` without a neutral value and do not say whether `allow` skips the user's approval prompt. Whether `cursor-hook.mjs` bypasses approvals is not verifiable and needs vendor confirmation. If it does, it has the same impact as CR-02.
- **Codex runtime:** whether Codex loads project hooks outside a git repository, and which shell runs `command` on Windows, is undocumented. CR-07 rests on the TechSpec contract and the observed command exit, not on a Codex run.
- **Local platform:** local runs used Node 24 on Windows only. Linux, macOS, and Node 20/22 evidence comes from CI run 34904046341. Per-job test counts were not extracted from the CI log; job conclusions and `e2e-10.test.ts` result lines were used.
- **Install and TTY:** `npm install --ignore-scripts` was not rerun locally; CI `npm ci --ignore-scripts` on HEAD passed. Interactive TTY confirmation was not exercised manually.
- **Protocol content:** RF10 was checked for file creation only; alignment of the generated protocol with the 2026-09-14 decisions (PRD 1.1 FR-11) was not assessed.
- **PRD 1.1 coverage:** CR-03, CR-04, CR-05, CR-08, OI-01, OI-04, and OI-06 already have a vehicle in PRD 1.1. CR-01, CR-02, CR-06, and CR-07 are not mentioned there and need correction planning.

## Conclusion

T23 and T24 resolve both `codereview_06` findings. The default test gate is now repeatable, with five consecutive green local runs and a green 3×3 CI matrix on HEAD, and the T16 ledger is consistent. The post-review fixes in `1d4bbb5` and `fd7fc74` are correct and covered by tests. `e490569` and `99643a5` align Claude Code, Codex CLI, and Copilot responses and paths with the current vendor documentation.

Approval is withheld for four High findings:
- **CR-01:** the built CLI deletes user hooks in Codex CLI and Cursor configurations on both `init` and `remove`, contradicting RF6, CA-05, CA-12, and the non-intrusion constraint.
- **CR-02:** the Antigravity hook auto-approves every tool call.
- **CR-03:** support levels and capability claims contradict the amended CA-15 and the capability matrix.
- **CR-04:** RF24 and CA-21 are unimplemented, while the README already describes them.

CR-05 to CR-08 are further non-conformances of lower severity. A successor review is required after correction; no correction was made in this review.
