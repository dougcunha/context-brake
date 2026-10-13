# Stable execution context

Load in this exact order:

1. `tasks/prd-20-skills-wizard-discovery/prd.md`
2. `tasks/prd-20-skills-wizard-discovery/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Benchmark, documentation, and closing gates

## Outcome

The scan of 200 skills is benchmarked under 500 ms, the README describes the suggestion in the interactive setup, and every project gate passes with `init --yes` unchanged.

## Dependencies and boundaries

- Depends on: T04
- Unblocks: —
- In scope: `tests/bench/skill-catalog.test.ts` (TC-10), the README interactive-setup text, `docs/` where the wizard is described, and the final gates including TC-14.
- Out of scope: New behavior or flags.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| NFR-02 | `prd.md#non-functional-requirements` | 200 skills within 500 ms |
| FR-07 | `prd.md#functional-requirements` | Flags unchanged |
| TC-10, TC-14 | `techspec.md#test-approach` | Benchmark and smoke |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `tests.md` (benchmarks never in `npm test`).
- Existing code: `tests/bench/doctor-benchmark.test.ts` and `vitest.bench.config.ts` (pattern); the README "Interactive setup" section.
- Contract or integration: TechSpec "Test approach".

## Work

- [x] T05.1 Add `tests/bench/skill-catalog.test.ts` that creates 200 skill directories in a temporary project and asserts the p95 of the reader under 500 ms.
- [x] T05.2 Update the README interactive-setup section and `docs/` text to say the wizard suggests and lists skills found in the project folders of the selected harnesses.
- [x] T05.3 Run `npm run build`, `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run coverage`, `npm run test:bench`, `npm run test:budget`, `npm run package:smoke`; confirm `schemas:check` needed no regeneration.

## Acceptance criteria

- `npm run test:bench` passes TC-10.
- `npm run coverage`, `test:budget`, `schemas:check`, `package:smoke` pass; the e2e init smoke is unchanged.
- The README describes the suggestion without promising a certain match.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: the existing built-CLI smoke set through `npm run coverage`.
- Manual: none.
- Platforms: Windows run here; Linux and macOS unverified locally.
- Commands: `npm run test:bench`, `npm run coverage`, `npm run test:budget`, `npm run package:smoke`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: commands exit 0 with test counts.

## Affected files

- Modify: `README.md`, `docs/` pages that describe the wizard (only if they mention the snapshot question)
- Create: `tests/bench/skill-catalog.test.ts`

## Observability and recovery

- Operational signal: none
- Recovery: revert the docs and delete the benchmark

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `tests/bench/skill-catalog.test.ts` (200 skills, 20 samples after 2 warm-ups, p95 under 500 ms; it passed, about 1 s for 22 scans), the README interactive-setup bullet `Skill suggestions`, and the closing gates. No other `docs/` page mentions the snapshot question, so none changed.
- Changed files: created `tests/bench/skill-catalog.test.ts`; modified `README.md`, `tests/unit/bench-config.test.ts` (registers the new bench file in the pinned list).
- Checks: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run schemas:check` (no regeneration needed), `npm run coverage` (267 files, all pass, 96.06% statements), `npm run test:budget`, `npm run package:smoke`, `npm run test:bench` (7 files) all exit 0.
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted; Windows with Git Bash; Linux and macOS not run.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision
