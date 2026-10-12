# Stable execution context

Load in this exact order:

1. `tasks/prd-18-mod-como-fonte-do-contexto/prd.md`
2. `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Choose mod-first at install, migrate, and report

## Outcome

A plain `init` on a Claude Code at or above the minimum version installs the mod and leaves every `statusLine` key alone; an installed bridge migrates away with the earlier `statusLine` restored; below the minimum, with an undetectable version, or with `--statusline-bridge`, `init` behaves as today. `doctor` and the interactive setup name the source, and the README, research file, and generated schema are current.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: —
- In scope: CMP-04 to CMP-08; README and research updates; regenerated `schemas/doctor-report.schema.json`; the manual acceptance script.
- Out of scope: the reading path (T02), other harnesses, removing the bridge or its flags.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| OBJ-01 to OBJ-03, US-01 to US-04 | `prd.md` | Outcomes and journeys |
| FR-03 to FR-08 | `prd.md#functional-requirements` | Decision, mod-first, flags, migration, doctor, remove |
| NFR-05 | `prd.md#non-functional-requirements` | Platforms, symlinked settings |
| DEC-05 to DEC-09 | `techspec.md#technical-decisions` | Decision, install gate, migration, doctor, assistant |
| CMP-04 to CMP-08 | `techspec.md#components-and-flow` | Components |
| TC-05 to TC-10, TC-15 | `techspec.md#test-approach` | Scenarios |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `file-changes.md` (plan before writing, byte-for-byte), `cli-output.md`, `harness-adapters.md`, the code and test rules.
- Existing code: `claude-code/adapter.ts` (91 lines: add at most 9), `planner.ts`, `statusline-planner.ts:planStatuslineEntry`, `statusline-restore.ts:planStatuslineRestore`, `auto-restart-planner.ts:planAutoRestart`, `statusline-context-window.ts`, `core/services/doctor-report-extras.ts`, `cli/assistant/questions-misc.ts`; tests `tests/integration/statusline-install.test.ts`, `statusline-config-dir.test.ts`, `claude-mod-*.test.ts`, `tests/helpers/statusline-world.ts`.
- Contract or integration: `techspec.md#contracts-and-data` and `#integrations-and-interfaces`.
- Harness reference: `docs/research/harness-integrations.md`, Claude Code section (status line, Mods, user configuration directory).

## Work

- [x] T03.1 `context-source.ts` with `decideContextSource` and `CONTEXT_MOD_MINIMUM_CLAUDE_VERSION` (value from T01); call it in `adapter.ts:planInstall` and pass the source through `planClaudeInstall`.
- [x] T03.2 `planAutoRestart` options object and the install gate `autoRestart || source === 'mod'`; update its callers (`planClaudeRemove` keeps removing everything).
- [x] T03.3 `statusline-migration.ts` and the branch in `planStatuslineInstall`: no change in mod-first, restore plus bridge-script deletion when a bridge state exists, opt-out marker untouched.
- [x] T03.4 Doctor: `ContextWindowReport` (`source` `mod`, new `mod` field), `readClaudeContextWindow`, `context-source-diagnostics.ts`, `bridgeAbsentFindings`, `capabilities.ts` text; run `npm run schemas:generate`.
- [x] T03.5 Assistant: `contextSource` in `AssistantContext`, skip the bridge question in mod-first, summary line.
- [x] T03.6 Tests TC-05 to TC-10 and TC-15; update the README (Claude Code context section) and the research file; run the manual acceptance script and record the result in the handoff.

## Acceptance criteria

- At the minimum version and above, a plain `init` leaves the fixture's `statusLine` keys byte for byte, creates no bridge script or state, installs the mod files and keys, writes no `autoRestart` block, and a second `init` plans no change.
- Below the minimum, with an undetectable version, and with `--statusline-bridge`, the plan equals today's.
- A bridge over a user status line migrates: `settings.local.json` returns to its original bytes, or the file disappears when the install created it; `--dry-run` prints the same plan.
- `doctor --json` reports `contextWindow.source` and `contextWindow.mod` for the four cases; `npm run schemas:check` passes.
- `init` then `remove` in mod-first returns the fixture to its pre-install bytes.
- The interactive setup does not ask about the bridge in mod-first.

## Verification

