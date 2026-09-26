# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T10 — Teste do texto de uso desconhecido no doctor

## Outcome

TC-17 proves the `doctor` text line for an active session whose usage is unknown after a reset: `usage unknown since last reset, last activity N min ago`. The JSON for that session carries `usage: null`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: a test case in `tests/integration/doctor-active-sessions.test.ts`.
- Out of scope: production code changes. The behavior was already verified by the review's spot check.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/OI-03 | `codereview.md#Optional improvements` | No test asserts the `usage unknown since last reset` text |
| FR-14 | `prd.md#functional-requirements` | A session with a reset and no later reading shows unknown usage |
| TC-17 | `techspec.md#test-approach` | The text section and the `activeSessions` JSON appear as specified |
| DEC-CORR-01 | `workflow.md#Human Decisions Log` | The user included OI-03 in this round |

## Requirements

- Seed a recent session with a tool line and then a reset line (`NodeSessionLedger.appendResetLine`).
- `doctor --json` lists it with `usage: null`.
- The text output has `* claude-code <id>: usage unknown since last reset, last activity <0|1|2> min ago`.
- The test file stays at 100 lines or fewer, and every function stays at 30 lines or fewer (L-02).

## Context to recover on demand

- Rules and skills: `tests.md`.
- Code:
  - `tests/integration/doctor-active-sessions.test.ts` (`seedReading`);
  - `src/infrastructure/runtime/node-session-ledger.ts#appendResetLine`;
  - `src/cli/output/doctor-sessions-text.ts`.

## Work

- [x] T10.1 Add a seed helper or a parameter for the reset, and add the case, asserting both the JSON and the text.

## Acceptance criteria

- The new case passes, and the two existing TC-17 cases pass unchanged.

## Verification

- Unit: not applicable.
- Integration: `doctor-active-sessions.test.ts`, which is registered in the process lane.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; CI matrix.
- Environment dependency: none.
- Commands: `npm run lint`, `npm test` (targeted), and `npm run coverage` at the end of the round.
- Expected evidence: test count.

## Affected files

- Modify: `tests/integration/doctor-active-sessions.test.ts`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: revert the test.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: TC-17 has a third case. It seeds a session with a tool line 3 minutes ago and a `clear` reset 1 minute ago, then asserts that `doctor --json` lists it with `usage: null`, and that the text prints `* claude-code cleared: usage unknown since last reset, last activity N min ago`.
- Changed files: `tests/integration/doctor-active-sessions.test.ts` (56 lines; new `seedReset` helper and one case).
- Checks: ESLint and `npm run typecheck` pass. `doctor-active-sessions`: 3/3 pass, including the two existing cases unchanged.
- Validated state: worktree at `c3fb6a8` plus the feature diff and the T07–T10 corrections, with `dist/` rebuilt, on Windows 11 with Node 24.
- Open items: none.
