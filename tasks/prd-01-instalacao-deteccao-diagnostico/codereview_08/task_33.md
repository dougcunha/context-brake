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

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.
