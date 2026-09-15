# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Process harness runtimes (Claude Code, Codex CLI, Cursor, Copilot, Antigravity)

## Outcome

The five process harnesses run the real brake. Claude Code and Codex CLI add `Stop` and show the reset notice; Cursor and Copilot add `preCompact` and inject the block through their context fields; Antigravity counts turns through `PostToolUse` and injects the block through `PreInvocation`. Each blocks above the ceiling with its documented response shape, counts turns with estimated usage from documented payloads, never replaces the original tool result, resets on its documented events, and records the 2026-09-15 payload facts in the research file. The Antigravity `PreToolUse` registration and support-level change are a flagged sub-item pending OI-01.

## Dependencies and boundaries

- Depends on: T04
- Unblocks: T07
- In scope: `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}/{runtime,capabilities,schemas,planner,adapter}.ts`, the claude merger, the three shared updaters, the five process assets, the five fixture folders, the five research sections, and the suites named below.
- Out of scope: in-process harnesses (T07), doctor (T05), the simulator (T09).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF3, RF4, RF5-RF8, RF12, RF14 | `prd.md#principais-funcionalidades` | Reset, subagents, estimated usage, block delivery, original output |
| RF17, RF18, RF19, RF21, RF22 | `prd.md#principais-funcionalidades` | Deny, allowlist inputs, failure policy, cooperative marking, reset notice |
| CA-06, CA-07, CA-08, CA-10, CA-12, CA-14, CA-15, CA-16, CA-17, CA-18, CA-19 | `prd.md#critérios-de-aceitação` | Parallel count, reset, subagents, source, output intact, deny, allowlist, failure, cooperative, notice |
| DEC-05, DEC-08, DEC-09, DEC-10, DEC-12, DEC-13, DEC-14 | `techspec.md#technical-decisions` | Estimation, allowlist, failure, mode, notice, registrations, Antigravity (pending OI-01) |
| CMP-18 to CMP-21, CMP-24 | `techspec.md#components-and-flow` | Runtime, schemas, planners, adapters, assets |
| TC-04, TC-08 (built), TC-09, TC-10, TC-12, TC-14, TC-15, TC-16, TC-18, TC-21, TC-26, TC-33, TC-34 | `techspec.md#test-approach` | Per-harness evidence |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/harness-adapters.md` (documented behavior only, non-strict schemas, stdout rule, failure policy, version gates), `.agents/rules/file-changes.md` (surgical merge, idempotency, owned Copilot file), `.agents/rules/tests.md` (harness fixtures).
- Existing code: the five adapters and planners plus `claude-merger.ts`, `common/{codex,cursor,antigravity}-hooks-updater.ts`; the five stub assets; `tests/unit/hook-registration-paths.test.ts`; `tests/unit/adapter-planners.test.ts`; `tests/integration/{claude-preservation,codex-hook-command-shells}.test.ts`; `tests/fixtures/harnesses/*`.
- Contract or integration: `techspec.md#integrations-and-interfaces` for all five rows and the "Research updates required" list; `techspec.md#contracts-and-data` for the block, block message, and notice texts.
- Harness reference: `docs/research/harness-integrations.md` sections for the five harnesses plus the 2026-09-15 re-check (Claude `Stop`/`tool_response`; Codex `Stop` and `commandWindows`; Cursor `preCompact` and `tool_output`; Copilot `sessionStart` source and `agentStop` without text; Antigravity `PreToolUse`/`PostToolUse` payloads and `injectSteps`).

## Work

- [ ] T06.1 Claude Code: create `runtime.ts` and `capabilities.ts`; extend `schemas.ts` with `Stop`, subagent, and `tool_response` fields; register the exec-form `Stop` group with its manifest entry; make the asset a thin `runProcessHook` call rendering `deny`, `additionalContext`, and `systemMessage`; add `stop.json` and update the tool fixtures; add the per-harness suite, the subagent session-key suite, the built-hook parallel extension, the invalid-configuration integration, the Claude half of the failure-policy integration, and the notice channel.
- [ ] T06.2 Codex CLI: create `runtime.ts` and `capabilities.ts`; keep the git-root command and `commandWindows`; add `Stop` to `CODEX_EVENTS` and its manifest entry; render `deny`, `additionalContext`, and `systemMessage`; add `stop.json`; keep the cooperative reason; add the per-harness suite and the built-hook deny test.
- [ ] T06.3 Cursor: create `runtime.ts` and `capabilities.ts`; add `preCompact` (without `failClosed`) to `CURSOR_EVENTS`; render `{ permission: deny, agent_message, user_message }` and the explicit `{ permission: allow }`, plus `additional_context`; add `pre-compact.json`; add the per-harness suite and the Cursor half of the failure-policy integration.
- [ ] T06.4 Copilot: create `runtime.ts` and `capabilities.ts`; add `preCompact` to the owned config file; render `permissionDecision` and `additionalContext` (never `modifiedResult`); add `pre-compact.json`; add the per-harness suite and registration assertions.
- [ ] T06.5 Antigravity: create `runtime.ts` and `capabilities.ts`; register `PostToolUse` and keep `PreInvocation`; map `post_tool` and `pre_invocation`; render `{ injectSteps: [{ ephemeralMessage }] }`, `{ injectSteps: [] }`, and `{}`; add `post-tool-use.json`; add the per-harness suite.
- [ ] T06.6 (pending OI-01) Antigravity `PreToolUse`: map `toolCall.name`/`args`, render `deny` and the required `allow`, register the handler with its manifest entry, move `pre_tool_block` to `supported` (keeping `tool_coverage: unknown`), update the README row, `tests/unit/readme-support-table.test.ts`, `tests/unit/harness-adapters.test.ts`, and the deny tests, and record the auto-approval trade-off. If the HIL rejects, drop only this sub-item and keep the cooperative row.
- [ ] T06.7 Update all five research sections in the same change, keep install/remove idempotent across three runs, and register the new process-lane suites in `tests/test-lanes.ts`.

## Acceptance criteria

- Claude Code: built hooks count parallel turns correctly, subagent counts stay separate, `compact` resets, `Read` at `CRITICAL` returns the exact `deny`, checkpoint writes return no output, `PostToolUse` adds `additionalContext` untouched by the original `tool_response`, and `Stop` writes `systemMessage` naming `/clear` only for the signal.
- Codex CLI: the `Stop` group keeps the git-root and Windows command forms, `deny`/`additionalContext`/`systemMessage` render in documented fields, plain stdout stays empty, and the profile keeps `tool_coverage` unsupported.
- Cursor and Copilot: `preCompact` registration, exact deny shapes, context injection without touching results, corrupt-ledger behavior per the failure policy, and no notice registration.
- Antigravity: `PostToolUse` counts one turn per call and answers `{}`; `PreInvocation` renders the block or an empty `injectSteps`; with OI-01 approved, `PreToolUse` denies non-allowlisted calls above the ceiling and the level becomes partial with a cooperative brake.
- A third `init` adds no duplicate entries; `remove` deletes only ContextBrake entries.

## Verification

- Unit: `tests/unit/runtime-{claude,codex,cursor,copilot,antigravity}.test.ts`, `tests/unit/claude-runtime-session-key.test.ts`, updated `tests/unit/adapter-planners.test.ts`, `tests/unit/harness-adapters.test.ts`, `tests/unit/hook-registration-paths.test.ts`, `tests/unit/readme-support-table.test.ts`, extended `tests/unit/reset-notice.test.ts` (Claude and Codex channels; none for the rest), updated `tests/unit/harness-schemas-process.test.ts`.
- Integration: `tests/integration/runtime-parallel-turns.test.ts` (built hooks), `tests/integration/runtime-invalid-config.test.ts`, `tests/integration/runtime-failure-policy.test.ts` (Claude and Cursor halves), `tests/integration/claude-preservation.test.ts` (Stop preserved and removed), new `tests/integration/runtime-{codex,cursor,copilot,antigravity}.test.ts` with documented payloads.
- End-to-end: not applicable — the built-CLI flow is T09.
- Manual: capture one real payload per registered event as a fixture when a harness is installed; record the gap otherwise.
- Platforms: Linux, macOS, Windows for command forms and built hooks.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run runtime-claude runtime-codex runtime-cursor runtime-copilot runtime-antigravity claude-runtime-session-key adapter-planners harness-adapters hook-registration-paths readme-support-table reset-notice harness-schemas-process runtime-parallel-turns runtime-invalid-config runtime-failure-policy claude-preservation runtime-codex runtime-cursor runtime-copilot runtime-antigravity`, `npm run coverage`
- Environment dependency: OI-01 approval before T06.6; real harness payloads desirable, recorded as gaps when unavailable.
- Expected evidence: green suites, five updated research sections, and assets that contain `runProcessHook`.

## Affected files

- Modify: `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}/{adapter,schemas,planner}.ts`, `src/infrastructure/harnesses/claude-code/claude-merger.ts`, `src/infrastructure/harnesses/common/{codex,cursor,antigravity}-hooks-updater.ts`, `assets/runtime/{claude-code-hook,codex-cli-hook,cursor-hook,github-copilot-cli-hook,antigravity-cli-hook}.ts`, `README.md`, `tests/test-lanes.ts`, `tests/unit/{adapter-planners,harness-adapters,hook-registration-paths,readme-support-table,reset-notice,harness-schemas-process}.test.ts`, `tests/integration/{claude-preservation,codex-hook-command-shells,runtime-parallel-turns,runtime-failure-policy}.test.ts`, `docs/research/harness-integrations.md`, `tests/fixtures/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}/*.json`
- Create: per-harness `{runtime,capabilities}.ts`, `tests/unit/runtime-{claude,codex,cursor,copilot,antigravity}.test.ts`, `tests/unit/claude-runtime-session-key.test.ts`, `tests/integration/runtime-{invalid-config,failure-policy,codex,cursor,copilot,antigravity}.test.ts`, and the new `stop.json` and `pre-compact.json` fixtures

## Observability and recovery

- Operational signal: ledgers, block records, and error records per harness; doctor surfaces them through T05.
- Recovery: `remove` unregisters the new events and deletes the assets; `init --yes` reinstalls.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
