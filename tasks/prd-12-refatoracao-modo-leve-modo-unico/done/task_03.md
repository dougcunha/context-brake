# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md`
2. `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Single mode with an optional snapshot command

## Outcome

The config has one `snapshot` section with `triggerZone`, plus optional `command` and `resumeCommand`.

- `init` sets the section with `--snapshot-command`, `--snapshot-trigger`, and `--resume-command`, and clears the commands with `--no-snapshot-command`.
- Telemetry and session start use one guidance module that follows the texts in the TechSpec.
- `doctor` reports a `snapshot` field.
- `lightMode`, `fullMode`, `delegatedSnapshot`, `--light`, `--no-light`, `--snapshot-path`, and `--snapshot-skill` no longer exist.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T04, T06
- In scope:
  - Config and contracts (DEC-01, DEC-02):
    - `configuration.ts` gets the `snapshot` schema, its defaults, and the `resumeCommand` requires `command` rule.
    - Delete `light-mode.ts` and the `delegatedSnapshot` schema.
    - Drop the full/light check.
    - Update `DEFAULT_CONFIG`.
  - Init flags and merge (DEC-03):
    - `init-arguments.ts`, `init-config-updates.ts`, and `installation-builder.ts` change.
    - `delegated-snapshot-merge.ts` becomes `snapshot-merge.ts`.
    - Delete `light-mode-merge.ts`, `light-default-findings.ts`, and `delegated-diagnostics.ts`.
  - Guidance (DEC-05):
    - `zone-guidance.ts` exports `zoneAction` and `resumeText`.
    - Delete `light-guidance.ts`, `delegated-guidance.ts`, `delegated-protocol.ts`, and `contracts/checkpoint-mode.ts`.
    - `zone-actions.ts` keeps only what the new texts need.
    - The brake engine, the failure policy, and the session-reset handler call the new functions.
    - Until T04, the pre-tool path keeps neutral behavior: there is no deny source left after this task, because both denying guidances were plan and delegated.
  - Doctor (DEC-10, snapshot part):
    - Drop `checkpointMode` and the `doctor-mode-text.ts` content.
    - Add the `snapshot` field and its text output.
    - Drop the `DELEGATED_*` and `LIGHT_MODE_DEFAULT_*` findings.
  - `debug-mode-merge.ts` and the mod config no longer reference light mode.
  - Tests: rewrite or delete the light, delegated, and guidance tests. Add `init-snapshot` integration coverage. `e2e-light-mode` covers the snapshot flags end to end.
- Out of scope:
  - Block log, allowlists, and the `brake` key (T04).
  - Pre-tool hooks (T05).
  - The protocol file, instruction blocks, `.gitignore` block, and `LIGHT_MODE_LEFTOVER` / `LIGHT_MODE_ASSET_KEPT` (T06; the support-files full branch becomes unreachable here and is deleted there).
  - Markdown handoff (prd-14).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02 | `prd.md#functional-requirements` | `lightMode`, `fullMode`, `delegatedSnapshot`, `--light`, `--no-light` gone |
| FR-04 | `prd.md#functional-requirements` | Trigger zone and optional commands with flags |
| FR-05 | `prd.md#functional-requirements` | Action names the command; resume text |
| FR-06 | `prd.md#functional-requirements` | No command: generic action without the marker |
| FR-09 | `prd.md#functional-requirements` | Doctor `snapshot` field; delegated and light-default findings gone |
| DEC-01, DEC-02, DEC-03, DEC-05, DEC-10 | `techspec.md#technical-decisions` | Config, flags, guidance, doctor |
| CMP-01, CMP-02, CMP-03, CMP-07 | `techspec.md#components-and-flow` | — |
| TC-04 to TC-08, TC-13 (snapshot part) | `techspec.md#test-approach` | — |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`, `cli-output.md`, `file-changes.md`.
- Existing code:
  - `src/core/services/delegated-snapshot-merge.ts:15-25`: the merge rules to keep or drop.
  - `src/core/services/installation-builder.ts:12,43,59-71`: merge chain, key order, and preview text.
  - `src/cli/init-config-updates.ts:13-33,55-59`.
  - `src/core/services/light-guidance.ts` and `delegated-guidance.ts`: the current texts.
- Contracts: `techspec.md#contracts-and-data`, the config and agent-facing text tables.

