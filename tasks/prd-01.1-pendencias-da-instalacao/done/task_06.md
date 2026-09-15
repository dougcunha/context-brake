# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Protocol `CRITICAL` row allows `git add`

## Outcome

The generated and packaged ContextBrake protocol's `CRITICAL` row lists `git status`, `git add`, and `git commit` as the allowed commands, matching the 2026-09-14 product decision, and the repository's packaged `docs/context-brake-protocol.md` matches `renderProtocol(DEFAULT_CONFIG)` exactly.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `protocol-service.ts`'s `renderZoneRows` `CRITICAL` cell; regenerating the packaged `docs/context-brake-protocol.md`.
- Out of scope: PRD-02's dynamic allowlist module (a later feature); the `RED` row (already correct).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-11 | `prd.md#functional-requirements` | Protocol file aligned to the 2026-09-14 decisions |
| DEC-06 | `techspec.md#technical-decisions` | Exact `CRITICAL` row wording |
| CMP-06 | `techspec.md#components-and-flow` | `protocol-service.ts`, `docs/context-brake-protocol.md` |
| TC-07 | `techspec.md#test-approach` | Render with default/custom paths; packaged file equals rendered output |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/harness-adapters.md` (failure-policy allowlist: plan/checkpoint I/O, validation command, `git status`, `git add`, `git commit` stay allowed at the critical ceiling) — this task brings the protocol's own text in line with that already-approved allowlist.
- Existing code: `src/core/services/protocol-service.ts:12-13` (`renderZoneRows`, current `CRITICAL` cell reads "Only writing the plan and checkpoint, running the validation command, and `git status` or `git commit` are allowed" — missing `git add` and phrased as reading disallowed); `docs/context-brake-protocol.md` (packaged copy, currently matches the unfixed text).
- Contract or integration: `techspec.md#contracts-and-data` "Protocol rows (DEC-06)" for the exact replacement sentence.
- Harness reference: not applicable.

## Work

- [x] T06.1 Update the `CRITICAL` row in `renderZoneRows` (`protocol-service.ts`) to: "Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed. Complete the `RED` actions."
- [x] T06.2 Regenerate `docs/context-brake-protocol.md` by running `renderProtocol(DEFAULT_CONFIG)` (via the existing generation path used at build/test time) and committing the result.
- [x] T06.3 Update or add a unit test comparing the repository's `docs/context-brake-protocol.md` byte-for-byte with `renderProtocol(DEFAULT_CONFIG)`.
- [x] T06.4 Update or add a unit test asserting the exact `CRITICAL` row text for both default and custom `planFile`/`checkpointFile` configuration.

## Acceptance criteria

- `renderProtocol` output's `CRITICAL` row contains `git status`, `git add`, and `git commit`.
- `docs/context-brake-protocol.md` is byte-identical to `renderProtocol(DEFAULT_CONFIG)`.
- Every currently passing protocol-service assertion for the `RED`, `GREEN`, and `YELLOW` rows remains unchanged.

## Verification

- Unit: exact `CRITICAL` row text with default and custom state-file names; packaged-file-equals-rendered-output comparison.
- Integration: not applicable.
- End-to-end: not applicable — the packaged file is verified by the unit comparison, not by running the CLI.
- Manual: none.
- Platforms: not platform-sensitive.
- Commands: `npm run build`, `npm test -- protocol-service`
- Environment dependency: none.
- Expected evidence: `tests/unit/protocol-service.test.ts` passes, including the new byte-comparison assertion.

## Affected files

- Modify: `src/core/services/protocol-service.ts`, `docs/context-brake-protocol.md`, `tests/unit/protocol-service.test.ts`
- Create: none

## Observability and recovery

- Operational signal: none — this is documentation-generation text, not a runtime finding.
- Recovery: revert both files with git; no state or schema migration involved.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: The generated and packaged protocol's `CRITICAL` row now reads "Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed. Complete the `RED` actions." — matching the 2026-09-14 decision and the `harness-adapters.md` failure-policy allowlist. `docs/context-brake-protocol.md` is byte-identical to `renderProtocol(DEFAULT_CONFIG)`.
- Changed files: `src/core/services/protocol-service.ts` (`CRITICAL` row text), `docs/context-brake-protocol.md` (regenerated), `tests/unit/protocol-service.test.ts` (new byte-comparison test and exact-text tests for default and custom state-file configuration).
- Checks: `npm run build`, `npm run typecheck`, `npm run lint` (0 issues) all pass; `npx vitest run protocol-service` — 6 tests pass; full suite `npx vitest run` — 91 files, 379 tests pass (no regression).
- Validated state: code-and-doc pair verified consistent by the new byte-comparison unit test, which will fail on any future drift between the two. There was no existing "generation path used at build/test time" for the packaged file in this repo (no `schemas:generate`-style script writes it); I regenerated it with a one-off script calling `renderProtocol(DEFAULT_CONFIG)` and writing its exact output, matching how the byte-comparison test now verifies it — not a deviation in outcome, just noting no reusable generator script exists to point to. `RED`, `GREEN`, and `YELLOW` row assertions in the existing test file are untouched and still pass.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation (DEC-06).
