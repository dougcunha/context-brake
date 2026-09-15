# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — In-process harness runtimes (Pi, Oh-My-Pi, OpenCode)

## Outcome

Pi and Oh-My-Pi report measured usage from `ctx.getContextUsage()` when the API returns it and estimate otherwise, append the telemetry block after the original result content, block above the ceiling from `tool_call`, reset on their session and compaction events, and notify the user on the reset signal. OpenCode counts turns from the plugin hooks, throws the block message from `tool.execute.before` above the ceiling, resets on session events, and records its unverified limits. The in-process sampler exercises the real `ContextUsage` shape, and the Pi extension loading path is verified or corrected (OI-03).

## Dependencies and boundaries

- Depends on: T06
- Unblocks: T08
- In scope: `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/{runtime,capabilities,schemas,planner,adapter}.ts`, `assets/runtime/{pi-extension,omp-extension,opencode-plugin}.ts`, `src/infrastructure/diagnostics/in-process-sampler.ts`, the three fixture folders, the three research sections, and the suites named below.
- Out of scope: process harnesses (T06), the simulator (T09), and T09's calibration of the estimate constants beyond what the suites need.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF3, RF4, RF5, RF6, RF7, RF8 | `prd.md#principais-funcionalidades` | Reset, measured usage and window, estimate fallback, source |
| RF12, RF14, RF17, RF19, RF21, RF22 | `prd.md#principais-funcionalidades` | Block append, original result intact, deny, failure, cooperative, notice |
| CA-06, CA-07, CA-09, CA-10, CA-11 (inputs), CA-12, CA-14, CA-16, CA-19 | `prd.md#critérios-de-aceitação` | Parallel count, reset, measured and estimated sources, output intact, deny, failure, notice |
| DEC-05, DEC-09, DEC-10, DEC-12, DEC-13, DEC-16, DEC-17 (sampler) | `techspec.md#technical-decisions` | Measured/estimated resolution, failure, mode, notice, reset, in-process I/O, sampler context |
| CMP-18 to CMP-22, CMP-24 | `techspec.md#components-and-flow` | Runtime, schemas, planners, adapters, assets, sampler |
| TC-09, TC-11, TC-12, TC-14, TC-21, TC-32, TC-33 | `techspec.md#test-approach` | Per-harness evidence and in-process deny semantics |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/node.md` (in-process hosts never block the harness; no synchronous I/O), `.agents/rules/harness-adapters.md` (context added, original result intact; undocumented behavior unsupported), `.agents/rules/tests.md` (fakes must follow the documented contract).
- Existing code: the three adapters and planners; the three stub assets; `src/infrastructure/diagnostics/in-process-sampler.ts:28-34` (fake `{ usedTokens, maxTokens }` to replace with `{ tokens, contextWindow, percent }` and a session manager); `tests/unit/in-process-sampler.test.ts`; `tests/fixtures/benchmark/in-process-opencode.mjs`.
- Contract or integration: `techspec.md#integrations-and-interfaces` Pi, Oh-My-Pi, and OpenCode rows; `techspec.md#contracts-and-data` for the block and notice text.
- Harness reference: `docs/research/harness-integrations.md` Pi, Oh-My-Pi, and OpenCode sections; vendor types checked 2026-09-15: Pi `ContextUsage` `{ tokens: number | null; contextWindow: number; percent: number | null }`, Oh-My-Pi `{ tokens: number; contextWindow: number; percent: number }`, `/new` for both; OpenCode `(input, output)` documented for `tool.execute.before` only.

## Work