## Work

- [x] T03.1 Replace the mode sections with `snapshot` in the config contract and defaults. Regenerate the config schema.
- [x] T03.2 Implement `zoneAction` and `resumeText`, and switch the brake engine, failure policy, and session-reset handler to them. Delete the old guidance modules and the `checkpoint-mode` contract.
- [x] T03.3 Replace the flags and the merge (`snapshot-merge.ts`), including the `--no-snapshot-command` exclusivity rule and the `resumeCommand` requires `command` validation.
- [x] T03.4 Add the `snapshot` field to the doctor report and its text output. Drop `checkpointMode` and the delegated and light-default findings.
- [x] T03.5 Rewrite or delete the affected tests. Add TC-05 to TC-08 coverage. Clean the lanes.
- [x] T03.6 Run lint, typecheck, `schemas:check`, the touched suites, then `npm run coverage`.

## Acceptance criteria

- `init --snapshot-command "/sdd-snapshot" --resume-command "/x"` writes both commands. `init --snapshot-trigger YELLOW` alone writes the trigger zone. `init --no-snapshot-command` clears both commands and keeps the trigger zone. `--no-snapshot-command` combined with another snapshot flag fails with `INVALID_ARGUMENTS`.
- `init --light`, `--no-light`, `--snapshot-path`, and `--snapshot-skill` fail with `INVALID_ARGUMENTS`. A config with `lightMode`, `fullMode`, or `delegatedSnapshot` fails validation, naming the key. `resumeCommand` without `command` fails, naming `snapshot.resumeCommand`.
- Telemetry text matches the TechSpec table for every zone, with and without a command.
- `SessionStart` with origin `clear` returns the resume block only when `resumeCommand` is set.
- `doctor --json` validates against the regenerated schema and carries `snapshot`.

## Verification

