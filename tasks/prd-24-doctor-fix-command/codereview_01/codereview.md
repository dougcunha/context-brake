# Code review report — prd-24-doctor-fix-command (`context-brake fix`)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `419c0bd328b2cd209ed98846e6b50b73ef4664fd..worktree` (uncommitted and untracked files on 2026-10-21). The worktree also holds the uncommitted prd-22 and prd-23 diffs (`workflow.md#context`). This review attributes changes to prd-24 through the 6 handoffs and the TechSpec file list.
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-24-doctor-fix-command/prd.md` | read; sha256 `82f97a24…3019` equals the A-01 approval |
| TechSpec | `tasks/prd-24-doctor-fix-command/techspec.md` | read; sha256 `a4326cc4…3c60` equals the A-02 approval |
| Manifest | `tasks/prd-24-doctor-fix-command/tasks.md` | read; sha256 `bf6a362a…5e2e` differs from the A-02 approval `cfff25cf…91d0`. The `State` checkboxes and the `Problems and solutions` section are mutable state; no other change was found in the read |
| Tasks and handoffs | `done/task_01.md` to `done/task_06.md` | read; 6 of 6 in `done/`, manifest State `[x]`, handoff filled |
| Workflow, checkpoint, decisions | `workflow.md`, `checkpoint.json`, `autonomous-decisions.md` | read; mode `auto`, H-01, A-01 to A-03 |
| Snapshot | `context-snapshot.md` | not present |
| Implementation | git diff from `419c0bd`, untracked prd-24 files, handoffs | delimited (shared worktree with prd-22 and prd-23, see limitations) |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `fix.group` on each warning or error finding; none on `ok` | `src/core/services/fix-groups.ts:assignFixGroups`, `CORE_FIX_GROUPS`; `claude-code/fix-groups.ts`; `common/restart-fix-groups.ts`; `src/cli/doctor-diagnosis.ts:54` | `tests/unit/fix-groups.test.ts` (TC-01, TC-02); `tests/integration/doctor-fix-groups.test.ts` (TC-05) | conformant | Every code of the PRD table is in a map; unknown code gives `manual`; `INVALID_CONTEXTBRAKE_CONFIG` uses `UNRECOGNIZED_KEYS_REMEDIATION` (`fix-groups.ts:21`) |
| FR-02 | `Fix: run context-brake fix` and `, N fixable` | `src/cli/output/doctor-rows.ts:33-41`; `doctor-text.ts:24-33` | `tests/unit/doctor-text.test.ts:96-112` (TC-03) | conformant | Header `WARN (0 errors, 2 warnings, 1 fixable)` asserted; manual remediation kept |
| FR-03 | Plan reruns `init`, keeps configuration choices | `src/cli/init-plan.ts:planInit` with `KEEP_UPDATES`; `src/cli/fix-steps.ts:planFor` | `fix-command.test.ts:33` (TC-10); init suites (TC-24) | conformant | `autoRestart` kept and mod files reinstalled. See CR-01 for a side effect of the status line `keep` request |
| FR-04 | Plan shown before confirmation on a TTY | `src/cli/commands/fix-interactive.ts:15-28` | `fix-interactive.test.ts:22` (TC-11) | conformant | `Plan` before `Nothing was written.`; hashes unchanged; exit 1 = first diagnosis |
| FR-05 | One question per decision | `src/cli/fix-prompts.ts` | `fix-interactive.test.ts:43,51,61` (TC-12) | non-conformant | Answers work as asked. The `s` (skip) answer rewrites the manifest and `.gitignore` (CR-01) |
| FR-06 | `--yes` skips decisions; `--yes --force` takes the first option; `--harness` | `src/cli/fix-decisions.ts:flagChoice`, `toDecisions` | `fix-command.test.ts:54,63` (TC-13) | non-conformant | Modified file kept with `--yes` and replaced with `--yes --force`; claude-code installed with `--harness`. A skipped `STATUSLINE_BRIDGE_INACTIVE` under `--yes` changes 2 files (CR-01). `--yes --force` bridge reinstall has no automated case |
| FR-07 | No TTY, no `--yes`: `CONFIRMATION_REQUIRED`, no change | `src/cli/commands/fix.ts:39` | `fix-stops.test.ts:20` (TC-14) | conformant | Exit 2, hashes unchanged |
| FR-08 | `--dry-run` changes nothing | `fix.ts:38` | `fix-stops.test.ts:29` (TC-15); `tests/e2e/e2e-fix.test.ts` | conformant | Hashes equal; outcomes `planned` and `skipped` |
| FR-09 | Outcome per finding | `src/core/services/fix-outcomes.ts:resultOf`, `appliedResult` | `fix-outcomes.test.ts` (TC-08); `fix-command.test.ts:42` (TC-16) | conformant | `fixed`, `skipped`, `manual`, `failed`, `planned` per DEC-07 |
| FR-10 | Restart note | `fix-outcomes.ts:47`; `src/cli/output/harness-labels.ts:restartNote` | `fix-text.test.ts:17` (TC-17); `fix-command.test.ts:33` | conformant | `Restart Claude Code to load the new mod.` asserted |
| FR-11 | No installation: change nothing, name `init` | `fix-steps.ts:stopOf`; `doctor-diagnosis.ts:53`; `fix-text.ts:52` | `fix-stops.test.ts:43` (TC-18) | conformant | `stopped: not_installed`; message names `context-brake init` |
| FR-12 | Nothing to fix: change nothing, list manual findings | `fix-steps.ts:stopOf`; `fix-text.ts:26` | `fix-stops.test.ts:50` (TC-19); `fix-command.test.ts:21` second run | conformant | `stopped: nothing_to_fix`; the `Result` card lists `MANUAL` rows |
| FR-13 | Exit codes 0, 1, 2, 64; cancel = first diagnosis | `fix-outcomes.ts:exitCodeOf`; `fix-arguments.ts`; `fix-interactive.ts:23` | `fix-command.test.ts:21,42`; `fix-stops.test.ts:68,76`; `fix-interactive.test.ts:22` | conformant | 0, 1, 2, 64 and cancel asserted |
| FR-14 | `fix --json` and `schemas/fix-report.schema.json` | `src/core/contracts/fix-report.ts`; `schemas/fix-report.schema.json`; `fix-arguments.ts:19` | `e2e-fix.test.ts` (TC-21); `schemas.test.ts` (TC-22) | conformant | `npm run schemas:check` exit 0; e2e validates with `fixReportSchema` |
| FR-15 | Doctor schema optional `fix`; `schemaVersion` 1 | `src/core/contracts/diagnostics.ts:10`; `schemas/doctor-report.schema.json`, `install-report.schema.json` | `schemas.test.ts:24-35` (TC-04) | conformant | Document without `fix` validates; unknown group rejected |
| FR-16 | README and help | `README.md` command table and "Fixing problems"; `src/cli/main.ts` help lines | TC-23 (review of the diff) | conformant | Row lists `--dry-run`, `--yes` (`-y`), `--force`, `--harness <id>`, `--json`; help lists `fix` |
| NFR-01 | Writes only through the `init` plan; `.gitignore` marked block lists owned files in full | `fix-steps.ts:applyPlan` (`NodeChangeApplier`) | TC-24 suites; probes | non-conformant | Writes go through the plan. After a skipped bridge decision, the block no longer lists `/.claude/hooks/context-brake-statusline.mjs`, which is still on disk and still deleted by `remove` (CR-01) |
| NFR-02 | No change to a user-modified file without an answer or `--force` | `asset-currency.ts:isModifiedAsset`; `fix-decisions.ts` | `asset-currency.test.ts` (TC-06); TC-12; TC-13 | conformant | Modified asset written only with `y` or `--yes --force` |
| NFR-03 | Output rules | `fix-rows.ts:OUTCOME_WORDS`; `fix.ts:isInteractive` | `fix-text.test.ts`; `fix-interactive.test.ts:33` | conformant | Text labels for every outcome; no prompt with `--yes` |
| NFR-04 | Linux, macOS, Windows | existing planner and applier | Windows local only | not verifiable | Linux and macOS through CI per TechSpec; not run here |
| NFR-05 | Exit codes from `EXIT_CODES`; doctor codes unchanged | `fix-steps.ts:36` (`EXIT_CODES.error`) | TC-08 | conformant | `core` gets the error code as input |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core never imports infrastructure or cli) | OK | QA-04: 0 hits over `src/core/` files |
| `code-standards.md`, `javascript-typescript.md` | OK | `npm run lint` exit 0; `npm run typecheck` exit 0; QA-01 to QA-03: 0 hits |
| `tests.md` (coverage, e2e smoke, time budget) | NOT OK | Coverage 96.31 % statements, exit 0. `npm run coverage` wall time 188 s (vitest `Duration 185.70s`) is above the 180 s limit at `tests.md:51`; `npm run test:budget` 174.9 s passes. Open item, see limitations |
| `file-changes.md` (marked `.gitignore` block lists owned files in full) | NOT OK | CR-01 |
| `cli-output.md` | OK | stdout results; labels `FIXED`, `SKIPPED`, `MANUAL`, `FAILED`, `PLANNED`; no prompt without a TTY (`fix.ts:22-25`) |
| `harness-adapters.md` (harness codes classified in the adapter) | OK | `ClaudeAdapter.fixGroups`, `PiAdapter.fixGroups`, `OhMyPiAdapter.fixGroups` |

## Quality profile

Scope: the 17 new prd-24 source files, the prd-24-touched files of the TechSpec list, and the prd-24 tests (53 TypeScript files).

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' files` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 new of 0 | OK |
| QA-03 | Empty `catch` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|...' files` | 0 new of 0 | OK |
| QA-04 | `core` imports `infrastructure` or `cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 new of 0 | OK |
| QA-05 | `throw new Error(` | reservation | `rg -n 'throw new Error\(' files` | 0 new of 9 | pre-existing: `scripts/check-package.ts:41-44,50,59,63,75` and `scripts/check-schemas.ts:17` are the baseline lines shifted by the inserted list lines |
| QA-06 | 4+ parameters | reservation | `rg -n '\((?:[^(),]+,){3,}...' files` | 0 new of 1 | pre-existing: `tests/unit/asset-currency.test.ts:12`, an unchanged `it.each` callback with 1 destructured parameter |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' files \| awk -F: '$2 > 100'` | 1 new of 1 | NOT OK (reservation): `tests/unit/doctor-text.test.ts` 112 lines; the prd-24 TC-03 block (lines 96-112) took it over 100 |

- Terrain baseline: applied from TechSpec.
- Hits discounted by baseline: 10 (QA-05: 9; QA-06: 1).
- Reservations accumulated in the feature: 1.
- Suggested escalation: no trigger fired (1 of 8 reservations; no touched source file above 200 lines; no block in 3+ places found).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | One assignment point after the diagnosis (`doctor-diagnosis.ts:54`); producers unchanged |
| DEC-02 | YES | Core, Claude Code, Pi, and Oh-My-Pi maps equal the table (`fix-groups.ts:6-14`, `claude-code/fix-groups.ts`, `common/restart-fix-groups.ts`) |
| DEC-03 | YES | `planInit` in `src/cli/init-plan.ts`; `executeInit` uses it (`init-flow.ts`); no config update in `fix` |
| DEC-04 | YES | `protectModifiedAssets(changes, { manifest, snapshots, overwritePaths })` (`asset-currency.ts:61-82`) |
| DEC-05 | PARTIAL | `'keep'` returns `EMPTY_PLAN` (`statusline-planner.ts:24`), so the status line value stays. The plan also drops the bridge asset from the manifest and the `.gitignore` block, against the DEC-05 reason "Skip must change nothing" (CR-01) |
| DEC-06 | YES | `fix-outcomes.ts:keepsStatusline`, `KEPT_STATUSLINE_REASON` |
| DEC-07 | YES | `fix-outcomes.ts:44-57`; match by `findingKey` (code, harness, path) |
| DEC-08 | YES | `fix-outcomes.ts:exitCodeOf` |
| DEC-09 | YES | `fix-arguments.ts:16-22`; `fix.ts:isInteractive` |
| DEC-10 | YES | Order in `fix.ts:27-41`: diagnosis, not installed, nothing to fix, unreadable config, decisions, plan, dry run, confirmation, apply, second diagnosis |
| DEC-11 | YES | `doctor-rows.ts:40`, `doctor-text.ts:24-33`; JSON `remediation` unchanged |
| DEC-12 | YES | Summary line, `Plan`, `Conflicts`, `Manual` (TTY), `Result`, dry-run note, doctor header (`fix-text.ts`) |
| DEC-13 | YES | `fix-prompts.ts`; text fallback strings equal the TechSpec; `null` is skip; unknown id gives `Unknown harness '<id>'.` |
| DEC-14 | YES | `fix.ts`, `fix-report.ts` in `src/core/contracts/`; `diagnostics.ts` adds no export; 5 schema lists updated |
| DEC-15 | YES | Help lines in `main.ts`; README row and "Fixing problems" bullet |
| DEC-16 | YES | `src/cli/output/harness-labels.ts` |
| Fix report contract | YES | `fixReportSchema` fields equal `techspec.md#fix-report` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Fix groups, doctor text, schema field; extra file `common/restart-fix-groups.ts` declared in the handoff |
| T02 | `done/task_02.md` | COMPLETE | `planInit`, `overwritePaths`, `'keep'`; the handoff open item on the mod source matches DEC-05. The manifest and `.gitignore` effect of `'keep'` was not tested (CR-01) |
| T03 | `done/task_03.md` | COMPLETE | Report contract, outcome service, `parseFix` |
| T04 | `done/task_04.md` | COMPLETE | Command without prompts; extra files `fix-rows.ts`, `harness-labels.ts`, `fix-stops.test.ts` declared |
| T05 | `done/task_05.md` | COMPLETE | TTY flow; extra files `fix-prompts.ts`, `fix-steps.ts`, `commands/fix-interactive.ts` declared; 2 open items (see limitations) |
| T06 | `done/task_06.md` | COMPLETE | Published schema, e2e smoke, README; `e2e-smoke-set.test.ts` updated and declared |

## Executed validations

- Profile and scope: CLI command surface (`src/cli/`, `src/core/`) and the Claude Code status line planner. In-process integration tests, 1 e2e smoke on the built CLI, and 4 built-CLI probes in temporary folders outside the worktree.
- Validated state: worktree at `419c0bd` plus uncommitted changes, Windows 11, Node 24.20.0, Git Bash, 2026-10-21. Claude Code 2.1.306 is on the PATH; probes 2 to 4 removed it from the PATH to get the bridge source.
- Reused evidence: none. Every command below ran in this review.
- Manual acceptance: not run. The TechSpec manual TTY script belongs to CLI QA (A-03).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0, 13 s) | rules |
| `npm run typecheck` | passed (exit 0, 14 s) | rules |
| `npm run build` | passed (exit 0, 13 s) | FR-14 e2e precondition |
| `npm run schemas:check` | passed (exit 0) | FR-14, FR-15, TC-22 |
| `npm run coverage` | passed (exit 0): 287 files, 1538 passed, 1 skipped; 96.31 % statements, 93.24 % branches, 97.36 % functions; wall 188 s | FR-01 to FR-16, TC-01 to TC-25 |
| `npm run test:budget` | passed (exit 0): 174.9 s of 180 s; `fix-interactive` 13.4 s, `fix-command` 11.4 s, `e2e-fix` 10.6 s in the 10 slowest | `tests.md` budget |
| Quality profile QA-01 to QA-07 | passed for blocking rules; 1 reservation | Quality profile |
| Probe 1: built CLI, Claude Code 2.1.306 (mod source), user `statusLine` in `settings.local.json`, `fix --yes --json` | `STATUSLINE_BRIDGE_ABSENT` `fixed`; user `statusLine` kept; mod keys restored | FR-03 |
| Probe 2: built CLI, bridge source, user `statusLine`, `fix --yes --json` | `STATUSLINE_BRIDGE_INACTIVE` `skipped`; plan `update .context-brake/manifest.json`, `update .gitignore`; manifest assets lose `.claude/hooks/context-brake-statusline.mjs`; `remove --yes` still deletes the bridge | CR-01 |
| Probe 3: built CLI, `init --yes --no-statusline-bridge`, then `doctor` and `fix --yes --json` | `doctor`: `WARN (0 errors, 1 warning, 1 fixable)`; `fix`: empty plan, `STATUSLINE_BRIDGE_ABSENT` `failed` `Still reported after the fix` | open item 1 |
| Probe 4: built CLI, bridge source, user `statusLine`, `fix --yes`, then `git status` | `.gitignore` block before: 5 paths with `/.claude/hooks/context-brake-statusline.mjs`; after: 4 paths without it; `git status` shows `?? .claude/hooks/context-brake-statusline.mjs` | CR-01 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | DEC-05 ("Skip must change nothing"), FR-05, FR-06, NFR-01, `file-changes.md` | `src/infrastructure/harnesses/claude-code/statusline-planner.ts:24` returns `EMPTY_PLAN` for `'keep'`, so no `runtime_asset` change exists for `.claude/hooks/context-brake-statusline.mjs`. `src/core/services/installation-adapters.ts:25-26` builds the manifest assets only from `runtime_asset` changes and `aPlan.assets`. When the user skips `STATUSLINE_BRIDGE_INACTIVE` (`fix --yes` without `--force`, or the answer `s` on a TTY, `fix-decisions.ts:46-50`), the plan updates `.context-brake/manifest.json` and `.gitignore`. The bridge asset leaves the manifest, and the marked block loses `/.claude/hooks/context-brake-statusline.mjs`, while the file stays on disk (probes 2 and 4). Tests miss it: `tests/integration/statusline-keep.test.ts` asserts only the planned `statusLine`, and `tests/integration/fix-interactive.test.ts:51-59` checks only `.claude/settings.local.json` and stdout for `s` | A skipped decision writes 2 files. The bridge script becomes an untracked file in `git status`, so a user can commit it. The manifest stops tracking the bridge, so `doctor` no longer reports its currency (`ASSET_OUTDATED` or `ASSET_MODIFIED`). On a TTY, the `Plan` card shows `update .context-brake/manifest.json` and `update .gitignore` with no finding code after the user answered skip. This happens in the default CI path (`fix --yes`) | For `'keep'`, carry the previous manifest's status line assets forward, for example through `aPlan.assets` in the Claude Code install plan or with the same pattern as `preservedAssets` in `installation-service.ts:79`. Then the manifest and the `.gitignore` block stay the same. Add assertions on the manifest and `.gitignore` hashes to the `s` case and to `statusline-keep.test.ts` |

