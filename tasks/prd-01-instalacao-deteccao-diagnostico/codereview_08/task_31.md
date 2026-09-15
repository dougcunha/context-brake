# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_08/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward.

---

# T31: Define the owned gitignore block and its pure planning contracts

## Outcome

Core services can render, inspect, add, replace, preserve, and remove the ContextBrake `.gitignore` block with exact byte ownership and structured conflicts/findings, without performing filesystem I/O.

## Dependencies and boundaries

- Depends on: none.
- Unblocks: T32 and T35.
- In scope: the `ignore_block` owner, marker parsing, path escaping, pure plan generation, pure doctor checks, schemas, fixtures, and UT-21 through UT-25.
- Out of scope: CLI snapshot wiring and actual init/remove/doctor orchestration, which belong to T32; runtime-state directory cleanup from PRD 1.1 FR-09.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_08/CR-03` | `codereview.md#findings` | RF24/CA-21 and their diagnostic/source/test surfaces are absent. |
| PRD-01 | RF19, RF21, RF24, CA-12, CA-21 | Requires safe local-state ignore ownership and diagnosis. |
| PRD-01 TechSpec | DEC-02, `IgnoreBlock`, UT-21 to UT-25 | Defines exact block, escaping, conflicts, removal, and findings. |
| PRD 1.1 TechSpec | DEC-01, CMP-10, CMP-11, TC-08 | Reuses the parent contract without redefining it. |

## Requirements

- Add `ignore_block` to `ChangeOwner`, `FileChange`, install-report schema, and every exhaustive owner test. Keep report `schemaVersion: 1`.
- Render configured plan and checkpoint paths in that order, root-anchored with `/`, escaping `*`, `?`, `[`, `!`, `#`, and trailing spaces exactly as the TechSpec specifies.
- Use exactly `# CONTEXTBRAKE:START` and `# CONTEXTBRAKE:END` markers.
- Missing `.gitignore` plans a create with LF and only the block. An unmarked file plans an append preserving EOL style and final-newline state. A current block is a no-op. An outdated valid block is replaced in place.
- Preserve all bytes outside the owned block, including comments, blank lines, CRLF, and no-final-newline inputs.
- Duplicate, unbalanced, or out-of-order markers yield `DUPLICATE_GITIGNORE_MARKERS` or `MALFORMED_GITIGNORE_MARKERS`, with path and reason, and plan no `.gitignore` change.
- Removal planning is inert unless explicitly requested. Explicit removal deletes the file only when the remaining content is empty or blank; otherwise it preserves all unowned bytes.
- A valid current block yields no doctor finding. Missing/outdated paths yield warning `STATE_FILES_NOT_IGNORED`; malformed markers yield error `MALFORMED_GITIGNORE_MARKERS`.
- Services remain pure and depend only on core contracts. Symlink resolution remains the snapshot/file-system adapter's responsibility.

## Context to recover on demand

- TechSpec: PRD-01 `IgnoreBlock`, DEC-02, FileChange ownership, UT-21 to UT-25; PRD 1.1 DEC-01 and NFR-05.
- Rules and skills: `file-changes.md`, `code-standards.md`, `javascript-typescript.md`, `tests.md`, `cli-output.md`, and `antislop`.
- Code: `src/core/contracts/changes.ts` - owner enum, planned changes, and schemas.
- Code: `src/core/contracts/diagnostics.ts` - report finding and owner schemas.
- Code: `src/core/services/instruction-markers.ts` and `instruction-service.ts` - comparable owned-block behavior, not an API to overload blindly.
- Code: `src/core/contracts/config.ts` - validated plan/checkpoint paths.

## Work

- [ ] T31.1 Add failing UT-21 through UT-24 fixtures for exact rendering, create/append/update/no-op/removal, escaping, EOLs, final newline, and malformed markers.
- [ ] T31.2 Add `ignore_block` to closed contracts and implement pure marker and planning services.
- [ ] T31.3 Add failing UT-25 cases and implement the pure missing/outdated/malformed/current doctor check.
- [ ] T31.4 Regenerate schemas and run focused tests, completion gates, and the quality profile.

## Acceptance criteria

- UT-21 through UT-25 pass with exact strings, conflict codes, severities, impacts, and remediations from the TechSpec.
- One, two, and three applications of the planned block yield identical bytes after the first application.
- Removing a block and then restoring it does not modify any user byte outside the markers.
- Invalid marker inputs remain byte-identical and never generate a planned write.
- Core modules import no infrastructure or CLI module.
- Generated report schemas contain `ignore_block` and remain version 1.

## Verification

- Unit: dedicated gitignore marker/planning/check tests covering UT-21 through UT-25.
- Integration: not applicable until T32 wires snapshots and commands.
- End-to-end: not applicable until T32.
- Manual: none.
- Platforms: platform-neutral pure tests; T35 supplies matrix evidence for the wired feature.
- Environment dependency: none.
- Commands: focused Vitest files, `npm run schemas:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: exact fixture outputs, idempotency, no mutation for conflicts, current schemas, and zero architecture/profile regressions.

## Affected files

- Modify: `src/core/contracts/changes.ts`, `src/core/contracts/diagnostics.ts`.
- Create: `src/core/services/gitignore-markers.ts`, `src/core/services/gitignore-service.ts`, `src/core/services/gitignore-checks.ts`.
- Create: `tests/unit/gitignore-service.test.ts`, `tests/unit/gitignore-checks.test.ts`, and focused fixtures under `tests/fixtures/gitignore/` if inline cases are not readable.
- Modify: `schemas/install-report.schema.json`, `schemas/doctor-report.schema.json` through schema generation, plus exhaustive schema/owner tests.

## Observability and recovery

- Operational signal: pure plans expose owner `ignore_block`; pure checks return stable finding codes for the CLI to project in T32.
- Recovery: revert T31 and regenerate schemas before reverting T32; T32 must never be applied without these contracts.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.