- Unit: `tests/unit/zone-guidance.test.ts` (TC-07), `configuration.test.ts` (TC-04), `init-arguments.test.ts` (TC-06), `telemetry-block.test.ts`, `debug-mode-merge.test.ts`, and snapshot-merge tests.
- Integration: `tests/integration/init-snapshot.test.ts` (TC-05), `runtime-light-mode.test.ts` (TC-08), and `doctor-light-mode.test.ts` (the `snapshot` part of TC-13).
- End-to-end: `tests/e2e/e2e-light-mode.test.ts`, rewritten: snapshot flags round trip with `init`, then `doctor`.
- Manual: none.
- Platforms: Windows local.
- Commands: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run build`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: pass counts, coverage thresholds met, and a generated config schema with `snapshot` and without the removed keys.

## Affected files

- Create: `src/core/services/snapshot-merge.ts`, `tests/integration/init-snapshot.test.ts`.
- Delete: `src/core/contracts/{light-mode,checkpoint-mode}.ts`, `src/core/services/{light-guidance,delegated-guidance,delegated-protocol,delegated-diagnostics,delegated-snapshot-merge,light-mode-merge,light-default-findings}.ts`.
- Modify:
  - Contracts and core services: `src/core/contracts/{configuration,diagnostics}.ts`, `src/core/services/{zone-guidance,zone-actions,brake-engine,failure-policy,session-reset-handler,installation-builder,debug-mode-merge,doctor-service,doctor-report-extras,doctor-checks,report-service}.ts`.
  - CLI: `src/cli/{init-arguments,init-config-updates}.ts`, `src/cli/commands/{init,doctor}.ts`, `src/cli/output/{text,doctor-mode-text}.ts`.
  - Mod and schemas: `src/infrastructure/harnesses/claude-code/mod/mod-config.ts`, `schemas/{context-brake.config,doctor-report}.schema.json`.

## Observability and recovery

- Operational signal: `doctor` shows the snapshot settings.
- Recovery: `git revert` of the task commit.

## Handoff

> Updated by `sdd-execute-task`. **T03 complete.**

- Produced result:
  - **Config.** `snapshot` section: `triggerZone` (default RED), optional `command` and `resumeCommand`. A resume command requires a command (`configuration.ts` `snapshotSchema`, `DEFAULT_SNAPSHOT`). `lightMode`, `fullMode`, and `delegatedSnapshot` are gone.
  - **Init flags.** `--snapshot-command`, `--snapshot-trigger`, `--resume-command`, and `--no-snapshot-command` (which cannot be combined with `--snapshot-command` or `--resume-command`, per DEC-03). `--light`, `--no-light`, `--snapshot-path`, and `--snapshot-skill` are gone. `--instruction-file`, `--create-instructions`, and `--migrate-legacy` throw "no longer available" until T06 deletes them.
  - **Merge and guidance.** `snapshot-merge.ts` replaces `delegated-snapshot-merge.ts`. `zone-guidance.ts` exports `zoneAction(zone, snapshot)` and `resumeText(snapshot)` with the TechSpec texts. The engine `pre_tool` always returns neutral; the failure policy never denies, and a deadline reset returns the resume text.
  - **Deleted.** The `checkpoint-mode` and `light-mode` contracts, `light-guidance`, `delegated-guidance`, `delegated-protocol`, `delegated-diagnostics`, `light-mode-merge`, and `light-default-findings`.
  - **Doctor.** `snapshot` field `{ triggerZone, command|null, resumeCommand|null }` with a text line. `checkpointMode`, `DELEGATED_*`, and `LIGHT_MODE_DEFAULT_*` are gone. `brakeWindow` stays until T04.
  - **Install paths.** `support-files` always takes the light path; the dead protocol, instruction, and gitignore modules are deleted in T06.
- Tests:
  - Added or rewritten: `unit/{zone-guidance (TC-07),snapshot-merge,doctor-mode-text,configuration-snapshot (TC-04, split from configuration to stay under 100 lines),init-arguments (TC-06),session-zone,window-trust,failure-policy-snapshot-reset}`, `integration/{init-snapshot (TC-05, renamed from init-light-mode),runtime-light-mode (TC-08, plus the resume text),doctor-light-mode (TC-13 snapshot part)}`, `e2e/e2e-light-mode` (snapshot flags round trip with init, hook, and doctor).
  - Fixtures moved off the removed modes: `fixtures/claude-mod-scene.ts` (no `mode` option), `claude-mod-{gates,guards,restart}`, `support/harness-simulator/process-driver.ts`, `e2e/e2e-10-fixtures.ts` (instruction files now stay byte for byte), `init-debug-mode*`, `statusline-default`, `doctor-benchmark`, `debug-mode-merge`, `brake-engine-debug`.
  - Deleted (full-mode install paths, unreachable): `e2e/e2e-gitignore-lifecycle`, `e2e/e2e-legacy-preview`, `integration/gitignore-lifecycle`, `helpers/gitignore-fixtures.ts`, the full-mode cases in `unit/doctor-checks`, `unit/config-legacy-checks`, and `init-debug-mode*`. Lanes pruned.
- Checks (Windows 11, base `1474f54` plus T01-T03): `npm run lint` clean; `npm run typecheck` clean; `npm run build` passes; touched suites 31 files, 158 + 108 tests, all passing. Quality profile QA-01..QA-08 over the changed `src` files: no hit.
- Deliberately left red, owned by later tasks (each task's contract already rewrites or deletes them):
  - T04: the deny assertions in `unit/{brake-engine-pre-tool,brake-engine-window-trust,brake-engine-lifecycle,failure-policy,failure-policy-window-trust,process-hook-host,in-process-host,in-process-host-deadline,in-process-runtime,in-process-opencode-deny,runtime-opencode,runtime-claude-measured}`, `integration/{runtime-failure-policy,runtime-in-process,runtime-host-process,runtime-codex,runtime-cursor,runtime-copilot,runtime-antigravity,runtime-invalid-config}`, `e2e/{e2e-brake,e2e-window-trust,e2e-measured-brake}`, and `integration/doctor-brake-window`.
  - T06: `--remove-state` in `e2e/e2e-07-08` and `integration/runtime-state-removal`.
  - T07: README tests `unit/{readme-light-example,readme-config-example}` and `integration/docs-auto-restart`.
- Open items: none for T03.

### ADR candidates

None - direct TechSpec implementation or local decision.
