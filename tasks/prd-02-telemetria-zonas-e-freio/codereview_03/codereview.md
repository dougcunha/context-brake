# Code review report — PRD 02 Telemetry, zones, and brake (Task T03)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `4cb5d55..working tree` (accumulated changes including T03 contracts, services, infrastructure adapters, and integration suites against commit `4cb5d55655ce54a55312384a259929f6dd85df3a`)
- Previous review: `tasks/prd-02-telemetria-zonas-e-freio/codereview_02/codereview.md` (`APPROVED WITH RESERVATIONS`, CR-01, CR-02)

Task T03 implementation satisfies all requirements, acceptance criteria, and architectural decisions. Session state is persisted as append-only JSONL files under `.context-brake/runtime/sessions/<harness>/<key>.jsonl`, keyed by the first 32 hex characters of `sha256(sessionId + "\0" + (agentId ?? ""))`. Completed tool turns are summarized by counting valid `tool` lines after the last `reset` line, deduplicating repeated `toolUseId`s, and tracking observed characters, last zone, and last reading. Tolerant parsing (`parseLedgerLines`) safely skips partial, corrupt, or unknown-version lines. Concurrent writes serialize cleanly (tested across 20 bursts with 3 concurrent + 1 isolated write yielding reported turn 4 every time). Block and error logs store metadata only and never leak tool inputs, outputs, paths, or commands (verified with a sentinel secret). The runtime directory creates a `*` `.gitignore` on first write without overwriting existing files, and stale ledgers older than 14 days are cleanly pruned while fresh ones survive. All 470 tests pass with 93.01% line coverage and 0 new quality profile hits.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02-telemetria-zonas-e-freio/prd.md` | read in full |
| TechSpec | `tasks/prd-02-telemetria-zonas-e-freio/techspec.md` | read in full |
| Manifest | `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` | read in full |
| Task & Handoff | `tasks/prd-02-telemetria-zonas-e-freio/task_03.md` | read in full |
| Predecessor tasks | `tasks/prd-02-telemetria-zonas-e-freio/done/task_01.md`, `done/task_02.md` | read in full |
| Previous reviews | `tasks/prd-02-telemetria-zonas-e-freio/codereview_01/codereview.md`, `codereview_02/codereview.md` | read in full |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests,file-changes}.md` | read and applied |
| Implementation | 5 source/contract files, 6 test suites, and lane registration in working tree | delimited |

