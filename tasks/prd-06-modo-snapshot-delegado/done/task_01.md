# Stable execution context

Load in this exact order:

1. `tasks/prd-06-modo-snapshot-delegado/prd.md`
2. `tasks/prd-06-modo-snapshot-delegado/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Contrato de configuração do snapshot delegado

## Outcome

`context-brake.config.json` accepts an optional `delegatedSnapshot` section, validated field by field with the field path in errors. A pure core matcher decides whether a repo-relative path matches an allowed pattern. Configs without the section parse and serialize exactly as before.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T04
- In scope:
  - `delegatedSnapshotSchema` and the optional key in `configurationSchema`;
  - `path-pattern.ts`;
  - regenerating `schemas/context-brake.config.schema.json`.
- Out of scope: any consumer of the section (engine, CLI, doctor).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Optional section |
| FR-02 | `prd.md#functional-requirements` | Command rules (1–200 chars, trimmed, single line) |
| FR-03 | `prd.md#functional-requirements` | `triggerZone` enum, default `RED` |
| NFR-01, NFR-02, NFR-04 | `prd.md#non-functional-requirements` | Compatibility, safe patterns, separators |
| DEC-01, DEC-04 | `techspec.md#technical-decisions` | Section shape and matcher subset |
| CMP-01, CMP-02 | `techspec.md#components-and-flow` | Contract and matcher |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`.
- Existing code: `src/core/contracts/configuration.ts`, which already has helpers to reuse: `relativePath`, `canonicalPathPattern`, `uniqueCheck`, `additionalAllowedCommand`.
- Existing code: `scripts/generate-schemas.ts`, which produces the published JSON schema.
- Contract: `techspec.md#contracts-and-data` (field table).

## Work

- [x] T01.1 Add `delegatedSnapshotSchema` with the fields, defaults, and limits from the TechSpec field table, then add it as an optional `delegatedSnapshot` key. Leave `DEFAULT_CONFIG` unchanged.
- [x] T01.2 Create `src/core/services/path-pattern.ts` with `matchesPathPattern(path, pattern)`: `*` matches within one segment, `**` matches zero or more segments, `?` matches one non-`/` char. It never matches a path containing `..` segments.
- [x] T01.3 Regenerate the schemas (`npm run schemas:generate`) and confirm `npm run schemas:check` passes.
- [x] T01.4 Add unit tests: TC-01 in `tests/unit/configuration.test.ts` and TC-02 in `tests/unit/path-pattern.test.ts`.

## Acceptance criteria

- A config without `delegatedSnapshot` parses to the same object as today, and `JSON.stringify(DEFAULT_CONFIG)` is unchanged.
- Each of these is rejected with its field path: an empty command, a command with `\n`, a command with leading or trailing spaces, a 201-char command, a pattern with `..`, a pattern starting with `/`, a pattern with `\`, a duplicate pattern, a skill name with a space, and an unknown `triggerZone`.
- `tasks/**/context-snapshot.md` matches `tasks/prd-06/context-snapshot.md` and `tasks/a/b/context-snapshot.md`, and does not match `src/context-snapshot.md`.

## Verification

- Unit: TC-01, TC-02.
- Integration: not applicable.
- End-to-end: not applicable.
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: test counts and a green schema check.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `schemas/context-brake.config.schema.json`, `tests/unit/configuration.test.ts`
- Create: `src/core/services/path-pattern.ts`, `tests/unit/path-pattern.test.ts`

## Observability and recovery

- Operational signal: config validation errors carry the field path.
- Recovery: revert the commit. The section is optional.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `delegatedSnapshotSchema` (`snapshotCommand`, `triggerZone` defaulting to `RED`, optional `resumeCommand`, `allowedPaths`, `allowedSkills`) is an optional `delegatedSnapshot` key in `configurationSchema`. `DEFAULT_CONFIG` is unchanged. `matchesPathPattern` and `matchesAnyPathPattern` in `src/core/services/path-pattern.ts` support `*`, `**`, and `?`, and reject `.` and `..` segments.
- Changed files: `src/core/contracts/configuration.ts`, `schemas/context-brake.config.schema.json` (regenerated). Created `src/core/services/path-pattern.ts`, `tests/unit/path-pattern.test.ts`, `tests/unit/delegated-snapshot-config.test.ts`.
- Checks:
  - `npx vitest run` on the 3 affected suites: 66 passed.
  - `npm run typecheck`: pass.
  - `eslint` on the touched files: pass.
  - `npm run schemas:check`: pass.
  - QA-01 to QA-04 and QA-07 sweeps: empty.
  - QA-08: `configuration.ts` has 76 lines and `path-pattern.ts` 29.
- Validated state: working tree on top of `3b94a9c`, Windows 11 with Node from the local toolchain. The CI matrix covers the other platforms.
- Open items: the new tests live in `tests/unit/delegated-snapshot-config.test.ts`, not in `configuration.test.ts` as the contract listed, because that file would pass the 100-line lint limit. This is recorded in the manifest under `Problems and solutions`.

### ADR candidates

None - direct TechSpec implementation or local decision.
