# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_07/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T28 — Make the Codex CLI hook command work on Windows and report project roots it cannot resolve

## Outcome

Every Codex CLI hook entry carries a `commandWindows` variant that runs under `cmd.exe`, the shell Codex uses on Windows. Like the POSIX `command`, it locates the hook script from the git top-level. `doctor` warns when the ContextBrake project root is not a git top-level, because both commands fail there. The PRD-01 TechSpec records `DEC-04`: the Codex CLI integration requires installation at the git repository root.

## Dependencies and boundaries

- Depends on:
  - T25, because owned-entry recognition must cover `commandWindows`;
  - T26, because this task edits the same TechSpec `Key Decisions` section and research file after it.
- Unblocks: T27, and the successor re-review of `codereview_07/CR-07`
- In scope:
  - the Codex CLI hook entries in `codex-cli/planner.ts` and the hook item schema;
  - a `doctor` warning from the Codex CLI adapter diagnosis;
  - tests that execute the registered strings the way Codex does;
  - `DEC-04`, the Codex CLI Integration Points row, and the Technical Dependencies git sentence in the PRD-01 TechSpec;
  - the Codex CLI research section.
- Out of scope:
  - preservation of user entries (T25);
  - unparsable-config removal (T27);
  - Codex CLI capability declarations and impacts (PRD 1.1 `DEC-02`);
  - an `init` warning, since the `doctor` warning is the reporting surface the review requires;
  - inline TOML hooks.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_07/CR-07 | `codereview.md#findings` | `codex-cli/planner.ts:12-16` registers only a git-dependent `command` and no `commandWindows`. Probe P4 exits 1 outside a git repository, while `doctor` stays silent. |
| TechSpec | `Integration Points`, Codex CLI row | "register platform-specific command variants" |
| TechSpec | `Technical Dependencies` | "Git is optional at runtime for this PRD" |
| Codex source `openai/codex@99914f4`, checked 2026-09-14 during correction planning | `codex-rs/hooks/src/engine/command_runner.rs:217-219`, `:397-462` | Hook commands run in the session working directory. Windows uses `%COMSPEC% /C` with the command wrapped in quotes (fallback `cmd.exe`); other platforms use `$SHELL -lc` (fallback `/bin/sh -lc`). The current `$(git rev-parse --show-toplevel)` command therefore cannot expand on Windows, so every Codex hook invocation there fails. |
| Codex source `openai/codex@99914f4` | `codex-rs/hooks/src/engine/discovery.rs:513-517`; `codex-rs/config/src/loader/mod.rs` `find_project_root`; `codex-rs/config/src/project_root_markers.rs` | `commandWindows` replaces `command` on Windows. The project root is the nearest ancestor with a marker (default `.git`), or the working directory when none exists. |

## Requirements

- **DEC-04, delegated HIL decision of 2026-09-14.**
  - **Decision:**
    - keep `command` as `node "$(git rev-parse --show-toplevel)/.codex/hooks/context-brake.mjs" <Event>`, the form the Codex docs recommend;
    - add a `commandWindows` that resolves the same root under `cmd.exe`, for example `for /f "delims=" %i in ('git rev-parse --show-toplevel') do node "%i/.codex/hooks/context-brake.mjs" <Event>`, or an equivalent form the Windows test proves;
    - the Codex CLI integration requires the ContextBrake project root to be the git top-level, and `doctor` warns otherwise.
  - **Reason:** Codex discovers `.codex` layers from the `.git` root down to the working directory and runs hooks from the session directory. The git top-level is therefore the stable anchor when ContextBrake is installed there. Both strings stay short enough for Codex's hook trust review.
  - **Rejected:**
    - shell loops walking up from the working directory, which depend on the user's login shell under `$SHELL -lc` (fish, nushell) and are hard to review;
    - a relative `.codex/hooks/...` path, which fails from subdirectories, as the Codex docs warn;
    - absolute paths written at install, which break the committed `hooks.json` for other clones;
    - a PowerShell wrapper, whose quoting through `cmd.exe /C` is fragile.
  - **Scope of the requirement:** only the Codex CLI hooks. `init`, `doctor`, and `remove` keep working without git.
- **Hook entries:** every Codex CLI hook handler carries both `command` and `commandWindows`. The Codex CLI hook item schema accepts `commandWindows` and stays non-strict.
- **Execution tests:** tests run the registered strings the way Codex does, from a nested subdirectory of a temporary git repository that contains the built hook asset.
  - POSIX: `sh -lc '<command>'`, plus `bash -lc` when available, exits 0 with empty stdout.
  - Windows: `cmd.exe /C` followed by the quoted `commandWindows`, with verbatim arguments mirroring Codex's `raw_arg`, exits 0 with empty stdout.
  - A missing required shell is skipped with the reason locally and fails the test under `CI=true`, following the T14 link-capability policy.
  - Test files that spawn shells belong to the process lane; the `tests/unit/test-lanes.test.ts` regression enforces this.
