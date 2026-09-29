# Stable execution context

Load in this exact order:

1. `tasks/prd-10-statusline-powershell-e-modo-light/prd.md`
2. `tasks/prd-10-statusline-powershell-e-modo-light/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Debug in both modes and light mode as the default

## Outcome

With debug on, every telemetry block, in full and light mode, carries a prefilled `debug_line` for the agent to print, and no instruction file holds the debug line any more. A plain `init` installs light mode unless the configuration records `"fullMode": true`, which `init --no-light` writes and `init --light` clears. It says so in the report, and `doctor` tells unmigrated full installs what the next `init` will do. Light mode installs the status line bridge by default and still never blocks. The README and the protocol describe all of this.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: —
- In scope: FR-06 to FR-09; the FR-12 part in `README.md` and `docs/context-brake-protocol.md`; DEC-07 to DEC-10 and the relevant part of DEC-13.
- Out of scope: `context-brake run` in light mode; blocking in light mode; changing full-only option rejection (PRD assumption); the bridge internals (T01).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06, FR-07, FR-08, FR-09, FR-12 | `prd.md#functional-requirements` | Debug channel, light default, recorded full mode, bridge in light mode, docs |
| NFR-01, NFR-03 | `prd.md#non-functional-requirements` | Platforms, schema compatibility, 40-token debug budget |
| DEC-07–DEC-10 | `techspec.md#technical-decisions` | Design |
| CMP-08–CMP-11, CMP-13 | `techspec.md#components-and-flow` | Components |
| TC-09–TC-14, TC-18 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/` `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `file-changes.md`, `cli-output.md`; `sdd-jev` J3.
- Existing code: `src/core/services/debug-mode-merge.ts:isDebugModeInEffect`; `instruction-markers.ts:DEBUG_MODE_LINE`/`renderReferenceBlock`/`referenceBlockFor`; `telemetry-block.ts:renderTelemetryBlock`; `brake-engine.ts:telemetryDecision`; `session-zone.ts:renderSessionTelemetry`; `light-mode-merge.ts`; `src/cli/init-config-updates.ts:planConfigUpdates`/`LIGHT_MODE_OPTIONS`/`DEBUG_IN_LIGHT_MODE`; `src/cli/commands/init.ts:68-69,88`; `installation-builder.ts:configSummary`; `configuration.ts:configurationSchema`; `configuration-validator.ts`; `doctor-checks.ts:checkConfig`; `delegated-diagnostics.ts` (`ok` finding pattern).
- Tests to extend: `tests/unit/light-mode-merge.test.ts`, `debug-mode-merge.test.ts`, `telemetry-block.test.ts`, `telemetry-block-budget.test.ts`, `init-light-arguments.test.ts`, `brake-engine-debug.test.ts`; `tests/integration/init-debug-mode.test.ts`, `init-debug-mode-disable.test.ts`, `init-light-mode.test.ts`, `init-light-switch.test.ts`, `runtime-light-mode.test.ts`, `doctor-light-mode.test.ts`; `tests/e2e/e2e-light-mode.test.ts`, `e2e-debug-mode.test.ts`. Existing tests that assume full mode for a plain `init` must pass `--no-light`, or assert the new default.
- Contract or integration: `techspec.md#contracts-and-data` (configuration, telemetry block, reference block, findings, CLI).

## Work

- [x] T02.1 Debug channel: `isDebugModeInEffect`, the reference block without the debug line, and `debug_line` in `renderTelemetryBlock` through `telemetryDecision`; drop the light-mode rejections of debug (DEC-07; TC-09, TC-10).
- [x] T02.2 `fullMode` in the configuration, validator, and published schema; the `LightModeUpdate` `full` variant and the default in `isLightModeInEffect`/`mergeLightMode`/`applyLightMode` (DEC-08; TC-12).
- [x] T02.3 `init`: bridge default in both modes (DEC-10), `LIGHT_MODE_DEFAULT_APPLIED` in the report; `doctor`: `LIGHT_MODE_DEFAULT_PENDING` from `light-default-findings.ts` (DEC-09; TC-11, TC-13).
- [x] T02.4 Update existing tests that relied on full mode as the default; end-to-end flow (TC-14).
- [x] T02.5 README (light mode as the default and how to keep full mode, debug in both modes, bridge command and shell, `SessionStart` deadline, downgrade note) and `docs/context-brake-protocol.md` (`debug_line`) (TC-18).
- [x] T02.6 `npm run schemas:check`, `npm run build`, and the full validation.

## Acceptance criteria

- In light mode, `init --debug --yes` succeeds, instruction files are untouched, and the next block carries `debug_line`, which `--no-debug` removes. A full install loses the PRD-08 debug line on `init` while debug stays on (TC-10).
- The debug addition is ≤ 40 `o200k_base` tokens, and the block without debug is byte-identical to before (TC-09).
- A new repository and a legacy full install both end in light mode after plain `init --yes`, with `LIGHT_MODE_DEFAULT_APPLIED`. Without `--yes`, the plan asks and a decline writes nothing. `doctor` shows `LIGHT_MODE_DEFAULT_PENDING`, with status and exit code unchanged (TC-11).
- `--no-light` records `fullMode`, and a later plain `init` keeps full mode and is a no-op. `--light` drops `fullMode`. Both keys together are `INVALID_CONFIG`. The configuration validates against the published schema in each state (TC-12).
- Light mode installs the bridge by default, `--no-statusline-bridge` opts out, and `pre_tool` in `CRITICAL` stays neutral (TC-13).
- The README no longer says debug mode is unavailable in light mode (TC-18). QA-01 to QA-09 are clean over the diff, except for the baseline.

## Verification

