# Task 5.0: Implement init, remove, and doctor

## Overview

Deliver the complete user-facing feature by wiring the approved core policies, file engine, and eight adapters into `context-brake init`, `context-brake remove`, and `context-brake doctor`. The commands must share canonical reports, respect non-interactive safety, preserve exact plans and ownership, continue safe work after isolated adapter failures, and provide deterministic text/JSON output and exit codes.

<skills>
### Skill Compliance

- `sdd-execute-task` applies when this task is implemented.
- `sdd-execute-review` and `sdd-execute-qa` remain separate feature-level workflows after implementation; browser QA is not applicable to this CLI.
</skills>

<rules>
### Compliance With AGENTS.md and Rules

Before implementation, read `AGENTS.md` and every file in `.agents/rules/` again. Every rule file is directly relevant because this task composes core policy, adapters, user-file changes, process execution, terminal output, and all three test layers.

- Keep domain decisions in core services, vendor translation in adapters, and dependency injection in the CLI composition root.
- Validate configuration before write-capable workflows; `doctor` must remain read-only and continue configuration-independent diagnostics after a config error.
- Never prompt without a TTY, never write without the required confirmation, and keep legacy migration and state removal as separate explicit decisions.
- Render results on stdout, warnings/errors/progress on stderr, exactly one document on JSON stdout, and accessible text labels independent of color.
- Handle SIGINT and SIGTERM without leaving partial temporary files or starting duplicate shutdown work.
- Use the approved immutable plan for both preview and application; do not re-plan after confirmation.
- There are no planned deviations from the project rules.
</rules>

<requirements>
- RF4: Expose explicit harness inclusion and exclusion through the fixed command surface.
- RF5 through RF9: Orchestrate adapter registration, preservation, isolated failures, support levels, and version warnings.
- RF10 through RF14: Create the protocol, manage instruction references, respect missing files and physical identity, and require dedicated legacy-migration consent.
- RF15 through RF17: Create and validate canonical configuration and expose its published schema.
- RF18: Make `init --dry-run` a side-effect-free projection of the exact applicable plan.
- RF19: Remove only exact owned content and retain plan/checkpoint state unless `--remove-state` explicitly selects it.
- RF20: Diagnose detected harnesses, installation state, versions, support levels, and missing capabilities.
- RF21: Validate configuration, markers, protocol, and optional plan/checkpoint files without repairing them.
- RF22: Measure installed-runtime p95 overhead and compare it with the appropriate target.
- RF23: Keep human and JSON findings equivalent with stable health, warning, error, usage, and interrupt exit codes.
- Meet the five-second core-command target separately from confirmation and the explicit benchmark phase.
</requirements>

## Subtasks

- [x] 5.1 Implement installation, removal, doctor, and canonical report services against core ports without importing infrastructure into `src/core/`.
- [x] 5.2 Implement the exact `init`, `remove`, and `doctor` option contracts, repeated-value handling, usage validation, TTY policy, and signal handling from the TechSpec.
- [x] 5.3 Implement `init` detection, planning, dry-run, confirmation, partial application, manifest recording, and install summary behavior.
- [x] 5.4 Implement `remove` planning and application for exact registered entries and unchanged assets, with separate explicit state-file removal.
- [x] 5.5 Implement read-only doctor checks for configuration, detection, integration state, versions, capabilities, markers, protocol, optional plan/checkpoint files, and installed assets.
- [x] 5.6 Implement side-effect-free process and in-process benchmark execution, monotonic sampling, nearest-rank p95, target comparison, and unavailable results.
- [x] 5.7 Implement accessible English text rendering, single-document JSON rendering, stable sorting, remediation messages, `NO_COLOR`, non-TTY, and exit mapping.
- [x] 5.8 Implement the CLI composition root and command dispatch with injected storage, process, benchmark, and harness adapters.
- [x] 5.9 Add the mapped unit, integration, and built-CLI E2E tests in isolated temporary repositories.
- [x] 5.10 Run build, typecheck, lint, tests, and coverage.

## Implementation Details

