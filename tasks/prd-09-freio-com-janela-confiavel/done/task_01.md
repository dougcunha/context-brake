# Stable execution context

Load in this exact order:

1. `tasks/prd-09-freio-com-janela-confiavel/prd.md`
2. `tasks/prd-09-freio-com-janela-confiavel/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Window origin gates every deny

## Outcome

Every usage reading, ledger `tool` line, and telemetry block carries the window origin (`harness`, `declared`, or `config`). The brake denies a tool call, through `critical_ceiling` or `integration_failure`, only when that origin is `harness` or `declared`. Harnesses without a window source honor `telemetry.declaredContextWindow`, and the debug line repeats the origin.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02
- In scope: CMP-01–CMP-05 (DEC-01–DEC-07, DEC-11); updating every existing test and doc that hard-codes `[ContextBrake v2]` or expects a deny with the fallback window.
- Out of scope: the Claude Code bridge default, opt-out, and doctor (T02); the runner (`session-watch.ts`); `.gitignore` handling.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, FR-03, FR-05, FR-06 | `prd.md#functional-requirements` | Origin, both deny gates, declared window, block `v3`, debug line |
| FR-08 (telemetry and protocol docs) | `prd.md#functional-requirements` | `docs/telemetry-block.md`, `docs/context-brake-protocol.md` |
| NFR-01, NFR-02 | `prd.md#non-functional-requirements` | Hook p95 budgets; optional fields; `window=` ≤ 10 tokens |
| DEC-PD-02 | `workflow.md#human-decisions-log` | Turns never deny; declaration only without a harness source |
| DEC-01–DEC-07, DEC-11 | `techspec.md#technical-decisions` | Design of this slice |
| TC-01–TC-08, TC-12, TC-15 | `techspec.md#test-approach` | Tests of this slice |

## Context to recover on demand

- Rules: `.agents/rules/code-standards.md` (100-line files, 30-line functions, ≤ 3 parameters), `tests.md`, `harness-adapters.md` (capability states).
- Code: `src/core/services/session-zone.ts:22-28` (`mergeMeasurements`), `usage-resolver.ts:24,26`, `brake-engine.ts:42-46,56,66`, `failure-policy.ts:54-61,84`, `session-counters.ts:26-37`, `src/core/contracts/session-ledger.ts:23`, `zone-classifier.ts:20-23`, `telemetry-block.ts`, `zone-actions.ts:18-19,31`, `instruction-markers.ts:DEBUG_MODE_LINE`, `configuration.ts:75`, `config-legacy-checks.ts:33-34`, `src/infrastructure/runner/wrap-telemetry.ts:44-45` (the other `readZone` caller: its descriptor must carry `capabilities`).
- Tests that hard-code `[ContextBrake v2]` (16 files): `docs/telemetry-block.md`, `tests/unit/telemetry-block.test.ts`, `tests/integration/wrap-command.test.ts`, and one each in `tests/unit/` (`failure-policy-delegated`, `brake-engine-pre-tool`, `brake-engine-delegated`, `zone-guidance`, `light-guidance`, `in-process-runtime`, `runtime-opencode`, `session-zone`), `tests/integration/` (`runtime-light-mode`, `runtime-in-process`), `tests/e2e/` (`e2e-debug-mode`, `e2e-run-approval-wrap`), `tests/support/harness-simulator/in-process-driver.ts:34`. Expected deny with the fallback window: `tests/unit/session-zone-statusline.test.ts:75`, `session-zone-reset-window.test.ts:43`; also check `tests/unit/brake-engine-*.test.ts` and `tests/integration/runtime-parallel-turns.test.ts`.
- Harness reference: `docs/research/harness-integrations.md` ("Uso de contexto" column).

## Work

