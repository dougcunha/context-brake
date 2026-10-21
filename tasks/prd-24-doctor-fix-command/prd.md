# PRD — `context-brake fix` command

Slice 2 of 2 under prefix `doctor` (`sdd-orchestrate-prds`, approved 2026-10-21). Depends on `prd-23-doctor-readable-output`.

## Problem and context

The user asked on 2026-10-21 for a command that tries to correct all warnings that `doctor` finds. Today `doctor` gives the fix only as free text in the `remediation` field of each finding (`src/core/contracts/diagnostics.ts:9`). The user must read the text, find the command, and run it. Most remediation texts name the same action: run `context-brake init` again, with `--yes` or with the flag that reinstalls one component (for example `src/infrastructure/harnesses/common/diagnostic-helpers.ts:13`, `src/core/services/asset-currency.ts:23`, `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts:17`, `src/infrastructure/harnesses/claude-code/auto-restart-diagnostics.ts:14`). Other findings need a choice from the user, or an action that ContextBrake cannot do (update Claude Code, set an environment variable, edit a user file).

Classification of the doctor findings with severity `warning` or `error` at `419c0bd` (fact from the code; product decision of the user for the `decision` group):

| Group | Codes | Reason |
| --- | --- | --- |
| `automatic` | `ASSET_MISSING`, `ASSET_OUTDATED`, `INTEGRATION_MISSING`, `CONFIG_MISSING`, `LEGACY_TURN_LIMITS`, `INVALID_CONTEXTBRAKE_CONFIG` when the cause is retired keys only, `STATUSLINE_BRIDGE_OUTDATED`, `STATUSLINE_BRIDGE_MISSING_SCRIPT`, `STATUSLINE_STATE_INVALID`, `STATUSLINE_PREVIOUS_CHANGED`, `STATUSLINE_BRIDGE_ABSENT`, `AUTO_RESTART_OUTDATED_MOD` | The remediation is an `init` run with the current configuration; `init` already repairs retired configuration keys (README, configuration repair) |
| `decision` | `ASSET_MODIFIED`, `STATUSLINE_BRIDGE_INACTIVE`, `NO_PROJECT_HARNESS` | The fix discards a user edit, or it needs a choice between options |
| `manual` | `VERSION_FLOOR_UNVERIFIED`, `AUTO_RESTART_CLAUDE_TOO_OLD`, `AUTO_RESTART_NOT_LOADED`, `AUTO_RESTART_LAST_SKIP`, `CONTEXT_MOD_SILENT`, `INVALID_HARNESS_CONFIG`, `INVALID_CONTEXTBRAKE_CONFIG` for other causes, `STATUSLINE_POWERSHELL_FALLBACK`, `STATUSLINE_LOCAL_TRACKED`, `CODEX_ROOT_NOT_GIT_TOPLEVEL`, `RUNTIME_ERRORS_RECORDED` | The fix is outside ContextBrake: a harness update, a harness setting, an environment variable, a user file, or a file that ContextBrake does not own in full |

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | One command corrects the findings that ContextBrake can correct. | After `fix --yes` on a fixture with only `automatic` findings, `doctor` exits 0 |
| OBJ-02 | The user sees the plan before any file changes. | Without `--yes`, no file changes before the confirmation |
| OBJ-03 | The user knows what remains and why. | The final output lists each finding that is still open, with its group and its remediation text |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer after a ContextBrake upgrade | Correct outdated assets and mod files with one command | Does not read each remediation text | `ASSET_OUTDATED` and `AUTO_RESTART_OUTDATED_MOD` |
| US-02 | Developer who edited a hook script | Choose to keep or replace the edited file | Does not lose the edit without consent | `ASSET_MODIFIED` on a TTY |
| US-03 | CI job or script | Run the fix without a prompt | Gets a deterministic result and exit code | `fix --yes --json` without a TTY |
| US-04 | Developer who reads `doctor` | See which problems `fix` corrects | Knows when to run `fix` | `doctor` text and JSON |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Each doctor finding with severity `warning` or `error` carries an optional field `fix` with `group` set to `automatic`, `decision`, or `manual`, per the classification table. Findings with severity `ok` have no `fix` field. | Unit test per producer: each code in the table gives the listed group; `INVALID_CONTEXTBRAKE_CONFIG` gives `automatic` for retired keys and `manual` for a syntax error |
| FR-02 | The doctor text marks each problem in group `automatic` or `decision` with the line `Fix: run context-brake fix`, and the first line adds the count of these problems. Problems in group `manual` keep only the remediation text. | Unit test on the `Problems` section from `prd-23-doctor-readable-output`: 1 automatic and 1 manual problem give `(…, 1 fixable)` and 1 `context-brake fix` line |
| FR-03 | `context-brake fix` runs the doctor diagnosis, selects the findings in group `automatic` and `decision`, and builds one change plan. The plan reruns `init` with the current configuration and never changes a configuration choice (harnesses, snapshot, auto-restart, status line bridge, debug mode). | Integration test: a fixture with auto-restart on and an outdated mod gives a plan that keeps `autoRestart` and reinstalls the mod |
| FR-04 | Without `--yes`, `fix` shows the plan and the list of `decision` and `manual` findings, then asks for confirmation on a TTY. | Integration test with a simulated TTY: no file changes before the answer |
| FR-05 | On a TTY, `fix` asks one question per `decision` finding. `ASSET_MODIFIED` asks to replace the file or keep it. `STATUSLINE_BRIDGE_INACTIVE` asks to reinstall the bridge, forget it, or skip. `NO_PROJECT_HARNESS` asks to select a harness or skip. | Integration test per code with simulated answers |
| FR-06 | With `--yes`, or without a TTY, `fix` skips every `decision` finding and gives the reason. With `--force` and `--yes`, `fix` applies the first option of each `decision` finding: replace the modified file, reinstall the bridge. `NO_PROJECT_HARNESS` stays skipped unless `--harness <id>` names the harness. | Integration tests: `--yes` keeps the modified file; `--yes --force` replaces it; `--yes --force --harness claude-code` installs claude-code |
| FR-07 | Without a TTY and without `--yes` or `--dry-run`, `fix` changes nothing and stops with `CONFIRMATION_REQUIRED`, as `init` does. | Integration test without a TTY: exit code 2, no file change |
| FR-08 | `--dry-run` shows the plan and the skipped findings and changes nothing. | Integration test: file hashes are the same before and after |
| FR-09 | After it applies the plan, `fix` runs the doctor diagnosis again and reports, per finding, the outcome `fixed`, `skipped` (with reason), `manual` (with remediation text), or `failed` (with cause). | Integration test: a fixture with 1 automatic, 1 decision, and 1 manual finding reports the 3 outcomes |
| FR-10 | When a fixed component needs a harness restart, the output says so (for example, restart Claude Code after the mod is reinstalled). | Unit test on the text for `AUTO_RESTART_OUTDATED_MOD` |
| FR-11 | Without a ContextBrake installation (no `context-brake.config.json` and no manifest), `fix` changes nothing and tells the user to run `context-brake init`. | Integration test on an empty fixture |
| FR-12 | When no finding is in group `automatic` or `decision`, `fix` changes nothing and says that nothing can be fixed, then lists the `manual` findings. | Integration test |
| FR-13 | The exit code of `fix` comes from the final doctor diagnosis: 0 with no warnings or errors, 1 with warnings, 2 with errors or a failed change, 64 for invalid arguments. A run that the user cancels changes nothing and exits with the status of the first diagnosis. | Integration tests for 0, 1, 2, and 64 |
| FR-14 | `fix --json` writes one JSON document to stdout that matches a new published schema `schemas/fix-report.schema.json`. It holds the mode (`dry_run` or `applied`), the plan, the outcome per finding, and the final doctor report. `fix --json` never prompts: it needs `--yes` or `--dry-run`. | `npm run schemas:check` passes; e2e smoke runs `fix --dry-run --json` on a fixture and validates the document |
| FR-15 | The doctor JSON schema adds the optional `fix` field on findings. | `schemas/doctor-report.schema.json` changes; `schemaVersion` stays 1; a document without `fix` still validates |
| FR-16 | The README and the CLI help describe `fix`, its flags, its groups, and the `fix` field. | README command table lists `fix` with `--dry-run`, `--yes`, `--force`, `--harness`, `--json` |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | File safety | `fix` writes files only through the `init` change plan and follows `.agents/rules/file-changes.md`: it never edits instruction files, and its only `.gitignore` change is the marked block |
| NFR-02 | Consent | No change to a user-modified file without an explicit answer or `--force`, per the user decision of 2026-10-21 |
| NFR-03 | Output | `.agents/rules/cli-output.md` applies: results on stdout, every status with a text label, no prompt without a TTY, messages in English |
| NFR-04 | Platform | `fix` works on Linux, macOS, and Windows (PowerShell and Git Bash), also with symlinked instruction files |
| NFR-05 | Contract | Exit codes come from `src/cli/exit-codes.ts`; the existing doctor exit codes do not change |