Follow [techspec.md](../techspec.md), especially **Main Interfaces**, the fixed public command table, **InstallReport**, **DoctorReport**, **CliErrorDocument**, **Testing Approach**, **Monitoring and Observability**, and the command/removal/configuration decisions under **Key Decisions**. Reference the models and option contracts directly rather than introducing alternate report or flag shapes.

## Related Acceptance Criteria

- CA-01
- CA-02
- CA-03
- CA-04
- CA-05
- CA-06
- CA-07
- CA-08
- CA-09
- CA-10
- CA-11
- CA-12
- CA-13
- CA-14
- CA-15
- CA-16
- CA-17
- CA-18

## Task Tests

### Unit Tests (if applicable)

- [x] UT-04 — Repeated adapter merge is idempotent
- [x] UT-11 — Removal targets exact owned content
- [x] UT-13 — Missing integration is an error finding
- [x] UT-16 — Text and JSON use one finding model
- [x] UT-17 — Nearest-rank overhead p95 is deterministic

### Integration Tests (if applicable)

- [x] IT-09 — Safe removal preserves unrelated content and applies state consent
- [x] IT-10 — Invalid ContextBrake config blocks writes and remains diagnosable
- [x] IT-11 — Doctor detects manual integration removal
- [x] IT-14 — Doctor benchmark exercises installed assets

### End-to-End Tests (if applicable)

- [x] E2E-01 — Built CLI installs Claude non-interactively
- [x] E2E-02 — Built CLI installs two detected harnesses
- [x] E2E-03 — No project harness exits with warning
- [x] E2E-04 — Three consecutive installations are byte-idempotent
- [x] E2E-05 — Invalid adapter input yields partial installation
- [x] E2E-06 — Dry-run then confirmed run match
- [x] E2E-07 — Remove uninstalls owned integration only by default
- [x] E2E-08 — Doctor JSON validates against published schema

## Relevant Files

- `src/core/services/installation-service.ts`
- `src/core/services/removal-service.ts`
- `src/core/services/doctor-service.ts`
- `src/core/services/report-service.ts`
- `src/infrastructure/diagnostics/overhead-measurer.ts`
- `src/cli/main.ts`
- `src/cli/argument-parser.ts`
- `src/cli/composition-root.ts`
- `src/cli/commands/init.ts`
- `src/cli/commands/remove.ts`
- `src/cli/commands/doctor.ts`
- `src/cli/output/text.ts`
- `src/cli/output/json.ts`
- `src/cli/exit-codes.ts`
- `tests/unit/`
- `tests/integration/`
- `tests/e2e/`
- `tests/fixtures/`
- `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`

## Handoff

