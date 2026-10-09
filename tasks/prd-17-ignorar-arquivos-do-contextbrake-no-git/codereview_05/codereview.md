# Code review report — init keeps ContextBrake's own files out of Git (prd-17), re-review 4

## Summary

- Status: APPROVED
- Execution: delegated reviewer
- Git scope: `5c97f37..current worktree`. HEAD equals the base, so the scope is the uncommitted tracked changes plus the untracked prd-17 files. The foreign folders `.agents/skills/chat-clean/` and `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` are excluded, and `tasks/triage-log.jsonl` is the triage record, not code. Since codereview_04, `find -newer codereview_04/codereview.md` (excluding `node_modules`, `.git`, `dist`, `coverage`, and the `.context-brake/runtime/sessions/` ledgers) lists one source file, `src/core/services/gitignore-plan.ts`, two tests, `tests/unit/gitignore-plan.test.ts` and `tests/integration/init-gitignore.test.ts`, then `README.md`, the feature's SDD files, and the qa_01 evidence. `package-lock.json`, `schemas/doctor-report.schema.json`, and the two prd-17 schemas have newer timestamps from QA's install and schema runs. Their content is not new: `git status` shows `package-lock.json` and `doctor-report.schema.json` unmodified, and the two prd-17 schemas pass `schemas:check`.
- Previous review: `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_04/codereview.md` (APPROVED, no findings). Correction source: `qa_01/qa.md` BUG-01, corrected in `qa_01/done/task_01.md` under DEC-HIL-06.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md` | Read. sha256 `ddeb9308…ba8d2` matches `checkpoint.json` `approved_sources` (DEC-HIL-06) and the TechSpec header. FR-03 now requires the link path and the target path. |
| TechSpec | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md` | Read. sha256 `425a75f2…a9d` matches the checkpoint. DEC-01, TC-02, and TC-04 were amended under DEC-HIL-06. |
| Manifest | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/tasks.md` | Read. sha256 `6f1d3e93…e29` matches. T01..T06 are `[x]`, and every link resolves to `done/task_0N.md`. |
| Handoffs | `done/task_01.md` .. `task_06.md`, `codereview_01/done/task_01..03.md`, `codereview_02/done/task_01.md`, `codereview_03/done/task_01.md`, `qa_01/done/task_01.md` | Read. Every file has 0 open work items (`- [ ]`) and a filled handoff. |
| Previous review, QA, and correction | `codereview_04/codereview.md`, `qa_01/qa.md`, `qa_01/done/task_01.md` | Read |
| Workflow, checkpoint | `workflow.md`, `checkpoint.json` | Read, not edited. DEC-HIL-06 and the completion of `qa_01/done/task_01.md` are logged. The checkpoint has `phase: review` with `codereview_05` running. |
| Snapshot | `context-snapshot.md` | Under 8 KiB, so it was read whole (`load.md` step 1). Only the header, the next step brief, `Open threads`, and the `on-run` entry L-02 were used. `Decisions`, L-01, L-03, and L-04 were not relied on. The header `git_head` 5c97f37 matches HEAD. `covers_through` says the exception HIL is pending, but the stage source shows DEC-HIL-06 answered and `qa_01/done/task_01.md` done. The snapshot is behind, so its next step brief was treated as stale, and open thread O-05 is answered. |
| Implementation | `git diff 5c97f37` plus the untracked files from `git status` | Delimited. The sweep covered 40 changed or new TypeScript files plus the README, AGENTS, rules, schemas, and prd-12 notes. |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | One anchored line per owned file: the config, the manifest, the manifest assets, and the runtime state files `init` writes (DEC-HIL-03) | `gitignore-plan.ts:32-37` (`ownedPathsFor`), `:80-94` (`runtimeStatePaths`, `planGitIgnoreForInstall`) | `gitignore-plan.test.ts:18-21,85-95`, `init-gitignore.test.ts:12-24` | conformant | Built CLI run here, standard layout: the block has both hook scripts, the manifest, `/.context-brake/runtime/claude-statusline.json`, and the config. |
| FR-02 | The block is rebuilt from the manifest, and a second run plans nothing | `gitignore-block.ts`, `gitignore-plan.ts:68-76` | `init-gitignore-lifecycle.test.ts`, `gitignore-plan.test.ts:44-47` | conformant | Built CLI here: `init --yes --dry-run --json` after the first run has `plan.changes` length 0 in the junction, dir-symlink, and standard layouts. |
| FR-03 | Harness configuration files are never listed. For a harness folder linked inside the repository, the block lists both the link path and the target path (DEC-HIL-06). | `gitignore-plan.ts:34` (`flatMap` of `resolve(root, path)` and `locate(path)`), `:27-30` (an outside-root target is skipped), `:87-89` (`locateOwned`) | `gitignore-plan.test.ts:22-31`, `init-gitignore.test.ts:63-78` (a junction on Windows) | conformant | Built CLI here with `.claude` as a junction to `.agents`: the block has `/.agents/hooks/context-brake{,-statusline}.mjs` and `/.claude/hooks/context-brake{,-statusline}.mjs`. `git status --porcelain -uall` lists only `.agents/settings{,.local}.json`, `.claude/settings{,.local}.json`, and `.gitignore`, so no owned file shows. With a directory symlink, the block is the same and the status lists only the settings files, the `.claude` link entry, and `.gitignore`. No `settings` path is in any block. |
| FR-04 | The block is a planned change in `--dry-run` and `--json`. Bytes outside the markers are kept, a missing file is created, and malformed markers are a conflict. | `gitignore-block.ts`, `gitignore-plan.ts:68-76`, `installation-service.ts` | `gitignore-block.test.ts`, `init-gitignore.test.ts:25-32`, lifecycle test | conformant | The suite is green. This code path did not change since codereview_04. The qa_01 S04 to S07 runs on the built CLI stay valid for it. |
| FR-05 | `--gitignore` and `--no-gitignore` work, and the choice is stored as `gitIgnore: false` only when off | `gitignore-merge.ts`, `init-arguments.ts`, `init-option-rules.ts`, `init-config-updates.ts`, `configuration.ts` | `gitignore-merge.test.ts`, lifecycle test | conformant | The suite is green. These files are unchanged since codereview_04, and qa_01 S08 is reused. |
| FR-06 | `remove` deletes the block, keeps the rest, and deletes a file that held only the block | `removal-service.ts`, `gitignore-block.ts` | `remove-gitignore.test.ts` | conformant | Built CLI here, in the junction, dir-symlink, and standard layouts: after `remove --yes`, `.gitignore` is exactly `node_modules/\n` (`od -c`). |
| FR-07 | Outside Git, `init` writes no `.gitignore` and reports `GITIGNORE_NO_GIT` | `git-context.ts`, `gitignore-plan.ts:69` | `init-gitignore.test.ts`, `gitignore-plan.test.ts:69-74` | conformant | The suite is green, and qa_01 S09 is reused. The code is unchanged. |
| FR-08 | A tracked file gets `GITIGNORE_TRACKED_FILES` with the `git rm --cached` command, and the exit code does not change | `init-flow.ts`, `git-context.ts`, `gitignore-findings.ts` | `init-gitignore-tracked.test.ts`, `init-gitignore-default-runner.test.ts` | conformant | The suite is green, and qa_01 S10 is reused. The code is unchanged. |
| FR-09 | The assistant asks the question with the stored state preselected, emits the flag only when the answer differs, and the printed command reproduces the plan | `questions-gitignore.ts`, `questions-misc.ts`, `summary.ts`, `assistant-context.ts` | `assistant-questions-gitignore.test.ts`, `init-assistant-equivalence.test.ts` | conformant | The suite is green. The code is unchanged. |
| FR-10 | Docs and rules are updated, the old statements are gone, and the README says what the block lists, including the link case | `README.md:154`, `AGENTS.md:39`, `.agents/rules/file-changes.md`, the prd-12 notes | `readme-gitignore.test.ts:11-29` | conformant | `README.md:154` names the 3 runtime state files and says that a linked harness folder gets both the link and the target path. The README has 0 CR bytes. The search for the old statements finds only the negative test assertions. |
| NFR-01 | Plan before write, atomic write, idempotency, byte preservation | `gitignore-block.ts` and the existing applier | `gitignore-block.test.ts`, lifecycle test | conformant | The second run plans 0 changes and the `remove` round trip is byte-identical (above). |
| NFR-02 | Schemas stay valid, the owner is additive, exit codes are kept | `changes.ts`, `schemas/*.json` | `npm run schemas:check`, suite | conformant | `schemas:check` exited 0. `init` exited 0 in all three runs. |
| NFR-03 | Platforms, and no process to build the block | `gitignore-plan.ts` is pure (`node:path` only) | CRLF and LF tests | conformant | Driven on Windows. Linux and macOS were not driven (limitation). |
| NFR-04 | Tests within 180 s | — | `npm run coverage` | conformant | 258 files and 1457 tests passed, Vitest duration 132.28 s. |
| OBJ-01 | After `init --yes`, no ContextBrake-owned file shows in `git status` | `gitignore-plan.ts` | lifecycle test; the real `git status` is TC-11 | conformant | Built CLI here: no owned file is untracked in the standard, junction, or dir-symlink layout (see FR-03). |
| OBJ-02 | The list stays exact as options change | lifecycle | `init-gitignore-lifecycle.test.ts` | conformant | The suite is green, and qa_01 S03 is reused. |
| OBJ-03 | Bytes outside the block are kept, also on a second run | `gitignore-block.ts` | `gitignore-block.test.ts`, `init-gitignore.test.ts:25-32` | conformant | The suite is green, and qa_01 S05 is reused. |
| OBJ-04 | `--no-gitignore` writes no block, removes an existing one, and persists | see FR-05 | lifecycle | conformant | see FR-05 |
| OBJ-05 | After `init` and `remove`, `.gitignore` equals the original | see FR-06 | `remove-gitignore.test.ts` | conformant | Built CLI here: byte-identical in all three layouts |
| US-04 | A developer who committed the files is told how to stop tracking them | see FR-08 | `init-gitignore-tracked.test.ts` | conformant | see FR-08 |
| TC-11 | The built CLI in a real `git init` folder (QA run) | — | QA run | not verifiable | This belongs to qa_02, after this review. The built-CLI runs here are review evidence, not the QA run. |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (30-line functions, 100-line files, 3 parameters) | OK | `npm run lint` exited 0. The QA-08 sweep found no file above 100 lines (largest: `init-gitignore-lifecycle.test.ts` 100, `gitignore-plan.test.ts` 96, `gitignore-plan.ts` 94). `ownedPathsFor` has 3 parameters. |
| `javascript-typescript.md`, `node.md` | OK | `npm run typecheck` and `lint` exited 0, and the QA-05 sweep is clean |
| `tests.md` | OK | The new assertions cite `FR-03`, `TC-02`, `TC-04`, and `BUG-01`. The link test uses `attemptLink` and `requireLink` from `tests/helpers/link-capability.ts`. All tests run in process. |
| `file-changes.md` | OK | The block change goes through the plan, and the second run is a no-op (above) |
| `cli-output.md` | OK | No output change since codereview_04 |
| `harness-adapters.md` | N/A | No adapter change |
| Hexagonal layering | OK | The QA-04 sweep over the 8 files in `src/core/` found no hit, and `gitignore-plan.ts` imports only `node:path` and core modules |
| README stays LF | OK | `grep -c $'\r' README.md` = 0 |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | TechSpec `rg` command over the 40 changed or new TypeScript files | 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, or `eslint-disable` | blocking | same | 0 | OK |
| QA-03 | No empty `catch` | blocking | same | 0 | OK |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | same, on the `src/core/` subset (8 files) | 0 | OK |
| QA-05 | No `exec`, `execSync`, or `shell: true` | blocking | same | 0 | OK |
| QA-06 | `throw new Error(` | reservation | same | 1 of 1 (`tests/helpers/assistant-world.ts:44`) | Pre-existing: it was at line 43 at the base, as codereview_04 verified, and the line is unchanged since |
| QA-07 | 4+ parameters in one declaration | reservation | same (`rg -P`) | 1 raw hit (`tests/integration/init-assistant-equivalence.test.ts:41`) | False positive: it is one destructured parameter, `({ seed, answers, flags, git })`. Not counted. |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' ... \| awk -F: '$NF > 100'` | 0 | OK |

- Terrain baseline: applied from the TechSpec. The listed files had no pre-existing hits, and nothing here contradicts that.
- Hits discounted by baseline: 1 (QA-06, verified at base), plus 1 false positive (QA-07)
- Reservations accumulated in the feature: 0
- Suggested escalation: `no trigger fired`. There are 0 of 8 reservations, no touched file above 200 lines, and no duplication in 3+ places.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01: derived list with the logical path plus the in-root `realPath`, an outside-root target skipped, the runtime state files, escapes | YES | `gitignore-plan.ts:23-37,80-94`; built-CLI blocks above; `gitignore-plan.test.ts:26-31` (only the logical line for an outside target) |
| DEC-02: markers, separator, EOL, malformed | YES | `gitignore-block.ts` (unchanged); suite green |
| DEC-03: removal, and deletion of an empty file | YES | Built-CLI round trip |
| DEC-04: `gitIgnore` key and merge | YES | Unchanged; `schemas:check` exited 0 |
| DEC-05: owner `gitignore`, `.gitignore` snapshot | YES | Unchanged |
| DEC-06: `isInsideGitWorkingTree` | YES | Unchanged |
| DEC-07: tracked files through the runner | YES | Unchanged |
| DEC-08: assistant question | YES | Unchanged |
| DEC-09: absorb `init.ts` and `installation-service.ts` | YES | QA-08 clean |
| DEC-10: docs, rules, repository `.gitignore` | YES | README bullet amended for the link case. The repository `.gitignore` keeps its manual lines (commit 5c97f37, accepted). |
| TC-02 / TC-04 as amended (link path and target path) | YES | `gitignore-plan.test.ts:22-31`, `init-gitignore.test.ts:63-78` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01..T06 | `done/task_01.md` .. `done/task_06.md` | COMPLETE | Handoffs are filled, and the gates were rerun green in this review |
| codereview_01 corrections T01..T03 | `codereview_01/done/task_01.md` .. `task_03.md` | COMPLETE | That code did not change in this round, and the suite is green |
| codereview_02 correction T01, codereview_03 correction T01 | `codereview_02/done/task_01.md`, `codereview_03/done/task_01.md` | COMPLETE | The README runtime-state sentence is unchanged, and `readme-gitignore.test.ts:18-20` passes |
| qa_01 correction T01 (BUG-01) | `qa_01/done/task_01.md` | COMPLETE | `ownedPathsFor` emits the logical path and the in-root real path (T01.1). The unit test covers both lines and the outside-target case (T01.2). The integration test covers both hook lines on a junction (T01.3). FR-03, DEC-01, TC-02, and TC-04, the TechSpec header hash, and the README bullet are amended (T01.4). Both acceptance criteria were checked here with the built CLI, using a junction and a directory symlink. |

## Executed validations

- Profile and scope: CLI only. The in-process suite ran, then the built CLI ran in temporary `git init` folders under the session scratchpad, outside the repository, with `HOME`, `USERPROFILE`, and `GIT_CONFIG_GLOBAL` set to a fake home.
- Validated state: HEAD `5c97f37` plus the uncommitted worktree as found at review start, on Windows 11, Node v24.20.0, and Git 2.56.0.windows.2. The md5 of `git status --porcelain` was `554d3583…` (51 lines) before the commands, after coverage and build, and after the end-to-end runs. That equals the qa_01 value, so no tracked or listed file changed. `coverage/` and `dist/` were regenerated, and the build ran after coverage finished.
- Reused evidence: the qa_01 runs S03 to S10 and S12 to S14 on the built CLI, for the FR-04, FR-05, FR-07, and FR-08 paths and OBJ-02 to OBJ-04. They remain valid because the only source change since then is `ownedPathsFor` (the line list), which this review re-ran on the built CLI for FR-01, FR-02, FR-03, FR-06, OBJ-01, and OBJ-05. `npm run test:budget` was not rerun, because the coverage run here covers NFR-04.
- Manual acceptance: none is required by the TechSpec. HIL 3 is the person's own repository.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run schemas:check` | passed (exit 0) | NFR-02 |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run lint` | passed (exit 0) | code rules |
| `npm run dependencies:check` | passed (exit 0; 9 runtime packages, no install scripts) | supply chain |
| `npm run coverage` | passed: 258 files, 1457 tests, 94.78 % lines, Vitest duration 132.28 s | FR-01..FR-10 in process, NFR-04, BUG-01 assertions |
| `npm run build` | passed (exit 0); worktree status unchanged | built CLI |
| Built CLI, `git init` folder with `node_modules/\n` and `.claude` as a junction to `.agents`: `init --yes`, block, `git status --porcelain -uall`, `init --yes --dry-run --json`, `remove --yes`, `od -c .gitignore` | Both `/.claude/hooks/*` and `/.agents/hooks/*` are listed. Only the harness settings files and `.gitignore` are untracked. 0 changes on the second run. The original bytes are back after `remove`. | FR-01, FR-02, FR-03, FR-06, OBJ-01, OBJ-05, qa_01/BUG-01 |
| The same with `.claude` as an NTFS directory symlink | The same block. Untracked: `.agents/settings{,.local}.json`, the `.claude` link entry (the person's link, not an owned file), and `.gitignore`. 0 changes on the second run. The original bytes are back. | FR-03, OBJ-01, OBJ-05 |
| The same with a plain `.claude` folder | No `.agents` line in the block. Untracked: only the `.claude` settings files and `.gitignore`. 0 changes. The original bytes are back. | FR-01, FR-03 (no regression), OBJ-01 |
| TechSpec QA-01..QA-08 sweeps | No new hit | Quality profile |
| Search of README, AGENTS, rules, PRD, and TechSpec for the link wording | Consistent: FR-03, DEC-01, TC-02, TC-04, and `README.md:154` all say "both the link path and the target path" | FR-03, FR-10 |

## Findings

None.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| qa_01/BUG-01 (Low, FR-03 and OBJ-01: with a junction, only the target path was listed) | resolved | `gitignore-plan.ts:34` lists both the logical and the real path. `gitignore-plan.test.ts:22-31` and `init-gitignore.test.ts:63-78` pass. The built CLI with a junction leaves no owned file in `git status --porcelain -uall`. The re-run of QA S11 still belongs to qa_02. |
| codereview_04 | — | It had no findings. Its limitation about the stale TechSpec header PRD hash is resolved: the header now names `ddeb9308…ba8d2`, which matches `prd.md` and the checkpoint. |
| codereview_03/CR-01, codereview_02/CR-01 | resolved | `README.md:154` and `readme-gitignore.test.ts:18-20` are unchanged and pass |
| codereview_01/CR-01, CR-02, CR-03 | resolved | That code did not change in this round, and the suite is green. The runtime state line appears in the built-CLI blocks above. |

## Limitations and open items

- TC-11 (the QA run in a real `git init` folder, including the S11 junction and directory-symlink re-run) is `not verifiable` here and belongs to qa_02. The built-CLI runs in this report are review evidence only.
- Linux and macOS were not driven. That leaves the POSIX symbolic-link path of FR-03 to the in-process suite, which on Windows makes a junction (`attemptLink`). The TechSpec already records this.
- Accepted, not findings: `.claude/settings.json`, `.claude/settings.local.json`, and their `.agents` targets stay visible in `git status`, because they are harness files `init` only edits (FR-03, DEC-HIL-03). A directory symlink shows its own `.claude` entry. The repository's own `.gitignore` keeps its manual ContextBrake lines (commit `5c97f37`, snapshot O-02). A `.gitignore` without a final newline keeps the added break after `remove` (HIL 2, OI-01).
- Snapshot state, for the authoring session to record (this review edited it nowhere): `context-snapshot.md` still has `covers_through` with the exception HIL pending and O-05 open. `workflow.md` and `checkpoint.json` already show DEC-HIL-06 answered and `qa_01/done/task_01.md` done.
- Temporary folders for the built-CLI runs are under the session scratchpad, outside the repository.

## Conclusion

The correction of qa_01/BUG-01 is in place and matches the amended sources. `ownedPathsFor` now lists each owned file's logical path and its in-root target. The unit and integration tests pin both lines and the outside-target case. On the built CLI, a `.claude` junction or directory symlink to `.agents` leaves no owned file in `git status`, the second run plans nothing, and `remove` restores the original bytes. The PRD, TechSpec, and README agree on the wording, and the source hashes match the checkpoint. Every gate was rerun green: schemas, typecheck, lint, dependency scripts, coverage with 1457 tests in 132 s, and build. The quality profile has no new hit and 0 accumulated reservations. Every obligation is conformant except TC-11, which belongs to the QA stage by plan. Status: APPROVED.
