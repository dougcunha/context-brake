# Stable execution context

Load in this exact order:

1. `tasks/prd-08-modo-debug/prd.md`
2. `tasks/prd-08-modo-debug/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Debug mode in config, managed block, injection, and `init`

## Outcome

`context-brake init --debug` writes `debug: true`, adds the debug line to every managed block, and makes the engine inject telemetry on every event. `init --no-debug` restores the pre-debug bytes. Light mode rejects the debug mode, except `init --light --no-debug`, which switches in one command.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02
- In scope: CMP-01–CMP-06 (DEC-01–DEC-06, DEC-08); the regenerated `schemas/context-brake.config.schema.json`; TC-01–TC-09.
- Out of scope: `doctor` output and `debugMode` in the doctor report (T02); end-to-end tests (T02); README (T02); any change to the telemetry block format, zones, brake, or protocol file.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, FR-03, FR-04, FR-05 | `prd.md#functional-requirements` | Flag, persistence, block line, forced injection, disable, light conflicts |
| FR-06 (plan and drift) | `prd.md#functional-requirements` | `--dry-run`/`--json` summary; `init` repairs a drifted block |
| NFR-01, NFR-02 | `prd.md#non-functional-requirements` | ≤ 60 tokens; line endings and symlinks |
| DEC-01–DEC-06, DEC-08 | `techspec.md#technical-decisions` | Design to implement |
| TC-01–TC-09 | `techspec.md#test-approach` | Tests to write |

## Context to recover on demand

- Rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `file-changes.md`, `cli-output.md`.
- Pattern: `src/core/services/light-mode-merge.ts` and `tests/unit/light-mode-merge.test.ts` (merge `keep | set | remove`).
- Existing code: `instruction-markers.ts#renderReferenceBlock`; `instruction-service.ts` (lines 32, 39, 66, 79); `legacy-preview.ts:8`; `injection-policy.ts`; `brake-engine.ts:63`; `installation-builder.ts#planConfigChange`; `installation-service.ts:79`; `init-config-updates.ts#planConfigUpdates`; `init-arguments.ts#INIT_OPTIONS`; `init.ts:74`.
- Tests to mirror: `tests/integration/init-light-mode.test.ts`, `tests/integration/init-light-switch.test.ts`, `tests/unit/injection-policy.test.ts`, `tests/unit/telemetry-block-budget.test.ts` (token counting).
- Terrain: `techspec.md#terrain-baseline`. `instruction-service.ts` starts at 103 lines and must not grow; files at 95–99 lines are edited in place.

## Work

- [x] T01.1 Add `debug: z.optional(z.boolean())` after `lightMode` in `configurationSchema`; regenerate schemas (`npm run schemas:generate`).
- [x] T01.2 Create `src/core/services/debug-mode-merge.ts` (`mergeDebugMode`, `applyDebugMode`, `isDebugModeInEffect`) with TC-01.
- [x] T01.3 Change `renderReferenceBlock` to an options object, add `referenceBlockFor(config, eol)` with the exact debug line, and switch the five call sites (TC-03).
- [x] T01.4 Add `debug` to `InjectionInput`/`decideInjection` and pass `isDebugModeInEffect` from `telemetryDecision` (TC-04, TC-05).
- [x] T01.5 Parse `--debug`/`--no-debug`; wire `ConfigUpdates.debug`, the light-mode guards, `planConfigChange`, and `configSummary` (TC-02, TC-07, TC-08).
- [x] T01.6 Integration tests for the `init` lifecycle, idempotency, bytes, symlink, and drift repair (TC-06, TC-09).

## Acceptance criteria

- `init --debug --yes` writes `"debug": true` (valid against the regenerated schema), and every managed block contains the exact DEC-03 line. A second `init --yes` plans no change.
- `init --no-debug --yes` leaves config and instruction files byte-for-byte equal to a fresh install without debug, with LF and CRLF, and a symlinked instruction file keeps its link.
- With `debug: true`, `threshold_only`, 10% usage, and `GREEN`, the engine returns the telemetry block; with debug off or light mode on, it returns neutral. The stored `injectionMode` is unchanged.
- `--debug --no-debug`, `--light --debug`, `--debug` with light configured, and `--light` with debug configured (no `--no-debug`) fail with the usage exit code, a message naming the option and the fix, and no file written. `--light --no-debug` succeeds.
- `init --debug --dry-run --json` lists the config change with `set the debug mode (agent prints context usage)` and the instruction-block updates, and passes `installReportSchema`.
- The debug line is at most 60 `o200k_base` tokens; with debug off, the block equals the current block exactly.

## Verification

