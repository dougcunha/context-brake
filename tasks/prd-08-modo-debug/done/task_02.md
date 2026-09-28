# Stable execution context

Load in this exact order:

1. `tasks/prd-08-modo-debug/prd.md`
2. `tasks/prd-08-modo-debug/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Debug mode in `doctor`, end-to-end, and README

## Outcome

`doctor` prints `  - debug mode: on`, and `doctor --json` carries `debugMode: true` while the mode is in effect, without changing status or exit code. The built CLI and hook are covered end to end, and the README documents `--debug`/`--no-debug`.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: —
- In scope: CMP-07, CMP-08 (DEC-07); the regenerated `schemas/doctor-report.schema.json`; the README `init` options row and a short debug-mode paragraph; TC-10–TC-13.
- Out of scope: `doctor` checks of block content (PRD out of scope); any `init` behavior (T01).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06 (doctor, remove) | `prd.md#functional-requirements` | `doctor` shows the mode; `remove` clears the line |
| FR-03 | `prd.md#functional-requirements` | Hook end to end at low usage |
| NFR-02 | `prd.md#non-functional-requirements` | Built CLI on each platform through CI |
| DEC-07 | `techspec.md#technical-decisions` | `debugMode` field and `renderModeLines` |
| TC-10–TC-13 | `techspec.md#test-approach` | Tests to write |

## Context to recover on demand

- Rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `cli-output.md`.
- Existing code: `src/core/contracts/diagnostics.ts#doctorReportSchema`; `src/core/services/doctor-service.ts:98`; `src/cli/output/text.ts:60`; `src/cli/output/doctor-mode-text.ts`; `isDebugModeInEffect` from T01.
- Tests to mirror: `tests/e2e/e2e-light-mode.test.ts`, `tests/e2e/cli-runner.ts`, `tests/integration/doctor-light-mode.test.ts`; for the hook, `tests/e2e/e2e-measured-brake.test.ts`.
- Terrain: `doctor-service.ts` (99 lines) and `text.ts` (98 lines) are edited in place and must not grow.

## Work

- [x] T02.1 Add `debugMode: z.optional(z.literal(true))` to `doctorReportSchema`, set it in `doctor-service.ts:98`, and regenerate schemas.
- [x] T02.2 Add `renderModeLines(report)` to `doctor-mode-text.ts` and call it from `text.ts:60` (TC-10).
- [x] T02.3 `tests/e2e/e2e-debug-mode.test.ts`: `init --debug --yes`, `doctor`, `doctor --json`, `remove --yes`, and a Claude Code post-tool event at low usage (TC-11, TC-12).
- [x] T02.4 README: the `--debug`/`--no-debug` row in the `init` options, and a short section with the printed line, forced injection, the per-call cost, and the light-mode restriction.

## Acceptance criteria

- With debug on, `doctor` text includes `  - debug mode: on`, and `doctor --json` has `debugMode: true` and passes `doctorReportSchema`. With debug off or light mode on, both are absent. Status and exit code are the same as without debug.
- After `remove --yes`, no instruction file contains `Debug mode:`.
- The built hook, given a Claude Code post-tool fixture at low usage with `debug: true`, returns a response containing `[ContextBrake v2]`.
- `npm run schemas:check` passes with `debug` and `debugMode` in the published schemas.

## Verification

