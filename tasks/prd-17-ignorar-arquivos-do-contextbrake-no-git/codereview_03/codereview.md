# Code review report — init keeps ContextBrake's own files out of Git (prd-17), re-review 2

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `5c97f37..current worktree` (uncommitted tracked changes plus the untracked prd-17 files; the foreign folders `.agents/skills/chat-clean/` and `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` are excluded; `tasks/triage-log.jsonl` is the triage record, not code). Since codereview_02 (written 2026-10-08 20:28), only `README.md` and `tests/unit/readme-gitignore.test.ts` changed (mtimes 2026-10-09 17:45); every other file in the scope predates that report. All gates were re-run anyway.
- Previous review: `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_02/codereview.md` (APPROVED WITH RESERVATIONS; correction in `codereview_02/done/task_01.md`)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md` | read; sha256 `27a7847a…` matches `checkpoint.json` `approved_sources` |
| TechSpec | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md` | read; sha256 `b1a18295…` matches the checkpoint |
| Manifest | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/tasks.md` | read; sha256 `6f1d3e93…` matches; T01..T06 `[x]`, every link resolves to `done/task_0N.md` |
| Handoffs | `done/task_01.md` .. `task_06.md`, `codereview_01/done/task_01.md` .. `task_03.md`, `codereview_02/done/task_01.md` | read; no open work item (`- [ ]`), every handoff filled |
| Previous reviews | `codereview_01/codereview.md` (via codereview_02), `codereview_02/codereview.md` | read |
| Workflow, checkpoint | `workflow.md`, `checkpoint.json` | read, not edited; DEC-HIL-04 (correct codereview_02/CR-01) recorded |
| Snapshot | `context-snapshot.md` | under 8 KiB, read whole per `load.md` step 1; only the header, next step brief, `Open threads`, and the `on-run` entry L-02 were used; `Decisions` (D-01) and L-01 were not relied on. Header `git_head` 5c97f37 matches HEAD; `covers_through` (codereview_02, reservations HIL pending) is behind the stage source (DEC-HIL-04 answered, `codereview_02/done/task_01.md` complete), so the next step brief was treated as stale |
| Implementation | `git diff 5c97f37` plus untracked files from `git status` | delimited (40 changed or new TypeScript files swept, plus README, AGENTS, rules, schemas, prd-12 notes) |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | One anchored line per owned file: config, manifest, manifest assets, plus the runtime state files `init` writes (DEC-HIL-03) | `gitignore-plan.ts:32-36` (`ownedPathsFor`), `:79-93` (`runtimeStatePaths`, `planGitIgnoreForInstall`) | `gitignore-plan.test.ts`, `init-gitignore.test.ts`, `init-gitignore-lifecycle.test.ts` | conformant | Built CLI, real `git init` folder, `init --yes --auto-restart`: block lists 2 hook scripts, `.context-brake/.gitignore`, 4 mod files, manifest, `runtime/claude-mod-install.json`, `runtime/claude-statusline.json`, config; `init --yes --no-statusline-bridge` lists `runtime/claude-statusline-opt-out.json` |
| FR-02 | Rebuilt from the manifest; second run plans nothing | `gitignore-block.ts`, `gitignore-plan.ts:67-75` | `init-gitignore-lifecycle.test.ts`, `gitignore-block.test.ts` | conformant | Built CLI: second `init --yes --dry-run --json` plans 0 changes |
| FR-03 | Harness config files never listed; symlinked harness folder names the target | `gitignore-plan.ts:27-36,86-88` | `gitignore-plan.test.ts`, `init-gitignore.test.ts` (junction) | conformant | No `.claude/settings*.json` line in the built-CLI block; junction test green; MSYS symlink is a documented limitation |
| FR-04 | Planned change in `--dry-run`/`--json`; bytes outside markers kept; create when missing; malformed markers = conflict, rest of `init` continues | `gitignore-block.ts`, `gitignore-plan.ts:67-75`, `installation-service.ts:83-87` | `gitignore-block.test.ts`, `init-gitignore.test.ts`, `init-gitignore-lifecycle.test.ts` | conformant | Built CLI on `node_modules/\r\n# keep\r\nlast`: block appended with CRLF after one inserted break and one blank line (DEC-02) |
| FR-05 | `--gitignore` / `--no-gitignore`, stored as `gitIgnore:false` only when off | `gitignore-merge.ts`, `init-arguments.ts`, `init-option-rules.ts`, `init-config-updates.ts`, `configuration.ts` | `gitignore-merge.test.ts`, lifecycle test | conformant | Built CLI: `--no-gitignore` removed the block and stored `gitIgnore`; plain `init` kept no block; `--gitignore` restored it and dropped the key |
| FR-06 | `remove` deletes the block, rest unchanged, deletes a block-only file | `removal-service.ts:53-62`, `gitignore-block.ts:43-52` | `remove-gitignore.test.ts` | conformant | Built CLI: CRLF file with final newline is byte-identical after `init`, `init`, `remove` (`cmp`); block-only `.gitignore` deleted by `remove` |
| FR-07 | Outside Git: no `.gitignore`, `GITIGNORE_NO_GIT` | `git-context.ts:12-20`, `gitignore-plan.ts:68` | `init-gitignore.test.ts` | conformant | Built CLI in a folder with no `.git` ancestor: no `.gitignore`, finding `GITIGNORE_NO_GIT` (severity ok), exit 0 |
| FR-08 | Tracked file yields `GITIGNORE_TRACKED_FILES` with the `git rm --cached` command; exit code unchanged | `init-flow.ts:50-54`, `git-context.ts:22-27`, `gitignore-findings.ts` | `init-gitignore-tracked.test.ts`, `init-gitignore-default-runner.test.ts` | conformant | Built CLI with a committed config: finding severity ok, `Run: git rm --cached -- context-brake.config.json`, exit 0 |
| FR-09 | Assistant question, preselected, flag only when it differs, printed command reproduces the plan | `questions-gitignore.ts`, `questions-misc.ts`, `summary.ts`, `assistant-context.ts` | `assistant-questions-gitignore.test.ts`, `init-assistant-equivalence.test.ts` | conformant | Tests green |
| FR-10 | Docs and rules updated; old statements gone | `README.md:154`, `AGENTS.md:39`, `.agents/rules/file-changes.md:9,17,20`, prd-12 supersede notes | `readme-gitignore.test.ts` | conformant | Repository search for "never/not edit/touch … `.gitignore`" returns only the negative assertions in the test. The README list of runtime state files omits the opt-out marker (CR-01, Low) |
| NFR-01 | Plan before write, atomic write, idempotent, byte preservation | `gitignore-block.ts`; existing applier | `gitignore-block.test.ts`, lifecycle test | conformant | Second run plans 0 changes; CRLF round trip identical |
| NFR-02 | Schemas valid, additive owner, exit codes kept | `changes.ts`, `schemas/*.json` | `npm run schemas:check`, suite | conformant | `schemas:check` exit 0; `npm run build` (which regenerates schemas) left `git status` unchanged |
| NFR-03 | Platforms; no process to build the block | `git-context.ts` (Git queried only for FR-08 through the runner) | CRLF and LF tests | conformant | Windows driven; Linux and macOS not driven (limitation) |
| NFR-04 | Tests within 180 s | — | `npm run coverage`, `npm run test:budget` | conformant | Coverage: 258 files, 1457 tests, 123.72 s (127 s wall); `npm run test:budget` 118.6 s against 180 s |
| OBJ-01 | After `init --yes` with every optional feature on, no ContextBrake-owned file in `git status` | `gitignore-plan.ts` | lifecycle test; real `git status` is TC-11 | conformant | Built CLI: `git status --porcelain -uall` shows only `.claude/settings.json` (user file, modified), `.gitignore`, and `.claude/settings.local.json` (excluded from OBJ-01 by DEC-HIL-03) |
| OBJ-02 | List stays exact as options change | lifecycle | `init-gitignore-lifecycle.test.ts` | conformant | Tests green; built CLI opt-out and opt-in runs above |
| OBJ-03 | Bytes outside the block kept, also on a second run | `gitignore-block.ts` | `gitignore-block.test.ts`, `init-gitignore.test.ts` | conformant | Built CLI CRLF file through two `init` runs |
| OBJ-04 | `--no-gitignore` writes no block, removes an existing one, persists | see FR-05 | lifecycle | conformant | Built CLI runs under FR-05 |
| OBJ-05 | After `init` and `remove`, `.gitignore` equals the original | see FR-06 | `remove-gitignore.test.ts` | conformant | Byte-identical for a file ending in a line break; a file without final newline (`…last`) comes back as `…last\r\n`, the edge clarified at HIL 2 (PRD Assumptions, DEC-03, OI-01) |
| US-04 | Developer who committed the files is told how to stop tracking them | see FR-08 | `init-gitignore-tracked.test.ts` | conformant | Built CLI evidence under FR-08 |
| TC-11 | Built CLI in a real `git init` folder (QA run) | — | QA run | not verifiable | Belongs to the QA stage after this review; the built-CLI runs here are review evidence, not the QA run |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (30-line functions, 100-line files, 3 parameters) | OK | `npm run lint` exit 0; QA-08 sweep: no file above 100 lines (`gitignore-plan.ts` 93; `init-gitignore-lifecycle.test.ts` exactly 100) |
| `javascript-typescript.md`, `node.md` | OK | `npm run typecheck` and `lint` exit 0; Git runs through `NodeProcessRunner` with `-z` output, no shell |
| `tests.md` | OK | 1457 tests in process within the budget; `init-gitignore-default-runner.test.ts` mocks `git-context.js` so no process starts |
| `file-changes.md` | OK | Plan before write, byte preservation, atomic apply through the existing applier; the rule names the block in its intro, the ownership bullet, and the `remove` bullet |
| `cli-output.md` | OK | New findings in English, severity `ok`, same JSON document |
| `harness-adapters.md` | N/A | No adapter change |
| Hexagonal layering | OK | QA-04 sweep over `src/core/` returned no hit; Git code in `src/infrastructure/git/`; runner default chosen in `src/cli/init-flow.ts` |
| README stays LF (snapshot learning, task acceptance) | OK | `grep -c $'\r' README.md` = 0 |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | TechSpec `rg` command over the 40 changed or new TypeScript files | 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | same | 0 | OK |
| QA-03 | No empty `catch` | blocking | same | 0 | OK |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | same, `src/core/` subset | 0 | OK |
| QA-05 | `exec`, `execSync`, `shell: true` | blocking | same | 0 | OK |
| QA-06 | `throw new Error(` | reservation | same | 1 of 1 (`tests/helpers/assistant-world.ts:44`) | pre-existing: present at `5c97f37` line 43 (`git show 5c97f37:tests/helpers/assistant-world.ts`); the file is not in the TechSpec baseline table, so the base was checked directly |
| QA-07 | 4+ parameters in one declaration | reservation | same | 1 raw hit (`tests/integration/init-assistant-equivalence.test.ts:41`) | false positive: one destructured parameter `({ seed, answers, flags, git })`; not counted |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' ... \| awk -F: '$2 > 100'` | 0 | OK |

