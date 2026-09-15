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

- Produced result: Implemented the pure core of RF24/CA-21 (CR-03, T31.1-T31.4). Added the `ignore_block` owner to the closed `ChangeOwner`/`FileChange` contract and the install-report schema; created pure marker, planning, and doctor-check services for the owned `.gitignore` block; added UT-21 to UT-25 with exact-string, conflict, EOL, final-newline, idempotency, and byte-preservation assertions. No filesystem I/O, no CLI/snapshot wiring (T32), and no runtime-state cleanup.
- Changed files:
  - Modified: `src/core/contracts/changes.ts` (added `ignore_block` to `CHANGE_OWNERS`), `src/core/contracts/diagnostics.ts` (install-report `fileChange.owner` now uses `CHANGE_OWNERS`), `schemas/install-report.schema.json` (regenerated; adds `ignore_block`), `tests/unit/changes-schema.test.ts` (exhaustive owner test), `tests/unit/schemas.test.ts` (schema `ignore_block` + version-1 assertions).
  - Created: `src/core/services/gitignore-markers.ts`, `src/core/services/gitignore-service.ts`, `src/core/services/gitignore-checks.ts`, `tests/unit/gitignore-service.test.ts`, `tests/unit/gitignore-checks.test.ts`. `schemas/doctor-report.schema.json` regenerated byte-identical (it has no owner field).
- Checks:
  - `rtk vitest tests/unit/gitignore-service.test.ts tests/unit/gitignore-checks.test.ts tests/unit/changes-schema.test.ts tests/unit/schemas.test.ts` -> `PASS (22) FAIL (0)`.
  - `npm run schemas:check` -> passed; install-report schema contains `ignore_block` (line 170) and both report schemas keep `schemaVersion` `const: 1`.
  - `npm run lint` -> passed (100-line file and 30-line function limits respected).
  - `npm run typecheck` -> passed (`tsc -p tsconfig.check.json --noEmit`).
  - `npm test` -> 76 files passed, 302 tests passed, 1 POSIX-only test skipped.
  - `npm run coverage` -> 92.12% statements / 84.63% branches / 96.08% functions / 92.12% lines (threshold 80%).
  - Quality profile QA-01..QA-06 over the 9 touched TypeScript files -> 0 new hits; QA-04 (core importing infrastructure/cli) -> 0; largest touched file is `src/core/services/gitignore-service.ts` at 99 lines.
  - UT-21: `renderIgnoreBlock('task_plan.json','state_checkpoint.json')` is `# CONTEXTBRAKE:START\n/task_plan.json\n/state_checkpoint.json\n# CONTEXTBRAKE:END`; `escapeGitignorePath('a*b?c[d!e#f ')` is `a\*b\?c\[d\!e\#f\ `; custom block lines `/plan \#1\?.json` and `/state\ `.
  - UT-22/CA-21: missing file plans `create` with LF and only the block plus trailing newline; unmarked LF/CRLF/no-final-newline files append preserving EOL style and final-newline state; a current block is a no-op; an outdated valid block is replaced in place; one/two/three applications are byte-identical after the first.
  - UT-23: duplicate markers -> `DUPLICATE_GITIGNORE_MARKERS` (`Multiple ContextBrake ignore blocks`); unbalanced and out-of-order markers -> `MALFORMED_GITIGNORE_MARKERS` (`Mismatched ContextBrake ignore markers` / `Start marker after end marker`); all plan zero changes and leave input bytes untouched.
  - UT-24/CA-12: default removal plans no change; explicit state removal removes the block and plans `delete` when only whitespace remains; remove-then-restore leaves every user byte outside the markers identical for LF, CRLF, and no-final-newline fixtures.
  - UT-25/RF21/RF24: a valid current block returns no finding; missing file, missing block, and outdated paths return warning `STATE_FILES_NOT_IGNORED` with impact `Plan and checkpoint files can be committed accidentally.` and remediation `Run context-brake init --yes to add the ContextBrake block to .gitignore.`; malformed/duplicate markers return error `MALFORMED_GITIGNORE_MARKERS`.
- Validated state: uncommitted worktree over `501f28f` on Windows 11 Pro, PowerShell 7, Node 24.19.0, npm 11.17.0. Pure core only: no infrastructure/CLI import (QA-04 = 0), no snapshot or command wiring, no runtime-state cleanup. `schemas/doctor-report.schema.json` is unchanged byte-for-byte because it carries no owner field.
- Open items: T32 must wire `planGitignoreInstall`/`planGitignoreRemoval` and `checkGitignore` into the canonical snapshot path, init/remove/doctor orchestration, IT-17/IT-18, E2E-11, and README wording (CR-03 completion). `checkGitignore` reports `MALFORMED_GITIGNORE_MARKERS` for duplicate markers at the doctor layer, matching the PRD-01 TechSpec `IgnoreBlock` doctor row; the planning layer keeps the `DUPLICATE_GITIGNORE_MARKERS`/`MALFORMED_GITIGNORE_MARKERS` distinction. The exact finding message, impact, and remediation strings are defined here because the TechSpec fixes the codes/severities/scopes but not the literal text; T32 must display them without redefining them.
