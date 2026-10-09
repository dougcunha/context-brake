# Code review report — init keeps ContextBrake's own files out of Git (prd-17), re-review 3

## Summary

- Status: APPROVED
- Execution: delegated reviewer
- Git scope: `5c97f37..current worktree` (HEAD equals the base, so the scope is the uncommitted tracked changes plus the untracked prd-17 files; the foreign folders `.agents/skills/chat-clean/` and `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` are excluded; `tasks/triage-log.jsonl` is the triage record, not code). Since codereview_03 (written 2026-10-09 17:57), a `find -newer codereview_03/codereview.md` over the repository (excluding `node_modules`, `.git`, `dist`, `coverage`) lists only `README.md`, `tests/unit/readme-gitignore.test.ts`, the feature's SDD state files (`checkpoint*.json`, `workflow.md`, `context-snapshot.md`, `codereview_03/done/task_01.md`), and ContextBrake's own session ledgers under `.context-brake/runtime/sessions/`. No file under `src/`, `schemas/`, or `scripts/` changed.
- Previous review: `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_03/codereview.md` (APPROVED WITH RESERVATIONS; correction in `codereview_03/done/task_01.md`)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md` | read; sha256 `27a7847a…2b592` matches `checkpoint.json` `approved_sources` |
| TechSpec | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md` | read; sha256 `b1a18295…484d3` matches the checkpoint |
| Manifest | `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/tasks.md` | read; sha256 `6f1d3e93…e29` matches; T01..T06 `[x]`, every link resolves to `done/task_0N.md` |
| Handoffs | `done/task_01.md` .. `task_06.md`, `codereview_01/done/task_01.md` .. `task_03.md`, `codereview_02/done/task_01.md`, `codereview_03/done/task_01.md` | read; zero open work items (`- [ ]`) in every file; every handoff filled |
| Previous review and corrections | `codereview_03/codereview.md`, `codereview_03/done/task_01.md` | read |
| Workflow, checkpoint | `workflow.md`, `checkpoint.json` | read, not edited; DEC-HIL-05 (correct codereview_03/CR-01) and the completion of `codereview_03/done/task_01.md` are logged |
| Snapshot | `context-snapshot.md` | under 8 KiB, read whole per `load.md` step 1; only the header, next step brief, `Open threads`, and the `on-run` entry L-02 were used. `Decisions` (D-01), L-01, and L-03 were not relied on: the three runtime state files were derived from PRD line 90 and the constants in `src/` (`auto-restart-ownership.ts:10`, `statusline-state.ts:5`, `statusline-default.ts:8`). Header `git_head` 5c97f37 matches HEAD; `covers_through` (codereview_03, reservations HIL pending) is behind the stage source (DEC-HIL-05 answered, `codereview_03/done/task_01.md` complete), so the next step brief was treated as stale |
| Implementation | `git diff 5c97f37` plus untracked files from `git status` | delimited (40 changed or new TypeScript files swept, plus README, AGENTS, rules, schemas, prd-12 notes) |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | One anchored line per owned file: config, manifest, manifest assets, plus the runtime state files `init` writes (DEC-HIL-03) | `gitignore-plan.ts:32-36` (`ownedPathsFor`), `:79-93` (`runtimeStatePaths`, `planGitIgnoreForInstall`) | `gitignore-plan.test.ts`, `init-gitignore.test.ts`, `init-gitignore-lifecycle.test.ts` | conformant | Built CLI rerun here, `git init` folder, `init --yes --no-statusline-bridge`: block lists both hook scripts, manifest, `/.context-brake/runtime/claude-statusline-opt-out.json`, config. The `--auto-restart` run of codereview_03 (mod files, `claude-mod-install.json`, `claude-statusline.json`) is reused: `src/` unchanged |
| FR-02 | Rebuilt from the manifest; second run plans nothing | `gitignore-block.ts`, `gitignore-plan.ts:67-75` | `init-gitignore-lifecycle.test.ts`, `gitignore-block.test.ts` | conformant | Suite green; codereview_03 built-CLI second-run evidence reused |
| FR-03 | Harness config files never listed; symlinked harness folder names the target | `gitignore-plan.ts:27-36,86-88` | `gitignore-plan.test.ts`, `init-gitignore.test.ts` (junction) | conformant | Built CLI here: `.claude/settings.json` is not in the block; junction test green |
| FR-04 | Planned change in `--dry-run`/`--json`; bytes outside markers kept; create when missing; malformed markers = conflict | `gitignore-block.ts`, `gitignore-plan.ts:67-75`, `installation-service.ts` | `gitignore-block.test.ts`, `init-gitignore.test.ts`, `init-gitignore-lifecycle.test.ts` | conformant | Built CLI here: block appended after `node_modules/` with one blank line; suite green |
| FR-05 | `--gitignore` / `--no-gitignore`, stored as `gitIgnore:false` only when off | `gitignore-merge.ts`, `init-arguments.ts`, `init-option-rules.ts`, `init-config-updates.ts`, `configuration.ts` | `gitignore-merge.test.ts`, lifecycle test | conformant | Suite green; codereview_03 built-CLI opt-out/opt-in runs reused |
| FR-06 | `remove` deletes the block, rest unchanged, deletes a block-only file | `removal-service.ts:53-62`, `gitignore-block.ts:43-52` | `remove-gitignore.test.ts` | conformant | Built CLI here: after `init` and `remove --yes`, `.gitignore` is exactly `node_modules/\n` (`od -c`) |
| FR-07 | Outside Git: no `.gitignore`, `GITIGNORE_NO_GIT` | `git-context.ts:12-20`, `gitignore-plan.ts:68` | `init-gitignore.test.ts` | conformant | Suite green; codereview_03 built-CLI run reused |
| FR-08 | Tracked file yields `GITIGNORE_TRACKED_FILES` with the `git rm --cached` command; exit code unchanged | `init-flow.ts:50-54`, `git-context.ts:22-27`, `gitignore-findings.ts` | `init-gitignore-tracked.test.ts`, `init-gitignore-default-runner.test.ts` | conformant | Suite green; codereview_03 built-CLI run reused |
| FR-09 | Assistant question, preselected, flag only when it differs, printed command reproduces the plan | `questions-gitignore.ts`, `questions-misc.ts`, `summary.ts`, `assistant-context.ts` | `assistant-questions-gitignore.test.ts`, `init-assistant-equivalence.test.ts` | conformant | Suite green |
| FR-10 | Docs and rules updated; old statements gone; README names what the block lists | `README.md:29,125,145-160`, `AGENTS.md:39`, `.agents/rules/file-changes.md:9`, prd-12 supersede notes (`prd.md:51`, `techspec.md:145`) | `readme-gitignore.test.ts:11-28` | conformant | `README.md:154` names `claude-mod-install.json`, `claude-statusline.json`, and `claude-statusline-opt-out.json` (when the bridge is off), matching PRD line 90 and the built CLI; search for the old "never edits/does not touch `.gitignore`" statements returns only the negative assertions; README has 0 CR bytes |
| NFR-01 | Plan before write, atomic write, idempotent, byte preservation | `gitignore-block.ts`; existing applier | `gitignore-block.test.ts`, lifecycle test | conformant | Suite green; round trip identical here |
| NFR-02 | Schemas valid, additive owner, exit codes kept | `changes.ts`, `schemas/*.json` | `npm run schemas:check`, suite | conformant | `schemas:check` exit 0; `npm run build` left `git status --porcelain` unchanged |
| NFR-03 | Platforms; no process to build the block | `git-context.ts` | CRLF and LF tests | conformant | Windows driven; Linux and macOS not driven (limitation) |
| NFR-04 | Tests within 180 s | — | `npm run coverage` | conformant | Coverage: 258 files, 1457 tests, Vitest duration 106.65 s, 110 s wall |
| OBJ-01 | After `init --yes`, no ContextBrake-owned file in `git status` | `gitignore-plan.ts` | lifecycle test; real `git status` is TC-11 | conformant | Built CLI here: `git status --porcelain -uall` shows only `.claude/settings.json` (harness file `init` edits, FR-03) and `.gitignore`; codereview_03 every-feature-on run reused |
| OBJ-02 | List stays exact as options change | lifecycle | `init-gitignore-lifecycle.test.ts` | conformant | Suite green |
| OBJ-03 | Bytes outside the block kept, also on a second run | `gitignore-block.ts` | `gitignore-block.test.ts`, `init-gitignore.test.ts` | conformant | Suite green; codereview_03 CRLF built-CLI run reused |
| OBJ-04 | `--no-gitignore` writes no block, removes an existing one, persists | see FR-05 | lifecycle | conformant | see FR-05 |
| OBJ-05 | After `init` and `remove`, `.gitignore` equals the original | see FR-06 | `remove-gitignore.test.ts` | conformant | Built CLI here: byte-identical; no-final-newline edge as clarified at HIL 2 (OI-01) |
| US-04 | Developer who committed the files is told how to stop tracking them | see FR-08 | `init-gitignore-tracked.test.ts` | conformant | see FR-08 |
| TC-11 | Built CLI in a real `git init` folder (QA run) | — | QA run | not verifiable | Belongs to the QA stage after this review; the built-CLI runs here are review evidence, not the QA run |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (30-line functions, 100-line files, 3 parameters) | OK | `npm run lint` exit 0; QA-08 sweep: no file above 100 lines (largest: `init-gitignore-lifecycle.test.ts` 100, `gitignore-plan.test.ts` 95, `gitignore-plan.ts` 93) |
| `javascript-typescript.md`, `node.md` | OK | `npm run typecheck` and `lint` exit 0; QA-05 sweep clean |
| `tests.md` | OK | 1457 tests in process within the budget; the changed test is a text assertion naming FR-10, DEC-HIL-03, CR-01 |
| `file-changes.md` | OK | Rule text names the block (`file-changes.md:9`); behavior unchanged since codereview_03 |
| `cli-output.md` | OK | No output change since codereview_03 |
| `harness-adapters.md` | N/A | No adapter change |
| Hexagonal layering | OK | QA-04 sweep over the `src/core/` subset returned no hit |
| README stays LF | OK | `grep -c $'\r' README.md` = 0 |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | TechSpec `rg` command over the 40 changed or new TypeScript files | 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | same | 0 | OK |
| QA-03 | No empty `catch` | blocking | same | 0 | OK |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | same, `src/core/` subset | 0 | OK |
| QA-05 | `exec`, `execSync`, `shell: true` | blocking | same | 0 | OK |
| QA-06 | `throw new Error(` | reservation | same | 1 of 1 (`tests/helpers/assistant-world.ts:44`) | pre-existing: `git show 5c97f37:tests/helpers/assistant-world.ts` has it at line 43 |
| QA-07 | 4+ parameters in one declaration | reservation | same (`rg -P`) | 1 raw hit (`tests/integration/init-assistant-equivalence.test.ts:41`) | false positive: one destructured parameter `({ seed, answers, flags, git })`; not counted |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' ... \| awk -F: '$2 > 100'` | 0 | OK |

