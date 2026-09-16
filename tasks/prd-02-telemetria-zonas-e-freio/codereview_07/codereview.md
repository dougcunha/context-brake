# Code review report — PRD 02 Telemetry, zones, and brake (Task T07)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `3cff470..working tree` (accumulated uncommitted changes against commit `3cff470`, including the three in-process harness runtimes, events, capabilities, schemas, thin asset factories, in-process sampler update, updated research documentation, fixtures, unit and integration test suites)
- Previous review: `tasks/prd-02-telemetria-zonas-e-freio/codereview_06/codereview.md` (`APPROVED WITH RESERVATIONS`, CR-01, CR-02)

Task T07 implementation fulfills all obligations, acceptance criteria, and architectural decisions. All three in-process harnesses (Pi, Oh-My-Pi, and OpenCode) execute the ContextBrake runtime inside the host harness process: Pi and Oh-My-Pi measure usage from `ctx.getContextUsage()` and fall back to estimation when absent or null, append exactly one text part to `tool_result` content preserving original items, block above the ceiling from `tool_call` with `{ block: true, reason }`, reset ledgers on compaction/session events, and deliver `/new` reset notices via `ctx.ui.notify` upon receiving `[REQUEST_SESSION_RESET]`. OpenCode registers plugin hooks `(tool.execute.before, tool.execute.after, event)`, throws the exact v1 block message above the ceiling, counts turns from `output.args` characters, resets on `session.created`/`session.compacted`, writes zero bytes to stdout, and retains its cooperative profile. `in-process-sampler.ts` was updated with the real synchronous `ContextUsage` shape, `cwd`, and `sessionManager`. Thin assets call the respective factories in 6 lines. All 677 tests pass across 141 files with 93.31% line/statement coverage and zero new defects.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02-telemetria-zonas-e-freio/prd.md` | read in full |
| TechSpec | `tasks/prd-02-telemetria-zonas-e-freio/techspec.md` | read in full |
| Manifest | `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` | read in full |
| Task & Handoff | `tasks/prd-02-telemetria-zonas-e-freio/task_07.md` | read in full |
| Predecessor tasks | `tasks/prd-02-telemetria-zonas-e-freio/done/task_01.md` through `done/task_06.md` | read in full |
| Previous reviews | `tasks/prd-02-telemetria-zonas-e-freio/codereview_01` through `codereview_06` | read in full |
| Research | `docs/research/harness-integrations.md` | read and updated (16/09/2026 rechecks) |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests,harness-adapters,file-changes,cli-output}.md` | read and applied |
| Implementation | 14 harness source/runtime files, 3 asset entrypoints, 1 diagnostic sampler, 11 test suites | delimited |

