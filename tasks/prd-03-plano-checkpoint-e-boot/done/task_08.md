# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T08 — Schema publishing and packaging

## Outcome

Versioned JSON Schemas for the plan and the checkpoint are generated from their Zod definitions, kept current by the existing check, and shipped in the published package.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: —
- In scope: extending the schema generation and currency scripts and the package content check.
- Out of scope: hosting schemas at a public URL and any migration framework, which `DEC-08` defers until a second version exists.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF6 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Publish versioned schemas of both files with the package |
| CMP-22 | `techspec.md#components-and-flow` | Generation, currency check, and packaging |
| DEC-08 | `techspec.md#technical-decisions` | `schemaVersion: 1`; generated through the existing script pair |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/javascript-typescript.md` (owned files carry a schema version), `node.md` (dependencies and lock file).
- Existing code: `scripts/generate-schemas.ts:6` and `scripts/check-schemas.ts:6` — one shared `outputs` map naming each emitted schema; both must gain the same two entries.
- Existing code: `scripts/check-package.ts:17-32` — `REQUIRED_FILES` gating the published tarball; `:34` — forbidden development prefixes.
- Existing code: `package.json` `files` already ships the whole `schemas` directory, so no manifest change is expected.
- Contract or integration: `techspec.md#contracts-and-data`.

## Work

- [x] T08.1 Add both schemas to the `outputs` map in the generation script, emitting draft-2020-12 like the existing three.
- [x] T08.2 Add the same two entries to the currency-check script.
- [x] T08.3 Add both schema paths to `REQUIRED_FILES` in the package check.
- [x] T08.4 Generate the schema files and verify the published tarball contains them.

## Acceptance criteria

- `npm run schemas:generate` emits `schemas/task-plan.schema.json` and `schemas/state-checkpoint.schema.json`.
- `npm run schemas:check` fails when either file is stale and passes when both are current.
- `npm run package:smoke` fails if either schema is missing from the packed tarball and passes when both are present.
- Both schemas declare the same `schemaVersion` literal the Zod definitions enforce, so file and schema cannot drift.
- No development path is added to the published package.

## Verification

- Unit: not applicable; these are build scripts.
- Integration: package-content assertions covering both new schema paths.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run schemas:generate`, `npm run schemas:check`, `npm run build`, `npm run package:smoke`
- Environment dependency: `npm pack --dry-run` runs locally; no registry access is required.
- Expected evidence: a passing currency check and the package check reporting both schemas present.

## Affected files

- Modify: `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts`, `tests/integration/package-contents.test.ts`, `tests/unit/schemas.test.ts`
- Create: `schemas/task-plan.schema.json`, `schemas/state-checkpoint.schema.json`

## Observability and recovery

- Operational signal: the currency check fails loudly when a schema drifts from its Zod definition.
- Recovery: schemas are generated artifacts; regenerating restores them.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Generated JSON Schemas for `task-plan` and `state-checkpoint` (Draft 2020-12) from `taskPlanSchema` and `stateCheckpointSchema`, verified schema currency check, updated package verification script and integration/unit tests ensuring both schemas are packaged in the published npm tarball without development files and declare schemaVersion: 1.
- Changed files: `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts`, `tests/integration/package-contents.test.ts`, `tests/unit/schemas.test.ts`, `schemas/task-plan.schema.json`, `schemas/state-checkpoint.schema.json`.
- Checks: `npm run schemas:generate`, `npm run schemas:check`, `npm run build`, `npm run package:smoke`, `npm run lint`, `npm run typecheck`, `npx vitest run tests/unit/schemas.test.ts tests/integration/package-contents.test.ts tests/unit/test-lanes.test.ts`.
- Validated state: Node v24.19.0, Windows 11, working tree at base `91b4e68`.
- Open items: None.

### ADR candidates

None - direct TechSpec implementation or local decision.
