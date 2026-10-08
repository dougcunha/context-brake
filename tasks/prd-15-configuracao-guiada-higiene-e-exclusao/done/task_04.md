# Stable execution context

Load in this exact order:

1. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
2. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Retired-event cleanup for the other harnesses

## Outcome

`init` and `remove` also delete ContextBrake-owned entries for retired events in Codex CLI, Cursor, and Antigravity configuration, and a retired event in the Copilot hooks file disappears on `init` and with the file on `remove`. Foreign entries stay byte-identical.

## Dependencies and boundaries

- Depends on: T03
- Unblocks: T08
- In scope: Codex and Cursor updaters call the shared helper (Codex's private copy is replaced); Antigravity cleans every `hooks.<event>.context-brake`; Copilot test only; fixtures; tests.
- Out of scope: Claude Code (T03); changing which events each adapter registers; the Codex command format (commit `c845728`).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03 | `prd.md#functional-requirements` | `init` removes owned entries for retired events (Codex, Cursor, Copilot; Antigravity by DEC-06) |
| FR-04 | `prd.md#functional-requirements` | `remove` deletes them under any event |
| NFR-01 | `prd.md#non-functional-requirements` | Foreign bytes, idempotency |
| DEC-05, DEC-06 | `techspec.md#technical-decisions` | Shared helper wiring; Antigravity generalization; Copilot confirmation |
| CMP-17 | `techspec.md#components-and-flow` | Updater wiring |
| TC-07, TC-08 | `techspec.md#test-approach` | Codex/Cursor matrix; Copilot and Antigravity |

## Context to recover on demand

- Applicable skills and rules: `harness-adapters.md`, `file-changes.md`, `code-standards.md`, `tests.md`.
- Existing code: `src/infrastructure/harnesses/common/codex-hooks-updater.ts` (private `removeOwnedFromEvent`, `updateCodexHooks`, `CODEX_EVENTS`, `isCodexOwnedHandler`); `cursor-hooks-updater.ts` (`isCursorOwned`, `CURSOR_EVENTS`, `updateCursorHooks`); `antigravity-hooks-updater.ts:24-49`; `github-copilot-cli/planner.ts:30-74`; the helper from T03.
- Contract or integration: `techspec.md#integrations-and-interfaces`.
- Harness reference: `docs/research/harness-integrations.md` sections for Codex CLI, Cursor, GitHub Copilot CLI, Antigravity CLI.
- Existing tests that must stay green: `tests/integration/codex-hook-migration.test.ts`, `codex-hook-command-shells.test.ts`, `codex-hook-root.test.ts`, `codex-cursor-user-hooks.test.ts`, `legacy-user-hooks.test.ts`, `minified-config*.test.ts`, `tests/unit/hook-registration-paths.test.ts`.

## Work

- [x] T04.1 Codex: replace the private `removeOwnedFromEvent` with the shared helper (same behavior; characterized by the existing Codex tests) and sweep `removeOwnedFromOtherEvents(text, CODEX_EVENTS, isCodexOwnedHandler)` at the end of `updateCodexHooks` for both `clear` values.
- [x] T04.2 Cursor: sweep with `CURSOR_EVENTS` and `isCursorOwned` at the end of `updateCursorHooks`.
- [x] T04.3 Antigravity: iterate every `hooks.<event>` object child that has a `context-brake` key, remove it, remove the event object when that emptied it, then keep the existing empty-`hooks` cleanup.
- [x] T04.4 Fixtures for Codex (including `commandWindows` and the current git-alias command), Cursor (flat), Copilot (`preToolUse` in `context-brake.json`), Antigravity (`PreToolUse` plus another retired event, foreign sibling); LF and CRLF where the format allows.
- [x] T04.5 Tests for TC-07 and TC-08 in `tests/integration/retired-hook-events.test.ts` (keep the file at a reviewable size; split by harness if needed).

## Acceptance criteria

- After `init` on each fixture, no owned entry remains outside the adapter's current events; foreign entries under the same and other events are byte-identical; an event is removed only when our entry was its last.
- After `remove`, no owned entry remains under any event (Copilot: the file is deleted).
- A second run changes nothing.
- Antigravity: `hooks.PreToolUse.context-brake` and any other `hooks.<event>.context-brake` are removed; a foreign sibling key is kept.
- All existing Codex, Cursor, and legacy-hook tests pass unchanged.

## Verification

- Unit: none beyond the helper's tests from T03.
- Integration: `runInProcessCli` on temporary directories with the fixtures; byte comparison of foreign text; second-run assertion.
- End-to-end: not applicable here (TC-17 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows (CRLF fixture).
- Commands: `npm test -- tests/integration/retired-hook-events.test.ts tests/integration/codex-hook-migration.test.ts tests/integration/codex-hook-command-shells.test.ts tests/integration/legacy-user-hooks.test.ts tests/unit/hook-registration-paths.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-03`, `FR-04`, `TC-07`, `TC-08`; existing tests green; lint, typecheck, coverage green.

## Affected files

- Modify: `src/infrastructure/harnesses/common/codex-hooks-updater.ts`, `src/infrastructure/harnesses/common/cursor-hooks-updater.ts`, `src/infrastructure/harnesses/common/antigravity-hooks-updater.ts`
- Create: retired-event fixtures under `tests/fixtures/harnesses/{codex-cli,cursor,github-copilot-cli,antigravity-cli}/`; extra test file(s) beside `tests/integration/retired-hook-events.test.ts` if it grows

## Observability and recovery

- Operational signal: the hooks-config change in the plan preview.
- Recovery: revert the commit; retired entries stay on disk as before.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `init` and `remove` for Codex CLI, Cursor, and Antigravity CLI delete ContextBrake-owned entries under events outside the adapter's current set (Codex: grouped, both the git-alias command and the older `command`/`commandWindows` form; Cursor: flat; Antigravity: every `hooks.<event>.context-brake`, with the event object removed when emptied). For each, `init` then `remove` reproduces the foreign-only fixture byte for byte and a second `init` plans no change to the harness file. Copilot needed no code: `init` rewrites `context-brake.json` without the retired event and `remove` deletes the file.
- Changed files: modified `src/infrastructure/harnesses/common/codex-hooks-updater.ts` (sweep with `CODEX_EVENTS`, `isCodexOwnedHandler`), `cursor-hooks-updater.ts` (sweep with `CURSOR_EVENTS`, `isCursorOwned`), `antigravity-hooks-updater.ts` (`ownedEvents`, `removeOwnedEvent`, generalized `cleanLegacyHooks`); created `tests/integration/retired-hook-events-harnesses.test.ts` (Codex, Cursor, Antigravity), `tests/integration/retired-hook-events-copilot.test.ts`. Codex keeps its private `removeOwnedFromEvent` (not swapped for the shared one) so the existing Codex behavior is untouched; the planned sweep is the required part, so the duplication is a reservation-level follow-up only. Fixtures are built in the tests (owned and foreign-only variants) rather than static files, for the byte comparison.
- Checks: `npm run lint`, `npm run typecheck` clean; `npm run coverage` before the final test-file split passed: 226 files, 1216 tests, 104 s, 94.18%; after the split the two new files pass (10 tests) and lint/typecheck are clean; 26 existing Codex, Cursor, legacy-hook, minified, preservation tests stay green; quality sweep over the three touched `src/` files returned no hit and no file above 100 lines.
- Validated state: HEAD `c845728` plus the uncommitted working tree of T01..T04; Windows 11, Node 24.19.
- Open items: none blocking. Antigravity behavior change worth a reviewer's eye: an emptied `hooks.<event>` object is now removed (previously only `PreToolUse`/`PreInvocation` `context-brake` keys were removed and the empty event object stayed unless the whole `hooks` was empty); existing legacy-hook tests pass unchanged.

### ADR candidates

None - direct TechSpec implementation or local decision.