- Terrain baseline: applied from TechSpec (the listed files had no pre-existing hits; not contradicted)
- Hits discounted by baseline: 1 (QA-06, verified at base) plus 1 false positive (QA-07)
- Reservations accumulated in the feature: 0
- Suggested escalation: `no trigger fired` (0 of 8 reservations, no touched file above 200 lines, no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 derived list from realPath, plus runtime state files (DEC-HIL-03), escapes | YES | `gitignore-plan.ts:23-36,77-93`; built-CLI block above |
| DEC-02 markers, separator, EOL, malformed | YES | `gitignore-block.ts`; suite green |
| DEC-03 removal and delete of empty file | YES | `gitignore-block.ts:43-52`; built-CLI round trip |
| DEC-04 `gitIgnore` key and merge | YES | `gitignore-merge.ts`, `configuration.ts`; `schemas:check` exit 0 |
| DEC-05 owner `gitignore`, `.gitignore` snapshot | YES | `changes.ts`, `snapshot-helper.ts`, `text.ts` |
| DEC-06 `isInsideGitWorkingTree` | YES | `git-context.ts:12-20` |
| DEC-07 tracked files through the runner | YES | `init-flow.ts:52` |
| DEC-08 assistant question | YES | `questions-gitignore.ts` |
| DEC-09 absorb `init.ts` and `installation-service.ts` | YES | `init.ts` delegates to `init-flow.ts`; QA-08 clean |
| DEC-10 docs, rules, repository `.gitignore` | YES | README, AGENTS, `file-changes.md`, prd-12 notes; the repository `.gitignore` keeps its manual lines (commit 5c97f37, accepted, snapshot O-02) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01..T06 | `done/task_01.md` .. `done/task_06.md` | COMPLETE | Handoffs filled; gates re-run green in this review |
| codereview_01 corrections T01..T03 | `codereview_01/done/task_01.md` .. `task_03.md` | COMPLETE | Code unchanged since codereview_03, which confirmed them on the built CLI |
| codereview_02 correction T01 | `codereview_02/done/task_01.md` | COMPLETE | Superseded in content by the codereview_03 correction (same bullet) |
| codereview_03 correction T01 (CR-01) | `codereview_03/done/task_01.md` | COMPLETE | `README.md:154` names the 3 files and the bridge-off condition; `readme-gitignore.test.ts:18-20` asserts it; the rest of the bullet is unchanged; README LF. The handoff skipped `npm run coverage`; this review ran it (green) |

## Executed validations

- Profile and scope: CLI only; in-process suite plus the built CLI in a temporary `git init` folder under the session scratchpad.
- Validated state: HEAD `5c97f37` plus the uncommitted worktree as found at review start; Windows 11, Node 24.20.0, Git 2.56.0.windows.2. `dist/` and `coverage/` regenerated; build ran after coverage finished. `git status --porcelain` was identical before and after the review commands (51 lines; the `.context-brake/runtime/sessions/` ledgers written by ContextBrake's own hooks do not appear in it).
- Reused evidence: codereview_03's built-CLI runs for `--auto-restart` contents, second-run idempotency, CRLF round trip, opt-out/opt-in, tracked-files finding, and outside-Git finding (FR-01, FR-02, FR-04, FR-05, FR-07, FR-08, OBJ-01..05). Reuse is valid because no file under `src/`, `schemas/`, or `scripts/` changed since that report, on the same platform and environment. `npm run test:budget` (118.6 s in codereview_03) was not rerun: the only test change is one string literal, and the coverage run here (106.65 s) also covers NFR-04.
- Manual acceptance: none required by the TechSpec (HIL 3 is the person's own repository).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run schemas:check` | passed (exit 0) | NFR-02 |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run lint` | passed (exit 0) | code rules |
| `npm run dependencies:check` | passed (exit 0) | supply chain |
| `npm test -- tests/unit/readme-gitignore.test.ts` | passed: 3 tests | FR-10, codereview_03/CR-01 |
| `npm run coverage` | passed: 258 files, 1457 tests, 94.78 % lines, 106.65 s (110 s wall) | FR-01..FR-10 in process, NFR-04 |
| `npm run build` | passed (exit 0); worktree status unchanged | built CLI, NFR-02 |
| Built CLI, `git init` folder with `node_modules/\n`: `init --yes --no-statusline-bridge`, block contents, `git status --porcelain -uall`, `remove --yes`, `od -c .gitignore` | block lists `/.context-brake/runtime/claude-statusline-opt-out.json` among the owned files; only `.claude/settings.json` and `.gitignore` untracked; `.gitignore` back to `node_modules/\n` | FR-01, FR-03, FR-06, FR-10 (README claim), OBJ-01, OBJ-05 |
| TechSpec QA-01..QA-08 sweeps | no new hit | quality profile |
| Repository search for the old "never touches `.gitignore`" statements | only the negative test assertions | FR-10 |

## Findings

None.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_03/CR-01 (Low, README names 2 of the 3 runtime state files) | resolved | `README.md:154` names `claude-mod-install.json`, `claude-statusline.json`, and `claude-statusline-opt-out.json` (when the status line bridge is off); `readme-gitignore.test.ts:18-20` asserts that exact sentence, which contains `claude-statusline-opt-out.json` and therefore cannot match the two-file text quoted in codereview_03; the built CLI lists that file under `--no-statusline-bridge` |
| codereview_02/CR-01 (Low, README omits the runtime state files) | resolved | Same bullet and test as above |
| codereview_01/CR-01, CR-02, CR-03 | resolved (unchanged code) | No `src/` change since codereview_03, which confirmed them on the built CLI; `file-changes.md:9` names the block; the runtime state line appears in the block above |

## Limitations and open items

- TC-11 (the QA run in a real `git init` folder) is `not verifiable` here and belongs to the QA stage; the built-CLI runs in this report are review evidence only.
- Linux and macOS are not driven; Windows with a junction passes; an MSYS symlink for a harness folder does not resolve (documented in `done/task_06.md`, accepted).
- Accepted, not findings: `.claude/settings.local.json` and `.claude/settings.json` (harness files `init` only edits) stay visible in `git status` (FR-03, DEC-HIL-03); the repository's own `.gitignore` keeps manual ContextBrake lines (commit `5c97f37`); a `.gitignore` without final newline keeps the added break after `remove` (HIL 2, OI-01).
- Source consistency: the TechSpec header's PRD hash `05e02d38…f73bd` is still stale (actual `27a7847a…`); a note for the authoring session, not an implementation finding. The checkpoint hashes match all three sources.
- Workflow and snapshot state, for the authoring session to record (this review edited neither): `workflow.md` now logs DEC-HIL-05 and the completion of `codereview_03/done/task_01.md` (the gap noted in codereview_03 is resolved); `context-snapshot.md` still has `covers_through: codereview_03` with the reservations HIL as the next step.
- Temporary folders for the built-CLI runs live under the session scratchpad, outside the repository.

## Conclusion

The correction of codereview_03/CR-01 is in place: the README bullet names all three runtime state files of the PRD clarification, its test pins that wording, and the built CLI confirms the opt-out marker appears in the block. No source code changed since codereview_03; every gate was rerun green (schemas, typecheck, lint, dependency scripts, coverage with 1457 tests, build) and the quality profile shows no new hit and zero accumulated reservations. Every obligation is conformant except TC-11, which belongs to the QA stage by plan. Status: APPROVED.
