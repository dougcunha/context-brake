# Stable execution context

Load in this exact order:

1. `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
2. `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Brake decision core and runtime hosts

## Outcome

The brake engine turns a normalized runtime event into a `neutral`, `deny`, `context`, or `notify_user` decision. At `CRITICAL` only allowlisted targets pass, the block message names the reason, values, and allowed actions, a failure never blocks below the ceiling and keeps the allowlist available above it, and the brake mode is derived from the capability model. A provisional plan reader supplies the active step's validation command, a normalizer resolves tool paths, and two hosts run the engine: one process per event (stdin, one stdout response, exit 0) and one inside a harness process (async I/O, per-session cache, never stdout).

## Dependencies and boundaries

- Depends on: T02, T03
- Unblocks: T05, T06
- In scope: `src/core/services/{shell-command-matcher,brake-allowlist,block-message,reset-notice,brake-engine,failure-policy,brake-mode}.ts`, `src/infrastructure/runtime/{plan-validation-reader,tool-path-normalizer,process-hook-host,in-process-host,runtime-composition}.ts`, and the suites named below.
- Out of scope: doctor findings (T05), per-harness payload mapping and rendering (T06, T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF17, RF18, RF19 | `prd.md#principais-funcionalidades` | Deny above the ceiling, allowlist, failure policy |
| RF20, RF21, RF22 | `prd.md#principais-funcionalidades` | Block record on deny, cooperative mode, reset signal |
| CA-14, CA-15, CA-16, CA-17 (mode), CA-19 (detection) | `prd.md#critérios-de-aceitação` | Deny shape, allowlist execution, failure paths, mode, signal |
| DEC-08, DEC-09, DEC-10 (mode), DEC-12 (detection), DEC-15, DEC-18 | `techspec.md#technical-decisions` | Allowlist rules, failure boundary, mode, notice, root resolution, provisional plan |
| CMP-08, CMP-09, CMP-10, CMP-11 (mode), CMP-16 (reader and normalizer), CMP-17 | `techspec.md#components-and-flow` | Services, adapters, hosts |
| TC-15, TC-16, TC-17, TC-21 (detection), TC-25, TC-30, TC-32 (core) | `techspec.md#test-approach` | Deny, allowlist, failure, notice, mode, plan, in-process semantics |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/javascript-typescript.md` (dedicated error classes, exhaustive unions), `.agents/rules/code-standards.md` (guard clauses, named constants, limits), `.agents/rules/node.md` (stdout belongs to the harness; no synchronous I/O in-process; child processes only with argument arrays), `.agents/rules/harness-adapters.md` (failure policy; a hook never ends with an uncaught exception).
- Existing code: `src/core/contracts/runtime.ts` and `zones.ts` (T02); `src/core/contracts/session-ledger.ts` and ports (T03); `src/infrastructure/storage/path-boundary.ts`; `src/core/services/support-service.ts`; `assets/runtime/process-hook.ts:37-41` (stub to replace); `src/infrastructure/storage/project-config-store.ts`.
- Contract or integration: `techspec.md#contracts-and-data` "Block message v1", "Reset notice", "Provisional plan read contract"; `techspec.md#components-and-flow` process hook flow; `techspec.md#integrations-and-interfaces` for the allowlist and vendor timeouts the deadline stays under.
- Harness reference: `docs/research/harness-integrations.md` "Execução" notes per harness (event as first argument, stdin JSON, cwd rules).

## Work

- [x] T04.1 Implement `shell-command-matcher.ts`: trim, reject shell operators (`;`, `&`, `|`, backtick, `$(`, `<`, `>`, CR, LF), and match `git status`/`git add`/`git commit` prefixes, an exactly-equal validation command, and leading-token matches from `brake.additionalAllowedCommands`.
- [x] T04.2 Implement `brake-allowlist.ts`: allow every path that resolves to the plan or checkpoint file (reads and writes), the active step's validation command, the git commands, and configured commands; deny unknown tools and unclassifiable inputs.
- [x] T04.3 Implement `block-message.ts` (normal and failure variants, exact v1 text) and `reset-notice.ts` (final-text detection after trimming, per-harness command from the descriptor).
- [x] T04.4 Implement `brake-engine.ts` for the five events: `pre_tool`, `post_tool`, `pre_invocation`, `session_reset`, `response_end`; append one block record per deny.
- [x] T04.5 Implement `failure-policy.ts` (last-zone fallback, default paths and no extra commands when the configuration is invalid, deny variant only for non-allowlisted calls above the ceiling, error record) and `brake-mode.ts` (`enforced` only with `pre_tool_block` and `tool_coverage` both `supported`, otherwise `cooperative` with the first missing capability's impact).
- [x] T04.6 Implement `plan-validation-reader.ts` (provisional schema from `DEC-18`, read lazily) and `tool-path-normalizer.ts` (parent `realpath` plus basename, POSIX separators).
- [x] T04.7 Implement `process-hook-host.ts` exporting `runProcessHook(descriptor)`: stdin capped at 16 MiB, event from `process.argv[2]`, root resolution, 1,500 ms deadline, configuration load (missing means `DEFAULT_CONFIG`; invalid counts as failure), one stdout response, exit 0.
- [x] T04.8 Implement `in-process-host.ts`: the same engine calls with async I/O only, a per-session summary cache invalidated on session start and compaction, and no stdout writes.
- [x] T04.9 Implement `runtime-composition.ts` wiring the ledger, logs, plan reader, clock, and engine for a descriptor; add the unit suites plus one process-lane fixture entry that spawns the host.

## Acceptance criteria

- At `CRITICAL`, a `Read` of a code file returns `deny` with the exact block message and one block record; checkpoint writes, plan reads, the validation command, `git status`, `git add`, `git commit`, and configured commands return `neutral`.
- `git status && rm -rf x`, `git push`, a `;`-chained command, an unknown tool, and a patch touching a state file plus another file are denied.
- A failing dependency at 40% returns `neutral`; the same failure with last recorded zone `CRITICAL` denies a code read, stays neutral for a checkpoint write and `git add`, and appends an error record; an invalid configuration uses the default plan and checkpoint paths.
- `brakeMode` is `enforced` for Claude Code, Cursor, Copilot, Pi, and Oh-My-Pi descriptors and `cooperative` for Codex CLI, OpenCode, and Antigravity CLI, never `enforced` for an `unknown` block or coverage state.
- A response whose trimmed final text is `[REQUEST_SESSION_RESET]` produces the notice text with the descriptor's command; the signal mid-text does not.
- A process hook with a valid payload writes exactly one response and exits 0; an unhandled exception produces the fallback decision and still exits 0; oversized stdin is truncated; a deadline expiry records `DEADLINE_EXCEEDED`.
- The in-process host returns the same decisions without touching stdout.

## Verification

- Unit: `tests/unit/brake-allowlist.test.ts`, `tests/unit/shell-command-matcher.test.ts`, `tests/unit/plan-validation-reader.test.ts`, `tests/unit/tool-path-normalizer.test.ts`, `tests/unit/brake-engine-pre-tool.test.ts`, `tests/unit/failure-policy.test.ts`, `tests/unit/brake-mode.test.ts`, `tests/unit/reset-notice.test.ts` (detection and text; harness channels extend it in T06 and T07), `tests/unit/process-hook-host.test.ts`, `tests/unit/in-process-host.test.ts`, `tests/unit/runtime-composition.test.ts`.
- Integration: `tests/integration/runtime-host-process.test.ts` (spawns the fixture entry with documented payloads; asserts exit code and response).
- End-to-end: not applicable — the built-CLI flow is T09.
- Manual: none.
- Platforms: Linux, macOS, Windows for the spawn suite and path normalization on every platform.
- Commands: `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/brake-allowlist.test.ts tests/unit/shell-command-matcher.test.ts tests/unit/plan-validation-reader.test.ts tests/unit/tool-path-normalizer.test.ts tests/unit/brake-engine-pre-tool.test.ts tests/unit/failure-policy.test.ts tests/unit/brake-mode.test.ts tests/unit/reset-notice.test.ts tests/unit/process-hook-host.test.ts tests/unit/in-process-host.test.ts tests/unit/runtime-composition.test.ts tests/integration/runtime-host-process.test.ts`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: green suites proving allow, deny, failure, mode, notice, and host decisions.

## Affected files

- Create: `src/core/services/{shell-command-matcher,brake-allowlist,block-message,reset-notice,brake-engine,failure-policy,brake-mode}.ts`, `src/infrastructure/runtime/{plan-validation-reader,tool-path-normalizer,process-hook-host,in-process-host,runtime-composition}.ts`, `tests/unit/{brake-allowlist,shell-command-matcher,plan-validation-reader,tool-path-normalizer,brake-engine-pre-tool,failure-policy,brake-mode,reset-notice,process-hook-host,in-process-host,runtime-composition}.test.ts`, `tests/integration/runtime-host-process.test.ts`, `tests/fixtures/runtime-host/host-entry.ts`
- Modify: `tests/test-lanes.ts`

## Observability and recovery

- Operational signal: each deny appends a block record; each failure appends an error record; both surface through doctor in T05. Process hooks log one stderr line.
- Recovery: reverting the assets to the PRD-01 stubs stops all runtime behavior; no user file depends on this task's output.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: T04 implemented. `shell-command-matcher.ts` rejects the operator set and matches git verbs, the exact validation command, and configured leading tokens; `brake-allowlist.ts` allows state-file reads/writes and shell commands and denies unknown or unclassifiable calls; `block-message.ts` renders the normal and failure v1 messages; `reset-notice.ts` detects the trimmed final signal and renders the notice; `brake-mode.ts` derives `enforced` only with both required capabilities supported; `brake-engine.ts` handles the five events (pre-tool deny + block record, post-tool line + telemetry, pre-invocation telemetry, reset + conditional pruning, response-end notice); `failure-policy.ts` classifies failures (INVALID_CONFIG, PAYLOAD_INVALID, DEADLINE_EXCEEDED, LEDGER_UNREADABLE, UNEXPECTED), tolerantly reads the last recorded zone, evaluates the allowlist with the loaded or default configuration, and records the error; `plan-validation-reader.ts` implements the provisional DEC-18 reader; `tool-path-normalizer.ts` canonicalizes the parent with `realpath` and returns project-relative POSIX paths; `process-hook-host.ts` runs the whole dispatch (root, stdin readable, map, config, engine) inside the 1,500 ms deadline, writes at most one response, always exits 0, and falls back through the failure policy; `in-process-host.ts` returns engine decisions with a write-through per-session cache invalidated on reset and writes nothing to stdout; `runtime-composition.ts` wires ports, config loading (missing means DEFAULT_CONFIG), the plan reader, the clock, and the engine, with a cached-ledger decorator.
- Changed files:
  - Core: `src/core/services/{shell-command-matcher,brake-allowlist,block-message,reset-notice,brake-mode,brake-engine,failure-policy}.ts` (new)
  - Infrastructure: `src/infrastructure/runtime/{plan-validation-reader,tool-path-normalizer,runtime-composition,process-hook-host,in-process-host}.ts` (new)
  - Tests: `tests/unit/{shell-command-matcher,brake-allowlist,plan-validation-reader,tool-path-normalizer,brake-engine-pre-tool,brake-engine-lifecycle,failure-policy,brake-mode,reset-notice,process-hook-host,in-process-host,runtime-composition}.test.ts`, `tests/integration/runtime-host-process.test.ts`, `tests/fixtures/runtime-host/host-entry.ts` (new), `tests/test-lanes.ts` (spawn suite registered)
  - Contract completion: `src/core/contracts/runtime.ts` (see open items)
- Checks:
  - `npm run typecheck` — pass. `npm run lint` — pass.
  - `npx vitest run` over the 13 T04 suites (task command list plus `brake-engine-lifecycle.test.ts`) — 13 files / 96 tests pass.
  - `npm run coverage` — 120 files / 566 tests pass, exit 0; `All files` 93.4% statements/lines. New modules: `shell-command-matcher` 100%, `brake-allowlist` 100%, `block-message` 100% lines (60% branch: the `usedTokens ?? 0` and empty-extras halves), `reset-notice` 100%, `brake-mode` 100%, `brake-engine` 100% lines/93.18% branch, `failure-policy` 93.54% lines, `plan-validation-reader` 100% lines/96.15% branch, `tool-path-normalizer` 100%, `runtime-composition` 97.56%, `process-hook-host` 94.59%, `in-process-host` 78.33% lines (uncovered: the prune-only branch and part of the cached-ledger decorator), `node-session-ledger`/`runtime-paths` unchanged from T03.
  - Acceptance evidence: exact deny message and block record at the ceiling (TC-15); allowlist allow/deny matrix incl. `git status && rm -rf x`, `git push`, `;`-chained, patch touching a state file plus another file, validation mismatch, no plan (TC-16); failure policy neutral at 40%, deny failure variant at a recorded CRITICAL zone, neutral for checkpoint write and `git add`, default paths with an invalid configuration, neutral on an unreadable ledger, DEADLINE_EXCEEDED record (TC-17); mode for all eight real adapter capability profiles plus unknown/missing states (TC-25); reset notice with `/clear` and the mid-text negative (TC-21); host valid payload = one response + exit 0, payload error, invalid-config fallback deny with an error record, deadline with a `DEADLINE_EXCEEDED` record, stdin truncation at the cap; spawned fixture host: deny above the ceiling with a block record, neutral below with a tool line, unknown event, and the reset notice (integration); in-process decisions with a stdout spy, cache coherence, invalidation after reset, and the unreadable-ledger fallback.
  - Quality profile QA-01 to QA-11, scoped to the 28 diff files: QA-01, 02, 03, 04, 05, 07, 09 empty. QA-06 has one expected hit at `src/infrastructure/runtime/process-hook-host.ts:28`, the sanctioned response writer that the profile excludes from `hook_files` (same justification the terrain baseline records for the deleted `process-hook.ts:40`). QA-08 does not exist yet (T08) and no bundle is touched. QA-10 reservations (test-only control flow, no user-fixable failure): `tests/unit/process-hook-host.test.ts:64`, `tests/unit/failure-policy.test.ts:16,44`, `tests/unit/brake-engine-lifecycle.test.ts:24,41`, `tests/unit/brake-engine-pre-tool.test.ts:22`. QA-11: all diff files ≤ 100 lines; the single parameter-regex match at `tests/unit/brake-allowlist.test.ts:28` is the known false positive of a `for...of` over an array (lint `max-params` confirms no declaration with 4+ parameters).
- Validated state: working tree on HEAD `2513088` plus this T04 diff; Node v24.19.0, Windows 11, PowerShell 7; injected `Clock`; no network, no real harness; the integration suite spawns the fixture entry with `node --import tsx`. Platforms: path normalization, spawn, and the LF/append paths executed on Windows; Linux and macOS remain CI evidence.
- Open items:
  - Scope note (needs caller acknowledgment): `src/core/contracts/runtime.ts` gained `message: string` on the `deny` decision and `capabilities: readonly CapabilityDefinition[]` on `RuntimeDescriptor`. T02's union had no deny text, and DEC-09 requires the block/failure message to reach the adapter; CMP-02 itself assigns the capability definitions to the descriptor. The `capabilities` field is the T02 handoff's recorded reservation; the `message` field is a completion of the same contract. Both are consumed by T06/T07.
  - Scope note: `tests/unit/brake-engine-lifecycle.test.ts` was added because the 100-line rule forced splitting the engine suite (the task names only the pre-tool suite); the split follows `code-standards.md` "extract a cohesive responsibility into its own file".
  - Interpretation note: the failure variant is `... tool=<name> zone=CRITICAL last recorded zone=CRITICAL reason=integration_failure. ...`, reading DEC-09 as "replace the reason value and the turn/usage/tokens/source values". The extra-command tail uses `, <command>` list items. No test pins these strings beyond the reason/zone substrings.
  - Note: `runProcessHook` resolves the project root before reading stdin because DEC-15 roots come from env/asset path, not the payload; this lets a deadline during a hung stdin still record the error. `mapEvent` runs before the configuration load so an invalid configuration still permits the fallback classification.
  - Note: `ProcessHookContext.deadlineMilliseconds` is injectable so the deadline path is tested deterministically; production uses 1,500 ms.
  - Note: the plan reader tolerates every read error as "no validation command" per DEC-18; the engine only reads the plan for shell calls at CRITICAL.
  - No ADR candidate; no architectural deviation (the two contract completions above are recorded for the reviewer).

### ADR candidates

None - direct TechSpec implementation or local decision.
