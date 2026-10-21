# Stable execution context

Load in this exact order:

1. `tasks/prd-21-manual-handoff-command/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T05 — A failed seed wait still sends the seed

## Outcome

When the wait for the session id switch fails (`$.clock.after` absent or throwing), the mod still runs `onOpened` and sends the seed at once, with no unhandled rejection, for every restart (automatic and manual). When the session id cannot be read before `/clear`, the mod cannot confirm a switch and waits the full 3 s cap before the seed, also when a later read succeeds.

## Dependencies and boundaries

- Depends on: T02, T03 (done)
- Unblocks: re-review `codereview_02`
- In scope: `mod/session-switch.ts` (`waitForSessionSwitch` catches its own failure and reports whether a switch was confirmed; an unknown ended id never counts as switched); `mod/restart-host.ts` (unknown ended id instead of `''`); `mod/mod-info.ts` (remove `UNKNOWN_SESSION_ID` if unused); host fake `clockFailure` flag; tests in `tests/integration/claude-mod-seed-switch.test.ts`.
- Out of scope: new reason codes or notices (FR-12); any change to `core`; the live timing (MA-04).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | A rejected seed wait is dropped: no seed, no `onOpened`, no record |
| codereview_01 optional improvement | `codereview.md#findings` | An empty unknown id makes a later successful read count as a switch at the first poll |
| DEC-07, NFR-04, NFR-07 | `techspec.md#technical-decisions` | Seed after the id switch, 3 s cap; 2.1.287+ |

## Requirements

- A throw of `$.clock.after` (or any failure inside the wait) never leaves the seed chain: the seed and `onOpened` run once, at once; no reason code is added (the restart itself happened: `RESTARTED` is already logged).
- A failed id read before `/clear` gives an unknown ended id; the wait then ends only at the cap.
- The seed path keeps every existing behavior: switch after N polls, cap at 30 polls, rejected clear → `ERROR_RESTART_REJECTED` with no wait.

## Context to recover on demand

- TechSpec: "Integrations and interfaces" (seed path), DEC-07.
- Rules and skills: `ts-tests`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `harness-adapters.md` (failure policy).
- Code: `src/infrastructure/harnesses/claude-code/mod/session-switch.ts`, `restart-host.ts` (`clearAndSeed`, `seedAfterSwitch`), `tests/fixtures/claude-mod-host-ports.ts` (`clockPort`), `tests/fixtures/claude-mod-host.ts` (`HostState`).

## Work

- [x] T05.1 Make `waitForSessionSwitch` return whether a switch was confirmed and catch its own failure (failure → `false`); an `undefined` ended id never counts as switched.
- [x] T05.2 Read the ended id as `string | undefined` in `clearAndSeed`; remove `UNKNOWN_SESSION_ID`.
- [x] T05.3 Add `clockFailure` to the host fake (`clock.after` throws).
- [x] T05.4 Add tests: throwing `clock.after` → one seed at once, `onOpened` ran (guard `toolCallsSinceSeed` 0), zero ticks; first id read fails and later reads succeed → 30 ticks before the seed.

## Acceptance criteria

- The probe scenario of CR-01 (throwing `clock.after`) sends exactly one seed and marks the session seeded; no unhandled rejection.
- An unknown ended id waits the full cap.
- All `claude-mod-*` suites stay green; lint and typecheck pass.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/claude-mod-seed-switch.test.ts` new cases; all `tests/integration/claude-mod-*` suites.
- End-to-end: not applicable.
- Manual: MA-04 stays for the user.
- Platforms: Windows development machine.
- Environment dependency: none.
- Commands: `npx vitest run tests/integration/claude-mod tests/integration/mod-reading-git-status.test.ts`; `npm run lint`; `npm run typecheck`; `npm run coverage` for the integrated state.
- Expected evidence: passing suites with counts.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/mod/session-switch.ts`, `restart-host.ts`, `mod-info.ts`; `tests/fixtures/claude-mod-host.ts`, `tests/fixtures/claude-mod-host-ports.ts`, `tests/integration/claude-mod-seed-switch.test.ts`

## Observability and recovery

- Operational signal: none new; `RESTARTED` stays the record of the restart.
- Recovery: revert the files.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `waitForSessionSwitch` now returns whether a switch was confirmed and catches its own failure (a throwing or absent `$.clock.after` gives `false`), so `seedAfterSwitch` always goes on to `onOpened` and the seed. An ended id that could not be read is `undefined` and never counts as switched, so the wait ends only at the 3 s cap (the empty `UNKNOWN_SESSION_ID` is removed). `openAfterClear` routes any failure before the clear (for example a synchronous throw of `$.command.run`) to `onRejected`; the seed part cannot reject, so `onRejected` never runs after a successful clear.
- Changed files: `src/infrastructure/harnesses/claude-code/mod/session-switch.ts`, `restart-host.ts`, `mod-info.ts`; `tests/fixtures/claude-mod-host.ts` (`clockFailure`, `commandFailure`), `tests/fixtures/claude-mod-host-ports.ts`; `tests/integration/claude-mod-seed-switch.test.ts` (3 new tests: throwing timer API, unknown ended id, clear that cannot be queued).
- Checks: `npx vitest run tests/integration/claude-mod tests/integration/mod-reading-git-status.test.ts`: 10 files, 56 tests passed. `npx eslint` on the touched files: no issues. `npm run typecheck`: exit 0. Quality profile QA-01..QA-05, QA-08 on the touched files: no hit; largest file 79 lines. `npm run coverage`: 292 files, 1577 passed, 1 skipped, 96.38% statements, exit 0. `npm run build`: exit 0.
- Validated state: working tree on base `c17fd0a` plus T01..T05, Windows 11, Node 24.20.0, `dist/` rebuilt.
- Open items: MA-04 (live timing) stays for the user. No new reason code: a seed sent after a failed wait leaves `RESTARTED` as the record.