The reviewable diff for T07 comprises:
- `src/infrastructure/harnesses/common/in-process-support.ts`
- `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/{runtime,events,capabilities,schemas,adapter}.ts`
- `src/infrastructure/diagnostics/in-process-sampler.ts`
- `assets/runtime/{pi-extension,omp-extension,opencode-plugin}.ts`
- `docs/research/harness-integrations.md`
- `tests/test-lanes.ts`
- Fixture updates and creations: `tests/fixtures/harnesses/pi/{tool-result,message-end}.json`, `tests/fixtures/harnesses/oh-my-pi/{tool-result,session-stop}.json`, `tests/fixtures/harnesses/opencode/{tool-execute-before,tool-execute-after,session-created,session-compacted}.json`
- Unit test suites: `tests/unit/{pi-runtime-usage,omp-runtime-usage,runtime-pi,runtime-omp,runtime-opencode,in-process-runtime,in-process-sampler,reset-notice,benchmark-fixtures,harness-schemas-in-process}.test.ts`
- Integration test suites: `tests/integration/runtime-in-process.test.ts`

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF3 | Session reset on new session or compaction | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/events.ts` | `tests/unit/pi-runtime-usage.test.ts:75-82`, `tests/unit/omp-runtime-usage.test.ts:69-76`, `tests/unit/runtime-opencode.test.ts:64-77` | conformant | `session_compact`, `auto_compaction_end`, `session.compacted`, and `session_start`/`session.created` with reason `new`/`startup` reset the ledger to 1 turn |
| RF4 | Subagent counts isolated | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/runtime-*.test.ts` | conformant | In-process harnesses receive `agentId: null` in current vendor specs; keys are isolated per session ID |
| RF5 | Measured usage from harness when available | `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts:55-61`, `tests/unit/omp-runtime-usage.test.ts:52-58` | conformant | Reads `{ tokens, contextWindow, percent }` synchronously from `ctx.getContextUsage()`; reports `source=measured` |
| RF6 | Estimate usage from local session data otherwise | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts:63-73`, `tests/unit/omp-runtime-usage.test.ts:60-67`, `tests/unit/runtime-opencode.test.ts:21-26` | conformant | Uses configured window and `observedCharacters` calculation when usage API is absent, null, or unconfirmed |
| RF7 | Active model window used when reported | `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts:43-53`, `tests/unit/omp-runtime-usage.test.ts:41-50` | conformant | Window reported by `getContextUsage()` takes effect on next reading; falls back to `contextWindowCeiling` (24000) |
| RF8 | Source of reading recorded (measured vs estimated) | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts`, `tests/unit/omp-runtime-usage.test.ts`, `tests/unit/runtime-opencode.test.ts` | conformant | Blocks and ledger lines explicitly record `source=measured` or `source=estimated` |
| RF12 | Telemetry block delivered with required fields | `src/infrastructure/harnesses/{pi,oh-my-pi}/events.ts` | `tests/unit/runtime-pi.test.ts:52-58`, `tests/unit/runtime-omp.test.ts:50-56`, `tests/integration/runtime-in-process.test.ts:42-45` | conformant | Appended text block has turn, ceiling, usage, tokens, window, source, zone, and action |
| RF14 | Original tool output intact when adding context | `src/infrastructure/harnesses/{pi,oh-my-pi}/events.ts` | `tests/unit/runtime-pi.test.ts:52-58`, `tests/unit/runtime-omp.test.ts:50-56` | conformant | `content` array returned contains original elements with exactly one `{ type: 'text', text: block }` appended |
| RF17 | Block tool calls above critical ceiling | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/in-process-runtime.test.ts:36-61`, `tests/unit/runtime-opencode.test.ts:79-84` | conformant | Pi and Oh-My-Pi return `{ block: true, reason }`; OpenCode throws `OpenCodeBlockedError` with exact block message |
| RF18 | Allowlist honored at CRITICAL | `src/infrastructure/harnesses/common/in-process-support.ts` | `tests/unit/in-process-runtime.test.ts`, `tests/integration/runtime-in-process.test.ts` | conformant | Safe file paths, validation commands, and git operations pass through `brake-engine` allowlist |
| RF19 | Failure policy in-process | `src/infrastructure/harnesses/common/in-process-support.ts:52-55` | `tests/unit/in-process-runtime.test.ts:64-96` | conformant | Neutral below ceiling on invalid configuration/exceptions; denies with failure variant above ceiling; never writes to stdout |
| RF21 | Cooperative mode exposed for OpenCode | `src/infrastructure/harnesses/opencode/capabilities.ts` | `tests/unit/runtime-opencode.test.ts:42-47`, `tests/unit/harness-adapters.test.ts:18` | conformant | `tool_coverage: unknown`, `post_tool_telemetry: unsupported`; classified as `cooperative` with documented reasons |
| RF22 | Reset notice on Stop signal | `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` | `tests/unit/reset-notice.test.ts:47-58` | conformant | Notifies user via `ctx.ui.notify(text, 'info')` with `/new` upon assistant response ending with `[REQUEST_SESSION_RESET]` |
| CA-06 | Multi-turn counting | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/runtime-opencode.test.ts:64-77`, `tests/unit/pi-runtime-usage.test.ts` | conformant | Increments turn counter correctly per completed tool call |
| CA-07 | Reset restarts count at 1 | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts:75-82`, `tests/unit/omp-runtime-usage.test.ts:69-76`, `tests/unit/runtime-opencode.test.ts:64-77` | conformant | First call after reset logs `turn: 1` |
| CA-09 | Measured usage matches harness values | `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts:55-61`, `tests/unit/omp-runtime-usage.test.ts:52-58` | conformant | Tokens and window match `ctx.getContextUsage()` |
| CA-10 | Estimated usage fallback | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts:63-73`, `tests/unit/omp-runtime-usage.test.ts:60-67` | conformant | `source=estimated` and configured ceiling used when API unavailable |
| CA-12 | Original tool output unchanged | `src/infrastructure/harnesses/{pi,oh-my-pi}/events.ts` | `tests/unit/runtime-pi.test.ts:52-58`, `tests/unit/runtime-omp.test.ts:50-56` | conformant | Zero alteration of prior parts; new part appended at end |
| CA-14 | Deny payload structure | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/in-process-runtime.test.ts:36-61`, `tests/unit/runtime-opencode.test.ts:79-84` | conformant | Pi/OMP `{ block: true, reason }`; OpenCode thrown block message |
| CA-16 | Fallback on invalid state | `src/infrastructure/harnesses/common/in-process-support.ts` | `tests/unit/in-process-runtime.test.ts:69-85` | conformant | Neutral below ceiling, denies above ceiling with `reason=integration_failure` |
| CA-19 | Reset notice emitted only on signal | `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` | `tests/unit/reset-notice.test.ts:47-58` | conformant | Only fires when trimmed assistant text ends with `[REQUEST_SESSION_RESET]` |
| DEC-05 | Measured vs estimated resolution | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts`, `tests/unit/omp-runtime-usage.test.ts` | conformant | Pi and OMP measured; OpenCode estimated from `output.args` |
| DEC-09 | In-process failure boundary | `src/infrastructure/harnesses/common/in-process-support.ts` | `tests/unit/in-process-runtime.test.ts:64-96` | conformant | Catches all errors; resolves via `resolveFailure` |
| DEC-10 | Brake mode determination | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/capabilities.ts` | `tests/unit/harness-adapters.test.ts` | conformant | Pi/OMP enforced; OpenCode cooperative |
| DEC-12 | Reset notice delivery | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/reset-notice.test.ts:47-58` | conformant | `/new` via `ctx.ui.notify`; OpenCode has no command |
| DEC-13 | Event lifecycle registrations | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/runtime-*.test.ts` | conformant | `tool_call`, `tool_result`, `session_start`, `session_compact`, `auto_compaction_end`, `session_stop`, `message_end`, `tool.execute.*`, `event` |
| DEC-16 | In-process write-through & caching | `src/infrastructure/harnesses/common/in-process-support.ts` | `tests/unit/pi-runtime-usage.test.ts`, `tests/unit/omp-runtime-usage.test.ts` | conformant | `createRuntimeResolver` caches runtime per project root with write-through ledger |
| DEC-17 | In-process sampler context | `src/infrastructure/diagnostics/in-process-sampler.ts:29-36` | `tests/unit/in-process-sampler.test.ts:49-55` | conformant | Provides synchronous `ContextUsage`, `sessionManager`, `cwd`, and `ui.notify` |
| CMP-18 to CMP-22, CMP-24 | In-process harness components and thin assets | `src/infrastructure/harnesses/*`, `assets/runtime/*` | Entire test suite | conformant | Hexagonal ports and adapters architecture preserved; assets are 6-line delegators |
| TC-09 | Reset events and counters | `src/infrastructure/harnesses/*/events.ts` | `tests/unit/pi-runtime-usage.test.ts`, `tests/unit/omp-runtime-usage.test.ts`, `tests/unit/runtime-opencode.test.ts` | conformant | Verified across all three in-process harnesses |
| TC-11 | Measured usage, estimation fallback, window change | `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` | `tests/unit/pi-runtime-usage.test.ts`, `tests/unit/omp-runtime-usage.test.ts` | conformant | Verified with real `ContextUsage` shapes |
| TC-12 | Estimated usage fields | `src/infrastructure/harnesses/opencode/events.ts` | `tests/unit/runtime-opencode.test.ts` | conformant | `observedCharacters` extracted from `output.args` |
| TC-14 | Telemetry rendering | `src/infrastructure/harnesses/{pi,oh-my-pi}/events.ts` | `tests/unit/runtime-pi.test.ts`, `tests/unit/runtime-omp.test.ts` | conformant | Exactly one appended part |
| TC-21 | Reset notices | `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts` | `tests/unit/reset-notice.test.ts` | conformant | Correct channels and messages verified |
| TC-32 | In-process deny and failure semantics | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/in-process-runtime.test.ts` | conformant | Deny shapes, failure fallback, and zero stdout verified |
| TC-33 | Fixture contract mapping | `src/infrastructure/harnesses/*/events.ts` | `tests/unit/runtime-{pi,omp,opencode}.test.ts`, `tests/unit/harness-schemas-in-process.test.ts` | conformant | Documented fixture payloads map and validate cleanly |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | All touched source, asset, helper, and test files ≤ 100 lines (longest are `tests/unit/{pi-runtime-usage,runtime-opencode}.test.ts` at 98 lines); all functions ≤ 30 lines; 0 comments in source files; parameters ≤ 3; named constants used |
| `javascript-typescript.md` | OK | Strict typecheck clean (`tsc -p tsconfig.check.json --noEmit`); 0 `any`; `zod/mini` schemas; immutable patterns; return types declared |
| `node.md` | OK | Exclusively asynchronous I/O (`fs/promises`); paths constructed with `node:path` and `node:url`; no synchronous I/O in runtime modules |
| `harness-adapters.md` | OK | Documented harness events only; non-strict schemas; stdout rule observed (in-process handlers never write to stdout; spy verified); failure policy implemented; version gates and loading gaps documented in research |
| `file-changes.md` | OK | Pure event mapping, surgical updates, thin delegator assets |
| `cli-output.md` | OK | In-process handlers silent; block and reset notice formatting adheres to plain-text ASCII specifications |
| `tests.md` | OK | Tests run against temporary directories cleaned up in `afterEach`; real fixtures preserved; mock spies restored |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|as any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}' <files>` | 0 new of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" <core_files>` | 0 new of 0 | OK (no core changes in T07) |
| QA-05 | Synchronous file or process API in runtime modules | blocking | `rg -n --type ts '\b(readFileSync\|...)\b' <in_process_files>` | 0 new of 0 | OK (all I/O async) |
| QA-06 | `console.log` or `process.stdout.write` outside response writer | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' <hook_files>` | 0 new of 0 | OK (in-process handlers never write to stdout) |
| QA-07 | `exec`, `execSync`, or `shell: true` | blocking | `rg -n --type ts '\bexecSync\(\|\bexec\(\|shell:\s*true' <files>` | 0 new of 0 | OK |
| QA-08 | Runtime bundles pulling heavy dependencies | blocking | Bundle inspect for `jsonc-parser`, `semver`, `node:child_process`, `src/cli/`, classic `zod` | 0 new of 0 | OK (bundles clean, automated suite owned by T08) |
| QA-09 | Clock or randomness in `core` | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' <core_files>` | 0 new of 0 | OK (no core changes in T07) |
| QA-10 | Generic `throw new Error(` | reservation | `rg -n --type ts 'throw new Error\(' <files>` | 0 new of 0 | OK (`OpenCodeBlockedError` extends `Error` with specific name) |
| QA-11 | 4+ parameters or file > 100 lines | reservation | Line count and max-params scan | 0 new of 0 (all touched/created files ≤ 100 lines) | OK |

