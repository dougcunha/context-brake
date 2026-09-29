# Stable execution context

Load in this exact order:

1. `tasks/prd-10-statusline-powershell-e-modo-light/codereview_1/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# C01 — The feature's own tests assert only what the code guarantees

## Outcome

`tests/unit/in-process-host-deadline.test.ts` records a `DEADLINE_EXCEEDED` line that a rounded 1 ms deadline can legitimately report as `0`, so the mandatory suite stops failing intermittently; and no line of this feature's test files carries two statements at once, so a style gate can stay as it is.

## Dependencies and boundaries

- Depends on: —
- Unblocks: the re-review of `codereview_1`
- In scope: `codereview_1/CR-01` and `codereview_1/CR-02`
- Out of scope: `HookDeadline` and every other product source file; the local latency tolerance of CR-04; the observations CR-05 and CR-07.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_1/CR-01` | `codereview.md#Findings` | `tests/unit/in-process-host-deadline.test.ts:34` asserts `elapsedMs >= 1` against a 1 ms injected deadline, while `hook-deadline.ts:45` records `Math.round(now() - startedAt)`, which is `0` when the timer fires in the same millisecond (reproduced 20 of 400 iterations; the review's `npm run coverage` failed on it) |
| `codereview_1/CR-02` | `codereview.md#Findings` | `tests/unit/config-legacy-checks.test.ts:19` has two statements on one line, the fingerprint of a scripted edit that `npm run lint` does not catch |

## Requirements

- The in-process deadline test must keep proving the DEC-11 selection, that the same work passes as `session_reset` with a 60,000 ms limit and fails as `pre_tool` with a 1 ms limit, with `phase: 'engine'` on the failing line.
- It must assert what the implementation guarantees about the elapsed time: a non-negative integer number, never a bound above zero.
- No test file changed by this feature may join two statements on one line.

## Context to recover on demand

- TechSpec: `techspec.md#Technical decisions` DEC-11 and DEC-12; `techspec.md#Test approach` TC-15.
- Rules and skills: `.agents/rules/tests.md`, `.agents/rules/code-standards.md`; the feature snapshot entry `L-09`.
- Code: `src/infrastructure/runtime/hook-deadline.ts:43-46` — `schedule` rounds the elapsed measurement; `tests/unit/in-process-host-deadline.test.ts:28-35` — the assertion to correct; `tests/unit/config-legacy-checks.test.ts:16-19` — the joined line.

## Work

- [x] C01.1 Replace the `elapsedMs` lower bound in `tests/unit/in-process-host-deadline.test.ts` with the guarantee the code makes: the value is a non-negative integer. Keep the selection assertions of TC-15 unchanged.
- [x] C01.2 Put the second `it('reports ignored fields for custom limits 20/30/40', ...)` in `tests/unit/config-legacy-checks.test.ts` on its own line, with no behavior change.

## Acceptance criteria

- `npx vitest run tests/unit/in-process-host-deadline.test.ts` passes 20 consecutive times, which the previous assertion did not.
- The in-process test still fails if the deadline selection is removed: the `pre_tool` case must still expect a `DEADLINE_EXCEEDED` line and the `session_reset` case must still expect none.
- `tests/unit/config-legacy-checks.test.ts` has no line with two statements.
- `npm run lint` and `npm run typecheck` stay clean.

## Verification

- Unit: `npx vitest run tests/unit/in-process-host-deadline.test.ts` repeated 20 times (the reviewer's 400-iteration probe found the old assertion failing 20 of 400 runs, so a single green run is not evidence); `npx vitest run tests/unit/config-legacy-checks.test.ts`.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: Windows, Linux, and macOS, since both files are platform-independent.
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Expected evidence: the file green 20 of 20, the coverage run green, and the diff limited to the two test files.

## Affected files

- Modify: `tests/unit/in-process-host-deadline.test.ts`, `tests/unit/config-legacy-checks.test.ts`
- Create: —

## Observability and recovery

- Operational signal: the `DEADLINE_EXCEEDED` line in `.context-brake/runtime/errors.jsonl` with `phase` and `elapsedMs`.
- Recovery: the previous assertion, as written in `codereview_1/codereview.md#Findings`, if a stronger bound is ever justified by a change to the measurement.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: CR-01 and CR-02 closed. The in-process deadline test now asserts what `HookDeadline` guarantees, a non-negative integer, and keeps the TC-15 selection assertions untouched; the joined line in the legacy-turn-limits test is split.
- Changed files: `tests/unit/in-process-host-deadline.test.ts` (the `elapsedMs` assertion), `tests/unit/config-legacy-checks.test.ts` (one line break).
- Checks: `npx vitest run tests/unit/in-process-host-deadline.test.ts` green in 20 consecutive runs, which the previous assertion could not be (the reviewer measured 20 failures in 400 iterations); `tests/unit/config-legacy-checks.test.ts` green; `npm run lint`, `npm run typecheck`, `npm run schemas:check`, and `npm run build` clean; `npm run coverage` with 307 of 307 files green (96.06% lines), the run that the reviewer saw fail on this file.
- Validated state: the uncommitted worktree at `1906d41` on Windows 11 with Node 24.
- Open items: none. The `elapsedMs` bound that the implementation does guarantee for the real 5,000 ms session-start deadline is already asserted in `tests/unit/process-hook-host-deadline.test.ts:84`; this task only removed the unsound bound above zero.

## Deviations and review notes

- The review's CR-04 (NFR-02 bound is CI-enforced), CR-05 (the published schema cannot express the `lightMode` plus `fullMode` exclusion) and CR-07 (unbounded stdin buffering) are classified informational and need no change: the first follows the repository's existing overhead-test pattern and the handoff measured a negative p95 delta, the second is conformant to DEC-08 as written, and the third is the deviation already recorded in `done/task_01.md#Handoff`.
- CR-06 was a coordinator action rather than a defect: the two stale `approved_sources` entries in `checkpoint.json` were refreshed to the current paths and hashes before the corrections started.