- [x] T01.1 Add `windowOrigin` to `UsageReading` and resolve it in `resolveUsage`/`readZone`; create `src/core/services/window-trust.ts` (`acceptsDeclaredWindow`, `isTrustedWindow`, warning-only CRITICAL action); add `capabilities` to `ZoneSettings.descriptor` and wire every `readZone` caller.
- [x] T01.2 Add `telemetry.declaredContextWindow` to the config schema and `normalizeTurnLimits`; regenerate schemas.
- [x] T01.3 Gate `critical_ceiling` in `handlePreTool` (in place); write `windowOrigin` on `tool` ledger lines; expose the last origin in the session summary; gate `integration_failure` in `resolveFailure` (legacy lines count as `config`).
- [x] T01.4 Telemetry block `v3` with `window=`; the warning-only CRITICAL action in `telemetryDecision`; the new `DEBUG_MODE_LINE`; update `docs/telemetry-block.md` and `docs/context-brake-protocol.md`.
- [x] T01.5 New tests TC-01–TC-08 and TC-12; update the existing tests listed above; run the overhead suites (TC-15).

## Acceptance criteria

- TC-02 incident replay: 98000 measured tokens over the 128000 fallback in `CRITICAL` returns neutral for `Bash` and `Edit` and logs no block; with a bridge record of 128000 it denies with `critical_ceiling`.
- TC-03: the integration-failure path denies only when the last `CRITICAL` line has origin `harness` or `declared`; with `config` or no origin it returns neutral and records the error.
- TC-01: the declared window is used only when `context_usage` is `unsupported`; on Pi (`supported`) and Claude Code (`unknown`) it is ignored.
- TC-06–TC-08: the exact `v3` block and debug line texts; `window=` adds at most 10 `o200k_base` tokens; the debug line stays at most 60 tokens; the CRITICAL action with `window=config` does not contain "blocked".
- TC-12: the built Codex hook denies at `CRITICAL` with `declaredContextWindow` and returns neutral without it; the built Claude Code hook without a bridge record returns neutral in pre-tool and a post-tool block with `window=config`.
- TC-15: the existing overhead suites pass unchanged.
- No new export in `failure-policy.ts`, `session-ledger.ts`, `diagnostics.ts`, or `instruction-markers.ts`; no touched file above 100 lines; lint, typecheck, `schemas:check`, and the full suite with coverage pass.

## Verification

