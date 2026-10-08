# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T11 — Pi and Oh-My-Pi simulated hosts cover the env switch and the handoff gate

## Outcome

The Pi and Oh-My-Pi simulated-host suites prove that `CONTEXT_BRAKE_AUTO_RESTART=0` stands the restart down and that, in handoff mode, a missing, stale, or fresh handoff decides the restart.

## Dependencies and boundaries

- Depends on: T10
- Unblocks: —
- In scope: test helpers and suites for Pi and Oh-My-Pi; production code only if a case exposes a defect.
- Out of scope: Claude mod suites (already covered).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#findings` | No env-switch case on Pi or Oh-My-Pi (FR-09, TC-09) |
| codereview_01/CR-03 | `codereview.md#findings` | Handoff gate never exercised on Pi or Oh-My-Pi (FR-04, TC-09, T06) |

## Requirements

- FR-09: each verified harness's simulated host stands down under the switch with `SKIP_DISABLED_ENV` and opens no session.
- FR-04: handoff mode (`autoRestart` on, no `snapshot.command`) skips with `SKIP_HANDOFF_MISSING` or `SKIP_HANDOFF_STALE` and restarts with a handoff written during the turn.
- Tests restore `process.env` after each case.

## Context to recover on demand

- TechSpec: DEC-04, DEC-16, DEC-19, DEC-20
- Rules and skills: tests
- Code: `tests/helpers/pi-restart-world.ts`, `tests/integration/pi-restart.test.ts`, `tests/integration/omp-restart.test.ts`, `src/infrastructure/harnesses/common/in-process-restart-state.ts`

## Work

- [x] T11.1 Pi: env-switch case asserting `SKIP_DISABLED_ENV` and no seed.
- [x] T11.2 Pi: handoff-mode cases (missing, written before `agent_start`, written during the turn).
- [x] T11.3 Oh-My-Pi: env-switch case and the missing and fresh handoff cases.

## Acceptance criteria

- `rg CONTEXT_BRAKE_AUTO_RESTART tests/integration/pi-restart.test.ts tests/integration/omp-restart.test.ts` finds the new cases.
- Handoff-mode cases pass on both hosts.

## Verification

- Unit: not applicable
- Integration: `tests/integration/pi-restart.test.ts`, `tests/integration/omp-restart.test.ts`
- End-to-end: not applicable
- Manual: none
- Platforms: Windows locally; Linux and macOS in CI
- Environment dependency: none
- Commands: `npx vitest run tests/integration/pi-restart.test.ts tests/integration/omp-restart.test.ts`, `npm run lint`, `npm run typecheck`
- Expected evidence: new cases green

## Affected files

- Modify: `tests/helpers/pi-restart-world.ts`, `tests/integration/pi-restart.test.ts`, `tests/integration/omp-restart.test.ts`

## Observability and recovery

- Operational signal: restart log codes asserted by the tests
- Recovery: test-only change

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Pi and Oh-My-Pi simulated hosts now cover `CONTEXT_BRAKE_AUTO_RESTART=0` (`SKIP_DISABLED_ENV`, no session, empty editor) and handoff mode (missing → `SKIP_HANDOFF_MISSING`, written before the turn → `SKIP_HANDOFF_STALE`, written during the turn → restart). The Oh-My-Pi world moved from the suite into a helper so both suites share it; a small helper writes the handoff with a controlled mtime. No production defect found.
- Changed files: tests/helpers/omp-restart-world.ts (new, extracted), tests/helpers/handoff-file.ts (new), tests/integration/omp-restart.test.ts (uses the helper), tests/integration/pi-restart-handoff.test.ts (new), tests/integration/omp-restart-handoff.test.ts (new). New files instead of growing the existing suites keep each under the 100-line limit.
- Checks: `npx vitest run tests/integration/pi-restart* tests/integration/omp-restart*` — 4 files, 17 tests passed; `npm run lint` and `npm run typecheck` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10; Windows 11, Node 24.
- Round-end fix: under heavy CPU load, the integrated run failed `omp-restart.test.ts` "leaves a busy editor alone" because a fixed five-tick wait did not cover the asynchronous log write. That case and the matching Pi cancel case now wait for the log condition with `vi.waitFor` (tests/integration/omp-restart.test.ts, tests/integration/pi-restart.test.ts); both suites passed three consecutive runs.
- Open items: the acceptance `rg` names `pi-restart.test.ts`/`omp-restart.test.ts`; the cases live in the sibling `*-restart-handoff.test.ts` files.
