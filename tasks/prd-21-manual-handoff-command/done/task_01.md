# Stable execution context

Load in this exact order:

1. `tasks/prd-21-manual-handoff-command/prd.md`
2. `tasks/prd-21-manual-handoff-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Core prompt and manual decision

## Outcome

`src/core/services/manual-handoff.ts` builds the exact `/handoff` prompt for `snapshot` and `handoff` modes from the same reset text that `zoneAction` gives, normalizes the focus, and decides `submit`, `refuse-off`, or `refuse` with a stand-down code. The zone text is unchanged.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03
- In scope: export `resetAction` from `zone-guidance.ts` and make `zoneAction` use it; export `standDownCode` from `auto-restart-policy.ts`; create `manual-handoff.ts` with `normalizeFocus`, `manualHandoffPrompt`, `decideManualHandoff`, `MANUAL_HANDOFF_FOCUS_LIMIT`, and the command lines of the TechSpec "Contracts and data"; unit tests.
- Out of scope: any mod code; any change to the zone text, the notices, or the reason codes.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04 | `prd.md#functional-requirements` | Prompt per mode with the trigger-zone text |
| FR-05, FR-06 | `prd.md#functional-requirements` | Refusal decision |
| FR-07 | `prd.md#functional-requirements` | Focus normalization |
| NFR-03, NFR-06 | `prd.md#non-functional-requirements` | Pure core builder; message lines |
| DEC-01, DEC-02 | `techspec.md#technical-decisions` | `resetAction`, `decideManualHandoff`, `standDownCode` |
| CMP-01..CMP-03 | `techspec.md#components-and-flow` | Core components |
| TC-01..TC-04 | `techspec.md#test-approach` | Unit tests |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `tests.md`, `cli-output.md`.
- Existing code: `src/core/services/zone-guidance.ts` (`zoneAction`, `snapshotAction`), `src/core/services/auto-restart-policy.ts` (`standDownCode`), `src/core/services/auto-restart-notices.ts` (`renderRestartNotice`), `src/core/services/skill-invocation.ts` (`slashInvocation`), `src/core/contracts/configuration.ts` (`SnapshotConfig`), `tests/unit/zone-guidance.test.ts`.
- Contract or integration: TechSpec "Contracts and data" (exact prompt and lines).

## Work

- [x] T01.1 Extract `resetAction(snapshot, options)` in `zone-guidance.ts` (non-urgent unless `options.urgent`), and make `zoneAction` call it; keep every current output.
- [x] T01.2 Export `standDownCode` from `auto-restart-policy.ts`.
- [x] T01.3 Create `manual-handoff.ts` with the focus rule, the exact prompt, the decision, and the named lines.
- [x] T01.4 Write `tests/unit/manual-handoff.test.ts` for TC-01..TC-03; run `tests/unit/zone-guidance.test.ts` for TC-04.

## Acceptance criteria

- For each mode, the prompt equals the TechSpec text and contains the `zoneAction` text at a non-critical trigger zone with `slashInvocation`; it does not start with `/`.
- Focus `"  a\nb  "` gives `a b`; empty or blank gives no focus sentence; 600 characters give 500.
- `decideManualHandoff` returns `refuse-off` for mode `off`, `refuse` with `SKIP_DISABLED_ENV` or `SKIP_NON_INTERACTIVE`, and `submit` otherwise.
- `zone-guidance` tests pass unchanged.

## Verification

- Unit: TC-01..TC-04.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows development machine.
- Commands: `npx vitest run tests/unit/manual-handoff.test.ts tests/unit/zone-guidance.test.ts tests/unit/auto-restart-policy.test.ts`; `npm run lint`; `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: passing suites with their test counts.

## Affected files

- Modify: `src/core/services/zone-guidance.ts`, `src/core/services/auto-restart-policy.ts`
- Create: `src/core/services/manual-handoff.ts`, `tests/unit/manual-handoff.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the files.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `core` builds the `/handoff` prompt (`manualHandoffPrompt`), normalizes the focus (`normalizeFocus`, 500-character cut), and decides `submit`, `refuse-off`, or `refuse` with a stand-down code (`decideManualHandoff`). The command lines are named constants. `zoneAction` now calls `resetAction`; every zone text is unchanged.
- Changed files: `src/core/services/zone-guidance.ts` (`resetAction(snapshot, invoke, isUrgent = false)` exported), `src/core/services/auto-restart-policy.ts` (`standDownCode` exported), `src/core/services/manual-handoff.ts` (new), `tests/unit/manual-handoff.test.ts` (new, 14 tests).
- Checks: `npx vitest run tests/unit/manual-handoff.test.ts tests/unit/zone-guidance.test.ts tests/unit/auto-restart-policy.test.ts tests/unit/telemetry-block-budget.test.ts tests/unit/snapshot-trigger-percentage.test.ts`: 5 files, 66 tests passed. `npm run lint`: pass. `npm run typecheck`: pass. Quality profile QA-01..QA-04, QA-07, QA-08 over the 4 touched files: no hit; largest file 59 lines.
- Validated state: working tree on base `c17fd0a`, Windows 11, Node 24.20.0.
- Open items: `resetAction` takes `(snapshot, invoke, isUrgent)` and returns a string, not an options object; TechSpec DEC-01 was aligned. `triggerZone` accepts only `YELLOW` and `RED`, so the non-urgent case is checked against the `CRITICAL` zone text. Quality reservations: none.

### ADR candidates

None - direct TechSpec implementation or local decision.
