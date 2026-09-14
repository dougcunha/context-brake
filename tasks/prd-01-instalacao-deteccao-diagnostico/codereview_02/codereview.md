# Code review report — Installation, Detection, and Diagnostics

## Summary

- Status: REJECTED
- Git scope: `Not delimited — see limitations` (repository has zero commits; reviewed the full worktree plus the `done/` handoffs and `codereview_01` corrections)
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_01/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read (tasks 1–6) |
| Handoffs | `done/task_1.md` … `done/task_6.md` | read |
| Correction handoffs | `codereview_01/done/task_07.md`, `task_08.md`, `task_09.md` | read (unlinked extras; see limitations) |
| Previous report | `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_01/codereview.md` | read |
| Implementation | Worktree `src/`, `tests/`, `schemas/`, `assets/`, `scripts/`, `.github/`, `README.md`, `AGENTS.md` | delimited by worktree only |

`git rev-list --count --all` = 0 and there is no `HEAD`, so no `--base` can be resolved to a commit. The reviewable set is the whole untracked worktree (26 top-level untracked entries), cross-checked against the six original handoffs and the three correction handoffs. The three correction tasks (`task_07`–`task_09`) are reachable only under `codereview_01/done/`; no manifest links them, but each carries a `Traceability` table back to `codereview_01/CR-01..CR-03`.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect the eight MVP harnesses | `src/infrastructure/harnesses/registry.ts` + per-harness detectors | IT-16 | conformant | 8 descriptors; `tests/integration/detection-cross-signals.test.ts` |
| RF2 | Report project vs machine origin and version | `detection-service.ts`, `detection-collector.ts` | UT-03, UT-15 | conformant | `HarnessDetection.evidence`/`versionSource` in install/doctor JSON |
| RF3 | Shared instruction files are not proof | `claude-code/detector.ts`, shared-evidence filter | UT-01 | conformant | `detection-service.ts`; IT-16 |
| RF4 | Explicit include/exclude precedence | `argument-validator.ts`, `detection-service.ts` | UT-02, IT-03 | conformant | conflicting pair → `INVALID_ARGUMENTS` |
| RF5 | Register in each vendor extension mechanism | per-harness `planner.ts` | IT-01, IT-02 | conformant | 5 file/JSON hooks + 3 in-process plugins |
| RF6 | Preserve existing user integrations/config bytes | per-harness planners + `json-document-editor.ts` | IT-01, UT-04, UT-19 | conformant | minified fix proven by `tests/integration/minified-config.test.ts` (was non-conformant in `codereview_01`) |
| RF7 | Invalid vendor config isolated, peers continue | planners return `INVALID_HARNESS_CONFIG`; `installation-service.ts:83` | UT-05, IT-04, E2E-05 | conformant | `tests/integration/multi-harness-install.test.ts` |
| RF8 | Support level per harness | `support-service.ts` + capability tables | UT-18 | conformant | `deriveSupportProfile` |
| RF9 | Warn on version below minimum | `support-service.ts` | UT-15 | conformant | limitation text carries detected/minimum/capability |
| RF10 | Create the protocol file | `protocol-service.ts` | protocol unit, E2E-01 | conformant | `docs/context-brake-protocol.md` matches `renderProtocol` |
| RF11 | Add ≤10-line reference block between own markers | `instruction-markers.ts`, `instruction-service.ts` | UT-07, IT-06 | conformant | 3-line block; CA-08 |
| RF12 | Do not create instruction files unless authorized | `instruction-service.ts:93` | UT-08, IT-06 | conformant | `--create-instructions` only |
| RF13 | Symlink target edited once, link preserved | `instruction-service.ts:87` dedup by `fileIdentity` | UT-06, IT-05, E2E-10 | conformant | `realPath`-targeted write; link survives |
| RF14 | Legacy `CONTEXTOPS` migration offered with preview | `legacy-preview.ts:7,21`, `installation-service.ts:89`, `init.ts:72` | UT (legacy-preview), E2E legacy | conformant | `LEGACY_BLOCK_DETECTED` in text and JSON; file unchanged (was non-conformant in `codereview_01`) |
| RF15 | Create config with defaults | `configuration.ts`, `installation-builder.ts` | configuration tests | conformant | `DEFAULT_CONFIG` matches TechSpec |
| RF16 | Validate config with field/value/rule | `configuration-validator.ts` | UT-12, IT-10 | conformant | cross-field path/`received`/rule |
| RF17 | Publish config schema | `schemas/*.schema.json`, `scripts/generate-schemas.ts` | `schemas:check`, `package:smoke` | conformant | 3 Draft 2020-12 schemas current and packed |
| RF18 | Dry-run preview, no side effects | `commands/init.ts:68`, `commands/remove.ts` | UT-10, IT-08, E2E-06 | conformant | no write port called |
| RF19 | Conservative removal; state only on consent | `removal-service.ts`, `removal-helper.ts` | UT-11, IT-09, E2E-07 | conformant | modified assets → conflict; `--remove-state` only |
| RF20 | Doctor lists state/version/support/missing capabilities | `doctor-service.ts`, adapters, `output/text.ts` | IT-11, E2E-08 | conformant | `HarnessDiagnostic` |
| RF21 | Doctor validates config/markers/protocol/state | `doctor-checks.ts` | doctor-checks unit, IT-10 | conformant | read-only, never repairs |
| RF22 | Measure overhead p95 vs PRD-02 target | `overhead-measurer.ts`, `p95.ts` | UT-17, IT-14, E2E-08 | conformant | process 100 ms / in-process 15 ms |
| RF23 | Text + JSON parity, distinct exit codes | `report-service.ts`, `output/*`, `exit-codes.ts` | UT-16, UT-20, E2E-08 | conformant | 0/1/2, 64, 130 |
| CA-01 | `init --yes` on Claude registers + config + summary | `commands/init.ts` | E2E-01, E2E-10 | conformant | executed; exit 0 |
| CA-02 | Codex + Cursor configured together | `installation-service.ts:74` | E2E-02, IT-02 | conformant | executed |
| CA-03 | AGENTS.md-only repo → no integration, warning | `installation-service.ts:68` | E2E-03, UT-01 | conformant | executed; exit 1 with remediation |
| CA-04 | Exclude Copilot, install Cursor | `argument-validator.ts`, detection | UT-02, IT-03 | conformant | dedicated files untouched |
| CA-05 | Three runs preserve users, one integration | planners + `change-plan-service.ts:44` | E2E-04, UT-04, IT-01 | conformant | standard fixtures byte-idempotent; symlinked harness path fails — see CR-01 |
| CA-06 | Invalid harness file untouched, error, peers continue | planners, `change-applier.ts` | E2E-05, IT-04, UT-05 | conformant | executed |
| CA-07 | Symlinked `AGENTS.md` → one block, link kept | `instruction-service.ts:18` | E2E-10, IT-05, UT-06 | conformant | PowerShell + Git Bash executed |
| CA-08 | Reference block ≤10 lines, points to protocol | `instruction-markers.ts` | UT-07, IT-06 | conformant | 3 lines |
| CA-09 | No instruction file created without option | `instruction-service.ts:93` | UT-08, IT-06 | conformant | executed |
| CA-10 | Legacy preview without confirmation | `legacy-preview.ts`, `init.ts:45-50,72` | UT (legacy-preview), E2E legacy | conformant | built CLI prints `LEGACY_BLOCK_DETECTED` + `--migrate-legacy`; file byte-identical (was non-conformant in `codereview_01`) |
| CA-11 | Dry-run changes nothing and lists changes | `commands/init.ts:68` | E2E-06, IT-08, UT-10 | conformant | executed |
| CA-12 | Remove owned content, keep rest and state | `removal-service.ts` | E2E-07, IT-09, UT-11 | conformant | executed |
| CA-13 | Invalid zone cross-field → error with field/value/rule | `configuration-validator.ts` | UT-12, IT-10 | conformant | executed |
| CA-14 | Manually removed integration → `missing`, error | `doctor-service.ts` | E2E-08, IT-11, UT-13 | conformant | executed |
| CA-15 | Copilot partial + timeout reason | `github-copilot-cli/adapter.ts` | IT-12, UT-14, E2E-08 | conformant | limitation emitted |
| CA-16 | Old version shows detected/minimum/capability | `support-service.ts` | IT-13, UT-15 | conformant | injected fixtures (TechSpec permits); `VERSION_FLOOR_UNVERIFIED` not emitted — see limitations |
| CA-17 | `doctor --json` valid per published schema, same findings | `report-service.ts`, `output/json.ts` | E2E-08, UT-16 | conformant | executed |
| CA-18 | Doctor shows measured p95 and goal | `overhead-measurer.ts` | E2E-08, IT-14, UT-17 | conformant | executed |
| CA-19 | README quick-start ≤2 min error-free | `README.md`, `tests/e2e/e2e-09.test.ts` | E2E-09 | conformant | executed; config example now schema-valid (`tests/unit/readme-config-example.test.ts`) |
| CA-20 | CA-01/05/07 on Linux, macOS, Windows shells | E2E-10 + `.github/workflows/ci.yml` | E2E-10 | not verifiable | Windows PowerShell + Git Bash executed; Linux/macOS not run locally (see limitations) |
| TechSpec `FileChange.realPath` | "Canonical target used for deduplication and writing" | planners set `realPath` via `resolve()` | — | **non-conformant** | CR-01: snapshot `realPath` is canonical (`node-file-system.ts:25`), planner `realPath` is not, so `matchSnapshot` never matches a symlinked/junctioned harness path |
| `file-changes.md` | Resolve symbolic links and junctions before writing | instruction path resolves; harness planners do not | — | **non-conformant** | CR-01: `.claude` junction fixture → `FILE_CHANGED_SINCE_PREVIEW`, exit 2, integration not registered |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | `npm run lint` exit 0; 100-line/30-line/3-param enforced in `eslint.config.js`; no `any`, no `var` (rg clean) |
| `javascript-typescript.md` | OK | strict ESM, literal unions, Zod at boundaries; `npm run typecheck` exit 0 |
| `node.md` | OK | `spawn`/argument arrays and timeouts in `node-process-runner.ts`/`overhead-measurer.ts`; async I/O |
| `tests.md` | NOT OK | coverage green, but no test covers a symlinked/junctioned harness config directory, hiding CR-01 |
| `harness-adapters.md` | OK | non-strict vendor schemas; `docs/research/harness-integrations.md` Copilot section reconciled |
| `file-changes.md` | NOT OK | planner `realPath` is not canonical for symlinked/junction paths (CR-01) |
| `cli-output.md` | OK | results/findings split, one JSON document, `[OK]/[WARN]/[ERROR]`, no TTY prompt without `--yes` |
| Hexagonal architecture (`AGENTS.md`) | OK | no `src/core` import of `infrastructure/` or `cli/` (rg clean) |
| `sdd-review-code` | OK | this report follows `references/TEMPLATE.md` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 (derived) | ≤100 lines/file, ≤30 lines/function, ≤3 params | blocking | `npm run lint` | 0 | OK |
| QA-02 (derived) | ≥80% lines/statements/functions/branches | blocking | `npm run coverage` | 0 | OK (91.03 / 91.03 / 96.09 / 81.21) |
| QA-03 (derived) | strict typecheck | blocking | `npm run typecheck` | 0 | OK |
| — | Formal TechSpec quality profile (QA-NN rules) and Terrain baseline | — | — | — | missing — see limitations |

