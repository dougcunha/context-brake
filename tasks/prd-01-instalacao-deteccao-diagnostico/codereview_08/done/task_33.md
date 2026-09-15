# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_08/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward.

---

# T33: Measure each installed pre-tool invocation instead of a fallback handler

## Outcome

Doctor's overhead result executes the same event argument, documented payload, and tool-call handler that each installed integration uses, while the pass/fail status remains informational.

## Dependencies and boundaries

- Depends on: T30, because both tasks modify all adapter declarations and fixtures.
- Unblocks: T35.
- In scope: benchmark fixture event identity, process argv, in-process handler selection/signatures, eight adapter fixtures, focused unit/integration tests, and the TechSpec DEC-15 sampler extraction.
- Out of scope: changing performance targets, launching authenticated vendor binaries, producing a warning finding from benchmark status, and implementing new hook events.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_08/CR-04` | `codereview.md#findings` | Process samples omit event argv, in-process samples select the last registered handler, and Antigravity uses a stale event. |
| PRD-01 | RF22, CA-18 | Requires local overhead measurement of installed integration behavior. |
| PRD-01 TechSpec | `OverheadMeasurement`, UT-17, IT-14, benchmark decision | Defines sample counts, p95, targets, and unavailable behavior. |
| PRD 1.1 | FR-05 | Requires the registered event, documented payload, and pre-tool handler for all eight harnesses. |
| PRD 1.1 TechSpec | DEC-04, DEC-15, CMP-04, CMP-05, TC-04 | Defines `BenchmarkFixture.event`, process argv, handler maps, mock context, and sampler extraction. |

## Requirements

- Add required `event: string` to `BenchmarkFixture`; every adapter returns the exact event its current installed integration registers.
- Spawn process assets with `[assetPath, event]`, write the documented JSON payload to stdin, retain three warm-ups and twenty fresh processes, and preserve the 2-second bound and `unavailable` fallback.
- Antigravity measures its currently registered `PreInvocation` path and payload, not deferred `PreToolUse` behavior.
- Record in-process handlers by event name. Select only the fixture event and fail the measurement as unavailable when that handler is absent; never fall back to the last registration or a no-op.
- Invoke OpenCode's `tool.execute.before(input, output)` contract with documented arguments. Invoke Pi and Oh-My-Pi `tool_call(event, ctx)` with the TechSpec mock context surface.
- Retain ten warm-ups, one hundred measured handler calls, nearest-rank p95, 100 ms process targets, and 15 ms in-process targets.
- Benchmark status remains data only: it creates no finding and does not affect doctor exit code.
- Keep `overhead-measurer.ts` within 100 lines by moving in-process sampling to `src/infrastructure/diagnostics/in-process-sampler.ts` as specified by DEC-15.

## Context to recover on demand

- TechSpec: PRD 1.1 DEC-04, DEC-15, `Components and flow`, TC-04; PRD-01 `OverheadMeasurement`, UT-17, IT-14.
- Rules and skills: `harness-adapters.md`, `node.md`, `tests.md`, `code-standards.md`, `javascript-typescript.md`, and `antislop`.
- Code: `src/core/contracts/adapter.ts:BenchmarkFixture` - event contract.
- Code: `src/infrastructure/diagnostics/overhead-measurer.ts:23-81` - process/in-process samplers and result mapping.
- Code: all eight adapter `benchmarkFixture()` methods - event/payload source.
- Call graph: `NodeOverheadMeasurer` is used by `runDoctor` and `doctor-benchmark.test.ts`.

## Work

- [ ] T33.1 Add failing contract/registry tests requiring a non-empty registered event and documented payload for all eight adapters.
- [ ] T33.2 Add sentinel process and in-process tests that fail unless event argv and the named tool handler are used.
- [ ] T33.3 Implement process event argv and extract the event-aware in-process sampler with exact host signatures and mock context.
- [ ] T33.4 Correct all adapter benchmark fixtures, including Antigravity `PreInvocation`, and verify their payloads against adapter schemas where applicable.
- [ ] T33.5 Extend doctor benchmark integration coverage and run gates plus the quality profile.

## Acceptance criteria

- A process fixture that exits nonzero without the expected first argument produces 20 successful samples only when the registered event is passed.
- A module registering both a tool handler and `before_agent_start` increments only the tool-handler counter for all 110 calls.
- Missing named handlers, malformed output, nonzero exit, and timeout return `status: unavailable`, `sampleCount: 0`, and `p95Milliseconds: null`.
- All eight adapter fixtures name their current installed event and parse their documented payload shape.
- Doctor benchmark tests prove sample counts 20 and 100, unchanged targets, no filesystem mutation, no finding, and no exit-code effect.