The reviewable diff for T03 comprises:
- `src/core/contracts/session-ledger.ts`
- `src/core/services/session-counters.ts`
- `src/infrastructure/runtime/{node-session-ledger,node-runtime-logs,runtime-paths}.ts`
- `tests/test-lanes.ts`
- Unit suites: `tests/unit/{session-counters,runtime-paths}.test.ts`
- Integration suites: `tests/integration/{runtime-session-ledger,runtime-parallel-turns,runtime-retention,runtime-block-log}.test.ts`

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Count each completed tool call as a turn, including parallel calls | `src/core/services/session-counters.ts:16-33`, `src/infrastructure/runtime/node-session-ledger.ts:26-28` | `tests/integration/runtime-parallel-turns.test.ts:26-38` | conformant | 20 sessions tested: 3 concurrent appends + 1 isolated append yields 4 tool lines and reported turn 4 |
| RF2 | Keep counts isolated per session and persistent between invocations | `src/infrastructure/runtime/node-session-ledger.ts:14-20,57-60`, `runtime-paths.ts:23-25` | `tests/integration/runtime-session-ledger.test.ts:30-41` | conformant | Appends one valid LF-terminated JSON line per event; survives restarts; isolated per session file |
| RF3 | Reset turns and usage on a new session or compaction | `src/core/services/session-counters.ts:22,34-37`, `node-session-ledger.ts:30-32` | `tests/unit/session-counters.test.ts:47-54`, `tests/integration/runtime-session-ledger.test.ts:30-41` | conformant | Tool count restarts at 1 after a `reset` line; earlier lines ignored |
| RF4 | Count subagents separately when harness identifies them | `src/infrastructure/runtime/runtime-paths.ts:20-22` | `tests/unit/runtime-paths.test.ts:19-23`, `tests/integration/runtime-session-ledger.test.ts:87-95` | conformant | Hash includes `agentId ?? ''`; subagent writes to separate file; main session turn count untouched |
| RF8 | Record source of each reading as measured or estimated | `src/core/contracts/session-ledger.ts:22`, `node-session-ledger.ts:26-28` | `tests/integration/runtime-session-ledger.test.ts:30-41` | conformant | `source: z.enum(USAGE_SOURCES)` validated and persisted in every tool line |
| RF20 | Record each block locally with session, tool, zone, and reason only | `src/infrastructure/runtime/node-runtime-logs.ts:12-19` | `tests/integration/runtime-block-log.test.ts:34-39,60-71` | conformant | `blocks.jsonl` contains exact schema fields; sentinel secret does not appear anywhere in runtime files |
| CA-06 | Three parallel calls plus one isolated report 4 turns | `src/core/services/session-counters.ts:16-33`, `node-session-ledger.ts:57-60` | `tests/integration/runtime-parallel-turns.test.ts:26-38` | conformant | Verified 20 times across fresh ledgers |
| CA-07 | New session or compaction restarts count at 1 | `src/core/services/session-counters.ts:22,34-37` | `tests/unit/session-counters.test.ts:47-54` | conformant | Next turn is 2 after 1 post-reset tool line |
| CA-08 | Subagent counts not added to main session | `src/infrastructure/runtime/runtime-paths.ts:20-22` | `tests/integration/runtime-session-ledger.test.ts:87-95` | conformant | Subagent ledger has 1 turn while main session has 2 |
| CA-18 | Local record shows session, tool, zone, reason; no tool content | `src/infrastructure/runtime/node-runtime-logs.ts:12-33` | `tests/integration/runtime-block-log.test.ts:34-71` | conformant | Blocks and errors logged with metadata only; payload values omitted |
| DEC-04 | JSONL ledger layout, hashed keys, append-only, dedup by `toolUseId` | `src/core/contracts/session-ledger.ts:21-26`, `runtime-paths.ts:20-25`, `session-counters.ts:24-27` | `tests/unit/session-counters.test.ts:39-46`, `tests/integration/runtime-session-ledger.test.ts:62-71` | conformant | SHA-256 32-char hex key; duplicate `toolUseId` counted once; partial/corrupt lines skipped |
| DEC-11 | Block log and error log v1 without tool content | `src/infrastructure/runtime/node-runtime-logs.ts:12-28` | `tests/integration/runtime-block-log.test.ts:34-47` | conformant | Lines match TechSpec contracts; errors log `INVALID_CONFIG`, `PAYLOAD_INVALID`, etc. |
| DEC-16 | Runtime `.gitignore`, 14-day retention, safe pruning | `src/infrastructure/runtime/runtime-paths.ts:26-34,38-44`, `node-session-ledger.ts:34-55` | `tests/integration/runtime-retention.test.ts:31-65` | conformant | `*\n` `.gitignore` written on first use and never overwritten; 15-day ledgers pruned; 13-day and log files kept |
| CMP-03 | Contracts and ports for session ledger | `src/core/contracts/session-ledger.ts:1-80` | `npm run typecheck` | conformant | Mini schemas for session, tool, reset, block, error; ports `SessionLedger`, `BlockLog`, `RuntimeErrorLog`, `Clock` |
| CMP-06 | Session counters summary service | `src/core/services/session-counters.ts:1-39` | `tests/unit/session-counters.test.ts:17-60` | conformant | Turns, observedCharacters, lastReading, lastZone, sessionLine, and nextTurn cleanly computed |
| CMP-15 | Node session ledger, runtime logs, and paths adapters | `src/infrastructure/runtime/{node-session-ledger,node-runtime-logs,runtime-paths}.ts` | Unit and integration suites (20 tests) | conformant | Fully implemented using Node.js `fs/promises` and `crypto` with LF line endings |
| TC-08 | Concurrency and isolated append | `tests/integration/runtime-parallel-turns.test.ts` | Vitest integration test | conformant | 20 iterations pass |
| TC-09 | Reset and dedup unit cases | `tests/unit/session-counters.test.ts` | Vitest unit test | conformant | 5 tests pass |
| TC-20 | Block log metadata and secret absence | `tests/integration/runtime-block-log.test.ts` | Vitest integration test | conformant | 3 tests pass |
| TC-29 | Retention window pruning | `tests/integration/runtime-retention.test.ts` | Vitest integration test | conformant | 2 tests pass |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | All touched files ≤ 86 lines (limit 100); all functions ≤ 30 lines; 0 comments in source files; parameters ≤ 3; named constants used |
| `javascript-typescript.md` | OK | Strict typecheck clean; 0 `any`; `zod/mini` schemas; immutable patterns; return types declared on all methods |
| `node.md` | OK | Exclusively asynchronous I/O (`fs/promises`); paths constructed with `node:path`; no synchronous fs APIs; error checks handle `ENOENT` and `EEXIST` |
| `file-changes.md` | OK | Files written strictly within `.context-brake/runtime/`; LF line endings (`\n`) verified in tests; `.gitignore` created on first write |
| `tests.md` | OK | Process-lane suites registered in `tests/test-lanes.ts`; integration tests run against temporary directories cleaned up in `afterEach` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|as any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}' <files>` | 0 new of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" <core_files>` | 0 new of 0 | OK |
| QA-05 | Synchronous file or process API in runtime modules | blocking | `rg -n --type ts '\b(readFileSync\|...)\b' <in_process_files>` | 0 new of 0 | OK (all I/O async) |
| QA-06 | `console.log` or `process.stdout.write` outside response writer | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' <hook_files>` | 0 (no hook files in diff) | OK |
| QA-07 | `exec`, `execSync`, or `shell: true` | blocking | `rg -n --type ts '\bexecSync\(\|\bexec\(\|shell:\s*true' <files>` | 0 new of 0 | OK |
| QA-08 | Runtime bundles pulling heavy dependencies | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | skipped (T08 deliverable; no runtime bundle in diff) | OK |
| QA-09 | Clock or randomness in `core` | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' <core_files>` | 0 new of 0 | OK (Clock injected) |
| QA-10 | Generic `throw new Error(` | reservation | `rg -n --type ts 'throw new Error\(' <files>` | 0 new of 0 | OK |
| QA-11 | 4+ parameters or file > 100 lines | reservation | 4+ parameters scan; line count per file | 0 new of 0 | OK |

