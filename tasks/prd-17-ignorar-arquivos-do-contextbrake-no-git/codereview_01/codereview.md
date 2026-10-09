# Code review report — init keeps ContextBrake's own files out of Git (prd-17)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `5c97f37..current worktree` (uncommitted tracked changes plus the untracked prd-17 files; the foreign folders `.agents/skills/chat-clean/` and `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` are excluded)
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md` | read |
| TechSpec | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md` | read |
| Manifest | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/tasks.md` | read; T01..T06 all `[x]`, every link resolves to `done/task_0N.md` |
| Handoffs | `done/task_01.md` .. `done/task_06.md` | read |
| Workflow and checkpoint | `workflow.md`, `checkpoint.json` | read (not edited) |
| Snapshot | `context-snapshot.md` | loaded under the independent-stage filter (see limitations) |
| Implementation | `git diff 5c97f37` plus untracked files listed in `git status` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | One anchored line per owned file (config, manifest, manifest assets) | `gitignore-plan.ts:32-36` (`ownedPathsFor`), `:81-84`; `installation-service.ts:83` | `gitignore-plan.test.ts`, `init-gitignore.test.ts` | conformant | Built CLI in a real `git init` folder with `--auto-restart`: block lists the 2 hook scripts, `.context-brake/.gitignore`, 4 mod files, manifest, config; none of those shows in `git status` |
| FR-02 | Block rebuilt from the manifest, removed when empty, second run plans nothing | `gitignore-block.ts:54-63`, `gitignore-plan.ts:67-75` | `init-gitignore-lifecycle.test.ts`, `gitignore-block.test.ts` | conformant | Built CLI: `init --yes --dry-run --json` after init plans 0 changes; tests green |
| FR-03 | Harness config files never listed; symlinked harness folder names the link target | `gitignore-plan.ts:27-30,77-79` | `gitignore-plan.test.ts`, `init-gitignore.test.ts` (junction) | conformant | Block has no `.claude/settings*.json`; junction test passes. MSYS symlink case is a known, documented limitation (task_06) |
| FR-04 | Planned change in `--dry-run`/`--json`, bytes outside markers kept, create when missing, malformed markers = conflict, file untouched | `gitignore-block.ts`, `gitignore-plan.ts:46-75`, `installation-service.ts:83-88` | `gitignore-block.test.ts`, `init-gitignore.test.ts`, `init-gitignore-lifecycle.test.ts` | conformant | Tests green; owner `gitignore` appears in the plan |
| FR-05 | `--gitignore`/`--no-gitignore`, stored as `gitIgnore:false` only when off, default on | `gitignore-merge.ts`, `init-arguments.ts`, `init-config-updates.ts`, `configuration.ts` | `gitignore-merge.test.ts`, `init-gitignore-lifecycle.test.ts` | conformant | Built CLI: `init --yes --no-gitignore` removed the block and deleted the block-only `.gitignore`; config holds `"gitIgnore": false` |
| FR-06 | `remove` deletes the block, rest unchanged, deletes the file if empty | `removal-service.ts:53-62`, `gitignore-block.ts:43-52` | `remove-gitignore.test.ts` | conformant | Built CLI: after init then remove, `.gitignore` equals the original `node_modules/\n` |
| FR-07 | Outside Git: no `.gitignore`, `GITIGNORE_NO_GIT` | `git-context.ts:12-20`, `gitignore-plan.ts:68` | `init-gitignore.test.ts:48` | conformant | Test green |
| FR-08 | A tracked listed file yields `GITIGNORE_TRACKED_FILES` with the `git rm --cached` command | `init-flow.ts:49-53`, `git-context.ts:22-27` | `init-gitignore-tracked.test.ts` (stub runner only) | non-conformant | See CR-01: the shipped CLI never injects a `ProcessRunner`, so the finding cannot appear. Built CLI with `context-brake.config.json` committed: findings were only `AUTO_RESTART_MODE`, no `GITIGNORE_TRACKED_FILES` |
| FR-09 | Assistant question, preselected, flag only when it differs, printed command reproduces the plan | `questions-gitignore.ts`, `questions-misc.ts`, `summary.ts`, `assistant-context.ts` | `assistant-questions-gitignore.test.ts`, `init-assistant-equivalence.test.ts` (3 Git scenarios) | conformant | Tests green |
| FR-10 | Docs and rules updated, README documents both flags | `README.md`, `AGENTS.md`, `.agents/rules/file-changes.md`, prd-12 notes | `readme-gitignore.test.ts` | conformant | See CR-03 (Low) for one rule paragraph left unchanged |
| NFR-01 | Plan before write, atomic write, idempotent, byte preservation | `gitignore-block.ts`; existing applier | `gitignore-block.test.ts`, lifecycle test | conformant | Round-trip and idempotence tests green |
| NFR-02 | Schemas valid, additive owner, exit codes kept | `changes.ts`, `schemas/*.json` | `npm run schemas:check`, whole suite | conformant | `schemas:check` exit 0 |
| NFR-03 | Platforms; no process to build the block | `git-context.ts` (Git queried only for FR-08) | CRLF and LF tests | conformant | Windows run; Linux and macOS not driven (limitation) |
| NFR-04 | Tests within 180 s | — | `npm run coverage` | conformant | Coverage run wall 112.5 s, 1452 tests |
| OBJ-01 | After `init --yes` with every optional feature on, `git status --porcelain` lists no ContextBrake-owned file | `gitignore-plan.ts` (list limited to config, manifest, manifest assets) | none runs real `git status` (TC-11 is QA) | non-conformant | See CR-02: real `git status -uall` after `init --yes --auto-restart` still lists `.context-brake/runtime/claude-mod-install.json`, `.context-brake/runtime/claude-statusline.json`, and `.claude/settings.local.json` |
| OBJ-02 | List stays exact as options change | lifecycle | `init-gitignore-lifecycle.test.ts` | conformant | Tests green |
| OBJ-03 | Bytes outside the block kept, also on a second run | `gitignore-block.ts` | `gitignore-block.test.ts`, `init-gitignore.test.ts:25` | conformant | Tests green |
| OBJ-04 | `--no-gitignore` writes no block, removes the existing one, persists | see FR-05 | lifecycle | conformant | Built CLI confirmed |
| OBJ-05 | After `init` and `remove`, `.gitignore` equals the original | see FR-06 | `remove-gitignore.test.ts` | conformant | Built CLI confirmed for a file ending with a line break |
| US-04 | Developer who already committed the files is told how to stop tracking them | see FR-08 | — | non-conformant | Same cause as CR-01 |
| TC-11 | Built CLI in a real `git init` folder | — | QA run | not verifiable | Belongs to the later QA run (accepted by the caller). The ad hoc runs above are review evidence, not the QA run |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (30-line functions, 100-line files, 3 parameters) | OK | `npm run lint` exit 0; QA-08 sweep: no file above 100 lines; QA-07 one false positive (below) |
| `javascript-typescript.md`, `node.md` | OK | `npm run typecheck` exit 0; `lint` exit 0 |
| `tests.md` | OK | 1452 tests pass in 112.5 s; new tests run in process |
| `file-changes.md` | OK | Plan before write, byte preservation, atomic apply through the existing applier; the rule text itself is only partly amended (CR-03) |
| `cli-output.md` | OK | New findings in English, severity `ok`, same JSON document |
| `harness-adapters.md` | N/A | No adapter change |
| Hexagonal layering | OK | QA-04 sweep over `src/core/` returned no hit; Git code lives in `src/infrastructure/git/` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | TechSpec `rg` command over the 37 changed or new TypeScript files | 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | same | 0 | OK |
| QA-03 | No empty `catch` | blocking | same | 0 | OK |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | same, `src/core/` subset | 0 | OK |
| QA-05 | `exec`, `execSync`, `shell: true` | blocking | same | 0 | OK |
| QA-06 | `throw new Error(` | reservation | same | 1 of 1 (`tests/helpers/assistant-world.ts:44`) | pre-existing (present at `5c97f37`, line 43) |
| QA-07 | 4+ parameters in one declaration | reservation | same | 1 raw hit (`tests/integration/init-assistant-equivalence.test.ts:41`) | false positive: one destructured parameter `({ seed, answers, flags, git })`; not counted |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' ... \| awk -F: '$2 > 100'` | 0 | OK |

- Terrain baseline: applied from TechSpec (the listed files had no pre-existing hits; the baseline was not contradicted)
- Hits discounted by baseline: 1 (QA-06) plus 1 false positive (QA-07)
- Reservations accumulated in the feature: 0
- Suggested escalation: `no trigger fired` (0 of 8 reservations, no touched file above 200 lines, no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 derived list from realPath | YES | `gitignore-plan.ts:32-36,77-79` |
| DEC-02 markers, separator, EOL, malformed | YES | `gitignore-block.ts:9-63`; tests for LF, CRLF, no final newline, repeated and misplaced markers |
| DEC-03 removal and delete of empty file | YES | `gitignore-block.ts:43-52`; `gitignore-plan.ts:46-49` |
| DEC-04 `gitIgnore` key and merge | YES | `gitignore-merge.ts`, `configuration.ts`, schemas current |
| DEC-05 owner `gitignore`, `.gitignore` snapshot | YES | `changes.ts:5`, `snapshot-helper.ts:23`, `text.ts` |
| DEC-06 `isInsideGitWorkingTree` | YES | `git-context.ts:12-20` |
| DEC-07 tracked files through the injected runner | PARTIAL | Implemented, but the production composition never injects a runner (CR-01) |
| DEC-08 assistant question | YES | `questions-gitignore.ts` |
| DEC-09 absorb `init.ts` and `installation-service.ts` | YES | `init.ts` 29 lines, `init-flow.ts` 76, `installation-service.ts` 89 |
| DEC-10 docs, rules, repository `.gitignore` | PARTIAL | README and AGENTS done; `file-changes.md` "Touch Only What ContextBrake Owns" not amended (CR-03); the repository `.gitignore` keeps its manual lines (documented limitation in `done/task_06.md`, accepted by the caller) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Block module and 17 tests; reproduced green |
| T02 | `done/task_02.md` | COMPLETE | Flags, key, owner, schemas; `schemas:check` reproduced |
| T03 | `done/task_03.md` | COMPLETE with a gap | Plan, Git facts, extraction delivered; its "tracked finding" acceptance holds only with an injected runner (CR-01) |
| T04 | `done/task_04.md` | COMPLETE | `remove` block removal, 4 tests |
| T05 | `done/task_05.md` | COMPLETE | Assistant question, 3 equivalence scenarios |
| T06 | `done/task_06.md` | COMPLETE | T06.4 deviation (repository `.gitignore` keeps manual lines) is documented and accepted |

## Executed validations

- Profile and scope: CLI only; in-process suite plus the built CLI run in temporary `git init` folders outside the repository.
- Validated state: HEAD `5c97f37` plus the uncommitted worktree as found at review start; Windows 11, Node 24.20.0, Git 2.56.0.windows.2. `dist/` rebuilt by `npm run build`.
- Reused evidence: none; every gate was re-run in this session.
- Manual acceptance: none required by the TechSpec (HIL 3 is the person's own repository).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run schemas:check` | passed (exit 0) | NFR-02 |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run lint` | passed (exit 0) | code rules |
| `npm run dependencies:check` | passed (exit 0) | supply chain |
| `npm run coverage` | passed: 257 files, 1452 tests, 94.77 % lines, 112.5 s | FR-01..FR-10 (in process), NFR-04 |
| `npm run build` | passed (exit 0) | built CLI for the checks below |
| Built CLI, `git init` folder: `init --yes`, `git status`, `remove --yes` | block written; `.gitignore` restored by `remove` | FR-01, FR-06, OBJ-05 |
| Built CLI, `init --yes --auto-restart`, `git status --porcelain -uall` | 3 untracked ContextBrake-created files remain | OBJ-01 (fails, CR-02) |
| Built CLI, config force-tracked, `init --yes --json` | no `GITIGNORE_TRACKED_FILES` | FR-08 (fails, CR-01) |
| Built CLI, `init --yes --dry-run --json` twice; `init --yes --no-gitignore` | 0 changes on the second run; opt-out removes block and stores `gitIgnore:false` | FR-02, FR-05, NFR-01 |
| TechSpec QA-01..QA-08 sweeps | no new hit | quality profile |
| `npm run test:budget` | not re-run: the coverage run of the same code measured 112.5 s | NFR-04 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | FR-08, US-04, DEC-07, T03 | `src/cli/main.ts:29-32` and `src/cli/composition-root.ts:53-54` build the `CommandEnv` without a `runner`; `src/cli/init-flow.ts:51` passes `env.runner` and `src/infrastructure/git/git-context.ts:23` returns `[]` when it is `undefined`. Built CLI: after `git add -f context-brake.config.json` and commit, `init --yes --json` reported only `AUTO_RESTART_MODE`. All tests inject a runner (`tests/helpers/gitignore-world.ts:runnerListing`) | The tracked-files finding and the `git rm --cached` command never reach a real user, so a person who already committed the files gets no guidance and the ignore rule has no effect. The acceptance of T03 and TC-07 passes only on stubs | Default the Git query to a real runner in the CLI layer, as `statusline-diagnostics.ts:62` does with `context.runner ?? new NodeProcessRunner()`, and add a test that drives `main()` without `overrides.runner` (or an e2e smoke) against a folder with a committed config |
| CR-02 | High | OBJ-01, FR-01 assumption, TC-11 | Built CLI, folder created with `git init`, `init --yes --auto-restart`, `git status --porcelain -uall` lists `.context-brake/runtime/claude-mod-install.json`, `.context-brake/runtime/claude-statusline.json` (constants at `auto-restart-ownership.ts:10`, `statusline-state.ts:5`), and `.claude/settings.local.json`. The PRD assumption that the manifest lists every file created in full is false for the two runtime state files (not manifest assets, no `.context-brake/runtime/.gitignore` is written by `init`) | OBJ-01 ("no ContextBrake-owned file in `git status` after `init` with every optional feature on") and the TC-11 expectation fail; the files only become ignored once a hook writes the runtime `.gitignore` | Cause proven for the two runtime files; the fix changes PRD scope, so it needs a decision: list these two runtime-state files in the block, or have `init` write `.context-brake/runtime/.gitignore` (`*`), or amend OBJ-01. `.claude/settings.local.json` is excluded on purpose by FR-03; the PRD should state that OBJ-01 does not cover it |
| CR-03 | Low | FR-10, DEC-10 | `.agents/rules/file-changes.md:15-20` ("Touch Only What ContextBrake Owns") still says ContextBrake changes only harness entries and manifest files and that `remove` deletes only manifest assets, config, manifest, and runtime files; only the first paragraph (line 9) mentions the block | The rule reads inconsistently with the shipped behavior; DEC-10 asked for both places | Add the managed block to that section's first and last bullets |

## Previous findings (re-review only)

Not applicable (first review).

## Limitations and open items

- Snapshot filter: `context-snapshot.md` is under 8 KiB, so it was read whole in one call; its `Decisions` and `Learnings` entries were disregarded and nothing in them was relied on. The header and the next step brief matched the checkpoint (`git_head` 5c97f37, worktree as described).
- TC-11 (real `git status` in a `git init` folder through the QA run) is `not verifiable` here by agreement. The built-CLI runs in this report are review evidence only. Note that CR-02 predicts TC-11 will fail on its "no ContextBrake file listed as untracked" expectation unless a decision is taken first.
- Linux and macOS are not driven; Windows with a junction passes, an MSYS symlink does not resolve (documented in `done/task_06.md`, accepted).
- The repository's own `.gitignore` keeping manual ContextBrake lines (commit `5c97f37`) is accepted by the caller and not counted as a finding.
- `npm run test:budget` was not run separately; NFR-04 rests on the 112.5 s coverage run of the same code.
- Temporary folders created for the built-CLI runs live under the session scratchpad, outside the repository; `dist/` and `coverage/` were regenerated by the commands above.

## Conclusion

The implementation is solid in its core: the pure block module, the plan, the opt-out, `remove`, the assistant question, the schemas, and the docs are conformant, all gates are green, and no new quality-profile hit was introduced. Two obligations are not met by the shipped CLI: FR-08 (the tracked-files finding cannot fire because no `ProcessRunner` is injected in production, CR-01) and OBJ-01 (real `git status` still lists ContextBrake-created runtime files after `init`, CR-02). A non-conformant obligation makes the status REJECTED. After CR-01 is fixed, CR-02 is decided, and CR-03 is closed, a re-review by a new reviewer should be quick, followed by the QA run for TC-11.
