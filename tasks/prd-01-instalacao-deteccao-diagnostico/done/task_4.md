# Task 4.0: Implement all eight harness adapters and runtime assets

## Overview

Implement the complete project-scoped adapter registry for Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Antigravity CLI, OpenCode, Pi, and Oh-My-Pi. Each adapter owns its vendor evidence, payload schemas, registration edits, version parsing, diagnosis, capability profile, benchmark fixture, and self-contained runtime asset while exposing only normalized core contracts.

<skills>
### Skill Compliance

- `sdd-execute-task` applies when this task is implemented.
- Each adapter implementation must follow the project-mandated research workflow before code changes: read its section in `docs/research/harness-integrations.md`, recheck the linked official vendor documentation, and update research plus fixtures when the verified behavior differs.
</skills>

<rules>
### Compliance With AGENTS.md and Rules

Before implementation, read `AGENTS.md` and every file in `.agents/rules/` again. All rules apply; `harness-adapters.md`, `file-changes.md`, `node.md`, `javascript-typescript.md`, `code-standards.md`, and `tests.md` are central to this task.

- Keep each vendor's event names, payloads, paths, configuration shapes, and version parsing inside its adapter directory.
- Validate vendor inputs with non-strict Zod object schemas and emit only documented response fields.
- Preserve original tool results, reserve hook stdout for the vendor response, and catch every hook failure.
- Use self-contained assets with no network, package-manager, global installation, synchronous in-process I/O, or hook-time `npx` dependency.
- Advertise only documented, version-gated capabilities; unknown behavior remains unsupported or partial.
- Keep fixtures network-free, deterministic, and adjacent to the harness fixture hierarchy.
- There are no planned deviations from the project rules.
</rules>

<requirements>
- RF1 and RF2: Supply authoritative project and machine evidence plus version parsing for all eight harnesses.
- RF5: Register through each harness's documented project extension mechanism.
- RF6 and RF7: Preserve user integrations and isolate invalid vendor documents without blocking other harnesses.
- RF8 and RF9: Provide evidence-backed capability profiles, support levels, limitations, and minimum-version behavior.
- Ensure the registered runtime survives completion of a transient `npx context-brake init` process.
- Preserve all research gates and limitations identified in the TechSpec, including fail-open timeouts and unverified post-tool or trust behavior.
</requirements>

## Subtasks

- [x] 4.1 Recheck the eight official vendor contracts and reconcile `docs/research/harness-integrations.md` before implementing affected behavior.
- [x] 4.2 Implement the immutable adapter descriptor registry and shared adapter test contract without allowing vendor types into `src/core/`.
- [x] 4.3 Implement Claude Code, Codex CLI, and Cursor detectors, schemas, registration planners, diagnostic probes, and process-hook assets.
- [x] 4.4 Implement GitHub Copilot CLI and Antigravity CLI detectors, schemas, registration planners, diagnostic probes, and process-hook assets.
- [x] 4.5 Implement OpenCode, Pi, and Oh-My-Pi detectors, schemas, registration planners, diagnostic probes, and in-process plugin or extension assets.
- [x] 4.6 Implement platform-specific hook command variants and deterministic standalone asset generation without shell interpolation.
- [x] 4.7 Add per-adapter fixtures for detection, existing user entries, invalid files, idempotent registration, version output, payload parsing, failure behavior, and expected output.
- [x] 4.8 Add the mapped integration tests and package-content assertions for every generated runtime asset.
- [x] 4.9 Run build, typecheck, lint, tests, and coverage.

## Implementation Details

Follow [techspec.md](../techspec.md), especially **Component Overview**, **Main Interfaces**, the harness matrix under **Integration Points**, **Technical Dependencies**, and every adapter-specific item under **Known Risks**. The PRD and TechSpec remain authoritative. Current vendor evidence must be recorded in project research and reflected as an honest limitation; a material conflict with the specifications must be resolved before the adapter advertises support.

## Related Acceptance Criteria

- CA-01
- CA-02
- CA-03
- CA-04
- CA-05
- CA-06
- CA-15
- CA-16

## Task Tests

### Unit Tests (if applicable)

Adapter-local pure schema and planning tests are required for all production branches, but their acceptance-level behavior is consolidated in the mapped integration cases below.

### Integration Tests (if applicable)

- [x] IT-01 — Claude project installation preserves settings
- [x] IT-02 — Codex and Cursor install together
- [x] IT-03 — Explicit Copilot exclusion leaves only Cursor
- [x] IT-04 — Malformed harness config does not block peers
- [x] IT-12 — Copilot adapter reports documented failure policy
- [x] IT-16 — All eight detection descriptors avoid cross-signals

### End-to-End Tests (if applicable)

The built-CLI adapter flows are completed by E2E-01 through E2E-05 in Task 5.

## Relevant Files

- `src/infrastructure/harnesses/registry.ts`
- `src/infrastructure/harnesses/claude-code/`
- `src/infrastructure/harnesses/codex-cli/`
- `src/infrastructure/harnesses/cursor/`
- `src/infrastructure/harnesses/github-copilot-cli/`
- `src/infrastructure/harnesses/antigravity-cli/`
- `src/infrastructure/harnesses/opencode/`
- `src/infrastructure/harnesses/pi/`
- `src/infrastructure/harnesses/oh-my-pi/`
- `assets/runtime/`
- `tests/fixtures/harnesses/`
- `tests/integration/`
- `docs/research/harness-integrations.md`
- `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`

## Handoff

