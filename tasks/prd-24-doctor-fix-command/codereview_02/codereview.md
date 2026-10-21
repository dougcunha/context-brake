# Code review report — prd-24-doctor-fix-command (`context-brake fix`)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `419c0bd328b2cd209ed98846e6b50b73ef4664fd..worktree` (uncommitted and untracked files on 2026-10-21). The worktree also holds the uncommitted prd-22 and prd-23 diffs (`workflow.md#context`). This review attributes changes to prd-24 through the 7 handoffs (T01 to T06, T07) and the TechSpec file list.
- Previous review: `tasks/prd-24-doctor-fix-command/codereview_01/codereview.md` (REJECTED, CR-01)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-24-doctor-fix-command/prd.md` | read; sha256 `82f97a24…3019` equals the A-01 approval |
| TechSpec | `tasks/prd-24-doctor-fix-command/techspec.md` | read; sha256 `a4326cc4…3c60` equals the A-02 approval |
| Manifest | `tasks/prd-24-doctor-fix-command/tasks.md` | read; sha256 `bf6a362a…5e2e`, the same value as in codereview_01. It differs from the A-02 approval `cfff25cf…91d0` only by the `State` and `Problems and solutions` sections (mutable state) |
| Tasks and handoffs | `done/task_01.md` to `done/task_06.md` | read; 6 of 6 in `done/`, manifest State `[x]`, `Produced result` handoff line present in each |
| Correction tasks | `codereview_01/done/task_07.md` | read; T07 in `done/`, handoff filled |
| Previous review | `codereview_01/codereview.md` | read; CR-01 and open items 1 to 3 |
| Workflow, checkpoint, decisions | `workflow.md`, `checkpoint.json`, `autonomous-decisions.md` | read; mode `auto`, H-01, A-01 to A-03, R-01; `correction_round` 1; `active_work` reviewer `codereview_02` |
| Snapshot | `context-snapshot.md` | not present |
| Implementation | git diff from `419c0bd`, untracked prd-24 files, handoffs | delimited (shared worktree with prd-22 and prd-23, see limitations) |

Files changed after `codereview_01/codereview.md` was written (`find -newer` over `src`, `tests`, `scripts`, `schemas`, `README.md`, `docs`, `.agents`): `src/infrastructure/harnesses/claude-code/planner.ts`, `tests/integration/fix-command.test.ts`, `tests/integration/fix-interactive.test.ts`, `tests/integration/statusline-keep.test.ts`. These 4 files equal the T07 handoff list. All other prd-24 code is the same code that codereview_01 read. This review ran every command again.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `fix.group` on each warning or error finding; none on `ok` | `src/core/services/fix-groups.ts:assignFixGroups`, `CORE_FIX_GROUPS`; `claude-code/fix-groups.ts`; `common/restart-fix-groups.ts`; `src/cli/doctor-diagnosis.ts` | `tests/unit/fix-groups.test.ts` (TC-01, TC-02); `tests/integration/doctor-fix-groups.test.ts` (TC-05) | conformant | Code unchanged since codereview_01; suites pass in this run. Probe: `doctor` gives `WARN (0 errors, 2 warnings, 1 fixable)` with 1 decision and 1 manual finding |
| FR-02 | `Fix: run context-brake fix` and `, N fixable` | `src/cli/output/doctor-rows.ts:23` (`FIX_COMMAND_TEXT`); `doctor-text.ts` | `tests/unit/doctor-text.test.ts:96-112` (TC-03) | conformant | Suite passes; probe header above |
| FR-03 | Plan reruns `init`, keeps configuration choices | `src/cli/init-plan.ts:planInit`; `src/cli/fix-steps.ts:planFor` | `fix-command.test.ts:33` (TC-10); init suites (TC-24) | conformant | `autoRestart` kept and mod files reinstalled; init suites pass |
| FR-04 | Plan shown before confirmation on a TTY | `src/cli/commands/fix-interactive.ts` | `fix-interactive.test.ts:22` (TC-11) | conformant | `Plan` before `Nothing was written.`; watched hashes unchanged |
| FR-05 | One question per decision | `src/cli/fix-prompts.ts`; `fix-decisions.ts:statuslineRequest` | `fix-interactive.test.ts:43,51,60,72` (TC-12) | conformant | Answer `s` now gives 1 question, no confirmation, and unchanged hashes of the hook, bridge, config, manifest, and `settings.local.json` (`fix-interactive.test.ts:60-67`). CR-01 resolved |
| FR-06 | `--yes` skips decisions; `--yes --force` takes the first option; `--harness` | `src/cli/fix-decisions.ts:33-60` | `fix-command.test.ts:54,63,74` (TC-13) | conformant | `--yes` skip of the inactive bridge keeps the manifest and `.gitignore` byte for byte (`fix-command.test.ts:73-83`); probe below. `--yes --force` bridge reinstall still has no automated case (optional improvement) |
| FR-07 | No TTY, no `--yes`: `CONFIRMATION_REQUIRED`, no change | `src/cli/commands/fix.ts:39` | `fix-stops.test.ts` (TC-14) | conformant | Exit 2, hashes unchanged |
| FR-08 | `--dry-run` changes nothing | `fix.ts:38` | `fix-stops.test.ts` (TC-15); `tests/e2e/e2e-fix.test.ts` (TC-21) | conformant | Suites pass on the built CLI |
| FR-09 | Outcome per finding | `src/core/services/fix-outcomes.ts:resultOf`, `appliedResult` | `fix-outcomes.test.ts` (TC-08); `fix-command.test.ts:42` (TC-16) | conformant | Probe: `skipped STATUSLINE_BRIDGE_INACTIVE` with reason, `manual STATUSLINE_LOCAL_TRACKED` with remediation. See open item 4 |
| FR-10 | Restart note | `fix-outcomes.ts:47`; `src/cli/output/harness-labels.ts` | `fix-text.test.ts` (TC-17); `fix-command.test.ts:33` | conformant | Suites pass |
| FR-11 | No installation: change nothing, name `init` | `fix-steps.ts:stopOf` | `fix-stops.test.ts` (TC-18) | conformant | Probe on an empty project: plan `[]`, every problem `skipped` with `ContextBrake is not installed in this project. Run context-brake init first.`, exit 2 = first diagnosis (2 errors) |
| FR-12 | Nothing to fix: change nothing, list manual findings | `fix-steps.ts:stopOf`; `fix-text.ts` | `fix-stops.test.ts` (TC-19); `fix-command.test.ts:21` second run | conformant | Suites pass |
| FR-13 | Exit codes 0, 1, 2, 64; cancel = first diagnosis | `fix-outcomes.ts:exitCodeOf`; `fix-arguments.ts` | `fix-command.test.ts`; `fix-stops.test.ts`; `fix-interactive.test.ts:22` | conformant | Suites pass; probe exit 1 with 2 remaining warnings |
| FR-14 | `fix --json` and `schemas/fix-report.schema.json` | `src/core/contracts/fix-report.ts`; `schemas/fix-report.schema.json` | `e2e-fix.test.ts` (TC-21); `schemas.test.ts` (TC-22) | conformant | `npm run schemas:check` exit 0; e2e passes |
| FR-15 | Doctor schema optional `fix`; `schemaVersion` 1 | `src/core/contracts/diagnostics.ts`; `schemas/doctor-report.schema.json`, `install-report.schema.json` | `schemas.test.ts` (TC-04) | conformant | Suite passes; `schemas:check` exit 0 |
| FR-16 | README and help | `README.md:169,332`; `src/cli/composition-root.ts:21,27` | TC-23 (review of the diff) | conformant | README row lists `--dry-run`, `--yes` (`-y`), `--force`, `--harness <id>`, `--json`; help lists `context-brake fix [options]` and the `fix` command line |
| NFR-01 | Writes only through the `init` plan; `.gitignore` marked block lists owned files in full | `fix-steps.ts:applyPlan` (`NodeChangeApplier`); `planner.ts:27-30,61` (`keptBridgeAssets`) | TC-24 suites; `fix-command.test.ts:73-83`; probe | conformant | After a skipped bridge decision, the block still lists `/.claude/hooks/context-brake-statusline.mjs`; `git status` does not show the bridge as untracked; `remove --yes` deletes it. CR-01 resolved |
| NFR-02 | No change to a user-modified file without an answer or `--force` | `asset-currency.ts`; `fix-decisions.ts` | `asset-currency.test.ts` (TC-06); TC-12; TC-13 | conformant | Suites pass |
| NFR-03 | Output rules | `fix-rows.ts`; `fix.ts:22-25` (`isInteractive`) | `fix-text.test.ts`; `fix-interactive.test.ts:33` | conformant | Text labels for every outcome; no prompt with `--yes` |
| NFR-04 | Linux, macOS, Windows | existing planner and applier | Windows local only | not verifiable | Linux and macOS through CI per TechSpec; not run here |
| NFR-05 | Exit codes from `EXIT_CODES`; doctor codes unchanged | `fix-steps.ts` (`EXIT_CODES.error`) | TC-08 | conformant | Unchanged since codereview_01; suites pass |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core never imports infrastructure or cli) | OK | QA-04: 0 hits over the `src/core/` files of the scope |
| `code-standards.md`, `javascript-typescript.md` | OK | `npm run lint` exit 0; `npm run typecheck` exit 0; QA-01 to QA-03: 0 hits |
| `harness-adapters.md` (harness behavior stays in the adapter) | OK | The T07 change is inside the Claude Code adapter (`planner.ts:27-30`); core only merges `aPlan.assets` (`installation-adapters.ts:26`) |
| `file-changes.md` (marked `.gitignore` block lists owned files in full) | OK | Probe: `.gitignore` and manifest hashes `OK` after `fix --yes`; the block keeps 5 paths |
| `cli-output.md` | OK | stdout results; labels `FIXED`, `SKIPPED`, `MANUAL`, `FAILED`, `PLANNED`; no prompt without a TTY |
| `tests.md` (coverage, e2e smoke, time budget) | NOT OK (open item) | Coverage exit 0, 96.31 % statements. `npm run test:budget` exit 1: 219.6 s above 180 s. Coverage wall 229 s. Machine CPU load was 76 % with no test run, from 12 `claude` and 14 `node` processes. See open item 2 |

## Quality profile

Scope: the same 53 TypeScript files as codereview_01 (17 new prd-24 source files, the prd-24-touched files of the TechSpec list, `src/infrastructure/harnesses/claude-code/planner.ts`, and the prd-24 tests).

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>' files` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 new of 0 | OK |
| QA-03 | Empty `catch` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|...' files` | 0 new of 0 | OK |
| QA-04 | `core` imports `infrastructure` or `cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 new of 0 | OK |
| QA-05 | `throw new Error(` | reservation | `rg -n 'throw new Error\(' files` | 0 new of 9 | pre-existing: `scripts/check-schemas.ts:17`, `scripts/check-package.ts:41-44,50,59,63,75` (baseline lines shifted by the inserted schema list lines) |
| QA-06 | 4+ parameters | reservation | `rg -n '\((?:[^(),]+,){3,}...' files` | 0 new of 1 | pre-existing: `tests/unit/asset-currency.test.ts:12`, unchanged `it.each` callback with 1 destructured parameter |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' files \| awk -F: '$2 > 100'` | 1 new of 1 | NOT OK (reservation): `tests/unit/doctor-text.test.ts` 112 lines (prd-24 TC-03 block at lines 96-112). The T07 files stay below 100: `planner.ts` 82 (77 at the base), `fix-command.test.ts` 84, `fix-interactive.test.ts` 80, `statusline-keep.test.ts` 48 |

- Terrain baseline: applied from TechSpec. `planner.ts` is not in the baseline table; it has 82 lines and no hit.
- Hits discounted by baseline: 10 (QA-05: 9; QA-06: 1).
- Reservations accumulated in the feature: 1.
- Suggested escalation: no trigger fired (1 of 8 reservations; no touched source file above 200 lines; no block in 3+ places found).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | One assignment point after the diagnosis (`doctor-diagnosis.ts`); producers unchanged |
| DEC-02 | YES | Core, Claude Code, Pi, and Oh-My-Pi maps equal the table; code unchanged since codereview_01 |
| DEC-03 | YES | `planInit` in `src/cli/init-plan.ts`; `executeInit` uses it; no config update in `fix` |
| DEC-04 | YES | `protectModifiedAssets(changes, { manifest, snapshots, overwritePaths })` (`installation-service.ts:77`); a kept modified asset is filtered from `ap.assets` and comes back once through `preservedAssets` (`installation-service.ts:79-80`), so the T07 bridge asset cannot appear twice |
| DEC-05 | YES | `'keep'` returns `EMPTY_PLAN` (`statusline-planner.ts:24`), and `keptBridgeAssets` returns the previous manifest's bridge asset for `'keep'` only (`planner.ts:27-30`). `context.manifest` is set on the `fix` path through `buildHarnessContext` (`src/cli/detection-collector.ts:29`). Probe: plan `[]`; manifest, `.gitignore`, bridge, and `settings.local.json` hashes unchanged |
| DEC-06 | YES | `fix-outcomes.ts:34-37` (`keepsStatusline`), `KEPT_STATUSLINE_REASON`. See open item 4 |
| DEC-07 | YES | `fix-outcomes.ts:44-57`; match by `findingKey` (code, harness, path) |
| DEC-08 | YES | `fix-outcomes.ts:69-73` (`exitCodeOf`) |
| DEC-09 | YES | `fix-arguments.ts`; `fix.ts:22-25` |
| DEC-10 | YES | Order in `fix.ts:27-41` |
| DEC-11 | YES | `doctor-rows.ts:23`; `doctor-text.ts`; JSON `remediation` unchanged |
| DEC-12 | YES | `fix-text.ts`, `fix-rows.ts` |
| DEC-13 | YES | `fix-prompts.ts`; text fallback strings equal the TechSpec |
| DEC-14 | YES | `fix.ts`, `fix-report.ts` in `src/core/contracts/`; 5 schema lists updated; `schemas:check` exit 0 |
| DEC-15 | YES | Help lines in `src/cli/composition-root.ts:21,27` (codereview_01 named `main.ts`; `main.ts:16` holds the `handleParseError` mapping); README row and "Fixing problems" text |
| DEC-16 | YES | `src/cli/output/harness-labels.ts` |
| Fix report contract | YES | `fixReportSchema` fields equal `techspec.md#fix-report`; e2e validates the document |

## Verified tasks

For T01 to T06, this review checked the `done/` location, the manifest State, the `Produced result` handoff line, and the work-item boxes. The code of T01 to T06 is unchanged since codereview_01 (`find -newer` result above), so this review reuses that code reading; all commands ran again.

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Fix groups, doctor text, schema field; extra file `common/restart-fix-groups.ts` declared |
| T02 | `done/task_02.md` | COMPLETE | `planInit`, `overwritePaths`, `'keep'`; the manifest effect of `'keep'` is now corrected by T07 |
| T03 | `done/task_03.md` | COMPLETE | Report contract, outcome service, `parseFix` |
| T04 | `done/task_04.md` | COMPLETE | Command without prompts; extra files `fix-rows.ts`, `harness-labels.ts`, `fix-stops.test.ts` declared |
| T05 | `done/task_05.md` | COMPLETE | TTY flow; extra files `fix-prompts.ts`, `fix-steps.ts`, `commands/fix-interactive.ts` declared |
| T06 | `done/task_06.md` | COMPLETE | Published schema, e2e smoke, README; `e2e-smoke-set.test.ts` updated and declared |
| T07 | `codereview_01/done/task_07.md` | COMPLETE | `keptBridgeAssets` in `planner.ts`; 3 test files changed; the changed-file list equals the files changed after codereview_01. The acceptance criterion (manifest and `.gitignore` byte-identical after `fix --yes`, `STATUSLINE_BRIDGE_INACTIVE` `SKIPPED`) is proven by `fix-command.test.ts:73-83` and by the probe |

## Executed validations

- Profile and scope: CLI command surface (`src/cli/`, `src/core/`) and the Claude Code install planner. In-process integration tests, the e2e smoke on the built CLI, and 2 built-CLI probes in a temporary folder outside the worktree.
- Validated state: worktree at `419c0bd` plus uncommitted changes (87 `git status --porcelain` entries before and after the commands), Windows 11, Node on `C:\Program Files\nodejs`, Git Bash, 2026-10-21. The probes removed `~/.local/bin` (Claude Code) from `PATH` to get the bridge source, and set `HOME` and `USERPROFILE` to a temporary home.
- Reused evidence: none for commands. The matrix reuses the codereview_01 code reading for files that did not change after that report (`find -newer` result above).
- Manual acceptance: not run. The TechSpec manual TTY script belongs to CLI QA (A-03).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0, 20 s) | rules |
| `npm run typecheck` | passed (exit 0, 19 s) | rules |
| `npm run build` | passed (exit 0, 16 s) | FR-14 e2e precondition, probes |
| `npm run schemas:check` | passed (exit 0) | FR-14, FR-15, TC-22 |
| `npm run coverage` | passed (exit 0): 287 files, 1539 passed, 1 skipped; 96.31 % statements, 93.25 % branches, 97.36 % functions; vitest `Duration 224.68s`, wall 229 s | FR-01 to FR-16, TC-01 to TC-25, T07 |
| `npm run test:budget` | failed (exit 1, `TEST_BUDGET_EXCEEDED`): 219.6 s of 180 s. Slowest: `statusline-shell` 28.6 s, `init-assistant-equivalence` 26.9 s, `codex-hook-command-shells` 18.5 s, `e2e-doctor` 16.1 s, `fix-interactive` 15.4 s, `fix-command` 14.9 s, `e2e-fix` 14.1 s | `tests.md` budget; open item 2 |
| Quality profile QA-01 to QA-07 | passed for blocking rules; 1 reservation | Quality profile |
| Probe A: built CLI, empty Git project with `.claude/` and `CLAUDE.md`, no `init`, `fix --yes --json` | exit 2; plan `[]`; 4 problems `skipped` with the not-installed reason; no manifest, `.gitignore`, or config file exists after the run | FR-11, FR-13 |
| Probe B: built CLI, bridge source, `init --yes`, commit, user `statusLine` in `settings.local.json`, `fix --yes --json`, then `git status` and `remove --yes` | `fix` exit 1; plan `[]`; `STATUSLINE_BRIDGE_INACTIVE` `skipped`, `STATUSLINE_LOCAL_TRACKED` `manual`; `sha256sum -c` `OK` for `.context-brake/manifest.json`, `.gitignore`, `.claude/hooks/context-brake-statusline.mjs`, `.claude/settings.local.json`; manifest still lists the bridge; `.gitignore` block keeps 5 paths with `/.claude/hooks/context-brake-statusline.mjs`; `git status` shows only ` M .claude/settings.local.json` (the user edit); `remove --yes` exit 0 and the bridge is deleted | CR-01, DEC-05, FR-06, NFR-01 |