- Terrain baseline: Applied from TechSpec at `b9647e9`. Target files clean.
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 1 (pre-existing CR-02 from T02; 0 new in T07)
- Suggested escalation: no trigger fired

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| `DEC-05` (Measured usage for Pi and Oh-My-Pi; estimate elsewhere) | YES | Implemented via `ctx.getContextUsage()`; OpenCode uses `output.args` character estimation |
| `DEC-09` (In-process failure policy & boundary) | YES | Implemented in `in-process-support.ts` |
| `DEC-10` (Brake mode from capabilities) | YES | `capabilities.ts` per harness; Pi/OMP enforced, OpenCode cooperative |
| `DEC-12` (Reset notice per harness) | YES | Verified in Pi and Oh-My-Pi via `ctx.ui.notify`; OpenCode has null command |
| `DEC-13` (Reset events per harness) | YES | Verified for `session_compact`, `auto_compaction_end`, `session_start`, `session.created`, `session.compacted` |
| `DEC-16` (In-process write-through & runtime cache) | YES | Implemented in `createRuntimeResolver` and `InProcessRuntime` |
| `DEC-17` (Real ContextUsage in benchmark context) | YES | Implemented in `createBenchmarkContext` in `in-process-sampler.ts` |
| `CMP-18` to `CMP-22`, `CMP-24` (Components and ports) | YES | Modular ports and adapters structure preserved; assets are 6-line delegators |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T07 | `tasks/prd-02-telemetria-zonas-e-freio/task_07.md` | COMPLETE | All 6 sub-items completed; handoff documented; all acceptance criteria met |