- [ ] T07.1 Pi: create `runtime.ts` and `capabilities.ts` with `tool_call`, `tool_result`, `session_start`, `session_compact`, and `message_end` handlers; measured usage from `ctx.getContextUsage()`; key from `ctx.sessionManager.getSessionId()`; content append `[...event.content, { type: 'text', text }]`; deny `{ block: true, reason }`; notice through `ctx.ui.notify`; extend `schemas.ts` and replace the asset with the factory.
- [ ] T07.2 Oh-My-Pi: the same handlers plus `session_stop` with `last_assistant_message` and `auto_compaction_end`; measured usage with the Oh-My-Pi shape; extend `schemas.ts` and replace the asset.
- [ ] T07.3 OpenCode: create `runtime.ts` and `capabilities.ts` with `tool.execute.before` (throw the block message above the ceiling), `tool.execute.after` (count one turn with estimated characters from `output.args`), and the `session.created`/`session.compacted` events; derive the session key from `input.sessionID` with a documented project-level fallback; replace the asset with the plugin factory.
- [ ] T07.4 Update `in-process-sampler.ts` so the benchmark context returns the real `ContextUsage` shape synchronously and provides `sessionManager.getSessionId()`; update `tests/unit/in-process-sampler.test.ts`.
- [ ] T07.5 Verify the Pi project-local extension filename (OI-03): confirm the documented discovery (`*.ts`) against the installed `.js` asset; if it does not load, install the documented filename and update the planner, README references, and research note.
- [ ] T07.6 Add fixtures (`tool-result.json`, `message-end.json`, `session-stop.json`), update the three research sections, and add the per-harness suites including measured usage, estimation fallback, reset, notice, the in-process deny test, and the plugin load test.

## Acceptance criteria

- A Pi or Oh-My-Pi `tool_result` returns the original content parts plus exactly one appended text part; the block shows `source=measured` with the API's tokens/window when available, and `source=estimated` with the configured window when the API returns `undefined` or `null` tokens; a reported window change takes effect on the next reading.
- Beyond the ceiling, `tool_call` returns `{ block: true, reason }` with the exact message; below it returns `undefined` and the tool runs.
- `session_compact`, `auto_compaction_end`, and a new `session_start` reset the count; `message_end`/`session_stop` with the signal calls `ctx.ui.notify` with `/new`; other messages produce no notice.
- OpenCode throws the exact block message above the ceiling, counts one turn per completed call, resets on session events, never writes to stdout, and keeps its cooperative profile with the tool-coverage and telemetry impacts.
- The sampler runs one hundred samples of the `tool_call` handler with the documented context; the installed Pi extension filename is the documented one, or the gap is recorded.

## Verification

- Unit: `tests/unit/pi-runtime-usage.test.ts`, `tests/unit/omp-runtime-usage.test.ts`, `tests/unit/runtime-{pi,omp,opencode}.test.ts`, `tests/unit/in-process-runtime.test.ts` (TC-32), extended `tests/unit/reset-notice.test.ts`, updated `tests/unit/in-process-sampler.test.ts`, updated `tests/unit/harness-adapters.test.ts`.
- Integration: `tests/integration/runtime-in-process.test.ts` (loads the built extensions with a mock API returning the documented usage shape and the plugin with the documented hook arguments).
- End-to-end: not applicable — the simulated accuracy run is T09.
- Manual: verify the Pi extension actually loads in a real installation (OI-03); capture OpenCode plugin identifiers (OI-05); record gaps otherwise.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run pi-runtime-usage omp-runtime-usage runtime-pi runtime-omp runtime-opencode in-process-runtime in-process-sampler reset-notice harness-adapters runtime-in-process`, `npm run coverage`
- Environment dependency: a real Pi installation for OI-03 (desirable; record a gap if absent).
- Expected evidence: green suites, three updated research sections, and the sampler test asserting the documented context shape.

## Affected files

- Modify: `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/{adapter,schemas,planner}.ts`, `assets/runtime/{pi-extension,omp-extension,opencode-plugin}.ts`, `src/infrastructure/diagnostics/in-process-sampler.ts`, `tests/unit/{in-process-sampler,reset-notice,harness-adapters}.test.ts`, `docs/research/harness-integrations.md`
- Create: per-harness `{runtime,capabilities}.ts`, `tests/unit/{pi-runtime-usage,omp-runtime-usage,runtime-pi,runtime-omp,runtime-opencode,in-process-runtime}.test.ts`, `tests/integration/runtime-in-process.test.ts`, `tests/fixtures/harnesses/pi/{tool-result,message-end}.json`, `tests/fixtures/harnesses/oh-my-pi/{tool-result,session-stop}.json`

## Observability and recovery

- Operational signal: measured sessions show `source=measured` in blocks and ledgers; thrown block messages reach the agent; cooperative or failure records surface through doctor.
- Recovery: `remove` deletes the extension and plugin assets; the hosts keep running because no handler throws into them below the ceiling.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