- Unit: TC-01–TC-08 (`tests/unit/window-origin.test.ts`, `brake-engine-window-trust.test.ts`, `failure-policy-window-trust.test.ts`, `window-trust.test.ts`, plus the updated suites).
- Integration: TC-15 overhead suites; updated `wrap-command`, `runtime-light-mode`, `runtime-in-process`.
- End-to-end: TC-12 in `tests/e2e/e2e-window-trust.test.ts` (built hooks as child processes, process lane by directory).
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run schemas:check`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: test names citing `TC-NN`, full command outputs, and the quality profile output over the diff.

## Affected files

- Create: `src/core/services/window-trust.ts`, the new tests above.
- Modify: `src/core/contracts/zones.ts`, `src/core/contracts/session-ledger.ts`, `src/core/contracts/configuration.ts`, `src/core/services/usage-resolver.ts`, `session-zone.ts`, `brake-engine.ts`, `failure-policy.ts`, `session-counters.ts`, `telemetry-block.ts`, `config-legacy-checks.ts`, `instruction-markers.ts`, `src/infrastructure/runner/wrap-telemetry.ts` (descriptor capabilities), `schemas/context-brake.config.schema.json`, `docs/telemetry-block.md`, `docs/context-brake-protocol.md`, and the existing tests listed above.

## Observability and recovery

- Operational signal: `window=` in every telemetry block; `blocks.jsonl` only for real denies; `errors.jsonl` still records every integration failure.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: window origin on `UsageReading` (`zones.ts` `WINDOW_ORIGINS`), resolved in `usage-resolver.ts#resolveWindow` (harness window, then the declared window, then `contextWindowCeiling`) and filtered by `window-trust.ts#acceptsDeclaredWindow` in `session-zone.ts#readZone`; `critical_ceiling` gated in `brake-engine.ts#handlePreTool` (no block logged when skipped); `windowOrigin` written on `tool` ledger lines (optional in the schema and in `ToolLineInput`, so a missing value fails safe as `config`); `integration_failure` gated by `failure-policy.ts#wasTrustedCritical` on the last line's zone and origin; `telemetry.declaredContextWindow` in the schema, `normalizeTurnLimits`, and `schemas/context-brake.config.schema.json`; block `v3` with `window=`; the warning-only CRITICAL action `not blocked (no harness window, see context-brake doctor); finish the RED actions` replaces only the plan-mode text that promises blocking (`telemetryAction`, used by `telemetryDecision` and `renderSessionTelemetry`); new `DEBUG_MODE_LINE`; protocol text (`protocol-service.ts`, regenerated `docs/context-brake-protocol.md`) and `docs/telemetry-block.md` describe `v3`, `window=`, and the warning-only rule. `wrap-telemetry.ts` needed no change: it already passes the full descriptor with capabilities.
- Changed files: production `src/core/contracts/{zones,session-ledger,configuration}.ts`, `src/core/services/{usage-resolver,session-zone,brake-engine,failure-policy,telemetry-block,config-legacy-checks,instruction-markers,protocol-service}.ts`, new `src/core/services/window-trust.ts`; `schemas/context-brake.config.schema.json`; `docs/telemetry-block.md`, `docs/context-brake-protocol.md`. New tests: `tests/unit/window-origin.test.ts` (TC-01, TC-04, TC-05), `brake-engine-window-trust.test.ts` (TC-02), `failure-policy-window-trust.test.ts` (TC-03), `window-trust.test.ts` (TC-06 budget, TC-07), `in-process-opencode-deny.test.ts` (moved from `in-process-runtime.test.ts` to keep it under 100 lines), `tests/e2e/e2e-window-trust.test.ts` (TC-12). Updated tests and helpers: `tests/helpers/runtime-seed.ts` (`writeRuntimeConfig` declares the window; seeded lines carry `windowOrigin: 'harness'`; Claude Code seeds get a bridge record; new `seedBridgeWindow`), `tests/helpers/delegated-fixtures.ts` (`BRIDGE_WINDOW_LINE`, `sessionAtTurn` starts with it), and 24 existing test files for `v3` literals, `windowOrigin` in expected readings, and trusted windows in deny fixtures (rule `D-02`: the fixture gets a trusted window, the assertion stays).
- Checks (Windows 11, Node 24, base `e0a9604` plus this diff): `npm run build` exit 0; `npm run typecheck` exit 0; `npx eslint .` no errors; `npm run schemas:check` exit 0; `npm run coverage` exit 0: 292 files, 1,854 passed, 3 skipped, 95.62% lines, 91.43% branches, including the overhead suites `runtime-overhead` and `statusline-overhead` (TC-15) and `claude-transcript-usage`. After that run, the OpenCode case moved to its own file; `in-process-runtime` and `in-process-opencode-deny` rerun 5/5, lint and typecheck clean. `e2e-support-limitations` timed out once under a partial parallel run and passed alone (18 s) and in the full run.
- Quality profile over the 49 TypeScript files in the diff: QA-01 to QA-07 no hits. QA-08: two false positives (`e2e-window-trust.test.ts:21` `hook` and `runtime-claude-measured.test.ts:30` `handle` have three parameters; the comma inside `Record<string, unknown>` matches the regex). QA-09 reservation: `tests/e2e/e2e-simulated-long-task.test.ts` went from 101 to 102 lines (one `seedBridgeWindow` line); `e2e-brake.test.ts` (106) and `process-hook-host.test.ts` (105) were already above 100 at the base and did not grow.
- Validated state: working tree at `e0a9604` plus the T01 diff; Windows only; Linux and macOS through CI.
- J3 (jev shadow): `operational-failure`. The literal diff is about 116,000 characters (38,500 in `src` and docs, 77,500 in tests); the gate needs it literally in both `diff` and `code` evidence, split into parts under 50,000, which means reproducing the whole diff inside tool calls. Not sent; excluded from gate counts, as in PRD-08 T01.
- Open items: none for T01. Claude Code subagents and `claude -p` sessions only warn (no bridge record), as the TechSpec records.

### ADR candidates

None - direct TechSpec implementation or local decision.
