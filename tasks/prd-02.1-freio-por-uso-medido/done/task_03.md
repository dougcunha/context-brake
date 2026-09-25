# Stable execution context

Load in this exact order:

1. `tasks/prd-02.1-freio-por-uso-medido/prd.md`
2. `tasks/prd-02.1-freio-por-uso-medido/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Measurement contract: stale-after-reset and window fallback

## Outcome

Core accepts a measurement that has a timestamp and no window. It uses `contextWindowCeiling` when the window is missing, and drops a measurement that is not later than the last reset.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T04
- In scope (DEC-09, DEC-10):
  - `MeasuredUsage.at?` and `contextWindow: number | null`;
  - `SessionSummary.lastResetAt`;
  - the stale drop in `readZone` and the window fallback in `resolveUsage`;
  - `in-process-support.ts` types, kept compatible.
- Out of scope: reading any transcript (T04).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06 | `prd.md#functional-requirements` | Ignore pre-reset measurements |
| FR-07 | `prd.md#functional-requirements` | Window fallback |
| DEC-09, DEC-10 | `techspec.md#technical-decisions` | Contract |
| CMP-03, CMP-04 | `techspec.md#components-and-flow` | Components |
| TC-10–TC-12 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`.
- Existing code: `src/core/services/session-counters.ts`, `session-zone.ts`, `usage-resolver.ts`, `src/infrastructure/harnesses/common/in-process-support.ts:11,44`.
- Tests: `usage-resolver.test.ts`, `session-zone.test.ts`, `session-counters.test.ts`, `pi-runtime-usage.test.ts`, `omp-runtime-usage.test.ts`.

## Work

- [x] T03.1 Add `lastResetAt` to `summarizeLedger`.
- [x] T03.2 Make the window nullable with the fallback, and add the optional `at` with the stale drop in `readZone`.
- [x] T03.3 Add tests for TC-10–TC-12; keep the Pi and Oh-My-Pi usage tests green.

## Acceptance criteria

- `contextWindow: null` resolves to `contextWindowCeiling`, with `source=measured`.
- A measurement whose `at` is before or equal to the last reset gives the estimate. After the reset, or with no reset, it gives `measured`.
- `lastResetAt` is the `at` of the last reset line, or `null`.

## Verification

- Unit: TC-10, TC-11, TC-12.
- Integration: existing Pi and Oh-My-Pi runtime usage suites.
- End-to-end: not applicable.
- Platforms: CI matrix.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`.
- Environment dependency: none.
- Expected evidence: passing suites.

## Affected files

- Modify: `src/core/services/session-counters.ts`, `session-zone.ts`, `usage-resolver.ts`, `src/infrastructure/harnesses/common/in-process-support.ts` (type only, if needed), related tests.

## Observability and recovery

- Operational signal: none new.
- Recovery: revert the commit.

## Handoff

- Produced result: `SessionSummary.lastResetAt` (the `at` of the last reset line, or `null`); `MeasuredUsage.contextWindow: number | null` and optional `at`; `resolveUsage` falls back to `contextWindowCeiling` for a `null` window with `source=measured`; `readZone` drops a measurement whose `at` parses to a time not later than `lastResetAt` and uses the estimate (DEC-09, DEC-10, FR-06, FR-07).
- Changed files: `src/core/services/session-counters.ts`, `src/core/services/usage-resolver.ts`, `src/core/services/session-zone.ts`; tests `tests/unit/usage-resolver.test.ts` (TC-10), `tests/unit/session-zone.test.ts` (TC-11: before, equal, after, no reset), `tests/unit/session-counters.test.ts` (TC-12: no reset, two resets). `in-process-support.ts` unchanged: its `contextWindow: number` stays assignable to the nullable core type.
- Checks: `npm run typecheck` pass; `npm run lint` pass; targeted suites (usage-resolver, session-counters, session-zone, pi/omp runtime usage, brake-engine-pre-tool) 50/50 pass; `npm run build` then `npm run coverage`: 227 test files passed, exit 0, coverage 94.89% statements / 89.74% branches.
- Quality profile over touched files: QA-01..QA-04, QA-07, QA-08: no hits (`Date.parse` of stored timestamps is not a clock read, as QA-07 notes).
- Validated state: worktree at HEAD `3b94a9c` plus uncommitted T01–T03 diff; Windows 11, Node 20+, Git Bash.
- Open items: none. Linux and macOS through the CI matrix.

### ADR candidates

None - direct TechSpec implementation or local decision.