## User experience

`context-brake fix` on a TTY (example; the TechSpec sets the exact text):

```
ContextBrake fix: 2 problems can be fixed, 1 needs your decision, 1 is manual

Plan
  update  .claude/hooks/context-brake-hook.mjs        ASSET_OUTDATED
  update  .context-brake/claude-mod/mod.mjs            AUTO_RESTART_OUTDATED_MOD

Needs your decision
  ASSET_MODIFIED  .claude/hooks/context-brake-statusline.mjs
  Replace the modified file with the installed version? [y/N]

Manual
  STATUSLINE_POWERSHELL_FALLBACK  Set CLAUDE_CODE_GIT_BASH_PATH to the bash.exe of Git for Windows, then restart Claude Code.

Apply the plan? [y/N] y

Result
  FIXED    ASSET_OUTDATED
  FIXED    AUTO_RESTART_OUTDATED_MOD   Restart Claude Code to load the new mod.
  SKIPPED  ASSET_MODIFIED              You kept the modified file.
  MANUAL   STATUSLINE_POWERSHELL_FALLBACK

ContextBrake doctor: WARN (0 errors, 2 warnings)
```

## Constraints and dependencies

- Depends on `prd-23-doctor-readable-output`: FR-02 extends its `Problems` section and its first line.
- `.agents/rules/file-changes.md`, `cli-output.md`, and `harness-adapters.md` apply. Harness-specific codes keep their classification in their adapter.
- The confirmation behavior and the `CONFIRMATION_REQUIRED` error reuse the `init` behavior (`src/cli/confirmation.ts`).
- `CLI_ERROR_COMMANDS` in `src/core/contracts/diagnostics.ts` gains `fix`.

