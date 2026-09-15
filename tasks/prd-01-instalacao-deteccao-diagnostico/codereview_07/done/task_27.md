# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_07/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T27 — Keep removal going when one harness configuration cannot be parsed

## Outcome

`remove` treats an unparsable harness configuration as a conflict that affects only that harness:
- the file stays untouched, and its hook script stays in place;
- an error finding names the path, the parse error, and how to fix it;
- every other harness is still removed;
- the command exits 2 with a normal report instead of `UNEXPECTED_ERROR`.

The manifest and `context-brake.config.json` stay until the user repairs the file and a later `remove` finishes the job.

## Dependencies and boundaries

- Depends on: T25, T26, T28 — they rewrite the same `planRemove` functions, so this task runs last.
- Unblocks: the successor re-review of `codereview_07/CR-06`
- In scope:
  - unparsable-config handling in `planRemove` for `claude-code`, `codex-cli`, `cursor`, and `antigravity-cli`, through one shared helper;
  - conflict handling and finding text in `removal-service.ts`;
  - unit, integration, and end-to-end tests.
- Out of scope:
  - duplicated validation across the five install planners. The `codereview_07` quality profile suggests `sdd-plan-refactoring` for it; no correction finding requires it.
  - Copilot's dedicated, ContextBrake-owned config file, which removal deletes as today.
  - PRD 1.1 `DEC-15` extraction of `state-removal.ts`. If `removal-service.ts` would exceed 100 lines, extract only the logic this task adds, and name the new file in the Handoff so the PRD 1.1 terrain baseline can be remeasured.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_07/CR-06 | `codereview.md#findings` | Four `planRemove` functions discard the `validateJsonDocument` result, and the editor then throws. Probe P3: `remove` exits 2 with `UNEXPECTED_ERROR` and leaves the valid Cursor integration installed. |
| codereview_07 | `codereview.md#quality-profile` | Escalation trigger: the discarded validation repeats in `claude-code/planner.ts:76`, `codex-cli/planner.ts:72`, `cursor/planner.ts:68`, `antigravity-cli/planner.ts:72` |
| `.agents/rules/file-changes.md` | Refuse Files You Cannot Parse | Leave the file untouched, report path and error, continue with the other harnesses |
| `.agents/rules/cli-output.md` | Messages | Expected errors state what happened, the file, and the fix; no unexpected-error path |
| TechSpec | `System Architecture` data flow, step 4 | Invalid vendor files become per-harness conflicts and do not suppress safe plans for other harnesses |
| PRD-01 | RF19, CA-12 | Removal takes out owned content and preserves the rest |

## Requirements

- **Shared validation in `planRemove`:** each of the four `planRemove` functions validates its configuration through one helper under `src/infrastructure/harnesses/common/`.
  - When the file cannot be parsed, the adapter returns an `INVALID_HARNESS_CONFIG` conflict with the relative path and the parser detail.
  - It plans no change for that harness: neither the config edit nor the runtime asset deletion. Deleting the script while the harness still references it would make every hook invocation fail, and Cursor's `failClosed: true` then blocks every tool call.
- **Missing config:** a missing configuration file keeps today's behavior, with no config edit and the asset deletion still planned.
- **`removal-service.ts` handling of an `INVALID_HARNESS_CONFIG` removal conflict:**
  - It maps the conflict to an error finding with `harness`, `path`, and the parser detail as `message`. The impact reads "ContextBrake left this harness installed because its configuration could not be parsed." The remediation reads "Fix or restore `<path>`, then run context-brake remove again."
  - It skips manifest-driven deletion of the conflicted harness's runtime assets. Assets are mapped to harnesses without parsing identity strings; if an internal contract addition is needed, it changes no published schema and is recorded in the Handoff.
  - It keeps `.context-brake/manifest.json` and `context-brake.config.json` while any harness removal conflict exists.
  - Every other harness removal, the instruction-block removal, and the protocol removal still apply.
- **Exit and output:** the command exits 2 and prints the install report, text or JSON. `UNEXPECTED_ERROR` does not appear.
- **Rerun:** after the file is repaired, a second `remove --yes` completes with exit 0, and no ContextBrake-owned content is left.
- **Size rules:** `code-standards.md` limits hold for every touched file.

## Context to recover on demand

- TechSpec: `System Architecture` principal data flow; `CliErrorDocument`; `Key Decisions` "Removal is conservative".
- Rules and skills: `.agents/rules/file-changes.md`, `cli-output.md`, `harness-adapters.md`, `tests.md`, `code-standards.md`, `javascript-typescript.md`; `sdd-execute-corrections`.
- Code:
  - `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,antigravity-cli}/planner.ts` — `planRemove` functions (after T25, T26, T28)
  - `src/core/services/removal-service.ts:53-85` — adapter removals, generic conflict finding text, manifest and config deletions
  - `src/core/services/removal-helper.ts:40-54` — manifest-driven asset deletions
  - `src/infrastructure/harnesses/*/planner.ts` install paths — existing `INVALID_HARNESS_CONFIG` conflict shape to mirror

## Work

- [x] T27.1 Add failing tests: each of the four `planRemove` functions with an unparsable config throws today, and `remove` with one unparsable config returns `UNEXPECTED_ERROR`.
- [x] T27.2 Add the shared validation helper and return per-harness conflicts from the four `planRemove` functions.
- [x] T27.3 Update `removal-service.ts`: finding text, skipped asset deletions for conflicted harnesses, and retention of the manifest and configuration.
- [x] T27.4 Add the end-to-end scenario from probe P3 plus the repaired rerun.
- [x] T27.5 Run the gates and the TechSpec quality profile over the task diff.

