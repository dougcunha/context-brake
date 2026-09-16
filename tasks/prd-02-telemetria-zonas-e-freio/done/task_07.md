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

- [x] T07.1 Pi: create `runtime.ts` and `capabilities.ts` with `tool_call`, `tool_result`, `session_start`, `session_compact`, and `message_end` handlers; measured usage from `ctx.getContextUsage()`; key from `ctx.sessionManager.getSessionId()`; content append `[...event.content, { type: 'text', text }]`; deny `{ block: true, reason }`; notice through `ctx.ui.notify`; extend `schemas.ts` and replace the asset with the factory.
- [x] T07.2 Oh-My-Pi: the same handlers plus `session_stop` with `last_assistant_message` and `auto_compaction_end`; measured usage with the Oh-My-Pi shape; extend `schemas.ts` and replace the asset.
- [x] T07.3 OpenCode: create `runtime.ts` and `capabilities.ts` with `tool.execute.before` (throw the block message above the ceiling), `tool.execute.after` (count one turn with estimated characters from `output.args`), and the `session.created`/`session.compacted` events; derive the session key from `input.sessionID` with a documented project-level fallback; replace the asset with the plugin factory.
- [x] T07.4 Update `in-process-sampler.ts` so the benchmark context returns the real `ContextUsage` shape synchronously and provides `sessionManager.getSessionId()`; update `tests/unit/in-process-sampler.test.ts`.
- [x] T07.5 Verify the Pi project-local extension filename (OI-03): documented discovery is `*.ts`/`*/index.ts` and the installed asset remains `.js`; no real Pi installation was available, so the load gap is recorded in the research file (OI-03).
- [x] T07.6 Add fixtures (`tool-result.json`, `message-end.json`, `session-stop.json`), update the three research sections, and add the per-harness suites including measured usage, estimation fallback, reset, notice, the in-process deny test, and the plugin load test.

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

- Produced result: T07 implemented. Pi and Oh-My-Pi run the shared brake engine inside the harness process: `tool_call` blocks above the ceiling through `{ block: true, reason }`, `tool_result` appends exactly one text part after the original content, `session_start`/`session_compact`/`auto_compaction_end` reset the ledger, `message_end` (Pi) and `session_stop` with `last_assistant_message` (Oh-My-Pi) notify through `ctx.ui.notify` with `/new`, and `ctx.getContextUsage()` supplies measured `{ tokens, contextWindow, percent }` with estimation fallback to the configured window. OpenCode registers documented `(input, output)` tool hooks and an `event` handler: `tool.execute.before` throws the exact v1 block message above the ceiling, `tool.execute.after` counts one turn with `output.args` characters, `session.created`/`session.compacted` reset, no stdout is written, and the cooperative profile keeps the tool-coverage and telemetry impacts. The three capabilities lists moved to `capabilities.ts`, schemas moved to `zod/mini`, assets shrank to one factory call, and the sampler context now returns the real synchronous `ContextUsage` shape with `cwd` and `sessionManager`.
- Changed files:
  - Create: `src/infrastructure/harnesses/common/in-process-support.ts`, `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/{capabilities,events,runtime}.ts`, `tests/unit/{pi-runtime-usage,omp-runtime-usage,runtime-pi,runtime-omp,runtime-opencode,in-process-runtime}.test.ts`, `tests/integration/runtime-in-process.test.ts`, `tests/fixtures/harnesses/pi/{tool-result,message-end}.json`, `tests/fixtures/harnesses/oh-my-pi/{tool-result,session-stop}.json`, `tests/fixtures/harnesses/opencode/{tool-execute-after,session-created,session-compacted}.json`
  - Modify: `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/{adapter,schemas}.ts`, `src/infrastructure/diagnostics/in-process-sampler.ts`, `assets/runtime/{pi-extension,omp-extension,opencode-plugin}.ts`, `tests/unit/{in-process-sampler,reset-notice,harness-schemas-in-process,benchmark-fixtures}.test.ts`, `tests/fixtures/harnesses/opencode/tool-execute-before.json`, `tests/test-lanes.ts`, `docs/research/harness-integrations.md`
  - Scope notes: the pure payload mapping was extracted to per-harness `events.ts` and the shared config resolver/failure fallback to `common/in-process-support.ts` because `code-standards.md`/ESLint cap files at 100 lines; the built-asset integration suite was added to `PROCESS_LANE_FILES` so it runs after `npm run build`.
- Checks:
  - `npm run build` pass; `npm run typecheck` pass; `npm run lint` pass; `npm run schemas:check` pass; `npm run assets:check` pass.
  - `npm test` pass: 141 files / 677 tests. `npm run coverage` pass: 93.31% lines / 87.17% branches / 94.76% functions (threshold 80%).
  - Targeted suites, all pass: `pi-runtime-usage` (4), `omp-runtime-usage` (4), `runtime-pi` (6), `runtime-omp` (6), `runtime-opencode` (8), `in-process-runtime` (5), `in-process-sampler` (4), `reset-notice` (7), `harness-adapters` (8), `runtime-in-process` (3), `package-assets` (17).
  - Acceptance evidence: Pi/OMP append one text part and show `tokens=128000/200000 source=measured` or `source=estimated` with `/24000`, take a window change on the next reading, reset on `session_compact`/`auto_compaction_end`, and block above the ceiling; the OpenCode deny matches the exact v1 block message (`tool=bash zone=CRITICAL turn=12/12 usage=70% tokens=16800/24000 source=estimated reason=critical_ceiling`), counts one turn per completed call, resets on both session events, and writes nothing to stdout; invalid in-process configuration stays neutral below the ceiling and denies with the failure variant above it (TC-32, CA-14/CA-16, CA-19).
  - Quality profile, scoped to the 32 diff TS files: QA-01, QA-02, QA-03, QA-05, QA-06, QA-07, QA-10, QA-11 empty; QA-04/QA-09 skipped (no `src/core/` file in the diff). QA-08 has no suite yet (T08); the three built bundles were checked manually for `jsonc-parser`, `semver`, `node:child_process`, and `src/cli/` with no hits. No blocking hit and no reservation hit in the diff.
- Validated state: working tree on HEAD `3cff470` plus the uncommitted T07 diff (file list above), with `.agents/scheduled_tasks.lock` pre-existing and untouched; Windows 11 x64, Node v24.19.0, npm, vitest 3.2.7; `dist/assets/runtime/{pi-extension,omp-extension,opencode-plugin}.js` rebuilt from this change; tests use `context-brake.config.json` at defaults and with `contextWindowCeiling` 24000. No real Pi, Oh-My-Pi, or OpenCode installation exists here, so Linux/macOS and real-harness loads remain CI/manual evidence.
- Open items: T08 and T09 remain. OI-03: the Pi project-local discovery is documented for `*.ts` while the installed asset stays `context-brake.js`; no real Pi load was captured (gap recorded in the research file and accepted by T07's acceptance criterion). OI-04: Oh-My-Pi extension loading was not exercised with a real install. OI-05: `input.sessionID` and the `tool.execute.after` arguments are undocumented, so the OpenCode fallback session id is `project` and `observedCharacters` uses `output.args`; both gaps stay in the research file and keep the harness cooperative. QA-08's bundle-guard suite arrives with T08. No ADR candidate.

### ADR candidates

None - direct TechSpec implementation or local decision.