- Terrain baseline: applied from TechSpec (the listed files had no pre-existing hits; not contradicted)
- Hits discounted by baseline: 1 (QA-06, verified at base) plus 1 false positive (QA-07)
- Reservations accumulated in the feature: 0 from the profile; 1 optional improvement (CR-01, documentation)
- Suggested escalation: `no trigger fired` (0 of 8 reservations, no touched file above 200 lines, no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 derived list from realPath, plus runtime state files (DEC-HIL-03), escapes | YES | `gitignore-plan.ts:23-36,79-93`; every line starts with `/`, so `#` and `!` cannot lead; `\`, `*`, `?`, `[`, trailing space escaped |
| DEC-02 markers, separator, EOL, malformed | YES | `gitignore-block.ts`; built-CLI CRLF output |
| DEC-03 removal and delete of empty file | YES | `gitignore-block.ts:43-52`; built CLI deleted a block-only file |
| DEC-04 `gitIgnore` key and merge | YES | `gitignore-merge.ts`, `configuration.ts`, schemas current |
| DEC-05 owner `gitignore`, `.gitignore` snapshot | YES | `changes.ts`, `snapshot-helper.ts:23`, `text.ts` |
| DEC-06 `isInsideGitWorkingTree` | YES | `git-context.ts:12-20` |
| DEC-07 tracked files through the runner | YES | `init-flow.ts:52`; only for `ignoredPaths`, empty outside Git or when disabled (`gitignore-plan.ts:68,72`) |
| DEC-08 assistant question | YES | `questions-gitignore.ts` |
| DEC-09 absorb `init.ts` and `installation-service.ts` | YES | `init.ts` delegates to `init-flow.ts` (77 lines); `installation-service.ts` 89 lines |
| DEC-10 docs, rules, repository `.gitignore` | YES | README, AGENTS, `file-changes.md`, prd-12 notes; the repository `.gitignore` keeps its manual lines (commit 5c97f37, accepted) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01..T06 | `done/task_01.md` .. `done/task_06.md` | COMPLETE | Handoffs filled; gates re-run green in this review |
| codereview_01 corrections T01..T03 | `codereview_01/done/task_01.md` .. `task_03.md` | COMPLETE | Behavior re-checked on the built CLI (tracked finding, runtime state lines, rule text) |
| codereview_02 correction T01 (CR-01) | `codereview_02/done/task_01.md` | COMPLETE | `README.md:154` names `claude-mod-install.json` and `claude-statusline.json`; `readme-gitignore.test.ts:18-20` asserts the sentence; README LF. The task scoped itself to "names the 2 current files", so it is complete as written; the remaining gap is README against PRD line 90 (CR-01 below) |

## Executed validations

- Profile and scope: CLI only; in-process suite plus the built CLI in temporary folders under the session scratchpad (real `git init` folders and one folder with no `.git` ancestor).
- Validated state: HEAD `5c97f37` plus the uncommitted worktree as found at review start; Windows 11, Node 24.20.0, Git 2.56.0.windows.2. `dist/` and `coverage/` regenerated by the commands below. `git status --porcelain` was identical before and after the review commands.
- Reused evidence: none for gates; the codereview_02 built-CLI runs were repeated here.
- Manual acceptance: none required by the TechSpec (HIL 3 is the person's own repository).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run schemas:check` | passed (exit 0) | NFR-02 |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run lint` | passed (exit 0) | code rules |
| `npm run dependencies:check` | passed (exit 0) | supply chain |
| `npm run build` | passed (exit 0); worktree status unchanged | built CLI, NFR-02 |
| `npm run coverage` | passed: 258 files, 1457 tests, 94.78 % lines, 123.72 s (127 s wall) | FR-01..FR-10 in process, NFR-04 |
| `npm run test:budget` | passed (exit 0): test run 118.6 s wall against the 180 s budget | NFR-04 |
| Built CLI, `git init` folder: `init --yes --auto-restart --json`, block contents, `git status --porcelain -uall`, second `--dry-run --json` | runtime state files listed; only user files and the accepted `settings.local.json` remain; 0 changes on the second run | FR-01, FR-02, FR-03, FR-04, OBJ-01, NFR-01 |
| Built CLI: `init --yes --no-statusline-bridge` | block lists `/.context-brake/runtime/claude-statusline-opt-out.json` | FR-01, CR-01 |
| Built CLI: `--no-gitignore`, plain `init`, `--gitignore`, `remove` | block removed and choice stored; kept off; restored with key dropped; `.gitignore` back to the original apart from the approved final-newline edge | FR-05, FR-06, OBJ-04, OBJ-05 |
| Built CLI: CRLF `.gitignore` ending in a line break, `init` twice, `remove`, `cmp` | identical | FR-04, FR-06, OBJ-03, OBJ-05 |
| Built CLI: no pre-existing `.gitignore`, `init`, `remove` | file created with the block, then deleted | FR-04, FR-06 |
| Built CLI: committed `context-brake.config.json`, `init --yes --json` | `GITIGNORE_TRACKED_FILES`, `Run: git rm --cached -- context-brake.config.json`, exit 0 | FR-08, US-04 |
| Built CLI: folder outside Git, `init --yes --json` | no `.gitignore`, `GITIGNORE_NO_GIT`, exit 0 | FR-07 |
| TechSpec QA-01..QA-08 sweeps | no new hit | quality profile |
| Repository search for the old "never touches `.gitignore`" statements | only the negative test assertions | FR-10 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low (optional improvement) | FR-10, DEC-HIL-03 (PRD Assumptions, line 90) | `README.md:154` lists the runtime state files as "(`claude-mod-install.json`, `claude-statusline.json`)"; the PRD clarification names three files, including the status line opt-out marker, and the built CLI after `init --yes --no-statusline-bridge` writes `/.context-brake/runtime/claude-statusline-opt-out.json` into the block (`gitignore-plan.ts:79-84` picks up every planned or existing file under `.context-brake/runtime/`). `tests/unit/readme-gitignore.test.ts:19` pins the two-file parenthetical. The narrowing to two files came from the correction plan (`codereview_02/done/task_01.md`, "names the 2 current files"), not from DEC-HIL-04 | The user documentation still understates what the block can contain; no behavior or requirement is affected | Name the status line opt-out marker (`claude-statusline-opt-out.json`, written when the bridge is turned off) in the `README.md:154` parenthetical, or word it as examples, and update the expected string in `tests/unit/readme-gitignore.test.ts:19` in the same change |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_02/CR-01 (Low, README "What is listed" omits the runtime state files) | resolved | `README.md:154` now names the state files `init` writes under `.context-brake/runtime/` (`claude-mod-install.json`, `claude-statusline.json`); `readme-gitignore.test.ts:18-20` asserts it; README LF. The remaining omission of the opt-out marker is recorded as CR-01 of this review |
| codereview_01/CR-01, CR-02, CR-03 | resolved (confirmed again) | Built CLI: tracked-files finding fires with the default runner; runtime state files in the block; `file-changes.md:17,20` name the block |

## Limitations and open items

- TC-11 (the QA run in a real `git init` folder) is `not verifiable` here and belongs to the QA stage; the built-CLI runs in this report are review evidence only.
- Linux and macOS are not driven; Windows with a junction passes; an MSYS symlink for a harness folder does not resolve (documented in `done/task_06.md`, accepted).
- Accepted, not findings: `.claude/settings.local.json` stays visible in `git status` (DEC-HIL-03); the repository's own `.gitignore` keeps manual ContextBrake lines (commit `5c97f37`); a `.gitignore` without final newline keeps the added break after `remove` (HIL 2, OI-01).
- Source consistency: the checkpoint `approved_sources` hashes now match all three files (the drift reported in codereview_02 is resolved). The TechSpec header's PRD hash `05e02d38…f73bd` is still stale (actual `27a7847a…`); a note for the authoring session, not an implementation finding.
- Workflow and snapshot state, for the authoring session to record (this review edited neither): `workflow.md` ends at "Correction round 2 planned" and does not log the completion of `codereview_02/done/task_01.md`; `context-snapshot.md` still names the reservations HIL as the next step and `covers_through: codereview_02`.
- Temporary folders for the built-CLI runs live under the session scratchpad, outside the repository.

## Conclusion

The correction of codereview_02/CR-01 is in place and the code under review is unchanged since codereview_02. Every obligation is conformant on re-run gates and on the built CLI (block contents, opt-out and opt-in, tracked-files finding, outside-Git finding, byte-preserving round trips). No quality-profile hit was introduced. One Low documentation reservation remains: the README parenthetical lists two of the three runtime state files the PRD clarification names, and its test pins that wording (CR-01). TC-11 stays with the QA stage. Status: APPROVED WITH RESERVATIONS.