## Executed validations

- Profile and scope: In-process harness runtimes (Pi, Oh-My-Pi, OpenCode), capabilities, schemas, pure event mapping, thin asset delegators, benchmark sampler context, in-process failure policies, deny semantics, reset notices, and test suites.
- Validated state: Working tree on commit `3cff470` plus uncommitted T07 diff (Node v24.19.0, Windows 11, PowerShell 7).
- Reused evidence: None. All checks freshly executed in this session.
- Manual acceptance: Gaps recorded in research file: Pi project-local `.js` extension discovery (OI-03), Oh-My-Pi `.js` extension loading (OI-04), and OpenCode plugin arguments / token API (OI-05), accepted per task acceptance criteria.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0) | Asset building, schema generation, TypeScript build |
| `npm run typecheck` | passed (exit 0) | Strict TypeScript compliance |
| `npm run lint` | passed (exit 0) | Coding standards, QA-01..QA-05, QA-10..QA-11 |
| `npm run schemas:check` | passed (exit 0) | Schema currency check |
| `npm run dependencies:check` | passed (3 runtime dependencies, no install scripts) | NFR dependencies check |
| `npm run package:smoke` | passed (314 files, exit 0) | Packaging integrity |
| `npx vitest run pi-runtime-usage omp-runtime-usage runtime-pi runtime-omp runtime-opencode in-process-runtime in-process-sampler reset-notice harness-adapters runtime-in-process` | passed (10 files, 55 tests, exit 0) | RF3-RF8, RF12, RF14, RF17-RF19, RF21-RF22, CA-06..CA-19 |
| `npm test` | passed (141 files, 677 tests, exit 0) | Entire test suite regression check |
| `npm run coverage` | passed (93.31% lines, 87.17% branch, 94.76% funcs) | Test coverage well above 80% threshold |
| QA-01..QA-11 profile scans | passed (0 blocking hits, 0 new reservations) | Quality profile QA-01 to QA-11 |

