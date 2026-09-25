# Stable execution context

Load in this exact order:

1. `tasks/prd-02.1-freio-por-uso-medido/prd.md`
2. `tasks/prd-02.1-freio-por-uso-medido/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Measured usage in Claude Code from the transcript

## Outcome

Claude Code hooks report `source=measured` with the token count of the latest main-thread API response. On any transcript problem they fall back to the estimate, and they stay within the overhead target.

## Dependencies and boundaries

- Depends on: T03
- Unblocks: T05
- In scope (DEC-07, DEC-08, DEC-11):
  - `transcript-usage.ts`;
  - `transcript_path` in the payload schema;
  - async `mapClaudeInput` for `PreToolUse` and `PostToolUse`, with `ProcessHarnessAdapter.mapInput` allowed to return a promise;
  - error log entry on I/O failure;
  - fixtures and the e2e brake scenario.
- Out of scope: capability text and research doc (T05); other harnesses.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04 | `prd.md#functional-requirements` | Measure from transcript usage |
| FR-05 | `prd.md#functional-requirements` | Fallback to estimate |
| OBJ-02, OBJ-04 | `prd.md#outcomes-and-metrics` | Measured readings; overhead |
| NFR-01, NFR-02, NFR-03, NFR-06 | `prd.md#non-functional-requirements` | Performance, resilience, privacy, platforms |
| DEC-07, DEC-08, DEC-11 | `techspec.md#technical-decisions` | Reader and adapter |
| CMP-10, CMP-11, CMP-12 | `techspec.md#components-and-flow` | Components |
| TC-13–TC-18 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `harness-adapters.md`, `node.md`, `javascript-typescript.md`, `tests.md`.
- Harness reference: `docs/research/harness-integrations.md#claude-code` (the transcript is written asynchronously; `transcript_path` is in the common input).
- Existing code:
  - `src/infrastructure/harnesses/claude-code/runtime.ts:49-53` and `schemas.ts:19-28`;
  - `src/infrastructure/runtime/process-hook-host.ts:69-80`. The file is at 100 lines, so keep the change line-neutral;
  - `src/core/services/failure-policy.ts` (error log codes).
- Tests: `runtime-claude.test.ts`, `claude-runtime-session-key.test.ts`, `tests/e2e/e2e-brake.test.ts`, `doctor-benchmark.test.ts`.
- HIL 2 decision `DEC-HIL-03`: unparseable transcript lines are skipped without logging; only file I/O failures are logged.

## Work

- [x] T04.1 Implement `readTranscriptUsage` with bounded backward reads, and its fixtures.
- [x] T04.2 Allow an async `mapInput` in the process host; make `mapClaudeInput` read the transcript for main-session pre-tool and post-tool events.
- [x] T04.3 Record `TranscriptUnreadableError` in the runtime error log and fall back to the estimate.
- [x] T04.4 Add tests for TC-13–TC-18, including the 20 MB and non-ASCII path cases and the e2e test with the built hook.

## Acceptance criteria

- With a fixture of 2 + 784 + 193,645 tokens, the block shows `tokens=194431/<contextWindowCeiling>` and `source=measured`, and the ledger tool line has `source: "measured"`.
- Sidechain lines are skipped, and subagent payloads (`agent_id`) use the estimate.
- A missing, empty, torn, or malformed transcript gives the estimate. The read never throws and never causes a deny.
- With a 20 MB transcript at a path with spaces and accents, the result is correct and the hook p95 stays within 100 ms.
- E2E: at 80% measured usage, a `Read` of a code file is denied; at 40% it is allowed after 50 prior calls.
- No transcript text reaches the ledger, the logs, or stdout.

## Verification

- Unit: TC-17.
- Integration: TC-13, TC-14, TC-15, TC-16.
- End-to-end: TC-18, with the built hook against a fixture repository.
- Platforms: Linux, macOS, Windows (CI matrix).
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: passing suites and benchmark output.

## Affected files

- Create: `src/infrastructure/harnesses/claude-code/transcript-usage.ts`, `tests/integration/claude-transcript-usage.test.ts`, `tests/fixtures/harnesses/claude-code/transcript-*.jsonl`.
- Modify: `src/infrastructure/harnesses/claude-code/runtime.ts`, `schemas.ts`, `src/infrastructure/runtime/process-hook-host.ts`, `tests/fixtures/harnesses/claude-code/pre-tool-use.json` and `post-tool-use.json` (add `transcript_path` if absent), related tests.

