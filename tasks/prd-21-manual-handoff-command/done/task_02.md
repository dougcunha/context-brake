# Stable execution context

Load in this exact order:

1. `tasks/prd-21-manual-handoff-command/prd.md`
2. `tasks/prd-21-manual-handoff-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Seed after the session id switch

## Outcome

Every restart that the Claude Code mod starts reads the session id before it queues `/clear`, waits after the clear until the id changes (poll every 100 ms, 3000 ms at most), and only then runs `onOpened` and submits the seed. `host.ts` has the documented members `command.register`, `clock.after`, the command types, and the filtered registrar overload. The host fake supports them.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03
- In scope: `host.ts` types (DEC-10); `mod-info.ts` constants `SEED_SWITCH_POLL_MS`, `SEED_SWITCH_LIMIT_MS`; new `mod/session-switch.ts`; `restart-host.ts` `openAfterClear`; host fake split into `tests/fixtures/claude-mod-host-ports.ts` with `command.register` (records specs; can reject), `clock.after` (runs the callback on a resolved promise, returns `{ cancel }`), and a scripted id (default constant `session-1`; a test can set the poll count after which it changes); `tests/integration/claude-mod-seed-switch.test.ts`. Update the existing fakes' `on` functions so they still satisfy the new `HookRegistrar` type (scene driver and bundle test), without new behavior yet.
- Out of scope: the `/handoff` command; any change to `core` restart decisions.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| NFR-04 | `prd.md#non-functional-requirements` | Seed reaches the new session |
| NFR-01 | `prd.md#non-functional-requirements` | Documented members only |
| DEC-07, DEC-10, DEC-13 | `techspec.md#technical-decisions` | Seed wait, host types, fixture split |
| CMP-04..CMP-06, CMP-10 | `techspec.md#components-and-flow` | Host, session switch, restart host, fakes |
| TC-05, TC-06 | `techspec.md#test-approach` | Seed after switch; 3 s cap |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`.
- Existing code: `src/infrastructure/harnesses/claude-code/mod/restart-host.ts` (`openAfterClear`, `submitSeed`), `mod/host.ts`, `mod/mod-info.ts`, `tests/fixtures/claude-mod-host.ts`, `tests/fixtures/claude-mod-scene.ts` (`driver`, `settleClear`), `tests/integration/claude-mod-restart.test.ts`, `tests/integration/claude-mod-bundle.test.ts` (`registeredEvents`).
- Contract or integration: TechSpec "Integrations and interfaces" (seed path, validator rules).
- Harness reference: `docs/research/harness-integrations.md`, Claude Code "Mods (PRD-11)"; `session-info` `afterSwitch` pattern in the TechSpec sources.

## Work

- [x] T02.1 Extend `host.ts` with the documented command and timer members and the registrar overload.
- [x] T02.2 Add the constants and `waitForSessionSwitch($, endedId)` (local waited counter, `$.clock.after`).
- [x] T02.3 Change `openAfterClear` to read the ended id first and wait for the switch after the clear resolves; keep `onRejected` for a rejected clear and route a failed id read to `onRejected`.
- [x] T02.4 Split the host fake ports into `claude-mod-host-ports.ts`; add `command.register`, `clock.after`, and the scripted id; keep every existing test green.
- [x] T02.5 Write TC-05 and TC-06 in `tests/integration/claude-mod-seed-switch.test.ts`.

## Acceptance criteria

- With the id changing after 3 polls: no seed before the change, then exactly one seed and one `onOpened`.
- With the id never changing: one seed after 30 polls.
- A rejected clear still records `ERROR_RESTART_REJECTED` and rolls back the counter.
- The mod bundle still has no Node import or synchronous API (TC-16 unchanged and green).
- Every file stays at 100 lines or less.

## Verification

- Unit: not applicable.
- Integration: TC-05, TC-06; existing `claude-mod-*.test.ts` suites green.
- End-to-end: not applicable.
- Manual: MA-04 at HIL 3 (owner: the user).
- Platforms: Windows development machine.
- Commands: `npx vitest run tests/integration/claude-mod-seed-switch.test.ts tests/integration/claude-mod-restart.test.ts tests/integration/claude-mod-handoff.test.ts tests/integration/claude-mod-guards.test.ts tests/integration/claude-mod-gates.test.ts tests/integration/claude-mod-reading.test.ts tests/integration/claude-mod-bundle.test.ts`; `npm run lint`; `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: passing suites with their test counts.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/mod/host.ts`, `restart-host.ts`, `mod-info.ts`; `tests/fixtures/claude-mod-host.ts`, `tests/fixtures/claude-mod-scene.ts`, `tests/integration/claude-mod-bundle.test.ts`
- Create: `src/infrastructure/harnesses/claude-code/mod/session-switch.ts`, `tests/fixtures/claude-mod-host-ports.ts`, `tests/integration/claude-mod-seed-switch.test.ts`

## Observability and recovery

- Operational signal: unchanged reason codes; a seed sent at the cap is not logged separately.
- Recovery: revert the files.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: every mod restart reads the session id before it queues `/clear`, and after the clear resolves it polls `$.session.id()` with `$.clock.after(100)` until the id changes or 3000 ms pass; only then `onOpened` and the seed run. A failed id read before the clear uses an unknown id (`''`), so the restart still clears and seeds; a failed read while polling counts as "not switched yet". A rejected clear keeps the old path (`ERROR_RESTART_REJECTED`, counter rolled back, no wait). `host.ts` has `command.register`, `clock.after`, `CommandSpec`, `ModTimer`, `HookFilter`, `CommandRunEvent`, `CommandRunResult`, and the filtered `HookRegistrar` overload.
- Changed files: `src/infrastructure/harnesses/claude-code/mod/host.ts`, `restart-host.ts`, `mod-info.ts` (`SEED_SWITCH_POLL_MS`, `SEED_SWITCH_LIMIT_MS`, `UNKNOWN_SESSION_ID`); new `mod/session-switch.ts`; `tests/fixtures/claude-mod-host.ts` (state: `registered`, `ticks`, `switchAtTick`, `registerFailure`, `idFailure`); new `tests/fixtures/claude-mod-host-ports.ts` (command, prompt, ui, clock, session ports); `tests/fixtures/claude-mod-scene.ts` (driver keyed by event and command filter); new `tests/integration/claude-mod-seed-switch.test.ts` (4 tests).
- Checks: `npx vitest run` on `claude-mod-seed-switch`, `claude-mod-restart`, `claude-mod-handoff`, `claude-mod-guards`, `claude-mod-gates`, `claude-mod-reading`, `claude-mod-bundle`, `mod-reading-git-status`: 8 files, 37 tests passed (seed-switch suite rerun after the lint fix: 4 passed). `npm run typecheck`: pass. `npx eslint` on the touched files: no issues. Quality profile: no blocking hit; mod folder has no Node import, sync API, `process.env`, or `process.stdout`; largest touched file `claude-mod-scene.ts` 91 lines.
- Validated state: working tree on base `c17fd0a` plus T01, Windows 11, Node 24.20.0.
- Open items: quality reservations (QA-08 class `throw new Error(` in test fakes, the baseline already recorded the pattern): new hits `tests/fixtures/claude-mod-host-ports.ts:28` (register refusal) and `:48` (id failure); moved hit `:30` (seed rejected). The fake `clock.after` runs its callback on a resolved promise, so the 3 s cap costs 30 microtasks in tests. MA-04 (live timing) stays for the user.

### ADR candidates

None - direct TechSpec implementation or local decision.
