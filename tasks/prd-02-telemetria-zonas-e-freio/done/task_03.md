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

- [x] T03.1 Create `session-ledger.ts` with the mini schemas for the `session`, `tool`, and `reset` lines, the block and error line schemas, and the ports `SessionLedger`, `BlockLog`, `RuntimeErrorLog`, `SessionLedgerReader`, and `Clock`; readers skip lines with an unknown version or failed schema.
- [x] T03.2 Implement `session-counters.ts`: turns as tool lines after the last reset plus one, deduplication by `toolUseId`, observed characters, last reading, last zone, and the session line.
- [x] T03.3 Implement `node-session-ledger.ts` and `runtime-paths.ts`: SHA-256 key (first 32 hex characters of `sessionId + "\0" + (agentId ?? "")`), single `appendFile` writes under 4 KiB, tolerant reads, `<root>/.context-brake/runtime/` creation with a `.gitignore` containing `*`, and 14-day pruning on new-session events using the injected clock.
- [x] T03.4 Implement `node-runtime-logs.ts`: append block and error lines with the exact fields of the TechSpec, never storing tool input, output, paths, or commands.
- [x] T03.5 Add the unit and integration suites, including concurrent appends and `utimes`-based retention.

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

- Produced result: T03 implemented. `session-ledger.ts` defines the v1 mini schemas for the `session`, `tool`, and `reset` ledger lines plus the `block` and `error` log lines, the tolerant `parseLedgerLines`, and the ports `SessionLedger`, `BlockLog`, `RuntimeErrorLog`, `SessionLedgerReader`, and `Clock`. `session-counters.ts` summarizes valid lines into turns since the last reset (deduplicated by `toolUseId`, unidentified calls counted individually), observed characters, last reading, last zone, session line, and the known call IDs, with `nextTurn` = turns + 1. `runtime-paths.ts` hashes `sessionId + "\0" + (agentId ?? "")` to the first 32 hex characters, resolves every path under `<root>/.context-brake/runtime/`, creates the sessions tree plus the `*` `.gitignore` on first write (never overwriting an existing one), and exposes `ensureSessionDirectory`. `node-session-ledger.ts` appends one LF-terminated JSON line per event in a single `appendFile` call, reads tolerantly (missing file, corrupt, partial, and unknown-version lines), and prunes ledgers whose mtime is older than 14 days on `pruneStaleSessions()`. `node-runtime-logs.ts` appends metadata-only block and error lines with the exact TechSpec fields. The four integration suites are registered in the process lane.
- Changed files:
  - `src/core/contracts/session-ledger.ts`, `src/core/services/session-counters.ts` (new)
  - `src/infrastructure/runtime/node-session-ledger.ts`, `node-runtime-logs.ts`, `runtime-paths.ts` (new)
  - `tests/unit/session-counters.test.ts`, `tests/unit/runtime-paths.test.ts`, `tests/integration/runtime-session-ledger.test.ts`, `tests/integration/runtime-parallel-turns.test.ts`, `tests/integration/runtime-retention.test.ts`, `tests/integration/runtime-block-log.test.ts` (new)
  - `tests/test-lanes.ts` (four new integration suites in `PROCESS_LANE_FILES`)
- Checks:
  - `npm run typecheck` — pass.
  - `npm run lint` — pass after splitting the `describe` blocks to the 30-line limit.
  - `npx vitest run tests/unit/session-counters.test.ts tests/unit/runtime-paths.test.ts tests/integration/runtime-session-ledger.test.ts tests/integration/runtime-parallel-turns.test.ts tests/integration/runtime-retention.test.ts tests/integration/runtime-block-log.test.ts` — 20 tests pass.
  - `npm run coverage` — 107 files / 484 tests pass, exit 0; `All files` 93.01% statements/lines. New modules: `session-ledger.ts` 100% lines/statements/branches/functions, `session-counters.ts` 100%, `runtime-paths.ts` 100% lines/statements and 92.85% branches (line 42 defensive rethrow), `node-session-ledger.ts` 92.45% lines (17, 47-48, 52 are the non-ENOENT rethrow paths), `node-runtime-logs.ts` covered.
  - Acceptance evidence: concurrent appends + isolated append yield 4 `tool` lines and the isolated read writes turn 4 for all 20 fresh sessions (TC-08); duplicate `toolUseId` counts once; reset restarts at turn 1; corrupt/partial/unknown-v lines are skipped; sentinel secret absent from every file under `.context-brake/runtime/`; `.gitignore` = `*\n` after first write and never overwritten; 15-day ledger pruned while 13-day ledger and `blocks.jsonl` survive; LF endings asserted in both ledger and log suites.
  - Quality profile QA-01 to QA-11, scoped to the eleven diff files: QA-01, 02, 03, 04, 05, 07, 09, 10 empty; QA-06 has an empty file list (no runtime asset or hook response path in this diff) and was skipped per the profile; QA-08 (`tests/unit/runtime-bundle-imports.test.ts`) does not exist yet (T08 deliverable) and no bundle is touched. QA-11 empty (max file 79 lines; no declaration with 4+ parameters). No new blocking or reservation hit.
- Validated state: working tree on HEAD `4cb5d55` (T01/T02 committed) plus this T03 diff; Node v24.19.0, Windows 11, PowerShell 7; injected `Clock` everywhere, no network or real clock; `utimes` sets ledger mtimes. Platforms: the suites are platform-sensitive only through path joins and LF assertions; Windows executed locally, Linux and macOS remain CI evidence.
- Open items:
  - Reservation: `SessionLedgerReader` is defined but not implemented in this task; the doctor-side implementation (`runtime-state-reader.ts`) is T04/T05 scope per CMP-16.
  - Reservation: `SESSION_BRAKE_MODES` in `session-ledger.ts` restates the `BrakeMode` union (`satisfies readonly BrakeMode[]`); adding a brake mode to T02's `runtime.ts` requires the same edit here. The alternative was editing `runtime.ts`, outside this task's declared files.
  - Reservation: the ledger counts deduplicate a repeated `toolUseId` but do not prevent the duplicate append; T04's engine must consult the summary's call IDs before writing, as DEC-04 requires the line count to stay authoritative.
  - Note: `pruneStaleSessions()` runs only when a caller invokes it; T04 must call it on `new` session resets, never on `resume` or compaction.
  - Note: `runtime-paths.ts` line 42 keeps the `throw error` side of the `.gitignore` write guard uncovered (the `EEXIST` swallow is exercised by the "never overwrites it" test); the branch is defensive and the global gate passes at 93.01%.
  - No ADR candidate; no architectural or scope deviation.

### ADR candidates

None - direct TechSpec implementation or local decision.
