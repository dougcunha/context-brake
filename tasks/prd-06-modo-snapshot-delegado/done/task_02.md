# Stable execution context

Load in this exact order:

1. `tasks/prd-06-modo-snapshot-delegado/prd.md`
2. `tasks/prd-06-modo-snapshot-delegado/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Orientação por zona no núcleo

## Outcome

In delegated mode, the brake engine and the failure policy emit the delegated action, allowlist, deny message, and resume text. In plan mode, the output stays byte-identical. The guidance is read only when the engine is about to emit.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T03, T04
- In scope:
  - `zone-guidance.ts`;
  - `telemetry-block.ts` taking the action as input;
  - `block-message.ts` and `brake-allowlist.ts` taking the allowlist and command from guidance;
  - `brake-engine.ts` with the `readGuidance` option and delegated `session_reset`;
  - `failure-policy.ts` union behavior;
  - `session-zone.ts` action passthrough;
  - `ToolCategory` gaining `'skill'` and `ToolCall.skill?` in `src/core/contracts/runtime.ts`.
- Out of scope: the filesystem presence check and composition (T03), the harness mapping (T03), and the CLI (T04).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-03, FR-04, FR-05 | `prd.md#functional-requirements` | Mode and action text |
| FR-06, FR-07 | `prd.md#functional-requirements` | Delegated allowlist and deny message |
| FR-08 | `prd.md#functional-requirements` | Resume on session reset |
| NFR-03, NFR-05 | `prd.md#non-functional-requirements` | Lazy read; block length |
| DEC-02, DEC-03, DEC-05, DEC-06, DEC-11 | `techspec.md#technical-decisions` | Guidance design |
| CMP-03, CMP-04, CMP-05 | `techspec.md#components-and-flow` | Components |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`.
- Existing code:
  - `src/core/services/brake-engine.ts` (handlers);
  - `zone-actions.ts` (`ZONE_ACTIONS`);
  - `block-message.ts`;
  - `brake-allowlist.ts`;
  - `failure-policy.ts#resolveFailure`;
  - `shell-command-matcher.ts`.
- Tests to extend: `tests/unit/brake-engine-pre-tool.test.ts`, `brake-engine-boot.test.ts`, `failure-policy.test.ts`. Keep their expectations unchanged.
- Contract: `techspec.md#contracts-and-data` ("Agent-facing text").

## Work

- [x] T02.1 Add `'skill'` to `ToolCategory` and `readonly skill?: string` to `ToolCall`. Keep the existing adapters compiling without changes.
- [x] T02.2 Create `zone-guidance.ts`:
  - `PlanPresence` port type;
  - `resolveCheckpointMode`, which calls no port when the section is absent;
  - `planGuidance`, which wraps the current constants;
  - `delegatedGuidance`, which covers the trigger zone, derived skill names, pattern allowlist, deny text, and resume text;
  - `unionGuidance` for the failure policy.
- [x] T02.3 Make `renderTelemetryBlock`, `renderBlockMessage`, `renderFailureBlockMessage`, and `isToolCallAllowed` take guidance inputs. Plan-mode call sites pass the plan guidance, which gives identical strings.
- [x] T02.4 Wire `readGuidance` into `BrakeEngineOptions`. Call it only after deciding to emit: an injected block, a non-allowed CRITICAL call, or a session reset past the capability gates. Keep `brake-engine.ts` at or under 100 lines by moving helpers into `zone-guidance.ts`.
- [x] T02.5 Failure policy: when the section is set, read guidance tolerantly and fall back to `unionGuidance` on error.
- [x] T02.6 Add unit tests TC-03, TC-04, TC-05, TC-07, and TC-08. The existing suites must pass unchanged (TC-06).

## Acceptance criteria

- With the section set and no plan:
  - RED and CRITICAL blocks contain `run "<command>", then end reply with [REQUEST_SESSION_RESET]` and none of `task_plan`, `state_checkpoint`, `validation`, `commit`;
  - with trigger `YELLOW`, YELLOW blocks carry the command as well;
  - a block with a 200-char command is under 400 chars.