## Observability and recovery

- Operational signal: `source` in the ledger; `UNEXPECTED` with detail `TranscriptUnreadableError` in the runtime error log.
- Recovery: revert the commit; the estimate path is unchanged.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: T04 is complete, and the prd-06 merge (`5492604`) is reconciled under `DEC-HIL-04`.
  - `readTranscriptUsage`: backward read in 64 KiB chunks, bounded at 4 MiB, main-thread lines only, with `TranscriptUnreadableError` for I/O failures and non-regular files.
  - `transcript_path` added to the schema.
  - `mapClaudeInput` is async: on PreToolUse/PostToolUse it returns `measured: { tokens, contextWindow: null, at }`, and it does not read the transcript for subagents (DEC-08).
  - The host awaits `mapInput(eventName, payload, errors)`. The adapter logs `UNEXPECTED`/`TranscriptUnreadableError` and falls back to the estimate.
  - Reconciliation: the only plan port is prd-06 `PlanPresence.exists()`. `planGuidance(sources, planPresent)` and `delegatedGuidance` use `compactZoneAction`. The block takes a required `action`. `resolveGuidance` receives the zone and checks the plan without the delegated section only for YELLOW/RED (TechSpec DEC-06). `wrap-telemetry` resolves the zone before the guidance.
- Changed files:
  - Created: `src/infrastructure/harnesses/claude-code/transcript-usage.ts`, `tests/integration/claude-transcript-usage.test.ts`, `tests/unit/runtime-claude-measured.test.ts`, `tests/e2e/e2e-measured-brake.test.ts` (new file because `e2e-brake.test.ts` is at the line limit), `tests/helpers/transcript-fixtures.ts`, `tests/fixtures/harnesses/claude-code/transcript-{main,sidechain,no-assistant}.jsonl`.
  - Modified for T04: `claude-code/runtime.ts`, `claude-code/schemas.ts`, `runtime/process-hook-host.ts` (line-neutral), fixtures `pre-tool-use.json`/`post-tool-use.json`, `tests/unit/runtime-claude.test.ts`, `tests/unit/process-hook-host.test.ts`, `tests/integration/runtime-overhead.test.ts`.
  - Reconciliation: `zone-guidance.ts`, `delegated-guidance.ts`, `zone-actions.ts`, `brake-engine.ts`, `session-zone.ts`, `telemetry-block.ts`, `block-message.ts`, `configuration.ts`, `wrap-telemetry.ts`, `runtime-composition.ts` (equal to HEAD), and `plan-validation-reader.ts` (restored to HEAD).
  - Tests updated for the reconciliation: engine, session-zone, telemetry-block, zone-guidance, and the prd-06 delegated suites (seeding by usage, v2 texts). `tests/integration/plan-presence-reader.test.ts` was removed.
- Checks (HEAD `5492604` + worktree, Windows 11, Node 24):
  - `npm run build`, `npm run lint`, `npm run typecheck`, and `npm run schemas:check` pass.
  - `npm run coverage`: 242 files, 1,575 tests passed, 3 skipped; lines 95.39%, branches 90.23%.
  - e2e TC-18 with the built hook: 40% allowed after 50 calls, 80% denies Read, no transcript text in the ledger, block log, or stdout.
  - Overhead with the built hook and a 20 MB transcript: p95 1.90x the baseline, the same as the path without a transcript.
  - Quality profile QA-01–QA-08 is clean. The only QA-05 hit is the response writer, which the profile excludes.
- Validated state: the worktree above. Platforms other than Windows depend on the CI matrix.
- Open items:
  - The research section on the transcript `usage` is T05 (FR-10).
  - The manual acceptance in a real Claude Code session belongs to QA.
  - `stash@{0}` (autostash) can be dropped by the user once they have reviewed the worktree.
  - The prd-06 NFR-03 deviation is limited to YELLOW/RED without the section (DEC-06).

### ADR candidates

None - direct TechSpec implementation or local decision.