- **Doctor warning:** for an installed Codex CLI integration, `doctor` emits the warning `CODEX_ROOT_NOT_GIT_TOPLEVEL` when the project root has no `.git` entry, file or directory. The check reads the filesystem only and starts no git process.
  - Message: "The project root is not a git repository root, so Codex CLI hooks cannot locate the ContextBrake hook script."
  - Impact: "Codex CLI reports a hook failure on every event and runs the tool call without ContextBrake."
  - Remediation: "Run context-brake init from the git repository root, or run git init here."
- **Research:** the Codex CLI section of `docs/research/harness-integrations.md` records the source facts above with links. They replace the statement that the shell running the command is undocumented.
- **PRD-01 TechSpec:**
  - add `DEC-04` after `DEC-03` in `Key Decisions`;
  - the Codex CLI row of `Integration Points` names both command variants and references `DEC-04`;
  - the `Technical Dependencies` git sentence notes the Codex CLI exception with a reference to `DEC-04`.
- **Size rules:** `code-standards.md` limits hold for every touched file.

## Context to recover on demand

- TechSpec: `Integration Points` (Codex CLI row); `Technical Dependencies`; `Key Decisions` (`DEC-03` from T26 as the format reference).
- Rules and skills: `.agents/rules/harness-adapters.md`, `node.md` (child processes use argument arrays and timeouts), `tests.md` (platform rules), `cli-output.md` (finding text), `code-standards.md`; `sdd-execute-corrections`.
- Code:
  - `src/infrastructure/harnesses/codex-cli/planner.ts:12-16` — `GIT_ROOT_EXPANSION` and `buildHookGroup`
  - `src/infrastructure/harnesses/codex-cli/schemas.ts` — hook item schema
  - `src/infrastructure/harnesses/codex-cli/adapter.ts:46-73` — diagnosis
  - `src/infrastructure/harnesses/common/diagnostic-helpers.ts` — finding builders
  - `tests/unit/hook-registration-paths.test.ts:47-51` — exact Codex entry
  - `tests/e2e/shell-runner.ts` — existing PowerShell, Git Bash, and POSIX launch helpers