- Unit: TC-01, TC-02, TC-03, TC-04.
- Integration: TC-05, TC-06, TC-07, TC-08, TC-09 against temporary repositories, in-process.
- End-to-end: not applicable (T02).
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run schemas:check`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: test names linked to TC-NN, full command outputs, and the quality profile over the diff.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `src/core/services/instruction-markers.ts`, `src/core/services/instruction-service.ts`, `src/core/services/legacy-preview.ts`, `src/core/services/injection-policy.ts`, `src/core/services/brake-engine.ts`, `src/core/services/installation-builder.ts`, `src/core/services/installation-service.ts`, `src/cli/init-arguments.ts`, `src/cli/init-config-updates.ts`, `src/cli/commands/init.ts`, `schemas/context-brake.config.schema.json`, `tests/unit/init-arguments.test.ts`, `tests/unit/injection-policy.test.ts`.
- Create: `src/core/services/debug-mode-merge.ts`, `tests/unit/debug-mode-merge.test.ts`, `tests/unit/instruction-markers.test.ts` (or extend the existing test of that module), `tests/integration/debug-injection.test.ts`, `tests/integration/init-debug-mode.test.ts`.

## Observability and recovery

- Operational signal: the `init` plan summary names the debug change.
- Recovery: `init --no-debug` or `remove`.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `init --debug`/`--no-debug` persist the optional top-level `debug` key (DEC-01) through `src/core/services/debug-mode-merge.ts` (DEC-02). `referenceBlockFor(config, eol)` renders the exact DEC-03 line (`DEBUG_MODE_LINE`) from the merged config at all five call sites. `decideInjection` takes `debug`, and `telemetryDecision` passes `isDebugModeInEffect` (DEC-04). The light-mode guards (DEC-05) and the config summary (DEC-06) are wired through `init-config-updates.ts`, `installation-builder.ts`, `installation-service.ts`, and `init.ts`. The config schema is regenerated.
- Changed files: `src/core/contracts/configuration.ts`, `src/core/services/{debug-mode-merge (new),instruction-markers,instruction-service,legacy-preview,injection-policy,brake-engine,installation-builder,installation-service}.ts`, `src/cli/{init-arguments,init-config-updates}.ts`, `src/cli/commands/init.ts`, `schemas/context-brake.config.schema.json`. Tests: new `tests/unit/{debug-mode-merge,instruction-markers,brake-engine-debug}.test.ts` and `tests/integration/init-debug-mode.test.ts`; updated `tests/unit/{injection-policy,init-arguments,instruction-service,init-light-arguments}.test.ts` (new `debug` input and `ConfigUpdates.debug`).
- Checks (Windows 11, Node 24.19.0, at base 791defe plus this diff): `npm run build` OK; `npm run typecheck` OK; `npm run lint` OK; `npm run schemas:check` OK. `npm run coverage`: 284 files, 1,816 passed, 3 skipped, 0 failed, 95.6% lines, exit 0. A first full run had 4 failures: three in `init-light-arguments.test.ts` (exact `ConfigUpdates` without `debug`, fixed) and `e2e-simulated-boot.test.ts` "delivers boot on session startup for pi", which passed on an isolated rerun (13/13) and in the final full run, so it is flaky and unrelated.
- Test mapping: TC-01 `debug-mode-merge.test.ts`; TC-02 `init-arguments.test.ts` "init debug flags" plus the conflict case in `init-debug-mode.test.ts`; TC-03 `instruction-markers.test.ts` (exact block on/off, CRLF, light, 60-token budget); TC-04 `injection-policy.test.ts` "injection policy in the debug mode"; TC-05 `brake-engine-debug.test.ts`; TC-06 `init-debug-mode.test.ts` "init --debug lifecycle" and "through a symlink"; TC-07 "init debug conflicts"; TC-08 and TC-09 "init debug plan and drift".
- Deviation: TC-05 is a unit test over the engine with port fakes (`tests/unit/brake-engine-debug.test.ts`) rather than `tests/integration/debug-injection.test.ts`. `.agents/rules/tests.md` puts `src/core` services in the unit layer, and the hook process path is covered end to end by TC-12 in T02.
- Quality profile: QA-01 to QA-06 have no hits in the touched files. QA-07: `src/core/services/instruction-service.ts` stays at 103 lines (baseline hit, not grown; the four call sites shrank, but net lines did not change). `installation-service.ts` reached 100 lines, at the limit. No new reservation hits.
- Validated state: working tree at 791defe plus the T01 diff (47,989 characters including tests and schema); Windows only. Linux and macOS through CI.
- Open items: none for T01. `doctor`, end-to-end, and README are T02.

### ADR candidates

None - direct TechSpec implementation or local decision.
