# Task 1.0: Bootstrap the package, configuration, and schemas

## Overview

Create the compilable and testable Node.js 20+ TypeScript package foundation. Establish the canonical ContextBrake-owned configuration and report contracts, schema generation, configuration defaults and validation, and stable exit-severity policy needed by every later task. This task does not implement harness adapters or complete command workflows.

<skills>
### Skill Compliance

- `sdd-execute-task` applies when this task is implemented because it is the next bounded implementation unit derived from the approved PRD, TechSpec, and task plan.
- `sdd-execute-review` and `sdd-execute-qa` do not apply during implementation; they remain separate workflows after the feature tasks are complete.
</skills>

<rules>
### Compliance With AGENTS.md and Rules

Before implementation, read `AGENTS.md` and every file in `.agents/rules/` again. The most directly relevant rules are `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, and `cli-output.md`. `harness-adapters.md` and `file-changes.md` remain binding if the task touches their paths.

- Use strict ESM TypeScript, no `any`, exhaustive literal unions, immutable inputs, named constants, and Zod validation for every external value.
- Use npm only, commit `package-lock.json`, and verify that runtime dependencies have no install scripts.
- Enforce the 100-line TypeScript file, 30-line function, and three-parameter limits.
- Configure Vitest to fail below 80% for lines, statements, functions, and branches.
- Update the `AGENTS.md` Commands section as soon as the package commands exist.
- There are no planned deviations from the project rules.
</rules>

<requirements>
- RF15: Define the versioned `context-brake.config.json` contract and its defaults.
- RF16: Reject invalid configuration with the field, received value, and violated rule.
- RF17: Generate and publish the configuration JSON Schema from the canonical runtime schema.
- RF23: Establish canonical versioned report shapes and named exit codes for later text and JSON projections.
- Preserve the TechSpec decisions for camelCase configuration, `schemaVersion: 1`, Node.js 20+, npm, and built-in CLI parsing.
- Provide install, build, typecheck, lint, test, and coverage commands and record them in `AGENTS.md`.
</requirements>

## Subtasks

- [x] 1.1 Create `package.json`, `package-lock.json`, strict ESM TypeScript configuration, linting, Vitest coverage, and deterministic asset/schema build configuration.
- [x] 1.2 Add the `context-brake` executable entrypoint and minimal composition skeleton without implementing command behavior owned by Task 5.
- [x] 1.3 Define closed-set configuration, diagnostic, install-report, and CLI-error contracts in `src/core/contracts/`.
- [x] 1.4 Implement strict Zod schemas, default configuration creation, syntax/schema/cross-field validation, and actionable validation errors.
- [x] 1.5 Generate the configuration, doctor-report, and install-report Draft 2020-12 JSON Schemas and add a check that generated artifacts are current.
- [x] 1.6 Define named exit codes and the order-independent highest-severity calculation.
- [x] 1.7 Add the mapped unit tests and any focused schema-generation/package smoke tests required to cover the new production code.
- [x] 1.8 Document every package command in `AGENTS.md`, then run install, build, typecheck, lint, tests, and coverage.

## Implementation Details

Follow [techspec.md](../techspec.md), especially **Component Overview**, **Main Interfaces**, **ContextBrakeConfig**, **DoctorReport**, **InstallReport**, **CliErrorDocument**, **Technical Dependencies**, and build-order items 1 and 2. Keep generated JSON Schemas downstream of the Zod contracts so runtime validation and published schemas cannot drift.

## Related Acceptance Criteria

- CA-03
- CA-13
- CA-14
- CA-17

## Task Tests

### Unit Tests (if applicable)

- [x] UT-12 — Cross-field zone validation reports the source value
- [x] UT-20 — Exit severity is stable

## Handoff

### Result

Task 1 is implemented within scope and remains pending independent approval. The package now has strict ESM TypeScript, a cross-platform executable at the packed `dist/src/cli/main.js` bin path, canonical closed Zod contracts, canonical repository-relative file paths, async configuration loading, deterministic esbuild ESM runtime-asset build/check surfaces, and named exit severity policy. Command workflows, adapters, user-file mutation, and doctor behavior remain for later tasks.

### Contract and acceptance evidence

- RF15: `src/core/contracts/configuration.ts` defines `schemaVersion: 1`, camelCase configuration, defaults, harness set, telemetry zones, state storage, and instruction files.
- RF16 / UT-12 / CA-13: runtime and generated-schema path checks reject dot paths, `./`, repeated/trailing separators, `../`, nested escape, backslash, UNC, drive, and absolute paths; valid canonical POSIX file paths, including one-character `a`, pass and canonical duplicate identities are rejected. Cross-field errors report `telemetry.zones.yellowMaxPercentage`, received `40`, and the separate rule `must be greater than greenMaxPercentage`. `ProjectConfigStore` preserves file path, cause, and structured syntax/schema issues through `InvalidConfigurationError`.
- RF17 / CA-17 foundation: generated configuration, doctor-report, and install-report Draft 2020-12 schemas are current; report plan changes, conflicts, harness plans, and outcomes use named strict schemas rather than `unknown` items. CLI errors enforce `INVALID_ARGUMENTS=64`, `INTERRUPTED=130`, and all other listed error codes at `2`.
- RF23 / UT-20: named health, warning, error, invalid-argument, and interrupted codes remain order-independent.
- CA-03, CA-14: closed diagnostic/report contracts are established for later detection/doctor workflows; no incomplete workflow behavior is claimed here.
- Entry-point evidence: `npm run package:smoke` and `node dist/src/cli/main.js` execute successfully; `npm pack --dry-run --json` lists `dist/src/cli/main.js`.

Established interfaces: `ContextBrakeConfig`, `ProjectConfigStore.read(): Promise<ContextBrakeConfig>`, `DiagnosticFinding`, `DoctorReport`, `InstallReport`, `CliErrorDocument`, strict `ChangePlan` nested types, `InvalidConfigurationError`, `EXIT_CODES`, and `exitCodeForSeverities(readonly Severity[]): number`.

### Files changed

`package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.check.json`, `eslint.config.js`, `vitest.config.ts`, `.gitignore`, `AGENTS.md`, `scripts/*`, `assets/runtime/entry.ts`, `src/cli/*`, `src/core/contracts/*`, `src/core/validation/configuration-validator.ts`, `src/infrastructure/storage/project-config-store.ts`, `schemas/*.schema.json`, and focused unit tests under `tests/unit/`.

### Commands and results

- Review follow-up: `npm run build`, `npm run schemas:check`, and focused configuration/schema tests — exit 0; 19 tests passed, including exact unsafe-path cases and one-character `a`.
- `npm install --ignore-scripts` — exit 0; 218 packages audited; npm reported 3 moderate advisories.
- `npm run build` — exit 0; schemas, deterministic esbuild ESM runtime asset, and TypeScript output built.
- `npm run typecheck` — exit 0; `tsconfig.check.json` covers production, tests, and scripts.
- `npm run lint` — exit 0; configured 100-line file, 30-line function, 3-parameter, and module-level function rules.
- `npm test` — exit 0; 31 tests passed.
- `npm run coverage` — exit 0; 100% lines/statements/functions, 88.37% branches; all production modules included.
- `npm run schemas:check` — exit 0; generated schemas current.
- `npm run dependencies:check` — exit 0; traversed the 1-package runtime dependency closure using lockfile `hasInstallScript`; dev tooling was not treated as runtime scope.
- `npm run assets:check` — exit 0; write-false esbuild rebuild matches the generated asset byte-for-byte.
- `npm run package:smoke` — exit 0; packed-file dry-run and actual built bin execution succeeded; source asset is not published.
- `node dist/src/cli/main.js doctor` — exit 1 with the expected Task 1 deferred-work warning; direct entrypoint execution is confirmed.

Validated versions: Node v24.19.0, npm 11.17.0, TypeScript 5.9.3, `@types/node` 20.19.43, Zod 4.6.4, esbuild 0.25.12, Vitest 3.2.7, ESLint 9.39.5.

### Quality profile and uncertainty

No TechSpec Terrain baseline or reservation list exists beyond the stated 80% thresholds; this remains a recorded profile gap. No new blocking quality hits remain. Cross-platform PowerShell/Git Bash, manual TTY/JSON behavior, and later command-level acceptance are not run or claimed because they belong to later tasks or require completed workflows.

### Herdr registry

`context-brake/task-1`: review attempt 3 findings fixed; full verification green; task remains pending independent approval; no dependency or scope block.

### Integration Tests (if applicable)

Not applicable at this task boundary; command-level invalid-config behavior is completed by IT-10 in Task 5.

### End-to-End Tests (if applicable)

Not applicable until the command workflows and adapters exist.

## Relevant Files

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `eslint.config.js`
- `vitest.config.ts`
- Build configuration for standalone assets and generated schemas
- `src/cli/main.ts`
- `src/cli/exit-codes.ts`
- `src/core/contracts/configuration.ts`
- `src/core/contracts/diagnostics.ts`
- `src/infrastructure/storage/project-config-store.ts`
- `schemas/context-brake.config.schema.json`
- `schemas/doctor-report.schema.json`
- `schemas/install-report.schema.json`
- `tests/unit/`
- `AGENTS.md`
- `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`