- Unit: TC-09, TC-12 (merge table).
- Integration: TC-10, TC-11, TC-12 (switch), TC-13.
- End-to-end: TC-14, with the built CLI against a temporary fixture repository.
- Manual: after the task, run `context-brake init --no-light` in this repository to keep dogfooding full mode (`DEC-PD-05`), and check that `doctor` is clean.
- Platforms: Windows locally; Linux and macOS through CI.
- Commands: `npm run schemas:check`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: green runs with test counts; `schemas:check` green.

## Affected files

- Modify: `src/core/services/debug-mode-merge.ts`, `instruction-markers.ts`, `telemetry-block.ts`, `brake-engine.ts`, `light-mode-merge.ts`, `installation-builder.ts`, `doctor-checks.ts`, `src/core/contracts/configuration.ts`, `src/core/validation/configuration-validator.ts`, `src/cli/init-config-updates.ts`, `src/cli/commands/init.ts`, `schemas/context-brake.config.schema.json`, `README.md`, `docs/context-brake-protocol.md`, and the tests listed above
- Create: `src/core/services/light-default-findings.ts`, `tests/integration/init-light-default.test.ts`

## Observability and recovery

- Operational signal: `LIGHT_MODE_DEFAULT_APPLIED` (init) and `LIGHT_MODE_DEFAULT_PENDING` (doctor); `debugMode` in `doctor --json`.
- Recovery: `init --no-light` restores full mode with its blocks; `init --no-debug` turns debug off.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: T02 implemented (T02.1–T02.5) and validated; T02.6 is the full validation recorded below.
- Changed files: `src/core/contracts/configuration.ts` (`fullMode` and its exclusion with `lightMode`); `src/core/services/debug-mode-merge.ts`, `instruction-markers.ts`, `telemetry-block.ts`, `brake-engine.ts`, `session-zone.ts`, `light-mode-merge.ts`, `installation-builder.ts`, `doctor-checks.ts`, `protocol-service.ts`; new `src/core/services/light-default-findings.ts`; `src/cli/init-config-updates.ts`, `src/cli/commands/init.ts`; `schemas/context-brake.config.schema.json` (regenerated); `README.md`, `docs/telemetry-block.md`; tests `unit/{debug-mode-merge,light-mode-merge,init-light-arguments,instruction-markers,telemetry-block,telemetry-block-budget,window-trust,zone-guidance,light-guidance,brake-engine-debug,doctor-checks,config-legacy-checks,readme-config-example}.test.ts`, new `integration/init-light-default.test.ts`, `integration/{init-debug-mode,init-debug-mode-disable,init-delegated-snapshot,init-light-mode,statusline-default,doctor-brake-window,doctor-light-mode,doctor-delegated-snapshot,doctor-benchmark}.test.ts`, `e2e/{e2e-10-fixtures,e2e-light-mode,e2e-legacy-preview,e2e-gitignore-lifecycle,e2e-window-trust,e2e-delegated-snapshot}.test.ts`, and the shared helpers `tests/helpers/{light-world,gitignore-fixtures}.ts`, `tests/support/harness-simulator/process-driver.ts`, `tests/helpers/run-acceptance.ts`.
- Checks: `npm run build`, `npm run lint`, `npm run typecheck`, and `npm run schemas:check` clean. `npm run coverage` on 2026-09-29 at the final state: **307 of 307 test files green, 96.06% lines, 530.54 s**. The light default broke 96 tests in 30 files on the first sweep; all were updated to the new contract, not weakened. The README assertions added after that run were re-verified green on their own. QA-01 to QA-09 clean over the diff, with no file above 100 raw lines (`init.ts` ended at 97 after the applied-finding decision moved to `light-default-findings.ts`).
- Validated state: Windows 11, Node 24; base `1906d41` plus the T01 diff. jev point J3 did not run in this session either (`DEC-JEV-01`).
- Open items:
  - Manual, owner: user, after this task: run `context-brake init --no-light` in this repository to keep dogfooding the full mode (`DEC-PD-05`), then `context-brake doctor` clean. The plain `init` would switch this repository to light mode on its next run, which is exactly what `LIGHT_MODE_DEFAULT_PENDING` warns about.
  - T01's manual acceptance is still open (`done/task_01.md#Handoff`); it needs a harness restart and is not part of this task.
  - Pre-existing load-dependent flakes under `npm run coverage`, unchanged by this task: `boot-git-delivery` and `runtime-overhead`.
- Deviations from the TechSpec, all inside the contract:
  1. The protocol paragraph about `debug_line` is rendered only when the configuration has `debug: true`, so a non-debug installation's protocol file stays byte-identical and this repository's own protocol does not drift. DEC-07 required the protocol to document the field; it did not say whether the paragraph is unconditional.
  2. `LIGHT_MODE_DEFAULT_APPLIED` is added to the applied report only, not to `--dry-run`, because its text says the installation switched; the dry run already shows "set the light mode section" in the plan. An `ok` finding changes neither the status nor the exit code.
  3. The finding also appears on a first install in a repository with no configuration, since that run does install light mode by default; FR-07 only required the legacy-full case.
  4. Test-side, `FULL_INIT` in `tests/helpers/light-world.ts` now carries `--no-light` so its name keeps its meaning, and `PLAIN_INIT` was added for the default. Two shared helpers (`process-driver.installHarness` and `run-acceptance`'s fixture) pass `--no-light`, which is what their brake, plan, and boot scenarios need.
  5. `debug` became a required field of `TelemetryBlockInput`, so all thirteen test call sites state it explicitly instead of relying on a default.

### ADR candidates

- `None - direct TechSpec implementation or local decision`. The only structural choice was the `fullMode` key versus a `mode` enum, and DEC-08 already fixed that with its alternatives.
