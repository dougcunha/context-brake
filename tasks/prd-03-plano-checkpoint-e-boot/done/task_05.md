# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Boot delivery across harnesses

## Outcome

At new-session start, every harness declaring `session_boot: supported` receives the boot summary through its documented channel. Claude Code, Codex CLI, Pi, and Oh-My-Pi also receive it after compaction. Cursor and GitHub Copilot CLI retain the protocol-file routine after compaction because no reinjection channel is documented. The two harnesses without session boot receive no injected summary.

## Dependencies and boundaries

- Depends on: T04
- Unblocks: T09
- In scope: returning the boot from `handleSessionReset`, widening three adapters' context gates, accepting Cursor's documented `session_id` at session start, and retaining Pi and Oh-My-Pi reset decisions until `before_agent_start` returns a message.
- Out of scope: installer or planner changes, which `DEC-03` rules out because every session-start event is already registered; and OpenCode and Antigravity delivery, excluded by `DEC-05`.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF9 | `prd.md#boot-no-início-da-sessão` | Deliver the boot in new sessions on all six supported harnesses, and after compaction on the four documented channels |
| RF11 | `prd.md#boot-no-início-da-sessão` | Invalid state delivers only the instruction |
| CMP-11, CMP-17, CMP-18 | `techspec.md#components-and-flow` | Engine and adapter wiring |
| DEC-01, DEC-02, DEC-03, DEC-04, DEC-05, DEC-15 | `techspec.md#technical-decisions` | Delivery seam, gate widening, Cursor payload, no installer change, in-process channel, compaction boundary, exclusions |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/harness-adapters.md` (emit only documented fields, add context without replacing results, never claim an unconfirmed capability, hooks never throw), `node.md` (no synchronous I/O inside harness processes; stdout is the hook response channel).
- Existing code: `src/core/services/brake-engine.ts:72-76` — `handleSessionReset` returns `NEUTRAL` today; keep the ledger append and prune side effects.
- Existing code: the gates to widen — `claude-code/runtime.ts:55`, `codex-cli/runtime.ts:64`, `cursor/runtime.ts:45`. `github-copilot-cli/runtime.ts:61` has no event gate and needs no change.
- Existing code: `pi/runtime.ts:58-61` and `oh-my-pi/runtime.ts:58-61` — session-start handlers that currently discard the decision; `before_agent_start` must return its message after the reset decision is retained.
- Existing code: `src/infrastructure/harnesses/*/capabilities.ts:7` — the `session_boot` states that gate delivery.
- Harness reference: `docs/research/harness-integrations.md` sections Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Pi, Oh-My-Pi, and OpenCode.

## Work

- [x] T05.1 Make `handleSessionReset` build the boot through the T04 policy and return a `context` decision, preserving the existing ledger append and stale-session prune.
- [x] T05.2 Gate delivery on the descriptor's `session_boot` capability so unsupported harnesses keep receiving `NEUTRAL`.
- [x] T05.3 Widen the context event gate in the Claude Code, Codex CLI, and Cursor adapters to the session-start event, emitting the documented field for that event.
- [x] T05.4 Accept `session_id` as well as `conversation_id` for Cursor's session-start payload.
- [x] T05.5 Retain the Pi and Oh-My-Pi reset decision per session and return it once through the documented `before_agent_start` message channel, including after compaction.
- [x] T05.6 Integration tests per harness using payload fixtures, including invalid-state, no-boot, and documented compaction cases.

## Acceptance criteria

- Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Pi, and Oh-My-Pi each receive the boot at session start, in the documented field for their event.
- Cursor's documented `sessionStart` payload with `session_id` reaches the same boot as a payload with `conversation_id`.
- OpenCode and Antigravity CLI receive no boot, and no capability is reported that their documentation does not confirm.
- Compaction delivers the boot in Claude Code, Codex CLI, Pi, and Oh-My-Pi. Cursor and GitHub Copilot CLI keep the protocol-file routine; their `preCompact` events are not treated as a boot delivery channel.
- An invalid plan or checkpoint delivers only the short instruction, with no state content, on every supported harness.
- A completed plan delivers nothing, so sessions unrelated to a task are unaffected.
- A boot failure never throws into the harness: the call proceeds and the failure is recorded through the existing error log.
- No synchronous file or process API is introduced in the in-process adapters.

## Verification

- Unit: the engine's session-reset branch for boot, no-boot, invalid-state, and capability-gated cases.
- Integration: one scenario per harness driving the built hook or extension with fixture payloads from `tests/fixtures/harnesses/<harness>/`, asserting the exact transported field.
- End-to-end: not applicable here; simulated sessions are T09.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: no real Pi, Oh-My-Pi, or OpenCode installation is available; their fixtures follow the documented format and the gaps stay recorded as prd-02 `OI-03`, `OI-04`, and `OI-05`.
- Expected evidence: per-harness assertions of the delivered field plus the recorded gap note for the uninstalled harnesses.

## Affected files

- Modify: `src/core/services/brake-engine.ts`, `src/infrastructure/runtime/runtime-composition.ts`, `src/infrastructure/harnesses/claude-code/runtime.ts`, `src/infrastructure/harnesses/codex-cli/runtime.ts`, `src/infrastructure/harnesses/cursor/runtime.ts`, `src/infrastructure/harnesses/cursor/schemas.ts`, `src/infrastructure/harnesses/pi/runtime.ts`, `src/infrastructure/harnesses/oh-my-pi/runtime.ts`, `tests/test-lanes.ts`
- Create: `src/infrastructure/runtime/boot-reader.ts`, `tests/helpers/boot-fixture.ts`, `tests/unit/brake-engine-boot.test.ts`, `tests/integration/boot-delivery.test.ts`, `tests/integration/boot-invalid-state.test.ts`

## Observability and recovery

- Operational signal: boot failures record a runtime error line carrying only metadata, never file content.
- Recovery: with no plan present the feature is inert, so reverting this task restores silent session starts.

## Handoff

- Produced result: Boot delivery on session start across all 6 supported harnesses (Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Pi, Oh-My-Pi); post-compaction boot reinjection on Claude Code, Codex CLI, Pi, Oh-My-Pi; Cursor dual identifier support (`session_id` and `conversation_id`); invalid state delivering repair instruction only without state content; completed plans delivering no boot; in-process extensions delivering once via `before_agent_start`.
- Changed files: `src/core/services/brake-engine.ts`, `src/infrastructure/runtime/boot-reader.ts`, `src/infrastructure/runtime/runtime-composition.ts`, `src/infrastructure/harnesses/claude-code/runtime.ts`, `src/infrastructure/harnesses/codex-cli/runtime.ts`, `src/infrastructure/harnesses/cursor/runtime.ts`, `src/infrastructure/harnesses/cursor/schemas.ts`, `src/infrastructure/harnesses/pi/runtime.ts`, `src/infrastructure/harnesses/oh-my-pi/runtime.ts`, `tests/test-lanes.ts`, `tests/helpers/boot-fixture.ts`, `tests/unit/brake-engine-boot.test.ts`, `tests/integration/boot-delivery.test.ts`, `tests/integration/boot-invalid-state.test.ts`.
- Checks: `npm run build`, `npm run lint`, `npm run typecheck`, `npx vitest run tests/integration/boot-delivery.test.ts tests/integration/boot-invalid-state.test.ts tests/unit/brake-engine-boot.test.ts`, `npm run schemas:check`, `npm run assets:check`, `npm run package:smoke`, `npm run coverage` (all 160 suites passed, thresholds met).
- Validated state: Clean working tree for T05; all files strictly <= 97 lines, functions <= 30 lines, parameters <= 3, 0 comments in TypeScript. Node 24 on Windows 11.
- Open items: Gaps `OI-03`, `OI-04`, `OI-05` (no real Pi, Oh-My-Pi, or OpenCode installation available; tested via fixtures matching documented formats).
- Correction round 1 (`codereview_01/CR-01`, T10): The review invalidated the original completion because `NodeBootReader` supplied empty Git divergences. T10 connected `NodeGitInspector` and `compareGitState` after valid state parsing. Built-hook integration now proves dirty and missing commits, outside-history commits with both hashes, clean state, missing-Git omission, and non-repository omission; unit tests prove failed inspection and no inspection for missing, invalid, or completed state. Build, lint, typecheck, dependency check, full tests, final coverage, and `git diff --check` pass. The original transport evidence above remains valid; the runtime Git gap is closed. Windows/Node 24 is the local evidence limit.

### ADR candidates

None - direct TechSpec implementation (DEC-01 to DEC-05, DEC-15). Local design detail: `NodeBootReader` in runtime assets does not import `child_process` to satisfy the runtime bundle import guard (DEC-02 / TC-24).