- Terrain baseline: Applied from TechSpec at `b9647e9`. Target files clean.
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 1 (pre-existing CR-02 from T02; 0 new in T03)
- Suggested escalation: no trigger fired

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| `DEC-04` (Append-only JSONL ledger, hashed keys, subagent isolation, deduplication) | YES | Implemented in `node-session-ledger.ts`, `runtime-paths.ts`, `session-counters.ts`; tested in `runtime-session-ledger.test.ts` |
| `DEC-11` (Metadata-only block and error logs) | YES | Implemented in `node-runtime-logs.ts`; tested in `runtime-block-log.test.ts` |
| `DEC-16` (Runtime `.gitignore`, 14-day retention, async I/O) | YES | Implemented in `runtime-paths.ts` and `node-session-ledger.ts`; tested in `runtime-retention.test.ts` |
| `CMP-03`, `CMP-06`, `CMP-15` (Components and ports) | YES | Clean port and adapter architecture; all ports exported from `session-ledger.ts` |
| `TC-08`, `TC-09`, `TC-20`, `TC-29` (Test approach) | YES | All 4 test cases fully covered with dedicated suites |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T03 | `tasks/prd-02-telemetria-zonas-e-freio/task_03.md` | COMPLETE | All 5 checklist items done; handoff fully documented; all acceptance criteria met |

## Executed validations

- Profile and scope: Core ledger contracts, counters service, node infrastructure adapters, unit and integration suites.
- Validated state: Working tree on commit `4cb5d55` (Node v24.19.0, Windows 11, PowerShell 7).
- Reused evidence: None. All checks freshly executed.
- Manual acceptance: None required for T03.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run typecheck` | passed (exit 0) | CMP-03, CMP-06, CMP-15 |
| `npm run lint` | passed (exit 0) | Coding standards, QA-01..QA-05 |
| `npx vitest run tests/unit/session-counters.test.ts tests/unit/runtime-paths.test.ts tests/integration/runtime-session-ledger.test.ts tests/integration/runtime-parallel-turns.test.ts tests/integration/runtime-retention.test.ts tests/integration/runtime-block-log.test.ts` | passed (20 tests, exit 0) | RF1–RF4, RF8, RF20, CA-06–CA-08, CA-18, DEC-04, DEC-11, DEC-16, TC-08, TC-09, TC-20, TC-29 |
| `npm run schemas:check` | passed (exit 0) | Schema currency check |
| `npm run dependencies:check` | passed (3 runtime dependencies, no install scripts) | NFR dependencies check |
| `npm run coverage` | passed (107 files / 470 tests, exit 0; statements/lines 93.01%) | Full regression; T03 modules > 92% covered |
| `npm run package:smoke` | passed (220 files, exit 0) | Packaging integrity |
| QA-01..QA-11 profile scans | passed (0 hits across all 12 touched files) | Quality profile QA-01 to QA-11 |

## Findings

No new findings were introduced in Task T03.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | persistent | `schemas/context-brake.config.schema.json:189` — `brake` remains in `required` array due to output semantics in `scripts/generate-schemas.ts`. Documented as an item for T08 (packaging/scripts pass); untouched by T03. |
| `codereview_02/CR-02` | persistent | `tests/unit/protocol-zone-coherence.test.ts:23` — `throw new Error(...)` in test helper guard. Untouched by T03. |

## Limitations and open items

- T03 delivers session ledger persistence, counters, retention, and block/error logging. Hook execution and brake decision evaluation (`CRITICAL` pre-tool enforcement, allowlist, fallback) will be delivered in T04.
- `SessionLedgerReader` port is defined in `session-ledger.ts`; its implementation for `doctor` inspections (`runtime-state-reader.ts`) is planned for T04/T05 per CMP-16.
- Deduplication prevents duplicate turns in summary, but duplicate append suppression in hooks is enforced by T04's engine consulting the summary.
- Previous findings CR-01 and CR-02 remain open as non-blocking optional reservations.

## Conclusion

Task T03 is approved with reservations (`APPROVED WITH RESERVATIONS`). All requirements, acceptance criteria, and technical decisions are conformant. The entire test suite passes (470 tests across 107 files) with 93.01% statement/line coverage and zero new defects.
