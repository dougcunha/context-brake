# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md`
2. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — `init` plans the block

## Outcome

`init` in a Git working tree plans one change on the root `.gitignore` listing the files ContextBrake owns, rebuilt from the manifest on every run, honouring the opt-out, skipped with an informational finding outside Git, and reporting tracked files without touching the index. `init.ts` stays within the line limit.

## Dependencies and boundaries

- Depends on: T01, T02
- Unblocks: T04, T05, T06
- In scope: `gitignore-plan.ts` (`ignoreLinesFor`, `planGitIgnore`), the call in `installation-service.ts`, `git-context.ts` (`isInsideGitWorkingTree`, `trackedOwnedFiles`), `.gitignore` in `collectProjectSnapshots`, the extraction of `init-flow.ts`, the wiring and the findings.
- Out of scope: `remove` (T04), the assistant (T05), docs (T06).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, FR-03 | `prd.md#functional-requirements` | Lines, rebuild, owned files only, symlink path |
| FR-04 | `prd.md#functional-requirements` | Plan, preview, confirmation, malformed conflict |
| FR-05 | `prd.md#functional-requirements` | Default on, opt-out removes |
| FR-07, FR-08 | `prd.md#functional-requirements` | No Git, tracked files |
| DEC-01, DEC-05 to DEC-07, DEC-09 | `techspec.md#technical-decisions` | Lines, snapshot, Git facts, extraction |
| CMP-02, CMP-05, CMP-07, CMP-08, TC-02, TC-04, TC-05, TC-07 | `techspec.md` | Components and tests |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (30-line functions, 100-line files, three parameters), `javascript-typescript.md`, `file-changes.md`, `tests.md`.
- Code: `installation-service.ts` (`planInstallation`, where `allAssets` and the manifest change exist), `restart-install-extras.ts` (extra change pattern), `change-plan-service.ts` (snapshot matching), `src/cli/commands/init.ts` (`executeInit`, `previewReport`, `confirmApply`), `tests/helpers/in-process-cli.ts`, `fake-process-runner.ts`.

## Work

- [x] T03.1 `ignoreLinesFor` from the config path, the manifest path, and the assets: sorted, deduplicated, anchored, escaped lines from `realPath` relative to the root; skip outside-root paths; never entries.
- [x] T03.2 `planGitIgnore` returns the `PlannedChange` (create, update, or delete; owner `gitignore`; summary `Keep ContextBrake's files out of Git`), a `GITIGNORE_MARKERS_MALFORMED` conflict, or the `GITIGNORE_NO_GIT` finding; call it from `planInstallation` after the assets and the manifest are known; add `.gitignore` to `collectProjectSnapshots`.
- [x] T03.3 `src/infrastructure/git/git-context.ts`: `isInsideGitWorkingTree(root)` (walk up for `.git`) and `trackedOwnedFiles(runner, root, lines)` (one `git ls-files`, timeout, tolerant of failure); pass the first into the input and report `GITIGNORE_TRACKED_FILES` from the CLI layer.
- [x] T03.4 Move `executeInit`, `previewReport`, `confirmApply` to `src/cli/init-flow.ts` without behavior change; `init.ts` keeps `CommandEnv`, `runInit`, `runAssisted`.
- [x] T03.5 Tests: `tests/unit/gitignore-plan.test.ts` (TC-02), `tests/integration/init-gitignore.test.ts` (TC-04), `init-gitignore-lifecycle.test.ts` (TC-05), `init-gitignore-tracked.test.ts` (TC-07); the whole existing suite stays green (TC-09).

## Acceptance criteria

- In a fixture with `.git`, Claude Code, and restart on, the block lists exactly the owned files; turning restart off removes the mod lines; a second run plans nothing.
- `--no-gitignore` removes the block and a later plain `init` keeps it off; `--gitignore` brings it back.
- Without `.git` no `.gitignore` is created and `GITIGNORE_NO_GIT` is reported; with malformed markers the file is untouched and the conflict is reported while the rest of `init` applies.
- A tracked listed file yields `GITIGNORE_TRACKED_FILES` with the `git rm --cached` command and an unchanged exit code.
- A symlinked harness directory yields the link target path in the line.
- `--dry-run --json` shows the change with owner `gitignore`; `init.ts` and `installation-service.ts` at or below 100 lines.

## Verification

- Unit: `npm test -- tests/unit/gitignore-plan.test.ts`.
- Integration: the three integration files above (fixture with an empty `.git` directory, fake runner and a stub runner for tracked files).
- End-to-end: not applicable here (TC-11 in QA). Manual: none.
- Platforms: Linux, macOS, Windows (drive letter and case through `path.relative`).
- Commands: the tests above, `npm test`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-01` to `FR-08`, `TC-02`, `TC-04`, `TC-05`, `TC-07`; full suite green.

## Affected files

- Modify: `src/core/services/installation-service.ts`, `src/cli/snapshot-helper.ts`, `src/cli/commands/init.ts`
- Create: `src/core/services/gitignore-plan.ts`, `src/infrastructure/git/git-context.ts`, `src/cli/init-flow.ts`, `tests/unit/gitignore-plan.test.ts`, `tests/integration/init-gitignore.test.ts`, `tests/integration/init-gitignore-lifecycle.test.ts`, `tests/integration/init-gitignore-tracked.test.ts`

## Observability and recovery

- Operational signal: the planned change and the two findings. Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: init now plans one change on the root .gitignore (owner gitignore): the owned paths come from the config, the manifest, and the new manifest assets, resolved to the path Git sees, sorted, anchored, and escaped; the block is created, replaced, or removed through gitignore-block.ts, follows the gitIgnore setting, is skipped outside Git with the GITIGNORE_NO_GIT finding, and malformed markers become a GITIGNORE_MARKERS_MALFORMED conflict while the rest of init applies. Git facts: isInsideGitWorkingTree (walk up for .git) and trackedOwnedFiles (one git ls-files through the injected runner); tracked files yield GITIGNORE_TRACKED_FILES with the git rm --cached command, severity ok, exit code unchanged. executeInit moved to src/cli/init-flow.ts (init.ts now 29 lines); CommandEnv is re-exported from init.ts. .gitignore joins collectProjectSnapshots. InstallationResult gains ignoredPaths.
- Changed files: created src/core/services/gitignore-plan.ts (84 lines), src/infrastructure/git/git-context.ts, src/cli/init-flow.ts (76 lines), src/cli/gitignore-findings.ts, tests/helpers/gitignore-world.ts, tests/unit/gitignore-plan.test.ts, tests/integration/init-gitignore.test.ts, init-gitignore-lifecycle.test.ts, init-gitignore-tracked.test.ts; modified src/core/services/installation-service.ts (89 lines), src/cli/snapshot-helper.ts, src/cli/commands/init.ts, tests/integration/statusline-default.test.ts (expected findings now include GITIGNORE_NO_GIT because that fixture is outside Git)
- Checks: npm run lint and typecheck exit 0; 9 plan unit tests and 13 integration tests pass (including a junction from .claude to .agents); npm run coverage exit 0: 254 files, 1438 tests, 94.76% lines, 125 s wall; quality sweep over the touched files: no hit, no file above 100 lines.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: The GITIGNORE_NO_GIT informational finding now appears in the output of every init run outside a Git working tree (FR-07); one existing test (statusline-default) listed the exact findings of such a fixture and was updated. Real-world runs are almost always inside Git, but a script that asserts the exact findings outside Git will see the extra line (severity ok, exit code unchanged).

### ADR candidates

None - direct TechSpec implementation or local decision.
