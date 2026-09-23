# T16 — Resolve the full-suite runtime overhead failure

## Outcome

The built process hook meets the existing overhead test's local baseline rule during the full suite, or the run records a diagnosed environment block without weakening the target.

## Dependencies and boundaries

- Depends on: —
- Unblocks: independent re-review of `codereview_02/CR-01`.
- In scope: trace the 1120.6 ms post-tool p95 against the 1018.5 ms local ceiling and correct a proven runtime or test-isolation cause.
- Out of scope: increasing the 100 ms product target, reducing sample counts, or exempting the post-tool path.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_02/CR-01` | `codereview.md#Findings` | One full run failed the built post-tool overhead assertion |
| CA-20, DEC-17, TC-22 | `prd-02/prd.md#Critérios de aceitação`, `prd-02/techspec.md#Test approach` | Built process hook overhead contract |

## Requirements

- Measure baseline and built-hook timings under the same controlled test-lane conditions and preserve the existing assertion.
- Check whether PRD 03 runtime imports or initialization changed the neutral post-tool path before changing production code.
- Do not turn a load-dependent p95 spike into a passing result by ignoring samples or only rerunning the test.

## Context to recover on demand

- PRD 02: CA-20; TechSpec: DEC-17, TC-22 and load-dependent measurement risk.
- Rules: `code-standards.md`, `node.md`, `tests.md`, `harness-adapters.md`.
- Code: `tests/integration/runtime-overhead.test.ts`, `src/infrastructure/runtime/runtime-composition.ts`, `src/infrastructure/runtime/process-hook-host.ts`, `scripts/asset-bundler.ts`, `tests/test-lanes.ts`.

## Work

- [x] T16.1 Capture baseline and hook timing distributions for the failing post-tool test in suite and isolation; record resource contention or runtime path evidence.
- [x] T16.2 Correct the proven source of excess overhead or a test-lane interference, preserving the PRD 02 target and actual sample count.
- [x] T16.3 Rerun the focused overhead suite and full coverage gate; document p95, baseline, and platform limits.

## Acceptance criteria

- Built post-tool, critical pre-tool, and in-process measurements meet the existing assertions with their required warm-ups and sample counts.
- A full-suite run passes the overhead test; failures owned by T14 or T15 remain independently tracked. The integrated full coverage gate must pass before re-review.
- Any runtime change preserves hook output, deadline, and the narrow `DEC-EX-CR01` process boundary.

## Verification

- Unit: runtime composition and bundle import guard if touched.
- Integration: `runtime-overhead` focused suite, built hook delivery, and full coverage lane.
- End-to-end: built CLI and hook fixture suite; no browser or UI.
- Manual: none.
- Platforms: Linux, macOS, Windows; local Windows evidence with the existing matrix limit.
- Environment dependency: a stable process timing environment; record observed contention if present.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run dependencies:check`.
- Expected evidence: baseline and p95 values, runtime path trace, focused and full results.

## Affected files

- Modify: `tests/integration/runtime-overhead.test.ts`, `tests/test-lanes.ts`, or runtime composition/bundle files only as diagnosis requires.
- Create: focused measurement helper only if needed.

## Observability and recovery

- Operational signal: measured baseline and p95 with enough context to distinguish runtime work from host contention.
- Recovery: revert any performance change that does not improve the measured path; retain regression evidence.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: the overhead suite now measures baseline (`node -e ''`) and the built hook as interleaved pairs (3 warm-up pairs, 20 sample pairs) under the same controlled conditions, preserving `assertProcessP95` exactly (CI target 100 ms; local `max(100 ms, baseline p95 * 3 + 150 ms)`) and the required warm-up and sample counts. Each run prints min/p50/p95/max per side and the hook/baseline ratio, so a high baseline names host contention while a high ratio names runtime work. T16.1 distributions (quiet machine, serial measurement): sequential baseline p95 75.8 ms vs hook p95 144.7 ms (1.91x), interleaved 64.7 ms vs 137.9 ms (2.13x); the failing review run's own numbers (bare-node baseline p95 289.5 ms, hook 1120.6 ms, 3.87x in one sequential window) show host contention landing on the hook window only. T16.2 checks: PRD 03 does eagerly load boot/git/process modules on the neutral post-tool path (`runtime-composition.ts:9-11,57-59`) but the measured init cost is about 3 ms (`node:child_process` import) of the roughly 140 ms p95, so no production change was made under the "only as diagnosis requires" limit; the proven cause is the decoupled measurement windows under load. Lane check: vitest `sequence.groupOrder` is a real project-ordering option and the `parallel` (0) then `process` (1) groups serialize, so no lane change was needed. T16.3 results: focused suite 3/3 (post-tool 1.86x, pre-tool 2.01x, in-process p95 0.0 ms); `npm test` 171 files / 958 tests with in-suite post-tool 2.12x and pre-tool 1.93x; `npm run coverage` kept the overhead test green (post-tool 1.79x with baseline p95 inflated from 68 to 106 ms — the paired design absorbed the spike; pre-tool 1.93x; in-process 0.1 ms).
- Changed files: `tests/integration/runtime-overhead.test.ts` only (paired measurement, named `WARMUP_COUNT`/`SAMPLE_COUNT`, distribution reporting, `ProcessPathInput` parameter object). No production or lane file changed.
- Checks: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run dependencies:check`, `git diff --check` passed; focused overhead suite 3/3; `npm test` 171 files / 958 tests; `npm run coverage` 170 files / 958 tests with one failure outside this task's ownership (below). File stays at 96 physical lines with functions at or below 30 lines and no comments.
- Validated state: Windows 11, Node 24, Git available, built runtime assets. Platform limit unchanged: the 100 ms absolute target applies on CI (`assertProcessP95` CI branch); local Windows evidence uses the baseline-relative rule. Observed contention recorded: bare-node baseline p95 ranged 62-106 ms across quiet and coverage-loaded runs and 289.5 ms in the failing review run.
- Open items: the coverage gate's single miss is `tests/e2e/e2e-simulated-boot.test.ts` > "runs validation command within three tool calls before any edit", a T14-slice residual — its git-repo fixture loses the 1500 ms hook deadline under coverage-run load and receives the `DEC-EX-T14` safe omission instead of boot content ("expected '[ContextBrake boot v1] Boot omitted: .' to contain 'run `node --version`'"). Per this task's acceptance it stays independently tracked (T14 bounded runtime path), and the round's integrated full coverage gate must clear before the independent re-review. RV-01 and the Linux/macOS and Node 20/22 matrix remain as recorded.