## Verification

- Unit: new overhead-measurer/sampler sentinel fixtures, adapter registry fixture assertions, and p95 regression.
- Integration: `doctor-benchmark.test.ts` executes representative installed process and in-process assets and verifies output/no mutation.
- End-to-end: existing doctor JSON scenario exercises the built asset; no authenticated harness is launched.
- Manual: none.
- Platforms: local platform during implementation; T35 supplies the final matrix and child-process evidence.
- Environment dependency: built runtime assets; no vendor binary or network.
- Commands: `npm run build`, focused Vitest files, `npm run assets:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run package:smoke`.
- Expected evidence: named handler counters, exact argv assertion, valid eight-adapter fixtures, stable sample counts/targets, and green gates.

## Affected files

- Modify: `src/core/contracts/adapter.ts`, `src/infrastructure/diagnostics/overhead-measurer.ts`.
- Create: `src/infrastructure/diagnostics/in-process-sampler.ts`.
- Modify: all eight `src/infrastructure/harnesses/*/adapter.ts` benchmark fixtures.
- Create or modify: `tests/unit/overhead-measurer.test.ts`, focused test assets/fixtures, `tests/unit/harness-registry.test.ts`, `tests/integration/doctor-benchmark.test.ts`.
- Modify if a new process-spawning test file is introduced: `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`.

## Observability and recovery

- Operational signal: doctor reports the same overhead fields and targets; a missing or failing exact handler reports `unavailable` instead of timing unrelated work.
- Recovery: revert T33. No user file format or manifest migration is involved.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: CR-04 resolved (T33.1-T33.5). `BenchmarkFixture` now requires `event: string`, and every adapter's `benchmarkFixture()` returns the exact event its currently installed integration registers plus a documented payload. The process sampler spawns `[assetPath, event]`, writes the documented JSON payload to stdin, and keeps three warm-ups + twenty fresh processes, the 2,000 ms per-sample bound, and the `unavailable` fallback. Antigravity now measures its installed `PreInvocation` path and payload, not the deferred `PreToolUse`. In-process sampling moved to `src/infrastructure/diagnostics/in-process-sampler.ts` (DEC-15): it records handlers by event name through the mock API and selects ONLY the fixture event, returning `null` (mapped to `unavailable`) when the named handler or asset is absent, with no last-registration or no-op fallback. OpenCode is invoked as `tool.execute.before(input, output)` and Pi/Oh-My-Pi as `tool_call(event, ctx)` with the TechSpec mock context (`getContextUsage`, `sessionManager.getSessionId`, `ui.notify`). Ten warm-ups + one hundred measured handler calls, nearest-rank p95, and the 100 ms/15 ms targets are unchanged. Benchmark status remains data only: it creates no finding and does not change the doctor exit code.
- Eight adapter event/payload rows implemented:
  1. `claude-code` -> event `PreToolUse` -> `{ session_id, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, tool_use_id, cwd }`.
  2. `codex-cli` -> event `PreToolUse` -> `{ session_id, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command }, tool_use_id, cwd }`.
  3. `cursor` -> event `preToolUse` -> `{ conversation_id, hook_event_name: "preToolUse", tool_name: "Shell", tool_input: { command }, tool_use_id }`.
  4. `github-copilot-cli` -> event `preToolUse` -> `{ sessionId, timestamp, cwd, toolName: "bash", toolArgs: { command } }`.
  5. `antigravity-cli` -> event `PreInvocation` -> `{ conversationId, workspacePaths, modelName, invocationNum, initialNumSteps }` (installed PreInvocation channel; the deferred `PreToolUse` is no longer benchmarked).
  6. `opencode` -> event `tool.execute.before` -> input `{ tool: "bash", sessionID, callID }` + output `{ args: { command } }`.
  7. `pi` -> event `tool_call` -> `{ toolName: "read", toolCallId, input: { path } }`.
  8. `oh-my-pi` -> event `tool_call` -> `{ toolName: "read", input: { path } }`.
