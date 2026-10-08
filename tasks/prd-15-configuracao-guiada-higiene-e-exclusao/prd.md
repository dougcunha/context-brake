# PRD — Upgrade hygiene and persistent harness exclusion

## Problem and context

prd-12 removed plan mode, the runner, the brake deny path, and the pre-tool hook, with no migration or backward compatibility (prd-12 DEC-PD-03). A project installed by an earlier ContextBrake build stops working after an upgrade, and nothing tells the person how to fix it. The TokenHound repository hit all three gaps below on 2026-10-08 (`tasks/triage-log.jsonl`, last line).

- **Obsolete configuration keys.** The configuration schema is strict (`src/core/contracts/configuration.ts:41`). A file that still carries `stateStorage`, `instructionFiles`, `brake`, `lightMode`, or `runner` fails validation with `INVALID_CONTEXTBRAKE_CONFIG: … is not a recognized key` (`src/core/validation/configuration-validator.ts:16`). `init`, `doctor`, and `remove` all stop on that error, and the message names no fix. The person must find and delete the keys by hand.
- **Hook registrations for retired events.** The Claude Code, Codex CLI, and Cursor updaters only touch the events ContextBrake registers today (`src/infrastructure/harnesses/claude-code/claude-hooks-config.ts:4`, `src/infrastructure/harnesses/common/codex-hooks-updater.ts:5`, `src/infrastructure/harnesses/common/cursor-hooks-updater.ts:5`). A `PreToolUse` entry left by an earlier build survives both `init` and `remove`. It starts a hook process on every tool call and does nothing; doctor measured 178.9 ms of hook overhead per call on TokenHound. Only the Antigravity updater removes its retired `PreToolUse` entry (`src/infrastructure/harnesses/common/antigravity-hooks-updater.ts:25`).
- **No persistent exclusion.** `init` merges the configured `activeHarnesses` with every harness it detects (`src/core/services/installation-builder.ts:35`). `--exclude-harness` only skips a harness for one run (`src/core/services/detection-service.ts:36`). It neither removes that harness from `activeHarnesses` nor deletes its artifacts, and the next `init` without the flag activates it again. On TokenHound, an OpenCode 2.x project where the ContextBrake OpenCode plugin does not load (prd-14 DEC-HIL-04), there was no supported way to turn OpenCode off.