## Findings

No finding in this review.

Optional improvements (not blocking):

| ID | Source | Evidence | Recommendation |
| --- | --- | --- | --- |
| OI-01 | QA-07 (reservation) | `tests/unit/doctor-text.test.ts` has 112 lines; the prd-24 TC-03 block (lines 96-112) took it above 100 | Move the TC-03 cases to their own file when the file changes next |
| OI-02 | T07.2, `tests.md` | `tests/integration/fix-interactive.test.ts:11` `WATCHED` has no `.gitignore`, and the TTY world has no `.git` folder, so the `s` case does not assert the `.gitignore` block that T07.2 named. The same planner path is proven by `fix-command.test.ts:73-83`, and `prompts.asked.length === 1` proves an empty plan on the TTY path | Optional: add a `.git` folder and `.gitignore` to the `s` case |
| OI-03 | FR-06, carried from codereview_01 | `--yes --force` with `STATUSLINE_BRIDGE_INACTIVE` (bridge reinstall, `fix-decisions.ts:38`) has no automated case; the TTY answer `r` covers the same planner request | Optional: one `--yes --force` case in `fix-command.test.ts` |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `planner.ts:27-30,61` returns the previous manifest's bridge asset in `assets` for `'keep'`; `installation-adapters.ts:26` merges it into the manifest and the `.gitignore` block. Tests: `fix-command.test.ts:73-83` (`--yes`, manifest and `.gitignore` hashes equal, block keeps the bridge), `fix-interactive.test.ts:60-67` (`s`, 1 question, watched hashes equal), `statusline-keep.test.ts:37` (planned manifest lists the bridge). Probe B: plan `[]`, all 4 hashes `OK`, no untracked bridge in `git status`, `remove --yes` deletes the bridge |

