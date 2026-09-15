# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Session ledger, counters, runtime logs, and retention

## Outcome

Completed tool calls are counted per session in an append-only JSONL ledger under `.context-brake/runtime/sessions/<harness>/<key>.jsonl`, with hashed session keys and subagent separation, duplicate-call suppression, reset handling, and tolerance for partial lines. Block and error logs stay metadata-only, the runtime directory ignores itself in git, and ledgers untouched for 14 days are pruned on new sessions.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T04
- In scope: `src/core/contracts/session-ledger.ts`, `src/core/services/session-counters.ts`, `src/infrastructure/runtime/{node-session-ledger,node-runtime-logs,runtime-paths}.ts`, and the suites named below.
- Out of scope: the brake core and hosts (T04) and the doctor findings (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF1, RF2, RF3, RF4 | `prd.md#principais-funcionalidades` | Turn counting, isolation and persistence, reset, separate subagent counts |
| RF8, RF20 | `prd.md#principais-funcionalidades` | Source in the ledger line; blocks and errors recorded without content |
| CA-06, CA-07, CA-08, CA-18 | `prd.md#critérios-de-aceitação` | Parallel count, reset restart, subagent isolation, block record shape |
| DEC-04, DEC-11, DEC-16 | `techspec.md#technical-decisions` | Ledger layout and keys, log contents, `.gitignore` and retention |
| CMP-03, CMP-06, CMP-15 | `techspec.md#components-and-flow` | Contracts and ports, counters, ledger and log adapters |
| TC-08 (core), TC-09 (unit), TC-20 (writer), TC-29 | `techspec.md#test-approach` | Concurrency, reset, block record, retention |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/node.md` (async I/O, no synchronous calls, paths via `node:path`), `.agents/rules/javascript-typescript.md` (Zod for external data; return types), `.agents/rules/code-standards.md` (100-line files, ≤ 3 parameters), `.agents/rules/file-changes.md` (only owned files; LF endings).
- Existing code: `src/infrastructure/storage/runtime-state-files.ts` (`RUNTIME_STATE_RELATIVE_DIR`); `src/infrastructure/storage/atomic-writer.ts` and `node-file-system.ts` (hash and write helpers); `src/core/contracts/runtime.ts` from T02 (`SessionKey`).
- Contract or integration: `techspec.md#contracts-and-data` "Session ledger v1" and "Block log and error log v1" for the exact line fields and example.
- Harness reference: session identifier fields per harness are listed in `docs/research/harness-integrations.md` and the TechSpec Integrations table.

## Work

- [ ] T03.1 Create `session-ledger.ts` with the mini schemas for the `session`, `tool`, and `reset` lines, the block and error line schemas, and the ports `SessionLedger`, `BlockLog`, `RuntimeErrorLog`, `SessionLedgerReader`, and `Clock`; readers skip lines with an unknown version or failed schema.
- [ ] T03.2 Implement `session-counters.ts`: turns as tool lines after the last reset plus one, deduplication by `toolUseId`, observed characters, last reading, last zone, and the session line.
- [ ] T03.3 Implement `node-session-ledger.ts` and `runtime-paths.ts`: SHA-256 key (first 32 hex characters of `sessionId + "\0" + (agentId ?? "")`), single `appendFile` writes under 4 KiB, tolerant reads, `<root>/.context-brake/runtime/` creation with a `.gitignore` containing `*`, and 14-day pruning on new-session events using the injected clock.
- [ ] T03.4 Implement `node-runtime-logs.ts`: append block and error lines with the exact fields of the TechSpec, never storing tool input, output, paths, or commands.
- [ ] T03.5 Add the unit and integration suites, including concurrent appends and `utimes`-based retention.

## Acceptance criteria

- Three concurrent appends plus one isolated append yield four `tool` lines and the isolated read reports turn 4; a duplicate `toolUseId` adds no second turn.
- A reset line restarts the count at 1 on the next tool line; a line with a corrupt schema is skipped without failing the read.
- Ledger and log files contain only the documented metadata; a sentinel secret from the test never appears in any file under the runtime directory.
- `.gitignore` with `*` exists after the first write; a 15-day-old ledger is pruned while a 13-day-old one survives.
- Every created file uses LF endings and is written inside `<root>/.context-brake/runtime/`.

## Verification

- Unit: `tests/unit/session-counters.test.ts` (turns, dedup, resets, last zone), `tests/unit/runtime-paths.test.ts` (key hashing and root resolution).
- Integration: `tests/integration/runtime-session-ledger.test.ts`, `tests/integration/runtime-parallel-turns.test.ts` (concurrent appends; T07 extends it with spawned built hooks), `tests/integration/runtime-retention.test.ts`, `tests/integration/runtime-block-log.test.ts`.
- End-to-end: not applicable — no CLI flow yet.
- Manual: none.
- Platforms: Linux, macOS, Windows (PowerShell and Git Bash) for the append, path, and retention suites; Windows CI must allow symbolic links only if a fixture links directories.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/session-counters.test.ts tests/unit/runtime-paths.test.ts tests/integration/runtime-session-ledger.test.ts tests/integration/runtime-parallel-turns.test.ts tests/integration/runtime-retention.test.ts tests/integration/runtime-block-log.test.ts`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: green suites with coverage of the new modules.

## Affected files

- Create: `src/core/contracts/session-ledger.ts`, `src/core/services/session-counters.ts`, `src/infrastructure/runtime/{node-session-ledger,node-runtime-logs,runtime-paths}.ts`, `tests/unit/session-counters.test.ts`, `tests/unit/runtime-paths.test.ts`, `tests/integration/runtime-session-ledger.test.ts`, `tests/integration/runtime-parallel-turns.test.ts`, `tests/integration/runtime-retention.test.ts`, `tests/integration/runtime-block-log.test.ts`
- Modify: `tests/test-lanes.ts` (register process-lane suites that touch the filesystem or spawn processes)

## Observability and recovery

- Operational signal: ledgers and logs are the local record read by `doctor` (T06); retention bounds their growth.
- Recovery: deleting `.context-brake/runtime/` resets all sessions without affecting plans, checkpoints, or harness configuration; `remove --remove-state` already covers this path.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