This slice is the first of two under the prefix `configuracao-guiada`. `prd-16-configuracao-guiada-assistente-no-init` builds the interactive `init` assistant on top of it.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | A configuration left by an earlier build can be repaired without reading the schema | On a fixture with the five retired keys, the error names each key and a command that fixes it, and running that command leaves a valid configuration with every other value unchanged (FR-01, FR-02) |
| OBJ-02 | Upgrading leaves no ContextBrake hook for an event it no longer uses | After `init` or `remove` on fixtures that carry retired-event entries for each hook harness, no ContextBrake-owned entry remains for an event outside the current set, and foreign entries stay byte-identical (FR-03, FR-04) |
| OBJ-03 | A person can turn a detected harness off and keep it off | After excluding a detected harness, a plain `init` neither activates it nor reinstalls its files, until the person includes it again (FR-05, FR-06, FR-07) |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer upgrading ContextBrake in an existing project | Learn why `init` fails and fix it in one step | Back to a working install without editing JSON by hand | `init` reports the unrecognized keys and the fix; the fix rewrites the file; typos in key names are shown before anything is dropped |
| US-02 | Developer using Claude Code, Codex, or Cursor | Stop paying for hooks that do nothing | Tool calls run without a useless hook process | A re-run of `init` removes the retired entries; `remove` also removes them |
| US-03 | Developer whose project configures a harness that ContextBrake should not manage | Turn that harness off for this project | Its files are gone and it stays off | `init --exclude-harness opencode` deactivates OpenCode; a later plain `init` keeps it off; `init --harness opencode` turns it on again |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | When `context-brake.config.json` fails validation only because of unrecognized keys, every command that reads it reports each key and the fix | `init`, `doctor`, and `remove` print one error naming every unrecognized key with its path, and a remediation line naming the command that removes them (FR-02). JSON output carries the same keys. The exit code stays the configuration error code. A file with other validation errors keeps today's message for those errors |
| FR-02 | `init` can rewrite a configuration whose only problem is unrecognized keys, dropping those keys and keeping every recognized value | The preview lists each key it will drop. The change needs the same confirmation as any other write (`--yes` or the interactive prompt). `--dry-run` writes nothing. After applying, the file validates, recognized values are unchanged, and a second `init` plans no configuration change |
| FR-03 | `init` removes ContextBrake-owned hook registrations for events outside the set the harness adapter registers today | On fixtures for Claude Code, Codex CLI, Cursor, and GitHub Copilot CLI carrying a ContextBrake entry for a retired event (for example `PreToolUse`), the plan deletes that entry, and the applied file has no ContextBrake entry outside the current events. Entries ContextBrake does not own, including other hooks under the same event, stay byte-identical. An event left with no entries is removed only when ContextBrake's entry was its last one |
| FR-04 | `remove` deletes every ContextBrake-owned hook registration, whatever its event | After `remove` on the FR-03 fixtures, no ContextBrake entry remains under any event; foreign entries stay byte-identical |
| FR-05 | Excluding a detected harness turns it off persistently | `init --exclude-harness <id>` removes `<id>` from `activeHarnesses`, records it as excluded in the configuration, and plans the deletion of its ContextBrake artifacts (hook registrations, assets, and manifest entries), as `remove` would for that harness alone. The preview lists the deletions; the write needs confirmation |
| FR-06 | An excluded harness stays off across later runs | A plain `init` in a project where the harness is detected neither activates it nor plans any of its files, and its detection line says it is excluded by configuration. `doctor` reports it as excluded, not as missing |
| FR-07 | Including an excluded harness turns it back on | `init --harness <id>` clears the exclusion, adds `<id>` to `activeHarnesses`, and plans its installation; `--harness` and `--exclude-harness` for the same id in one run stay an argument error |
| FR-08 | `remove` treats the exclusion as ContextBrake's own state | `remove` deletes the configuration file, exclusion included, as it does today; no excluded harness's artifacts are expected to remain |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | User files (`file-changes.md`) | Every change is planned before writing and shown by `--dry-run`. Applying the same plan twice changes nothing. Content ContextBrake does not own stays byte-identical, including key order, indentation, and line endings |
| NFR-02 | Platforms | Linux, macOS, and Windows (PowerShell and Git Bash), including settings directories reached through a symbolic link (TokenHound's `.claude` points to `.agents`) |
| NFR-03 | Test budget | New tests run in process and keep `npm test` and `npm run coverage` within 120 s (`.agents/rules/tests.md`) |
| NFR-04 | Output contract (`cli-output.md`) | New findings and errors appear in text and JSON with the same content; JSON stays valid against the published report schemas, updated when a field is added |

## User experience

- **Configuration error, text output:** one error header, then one line per unrecognized key (`stateStorage is not a recognized key`), then a remediation line such as `Run context-brake init --yes to drop them, or remove them from context-brake.config.json.`
- **`init` preview with keys to drop:** the configuration change summary names the dropped keys, so a typo (for example `telemtry`) is visible before confirmation.
- **Exclusion:** the detection line of an excluded harness reads that it is excluded by configuration, and the preview lists the artifacts deleted when it is first excluded.

## Constraints and dependencies

- prd-12 DEC-PD-03 rejected migration and backward compatibility. FR-02 does not keep a list of retired keys; it treats any unrecognized key the same way and shows it before dropping it (decided at HIL 1, DEC-HIL-01, OI-15-01).
- Hook ownership must be recognized the same way each adapter recognizes its entries today (the hook script path in the command), so foreign entries are never matched.
- Adding the exclusion to the configuration changes the published configuration schema (`schemas/`); `npm run schemas:check` must pass.
- `prd-16-configuracao-guiada-assistente-no-init` depends on FR-05 to FR-07: deselecting a harness in the assistant uses this exclusion.

## Out of scope

- The interactive assistant, the equivalent-command output, the `--interactive` trigger, the Git Bash TTY probe, and `--max-restarts` (owned by `prd-16-configuracao-guiada-assistente-no-init`).
- Migrating values from retired keys into current ones; dropped keys are not translated.
- Fixing the OpenCode 2.x plugin load failure (the OpenCode 2.x migration follow-up from prd-14 DEC-HIL-04).
- Removing user-level (global) harness configuration.

## Assumptions and sources

- Assumption: GitHub Copilot CLI hook registrations follow the same ownership pattern as Codex and Cursor. If they cannot carry a retired event, FR-03 for Copilot reduces to a no-op test.
- Assumption: no ContextBrake build ever registered hooks in user-level files that `init` would need to clean. If one did, that cleanup stays out of scope.
- Decision OI-15-01 (HIL 1, DEC-HIL-01): `init` drops any unrecognized key after listing it in the preview and getting confirmation; no list of retired keys is kept.
- Decision OI-15-02 (HIL 1, DEC-HIL-01): `--exclude-harness` changes meaning from "skip this run" to "turn off persistently"; no new flag. ContextBrake was never released (DEC-PD-03), so no published behavior breaks.
- Source: `tasks/triage-log.jsonl` (2026-10-08 line, TokenHound evidence case); `tasks/prd-12-refatoracao-modo-leve-modo-unico/workflow.md` (DEC-PD-03).

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
