# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T09 — Send the seed even when the store write fails after the clear

## Outcome

Once the mod's own `/clear` resolves, the seed prompt is always submitted; a failure of the `$.store` write in `markSeeded` is logged as `ERROR_INTERNAL` and no longer leaves the session cleared and waiting for a keystroke.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `seedAfterClear` in `restart-flow.ts` and a TC-13 variant in `claude-mod-restart.test.ts`.
- Out of scope: new reason codes (`RESTART_REASON_CODES` and the strict `modLogSchema` stay unchanged), OI-04 and OI-05, guard semantics.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-03 | `codereview.md#Findings` | `seedAfterClear` awaits `markSeeded` before `$.prompt.submit`; a store failure suppresses the seed |
| PRD NFR-04 | `prd.md#Non-functional requirements` | errors never leave a session half cleared |
| TechSpec DEC-11, DEC-03 | `techspec.md#Technical decisions` | failure containment; seed submitted when the mod's queued `/clear` resolves |

## Requirements

- Start `markSeeded` without awaiting it, call `$.prompt.submit` with `seedText(config.gate)` right away, then await the store promise inside its own `try`/`catch` that reports `ERROR_INTERNAL`.
- Do not reorder submit before starting the store write: the write must start first so the seeded session's first `foldToolCalls` does not race an unzeroed `toolCallsSinceSeed` (FR-05).
- A rejected `$.prompt.submit` still reports `ERROR_INTERNAL`, as today.
- `restart-flow.ts` stays under 100 lines and keeps no empty `catch`.

## Context to recover on demand

- TechSpec: DEC-03, DEC-11.
- Rules and skills: `code-standards.md`, `javascript-typescript.md`, `tests.md`.
- Code: `src/infrastructure/harnesses/claude-code/mod/restart-flow.ts:26-33` (`seedAfterClear`); `mod/mod-guards.ts:markSeeded`; fake host `tests/fixtures/claude-mod-host.ts` (store failure injection); `tests/integration/claude-mod-restart.test.ts:49` (`failures never break the session (NFR-04, TC-13)`).

## Work

- [x] T09.1 Rewrite `seedAfterClear` so the seed submit no longer depends on the store write succeeding, keeping the store write started first.
- [x] T09.2 Add a TC-13 case: the fake store throws on write after the clear resolves; assert `prompt.submit` was called once with the seed text and the log holds an `ERROR_INTERNAL` record.

## Acceptance criteria

- With a failing store write after the clear, exactly one seed prompt is submitted and `ERROR_INTERNAL` is logged.
- Existing TC-09 to TC-13 and the guard tests still pass.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/claude-mod-restart.test.ts` (fake host) new case passes; `claude-mod-guards`, `claude-mod-gates` pass.
- End-to-end: not applicable (mod behavior runs only under the fake host or a real session).
- Manual: none.
- Platforms: Windows here; Linux and macOS through CI.
- Environment dependency: none.
- Commands: `npx vitest run tests/integration/claude-mod-restart.test.ts tests/integration/claude-mod-guards.test.ts`, `npm run build` (bundle), `npm run lint`, `npm run typecheck`, `npm run coverage` (background, L-04).
- Expected evidence: passing test names in the handoff.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/mod/restart-flow.ts`
- Modify: `tests/integration/claude-mod-restart.test.ts`; `tests/fixtures/claude-mod-host.ts` only if store failure injection after the clear is missing

## Observability and recovery

- Operational signal: `ERROR_INTERNAL` in `.context-brake/runtime/claude-mod/<sessionId>.json` with the seeded session still started.
- Recovery: revert `seedAfterClear`.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `seedAfterClear` starts `markSeeded` first (its rejection reported as `ERROR_INTERNAL`), then submits the seed through `submitSeed` (its own `try`/`catch`), and awaits both with `Promise.all`; a store failure after the clear no longer suppresses the seed. No new reason code.
- Changed files: `src/infrastructure/harnesses/claude-code/mod/restart-flow.ts` (64 lines); `tests/fixtures/claude-mod-host.ts` (`storeWriteFailure` switch on the fake `$.store.set`, 92 lines); `tests/integration/claude-mod-restart.test.ts` (new describe "a store failure after the clear still seeds the session (NFR-04, TC-13, CR-03)", kept separate so the TC-13 describe stays under 30 lines).
- Checks: the new case fails with the old sequential order (1 failed, 8 passed) and passes with the fix; `claude-mod-restart`, `claude-mod-guards`, `claude-mod-gates` 25 passed; after `npm run build`, `claude-mod-bundle` + `claude-mod-restart` 14 passed; `npm run lint` clean after splitting the describe; `npm run typecheck` clean; QA-01/02/03/07 and QA-05 (no `node:`, sync I/O or `process` in the mod) no hits. Full `npm run coverage` runs once after the last correction task of this round.
- Validated state: worktree on `c7529c5` plus the feature diff, T08 and T09; Windows 11, Git Bash.
- Open items: none.