- Unit: TC-05, TC-15.
- Integration: TC-06 to TC-10 through `tests/helpers/statusline-world.ts` (extended with the injected version) and the fake process runner.
- End-to-end: not applicable; the existing smoke set runs through `npm run coverage`.
- Manual: the acceptance script in the TechSpec on this machine (`CLAUDE_CONFIG_DIR` set); expected result: untouched `statusLine`, `doctor` source `mod`, window `1000000`; owner: the user.
- Platforms: Linux, macOS, Windows through CI; local run on Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`, `npm run test:budget`
- Environment dependency: none for the automated checks; the manual script needs a real session.
- Expected evidence: passing suites, regenerated schema with no drift, empty blocking greps, the manual result in the handoff.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/adapter.ts`, `planner.ts`, `statusline-planner.ts`, `auto-restart-planner.ts`, `statusline-context-window.ts`, `capabilities.ts`; `src/core/contracts/context-window-report.ts`; `src/core/services/doctor-report-extras.ts`; `src/cli/assistant/assistant-context.ts`, `questions-misc.ts`, `summary.ts`, `types.ts`; `schemas/doctor-report.schema.json`; `README.md`; `docs/research/harness-integrations.md`; `tests/helpers/statusline-world.ts`
- Create: `src/infrastructure/harnesses/claude-code/context-source.ts`, `statusline-migration.ts`, `context-source-diagnostics.ts`; `tests/unit/context-source.test.ts`, `tests/integration/init-mod-first.test.ts`, `init-mod-migration.test.ts`, `doctor-context-source.test.ts`

## Observability and recovery

- Operational signal: `CONTEXT_MOD_READY`, `CONTEXT_MOD_SILENT`, and the plan summaries of `init --dry-run`.
- Recovery: `init --statusline-bridge` returns an install to the bridge; `remove` returns the repository to its pre-install bytes.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: on Claude Code 2.1.287 or later a plain `init` installs the mod and never touches `statusLine`; below that, with an undetectable version, or with `--statusline-bridge`, it behaves as before; `--no-statusline-bridge` records the opt-out and still installs the mod; an installed bridge migrates (the previous local `statusLine` is restored, the state and the bridge script are deleted, the opt-out marker is left alone); `doctor` reports `contextWindow.source` (`mod`) and `contextWindow.mod`, emits `CONTEXT_MOD_READY` / `CONTEXT_MOD_SILENT` and no longer warns `STATUSLINE_BRIDGE_ABSENT` when the mod is installed; the interactive setup skips the bridge question and prints `Context source: mod (your status line is left alone)`. README, research file, and the generated `doctor-report.schema.json` are current.
- Changed files: created `claude-code/context-source.ts`, `statusline-migration.ts`, `context-readings-scan.ts`; modified `claude-code/adapter.ts` (92 lines), `planner.ts`, `statusline-planner.ts` (91), `auto-restart-planner.ts` (91, options object, neutral plan summaries), `statusline-context-window.ts`, `mod-reading.ts` (`parseContextReading`), `auto-restart-diagnostics.ts` (`isModInstalled` exported), `capabilities.ts`, `core/contracts/context-window-report.ts`, `core/services/doctor-report-extras.ts`, `cli/output/text.ts`, `cli/assistant/{types,assistant-context,questions-misc,assistant-questions,summary}.ts`, `schemas/doctor-report.schema.json`, `README.md`, `docs/research/harness-integrations.md`; tests `tests/unit/context-source.test.ts`, `doctor-context-source.test.ts`, `assistant-questions.test.ts`, `assistant-output.test.ts` (extended), `tests/integration/init-mod-first.test.ts`, `init-mod-migration.test.ts`, `doctor-context-source.test.ts`, helpers `claude-version-runner.ts` and `statusline-world.ts` (options object), and fixture updates for the new report field and capability text.
- Checks: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run coverage` (251 files, 1257 tests, 95.9% lines), `npm run schemas:check`, `npm run package:smoke`, `npm run test:budget` (110.2 s); blocking greps empty; mutation check (the decision forced to `bridge`) failed 11 new tests and was reverted. End-to-end with the built CLI: `init` in a scratch repository with a personal `statusLine` left the key byte for byte, created no bridge script or state; a real `claude -p` session loaded the mod generated by that `init` through `--plugin-dir`, wrote the reading (window 1,000,000, 35,537 tokens), produced ledger tool lines with `windowTokens` 1000000 and `windowOrigin: harness`, and `doctor` reported `mod: reporting`, `source: mod`, `CONTEXT_MOD_READY`.
- Validated state: base `63fd5cb` plus the uncommitted T02 and T03 diff; Windows; `claude` 2.1.296; no commit made. The scratch repository and logs were deleted. The runs left one entry in the user-level `installed_plugins.json` (`context-brake-restart@context-brake-local`, scope `local`, projectPath in the scratchpad), reported to the user.
- Open items: (1) Claude Code keeps one marketplace `context-brake-local` per user, so in a second repository the first repository's copy of the mod loads (seen in the debug log); the end-to-end run needed `--plugin-dir` to load the new copy. `CONTEXT_MOD_SILENT` now names this cause; a per-project marketplace name would change the prd-11 install and needs its own decision. (2) The real CLI injected no process runner, so `claude --version` was never probed; `detectContextSource` now falls back to its own `NodeProcessRunner`, which makes `init` start one `claude --version` process (2 s timeout) per run; `doctor` detection output is unchanged (`version` still null). (3) macOS and Linux unverified. (4) The manual acceptance on the user's own repository is still theirs: that repository has the older mod registered under the shared marketplace name.

### ADR candidates

None - direct TechSpec implementation or local decision.