- Unit: TC-10.
- Integration: none new beyond T01.
- End-to-end: TC-11, TC-12 (built CLI and hook as child processes against fixture repositories in temporary directories).
- Manual: optional manual acceptance from `techspec.md#test-approach` (owner: user).
- Platforms: Windows locally; Linux and macOS through CI.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run schemas:check`, `npm run coverage`, `npm run package:smoke`.
- Environment dependency: none.
- Expected evidence: test names linked to TC-NN, full command outputs, and the quality profile over the diff.

## Affected files

- Modify: `src/core/contracts/diagnostics.ts`, `src/core/services/doctor-service.ts`, `src/cli/output/doctor-mode-text.ts`, `src/cli/output/text.ts`, `schemas/doctor-report.schema.json`, `README.md`.
- Create: `tests/unit/doctor-mode-text.test.ts` (or extend the existing test of that module), `tests/e2e/e2e-debug-mode.test.ts`.

## Observability and recovery

- Operational signal: `doctor` debug line and JSON field.
- Recovery: revert the task diff; no persisted data.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `doctorReportSchema` gains `debugMode: z.optional(z.literal(true))` (DEC-07). `doctor-service.ts` passes `debugMode: isDebugModeInEffect(input.config)` on the `buildDoctorReport` line, and `report-service.ts#buildDoctorReport` spreads `debugMode: true` only when set, so the strict parse still validates the report. `doctor-mode-text.ts#renderModeLines(report)` returns the checkpoint-mode line plus `  - debug mode: on\n`; `text.ts` calls it in place of `renderCheckpointModeLine`, which is no longer exported. `schemas/doctor-report.schema.json` is regenerated. README: `--debug`, `--no-debug` in the `init` options row and a `Debug Mode` section (printed line, forced injection and its per-call cost, persisted `injectionMode` unchanged, light-mode rules, `doctor` output, `--no-debug`).
- Changed files: `src/core/contracts/diagnostics.ts`, `src/core/services/{doctor-service,report-service}.ts`, `src/cli/output/{doctor-mode-text,text}.ts`, `schemas/doctor-report.schema.json` (generated), `README.md`. New tests: `tests/unit/doctor-mode-text.test.ts`, `tests/e2e/e2e-debug-mode.test.ts`. `report-service.ts` is outside the task's file list: `buildDoctorReport` builds and strictly parses the report, so the DEC-07 field has to pass through it (two lines, no contract change).
- Checks (Windows 11, Node 24.19.0, at base 791defe plus the T01 and T02 diffs): `npm run build` OK; `npm run typecheck` exit 0; `npm run lint` "ESLint: No issues found", exit 0; `npm run schemas:check` exit 0; `npm run coverage` 286 files, 1,821 passed, 3 skipped, 0 failed, 95.61% lines, exit 0 (606 s); `npm run package:smoke` exit 0.
- Test mapping: TC-10 `doctor-mode-text.test.ts` "doctor mode lines (TC-10, FR-06, DEC-07)" (4 cases: none, debug alone, checkpoint + debug in order, checkpoint alone). TC-11 and TC-12 `e2e-debug-mode.test.ts` "debug mode with the built CLI and Claude Code hook": after `init --yes`, a low-usage `PostToolUse` returns no context and `doctor --json` has no `debugMode`; after `init --debug --yes`, `doctor --json` passes `doctorReportSchema` with `debugMode: true` and the same process code, `status`, `exitCode`, and finding codes as the baseline; `doctor` text contains `  - debug mode: on` with the same exit code; the same event returns `[ContextBrake v2]`; after `remove --yes`, no file in the repository contains `Debug mode:`. TC-13 `npm run schemas:check`. Absence in light mode rests on `isDebugModeInEffect` (TC-01 in T01) plus the single `doctor-service.ts` call; there is no separate doctor test for it.
- Test note: the first e2e run took the doctor baseline before the hook call, and the hook call then added `BRAKE_BLOCKS_RECORDED` to the debug reading; the baseline now comes after the hook call, so the two readings differ only by the debug mode.
- Quality profile (touched TS files): QA-01 to QA-06 no hits; QA-04 not applicable (no hook files touched). QA-07 no hits: `doctor-service.ts` and `report-service.ts` are now at 100 lines, at the limit; `text.ts` went from 98 to 97. No new reservation hits.
- Validated state: working tree at 791defe plus the T01 and T02 diffs; T02-scoped diff 18,094 characters; Windows only. Linux and macOS through CI.
- Manual acceptance: optional (owner: user), not executed.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision.