- Changed files:
  - Modified: `src/core/contracts/adapter.ts` (required `event`), `src/infrastructure/diagnostics/overhead-measurer.ts` (event argv + DEC-15 extraction + `unavailable` mapping), all eight `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli,opencode,pi,oh-my-pi}/adapter.ts` benchmark fixtures, `tests/unit/harness-registry.test.ts` (registered-event assertions), `tests/unit/doctor-service.test.ts` (fake fixture gains `event`), `tests/integration/doctor-benchmark.test.ts` (sample counts, no mutation, no performance finding, no exit-code effect), `tests/test-lanes.ts` (register `tests/unit/overhead-measurer.test.ts` in the process lane).
  - Created: `src/infrastructure/diagnostics/in-process-sampler.ts`; `tests/unit/overhead-measurer.test.ts`; `tests/unit/in-process-sampler.test.ts`; `tests/unit/benchmark-fixtures.test.ts`; `tests/fixtures/benchmark/{process-guard.mjs,process-hang.mjs,in-process-handlers.mjs,in-process-opencode.mjs,in-process-missing.mjs,in-process-throwing.mjs}`.
- Sentinel-counter evidence (failing-then-passing):
  - In-process: the fixture registers `tool_call`, `tool_result`, and `before_agent_start`; `sampleInProcess({ event: 'tool_call' })` returns exactly 100 samples and `counters.toolCalls === 110`, `counters.beforeAgentStart === 0`, `counters.badContext === 0`. Temporarily restoring the old "last registered handler" selection made the test fail with `expected +0 to be 110` (the `before_agent_start` handler received all 110 calls); after restoring by-event selection the test passes.
  - Process: the guard asset exits nonzero unless `process.argv[2] === 'PreToolUse'`. Placed at `.claude/hooks/context-brake.mjs`, `measure('claude-code')` returns `sampleCount 20`, non-null p95, target 100, status `pass`/`fail`; the same guard at `.agents/hooks/context-brake.mjs` (Antigravity event `PreInvocation`) returns `unavailable`. Temporarily spawning `[path]` without the event made the positive test fail; after restoring `[path, event]` it passes.
  - OpenCode: the returned-hooks fixture validates `input.tool === 'bash'` and `output.args.command === 'ls'`; `counters.before === 110`, `counters.badArgs === 0`.
- Checks (Windows 11 Pro, PowerShell 7, Node v24.19.0, npm 11.17.0; `dist/` built before E2E):
  - `npm run build` -> passed (schemas generated, runtime assets built, `tsc` clean).
  - Focused Vitest: `overhead-measurer` (5), `in-process-sampler` (3), `benchmark-fixtures` (2), `harness-registry` (4), `doctor-service` (5), `doctor-benchmark` (2), `test-lanes` (4) -> all passed.
  - `npm run assets:check` -> passed (part of `package:smoke`, no stale assets).
  - `npm run schemas:check` -> passed (no contract/schema change from T33).
  - `npm run lint` -> passed; `npm run typecheck` -> passed.
  - `npm test` -> 83 files, 338 passed, 1 skipped (POSIX-only shell test on Windows). One earlier full run hit a load-induced 30 s timeout in `tests/e2e/e2e-support-limitations.test.ts`; the file passes in isolation (8.9 s) and the process lane passes standalone (27 files), and a clean re-run of `npm test` passed, so the timeout was environmental, not a regression.
  - `npm run coverage` -> 92.33% statements / 85.92% branches / 95.68% functions / 92.33% lines (threshold 80%).
  - `npm run package:smoke` -> passed (212 packaged files verified; schemas, assets, and bin present).
  - Quality profile QA-01..QA-06 over the 18 touched TypeScript files -> 0 hits each (no `any`, no `@ts-ignore`/`@ts-nocheck`/`eslint-disable`, no empty catch/`.catch(() => {})`, no `core` import of `infrastructure`/`cli`, no generic `throw new Error(`, no 4+ parameter declaration). `src/infrastructure/diagnostics/overhead-measurer.ts` is 81 lines (<= 100); the largest new file is `in-process-sampler.ts` at 68 lines.
- Validated state: uncommitted worktree over `2a26a3e`. Reports/protocol fixtures are read-only in this task; `docs/research/harness-integrations.md` already records `PreInvocation`, `tool.execute.before`, and `tool_call`, so no research edit was required. `schemas/*.json` are unchanged (T33 adds no schema field). No authenticated vendor binary or network was used; the process and in-process paths were exercised with the built assets and synthetic fixtures.
- Open items: T35 owns the Ubuntu/macOS/Windows CI matrix and the Codex `sh -lc`/`bash -lc` evidence; T34 owns the README support/path wording. No blockers introduced by T33.
