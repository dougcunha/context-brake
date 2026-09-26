# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md`
2. `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Doctor for the bridge and window source

## Outcome

`doctor` and `doctor --json` report whether the bridge is absent, installed, or inactive, where the window comes from, and the last recorded window. They warn, with remediation, on four conditions:

- the local command changed;
- the script is missing;
- the previous command changed;
- a tracked `.claude/settings.local.json`.

The built CLI completes `init --statusline-bridge`, `doctor --json`, and `remove` on a repository path with spaces and accents.

## Dependencies and boundaries

- Depends on: T03
- Unblocks: T05
- In scope:
  - `statusline-diagnostics.ts` and the Claude `diagnose` (DEC-10);
  - `context-window-report.ts` and the optional `contextWindow` section in `doctorReportSchema` and `buildDoctorReport`;
  - one line in `renderDoctorText`;
  - the regenerated `schemas/doctor-report.schema.json`;
  - end-to-end TC-21.
- Out of scope: capability text and README (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07 | `prd.md#functional-requirements` | Doctor state, source, last window, warnings |
| US-04 | `prd.md#stories-and-journeys` | Diagnose without reading code |
| NFR-04 | `prd.md#non-functional-requirements` | Optional section, `schemaVersion` 1 |
| NFR-06 | `prd.md#non-functional-requirements` | Paths with spaces and accents |
| DEC-10 | `techspec.md#technical-decisions` | Warnings and report section |
| CMP-11, CMP-12 | `techspec.md#components-and-flow` | Components |
| TC-16–TC-18, TC-21 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/code-standards.md`, `tests.md` (human-readable doctor formatting needs less depth), `cli-output.md` if present.
- Existing code:
  - `src/infrastructure/harnesses/claude-code/adapter.ts:40-66` — Claude `diagnose`.
  - `src/core/services/doctor-service.ts:51-99` — per-harness and project checks, `checkpointMode` pass-through (the file is at 100 lines and must not grow).
  - `src/core/contracts/diagnostics.ts:10-23` — report schema.
  - `src/core/services/report-service.ts:70-77` — `buildDoctorReport`.
  - `src/cli/output/text.ts:41-58` — text layout.
  - `src/infrastructure/runtime/runtime-state-reader.ts:9-23` — runtime state reads.
  - `scripts/generate-schemas.ts:9-22` — schema generation.
- Contract or integration: `techspec.md#contracts-and-data` (doctor report).
- Harness reference: none beyond T01.

## Work

- [x] T04.1 Create `statusline-diagnostics.ts` with the four warnings and remediation text; call it from the Claude `diagnose`. `git check-ignore` runs through the existing `ProcessRunner` with an argument array.
- [x] T04.2 Create `context-window-report.ts`; add the optional `contextWindow` section to `doctorReportSchema` and `buildDoctorReport`. Read `lastWindowTokens` from the most recently modified Claude Code ledger.
- [x] T04.3 Render one text line in `renderDoctorText`; regenerate the schema with `npm run build`.
- [x] T04.4 Write TC-16 to TC-18 and the end-to-end TC-21 (`tests/e2e/e2e-statusline-bridge.test.ts`).

## Acceptance criteria

- **Warnings (TC-16).** Each of the four conditions yields its warning with a remediation. A healthy install yields none.
- **Report (TC-17).** With the bridge installed, the report has `contextWindow: {bridge: 'installed', source, lastWindowTokens}` and one text line. Without Claude Code targeted, the section is absent.
- **Schema (TC-18).** `doctor --json` validates against the regenerated schema, with `schemaVersion: 1`.
- **End to end (TC-21).** The built CLI flow succeeds on a path with spaces and accents, and the local file is restored after `remove`.

## Verification

- Unit: TC-16 `tests/unit/statusline-diagnostics.test.ts`; TC-17 in `tests/unit/doctor-service.test.ts` and `tests/unit/cli-output-text.test.ts`.
- Integration: TC-18 `tests/integration/doctor-state-schema.test.ts` (process lane).
- End-to-end: TC-21 `tests/e2e/e2e-statusline-bridge.test.ts`.
- Manual: none.
- Platforms: Linux, macOS, Windows (CI).
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: `git` available for `git check-ignore`, as in existing doctor tests.
- Expected evidence: test count and exit code; `schemas:check` green; `doctor-service.ts` still at or under 100 lines.

## Affected files

- Modify:
  - `src/infrastructure/harnesses/claude-code/adapter.ts`
  - `src/core/contracts/diagnostics.ts`
  - `src/core/services/report-service.ts`
  - `src/cli/output/text.ts`
  - `schemas/doctor-report.schema.json` (generated)
