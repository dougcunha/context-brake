# Task 3.0: Build the safe user-file change engine

## Overview

Implement the reusable planning and storage infrastructure that previews, validates, and applies project-file changes without damaging user content. The delivery includes physical-file identity, repository boundaries, byte-preserving JSON/JSONC and instruction edits, protocol and legacy-block planning, manifest ownership, optimistic concurrency, and per-file atomic writes.

<skills>
### Skill Compliance

- `sdd-execute-task` applies when this task is implemented.
- Review and QA skills remain later workflows; this task must complete its own mapped automated tests before it is marked done.
</skills>

<rules>
### Compliance With AGENTS.md and Rules

Before implementation, read `AGENTS.md` and every file in `.agents/rules/` again. All rules apply, with `file-changes.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`, and `tests.md` carrying the highest task-specific risk.

- Compute one immutable `ChangePlan` before writing, and use that same plan for preview and application.
- Preserve all unowned bytes, including comments, ordering, indentation, line endings, and final-newline state.
- Refuse invalid or ambiguous documents, resolve links and junctions, enforce repository boundaries, and use same-directory temporary files plus atomic rename.
- Never remove legacy content or plan/checkpoint state without the explicit decisions defined in the TechSpec.
- Use asynchronous filesystem APIs and isolated temporary repositories in tests.
- There are no planned deviations from the project rules.
</rules>

<requirements>
- RF6: Preserve existing user integrations and configuration bytes.
- RF7: Convert invalid harness documents into isolated no-write conflicts.
- RF10: Plan creation of the project protocol from canonical configuration.
- RF11: Upsert the bounded ContextBrake reference block in configured instruction files.
- RF12: Leave absent instruction files absent unless explicit creation is selected.
- RF13: Deduplicate symlinked or junction-backed physical targets while preserving the link.
- RF14: Detect and preview legacy `CONTEXTOPS` migration without implicit deletion.
- RF18: Produce a complete side-effect-free installation preview.
- RF19: Record exact ownership needed for conservative removal and explicit state deletion.
</requirements>

## Subtasks

- [x] 3.1 Define file snapshots, identities, owned regions, changes, conflicts, plans, manifests, and applier contracts.
- [x] 3.2 Implement asynchronous snapshotting, canonical physical identity, case-aware comparison, repository-boundary checks, and symlink/junction handling.
- [x] 3.3 Implement JSON/JSONC scanning, duplicate-key detection, and token-span edits that preserve unrelated bytes and trivia.
- [x] 3.4 Implement current, malformed, duplicate, and legacy instruction-marker inspection and bounded reference-block planning.
- [x] 3.5 Implement protocol rendering and planning from the normalized configuration without duplicating PRD 02 or PRD 03 policy.
- [x] 3.6 Implement deterministic plan merging, path ordering, SHA-256 preconditions, previews, and isolated conflicts.
- [x] 3.7 Implement manifest persistence and exact owned-entry/asset identity for later safe removal.
- [x] 3.8 Implement per-file atomic application, concurrent-change rejection, temporary-file cleanup, and independent partial outcomes.
- [x] 3.9 Add byte-focused fixtures and the mapped unit and integration tests for LF, CRLF, comments, final newlines, links, invalid input, migration, dry-run, and races.
- [x] 3.10 Run build, typecheck, lint, tests, and coverage.

## Implementation Details

Follow [techspec.md](../techspec.md), especially **FileChange**, **ChangePlan**, **InstallationManifest**, **Integration Points**, **Testing Approach**, and the file-safety decisions under **Key Decisions** and **Known Risks**. Do not serialize whole user-owned documents; `jsonc-parser` is limited to scanner/AST offsets for surgical edits.

## Related Acceptance Criteria

- CA-05
- CA-06
- CA-07
- CA-08
- CA-09
- CA-10
- CA-11
- CA-12
- CA-20

## Task Tests

### Unit Tests (if applicable)

- [x] UT-05 — Invalid vendor document becomes an isolated conflict
- [x] UT-06 — Physical instruction identities deduplicate
- [x] UT-07 — Reference block respects the context budget
- [x] UT-08 — Missing instruction targets do not create by default
- [x] UT-09 — Legacy migration requires a dedicated decision
- [x] UT-10 — Dry-run and apply share one change plan
- [x] UT-19 — JSONC token-span edits preserve trivia

### Integration Tests (if applicable)

- [x] IT-05 — Symlink and junction target is written once
- [x] IT-06 — Existing-only instruction policy
- [x] IT-07 — Legacy preview and migration preserve user text
- [x] IT-08 — Filesystem dry-run is side-effect free
- [x] IT-15 — Atomic writer rejects a concurrent edit

### End-to-End Tests (if applicable)

Not applicable until Task 5 exposes the planner through built CLI commands.

## Relevant Files