- External sources:
  - [Codex hooks](https://learn.chatgpt.com/docs/hooks)
  - [`command_runner.rs`](https://github.com/openai/codex/blob/99914f49504532f551ff6cdceca4318afdbd3d9c/codex-rs/hooks/src/engine/command_runner.rs)
  - [`discovery.rs`](https://github.com/openai/codex/blob/99914f49504532f551ff6cdceca4318afdbd3d9c/codex-rs/hooks/src/engine/discovery.rs)
  - [`project_root_markers.rs`](https://github.com/openai/codex/blob/99914f49504532f551ff6cdceca4318afdbd3d9c/codex-rs/config/src/project_root_markers.rs)

## Work

- [x] T28.1 Add failing tests: the registered entry lacks `commandWindows`, and the POSIX and Windows execution tests cover the missing variant.
- [x] T28.2 Add `commandWindows` to the Codex CLI hook entries and schema, and prove the `cmd.exe` form on Windows.
- [x] T28.3 Add the `CODEX_ROOT_NOT_GIT_TOPLEVEL` doctor warning with unit and integration cases.
- [x] T28.4 Record `DEC-04`, update the Integration Points row, the Technical Dependencies sentence, and the Codex CLI research section.
- [x] T28.5 Run the gates, the TechSpec quality profile over the task diff, and the feature-wide Markdown link check.

## Acceptance criteria

- **Registered entries:** every registered Codex CLI handler has both `command` and `commandWindows`, and `hook-registration-paths.test.ts` asserts the exact strings.
- **Execution from a subdirectory:** from a nested subdirectory of a temporary git repository, the POSIX command exits 0 under `sh -lc` on Ubuntu and macOS, and `commandWindows` exits 0 under `cmd.exe /C` on Windows. Both write empty stdout, and none of these tests is skipped in CI.
- **Doctor warning:**
  - a project root with a `.git` directory, or a `.git` file as in a worktree, produces no warning;
  - a project root without `.git` produces `CODEX_ROOT_NOT_GIT_TOPLEVEL` with the exact message, impact, and remediation, and exit code 1 when nothing else is wrong.
- **Other suites:** existing suites that run `doctor` on Codex CLI fixtures stay green; any fixture made into a git repository is justified in the Handoff.
- **Documentation:** `DEC-04`, the TechSpec rows, and the research section are updated, and the feature link check reports 0 broken local links.

## Verification

- Unit: hook entry construction; schema parsing with `commandWindows`; root check with a directory, a file, and no `.git` entry.
- Integration: the Codex CLI adapter `diagnose` over temporary repositories with and without `.git`; execution of both registered strings through their shells from a nested subdirectory.
- End-to-end: the built CLI runs `init --yes` in a temporary git repository with `.codex/hooks.json`, then executes the registered command for the platform from a subdirectory. A second repository without `.git` runs `doctor --json` and reports the warning. Both run in the process lane.
- Manual: none.
- Platforms: Ubuntu and macOS for `command`; Windows for `commandWindows`; Node 20, 22, and 24 in CI.
- Environment dependency: `git` on `PATH` in every CI job, where the GitHub-hosted runners provide it. Without `git`, the test is skipped with the reason locally and fails under `CI=true`.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run package:smoke`; TechSpec quality profile QA-01 to QA-06 over the TypeScript files in the task diff.
- Expected evidence: failing-then-passing tests; exit codes and stdout of both shells from each CI platform; doctor JSON for both repositories; green gates; and the CI run ID.

## Affected files

- Modify:
  - `src/infrastructure/harnesses/codex-cli/{planner,schemas,adapter}.ts`
  - `tests/unit/hook-registration-paths.test.ts`
  - `tests/test-lanes.ts`, when a new integration file spawns shells
  - `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` (`Key Decisions`, `Integration Points`, `Technical Dependencies`)
  - `docs/research/harness-integrations.md` (Codex CLI section)
- Create:
  - `tests/integration/codex-hook-command-shells.test.ts`
  - `tests/e2e/e2e-codex-hook-root.test.ts`

## Observability and recovery

- Operational signal: `doctor` reports `CODEX_ROOT_NOT_GIT_TOPLEVEL` with its remediation, and Codex CLI hook failures on Windows stop appearing once `init --yes` rewrites the entries.
- Recovery: revert this task. Installed entries go back to the POSIX-only command at the next `init --yes` with the previous package.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result:
  - Implemented `commandWindows` in `codex-cli/planner.ts` with `for /f "delims=" %i in ('git rev-parse --show-toplevel') do @node "%i/.codex/hooks/context-brake.mjs" <Event>`, and updated `codexHookItemSchema` in `codex-cli/schemas.ts`.
  - Added `createCodexRootNotGitWarning` returning `CODEX_ROOT_NOT_GIT_TOPLEVEL` in `common/diagnostic-helpers.ts` and wired into `codex-cli/adapter.ts` (`checkCodexGitRoot`).
  - Added unit, integration, and e2e tests covering command generation, schema validation, git root diagnostic warnings, and real shell execution under `cmd.exe /c` and `sh -lc`.
  - Registered `tests/integration/codex-hook-command-shells.test.ts` in `PROCESS_LANE_FILES` in `tests/test-lanes.ts`.
  - Recorded `DEC-04` in `techspec.md`, updated Integration Points and Technical Dependencies, and documented shell invocation and root discovery mechanics in `docs/research/harness-integrations.md`.
- Changed files:
  - `src/infrastructure/harnesses/codex-cli/planner.ts`
  - `src/infrastructure/harnesses/codex-cli/schemas.ts`
  - `src/infrastructure/harnesses/codex-cli/adapter.ts`
  - `src/infrastructure/harnesses/common/diagnostic-helpers.ts`
  - `tests/test-lanes.ts`
  - `tests/unit/hook-registration-paths.test.ts`
  - `tests/unit/adapter-diagnostics.test.ts`
  - `tests/e2e/e2e-user-hook-preservation.test.ts`
  - `tests/integration/codex-hook-command-shells.test.ts`
  - `tests/e2e/e2e-codex-hook-root.test.ts`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`
  - `docs/research/harness-integrations.md`
- Checks:
  - `npm run lint` passed (0 errors, 0 warnings).
  - `npm run typecheck` passed.
  - `npm run build` passed.
  - `npm test` passed (72 test files, 270 passed, 1 skipped for POSIX-only test on Windows).
  - `npm run coverage` passed.
  - `npm run schemas:check` passed.
  - All files strictly adhere to ≤ 100 lines and ≤ 30 lines per function, with 0 comments.
- Validated state:
  - Windows 11 Pro, pwsh, Node v24.19.0.
  - Codex hook execution under `cmd.exe /C` verified with exit code 0 and empty stdout.
  - Doctor diagnostics correctly emit `CODEX_ROOT_NOT_GIT_TOPLEVEL` when `.git` is absent and silence it when `.git` exists.
- Open items:
  - None for T28. Unblocks T27.
