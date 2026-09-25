# Stable execution context

Load in this exact order:

1. `tasks/prd-06-modo-snapshot-delegado/codereview_1/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T06 — Delegated mode on the session-reset deadline path

## Outcome

When a `session_reset` event exceeds the internal deadline and delegated mode is in effect, the failure policy injects the configured resume text, or nothing, instead of the plan-based boot omission. Plan mode keeps today's boot omission text byte for byte.

## Dependencies and boundaries

- Depends on: — (T01–T05 done)
- Unblocks: re-review of prd-06 (`sdd-review-code`, new session)
- In scope: `resolveFailure` in `src/core/services/failure-policy.ts`, unit tests for the deadline path.
- Out of scope: the engine path (`brake-engine.ts:handleSessionReset`, already conformant), `renderBootOmission` text, deadline value, the `pre_tool` failure path, other harness adapters.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_1/CR-01 | `codereview.md#findings` | Deadline boot omission ignores delegated mode (FR-08, OBJ-01, DEC-06) |

## Requirements

- FR-08 / DEC-06: in delegated mode, a reset injects `[ContextBrake boot v1] Run "<resumeCommand>" before continuing.` when `resumeCommand` is set, and nothing otherwise; the plan-based boot does not run.
- DEC-05: when the section is set and the mode cannot be read, the delegated text applies (use `resolveFailureGuidance`, which already returns the delegated-message union guidance in that case).
- DEC-02 / NFR-01: without the section, the port is never called and the result is today's `renderBootOmission()` block.
- The existing guards stay in force and in order: only `DEADLINE_EXCEEDED` on `session_reset` with `session_boot` supported reaches this branch.
- Keep `failure-policy.ts` at or under 100 lines and add no new export (TechSpec terrain baseline: structural exports ≥ 10).

## Context to recover on demand

- TechSpec: `techspec.md#technical-decisions` (DEC-02, DEC-05, DEC-06).
- Rules: `code-standards.md`, `javascript-typescript.md`, `tests.md` (`max-lines` 100 and `max-lines-per-function` 30 apply to tests).
- Code: `src/core/services/failure-policy.ts:resolveFailure` (line 57); `src/core/services/zone-guidance.ts:resolveFailureGuidance`; `tests/unit/failure-policy-delegated.test.ts`; `tests/helpers/delegated-fixtures.ts` (`CountingPresence`, `FailingPresence`, `delegatedConfig`).

## Work

- [ ] T06.1 In `resolveFailure`, on the deadline `session_reset` branch, resolve guidance through `resolveFailureGuidance` (config `input.config ?? DEFAULT_CONFIG`, `input.planPresence`); in delegated mode return `resumeText` as a `context` block or `neutral`; otherwise return `renderBootOmission()` as today.
- [ ] T06.2 Add unit cases for `session_reset` + `DEADLINE_EXCEEDED`: delegated with `resumeCommand` (resume block), delegated without it (neutral), section set with plan present (boot omission), no section (boot omission, presence never called), unreadable presence with the section set (resume block or neutral). Put them in a new file if `failure-policy-delegated.test.ts` would pass 100 lines.

## Acceptance criteria

- With the section set and no plan file, the deadline reset never returns text containing `plan` or `checkpoint`; it returns the resume block when `resumeCommand` is set and `{ kind: 'neutral' }` otherwise.
- With no section, or with the plan present, the returned block equals `renderBootOmission()` exactly.
- Without the section, `PlanPresence.exists` is called 0 times on this path.
- All existing tests pass unchanged.

## Verification

- Unit: the T06.2 cases pass.
- Integration: not applicable (pure core change; failure hosts already pass `planPresence`).
- End-to-end: not applicable.
- Manual: not required.
- Platforms: Windows locally; CI matrix for Linux and macOS.
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Expected evidence: new test names and results; QA-01–QA-08 sweeps clean over the touched files.

## Affected files

- Modify: `src/core/services/failure-policy.ts`
- Create or modify: `tests/unit/failure-policy-delegated-reset.test.ts` (or `tests/unit/failure-policy-delegated.test.ts` if it stays ≤ 100 lines)

## Observability and recovery

- Operational signal: the runtime error log keeps the `DEADLINE_EXCEEDED` record, which `resolveFailure` writes before the new branch.
- Recovery: revert the branch in `resolveFailure`.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `resolveFailure` sends the deadline `session_reset` branch to a private `deadlineBootDecision`. That function resolves guidance through `resolveFailureGuidance`. In delegated mode it returns `resumeText` as context, or neutral when no resume command is set. Otherwise it returns `renderBootOmission()` unchanged. A private `guidanceSources` builds the guidance input and is shared with the `pre_tool` branch. There is no new export.
- Changed files: modified `src/core/services/failure-policy.ts` (95 lines); created `tests/unit/failure-policy-delegated-reset.test.ts` (5 cases, 37 lines).
- Checks:
  - `npx vitest run` on the three failure-policy suites: 15 passed.
  - `npm run lint`: pass.
  - `npm run typecheck`: pass.
  - `npm run coverage`: 1,505 passed, 3 skipped (pre-existing), 1 failed. The failure was `tests/e2e/e2e-run-stops.test.ts` ("session ceiling", PRD-04 runner): its run report came back empty under full-suite load. It does not touch `failure-policy.ts`. The same file passed 3/3 in isolated reruns and passed in the review run before this change. The full suite was not rerun afterwards because the user stopped that run.
  - QA-01 to QA-06 sweeps over the touched files: empty. QA-08: every touched file is at or under 100 lines.
- Validated state: working tree on `3b94a9c` with T01–T06 applied, Windows 11, local Node toolchain.
- Open items:
  - The re-review must run in a session that did not make this correction.
  - The re-review should get a clean full `npm run coverage` run, or else treat the `e2e-run-stops` flake as a PRD-04 test-stability item outside prd-06.