- **Status:** DONE
- **Changed Files:**
  - `docs/research/harness-integrations.md` (reconciled GitHub Copilot CLI failure behavior: errors fail closed without timeout, timeouts fail open)
  - `src/core/contracts/adapter.ts` (normalized core contracts: HarnessAdapter, AdapterPlan, BenchmarkFixture, HarnessContext, AdapterDescriptor)
  - `src/core/contracts/harness.ts` (re-exported core adapter contracts)
  - `src/infrastructure/harnesses/registry.ts` (immutable adapter registry ADAPTER_DESCRIPTORS, getAdapter, getAllAdapters, getDescriptor)
  - `src/infrastructure/harnesses/common/path-helpers.ts` (path resolution, normalization, userHome fallback, and hook command generation)
  - `src/infrastructure/harnesses/common/runtime-assets.ts` (bundled runtime assets loading and destination mapping)
  - `src/infrastructure/harnesses/common/version-probes.ts` (common process version probing with timeout and regex parsing)
  - `src/infrastructure/harnesses/common/diagnostic-helpers.ts` (shared diagnostic probing helpers for file checks and config validation)
  - `src/infrastructure/harnesses/claude-code/` (`adapter.ts`, `claude-merger.ts`, `detector.ts`, `planner.ts`, `schemas.ts`)
  - `src/infrastructure/harnesses/codex-cli/` (`adapter.ts`, `detector.ts`, `planner.ts`, `schemas.ts`)
  - `src/infrastructure/harnesses/cursor/` (`adapter.ts`, `detector.ts`, `planner.ts`, `schemas.ts`)
  - `src/infrastructure/harnesses/github-copilot-cli/` (`adapter.ts`, `detector.ts`, `planner.ts`, `schemas.ts`)
  - `src/infrastructure/harnesses/antigravity-cli/` (`adapter.ts`, `detector.ts`, `planner.ts`, `schemas.ts`)
  - `src/infrastructure/harnesses/opencode/` (`adapter.ts`, `detector.ts`, `planner.ts`, `schemas.ts`)
  - `src/infrastructure/harnesses/pi/` (`adapter.ts`, `detector.ts`, `planner.ts`, `schemas.ts`)
  - `src/infrastructure/harnesses/oh-my-pi/` (`adapter.ts`, `detector.ts`, `planner.ts`, `schemas.ts`)
  - `assets/runtime/process-hook.ts` (self-contained Node process hook with fail-open fallback and error isolation)
  - `assets/runtime/opencode-plugin.ts` (self-contained OpenCode tool-execute plugin)
  - `assets/runtime/pi-extension.ts` (self-contained Pi tool_call extension)
  - `assets/runtime/omp-extension.ts` (self-contained Oh-My-Pi tool_call extension)
  - `scripts/build-assets.ts` (bundled build script for all five runtime assets)
  - `scripts/check-assets.ts` (currency verification script for all five runtime assets)
  - `tests/fixtures/harnesses/` (per-adapter fixtures for all 8 harnesses: detection, valid/invalid configs, version probes)
  - `tests/unit/harness-registry.test.ts` (registry immutability, lookup, and all-descriptors test)
  - `tests/unit/harness-adapters.test.ts` (capability profiles, support levels, and contracts tests)
  - `tests/unit/runtime-assets.test.ts` (runtime asset loading, paths, and content tests)
  - `tests/unit/harness-schemas-process.test.ts` (process hook vendor schema validation tests)
  - `tests/unit/harness-schemas-in-process.test.ts` (in-process plugin/extension schema validation tests)
  - `tests/unit/adapter-diagnostics.test.ts` (adapter diagnostic probe tests)
  - `tests/unit/adapter-planners.test.ts` (registration planning, hook generation, and error isolation tests)
  - `tests/unit/adapter-version-probes.test.ts` (version probing, timeout, and regex parsing tests)
  - `tests/integration/claude-preservation.test.ts` (IT-01 Claude settings and existing hooks preservation)
  - `tests/integration/multi-harness-install.test.ts` (IT-02, IT-03, IT-04 multi-harness install, exclusion, and malformed peer isolation)
  - `tests/integration/copilot-failure-policy.test.ts` (IT-12 Copilot failure policy: non-timeout errors deny, timeout errors allow)
  - `tests/integration/detection-cross-signals.test.ts` (IT-16 cross-signal isolation across all 8 harnesses)
  - `tests/integration/package-assets.test.ts` (package tarball asset presence, integrity, and non-emptiness tests)
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_4.md` (completed subtasks, tests, and handoff)
- **Executed Commands & Results:**
  - `npm run typecheck`: Exit 0 (all TypeScript files pass strict typechecking)
  - `npm run lint`: Exit 0 (ESLint clean, <=100 lines/file, <=30 lines/function strictly enforced)
  - `npm test`: Exit 0 (all 32 test files and 124 tests pass)
  - `npm run coverage`: Exit 0 (Statements: 91.41%, Branches: 83.92%, Functions: 98.29%, Lines: 91.41% - all exceeding >=80% requirement)
  - `npm run build`: Exit 0 (schemas generated, runtime assets built, TypeScript compilation successful)
  - `npm run schemas:check`: Exit 0 (schemas up-to-date and validated)
  - `npm run dependencies:check`: Exit 0 (runtime dependencies verified clean with zero install scripts)
  - `npm run package:smoke`: Exit 0 (tarball created and verified)
- **Validated Version:** Node.js 24.19.0 / npm, `context-brake` 1.0.0
- **Quality Profile Reservation Hits:** None
- **Pending Items:** None
