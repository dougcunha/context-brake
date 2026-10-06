# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`
2. `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Install, switch off and remove through init

## Outcome

`context-brake init --auto-restart` installs the mod and loader entry after a confirmed plan, a second `init` changes nothing, `--no-auto-restart` and `remove` take everything back, and plain `init` adds nothing.

## Dependencies and boundaries

- Depends on: T02, T03, T04
- Unblocks: T06
- In scope: flags and validation, `autoRestart` config update, `auto-restart-planner.ts` (marketplace manifest, plugin files and loader keys per `DEC-08`), adapter and capability wiring, removal of the owned files and entry, manifest ownership.
- Out of scope: `doctor` findings (T06), docs (T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07, FR-09, NFR-05 | `prd.md#functional-requirements` | Opt-in install, remove, zero footprint |
| NFR-01, NFR-03 | `prd.md#non-functional-requirements` | Platforms, compatibility |
| DEC-08, DEC-09, DEC-12 | `techspec.md#technical-decisions` | Layout, loader, config |
| CMP-06, CMP-07, CMP-08 | `techspec.md#components-and-flow` | Planner, adapter, CLI |

## Context to recover on demand

- Applicable skills and rules: `file-changes.md` (plan first, ownership, atomic write, symlinks, LF), `cli-output.md`, `harness-adapters.md`.
- Existing code: `statusline-planner.ts` and `statusline-default.ts` (opt-in and opt-out pattern), `init-arguments.ts:49-64` (target validation), `init-config-updates.ts`, `src/core/services/removal-helper.ts`, `json-document-editor.ts`.
- Contract or integration: `techspec.md#errors-security-and-recovery`.
- Harness reference: `docs/research/harness-integrations.md#claude-code` (T01 results on the loader).

## Work

- [x] T05.1 Add `--auto-restart` and `--no-auto-restart` to `init-arguments.ts` with the conflict and Claude-target errors, and the `autoRestart` config update (set, keep, remove).
- [x] T05.2 Implement `auto-restart-planner.ts`: install and remove plans for `.context-brake/claude-mod/**` the marketplace manifest, the plugin files, and the `extraKnownMarketplaces` and `enabledPlugins` keys in `.claude/settings.local.json`, preserving all other bytes; fallback behavior if T01 selected it.
- [x] T05.3 Wire the planner into the Claude adapter install and remove plans (managed assets and entries), and add the `auto_restart` capability.
- [x] T05.4 Make a user-edited mod file a reported conflict on `remove`, not a deletion.
- [x] T05.5 Write TC-17 to TC-21.

## Acceptance criteria

- `init --auto-restart --yes` writes the marketplace manifest, the plugin files, the two loader keys and `autoRestart`; a second run plans nothing.
- Existing `extraKnownMarketplaces` and `enabledPlugins` entries keep their bytes; only the ContextBrake keys are added and later removed, with the absolute path escaped correctly on Windows.
- Plain `init` on a fresh repository creates no mod file and no loader entry.
- `init --no-auto-restart --yes` and `remove --yes` restore the pre-install bytes of every touched file.
- Both flags together, or a target without Claude Code, fail with an error that names the fix.

## Verification