- Create:
  - `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts`
  - `src/core/contracts/context-window-report.ts`
  - `tests/unit/statusline-diagnostics.test.ts`
  - `tests/e2e/e2e-statusline-bridge.test.ts`

## Observability and recovery

- Operational signal: the `contextWindow` doctor line and warnings.
- Recovery: the section is optional; consumers that ignore it are unaffected.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `diagnoseStatusline` (called from the Claude `diagnose`) returns warnings with remediation only when `.context-brake/runtime/claude-statusline.json` exists: `STATUSLINE_BRIDGE_INACTIVE` (local command differs from `installedCommand`), `STATUSLINE_BRIDGE_MISSING_SCRIPT` (the script path quoted in `installedCommand` does not exist, which also covers a moved repository), `STATUSLINE_PREVIOUS_CHANGED` (DEC-09 resolution with the recorded `previousLocal` as the local candidate, plus current project and user settings, differs from `previousCommand`), and `STATUSLINE_LOCAL_TRACKED` (`git -C <root> check-ignore -q .claude/settings.local.json` exits 1, through `HarnessContext.runner`; skipped without a runner or on timeout). A state file that does not parse gives `STATUSLINE_STATE_INVALID` (TechSpec "Errors, security, and recovery").
  - `contextWindow` (`src/core/contracts/context-window-report.ts`): `bridge` absent / installed / inactive, `source` `statusline` when the most recently modified Claude Code ledger has a window, else `contextWindowCeiling`, and `lastWindowTokens`. `doctor.ts` computes it with `readClaudeContextWindow` and passes it in `DoctorInput`; `diagnoseProject` keeps it only when `claude-code` is a target. `doctor-service.ts` stays at 100 lines: the field shares an existing line and is typed as `DoctorReport['contextWindow']`, so no import was added.
  - Text: one line `  - context window: <source> (bridge: <state>, last window: <n|unknown>)`.
  - `schemas/doctor-report.schema.json` regenerated: optional `contextWindow`, `schemaVersion` still 1.
- Changed files:
  - Created: `src/core/contracts/context-window-report.ts`, `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts`, `statusline-context-window.ts` (reader; not listed in the task, split to keep each file small), `tests/unit/statusline-diagnostics.test.ts` (TC-16), `tests/unit/statusline-context-window.test.ts` and `tests/unit/doctor-context-window.test.ts` (TC-17; new files because `doctor-service.test.ts` and `cli-output-text.test.ts` are at 96–99 lines), `tests/integration/doctor-context-window-schema.test.ts` (TC-18, process lane), `tests/e2e/e2e-statusline-bridge.test.ts` (TC-21).
  - Modified: `src/core/contracts/diagnostics.ts`, `src/core/services/report-service.ts`, `src/core/services/doctor-service.ts`, `src/cli/commands/doctor.ts` (two spread lines merged so `runDoctor` stays at 30 lines), `src/cli/output/text.ts`, `src/infrastructure/harnesses/claude-code/adapter.ts`, `statusline-settings.ts` (`statuslineOf` moved here from the planner for reuse), `statusline-planner.ts`, `schemas/doctor-report.schema.json`, `tests/test-lanes.ts`.
- Checks: `npm run build`, `npm run typecheck`, `npm run lint`, and `npm run schemas:check` exit 0. New suites pass: `statusline-diagnostics.test.ts` (9), `statusline-context-window.test.ts` (4), `doctor-context-window.test.ts` (4), `doctor-context-window-schema.test.ts` (2), and TC-21 `e2e-statusline-bridge.test.ts` (1, built CLI, about 20 s). Full `npm run coverage -- --coverage.reportOnFailure`: 258 of 259 files, all files 95.33% statements / 90.74% branches. The one failing file was `init-legacy-turn-limits.test.ts`: its first test timed out at 30 s (two `init` runs and a `doctor` that spawns hooks for overhead), and the timed-out `runCli` restored the stdout spy during the second test, which then saw partial output. The same file timed out in the T02 run, before any install or doctor change, and passes alone (4/4).
- Quality profile over the task diff: QA-01 to QA-10 no hits after replacing one `RegExp.exec` call (a QA-04 pattern match) with `String.match`.
- Validated state: HEAD 5917593 plus the T01–T04 working-tree diff; Windows 11, Node 20+, Git Bash.
- Open items:
  - TC-18 validates `doctor --json` with `doctorReportSchema`, the source the JSON Schema is generated from, and checks the published file declares `contextWindow` as optional at version 1; the project has no JSON Schema validator, and `schemas:check` confirms the file is current.
  - TC-21 isolates the user scope by setting `HOME` and `USERPROFILE` for the built CLI.

### ADR candidates

None - direct TechSpec implementation or local decision.
