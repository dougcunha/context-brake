# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T17 — `doctor` states the restart mode text for in-process harnesses

## Outcome

`doctor` on Pi says that restart is automatic (and on Oh-My-Pi that it takes one Enter) in the `AUTO_RESTART_READY` finding, with the same text `init` shows.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: the in-process restart diagnostics take the mode text from the adapter's capability profile through `harnessRestartMode`.
- Out of scope: the capability profile shape; init's `AUTO_RESTART_MODE` finding.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/CR-03 | `codereview.md#findings` | `doctor` shows no automatic-restart impact text for Pi (DEC-10, FR-10, T08) |

## Requirements

- DEC-10 / FR-10: each restart state carries its impact text for the person.

## Context to recover on demand

- TechSpec: DEC-10, DEC-13
- Rules and skills: cli-output, harness-adapters, tests
- Code: `src/infrastructure/harnesses/common/restart-diagnostics.ts`, `src/infrastructure/harnesses/{pi,oh-my-pi}/adapter.ts`, `src/core/services/restart-install-extras.ts:harnessRestartMode`

## Work

- [x] T17.1 Give `InProcessRestartSpec` the mode text and put it on the ready finding's impact; pass it from the Pi and Oh-My-Pi adapters.
- [x] T17.2 Assert the Pi ready finding's impact in `tests/integration/doctor-remove-restart.test.ts`.

## Acceptance criteria

- The Pi ready finding's impact is `Automatic restart: a valid reset signal opens a new session by itself.`

## Verification

- Unit: see Work
- Integration: `tests/integration/doctor-remove-restart.test.ts`, `tests/integration/auto-restart-doctor.test.ts`
- End-to-end: not applicable
- Manual: none
- Platforms: Windows locally; Linux and macOS in CI
- Environment dependency: none
- Commands: `npx vitest run <suites>`, `npm run lint`, `npm run typecheck`
- Expected evidence: the named suites green

## Affected files

- Modify: `src/infrastructure/harnesses/common/restart-diagnostics.ts`, `src/infrastructure/harnesses/pi/adapter.ts`, `src/infrastructure/harnesses/oh-my-pi/adapter.ts`, `tests/integration/doctor-remove-restart.test.ts`

## Observability and recovery

- Operational signal: doctor text
- Recovery: text only

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `InProcessRestartSpec` carries `modeText`; the Pi and Oh-My-Pi adapters fill it from `harnessRestartMode(this.capabilityProfile()).reason`, so the in-process `AUTO_RESTART_READY` finding's impact states the restart mode with the text `init` shows: automatic on Pi, the semi-automatic impact on Oh-My-Pi.
- Changed files: src/infrastructure/harnesses/common/restart-diagnostics.ts; src/infrastructure/harnesses/{pi,oh-my-pi}/adapter.ts; tests/integration/doctor-remove-restart.test.ts (asserts the Pi ready impact; the `Finding` test type gains `impact`).
- Checks: `doctor-remove-restart`, `auto-restart-doctor`, `harness-adapters`, and `omp-session-switch` passed (23 tests); `npx eslint .` and `npm run typecheck` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T16; Windows 11, Node 24.
- Open items: `AUTO_RESTART_NOT_LOADED` and `AUTO_RESTART_OUTDATED_MOD` keep their own impact texts, which describe the failure rather than the mode.
