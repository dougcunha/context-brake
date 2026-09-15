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

- [ ] T04.1 Implement `shell-command-matcher.ts`: trim, reject shell operators (`;`, `&`, `|`, backtick, `$(`, `<`, `>`, CR, LF), and match `git status`/`git add`/`git commit` prefixes, an exactly-equal validation command, and leading-token matches from `brake.additionalAllowedCommands`.
- [ ] T04.2 Implement `brake-allowlist.ts`: allow every path that resolves to the plan or checkpoint file (reads and writes), the active step's validation command, the git commands, and configured commands; deny unknown tools and unclassifiable inputs.
- [ ] T04.3 Implement `block-message.ts` (normal and failure variants, exact v1 text) and `reset-notice.ts` (final-text detection after trimming, per-harness command from the descriptor).
- [ ] T04.4 Implement `brake-engine.ts` for the five events: `pre_tool`, `post_tool`, `pre_invocation`, `session_reset`, `response_end`; append one block record per deny.
- [ ] T04.5 Implement `failure-policy.ts` (last-zone fallback, default paths and no extra commands when the configuration is invalid, deny variant only for non-allowlisted calls above the ceiling, error record) and `brake-mode.ts` (`enforced` only with `pre_tool_block` and `tool_coverage` both `supported`, otherwise `cooperative` with the first missing capability's impact).
- [ ] T04.6 Implement `plan-validation-reader.ts` (provisional schema from `DEC-18`, read lazily) and `tool-path-normalizer.ts` (parent `realpath` plus basename, POSIX separators).
- [ ] T04.7 Implement `process-hook-host.ts` exporting `runProcessHook(descriptor)`: stdin capped at 16 MiB, event from `process.argv[2]`, root resolution, 1,500 ms deadline, configuration load (missing means `DEFAULT_CONFIG`; invalid counts as failure), one stdout response, exit 0.
- [ ] T04.8 Implement `in-process-host.ts`: the same engine calls with async I/O only, a per-session summary cache invalidated on session start and compaction, and no stdout writes.
- [ ] T04.9 Implement `runtime-composition.ts` wiring the ledger, logs, plan reader, clock, and engine for a descriptor; add the unit suites plus one process-lane fixture entry that spawns the host.

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

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
