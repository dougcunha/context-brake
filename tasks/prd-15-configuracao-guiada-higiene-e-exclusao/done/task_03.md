# Stable execution context

Load in this exact order:

1. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
2. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Retired-event cleanup for Claude Code

## Outcome

`init` and `remove` delete ContextBrake-owned hook registrations under any `.claude/settings.json` event outside `PostToolUse`, `SessionStart`, and `Stop`, leaving foreign entries byte-identical. The shared helper that does it is ready for the other harnesses.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T04
- In scope: `common/hook-event-cleanup.ts` (grouped and flat shapes); the event-independent Claude ownership predicate; the sweep at the end of `applyHooks`; Claude retired-event fixtures (LF and CRLF); the symbolic-link case.
- Out of scope: Codex, Cursor, Antigravity, Copilot (T04); the whole-array rewrite of current Claude events (known risk, techspec); the statusline bridge and auto-restart mods.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03 | `prd.md#functional-requirements` | `init` removes owned entries for retired events (Claude Code) |
| FR-04 | `prd.md#functional-requirements` | `remove` deletes owned entries under any event (Claude Code) |
| NFR-01, NFR-02 | `prd.md#non-functional-requirements` | Foreign bytes, idempotency; symlinked `.claude` |
| DEC-05 | `techspec.md#technical-decisions` | Shared helper, event-independent predicate, event removed only when emptied by us |
| CMP-16, CMP-17 | `techspec.md#components-and-flow` | Helper and Claude wiring |
| TC-06, TC-09 | `techspec.md#test-approach` | Claude matrix; symbolic link |

## Context to recover on demand

- Applicable skills and rules: `harness-adapters.md`, `file-changes.md`, `code-standards.md`, `tests.md`.
- Existing code: `src/infrastructure/harnesses/claude-code/claude-hooks-config.ts` (`HOOK_EVENTS`, `applyHooks`); `claude-merger.ts` (`isTargetHook`, `hookInvocation`); `src/infrastructure/harnesses/common/codex-hooks-updater.ts:37-56` (the logic to generalize; leave Codex itself for T04); `src/infrastructure/storage/json-document-editor.ts` (`removeJsonArrayItem`, `removeJsonProperty`); `claude-code/planner.ts:61-76` (`planClaudeRemove`).
- Contract or integration: `techspec.md#integrations-and-interfaces`, `techspec.md#errors-security-and-recovery`.
- Harness reference: `docs/research/harness-integrations.md`, Claude Code hooks section.
- Tests to mirror: `tests/integration/user-hook-preservation.test.ts`, `symlinked-harness-config.test.ts`, `minified-config.test.ts`; helper `tests/helpers/link-capability.ts`.

## Work

- [x] T03.1 Add `hook-event-cleanup.ts` with `removeOwnedFromEvent(text, event, isOwned)` (grouped `{matcher, hooks:[…]}` and flat `{command}` items; purely-owned groups first, then owned handlers inside mixed groups; the event key is removed only when it ends empty because of the removal) and `removeOwnedFromOtherEvents(text, currentEvents, isOwned)` (acts only on `hooks.*` keys outside `currentEvents` that hold at least one owned handler).
- [x] T03.2 Export `isClaudeOwnedHandler` from `claude-merger.ts` (invocation contains `CLAUDE_HOOK_FILE`; does not match `context-brake-statusline.mjs`); sweep at the end of `applyHooks` for both merge and remove, with the three current event names derived from `HOOK_EVENTS`.
- [x] T03.3 Add Claude fixtures: owned `PreToolUse` beside a foreign handler in the same group, in a separate group, plus a foreign event; LF and CRLF variants.
- [x] T03.4 Tests: helper unit tests and `tests/integration/retired-hook-events.test.ts` (Claude part of TC-06; TC-09 with `.claude` linked to `.agents`).

## Acceptance criteria