## Findings

No new findings were introduced in Task T07.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | persistent | `schemas/context-brake.config.schema.json:190` — `brake` remains in `required` array due to output semantics in `scripts/generate-schemas.ts`. Scheduled for T08; untouched by T07. |
| `codereview_02/CR-02` | persistent | `tests/unit/protocol-zone-coherence.test.ts:23` — `throw new Error(...)` in test helper guard. Untouched by T07. |

## Limitations and open items

- OI-03: Pi project-local discovery is documented for `*.ts` while the installed asset is `context-brake.js`; no local Pi installation was available, so the load gap is recorded in `docs/research/harness-integrations.md`.
- OI-04: Oh-My-Pi extension loading was not exercised with a real installation; documented in research file.
- OI-05: OpenCode `input.sessionID` and `tool.execute.after` arguments remain undocumented; fallback session ID is `project` and `observedCharacters` uses `output.args`; gaps recorded in research file and keep the harness in cooperative mode.
- Previous findings CR-01 and CR-02 remain open as non-blocking optional reservations.
- Automated bundle-guard test suite (QA-08) is scheduled as a T08 deliverable; manual bundle inspection was clean.

## Conclusion

Task T07 is approved with reservations (`APPROVED WITH RESERVATIONS`). All obligations, acceptance criteria, and technical decisions are conformant. The full test suite of 677 tests across 141 files passes, code coverage is 93.31%, and zero new defects were introduced.