## Previous findings (re-review only)

Not applicable (first review).

## Limitations and open items

- Open item 1 (PRD decision, from the T05 handoff and probe 3): after `--no-statusline-bridge`, or after the `forget` answer, `STATUSLINE_BRIDGE_ABSENT` stays in group `automatic` (FR-01 table). `doctor` then counts it as fixable and prints `Fix: run context-brake fix`, and `fix` reports it `FAILED` with an empty plan. This follows the approved PRD table and its assumption, so it is not a finding. The UX conflicts with OBJ-03. A change of the group needs a PRD decision.
- Open item 2 (repository owner): `npm run coverage` took 188 s of wall time (vitest `Duration 185.70s`), above the 180 s limit at `.agents/rules/tests.md:51`. `npm run test:budget` passed at 174.9 s. The TechSpec routes a result above budget to the repository owner, as in prd-23.
- Open item 3 (repository owner, from the TechSpec): the e2e list in `.agents/rules/tests.md` names init, doctor, and remove; `tests/e2e/e2e-fix.test.ts` follows the per-command pattern.
- Not verifiable: Linux and macOS (NFR-04) were not run here; the TechSpec assigns them to CI.
- Not verifiable: the `askUi` select path of the clack prompt port has no automated test (DEC-13; `ScriptedPrompts` has no `askUi`). The manual TTY acceptance script of the TechSpec belongs to CLI QA.
- Test gap (optional improvement): `--yes --force` with `STATUSLINE_BRIDGE_INACTIVE` (bridge reinstall, `fix-decisions.ts:38`) has no automated case. The TTY answer `r` covers the same planner request.
- Scope limitation: the worktree holds the uncommitted prd-22 and prd-23 diffs on the same files (for example `doctor-rows.ts`, `doctor-text.ts`, `claude-code/adapter.ts`). This review attributes the prd-24 part through the handoffs and the TechSpec file list.
- State note: every `- [ ]` work item in `done/task_01.md` to `done/task_06.md` stays unchecked. The `done/` location, the manifest State `[x]`, and the filled handoffs prove completion.
- Manifest note: `tasks.md` sha256 differs from the A-02 approval because of the State and `Problems and solutions` updates.

## Conclusion

The implementation covers FR-01 to FR-16 and the TechSpec decisions. Lint, typecheck, build, schemas check, coverage, test budget, and the e2e smoke pass, and no blocking quality profile hit exists. CR-01 is a non-conformant obligation: a skipped status line bridge decision rewrites the manifest and the `.gitignore` marked block, and the bridge script leaves ContextBrake ownership tracking. This conflicts with DEC-05, FR-06, and NFR-01. Status: REJECTED. Next step: `sdd-plan-corrections` for CR-01. Open item 1 needs a PRD decision by the HIL.
