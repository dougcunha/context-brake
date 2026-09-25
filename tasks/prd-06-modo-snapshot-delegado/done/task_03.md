# Stable execution context

Load in this exact order:

1. `tasks/prd-06-modo-snapshot-delegado/prd.md`
2. `tasks/prd-06-modo-snapshot-delegado/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Fiação de runtime e Skill do Claude Code

## Outcome

Hook processes, in-process plugins, and `wrap` resolve the effective mode by checking whether the plan file exists on disk. Claude Code `Skill` tool calls reach the brake as `skill` calls with their name. The research file documents that payload.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T05
- In scope:
  - `NodePlanPresence`;
  - `readGuidance` in `createRuntimePorts` and `composeRuntime`;
  - the `wrap-telemetry.ts` action;
  - the Claude Code `Skill` mapping and fixture;
  - the research file update.
- Out of scope: skill mapping for other harnesses (open item) and the CLI (T04).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Mode flips on the next event |
| FR-06 | `prd.md#functional-requirements` | Skill invocation allowed where identifiable |
| FR-12 | `prd.md#functional-requirements` | `wrap` in both modes |
| NFR-03, NFR-04 | `prd.md#non-functional-requirements` | Single async stat; cross-platform |
| DEC-02, DEC-07 | `techspec.md#technical-decisions` | Presence and `Skill` mapping |
| CMP-06, CMP-07 | `techspec.md#components-and-flow` | Components |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, plus `.agents/rules/harness-adapters.md`.
- Harness reference: the Claude Code section of `docs/research/harness-integrations.md`. Re-check the vendor docs it links for the `Skill` tool input before coding, as `AGENTS.md` requires.
- Existing code:
  - `src/infrastructure/runtime/runtime-composition.ts`;
  - `plan-validation-reader.ts` (read pattern);
  - `runtime-paths.ts#isMissingFileError`;
  - `src/infrastructure/runner/wrap-telemetry.ts`;
  - `src/infrastructure/harnesses/claude-code/runtime.ts`.
- Tests to model: `tests/integration/runtime-host-process.test.ts`, `wrap-command.test.ts`, `tests/unit/claude-runtime-session-key.test.ts`.

## Work

- [x] T03.1 Verify the Claude Code `Skill` PreToolUse and PostToolUse payload in the vendor docs. Add a short subsection to the Claude Code section of `docs/research/harness-integrations.md`, with the link.
- [x] T03.2 Create `src/infrastructure/runtime/plan-presence.ts` (`fs/promises.stat`; `ENOENT` means false; any other error means true, which resolves to plan mode).
- [x] T03.3 Add `readGuidance` to `RuntimePorts` without new module exports, and pass it to `createBrakeEngine` and to the failure policy input.
- [x] T03.4 Make `wrap-telemetry.ts` render the action from the resolved guidance.
- [x] T03.5 Map `tool_name: "Skill"` to `{ category: 'skill', skill: tool_input.skill }` in the Claude Code runtime, and add a payload fixture.
- [x] T03.6 Add integration tests TC-09 and TC-10 in `tests/integration/runtime-delegated-snapshot.test.ts`, and extend `wrap-command.test.ts`.

## Acceptance criteria

- A hook run with the section set and no plan emits the delegated action. After a plan file is created, the next event emits the plan action, with no reinstall.
- In CRITICAL, a Claude Code `Skill` call for a configured skill is allowed; one for another skill is denied.
- `wrap` output carries the delegated action when the section is set and the plan is missing.
- No synchronous fs API in the new or changed runtime files (QA-05).

## Verification

- Unit: a mapping test for the `Skill` fixture.
- Integration: TC-09 and TC-10, with a temp repository, a real hook process, and the documented payload fixture.
- End-to-end: not applicable (T05).
- Platforms: CI matrix. The path normalization of `Write` to an allowed path is tested with `\` separators on Windows.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: integration suite green, and the research section updated with the source link.

## Affected files

- Modify:
  - `src/infrastructure/runtime/runtime-composition.ts`, `src/infrastructure/runner/wrap-telemetry.ts`, `src/infrastructure/harnesses/claude-code/runtime.ts`
  - `docs/research/harness-integrations.md`
  - `tests/integration/wrap-command.test.ts`
- Create: `src/infrastructure/runtime/plan-presence.ts`, `tests/integration/runtime-delegated-snapshot.test.ts`, `tests/fixtures/` entries for the `Skill` payload

## Observability and recovery

- Operational signal: unexpected stat errors are logged to the runtime error log, and the event proceeds in plan mode.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `NodePlanPresence` (`src/infrastructure/runtime/plan-presence.ts`) checks the plan file with an async `stat`: `ENOENT` means absent, any other error means present. The stat function is injectable for tests.
  - `RuntimePorts.planPresence` is passed to the engine and to all three failure hosts (process, in-process, and in-process support).
  - `wrap` renders the action through `resolveGuidance`, and `renderSessionTelemetry` takes an `actionFor` callback.
  - The Claude Code `Skill` tool maps to `{ category: 'skill', skill: tool_input.skill }`.
  - The research file has a new Skills subsection in the Claude Code section.
- Changed files:
  - Modified: `src/infrastructure/runtime/{runtime-composition,process-hook-host,in-process-host}.ts`, `src/infrastructure/harnesses/common/in-process-support.ts`, `src/infrastructure/runner/wrap-telemetry.ts`, `src/infrastructure/harnesses/claude-code/runtime.ts`, `src/core/services/session-zone.ts`, `docs/research/harness-integrations.md`, `tests/integration/wrap-command.test.ts`.
  - Created: `src/infrastructure/runtime/plan-presence.ts`, `tests/fixtures/harnesses/claude-code/pre-tool-use-skill.json`, `tests/integration/runtime-delegated-snapshot.test.ts`, `tests/unit/plan-presence.test.ts`.
- Checks:
  - `npm run build`: pass.
  - `npm test`: 233 files, 1,477 passed and 3 skipped (the skips existed before).
  - `npm run typecheck`: pass.
  - `eslint src tests`: pass.
  - QA-01 to QA-07 sweeps: the only hit is `process-hook-host.ts:29` `process.stdout.write`. It predates this feature and is the hook response writer, which the profile excludes.
  - QA-08: every file is at or under 100 lines.
- Validated state: working tree on top of `3b94a9c` with T01 to T03 applied, on Windows 11.
- Open items:
  - The Claude Code docs confirm the `Skill` tool name and name-based permission matching, but not the `tool_input` field. `tool_input.skill` comes from the tool schema that the current Claude Code exposes to the model. It is recorded in the research file as observed, not documented. A payload without the field fails safe (denied at the ceiling). Capturing a real `PreToolUse` payload for `Skill` stays open as manual verification.
  - TC-09 and TC-10 run in-process through `composeRuntime`, with the real Claude mapping, a real filesystem, and path normalization, rather than in a spawned hook process. The spawned built hook is covered by T05's e2e test.

### ADR candidates

None - direct TechSpec implementation or local decision.
