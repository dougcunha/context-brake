# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/prd.md`
2. `tasks/prd-07-modo-leve/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Modo leve no runtime

## Outcome

With `lightMode` set, every hook and plugin injects only the telemetry block with the light action. No tool call is denied in any zone, including through the failure policy. Nothing is injected at session start, after `/clear`, or after compaction. No hook reads the plan, the checkpoint, the validation command, the boot state, or Git. `wrap` shows the light action, and `run` refuses the mode with `RUN_PLAN_NOT_RUNNABLE`.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T06
- In scope:
  - `'light'` in `CHECKPOINT_MODES`, and `light-guidance.ts`;
  - the light-first branches in `zone-guidance.ts`;
  - `brake-engine.ts`: the pre-tool short-circuit and the reset branch;
  - `failure-policy.ts`: pre-tool neutrality and the deadline boot branch;
  - `run-preflight.ts`.
- Out of scope: `init`, `doctor`, and any harness adapter or payload change.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, FR-03, FR-05, FR-06, FR-07, FR-13 | `prd.md#functional-requirements` | Mode resolution, no reads, format, actions, no deny, no boot, `wrap` and `run` |
| NFR-02, NFR-04 | `prd.md#non-functional-requirements` | No I/O on hooks, 60-token and 220-character block budget |
| DEC-03, DEC-04, DEC-05, DEC-06, DEC-11 | `techspec.md#technical-decisions` | Resolution, texts, short-circuits, reset branch, `run` message |
| CMP-02, CMP-03, CMP-04, CMP-10 | `techspec.md#components-and-flow` | Guidance, resolution, engine, `run` |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`.
- Existing code:
  - `src/core/services/zone-guidance.ts`, and `delegated-guidance.ts` as the model.
  - `brake-engine.ts`: `handlePreTool` at line 37 and `handleSessionReset` at line 66.
  - `failure-policy.ts`: `resolveFailure` at line 54 and `deadlineBootDecision` at line 63.
  - `zone-actions.ts#ZONE_ACTIONS.YELLOW.withoutPlan.compact` and `reset-notice.ts#SESSION_RESET_SIGNAL`.
  - `src/cli/commands/run-preflight.ts:31`.
- Tests to mirror: `tests/unit/brake-engine-delegated.test.ts`, `tests/integration/runtime-delegated-snapshot.test.ts`, `tests/integration/run-command-preflight.test.ts`.
- Contract: `techspec.md#agent-facing-text`.

## Work

- [x] T02.1 Add `'light'` to `CHECKPOINT_MODES`. Create `src/core/services/light-guidance.ts` with `lightAction(zone, section)` and `lightGuidance(section)`:
  - the DEC-04 texts;
  - `allows` always resolves to `true`;
  - `resumeText: null`;
  - deny and failure messages that reuse the block headers.
- [x] T02.2 In `zone-guidance.ts`, check light mode first in `resolveCheckpointMode`, `resolveGuidance`, `resolveFailureGuidance`, and `unionGuidance`, returning `light` or `lightGuidance` without calling any port.
- [x] T02.3 In `brake-engine.ts`, make two changes:
  - `handlePreTool` returns neutral when `config.lightMode` is set, before `readSummary`;
  - `handleSessionReset` branches on `guidance.mode !== 'plan'`.

  Keep the file at 100 lines or fewer. If it grows past that, move `readSummary` and `ensureSessionLine` out, as the terrain baseline says.
- [x] T02.4 In `failure-policy.ts`:
  - `resolveFailure` returns neutral for `pre_tool` in light mode, before it reads the ledger;
  - `deadlineBootDecision` renders the boot omission only when `mode === 'plan'`.
- [x] T02.5 In `run-preflight.ts`, `requireRunnablePlan` throws `RUN_PLAN_NOT_RUNNABLE` with the DEC-11 message when `config.lightMode` is set, before it reads the plan.
- [x] T02.6 Add unit tests:
  - TC-02 and TC-03 in `tests/unit/light-guidance.test.ts`;
  - TC-04 in `tests/unit/brake-engine-light.test.ts`;
  - TC-05 in `tests/unit/failure-policy-light.test.ts`.
- [x] T02.7 Add integration tests:
  - TC-10 in `tests/integration/runtime-light-mode.test.ts`: the Claude Code hook process, one in-process plugin (OpenCode), and `wrap`;
  - TC-11 in `tests/integration/run-light-mode.test.ts`.

## Acceptance criteria

- **Action texts:** at `RED`, the action is exactly `save your snapshot or checkpoint now, then end reply with [REQUEST_SESSION_RESET]`. Every other zone and trigger case matches DEC-04.
- **Block content:** no light-mode action contains `/`, `task_plan`, `state_checkpoint`, `validation`, `commit`, or `blocked`. The worst-case light block of every zone stays within 60 `o200k_base` tokens and 220 characters, the same budget as `tests/unit/telemetry-block-budget.test.ts`.
- **No port reads:** in light mode, the counting fakes for `PlanPresence`, `readValidationCommand`, and `readBoot` record 0 calls across `pre_tool`, `post_tool`, `pre_invocation`, and `session_reset`.
- **Nothing denied:** `pre_tool` in `CRITICAL` is neutral for `file_read`, `file_write`, `shell`, `skill`, and `other`, with no block-log record. Through the failure policy with an unreadable ledger, it is neutral too.
- **Nothing injected at session start:** `session_reset` appends the reset line and returns neutral, even with a plan present or a delegated `resumeCommand`.
- **`run` refusal:** `run` in light mode exits with the `RUN_PLAN_NOT_RUNNABLE` status and the DEC-11 message, with or without `task_plan.json`.
- **No regression:** the delegated and plan-mode unit and integration suites pass unchanged.

## Verification

- Unit: TC-02, TC-03, TC-04, TC-05.
- Integration: TC-10 and TC-11, with Claude Code payload fixtures from `tests/fixtures/harnesses/claude-code/`.
- End-to-end: not applicable (T06).
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: test counts, and no quality-profile hits over the diff (with `hook_files` and `in_process_files` as listed in the TechSpec).

## Affected files

- Modify: `src/core/contracts/checkpoint-mode.ts`, `src/core/services/zone-guidance.ts`, `src/core/services/brake-engine.ts`, `src/core/services/failure-policy.ts`, `src/cli/commands/run-preflight.ts`
- Create: `src/core/services/light-guidance.ts`, and the tests listed under Work

## Observability and recovery

- Operational signal: light mode writes no block-log records; runtime errors keep going to the runtime error log.
- Recovery: revert the commit. Without a `lightMode` section, behavior is unchanged.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `CHECKPOINT_MODES` includes `light`.
  - `lightGuidance` supplies the DEC-04 texts, allows every call, and sets `resumeText: null`.
  - In `zone-guidance.ts`, `resolveCheckpointMode`, `resolveGuidance`, and `unionGuidance` check light mode first, with no port call.
  - In `brake-engine.ts`, `handlePreTool` returns neutral in light mode before reading the ledger, and `handleSessionReset` branches on `mode !== 'plan'`.
  - In `failure-policy.ts`, `pre_tool` stays neutral in light mode, and the deadline boot omission applies only to `plan`.
  - `requireRunnablePlan` throws `RUN_PLAN_NOT_RUNNABLE` with the DEC-11 text before reading the plan.
- Changed files:
  - Modified: `src/core/contracts/checkpoint-mode.ts`; `src/core/services/zone-guidance.ts` (64 lines), `brake-engine.ts` (97), `failure-policy.ts` (95); `src/cli/commands/run-preflight.ts` (49).
  - New code: `src/core/services/light-guidance.ts`.
  - New tests: `tests/unit/light-guidance.test.ts` (15), `tests/unit/brake-engine-light.test.ts` (9), `tests/unit/failure-policy-light.test.ts` (3), `tests/integration/runtime-light-mode.test.ts` (4), `tests/integration/run-light-mode.test.ts` (2), `tests/integration/wrap-light-mode.test.ts` (1).
- Checks:
  - `npm run typecheck`, `npm run build`, and `npm run lint` pass. The build is needed because the OpenCode test loads `dist/assets/runtime/opencode-plugin.js`.
  - New suites: 34 tests pass.
  - Affected existing suites: 20 files and 158 tests pass. They cover `brake-engine*`, `failure-policy*`, `zone-guidance`, `telemetry-block*`, `delegated*`, `runtime-delegated-snapshot`, `run-command-preflight`, `wrap-command`, and `runtime-in-process`.
  - TC-02 checks the worst-case light block of every zone against 60 `o200k_base` tokens and 220 characters.
- Validated state: working tree at `c3fb6a8` plus the T01 and T02 diffs, on Windows 11 with Node 24.
- Quality profile: QA-01 to QA-09 have no hits in the touched files.
- Open items:
  - The "Claude Code hook process" case in TC-10 runs through `composeRuntime` plus `mapClaudeEvent`, the same boundary as the PRD-06 integration test. The spawned hook process is covered by T06 e2e.

### ADR candidates

None - direct TechSpec implementation or local decision.
