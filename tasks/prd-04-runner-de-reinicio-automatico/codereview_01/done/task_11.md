# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T11 — Stopping a harness session leaves no process from its group on POSIX

## Outcome

On POSIX, `stop()` on a harness session always ends with no member of the harness process group alive. This holds when the leader exits during the SIGINT grace period, and when it had already exited before `stop()` ran.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope:
  - `HarnessSession.stop` and `terminate` in `harness-session-process.ts`;
  - a fake-harness option for a grandchild that ignores SIGINT;
  - a TC-15 stop case.
- Out of scope:
  - Windows: a leader that has already exited cannot be tree-killed by pid. Record this as a platform limit in the handoff and in the TechSpec risk "Windows signal delivery".
  - The validation executor, which already kills the tree on timeout and on stop.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#Findings` | The tree kill is skipped once the leader exits (RF12, CA-09, DEC-05, `node.md` Shutdown) |

## Requirements

- After the grace race, on POSIX, send `SIGKILL` to `-pid` whether or not the leader exited. Treat `ESRCH` (an empty group) as success, and never reject because the group is gone.
- When `stop()` runs after the leader has already exited, still kill the group on POSIX.
- Keep the 10 s grace (`STOP_GRACE_MILLISECONDS`) and the Windows direct tree kill unchanged.
- Keep `harness-session-process.ts` within 100 lines. If needed, split a helper into `src/infrastructure/process/` (L-07).

## Context to recover on demand

- TechSpec: DEC-05, DEC-12, TC-15
- Rules: `node.md` (Child Processes, Shutdown), `tests.md`
- Code:
  - `src/infrastructure/runner/harness-session-process.ts:35-100`
  - `src/infrastructure/process/process-tree.ts:14-25`
  - `tests/integration/harness-session-stop.test.ts`
  - `tests/support/fake-harness/fake-harness.mjs` (`hang.pidFile`, `ignoreInterrupt`)

## Work

- [x] T11.1 Add a fake-harness option in which the hang grandchild ignores SIGINT while the harness itself exits on SIGINT.
- [x] T11.2 Make `terminate` and `stop` always send `SIGKILL` to the POSIX group after the grace, or after an earlier exit, tolerating `ESRCH`.
- [x] T11.3 Add a TC-15 case: the leader exits on SIGINT, the grandchild ignores it, and after `stop()` the grandchild pid is dead. Skip the case on Windows with the reason.
- [x] T11.4 Add the Windows limit to the TechSpec risk "Windows signal delivery".

## Acceptance criteria

- On POSIX, no fake-harness pid survives `stop()` in either new case.
- The existing stop cases (with and without `ignoreInterrupt`) and `run-command-interrupt.test.ts` stay green on Windows.

## Verification

- Unit: not applicable
- Integration: `tests/integration/harness-session-stop.test.ts` (process lane)
- End-to-end: TC-22 is unchanged and runs on POSIX CI
- Manual: not required
- Platforms: the new case runs on Linux and macOS CI only (PI-03). On Windows, the existing cases must pass.
- Environment dependency: POSIX CI for the new case. Locally it is skipped and reported as not verifiable.
- Commands:
  - `npm run build`
  - `npm run typecheck`
  - `npm run lint` (only the 14-error baseline is allowed)
  - `npm run coverage` (serialized, in the background)
- Expected evidence: the new case exists and is skipped locally with its reason, and the other stop tests are green

## Affected files

- Modify:
  - `src/infrastructure/runner/harness-session-process.ts`
  - `tests/support/fake-harness/fake-harness.mjs`
  - `tests/support/fake-harness/install.ts`
  - `tests/integration/harness-session-stop.test.ts`
  - `tasks/prd-04-runner-de-reinicio-automatico/techspec.md` (risk text only)
- Create:
  - `src/infrastructure/runner/harness-session-signals.ts`
  - `tests/unit/harness-session-signals.test.ts`

## Observability and recovery

- Operational signal: none new
- Recovery: revert `terminate`

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: CR-02 corrected in the implementation. On POSIX, `stop()` sends `SIGKILL` to the harness process group after the SIGINT grace race and also when the leader exited before `stop()`. `ESRCH` means the group is already empty. Windows retains direct tree kill while the leader is alive.
- Changed files: `src/infrastructure/runner/harness-session-process.ts`, new `harness-session-signals.ts`, `tests/support/fake-harness/fake-harness.mjs`, `tests/support/fake-harness/install.ts`, `tests/integration/harness-session-stop.test.ts`, new `tests/unit/harness-session-signals.test.ts`, and `techspec.md` (Windows signal risk only). The signal helper was extracted to keep `harness-session-process.ts` below 100 lines.
- Checks: `npm run build` and `npm run typecheck` passed. `npm run lint` reported only the 14 recorded PRD-03 QA evidence errors; no T11 errors. `npm run coverage` passed on the changed source and initial integration tests. A focused run after adding the signal unit tests passed 8 tests with 2 POSIX cases skipped on Windows; the final unit run passed all 5 signal tests. The quality-profile scan over T11 code found no new blocking or reservation hits.
- Validated state: Uncommitted T01–T10 implementation plus T11 source and tests, Windows with Node v24.19.0. The existing fake-harness stop cases and `run-command-interrupt.test.ts` passed. The new POSIX cases wait until the grandchild is ready, then assert no pid survives when the leader exits during grace or before `stop()`. They are skipped locally and require Linux/macOS CI (PI-03). No real harness was launched.
- Open items: POSIX execution of the two new cases remains unverified locally (PI-03). Once a Windows leader has exited, `taskkill /pid /t` cannot identify former descendants; the TechSpec records this platform limit. T12 and T14 are eligible; T13 requires T12.
