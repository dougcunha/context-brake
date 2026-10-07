# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md`
2. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Inject the doctor overhead measurer

## Outcome

`runDoctor` uses `env.overheadMeasurer` when present and the real `NodeOverheadMeasurer` otherwise. `runCli` in `tests/helpers/delegated-world.ts` passes a fake measurer, so in-process `doctor` tests sample no process.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03, T04
- In scope: `CommandEnv.overheadMeasurer`; the `runDoctor` wiring; a fake measurer helper that returns a fixed `pass` result per harness; `runCli` passes it; an assertion that in-process doctor reports the fake result (the in-process half of TC-09).
- Out of scope: built-CLI tests (T03, T04); the bench suites (T01).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, FR-05 | `prd.md#functional-requirements` | Faster in-process doctor tests |
| DEC-02 | `techspec.md#technical-decisions` | Injected measurer |
| CMP-04, CMP-05 | `techspec.md#components-and-flow` | CLI wiring and test helper |
| TC-09 | `techspec.md#test-approach` | In-process half |

## Context to recover on demand

- Applicable skills and rules: `tests.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`; quality profile QA-01 to QA-07 and the Terrain baseline in `techspec.md#quality-profile`, `cli-output.md`
- Existing code: `src/cli/commands/doctor.ts:runDoctor`; `src/cli/commands/init.ts:20`; the measurer port that `src/core/services/doctor-service.ts:diagnoseProject` takes; `tests/helpers/delegated-world.ts:runCli`.

## Work

- [x] T02.1 Add `overheadMeasurer?` to `CommandEnv` and use it in `runDoctor`.
- [x] T02.2 Add the fake measurer helper, pass it from `runCli`, and assert it in `doctor-light-mode`.
- [x] T02.3 Run the doctor suites that use `runCli` and record their file times before and after.

## Acceptance criteria

- The built `doctor` still samples; no production default changes.
- `doctor-active-sessions`, `doctor-light-mode`, `auto-restart-doctor`, `init-legacy-turn-limits`, and `statusline-install` pass and no longer spend seconds per doctor call.

## Verification

- Unit: none.
- Integration: the doctor suites above (TC-09, in-process half).
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows (local).
- Commands: `npx vitest run <the suites above>`, `npm run lint`, `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: suite results with file times before and after.

## Affected files

- Modify: `src/cli/commands/init.ts`, `src/cli/commands/doctor.ts`, `tests/helpers/delegated-world.ts`, `tests/integration/doctor-light-mode.test.ts`
- Create: `tests/helpers/fake-overhead-measurer.ts`

## Observability and recovery

- Operational signal: none beyond the test output.
- Recovery: revert the wiring; the default path is unchanged.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result (DEC-02, FR-01, FR-02, FR-05):
  - `CommandEnv` gains `overheadMeasurer?: OverheadMeasurer`. `runDoctor` uses it, or `new NodeOverheadMeasurer(projectRoot)` when it is absent, so the built CLI still samples.
  - `tests/helpers/fake-overhead-measurer.ts` returns a fixed `pass` result per harness: process harnesses at 100 ms, in-process harnesses at 15 ms, with `sampleCount` 1 and p95 1 ms.
  - `runCli` (`delegated-world`) and `statusline-world` pass the fake, and so do the direct `runDoctor` calls in `doctor-context-window-schema`, `doctor-manual-removal`, and `invalid-config`.
  - A new test in `doctor-light-mode` asserts the injected measurement (TC-09, in-process half).
- Changed files:
  - `src/cli/commands/init.ts`, `src/cli/commands/doctor.ts`;
  - `tests/helpers/delegated-world.ts`, `tests/helpers/statusline-world.ts`;
  - `tests/integration/{doctor-light-mode,doctor-context-window-schema,doctor-manual-removal,invalid-config}.test.ts`;
  - created `tests/helpers/fake-overhead-measurer.ts`.
- Checks (Windows 11, Git Bash, after `npm run build`):
  - 10 doctor and status line suites pass: 38 tests.
  - File times, baseline → now:

    | Suite | Baseline | Now |
    | --- | --- | --- |
    | `doctor-active-sessions` | 23.7 s | 3.4 s |
    | `auto-restart-doctor` | 15.0 s | 2.7 s |
    | `init-legacy-turn-limits` | 11.5 s | 1.1 s |
    | `statusline-install` | 9.5 s | 3.1 s |
    | `doctor-light-mode` | 8.0 s | 1.7 s |

  - `rtk proxy npx eslint .` and `npm run typecheck` are clean.
  - Quality profile: no blocking hit. `init.ts` merges the new type into its existing `diagnostics.js` import.
- Validated state: base `cca3a29` plus T01 and T02.
- Open items: none. The built `doctor` smoke with the real measurer is T04 (TC-09, built half).

### ADR candidates

None - direct TechSpec implementation or local decision.
