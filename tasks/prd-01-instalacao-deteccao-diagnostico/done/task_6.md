# Task 6.0: Harden packaging, documentation, and cross-platform delivery

## Overview

Finish the feature as a publishable npm package and verify the documented quick-start on Linux, macOS, and Windows. Validate package contents, runtime-asset durability, schemas, performance, symlink behavior, PowerShell and Git Bash execution, coverage gates, and user documentation without adding new product scope.

<skills>
### Skill Compliance

- `sdd-execute-task` applies when this task is implemented.
- Feature-wide code review and QA should be invoked separately after this task; this task supplies the automated evidence they will consume.
</skills>

<rules>
### Compliance With AGENTS.md and Rules

Before implementation, read `AGENTS.md` and every file in `.agents/rules/` again. `tests.md`, `node.md`, `cli-output.md`, `file-changes.md`, and `harness-adapters.md` govern the release checks, while all general code rules continue to apply to fixes made during hardening.

- Run the built CLI against copied fixture repositories in temporary directories; do not use a browser, server, port, network, vendor credentials, or installed harnesses.
- Exercise Linux, macOS, and Windows; enable Windows symlink privileges and cover both PowerShell and Git Bash launch behavior.
- Treat failures found during hardening as defects in the owning earlier task and fix them without weakening tests or coverage thresholds.
- Publish only required CLI output, schemas, protocol source, and standalone runtime assets; exclude secrets, user data, and development debris.
- There are no planned deviations from the project rules.
</rules>

<requirements>
- CA-19: The README quick-start must reach an error-free diagnosis within two minutes on a supported fixture.
- CA-20: The critical installation, idempotency, and symlink scenarios must pass on the required operating systems and shells.
- RF17: Confirm that the generated configuration schema is present and usable in the packed npm artifact.
- RF23: Confirm stable text/JSON behavior and exit codes from the packed executable.
- Enforce the TechSpec package-content, five-second core-command, 80% coverage, privacy, offline, and Node.js 20+ constraints.
</requirements>

## Subtasks

- [x] 6.1 Write or update the README quick-start and command reference using only behavior proven by the implemented CLI.
- [x] 6.2 Add `npm pack` inspection and smoke tests for the executable, generated schemas, protocol source, manifest inputs, and every standalone runtime asset.
- [x] 6.3 Add the timed quick-start E2E workflow and separately assert the five-second core-command target outside confirmation and benchmark time.
- [x] 6.4 Configure CI for supported Node.js versions on Linux, macOS, and Windows with explicit Windows symlink capability.
- [x] 6.5 Run the critical fixtures through PowerShell and Git Bash launch paths on Windows and through native shells on Linux and macOS.
- [x] 6.6 Run the complete UT-01 through UT-20, IT-01 through IT-16, and E2E-01 through E2E-10 suite with all four coverage metrics at or above 80%.
- [x] 6.7 Run install, build, typecheck, lint, test, coverage, schema-current, package-content, and packed-CLI smoke commands from a clean checkout state.
- [x] 6.8 Reconcile README, `AGENTS.md` commands, package metadata, and research notes with the verified implementation before completion.

## Implementation Details

Follow [techspec.md](../techspec.md), especially **End-to-End Tests**, build-order item 8, **Technical Dependencies**, **Monitoring and Observability**, **Known Risks**, and **Compliance With AGENTS.md and Rules**. This task validates the already specified feature and must not introduce additional harnesses, global installation, auto-update, remote agents, or runner behavior.

## Related Acceptance Criteria

- CA-19
- CA-20

## Task Tests

### Unit Tests (if applicable)

Run the complete mapped unit suite as a regression gate; no new acceptance-level unit case is assigned solely to this task.

### Integration Tests (if applicable)

Run the complete mapped integration suite and package-content checks as regression gates.

### End-to-End Tests (if applicable)

- [x] E2E-09 — Quick-start workflow meets user-time target
- [x] E2E-10 — Cross-platform critical scenarios

## Relevant Files

- `README.md`
- `AGENTS.md`
- `package.json`
- `package-lock.json`
- npm package inclusion configuration
- CI workflow files
- `schemas/`
- `assets/runtime/`
- `docs/context-brake-protocol.md`
- `docs/research/harness-integrations.md`
- `tests/e2e/`
- `tests/fixtures/`
- `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`

## Handoff

- **Status:** DONE
- **Changed Files:**
  - `package.json` (included `docs/context-brake-protocol.md` in published npm `files`, updated `package:smoke` script to run package verification)
  - `scripts/check-package.ts` (npm pack artifact verification script asserting required runtime assets, schemas, protocol, and binary with shebang, rejecting forbidden dev assets)
  - `.github/workflows/ci.yml` (multi-OS Linux/macOS/Windows, multi-Node 20/22/24 matrix CI workflow with Windows symlink configuration and comprehensive verification gates)
  - `README.md` (updated quick-start, configuration schema, and CLI command reference reflecting proven implemented CLI behavior and separating future roadmap items)
  - `tests/integration/package-contents.test.ts` (integration tests validating npm pack output against required schema and asset manifest)
  - `tests/e2e/e2e-09.test.ts` (E2E-09 timed quick-start workflow meeting user-time target <2 min and core commands <5s)
  - `tests/e2e/shell-runner.ts` (child process shell runner for PowerShell, Git Bash, and native POSIX shells)
  - `tests/e2e/e2e-10-fixtures.ts` (fixture setup and assertion helpers for cross-platform scenarios)
  - `tests/e2e/e2e-10.test.ts` (E2E-10 cross-platform critical scenarios covering PowerShell and Git Bash on Windows, native shells on POSIX)
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_6.md`
- **Executed Commands & Results:**
  - `npm run schemas:check`: Exit 0 (all schemas up to date)
  - `npm run dependencies:check`: Exit 0 (zero install scripts in runtime dependencies)
  - `npm run build`: Exit 0 (schemas generated, assets built, TypeScript compilation successful)
  - `npm run typecheck`: Exit 0 (all TypeScript files pass strict typecheck)
  - `npm run lint`: Exit 0 (clean ESLint, <=100 lines/file, <=30 lines/function strictly enforced)
  - `npm test`: Exit 0 (all 50 test files and 167 tests pass, including E2E-09 and E2E-10)
  - `npm run coverage`: Exit 0 (Statements: 89.91%, Branches: 80.88%, Functions: 95.88%, Lines: 89.91% - all exceeding >=80% requirement)
  - `npm run package:smoke`: Exit 0 (package tarball verified, 183 files checked, schemas/assets/bin present, smoke execution passed)
- **Validated Version:** Node.js 24.19.0 / npm, `context-brake` 1.0.0
- **Quality Reservation Hits:** None
- **Pending Items:** None
