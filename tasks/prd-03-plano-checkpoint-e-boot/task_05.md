# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Boot delivery across harnesses

## Outcome

At session start, every harness declaring `session_boot: supported` receives the boot summary through its already-registered event, and the two harnesses that do not support it receive nothing and keep relying on the protocol file.

## Dependencies and boundaries

- Depends on: T04
- Unblocks: T09
- In scope: returning the boot from `handleSessionReset`, widening three adapters' context gates, and returning the decision from the two in-process session-start handlers.
- Out of scope: installer or planner changes, which `DEC-03` rules out because every session-start event is already registered; and OpenCode and Antigravity delivery, excluded by `DEC-05`.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF9 | `prd.md#boot-no-início-da-sessão` | Deliver the boot in a new session, after clearing context, and after compaction |
| RF11 | `prd.md#boot-no-início-da-sessão` | Invalid state delivers only the instruction |
| CMP-11, CMP-17, CMP-18 | `techspec.md#components-and-flow` | Engine and adapter wiring |
| DEC-01, DEC-02, DEC-03, DEC-04, DEC-05 | `techspec.md#technical-decisions` | Delivery seam, gate widening, no installer change, in-process channel, exclusions |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/harness-adapters.md` (emit only documented fields, add context without replacing results, never claim an unconfirmed capability, hooks never throw), `node.md` (no synchronous I/O inside harness processes; stdout is the hook response channel).
- Existing code: `src/core/services/brake-engine.ts:72-76` — `handleSessionReset` returns `NEUTRAL` today; keep the ledger append and prune side effects.
- Existing code: the gates to widen — `claude-code/runtime.ts:55`, `codex-cli/runtime.ts:64`, `cursor/runtime.ts:45`. `github-copilot-cli/runtime.ts:61` has no event gate and needs no change.
- Existing code: `pi/runtime.ts:58-61` and `oh-my-pi/runtime.ts:58-61` — session-start handlers that currently discard the decision.
- Existing code: `src/infrastructure/harnesses/*/capabilities.ts:7` — the `session_boot` states that gate delivery.
- Harness reference: `docs/research/harness-integrations.md` sections Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Pi, Oh-My-Pi, and OpenCode.

## Work

- [ ] T05.1 Make `handleSessionReset` build the boot through the T04 policy and return a `context` decision, preserving the existing ledger append and stale-session prune.
- [ ] T05.2 Gate delivery on the descriptor's `session_boot` capability so unsupported harnesses keep receiving `NEUTRAL`.
- [ ] T05.3 Widen the context event gate in the Claude Code, Codex CLI, and Cursor adapters to the session-start event, emitting the documented field for that event.
- [ ] T05.4 Return the boot from the Pi and Oh-My-Pi session-start handlers through the documented `before_agent_start` message channel.
- [ ] T05.5 Integration tests per harness using payload fixtures, including the invalid-state and no-boot cases.

## Acceptance criteria

- Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Pi, and Oh-My-Pi each receive the boot at session start, in the documented field for their event.
- OpenCode and Antigravity CLI receive no boot, and no capability is reported that their documentation does not confirm.
- Compaction and context clearing deliver the boot, matching the reset reasons the adapters already map.
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

- Modify: `src/core/services/brake-engine.ts`, `src/infrastructure/harnesses/claude-code/runtime.ts`, `src/infrastructure/harnesses/codex-cli/runtime.ts`, `src/infrastructure/harnesses/cursor/runtime.ts`, `src/infrastructure/harnesses/pi/runtime.ts`, `src/infrastructure/harnesses/oh-my-pi/runtime.ts`, `tests/test-lanes.ts`
- Create: `tests/integration/boot-delivery.test.ts`, `tests/integration/boot-invalid-state.test.ts`

## Observability and recovery

- Operational signal: boot failures record a runtime error line carrying only metadata, never file content.
- Recovery: with no plan present the feature is inert, so reverting this task restores silent session starts.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