- Terrain baseline: missing — the TechSpec defines no quality profile or baseline. The repository's declared constraints (lint limits, coverage thresholds, strict typecheck) were run as absolute gates, not a delta.
- Hits discounted by baseline: not applicable (no baseline).
- Reservations accumulated in the feature: 0 (no profile reservation rules exist; correction handoffs report none).
- Suggested escalation: no trigger fired (no profile reservations).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal ports/adapters, acyclic modules | YES | `src/core/contracts/*`, `cli/composition-root.ts`; no reverse imports |
| Durable self-contained runtime assets, no hook-time npx | YES | `assets/runtime/*`, `scripts/build-assets.ts`; `package:smoke` packs the assets |
| Machine-only signals stay candidates | YES | `detection-service.ts`; UT-03 |
| Surgical edit preserving trivia; refuse invalid | YES | multi-line + minified + JSONC comment fixtures (`UT-19`, `json-span-safety.test.ts`) |
| Per-file atomicity + optimistic concurrency | YES | `atomic-writer.ts`, `change-applier.ts`; IT-15 |
| `FileChange.realPath` is the canonical target | NO | CR-01: harness planners use `resolve()`, so snapshot/plan identities diverge under symlinks/junctions |
| Legacy migration has its own consent | YES | `legacy-preview.ts` previews; `--migrate-legacy` gates the write; file byte-identical otherwise |
| Removal conservative, state explicit | YES | `removal-helper.ts`; IT-09 |
| Existing config authoritative; unmanaged protocol is a conflict | YES | `protocol-service.ts`; `commands/init.ts` |
| Stable health exits 0/1/2, 64, 130 | YES | `exit-codes.ts`, `report-service.ts` |
| Honest version compatibility (nullable floor) | PARTIAL | floors are `null`; the named `VERSION_FLOOR_UNVERIFIED` code is not emitted (limitation text only) |
| Overhead targets 100 ms process / 15 ms in-process | YES | adapter `benchmarkFixture()` values |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_1.md` | COMPLETE | package/config/schemas/exit codes; commands recorded in `AGENTS.md` |
| T02 | `done/task_2.md` | COMPLETE | detection, selection, version/support policy |
| T03 | `done/task_3.md` | COMPLETE | change engine; contains origin of `codereview_01/CR-01` |
| T04 | `done/task_4.md` | COMPLETE | eight adapters; research reconciled |
| T05 | `done/task_5.md` | COMPLETE | init/remove/doctor; contained origin of `codereview_01/CR-02` |
| T06 | `done/task_6.md` | COMPLETE | packaging/CI/README; contained origin of `codereview_01/CR-03` |
| T07 (correction) | `codereview_01/done/task_07.md` | COMPLETE | fixed minified JSON editor + exception isolation; unlinked from `tasks.md` |
| T08 (correction) | `codereview_01/done/task_08.md` | COMPLETE | surfaced `LEGACY_BLOCK_DETECTED` preview; unlinked from `tasks.md` |
| T09 (correction) | `codereview_01/done/task_09.md` | COMPLETE | corrected README example/wording + guard test; unlinked from `tasks.md` |

All six manifest tasks are linked and marked `[x]` in `tasks.md`. The three correction handoffs exist, are marked complete, and carry traceability to the previous findings but are not referenced by `tasks.md`.

## Executed validations

- Profile and scope: full worktree; Windows 11 (win32), Node v24.19.0, npm 11.17.0, PowerShell 7. Linux/macOS were not executed locally.
- Validated state: `dist/` rebuilt from the current worktree (`npm run build`), configuration and platform fixed to the above.
- Reused evidence: the correction handoffs' command results were not reused; every gate below was re-run on the current tree.
- Manual acceptance: no interactive TTY session was performed; non-TTY `--yes` paths and a junction fixture were exercised. No essential manual item remains beyond platform coverage.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | RF10, RF17, runtime assets |
| `npm run typecheck` | passed | QA-03 |
| `npm run lint` | passed | QA-01, code standards |
| `npm run coverage` (56 files, 190 tests) | passed | UT-01…UT-20, IT-01…IT-16, E2E-01…E2E-10, QA-02 |
| `npm run schemas:check` | passed | RF17 |
| `npm run dependencies:check` | passed (3 runtime deps, no install scripts) | `node.md` |
| `npm run assets:check` | passed | RF5 durability |
| `npm run package:smoke` | passed (185 packaged files) | RF17, CA-19 |
| repro: `setJsonProperty('{"hooks":{"UserHook":"node custom.js"}}', …)` | passed (parseable, user key preserved, re-apply byte-identical) | `codereview_01/CR-01`, RF6 |
| repro: built CLI legacy fixture (`init --yes` / `--dry-run --json`) | passed (`LEGACY_BLOCK_DETECTED`, `--migrate-legacy`, file byte-identical, exit 1) | `codereview_01/CR-02`, RF14, CA-10 |
| repro: `readme-config-example.test.ts` | passed (example parses) | `codereview_01/CR-03`, RF17, CA-19 |
| repro: junction fixture `.claude` → `.agents`, `init --yes --json` | **failed** (`FILE_CHANGED_SINCE_PREVIEW`, exit 2, integration not registered) | RF6, `file-changes.md`, TechSpec `realPath` — see CR-01 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | TechSpec `FileChange.realPath`; `file-changes.md` (symlink resolution); CA-05/RF6 | Harness planners build `realPath` with `resolve(projectRoot, …)` (`claude-code/planner.ts:41,65`, `cursor/planner.ts:33,57`, `codex-cli/planner.ts:36,60`, `antigravity-cli/planner.ts:37,61`, `github-copilot-cli/planner.ts:42`, `pi/planner.ts:16`, `oh-my-pi/planner.ts:16`, `opencode/planner.ts:16`), while snapshots expose the canonical target (`node-file-system.ts:25` `realPath = canonical`). `matchSnapshot` compares `realPath` verbatim (`change-plan-service.ts:21-24`), so a symlinked/junctioned harness config never matches and `beforeSha256` becomes `null`; the applier then rejects the existing file at `change-applier.ts:12-14`. Reproduced on a fresh fixture where `.claude` is a junction to `.agents`: `init --yes` applied config/manifest/protocol/hook but `.claude/settings.json` returned `FILE_CHANGED_SINCE_PREVIEW: file was created after plan was computed`, status `errors`, exit 2, and the Claude integration was not registered. The same repository (`.claude` junction) triggers it live. | Any repository that shares harness config through a symlink/junction (including this one) cannot complete `init` or reach idempotent no-op; the user sees a misleading concurrency error and no integration. The misleading detail is caused by `beforeSha256 === null` arising from the unmatched snapshot, not a real concurrent edit. | Make the planned `RealPath` and the snapshot `realPath` share one canonical form before matching: resolve symlinks/junctions when building each change's `realPath` in the planners (or match snapshots by `fileIdentity` instead of path). Add a regression fixture where a harness config directory/file is a symlink or junction and assert `init --yes` registers the entry, preserves the link, and a second run is byte-idempotent. |

## Optional improvements

| ID | Severity | Source | Evidence | Impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| OI-01 | Low | `cli-output.md`, TC text/JSON parity | The legacy finding is rendered twice on a human `init --yes` run: once on stderr before confirmation (`init.ts:45-50,72`) and again on stdout inside the report (`output/text.ts:24`). Verified on a legacy fixture. | Cosmetic duplicate notice; no requirement breach. | Emit the pre-confirmation preview to stderr only, or skip it when the same finding is already part of the report output. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | resolved | `insertIntoContainer` inserts before `container.offset + container.length - 1` with an empty indent for minified docs (`json-span-utils.ts:28-45`); planners wrap edits so editor errors become `INVALID_HARNESS_CONFIG` (`claude-code/planner.ts:57-62`). `tests/integration/minified-config.test.ts` + `tests/e2e/e2e-minified-config.test.ts` pass; independent repro parses and re-applies byte-identically. |
| `codereview_01/CR-02` | resolved | `detectLegacyFindings`/`legacyFinding` (`legacy-preview.ts:7,21`) wired at `installation-service.ts:89` and the no-harness path (`:68`); `init.ts:72` writes the preview before confirmation. `tests/e2e/e2e-legacy-preview.test.ts` passes with `LEGACY_BLOCK_DETECTED`, `--migrate-legacy`, and a byte-identical file. |
| `codereview_01/CR-03` | resolved | `README.md:90` requires `--migrate-legacy` and mentions the preview; `README.md:120-121` use `task_plan.json`/`state_checkpoint.json`; `tests/unit/readme-config-example.test.ts` parses the example with `configurationSchema` and passes. |

## Limitations and open items

- No git base: the repository has zero commits, so the reviewable set is the whole worktree and cannot be attributed to a commit range. A future re-review should fix a base once the work is committed.
- No formal TechSpec quality profile (QA-NN rules) and no Terrain baseline exist; the repository's declared constraints (lint limits, coverage thresholds, strict typecheck) were run as absolute gates. A profile and baseline must be added to the TechSpec to distinguish introduced debt from pre-existing debt.
- CA-20 is not verifiable for Linux and macOS in this environment; only Windows PowerShell and Git Bash were executed. `.github/workflows/ci.yml` configures the matrix, but no green CI artifact is available (no remote/commit history). CA-07 relied on Windows symlink privileges, which were available here.
- The three correction tasks `codereview_01/done/task_07.md`–`task_09.md` are not linked from `tasks.md`; finding-to-task traceability exists inside each file, but task-to-manifest traceability does not.
- Real minimum-version handling cannot be observed end-to-end because every adapter reports `minimumVersion: null`; CA-16 is covered only by injected fixtures, which the TechSpec explicitly permits. The diagnostic code `VERSION_FLOOR_UNVERIFIED` named in the TechSpec is not emitted.
- No interactive TTY confirmation session was performed; only `--yes`/non-TTY paths were exercised.

## Conclusion

The three previous findings are corrected and the automated suite is green: 190 tests pass across 56 files with coverage above every threshold, and the minified-JSON, legacy-preview, and README corrections all verify end to end. However, this review found a new non-conformant contract: harness planners set `FileChange.realPath` to a non-canonical `resolve()` result while snapshots expose the canonical target, so any harness config reached through a symlink or junction is never matched by `matchSnapshot` and fails with a false `FILE_CHANGED_SINCE_PREVIEW` (`CR-01`, High). This is reproducible on a controlled junction fixture and on this repository's own `.claude` junction, violates the TechSpec `realPath` contract and `file-changes.md` symlink resolution, and blocks installation for a supported repository layout. Because a TechSpec/rule obligation is non-conformant, the review is **REJECTED** pending correction of `CR-01`, with `OI-01` (duplicate legacy preview) optional and the platform/version-floor/profile items recorded as limitations.