- After `init`, no owned entry remains outside the three current events; foreign groups, handlers, key order, indentation, and line endings are byte-identical; an event with a remaining foreign handler keeps its key; an event whose last entry was ours is removed; a user-owned empty array is untouched.
- After `remove`, no owned entry remains under any event.
- A second `init` and a second `remove` change nothing.
- `context-brake-statusline.mjs` entries are not matched by the new predicate.
- With `.claude` a symbolic link to `.agents`, the edit lands on the target and the link survives; the test skips with a reason where links cannot be created.

## Verification

- Unit: helper on grouped and flat inputs (mixed group, last entry, empty array, no-op).
- Integration: `runInProcessCli` `init`/`remove` on the Claude fixtures in a temporary directory; byte comparison of foreign text.
- End-to-end: not applicable here (TC-17 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows (CRLF fixture; link capability check).
- Commands: `npm test -- tests/integration/retired-hook-events.test.ts tests/integration/user-hook-preservation.test.ts tests/integration/symlinked-harness-config.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-03`, `FR-04`, `TC-06`, `TC-09`; existing Claude hook tests still green; lint, typecheck, coverage green.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/claude-merger.ts`, `src/infrastructure/harnesses/claude-code/claude-hooks-config.ts`
- Create: `src/infrastructure/harnesses/common/hook-event-cleanup.ts`, `tests/integration/retired-hook-events.test.ts`, Claude retired-event fixtures under `tests/fixtures/harnesses/claude-code/`

## Observability and recovery

- Operational signal: the hooks-config change appears in the plan preview (`Register Claude Code hooks` / `Remove Claude Code hooks`).
- Recovery: revert the commit; the retired entries stay on disk as before.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `init` and `remove` for Claude Code delete ContextBrake-owned handlers under any `hooks.*` event outside `PostToolUse`, `SessionStart`, `Stop`, surgically (purely-owned groups removed, owned handlers removed from mixed groups, the event key removed only when it ends empty because of the removal, user-owned empty arrays untouched). Byte-for-byte: `init` followed by `remove` reproduces the foreign-only fixture exactly, with LF and CRLF. A second `init` plans no change to `settings.json`. With `.claude` linked to `.agents` the edit lands on the target and the link survives. The shared helper is ready for T04.
- Changed files: created `src/infrastructure/harnesses/common/hook-event-cleanup.ts` (`removeOwnedFromEvent`, `removeOwnedFromOtherEvents`, grouped and flat shapes), `tests/integration/retired-hook-events.test.ts`, `tests/unit/hook-event-cleanup.test.ts`; modified `src/infrastructure/harnesses/claude-code/claude-merger.ts` (`isClaudeOwnedHandler`), `claude-hooks-config.ts` (sweep at the end of `applyHooks`). The Claude fixture is built in the test (owned/foreign, LF/CRLF) instead of a static file, which gives the byte-identity comparison.
- Checks: `npm run lint`, `npm run typecheck` clean; 19 tests pass across `retired-hook-events`, `hook-event-cleanup`, `user-hook-preservation`, `symlinked-harness-config`; a full `npm run coverage` before the test-file restructure (split of two `describe` blocks for the lint function-length rule, same assertions) passed: 225 files, 1206 tests, 100 s, 94.17%; the quality sweep over the three touched `src/` files returned no hit and no file above 100 lines. T04 runs the full suite again.
- Validated state: HEAD `c845728` plus the uncommitted working tree of T01..T03; Windows 11, Node 24.19; the symlink test ran (not skipped).
- Open items: (1) Verified, as planned, that the Claude restart/mod code does not write `hooks.*` events to `.claude/settings.json` (the mod keeps its own `hooks.json`), so the current-events set is exactly `HOOK_EVENTS`. (2) For T04: Codex keeps its private `removeOwnedFromEvent` to preserve its exact behavior for an existing empty event array (the shared helper has the same semantics but T04 should only swap it if every existing Codex test stays green); the sweep is the required part. (3) Pre-existing risk unchanged: the three current Claude events are still rewritten as whole arrays by `applyHooks`.

### ADR candidates

None - direct TechSpec implementation or local decision.