- `src/core/contracts/changes.ts`
- `src/core/services/instruction-service.ts`
- `src/core/services/protocol-service.ts`
- `src/infrastructure/storage/node-file-system.ts`
- `src/infrastructure/storage/json-document-editor.ts`
- Manifest storage modules under `src/infrastructure/storage/`
- `docs/context-brake-protocol.md`
- `tests/unit/`
- `tests/integration/`
- `tests/fixtures/instructions/`
- `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`

## Handoff

- **Status:** DONE
- **Changed Files:**
  - `package.json` (installed `jsonc-parser` runtime dependency)
  - `package-lock.json` (locked `jsonc-parser` dependency)
  - `src/core/contracts/changes.ts` (file snapshots, changes, previews, conflicts, plans, and applier contracts)
  - `src/core/contracts/manifest.ts` (installation manifest and manifest store contracts)
  - `src/infrastructure/storage/path-boundary.ts` (canonical path resolution, boundary checks, and physical file identity)
  - `src/infrastructure/storage/node-file-system.ts` (asynchronous snapshotting and file hashing)
  - `src/infrastructure/storage/atomic-writer.ts` (same-directory temporary file writes and atomic rename)
  - `src/infrastructure/storage/json-validator.ts` (JSON/JSONC validation, parse error, and duplicate-key detection)
  - `src/infrastructure/storage/json-span-utils.ts` (trivia inspection, indentation/eol detection, and span insertion/removal)
  - `src/infrastructure/storage/json-document-editor.ts` (surgical token-span property/array edits preserving trivia)
  - `src/core/services/instruction-markers.ts` (marker inspection, reference block rendering, and legacy text extraction)
  - `src/core/services/instruction-service.ts` (instruction target inspection, missing target policy, and reference/legacy planning)
  - `src/core/services/protocol-service.ts` (deterministic protocol rendering and planning from normalized config)
  - `src/core/services/change-plan-service.ts` (deterministic plan merging, path ordering, SHA-256 preconditions, and conflict isolation)
  - `src/infrastructure/storage/manifest-store.ts` (manifest persistence and exact asset/entry tracking)
  - `src/infrastructure/storage/change-applier.ts` (atomic application, optimistic concurrency rejection, and partial outcome reporting)
  - `tests/fixtures/instructions/lf-instructions.md` (LF fixture)
  - `tests/fixtures/instructions/crlf-instructions.md` (CRLF fixture)
  - `tests/fixtures/instructions/no-final-newline.md` (no trailing newline fixture)
  - `tests/fixtures/instructions/current-block.md` (existing reference block fixture)
  - `tests/fixtures/instructions/malformed-markers.md` (malformed markers fixture)
  - `tests/fixtures/instructions/duplicate-markers.md` (duplicate markers fixture)
  - `tests/fixtures/instructions/legacy-contextops.md` (legacy block fixture)
  - `tests/unit/changes-schema.test.ts` (schema validation tests for changes contracts)
  - `tests/unit/instruction-service.test.ts` (UT-06, UT-07, UT-08, UT-09 unit tests)
  - `tests/unit/json-document-editor.test.ts` (UT-05, UT-19 unit tests)
  - `tests/unit/change-plan-service.test.ts` (UT-10, merging, idempotency, conflict isolation unit tests)
  - `tests/unit/protocol-service.test.ts` (protocol rendering and planning unit tests)
  - `tests/unit/manifest-store.test.ts` (manifest schema, planning, and filesystem operations unit tests)
  - `tests/unit/path-boundary.test.ts` (boundary checks, platform path comparison, and atomic deletion unit tests)
  - `tests/integration/symlink-junction.test.ts` (IT-05 symlink deduplication and preservation integration test)
  - `tests/integration/instruction-policy.test.ts` (IT-06, IT-07 existing-only and legacy migration integration tests)
  - `tests/integration/change-applier.test.ts` (IT-08, IT-15 dry-run and concurrent edit rejection integration tests)
  - `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_3.md` (marked subtasks and tests complete, handoff details)
- **Executed Commands & Results:**
  - `npm run typecheck`: Exit 0 (all source and test files typecheck cleanly)
  - `npm run lint`: Exit 0 (no lint errors, 100-line file limit and 30-line function limit strictly enforced)
  - `npm test`: Exit 0 (all 19 test files and 83 tests passed)
  - `npm run coverage`: Exit 0 (Statements: 91.87%, Branches: 83.62%, Functions: 98.03%, Lines: 91.87% - all >= 80%)
  - `npm run build`: Exit 0 (schemas generated, assets built, TypeScript compiled)
  - `npm run schemas:check`: Exit 0 (generated schemas verified and in sync)
  - `npm run dependencies:check`: Exit 0 (runtime dependencies checked; no install scripts)
  - `npm run package:smoke`: Exit 0 (package tarball verified, smoke test passed)
- **Validated Version:** Node.js 24.19.0 / npm, `context-brake` 1.0.0
- **Quality Profile Reservation Hits:** None
- **Pending Items:** None