- In CRITICAL:
  - a write to a matching path and a `skill` call with an allowed name return neutral;
  - an unmatched write and `npm test` are denied with the delegated message.
- `session_reset` returns the resume block when `resumeCommand` is set and neutral otherwise. With a plan present, it returns today's boot.
- `readGuidance` is never called on neutral paths or without the section, and at most once per event otherwise.

## Verification

- Unit:
  - `tests/unit/zone-guidance.test.ts` (TC-03);
  - `tests/unit/brake-engine-delegated.test.ts` (TC-04, TC-05, TC-07);
  - `tests/unit/failure-policy.test.ts` (TC-08).
- Integration: not applicable, since T03 wires the ports.
- End-to-end: not applicable.
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: new and existing suites green, with no change to plan-mode expectations.

## Affected files

- Modify:
  - `src/core/contracts/runtime.ts`
  - `src/core/services/telemetry-block.ts`, `block-message.ts`, `brake-allowlist.ts`, `brake-engine.ts`, `failure-policy.ts`, `session-zone.ts`
  - `tests/unit/failure-policy.test.ts`
- Create: `src/core/services/zone-guidance.ts`, `tests/unit/zone-guidance.test.ts`, `tests/unit/brake-engine-delegated.test.ts`

## Observability and recovery

- Operational signal: block log records are unchanged, with `reason=critical_ceiling`.
- Recovery: revert the commit. Plan mode is the untouched default.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `ZoneGuidance` and the `PlanPresence` port are in `src/core/contracts/checkpoint-mode.ts`.
  - `resolveCheckpointMode`, `resolveGuidance`, `resolveFailureGuidance`, and `planGuidance` are in `src/core/services/zone-guidance.ts`, with the union fallback kept private.
  - `delegatedGuidance`, the derived skill names, the pattern and skill allowlist, and the deny, failure, and resume texts are in `src/core/services/delegated-guidance.ts`.
  - `renderTelemetryBlock` accepts an optional `action`.
  - `block-message.ts` exposes `renderBlockHeader` and `renderFailureBlockHeader`; the plan strings are unchanged.
  - `ToolCategory` gains `skill`, and `ToolCall` gains an optional `skill`.
  - `brake-engine.ts` resolves the guidance only on emitting paths and returns the resume text on `session_reset` in delegated mode.
  - `failure-policy.ts` uses `resolveFailureGuidance`.
  - `renderSessionTelemetry` accepts an optional action.
- Changed files:
  - Modified: `src/core/contracts/runtime.ts`, `src/core/services/{block-message,telemetry-block,brake-engine,failure-policy,session-zone}.ts`.
  - Created: `src/core/contracts/checkpoint-mode.ts`, `src/core/services/{zone-guidance,delegated-guidance}.ts`, `tests/helpers/delegated-fixtures.ts`, `tests/unit/{zone-guidance,brake-engine-delegated,brake-engine-delegated-lifecycle,failure-policy-delegated}.test.ts`.
- Checks:
  - `npx vitest run tests/unit`: 132 files and 972 tests passed. The plan-mode suites pass without changes (TC-06).
  - `npm run typecheck`: pass.
  - `eslint src tests/unit tests/helpers`: pass.
  - QA-01 to QA-07 sweeps over the touched `src` files: empty.
  - QA-08: every file is at or under 100 lines (`brake-engine.ts` has 93).
- Validated state: working tree on top of `3b94a9c` with T01 and T02 applied, on Windows 11.
- Open items:
  - The engine and failure-policy option is `planPresence: PlanPresence`, the port DEC-02 names, instead of the `readGuidance` callback DEC-11 describes. The laziness guarantee is unchanged and proven by TC-07.
  - T03 therefore wires `planPresence`, not `readGuidance`, into `createRuntimePorts`, `composeRuntime`, and both failure hosts.
  - TC-04, TC-05, and TC-07 are split across two files to respect the 100-line limit, and TC-08 has its own file for the same reason.

### ADR candidates

None - direct TechSpec implementation or local decision.
