# Task 2.0: Implement detection, explicit selection, versions, and support levels

## Overview

Implement the vendor-neutral policies that discover harness evidence, distinguish project detections from machine-only candidates, apply explicit inclusion and exclusion, probe versions safely, and derive honest capability and support profiles. This task provides deterministic core behavior for the adapters and commands that follow.

<skills>
### Skill Compliance

- `sdd-execute-task` applies when this task is implemented.
- No adapter implementation is included here, so adapter-specific research changes belong to Task 4.
</skills>

<rules>
### Compliance With AGENTS.md and Rules

Before implementation, read `AGENTS.md` and every file in `.agents/rules/` again. `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, and `harness-adapters.md` are directly relevant; `file-changes.md` and `cli-output.md` remain binding if their paths are touched.

- Keep detection and support policy pure in `src/core/`; vendor evidence formats remain in infrastructure descriptors.
- Parse executable output as `unknown`, validate it per harness, use argument arrays without a shell, enforce timeouts, and stop timed-out process trees.
- Treat undocumented capabilities and unverified minimum versions as unsupported or unknown, never as successful compatibility.
- Use fixture-injected paths and version output; tests must not depend on installed harnesses or the network.
- There are no planned deviations from the project rules.
</rules>

<requirements>
- RF1: Support detection inputs for all eight MVP harness IDs.
- RF2: Preserve evidence origin and detected version provenance.
- RF3: Never treat shared instruction files as sufficient harness proof.
- RF4: Apply explicit `--harness` and `--exclude-harness` choices ahead of automatic detection.
- RF8: Derive `full`, `partial`, or `cooperative` from the capability profile.
- RF9: Report old, unknown, malformed, and timed-out version states without inventing version floors.
- Preserve the clarified rule that machine-only signals remain candidates until explicitly selected.
</requirements>

## Subtasks

- [x] 2.1 Define harness IDs, evidence, detection state, version probe, capability, support, executable-discovery, and process-runner contracts.
- [x] 2.2 Implement detection merging, evidence deduplication, candidate promotion, exclusion, and contradictory-option validation.
- [x] 2.3 Implement the bounded Node process runner and executable discovery with no shell interpolation or machine-dependent test behavior.
- [x] 2.4 Implement vendor-version normalization and semantic-version comparison while retaining original display values.
- [x] 2.5 Implement exhaustive capability-state and support-level derivation, including limitation impacts and unverified version floors.
- [x] 2.6 Add deterministic fixtures and the mapped unit and integration tests.
- [x] 2.7 Run build, typecheck, lint, tests, and coverage.

## Implementation Details

Follow [techspec.md](../techspec.md), especially **Component Overview**, **HarnessDetection**, **CapabilityProfile**, **Integration Points**, **Key Decisions**, and **Known Risks**. Task 4 supplies concrete vendor descriptors; this task must expose only normalized core contracts and reusable policies.

## Related Acceptance Criteria

- CA-01
- CA-02
- CA-03
- CA-04
- CA-15
- CA-16

## Task Tests

### Unit Tests (if applicable)

- [x] UT-01 — Shared instructions are not harness evidence
- [x] UT-02 — Explicit selection and exclusion override detection
- [x] UT-03 — Machine-only evidence stays a candidate
- [x] UT-14 — Copilot timeout limitation prevents full support
- [x] UT-15 — Version gates identify an old harness
- [x] UT-18 — Support levels are exhaustive

### Integration Tests (if applicable)

- [x] IT-13 — Version process probe is bounded and normalized

### End-to-End Tests (if applicable)

Not applicable until Task 5 wires detection into the built CLI.

## Relevant Files

- `src/core/contracts/harness.ts`
- `src/core/contracts/processes.ts`
- `src/core/services/detection-service.ts`
- `src/core/services/support-service.ts`
- `src/infrastructure/process/node-process-runner.ts`
- `tests/unit/`
- `tests/integration/`
- `tests/fixtures/harnesses/`
- `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`

## Handoff

### Status: DONE

Task 2.0 implementation and quality verification are complete.

#### Changed Files
- `src/core/contracts/harness.ts`
- `src/core/contracts/processes.ts`
- `src/core/contracts/configuration.ts`
- `src/core/contracts/diagnostics.ts`
- `src/core/services/detection-service.ts`
- `src/core/services/support-service.ts`
- `src/core/services/version-service.ts`
- `src/infrastructure/process/process-tree.ts`
- `src/infrastructure/process/node-process-runner.ts`
- `tests/fixtures/harnesses/version-probe/process-tree-child.mjs`
- `tests/fixtures/harnesses/version-probe/process-tree-parent.mjs`
- `tests/fixtures/harnesses/version-probe/version-fixture.mjs`
- `tests/unit/detection-service.test.ts`
- `tests/unit/support-service.test.ts`
- `tests/integration/node-process-runner.test.ts`
- `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_2.md`
- `package.json`
- `package-lock.json`

#### Commands Executed and Results
- `npm run typecheck`: Passed (code 0).
- `npm run lint`: Passed with 0 errors and 0 warnings (code 0).
- `npm test`: Passed (48 of 48 tests passing across 9 test files, code 0).
- `npm run coverage`: Passed (code 0; 94.41% statements, 91.3% branches, 97.91% functions, 94.41% lines, exceeding the 80% threshold).
- `npm run build`: Passed (code 0; schemas generated, assets built, tsc emitted to dist/).
- `npm run dependencies:check`: Passed (code 0; checked 2 runtime dependencies, no install scripts found).
- `npm run schemas:check`: Passed (code 0).
- `npm run package:smoke`: Passed (code 0).

#### Validated Version
- Node.js: `v20+`
- Package: `context-brake@1.0.0`

#### Quality Profile Reservation Hits
- `None`

#### Pending Items
- `None`
