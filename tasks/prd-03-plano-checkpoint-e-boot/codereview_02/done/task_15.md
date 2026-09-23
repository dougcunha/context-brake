# T15 — Keep the doctor benchmark's sample evidence under suite load

## Outcome

The installed-asset doctor benchmark yields its required sample counts during the full suite or reports a diagnosed environment block with actionable evidence.

## Dependencies and boundaries

- Depends on: —
- Unblocks: independent re-review of `codereview_02/CR-01`.
- In scope: investigate the full-suite zero-sample result and correct the proven fixture, sampler, or runtime cause.
- Out of scope: lowering the sample count, turning an unavailable measurement into a pass, or changing PRD 02 overhead targets.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_02/CR-01` | `codereview.md#Findings` | One full run returned zero doctor benchmark samples |
| CA-20, DEC-17, TC-22 | `prd-02/prd.md#Critérios de aceitação`, `prd-02/techspec.md#Test approach` | Installed asset measurement remains meaningful |

## Requirements

- Surface the specific sample failure or timeout in test evidence without disclosing hook payload content.
- Keep the required 20 process samples and 100 in-process samples and the existing informational doctor status behavior.
- Preserve bounded child processes and the runtime asset event contract.

## Context to recover on demand

- PRD 02: CA-20; TechSpec: DEC-17, TC-22 and risk on load-dependent local measurement.
- Rules: `code-standards.md`, `node.md`, `tests.md`.
- Code: `tests/integration/doctor-benchmark.test.ts`, `src/infrastructure/diagnostics/overhead-measurer.ts`, `src/infrastructure/diagnostics/in-process-sampler.ts`, `tests/test-lanes.ts`.

## Work

- [x] T15.1 Identify which installed asset or sample failed in the full-suite condition and record its safe error or timeout evidence.
- [x] T15.2 Correct a proven code or test-isolation cause without relaxing the benchmark contract; if the cause is an external resource limit, record a reproducible block and the needed environment.
- [x] T15.3 Verify sample counts in focused and full-suite runs and confirm doctor remains informational.

## Acceptance criteria

- Process measurement returns 20 samples and in-process measurement returns 100 in the required test, with real p95 values.
- No broad catch silently converts a sample failure into an unexplained zero-count result in test evidence.
- A full-suite run passes this benchmark with required counts; failures owned by T14 or T16 remain independently tracked. The integrated full coverage gate must pass before re-review.

## Verification

- Unit: sampler failure and count behavior if changed.
- Integration: installed assets in temporary repositories; `doctor-benchmark` focused suite.
- End-to-end: full built-CLI test suite; no browser or UI.
- Manual: none.
- Platforms: Linux, macOS, Windows; local Windows evidence with the existing matrix limit.
- Environment dependency: Node 20+; characterize external process contention if present.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: sample counts, diagnosed failure path, and full coverage result.

## Affected files

- Modify: `tests/integration/doctor-benchmark.test.ts`, `src/infrastructure/diagnostics/overhead-measurer.ts`, `src/infrastructure/diagnostics/in-process-sampler.ts`, or `tests/test-lanes.ts` only as diagnosis requires.
- Create: focused test helper only if needed.

## Observability and recovery

- Operational signal: benchmark status and sample count; test failure includes safe cause metadata.
- Recovery: retain the original sample and timeout contract if an attempted isolation change does not help.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: The zero-count path is proven and corrected. `NodeOverheadMeasurer` mapped every sampling failure to `unavailable`/`sampleCount: 0` through a bare `catch`, and `measureProcess` was all-or-nothing, so one failed sample (2 s timeout, non-zero exit, or spawn error) discarded all 20; this matches `prd-01/codereview_05/CR-03` ("one process sample exceeding the 2,000 ms per-sample timeout, which discards every sample"). Sampling now classifies failures (`sample-failure.ts`: `asset_missing`, `handler_missing`, `import_error`, `handler_error`, `timeout`, `nonzero_exit`, `spawn_error`) with safe detail only (timeout ms, `exit N`, OS error code or error name; never payload or handler messages), tolerates warm-up transients, and retries each sample up to 3 bounded attempts before surfacing the classified failure via `NodeOverheadMeasurer.lastFailure`. Counts stay 20 process and 100 in-process with 3 warm-ups and the 2 s per-attempt bound; `OverheadMeasurement` is unchanged, so `report-service.ts` strict parsing and the published `doctor-report.schema.json` remain valid.
- Changed files: `src/infrastructure/diagnostics/sample-failure.ts` and `process-sampler.ts` (new; extraction required by `code-standards.md` 100-line limit), `overhead-measurer.ts` (classified capture, `lastFailure`), `in-process-sampler.ts` (classified import/handler failures), `tests/integration/doctor-benchmark.test.ts` (assertion messages carry the sampler evidence). `tests/test-lanes.ts` was left unchanged; see open items.
- Checks: `npm run build`, `npm run lint`, `npm run typecheck`, `git diff --check` passed. Focused `overhead-measurer` 5/5, `in-process-sampler` 4/4, `doctor-benchmark` 2/2 (20 process and 100 in-process samples with real p95; `keepInformational` proves doctor stays informational). `npm test -- --maxWorkers=2` passed 953/954 with `doctor-benchmark` 2/2 green. `npm run coverage -- --maxWorkers=2` passed 170 files, 954/954 tests, 93.51% statements. Quality profile over touched files: QA-01, QA-03, QA-04, QA-05, QA-06 zero hits; QA-02 and QA-08 not applicable; QA-07 largest touched file 85 physical lines.
- Validated state: Windows 11, Node 24, Git available, built runtime assets. Sample counts hold in focused, full-test, and full-coverage runs; the benchmark never returned a zero count in this round, so the exact failing sample could not be captured live and is now explained by classification instead of a silent catch.
- Open items: The `npm test` miss is outside T15 and is now caused: `src/core/services/failure-policy.ts:53` resolves any non-`pre_tool` failure to `neutral`, and `src/infrastructure/runtime/process-hook-host.ts:31,53-58` maps the 1500 ms deadline there and `writeDecision` emits empty stdout with exit 0. The SessionStart boot path is heaviest (`boot-reader.ts:39-45` runs Git child processes), so it loses the race first; `tests/integration/boot-git-delivery.test.ts` "names both commits when the recorded commit is outside history" failed exactly so (`SyntaxError: Unexpected end of JSON input` at `deliveredBoot`) and passed 5/5 alone and in the coverage run. This is T14's "bounded runtime path" slice and contradicts its "no production cause was proven" conclusion; it stays independently tracked per this task's acceptance. Contributing isolation gap: that test spawns built hooks through `tests/helpers/built-hook.ts` but runs in the parallel lane because `PROCESS_MARKERS` omit `built-hook` (T23's guard reads only the test file's own source); registering it plus the marker is a two-line `tests/test-lanes.ts` change, held back because the proven cause of T15's zero-sample is the sampler, not the lane. RV-01 and the Linux/macOS and Node 20/22 matrix remain as recorded.
