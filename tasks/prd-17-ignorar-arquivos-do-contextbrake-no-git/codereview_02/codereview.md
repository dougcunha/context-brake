# Code review report — init keeps ContextBrake's own files out of Git (prd-17), re-review

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `5c97f37..current worktree` (uncommitted tracked changes plus the untracked prd-17 files; the foreign folders `.agents/skills/chat-clean/` and `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` are excluded)
- Previous review: `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_01/codereview.md` (REJECTED; corrections in `codereview_01/done/task_01.md` .. `task_03.md`)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md` | read (includes the DEC-HIL-03 clarification of FR-01 and the assumptions) |
| TechSpec | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md` | read (DEC-01 amended by DEC-HIL-03) |
| Manifest | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/tasks.md` | read; T01..T06 all `[x]`, every link resolves to `done/task_0N.md` |
| Handoffs | `done/task_01.md` .. `done/task_06.md`, `codereview_01/done/task_01.md` .. `task_03.md` | read, all three correction tasks have `[x]` work items and a filled handoff |
| Previous review | `codereview_01/codereview.md` | read |
| Workflow, checkpoint | `workflow.md`, `checkpoint.json` | read (not edited) |
| Snapshot | `context-snapshot.md` | under 8 KiB, read whole; header and next step brief matched the checkpoint (`git_head` 5c97f37); `Decisions` and `Learnings` were not relied on |
| Implementation | `git diff 5c97f37` plus untracked files from `git status` | delimited (40 changed or new TypeScript files swept) |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | One anchored line per owned file: config, manifest, manifest assets, plus the runtime state files `init` writes (DEC-HIL-03) | `gitignore-plan.ts:32-36` (`ownedPathsFor`), `:70-82` (`runtimeStatePaths`, `planGitIgnoreForInstall`) | `gitignore-plan.test.ts`, `init-gitignore.test.ts`, `init-gitignore-lifecycle.test.ts:28-43` | conformant | Built CLI, real `git init` folder, `init --yes --auto-restart`: the block lists 2 hook scripts, `.context-brake/.gitignore`, 4 mod files, manifest, `runtime/claude-mod-install.json`, `runtime/claude-statusline.json`, config; `git status --porcelain -uall` shows only `.claude/settings.json` (modified, user file), `.gitignore` and `.claude/settings.local.json` (accepted exclusion) |
| FR-02 | Block rebuilt from the manifest, shrinks when options go off, second run plans nothing | `gitignore-block.ts`, `gitignore-plan.ts:67-75` | `init-gitignore-lifecycle.test.ts`, `gitignore-block.test.ts` | conformant | Built CLI: second `init --yes --dry-run --json` plans 0 changes; after `--no-auto-restart` the mod and `claude-mod-install.json` lines are gone and the block keeps 5 lines; status unchanged |
| FR-03 | Harness config files never listed; symlinked harness folder names the link target | `gitignore-plan.ts:27-30,77-79` | `gitignore-plan.test.ts`, `init-gitignore.test.ts` (junction) | conformant | No `.claude/settings*.json` in the block; junction test passes. The MSYS symlink case is a documented limitation (`done/task_06.md`), accepted by the caller |
| FR-04 | Planned change in `--dry-run`/`--json`, bytes outside markers kept, create when missing, malformed markers = conflict | `gitignore-block.ts`, `gitignore-plan.ts:46-75`, `installation-service.ts` | `gitignore-block.test.ts`, `init-gitignore.test.ts`, `init-gitignore-lifecycle.test.ts` | conformant | Tests green; built CLI preserved `node_modules/\n` and a CRLF file |
| FR-05 | `--gitignore` / `--no-gitignore`, stored as `gitIgnore:false` only when off | `gitignore-merge.ts`, `init-arguments.ts`, `init-config-updates.ts`, `configuration.ts` | `gitignore-merge.test.ts`, lifecycle test | conformant | Tests green (unchanged since codereview_01, confirmed there on the built CLI) |
| FR-06 | `remove` deletes the block, rest unchanged, deletes an empty file | `removal-service.ts:53-62`, `gitignore-block.ts` | `remove-gitignore.test.ts` | conformant | Built CLI on a CRLF `.gitignore` (`a\r\nb\r\n`): after `init` then `remove` the bytes are identical (`od -c`) |
| FR-07 | Outside Git: no `.gitignore`, `GITIGNORE_NO_GIT` | `git-context.ts:12-20`, `gitignore-plan.ts:68` | `init-gitignore.test.ts` | conformant | Test green |
| FR-08 | A tracked listed file yields `GITIGNORE_TRACKED_FILES` with the `git rm --cached` command, exit code unchanged | `init-flow.ts:49-53` (`env.runner ?? new NodeProcessRunner()`), `git-context.ts:22-27`, `gitignore-findings.ts` | `init-gitignore-tracked.test.ts`, `init-gitignore-default-runner.test.ts` | conformant | Built CLI, config and manifest force-added and committed: `init --yes --json` reports `GITIGNORE_TRACKED_FILES` (severity ok) naming both files and `Run: git rm --cached -- .context-brake/manifest.json context-brake.config.json`; exit 0. With `PATH=""` (no Git) `init` exits 0 with no finding and no crash |
| FR-09 | Assistant question, preselected, flag only when it differs, printed command reproduces the plan | `questions-gitignore.ts`, `questions-misc.ts`, `summary.ts`, `assistant-context.ts` | `assistant-questions-gitignore.test.ts`, `init-assistant-equivalence.test.ts` | conformant | Tests green |
| FR-10 | Docs and rules updated | `README.md`, `AGENTS.md`, `.agents/rules/file-changes.md:9,17,20`, prd-12 notes | `readme-gitignore.test.ts` | conformant | Rule section now names the block in the first and `remove` bullets; README documents both flags. One README sentence is incomplete (CR-01, Low) |
| NFR-01 | Plan before write, atomic write, idempotent, byte preservation | `gitignore-block.ts`; existing applier | `gitignore-block.test.ts`, lifecycle test | conformant | Round trip and second run plan 0 changes |
| NFR-02 | Schemas valid, additive owner, exit codes kept | `changes.ts`, `schemas/*.json` | `npm run schemas:check`, whole suite | conformant | `schemas:check` exit 0 |
| NFR-03 | Platforms; no process to build the block | `git-context.ts` (Git queried only for FR-08) | CRLF and LF tests | conformant | Windows driven; Linux and macOS not driven (limitation) |
| NFR-04 | Tests within 180 s | — | `npm run coverage` | conformant | Coverage run wall 115 s (vitest 112.19 s), 258 files, 1456 tests |
| OBJ-01 | After `init --yes` with every optional feature on, no ContextBrake-owned file in `git status` | `gitignore-plan.ts` | lifecycle test (block lines); real `git status` is TC-11 | conformant | Built CLI evidence above; `.claude/settings.local.json` is outside OBJ-01 by DEC-HIL-03 |
| OBJ-02 | List stays exact as options change | lifecycle | `init-gitignore-lifecycle.test.ts` | conformant | Built CLI `--no-auto-restart` run above |
| OBJ-03 | Bytes outside the block kept, also on a second run | `gitignore-block.ts` | `gitignore-block.test.ts`, `init-gitignore.test.ts` | conformant | Tests green |
| OBJ-04 | `--no-gitignore` writes no block, removes an existing one, persists | see FR-05 | lifecycle | conformant | Tests green; built CLI confirmed in codereview_01 |
| OBJ-05 | After `init` and `remove`, `.gitignore` equals the original | see FR-06 | `remove-gitignore.test.ts` | conformant | Built CLI confirmed (CRLF file above; LF file in codereview_01) |
| US-04 | Developer who committed the files is told how to stop tracking them | see FR-08 | `init-gitignore-tracked.test.ts` | conformant | Built CLI evidence under FR-08 |
| TC-11 | Built CLI in a real `git init` folder (QA run) | — | QA run | not verifiable | Belongs to the QA stage after this review (accepted by the caller). The ad hoc runs above are review evidence, not the QA run |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (30-line functions, 100-line files, 3 parameters) | OK | `npm run lint` exit 0; QA-08 sweep: no file above 100 lines (`gitignore-plan.ts` 93, `init-flow.ts` 77) |
| `javascript-typescript.md`, `node.md` | OK | `npm run typecheck` and `lint` exit 0; the new default runner is the existing `NodeProcessRunner` (`shell: false`) |
| `tests.md` | OK | 1456 tests in 112 s; new tests run in process; `init-gitignore-default-runner.test.ts` mocks `git-context.js` so no process starts |
| `file-changes.md` | OK | Plan before write, byte preservation, atomic apply through the existing applier; the rule text now covers the block in its intro, "Touch Only What ContextBrake Owns" first bullet and `remove` bullet (CR-03 of the previous review) |
| `cli-output.md` | OK | New findings in English, severity `ok`, same JSON document |
| `harness-adapters.md` | N/A | No adapter change |
| Hexagonal layering | OK | QA-04 sweep over `src/core/` returned no hit; Git code lives in `src/infrastructure/git/`; the runner default is chosen in `src/cli/init-flow.ts` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | TechSpec `rg` command over the 40 changed or new TypeScript files | 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | same | 0 | OK |
| QA-03 | No empty `catch` | blocking | same | 0 | OK |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | same, `src/core/` subset | 0 | OK |
| QA-05 | `exec`, `execSync`, `shell: true` | blocking | same | 0 | OK |
| QA-06 | `throw new Error(` | reservation | same | 1 of 1 (`tests/helpers/assistant-world.ts:44`) | pre-existing (present at `5c97f37`) |
| QA-07 | 4+ parameters in one declaration | reservation | same | 1 raw hit (`tests/integration/init-assistant-equivalence.test.ts:41`) | false positive: one destructured parameter `({ seed, answers, flags, git })`; not counted |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' ... \| awk -F: '$2 > 100'` | 0 | OK |

- Terrain baseline: applied from TechSpec (the listed files had no pre-existing hits; the baseline was not contradicted)
- Hits discounted by baseline: 1 (QA-06) plus 1 false positive (QA-07)
- Reservations accumulated in the feature: 0 from the profile; 1 optional improvement (CR-01, documentation)
- Suggested escalation: `no trigger fired` (0 of 8 reservations, no touched file above 200 lines, no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 derived list from realPath, plus the runtime state files (DEC-HIL-03) | YES | `gitignore-plan.ts:32-36,70-82`; built CLI block contents |
| DEC-02 markers, separator, EOL, malformed | YES | `gitignore-block.ts`; unit tests; CRLF run |
| DEC-03 removal and delete of empty file | YES | `gitignore-block.ts`; `remove-gitignore.test.ts` |
| DEC-04 `gitIgnore` key and merge | YES | `gitignore-merge.ts`, `configuration.ts`, schemas current |
| DEC-05 owner `gitignore`, `.gitignore` snapshot | YES | `changes.ts`, `snapshot-helper.ts`, `text.ts` |
| DEC-06 `isInsideGitWorkingTree` | YES | `git-context.ts:12-20` |
| DEC-07 tracked files through the runner | YES | `init-flow.ts:49-53` now defaults to `NodeProcessRunner`; built CLI reports the finding |
| DEC-08 assistant question | YES | `questions-gitignore.ts` |
| DEC-09 absorb `init.ts` and `installation-service.ts` | YES | `init.ts` 29 lines, `init-flow.ts` 77, `installation-service.ts` 89 |
| DEC-10 docs, rules, repository `.gitignore` | YES | README, AGENTS, `file-changes.md` done; the repository `.gitignore` keeps its manual lines (commit 5c97f37, accepted by the caller) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01..T06 | `done/task_01.md` .. `done/task_06.md` | COMPLETE | Unchanged from codereview_01; gates re-run green |
| Correction T01 (CR-01) | `codereview_01/done/task_01.md` | COMPLETE | `init-flow.ts` default runner; test `init-gitignore-default-runner.test.ts`; behavior reproduced on the built CLI |
| Correction T02 (CR-02) | `codereview_01/done/task_02.md` | COMPLETE | `runtimeStatePaths`; unit and lifecycle tests; reproduced on the built CLI |
| Correction T03 (CR-03) | `codereview_01/done/task_03.md` | COMPLETE | `file-changes.md` bullets amended; `readme-gitignore.test.ts` asserts both |

## Executed validations

- Profile and scope: CLI only; in-process suite plus the built CLI run in temporary `git init` folders outside the repository (scratchpad).
- Validated state: HEAD `5c97f37` plus the uncommitted worktree as found at review start (the `git status --porcelain` list was identical before and after the commands); Windows 11, Node 24.20.0, Git 2.56.0.windows.2. `dist/` rebuilt by `npm run build`.
- Reused evidence: none; every gate was re-run in this session.
- Manual acceptance: none required by the TechSpec (HIL 3 is the person's own repository).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run schemas:check` | passed (exit 0) | NFR-02 |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run lint` | passed (exit 0) | code rules |
| `npm run dependencies:check` | passed (exit 0) | supply chain |
| `npm run build` | passed (exit 0) | built CLI for the checks below |
| `npm run coverage` | passed: 258 files, 1456 tests, 94.78 % lines, 112.19 s (115 s wall) | FR-01..FR-10 (in process), NFR-04 |
| Built CLI, `git init` folder: `init --yes --auto-restart`, `git status --porcelain -uall`, block contents | block lists runtime state files; only user files and the accepted `settings.local.json` remain | FR-01, OBJ-01, CR-02 |
| Built CLI: `init --yes --dry-run --json` again; `init --yes --no-auto-restart` | 0 changes; block shrinks to 5 lines | FR-02, OBJ-02, NFR-01 |
| Built CLI: config and manifest committed with `git add -f`, `init --yes --json` | `GITIGNORE_TRACKED_FILES` with the exact command, exit 0 | FR-08, US-04, CR-01 |
| Built CLI with `PATH=""` | exit 0, no finding, no crash | FR-08 robustness |
| Built CLI: CRLF `.gitignore`, `init --yes`, `remove --yes`, `od -c` | bytes identical to the original | FR-06, OBJ-05 |
| TechSpec QA-01..QA-08 sweeps | no new hit | quality profile |
| `npm run test:budget` | not run separately: the coverage run of the same code measured 112 s against 180 s | NFR-04 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low (optional improvement) | FR-10, DEC-HIL-03 | `README.md:154` ("What is listed") names the configuration file, the manifest, and the manifest assets only; the block written by the built CLI also lists `/.context-brake/runtime/claude-mod-install.json` and `/.context-brake/runtime/claude-statusline.json` (DEC-HIL-03, `gitignore-plan.ts:70-82`). `readme-gitignore.test.ts` does not assert the runtime state files | The user documentation understates what the block contains; no behavior or requirement is affected | Add the runtime state files `init` writes under `.context-brake/runtime/` to the "What is listed" bullet and assert the sentence in `readme-gitignore.test.ts` |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 (High, tracked-files finding never fires in the shipped CLI) | resolved | `init-flow.ts:49-53` passes `env.runner ?? new NodeProcessRunner()`; `init-gitignore-default-runner.test.ts` drives `main()` with no runner; built CLI with a committed config reports `GITIGNORE_TRACKED_FILES` and the `git rm --cached` command, exit 0 |
| codereview_01/CR-02 (High, runtime state files visible in `git status`) | resolved | `gitignore-plan.ts:70-82`; PRD FR-01 and assumption note and TechSpec DEC-01 amended by DEC-HIL-03 (`workflow.md`); built CLI: the two runtime files are in the block and absent from `git status`; `.claude/settings.local.json` stays visible by the accepted decision |
| codereview_01/CR-03 (Low, `file-changes.md` section not amended) | resolved | `.agents/rules/file-changes.md:17,20` name the block; `readme-gitignore.test.ts` asserts both bullets |

## Limitations and open items

- TC-11 (the QA run in a real `git init` folder) is `not verifiable` here by agreement and belongs to the QA stage. The built-CLI runs in this report are review evidence only.
- Source drift to resolve in the authoring session: the sha256 values stored in `checkpoint.json` `approved_sources` for `prd.md` (`66e6a32a…`) and `techspec.md` (`cba6c08e…`) do not match the files on disk (`27a7847a…`, `b1a18295…`). The change is the DEC-HIL-03 clarification recorded in `workflow.md`; only `tasks.md` still matches. This review did not edit the checkpoint. The TechSpec header's own `sha256 05e02d38…` for the PRD is stale as well.
- Linux and macOS are not driven; Windows with a junction passes, an MSYS symlink does not resolve (documented in `done/task_06.md`, accepted).
- The repository's own `.gitignore` keeping manual ContextBrake lines (commit `5c97f37`) and the `.claude/settings.local.json` exclusion from OBJ-01 (DEC-HIL-03) are accepted and not counted as findings.
- `npm run test:budget` was not run separately; NFR-04 rests on the 112 s coverage run of the same code.
- Temporary folders for the built-CLI runs live under the session scratchpad, outside the repository; `dist/` and `coverage/` were regenerated by the commands above. The repository worktree status list was identical before and after the review commands.

## Conclusion

All three findings of codereview_01 are resolved with evidence on the built CLI and in the suite: the tracked-files finding now reaches real users, the block covers the runtime state files so that only user files and the deliberately excluded `.claude/settings.local.json` remain in `git status`, and the ownership rule text matches the shipped behavior. Every obligation is conformant, all gates are green, no quality-profile hit was introduced, and the only new item is an optional README wording improvement (CR-01, Low). TC-11 stays with the QA stage. Status: APPROVED WITH RESERVATIONS.