- Unit: TC-21 (argument validation).
- Integration: TC-17 to TC-20 against temp repositories, including a symlinked settings file and CRLF input.
- End-to-end: covered in T06.
- Manual: not applicable.
- Platforms: Linux, macOS, Windows (delimiter, symlinks, path resolution).
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`
- Environment dependency: none
- Expected evidence: test counts, byte-identity assertions, QA-01 to QA-04, QA-07 to QA-11 clean.

## Affected files

- Modify: `src/cli/init-arguments.ts`, `src/cli/init-config-updates.ts`, `src/cli/commands/init.ts`, `src/infrastructure/harnesses/claude-code/{planner,adapter,capabilities}.ts`, `src/core/contracts/adapter.ts`
- Create: `src/infrastructure/harnesses/claude-code/auto-restart-planner.ts`, `tests/integration/auto-restart-planner.test.ts`, `tests/unit/init-arguments.test.ts` additions

## Observability and recovery

- Operational signal: the init plan lists each file and the loader entry.
- Recovery: `init --no-auto-restart` or `remove`; for one session `CONTEXT_BRAKE_AUTO_RESTART=0`.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `context-brake init --auto-restart` installs the mod and `--no-auto-restart` takes it back, with the plan-and-confirm machinery of init. The config block `autoRestart` is set or removed (default limit 2; an existing value is kept). The Claude adapter plans a local marketplace under `.context-brake/claude-mod/` (marketplace.json, the plugin manifest, hooks.json, `register.mjs` taken from the built asset) as `runtime_asset` changes, so they enter the manifest with their hash, plus two keys in `.claude/settings.local.json`: `extraKnownMarketplaces.context-brake-local.source = { source: directory, path: <absolute> }` and `enabledPlugins[context-brake-restart@context-brake-local] = true`, composed on top of the status line bridge change for the same file. A plain init plans nothing for the feature. A second init plans nothing. Other marketplaces and plugins of the user are kept byte for byte. Switching off deletes the files, the keys (pruning empty parents, and dropping a settings file that becomes empty) and the config block; a mod file whose hash differs from the manifest is kept and reported as MODIFIED_OWNED_ASSET. `remove` leaves the file deletion to the manifest path (which already protects edited files) and removes only the settings keys. Flags require Claude Code among the target harnesses (parse-time and after detection).
- Changed files: New: `src/core/services/auto-restart-merge.ts`, `src/infrastructure/harnesses/claude-code/{auto-restart-files,auto-restart-settings,auto-restart-planner}.ts`, `tests/integration/auto-restart-{planner,removal}.test.ts`, `tests/unit/auto-restart-arguments.test.ts`. Modified: `src/cli/{init-arguments,init-config-updates,detection-collector,snapshot-helper}.ts`, `src/cli/commands/init.ts` (91 lines), `src/core/contracts/adapter.ts` (HarnessContext.autoRestart), `src/core/services/{installation-builder,installation-service}.ts`, `src/infrastructure/harnesses/claude-code/planner.ts` (79 lines), `tests/unit/init-light-arguments.test.ts` (three exact-shape expectations gained `autoRestart: { kind: keep }`).
- Checks: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run schemas:check`, `npm run assets:check` clean. Full `npm run coverage`: 317 files passed, 2023 tests passed, 3 skipped, overall coverage 96.02% statements, 91.68% branches. A first full run had 7 failures: four from this task (init-light-arguments exact shapes, a hard JSON.parse on commented settings.local.json, a conflict raised for unparseable settings even when the feature is not requested), fixed; the other was the known load-sensitive e2e doctor case, which passed in the second run. Quality sweep (QA-01 to QA-05, QA-07 to QA-09, QA-11) empty; QA-10 flagged `pruneEmpty(text, key, group: Record<string, unknown> | undefined)` in auto-restart-settings.ts, a false positive (3 parameters, the regex counted the comma inside the generic).
- Validated state: Base `c7529c5` plus the T02 to T05 diffs, Windows 11, Node via npm scripts. The real Claude Code was not started against the installed files in this task (MA-01, T07). Not verified on Linux or macOS (CI only).
- Open items: Deviation (resolved by codereview_01/T11 under DEC-CR-04, which added the capability): the `auto_restart` capability from T05.3 was not added, because nothing consumes it and it would touch the support-profile contract and the doctor schema; T06 reports state through findings instead. Hash comparison for modified mod files lives in the mod planner because `protectModifiedAssets` ignores deletions; if more adapters need it, move it to core. `--auto-restart` against a repository with unparseable `.claude/settings.local.json` raises INVALID_HARNESS_CONFIG; without the flag the file is ignored. Deleting a settings.local.json that becomes `{}` after the switch-off also removes a user-created empty file.

### ADR candidates

None - direct TechSpec implementation or local decision