## Acceptance criteria

- **Per-adapter conflicts:** with an unparsable config, each of the four adapters' `planRemove` returns one `INVALID_HARNESS_CONFIG` conflict and no changes.
- **Probe P3 scenario** (corrupted `.codex/hooks.json` next to a valid Cursor install), `remove --yes --json` produces:
  - exit 2 and a schema-valid report;
  - an error finding naming `.codex/hooks.json`, with the parse error and the remediation above;
  - byte-identical Codex config and a present Codex hook script;
  - removed Cursor entries and script;
  - a manifest and configuration that are still present.
- **Repaired rerun:** after the Codex file is restored to valid JSON, `remove --yes` exits 0 and leaves no ContextBrake entry, asset, manifest, or configuration.
- **No discarded validation:** a search over `src/infrastructure/harnesses/*/planner.ts` finds no `validateJsonDocument(raw);` statement whose result is ignored.
- **Existing suites:** existing removal suites pass: IT-09, E2E-07, and safe removal.

## Verification

- Unit: the shared helper; each `planRemove` with valid, missing, and unparsable configs; `removal-service` with a conflicted adapter, checking the finding, skipped asset deletion, and retained manifest and configuration.
- Integration: a real temporary repository with Claude Code and Cursor installed, with one config corrupted at a time; assert applied and skipped outcomes and file bytes.
- End-to-end: built CLI, probe P3 scenario plus the repaired rerun, in the process lane.
- Manual: none.
- Platforms: Windows locally; Ubuntu, macOS, and Windows × Node 20, 22, and 24 in CI.
- Environment dependency: none.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`; TechSpec quality profile QA-01 to QA-06 over the TypeScript files in the task diff.
- Expected evidence: failing-then-passing tests, the JSON report of the P3 scenario, byte comparisons, green gates, and the CI run ID.

## Affected files

- Modify:
  - `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,antigravity-cli}/planner.ts`
  - `src/core/services/removal-service.ts`
  - `src/core/services/removal-helper.ts`, if asset skipping lands there
- Create:
  - a removal validation helper under `src/infrastructure/harnesses/common/`
  - `tests/unit/removal-conflicts.test.ts`
  - `tests/e2e/e2e-remove-invalid-config.test.ts`
  - an extracted core module, only if `removal-service.ts` would exceed 100 lines

## Observability and recovery

- Operational signal: an error finding with the harness, path, parse error, and remediation, plus `skipped` outcomes for the kept files.
- Recovery: revert this task. Repositories partially removed by it are finished by running `remove --yes` after repairing the file.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result:
  - Created shared removal validation helper `src/infrastructure/harnesses/common/removal-config-validator.ts` (`validateRemovalConfig`).
  - Integrated `validateRemovalConfig` into `planClaudeRemove`, `planCodexRemove`, `planCursorRemove`, and `planAntigravityRemove`, removing all ignored `validateJsonDocument` calls. Unparsable configs yield an `INVALID_HARNESS_CONFIG` conflict, empty changes (`changes: []`), and registered `assetPaths`.
  - Added internal optional `readonly assetPaths?: readonly string[]` to `AdapterPlan` in `src/core/contracts/adapter.ts` to map runtime assets to harnesses without parsing identity strings.
  - Added `createRemovalFinding` to `src/core/services/removal-helper.ts` to map `INVALID_HARNESS_CONFIG` conflicts to error findings with the exact finding text, impact, and remediation, and updated `planAssetDeletions` to accept `excludedPaths`.
  - Updated `src/core/services/removal-service.ts` to record conflict findings, exclude conflicted harness assets from manifest deletion, and keep `.context-brake/manifest.json` and `context-brake.config.json` while any harness removal conflict exists.
  - Created `tests/unit/removal-conflicts.test.ts` verifying all 4 adapters and `removal-service`.
  - Created `tests/e2e/e2e-remove-invalid-config.test.ts` verifying Probe P3 and the repaired rerun.
- Changed files:
  - `src/infrastructure/harnesses/common/removal-config-validator.ts`
  - `src/infrastructure/harnesses/claude-code/planner.ts`
  - `src/infrastructure/harnesses/codex-cli/planner.ts`
  - `src/infrastructure/harnesses/cursor/planner.ts`
  - `src/infrastructure/harnesses/antigravity-cli/planner.ts`
  - `src/core/contracts/adapter.ts`
  - `src/core/services/removal-helper.ts`
  - `src/core/services/removal-service.ts`
  - `tests/unit/removal-conflicts.test.ts`
  - `tests/e2e/e2e-remove-invalid-config.test.ts`
- Checks:
  - `npm run lint` passed (0 errors, 0 warnings).
  - `npm run typecheck` passed.
  - `npm run build` passed.
  - `npm test` passed (74 test files, 276 passed, 1 skipped).
  - `npm run coverage` passed.
  - `npm run schemas:check` passed.
  - `npm run assets:check` passed.
  - `npm run dependencies:check` passed.
  - `npm run package:smoke` passed.
  - QA-01 to QA-06 verified: all files ≤ 92 lines, functions ≤ 23 lines, zero comments.
- Validated state:
  - Windows 11 Pro, pwsh, Node v24.19.0.
  - Probe P3 confirmed: `remove --yes --json` exits 2 with `INVALID_HARNESS_CONFIG` finding, keeps corrupted Codex config byte-identical, keeps Codex hook script, deletes Cursor hook script and entries, and retains manifest and config. Rerun after repairing Codex config exits 0 and cleans all ContextBrake assets and config.
- Open items:
  - None. All tasks for `codereview_07` (T25, T26, T28, T27) are completed.
