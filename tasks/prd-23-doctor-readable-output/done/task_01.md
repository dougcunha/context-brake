# Stable execution context

Load in this exact order:

1. `tasks/prd-23-doctor-readable-output/prd.md`
2. `tasks/prd-23-doctor-readable-output/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — List only main-agent sessions

## Outcome

`activeSessions` returns one entry per main session. A ledger whose session line has an agent id (a subagent) is left out, so `doctor` text and `doctor --json` no longer repeat a session id with the estimated subagent window.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03
- In scope: the filter in `datedSession` and its unit test.
- Out of scope: the session text layout (T02), the README sentence (T03), usage readings for subagents, an `agentId` field in the report.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-09 | `prd.md#functional-requirements` | Main-agent ledgers only, in text and JSON; a ledger without a session line counts as main |
| NFR-01 | `prd.md#non-functional-requirements` | Schema shape unchanged |
| DEC-09 | `techspec.md#technical-decisions` | Filter in `datedSession` on `summary.sessionLine?.agentId` |
| CMP-10 | `techspec.md#components-and-flow` | `src/core/services/active-sessions.ts` |
| TC-09 | `techspec.md#test-approach` | 1 main, 3 subagent, 1 session-less ledger give 2 entries |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`; skill `ts-tests` for test count.
- Existing code: `src/core/services/active-sessions.ts:27-33` (`datedSession`); `src/core/services/session-counters.ts:20` (`sessionLine`); `src/core/contracts/session-ledger.ts:17` (`agentId` nullable).
- Existing tests: `tests/unit/active-sessions.test.ts` (48 lines) — reuse its ledger builders.

## Work

- [x] T01.1 In `datedSession`, return `[]` when the summary's session line has a string `agentId`.
- [x] T01.2 Add the TC-09 case to `tests/unit/active-sessions.test.ts`.

## Acceptance criteria

- 1 main ledger and 3 subagent ledgers with the same session id give 1 entry, from the main ledger.
- A ledger with only `statusline` and `reset` lines still gives 1 entry with `sessionId: null`.
- The order and the limit of 10 entries do not change for main sessions.

## Verification

- Unit: TC-09 in `tests/unit/active-sessions.test.ts`.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: platform-independent pure function.
- Commands: `npx vitest run tests/unit/active-sessions.test.ts`, then `npm run lint` and `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: the new test passes; QA-04 and QA-05 return no new hit on `src/core/services/active-sessions.ts`.

## Affected files

- Modify: `src/core/services/active-sessions.ts`, `tests/unit/active-sessions.test.ts`

## Observability and recovery

- Operational signal: `doctor` lists 1 row per main session.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `activeSessions` skips a ledger whose session line has a string `agentId` (`isSubagentLedger`); ledgers without a session line still count as main sessions.
- Changed files: `src/core/services/active-sessions.ts` (49 lines), `tests/unit/active-sessions.test.ts` (new TC-09 case).
- Checks: `npx vitest run tests/unit/active-sessions.test.ts` 8/8 passed; `npx eslint` on both files clean; `npm run typecheck` clean; QA-04 and QA-05 on `active-sessions.ts`: no hit.
- Validated state: worktree on base `419c0bd` plus the pre-existing prd-22 diff, Windows 11, Node.js 24.20.0.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision (DEC-09).
