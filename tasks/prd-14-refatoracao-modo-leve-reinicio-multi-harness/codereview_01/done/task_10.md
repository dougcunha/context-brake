# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T10 — Handoff gate fails closed when the turn start is unknown

## Outcome

In handoff mode, a restart with an unknown turn start is skipped with `SKIP_HANDOFF_STALE`, so no clear happens without proof that the handoff is fresh.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T11
- In scope: `handoffCode` in the core policy; its unit test; Claude mod scenarios that relied on the fail-open path.
- Out of scope: a new reason code or log schema change; tracking the turn start differently in the hosts.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | Handoff gate passes any existing handoff when `turnStartedAt` is unknown (FR-04, OBJ-04, NFR-01, DEC-04) |

## Requirements

- FR-04: in handoff mode, restart only with a handoff written after the turn started; otherwise skip with a reason.
- An unknown turn start counts as unproven freshness and reuses `SKIP_HANDOFF_STALE`, so the log and finding contracts stay unchanged.
- Snapshot mode (`required: false`) is unaffected.

## Context to recover on demand

- TechSpec: DEC-04
- Rules and skills: code-standards, tests
- Code: `src/core/services/auto-restart-policy.ts:handoffCode`; `tests/unit/auto-restart-policy.test.ts` (handoff gate block); `src/infrastructure/harnesses/claude-code/mod/turn-state.ts`

## Work

- [x] T10.1 Return `SKIP_HANDOFF_STALE` when `required` and `turnStartedAt === undefined`.
- [x] T10.2 Flip the unit case "accepts any present handoff when the turn start is unknown" to assert the skip.
- [x] T10.3 Run the Claude mod and restart-flow suites; adjust any scenario that relied on the fail-open path.

## Acceptance criteria

- The unit test asserts `SKIP_HANDOFF_STALE` for an unknown turn start with a present handoff.
- Existing handoff-gate, snapshot-mode, and ordering cases keep their results.

## Verification

- Unit: `tests/unit/auto-restart-policy.test.ts`, `tests/unit/restart-flow.test.ts`
- Integration: `tests/integration/claude-mod-*.test.ts`
- End-to-end: not applicable
- Manual: none
- Platforms: Windows locally; Linux and macOS in CI
- Environment dependency: none
- Commands: `npx vitest run <suites>`, `npm run lint`, `npm run typecheck`
- Expected evidence: suites green with the flipped case

## Affected files

- Modify: `src/core/services/auto-restart-policy.ts`, `tests/unit/auto-restart-policy.test.ts`

## Observability and recovery

- Operational signal: `SKIP_HANDOFF_STALE` in the restart log
- Recovery: revert the guard line

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `handoffCode` returns `SKIP_HANDOFF_STALE` when the handoff is required and the turn start is unknown; no new reason code. The unit case now asserts the skip.
- Changed files: src/core/services/auto-restart-policy.ts; tests/unit/auto-restart-policy.test.ts.
- Checks: `npx vitest run tests/unit/auto-restart-policy.test.ts tests/unit/restart-flow.test.ts tests/integration/claude-mod*` — 7 files, 48 tests passed. No Claude mod scenario relied on the fail-open path.
- Validated state: worktree on a31e183 plus the feature diff; Windows 11, Node 24.
- Open items: none. Lint and typecheck run with the integrated set at the end of the round.