## Out of scope

- Findings with severity `ok` that have a remediation text: `AUTO_RESTART_OFF` (opt-in), `AUTO_RESTART_HANDOFF_KEPT` (delete handoffs), `GITIGNORE_TRACKED_FILES` (`git rm --cached`).
- Changes to the Git index, to user settings (`~/.claude/settings.json`), to environment variables, or to files that ContextBrake does not own in full (for example adding `.claude/settings.local.json` to `.gitignore`).
- Updating a harness or ContextBrake itself.
- A finding for overhead.
- The layout of the doctor sections (`prd-23-doctor-readable-output`).

## Assumptions and sources

- Product decision (user, 2026-10-21): `decision` findings are asked on a TTY, skipped without a TTY or with `--yes`, and included with an explicit flag (`--force`).
- Product decision (this PRD, to confirm at HIL): `fix` needs an existing installation (FR-11), so it never acts as a first `init`.
- Assumption: an `init` run with the current configuration corrects every `automatic` code. Source: the remediation texts at `419c0bd`. Impact if wrong: the code moves to `manual` in the TechSpec.
- Assumption: `STATUSLINE_BRIDGE_ABSENT` after `--no-statusline-bridge` stays open after `fix`, because `fix` keeps the configuration choice (FR-03). Impact if wrong: `fix` installs a bridge that the user turned off.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
