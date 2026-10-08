# Stable execution context

Load in this exact order:

1. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
2. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — Report and clear the exclusion

## Outcome

`doctor` reports an excluded harness as excluded (never missing) and does not diagnose it; `init` and `doctor` text print `- <harness>: excluded by configuration` for excluded detections; `remove` deletes the configuration, exclusion included.

## Dependencies and boundaries

- Depends on: T05, T06
- Unblocks: T08
- In scope: `doctor-service` exclusion handling and shared `NO_PROJECT_HARNESS` finding; `doctor.ts`; `cli/output/detection-text.ts` and the two renderers; a regression test of `remove` (FR-08).
- Out of scope: report JSON schema changes (none: `detections[].state` already allows `excluded`); tolerant `remove` read (OI-02).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06 | `prd.md#functional-requirements` | Detection line says excluded by configuration; doctor reports excluded, not missing |
| FR-08 | `prd.md#functional-requirements` | `remove` deletes the configuration, exclusion included |
| NFR-04 | `prd.md#non-functional-requirements` | Text and JSON carry the same content |
| DEC-10 (doctor side), DEC-11 | `techspec.md#technical-decisions` | Doctor detection and targets; text lines |
| CMP-12, CMP-14, CMP-15 | `techspec.md#components-and-flow` | Doctor service, `doctor.ts`, `detection-text.ts` |
| TC-13 (text), TC-16 | `techspec.md#test-approach` | Plain init text; doctor and remove |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md`, `code-standards.md`, `tests.md`.
- Existing code: `src/core/services/doctor-service.ts:62-91` (`diagnoseProject`, 91 lines); `src/cli/commands/doctor.ts:36-60`; `src/cli/output/text.ts` (`renderInstallText`, `renderDoctorText`, 59 lines); `no-harness-finding.ts` (T06); `src/core/services/removal-service.ts` (targets and core deletions).
- Contract or integration: `techspec.md#contracts-and-data` (report shapes unchanged).
- Terrain: `techspec.md#terrain-baseline` (doctor-service at 91 lines: use the shared finding file to stay at or below 100).

## Work

- [x] T07.1 `diagnoseProject`: pass `exclude: config.excludedHarnesses − explicit` to `detectHarnesses`, remove excluded ids from the target set, and build `NO_PROJECT_HARNESS` through `no-harness-finding.ts`.
- [x] T07.2 Add `cli/output/detection-text.ts` (`excludedDetectionLines`) and print its lines in `renderInstallText` and `renderDoctorText`.
- [x] T07.3 Tests: `tests/integration/doctor-exclusion.test.ts` (TC-16: doctor lists it as excluded, no `INTEGRATION_MISSING`, no generic `NO_PROJECT_HARNESS` when only excluded harnesses exist; `--json` validates against `doctorReportSchema`; `remove --yes` deletes the configuration and leaves no ContextBrake artifact); text-line assertions in `init-exclusion.test.ts` (TC-13).

## Acceptance criteria

- After excluding OpenCode, `doctor` text contains `opencode: excluded by configuration` and JSON `detections` has `{ harness: "opencode", state: "excluded" }`; no finding reports it missing.
- A plain `init` prints the same excluded line and plans no OpenCode change.
- `remove --yes` after an exclusion deletes `context-brake.config.json` and the manifest and leaves no harness artifact; a second `remove` is a no-op.
- Both reports still validate against `doctorReportSchema` / `installReportSchema`; touched `src/` files end at or below 100 lines.

## Verification

- Unit: `excludedDetectionLines` output; shared finding variants.
- Integration: `runInProcessCli`/`runDoctor` with `fakeOverheadMeasurer`, `fakeProcessRunner`; read-back of files after `remove`.
- End-to-end: not applicable here (TC-17 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm test -- tests/integration/doctor-exclusion.test.ts tests/integration/init-exclusion.test.ts tests/unit/doctor-service.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-06`, `FR-08`, `TC-16`; lint, typecheck, coverage green.

## Affected files

- Modify: `src/core/services/doctor-service.ts`, `src/cli/output/text.ts`, `src/cli/commands/doctor.ts` (only if the config needs to pass through), `tests/integration/init-exclusion.test.ts`
- Create: `src/cli/output/detection-text.ts`, `tests/integration/doctor-exclusion.test.ts`

## Observability and recovery

- Operational signal: the excluded lines and detections in both reports.
- Recovery: revert the commit; reports stop listing exclusions.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `doctor` takes the exclusion from the configuration, reports the harness as `excluded` in `detections` (JSON) without diagnosing it (no `INTEGRATION_MISSING`), and builds `NO_PROJECT_HARNESS` through the shared finding (the all-excluded variant when applicable). `init` and `doctor` text print `  - <harness>: excluded by configuration`. `remove` after an exclusion deletes the configuration (exclusion included), the manifest, and all harness artifacts, and a second `remove` is a no-op (FR-08 needed no code).
- Changed files: modified `src/core/services/doctor-service.ts` (91 lines; net zero after using the shared finding), `src/cli/output/text.ts` (62 lines); created `src/cli/output/detection-text.ts`, `tests/integration/doctor-exclusion.test.ts`. `src/cli/commands/doctor.ts` needed no change: the exclusion arrives through the configuration it already passes.
- Checks: `npm run lint`, `npm run typecheck` clean; `npm run coverage`: 233 files, 1242 tests passed, 95.6 s, 94.26%; quality sweep over the three touched `src/` files returned no hit and no file above 100 lines; both reports still validate against `doctorReportSchema` / `installReportSchema` in the tests (no schema change).
- Validated state: HEAD `c845728` plus the uncommitted working tree of T01..T07; Windows 11, Node 24.19.
- Open items: none blocking. T08 runs the documentation and final gates, including `npm run test:budget` (the T02 run measured 126 s once; coverage runs since then took 92 to 105 s).

### ADR candidates

None - direct TechSpec implementation or local decision.
