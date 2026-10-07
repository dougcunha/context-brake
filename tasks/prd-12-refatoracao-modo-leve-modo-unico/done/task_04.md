# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md`
2. `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Remove the tool-call deny

## Outcome

No component can deny a tool call. Nothing renders deny responses. These are gone:

- the `deny` runtime decision;
- the block log;
- the allowlists;
- brake mode;
- the deny branch of the failure policy;
- the `brake` config key;
- the brake window report.

Pre-tool hooks are still installed and always return neutral.

## Dependencies and boundaries

- Depends on: T03
- Unblocks: T05
- In scope:
  - **Runtime contract and engine** (DEC-06):
    - Remove `deny` from `RuntimeDecision`. The `pre_tool` handler returns neutral.
    - Remove `BlockLog`, `blockLineSchema`, `BLOCK_REASONS`, `NodeBlockLog`, `RuntimePorts.blocks`, and `readBlockLines`.
    - Remove `brakeMode` and `brakeReason` from the session line.
    - Delete `brake-mode.ts`, `brake-session-checks.ts`, `block-message.ts`, `brake-allowlist.ts`, `shell-command-matcher.ts`, and `path-pattern.ts`.
  - **Failure policy:** remove the deny branch and `wasTrustedCritical`.
  - **Window trust** (DEC-09): keep only `acceptsDeclaredWindow`.
  - **Adapters:** each one stops rendering a deny on its pre-tool path. Every harness except Cursor returns its neutral response; Cursor answers `allow`.
    - Claude Code: `runtime.ts:72`.
    - Codex: `:63`.
    - Cursor: `:44-45`.
    - Copilot: `:60`.
    - OpenCode: `:50` (`OpenCodeBlockedError`).
    - Pi and Oh-My-Pi: `events.ts:56-58`.
    - Antigravity: `:42-45`.
  - **Config:** remove the `brake` key.
  - **Doctor** (DEC-10, brake part):
    - Remove the `brakeWindow` field and `brake-window-report.ts`.
    - Remove `BRAKE_COOPERATIVE` and `BRAKE_BLOCKS_RECORDED`.
    - Move `STATUSLINE_BRIDGE_ABSENT` to `contextWindow.bridge`, with the new wording.
  - **Tests:** delete the deny, allowlist, block-log, brake-window, and brake-session tests, plus `e2e-window-trust` and `e2e-measured-brake`. Rewrite the runtime, host, and failure-policy tests, the harness simulator support, and `e2e-brake`, so they assert that no deny happens.
- Out of scope:
  - Removing pre-tool hook registration, the `pre_tool` event, payload schemas, and fixtures (T05).
  - Capabilities and support levels (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07 | `prd.md#functional-requirements` | No deny in any zone; allowlists, block message, block log, brake window report gone |
| FR-02 | `prd.md#functional-requirements` | `brake` key rejected |
| FR-09 | `prd.md#functional-requirements` | Brake findings gone; bridge finding kept |
| DEC-06, DEC-09, DEC-10 | `techspec.md#technical-decisions` | — |
| CMP-04, CMP-05, CMP-07 | `techspec.md#components-and-flow` | — |
| TC-10, TC-14 | `techspec.md#test-approach` | — |

## Context to recover on demand

- Applicable rules: `harness-adapters.md`, `node.md`, `javascript-typescript.md`, `tests.md`.
- Existing code:
  - `src/core/services/brake-engine.ts:38-47,72-76`.
  - `src/core/services/failure-policy.ts:56-91`.
  - `src/core/contracts/session-ledger.ts:10-53`.
  - `src/infrastructure/runtime/{runtime-composition,node-runtime-logs,runtime-state-reader}.ts`.
  - `src/core/services/doctor-report-extras.ts:18-20`.
- Harness reference: `docs/research/harness-integrations.md`, "Resumo por canal". For each harness, take the neutral pre-tool response from its section.

## Work

- [x] T04.1 Remove `deny` and the block log from the contracts, engine, failure policy, and runtime ports. Delete the deny-only services.
- [x] T04.2 Update each adapter's pre-tool response to the neutral form. Remove the deny renderers and `OpenCodeBlockedError`.
- [x] T04.3 Remove the `brake` key, the `brakeWindow` field, and the `BRAKE_*` findings. Move `STATUSLINE_BRIDGE_ABSENT` to `contextWindow`. Regenerate schemas.
- [x] T04.4 Delete or rewrite the tests and simulator support. Clean the lanes.
- [x] T04.5 Run lint, typecheck, `schemas:check`, the touched suites, then `npm run coverage`.

## Acceptance criteria

- `rg -n "kind: 'deny'|critical_ceiling|integration_failure|BlockLog|blocks\.jsonl|additionalAllowedCommands|brakeMode" src` returns nothing.
- In `CRITICAL`, with a trusted window, each harness runtime returns its neutral pre-tool response.
- A hook failure inside the deadline returns neutral and records the error (TC-10).
- With Claude Code active and the bridge absent, `doctor` reports `STATUSLINE_BRIDGE_ABSENT` without `brakeWindow` (TC-14).

## Verification

- Unit: `tests/unit/runtime-{claude,claude-measured,codex,cursor,copilot,antigravity,opencode,pi,omp}.test.ts`, `in-process-host*.test.ts`, `process-hook-host*.test.ts`, `failure-policy*.test.ts`, `window-trust.test.ts`, and `doctor-context-window.test.ts` (TC-14).
- Integration: `tests/integration/runtime-failure-policy.test.ts` (TC-10), `runtime-host-process.test.ts`, `runtime-in-process.test.ts`, `runtime-retention.test.ts`.
- End-to-end: `tests/e2e/e2e-brake.test.ts`, rewritten: the simulated `CRITICAL` session completes every tool call.
- Manual: none.
- Platforms: Windows local.
- Commands: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run build`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: pass counts, coverage thresholds met, and the empty `rg` output.

## Affected files

- Delete:
  - `src/core/services/{brake-mode,brake-session-checks,block-message,brake-allowlist,shell-command-matcher,path-pattern,brake-window-report}.ts`, `src/infrastructure/runtime/tool-path-normalizer.ts` if it is orphaned.
- Modify:
  - Contracts: `src/core/contracts/{runtime,session-ledger,configuration,diagnostics}.ts`.
  - Core services: `src/core/services/{brake-engine,failure-policy,window-trust,doctor-report-extras,doctor-service}.ts`.
  - Runtime: `src/infrastructure/runtime/{runtime-composition,node-runtime-logs,runtime-state-reader,process-hook-host,in-process-host,hook-failure}.ts`.
  - Adapters: `src/infrastructure/harnesses/*/runtime.ts`, `pi/events.ts`, `oh-my-pi/events.ts`, `common/in-process-support.ts`.
  - Schemas: `schemas/*.json`.

## Observability and recovery

- Operational signal: the runtime error log is unchanged. `blocks.jsonl` is no longer written.
- Recovery: `git revert` of the task commit.

## Handoff

> Updated by `sdd-execute-task`. **T04 complete.**

- Produced result:
  - **Contracts.** `RuntimeDecision` has no `deny`; `BrakeMode` is gone. The ledger session line is `{ v, type, at, harness, sessionId, agentId }`, and `appendSessionLine(key)` takes no input. `BlockLog`, `blockLineSchema`, `BlockLine`, `BLOCK_REASONS`, `SESSION_BRAKE_MODES`, `SessionLineInput`, and `BlockRecordInput` are gone.
  - **Engine and services.** `brake-engine` has no `blocks` port, no brake mode, and no `telemetryAction`; the action is `zoneAction` directly. `window-trust.ts` keeps only `acceptsDeclaredWindow` (DEC-09). `session-zone.ts` lost `renderSessionTelemetry`, whose only callers were tests; it now lives in `tests/helpers/session-telemetry.ts`. The failure policy already never denied after T03, and `wasTrustedCritical` no longer existed.
  - **Deleted.** `brake-mode`, `block-message`, `brake-allowlist`, `shell-command-matcher`, `path-pattern`, and `brake-window-report`. `brake-session-checks` became `runtime-error-checks.ts`, which keeps only `RUNTIME_ERRORS_RECORDED`, `selectRecentErrors`, and `RuntimeStateReading { errors, ledgers? }`. `NodeBlockLog`, `RuntimePorts.blocks`, and `readBlockLines` are gone.
  - **Config.** The `brake` key and the allowlist rules are gone; a config with `brake` fails as an unknown key. `protocol-service` and `zone-actions` lost their allowlist field. Both are dead plan-mode modules that T06 deletes.
  - **Doctor.** `brakeWindow` is gone from the report, schema, and text. `BRAKE_COOPERATIVE` and `BRAKE_BLOCKS_RECORDED` are gone. `STATUSLINE_BRIDGE_ABSENT` comes from `contextWindow.bridge === 'absent'`. That field exists only when Claude Code is targeted. The finding no longer mentions blocking.
  - **Adapters.**
    - Claude Code, Codex, and Copilot: the deny branch of each renderer is removed.
    - Cursor and Antigravity: the pre-tool response is always `allow`.
    - OpenCode: `OpenCodeBlockedError` is removed, and `tool.execute.before` only records.
    - Pi and Oh-My-Pi: `render*ToolCall` is removed, and `tool_call` returns `undefined`.
    - The pre-tool registrations stay in place until T05.
  - **Schemas.** `context-brake.config` and `doctor-report` were regenerated; `schemas:check` passes.
- Tests:
  - Deleted (deny-only): `unit/{brake-allowlist,brake-mode,path-pattern,shell-command-matcher,brake-window-report,brake-engine-window-trust,in-process-opencode-deny,failure-policy-window-trust}`, `integration/{runtime-block-log,doctor-brake-window}`, `e2e/{e2e-window-trust,e2e-measured-brake}`.
  - Renamed and rewritten: `unit/brake-session-checks` → `unit/runtime-error-checks`; `integration/doctor-brake-sessions` → `integration/doctor-runtime-errors` (no `BRAKE_*` code).
  - Rewritten to assert no deny:
    - `unit/{brake-engine-pre-tool,window-trust,failure-policy,process-hook-host,in-process-host,in-process-host-deadline,in-process-runtime,runtime-opencode,runtime-claude-measured,runtime-{claude,codex,copilot,cursor,antigravity,pi,omp},doctor-service}`;
    - `integration/{runtime-failure-policy (TC-10),runtime-host-process,runtime-in-process,runtime-invalid-config,runtime-{codex,cursor,copilot,antigravity},runtime-retention}`;
    - `e2e/e2e-brake`: a simulated Claude Code session from GREEN to CRITICAL completes every call, and doctor shows no `BRAKE_*`.
  - Failure-path tests that used `pre_tool` to reach the ledger now use `post_tool`, because `pre_tool` no longer reads it.
  - Added TC-14 to `unit/doctor-context-window`. Added `brake` to the removed keys in `unit/configuration-snapshot`.
  - The harness simulator lost its plan, checkpoint, and deny profiles (`agent-profiles.ts`, `scenarios.ts`, `session-recorder.ts`).
- Checks (Windows 11, base `1474f54` plus T01-T04):
  - `npm run lint` clean, `npm run typecheck` clean, `npm run build` passes, `npm run schemas:check` passes.
  - Related suites: 69 files and 361 tests passing, plus `doctor-context-window` (6).
  - Acceptance `rg -n "kind: 'deny'|critical_ceiling|integration_failure|BlockLog|blocks\.jsonl|additionalAllowedCommands|brakeMode" src` returns nothing.
  - `rg "\.skip\(" tests` adds no new hit.
  - Quality profile QA-01..QA-08 over the changed `src` files: only the two QA-08 hits already in the Terrain baseline (`pi/runtime.ts:58` and `oh-my-pi/runtime.ts:58`).
- Open items for later tasks:
  - T05: `pre_tool` event, hook registrations, the `permissionDecision` schema field, capabilities, and support levels.
  - T06: `protocol-service`, `zone-actions`, and `--remove-state`.
  - T07: `.agents/rules/harness-adapters.md` "Failure Policy" still describes the deny.

### ADR candidates

None - direct TechSpec implementation or local decision.