## Limitations and open items

- Open item 1 (PRD decision, carried from codereview_01): after `--no-statusline-bridge`, or after the `forget` answer, `STATUSLINE_BRIDGE_ABSENT` stays in group `automatic` (FR-01 table). `doctor` counts it as fixable, and `fix` reports it `FAILED` with an empty plan. This follows the approved PRD table and its assumption. The UX conflicts with OBJ-03. A change of the group needs a PRD decision.
- Open item 2 (repository owner): `npm run test:budget` failed at 219.6 s against 180 s (codereview_01: 174.9 s, passed), and `npm run coverage` took 229 s of wall time (codereview_01: 188 s). T07 added 1 test to `fix-command.test.ts` and split 1 test in `fix-interactive.test.ts`. The per-file times show that T07 does not explain the overrun: `fix-command` 11.4 s to 14.9 s (+3.5 s), `fix-interactive` 13.4 s to 15.4 s (+2.0 s), and `e2e-fix` 10.6 s to 14.1 s (+3.5 s) although T07 did not change `e2e-fix`. If all of this growth is charged to T07, it is at most 9 s; the overrun is 39.6 s. The `e2e-fix` slowdown with no code change points to the environment. Supporting context: the machine CPU load was 76 % with no test run (12 `claude` and 14 `node` processes). The TechSpec Test approach routes a result above budget to the repository owner as an open item, as in prd-23. The status does not count it as a failing feature test, because all 1539 tests pass. The repository owner must decide whether to rerun the budget on an idle machine or to accept it.
- Open item 3 (repository owner, from the TechSpec): the e2e list in `.agents/rules/tests.md` names init, doctor, and remove; `tests/e2e/e2e-fix.test.ts` follows the per-command pattern.
- Open item 4 (TechSpec owner, from code reading, not executed): DEC-06 extends a skipped `STATUSLINE_BRIDGE_INACTIVE` only to `claude-code` codes that start with `STATUSLINE_` (`fix-outcomes.ts:34-37`). With `'keep'`, the bridge asset is not rewritten. If the same run also has an `ASSET_OUTDATED` (or `ASSET_MISSING`) finding on `.claude/hooks/context-brake-statusline.mjs`, that finding is still reported after the fix, and `appliedResult` gives `failed` with `Still reported after the fix` (`fix-outcomes.ts:48-49`), not `skipped`. This follows DEC-06 and DEC-07 as written. Before T07, the bridge left the manifest, so the same case showed a false `fixed`. A TechSpec owner can extend DEC-06 to the bridge asset path.
- Not verifiable: Linux and macOS (NFR-04) were not run here; the TechSpec assigns them to CI.
- Not verifiable: the `askUi` select path of the clack prompt port has no automated test (DEC-13; `ScriptedPrompts` has no `askUi`). The manual TTY acceptance script of the TechSpec belongs to CLI QA.
- Scope limitation: the worktree holds the uncommitted prd-22 and prd-23 diffs on the same files (for example `doctor-rows.ts`, `doctor-text.ts`, `claude-code/adapter.ts`). This review attributes the prd-24 part through the handoffs and the TechSpec file list.
- State note: every `- [ ]` work item in `done/task_01.md` to `done/task_06.md` and in `codereview_01/done/task_07.md` stays unchecked. The `done/` location, the manifest State `[x]`, and the filled handoffs prove completion.
- State note: `codereview_01/` holds no corrections manifest, and `workflow.md` has no entry for the correction planning or for T07 after R-01. `checkpoint.json` records `correction_round: 1`. The T07 handoff and the file changes after codereview_01 agree. The flow owner can add the missing `workflow.md` entry.
- Manifest note: `tasks.md` sha256 differs from the A-02 approval because of the State and `Problems and solutions` updates; it is the same value as in codereview_01.

## Conclusion

CR-01 from codereview_01 is resolved. A skipped status line bridge decision now plans no change: the manifest, the `.gitignore` marked block, and the bridge script stay byte-identical, by test and by a built-CLI probe. Every FR and NFR that this environment can verify is conformant, T01 to T07 are complete, lint, typecheck, build, schemas check, coverage, and the e2e smoke pass, and no blocking quality profile hit exists. The reservations are 1 QA-07 hit and 2 optional test improvements. The test time budget failed under a loaded machine; the TechSpec routes it to the repository owner (open item 2). Open item 1 needs a PRD decision, and open item 4 needs a TechSpec decision; neither is a non-conformance with the approved sources. Status: APPROVED WITH RESERVATIONS. Next step per A-03: CLI QA (`sdd-execute-qa`).
