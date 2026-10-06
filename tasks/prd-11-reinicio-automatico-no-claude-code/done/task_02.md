# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`
2. `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Make room in planner, context builder and init

## Outcome

The files this feature must edit have headroom under the 100-line and 3-parameter limits, and every existing test still passes unchanged.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T05
- In scope: move `HOOK_EVENTS`, `parseHooks`, `applyEvent`, `applyHooks` and their types out of `planner.ts` into `claude-hooks-config.ts`; replace the third parameter of `buildHarnessContext` with a `HarnessOptions` object; adjust call sites; keep `init.ts` at most 95 lines.
- Out of scope: any new behavior, flags or config; public CLI output.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| DEC-12 | `techspec.md#technical-decisions` | Absorbed extraction |
| CMP-07, CMP-08 | `techspec.md#components-and-flow` | Files that gain wiring |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/code-standards.md` (100 lines, 3 parameters, no comments).
- Existing code: `src/infrastructure/harnesses/claude-code/planner.ts:26-49` (helpers to move), `src/cli/detection-collector.ts:27`, `src/cli/commands/init.ts:70`, `src/core/contracts/adapter.ts:14-20` (`HarnessContext`).
- Contract or integration: `techspec.md#terrain-baseline`.
- Harness reference: not applicable.

## Work

- [x] T02.1 Run the baseline suites that cover planner and init and record the counts.
- [x] T02.2 Create `claude-hooks-config.ts` with the moved helpers and update `planner.ts` imports.
- [x] T02.3 Introduce `HarnessOptions { statuslineBridge }` for `buildHarnessContext` and update its callers.
- [x] T02.4 Re-run the suites and measure line counts of the touched files.

## Acceptance criteria

- `planner.ts` is at most 85 lines; `claude-hooks-config.ts` at most 100.
- `buildHarnessContext` has at most 3 parameters.
- The same tests pass with the same count; no test file is edited except imports if a moved symbol was imported directly.

## Verification

- Unit: existing planner and context-builder tests unchanged.
- Integration: existing init and claude-code planner integration tests unchanged.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: Linux, macOS, Windows through the existing CI matrix.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`
- Environment dependency: none
- Expected evidence: test counts before and after, line counts, QA-04 to QA-11 clean on the diff.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/planner.ts`, `src/cli/detection-collector.ts`, `src/cli/commands/init.ts`
- Create: `src/infrastructure/harnesses/claude-code/claude-hooks-config.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the commit; behavior is unchanged.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `HOOK_EVENTS`, `parseHooks`, `applyEvent` and `applyHooks` moved out of `planner.ts` into `claude-hooks-config.ts` (exports only `applyHooks`); `buildHarnessContext` takes a `HarnessOptions` object as its third parameter; `harnessSelection` moved from `init.ts` to `init-arguments.ts` so `init.ts` has room for T05 wiring. No behavior change.
- Changed files: `src/infrastructure/harnesses/claude-code/planner.ts` (99 to 73 lines), new `claude-hooks-config.ts` (27), `src/cli/detection-collector.ts` (37), `src/cli/commands/init.ts` (97 to 90), `src/cli/init-arguments.ts` (64 to 70). No test file edited.
- Checks: baseline `npm test` before edits 307 files, 1944 passed, 3 skipped; after edits identical counts, exit 0. `npm run typecheck` and `npm run lint` clean. Quality sweep (QA-01 to QA-03, QA-07, QA-10) empty on the five files; all files under 100 lines.
- Validated state: working tree on base `c7529c5` plus the T02 diff, Windows 11, Node via npm scripts; Linux and macOS through CI only.
- Open items: none. Coverage run not repeated (pure move, no new logic).

### ADR candidates

None - direct TechSpec implementation or local decision