- **Status:** DONE
- **Changed Files:**
  - `src/core/contracts/diagnostics.ts` (added `OverheadMeasurement`, `OverheadMeasurer`, `HarnessDiagnostic` contracts and strict validation schemas)
  - `src/core/services/report-service.ts` (canonical report building for InstallReport, DoctorReport, CliErrorDocument, sorting findings by severity and code, sanitizing plans for strict schema compliance)
  - `src/core/services/installation-builder.ts` (pure configuration change and manifest change planning with single input object)
  - `src/core/services/installation-service.ts` (orchestration of detection, configuration, protocol, instruction changes, adapter planning, and manifest recording; isolated conflict-to-error conversion)
  - `src/core/services/instruction-service.ts` (relaxed optional properties to allow `undefined` under `exactOptionalPropertyTypes`)
  - `src/core/services/removal-helper.ts` (pure instruction block removal and asset deletion verification against sha256 checksums)
  - `src/core/services/removal-service.ts` (orchestration of active/manifest harness uninstall planning, asset deletions, protocol removal, and optional state removal)
  - `src/core/services/doctor-checks.ts` (pure diagnostic checkers for configuration, instruction markers, protocol file, and state files)
  - `src/core/services/doctor-service.ts` (orchestration of read-only diagnostics across configuration, harness adapters, version probes, benchmarks, and project files)
  - `src/core/services/change-plan-service.ts` (skip deletion of non-existent snapshots during change planning)
  - `src/infrastructure/diagnostics/p95.ts` (deterministic nearest-rank p95 calculation)
  - `src/infrastructure/diagnostics/overhead-measurer.ts` (process hook and in-process extension execution benchmark with warmup, monotonic sampling, and target evaluation)
  - `src/cli/argument-parser.ts` (`node:util.parseArgs` CLI parser for `init`, `remove`, `doctor`, and `help` commands)
  - `src/cli/argument-validator.ts` (validation for harness IDs, mutual exclusivity of include/exclude, path boundaries)
  - `src/cli/confirmation.ts` (TTY checking and interactive confirmation prompt; `ConfirmationRequiredError` on non-TTY without `--yes`)
  - `src/cli/detection-collector.ts` (collecting detection sources and version probes; `buildHarnessContext`)
  - `src/cli/snapshot-helper.ts` (collecting pre-flight snapshots across configuration, manifest, instructions, protocol, and harness files)
  - `src/cli/output/json.ts` (single JSON document serialization to stdout)
  - `src/cli/output/text.ts` (accessible English text formatting with `[OK]`, `[WARN]`, `[ERROR]`, finding codes, and next steps)
  - `src/cli/commands/init.ts` (CLI command handler for `context-brake init`)
  - `src/cli/commands/remove.ts` (CLI command handler for `context-brake remove`)
  - `src/cli/commands/doctor.ts` (CLI command handler for `context-brake doctor`)
  - `src/cli/composition-root.ts` (command dispatcher and error-handling composition root)
  - `src/cli/main.ts` (CLI entrypoint, signal handling for SIGINT/SIGTERM, argument error handling)
  - `vitest.config.ts` (configured 30s test timeout for Windows subprocess benchmarks)
  - `tests/unit/idempotent-adapter-merge.test.ts` (UT-04)
  - `tests/unit/removal-service.test.ts` (UT-11)
  - `tests/unit/doctor-service.test.ts` (UT-13)
  - `tests/unit/report-service.test.ts` (UT-16)
  - `tests/unit/overhead-p95.test.ts` (UT-17)
  - `tests/unit/cli-output-text.test.ts` (text output formatting unit tests)
  - `tests/unit/doctor-checks.test.ts` (doctor check units)
  - `tests/unit/main.test.ts` (main entrypoint unit tests)
  - `tests/integration/safe-removal.test.ts` (IT-09)
  - `tests/integration/invalid-config.test.ts` (IT-10)
  - `tests/integration/doctor-manual-removal.test.ts` (IT-11)
  - `tests/integration/doctor-benchmark.test.ts` (IT-14)
  - `tests/e2e/cli-runner.ts` (child process runner helper for built CLI in `dist/src/cli/main.js`)
  - `tests/e2e/e2e-01-02.test.ts` (E2E-01, E2E-02)
  - `tests/e2e/e2e-03-04.test.ts` (E2E-03, E2E-04)
  - `tests/e2e/e2e-05-06.test.ts` (E2E-05, E2E-06)
  - `tests/e2e/e2e-07-08.test.ts` (E2E-07, E2E-08)
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_5.md`
- **Executed Commands & Results:**
  - `npm run build`: Exit 0 (schemas generated, assets built, TypeScript compilation successful)
  - `npm run typecheck`: Exit 0 (all TypeScript files pass strict typecheck)
  - `npm run lint`: Exit 0 (clean ESLint, <=100 lines/file, <=30 lines/function strictly enforced)
  - `npm test`: Exit 0 (all 47 test files and 156 tests pass)
  - `npm run coverage`: Exit 0 (Statements: 89.91%, Branches: 80.88%, Functions: 95.88%, Lines: 89.91% - all exceeding >=80% requirement)
  - `npm run schemas:check`: Exit 0 (all schemas up to date)
  - `npm run dependencies:check`: Exit 0 (zero install scripts in runtime dependencies)
  - `npm run package:smoke`: Exit 0 (package tarball created and tested successfully)
- **Validated Version:** Node.js 24.19.0 / npm, `context-brake` 1.0.0
- **Quality Profile Reservation Hits:** None
- **Pending Items:** None
