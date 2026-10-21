# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/prd.md`
2. `tasks/prd-24-doctor-fix-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Fix publication

## Outcome

`schemas/fix-report.schema.json` is generated and checked with the other schemas, the package contains it, the built CLI passes the `fix --dry-run --json` smoke test, and the README documents `fix`, its flags, its groups, and the doctor `fix` field. The final validation of the feature runs.

## Dependencies and boundaries

- Depends on: T04, T05
- Unblocks: —
- In scope: CMP-18, TC-21, TC-22, TC-23; final lint, typecheck, coverage, schemas check, build, and test budget.
- Out of scope: `.agents/rules/tests.md` text (open item for the repository owner).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-14 | `prd.md#functional-requirements` | Published schema; e2e smoke |
| FR-15 | `prd.md#functional-requirements` | `schemas:check` passes |
| FR-16 | `prd.md#functional-requirements` | README |
| DEC-14, DEC-15 | `techspec.md#technical-decisions` | Schema lists; README text |

## Context to recover on demand

- Applicable rules: `tests.md` (e2e smoke, process lane), `code-standards.md`
- Existing code: `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts:19-21`, `tests/unit/schemas.test.ts:4`, `tests/integration/package-contents.test.ts:15-16`, `tests/e2e/e2e-doctor.test.ts` (smoke pattern), `tests/e2e/cli-runner.ts`, README `## 📋 CLI Commands` and the Diagnostics bullet in `### Updating and Removal`

## Work

- [ ] T06.1 Add `fix-report.schema.json` to the 5 schema lists; run `npm run schemas:generate`.
- [ ] T06.2 `tests/e2e/e2e-fix.test.ts` (TC-21).
- [ ] T06.3 README: `fix` row in the command table; groups, `fix` field, and `Fix: run context-brake fix` line in the Diagnostics text.
- [ ] T06.4 Final validation: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run build`, `npm run test:budget`.

## Acceptance criteria

- `npm run schemas:check` passes with 4 published schemas.
- The e2e smoke validates the document with `fixReportSchema`, exit code equals `exitCode`, and file hashes are unchanged.
- The README table lists `fix` with `--dry-run`, `--yes` (`-y`), `--force`, `--harness <id>`, `--json`.

## Verification

- Unit: TC-22 (`tests/unit/schemas.test.ts`).
- Integration: `tests/integration/package-contents.test.ts`.
- End-to-end: TC-21 (`tests/e2e/e2e-fix.test.ts`) after `npm run build`.
- Manual: TC-23, README diff in the review.
- Platforms: Windows local.
- Commands: as in T06.4.
- Environment dependency: none.
- Expected evidence: command outputs with exit codes; coverage at 80% or more.

## Affected files

- Modify: `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts`, `tests/unit/schemas.test.ts`, `tests/integration/package-contents.test.ts`, `README.md`
- Create: `schemas/fix-report.schema.json`, `tests/e2e/e2e-fix.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `schemas/fix-report.schema.json` generated and listed in the 5 schema lists; e2e smoke `fix --dry-run --json` on the built CLI; README `fix` row in the command table and a "Fixing problems" bullet (groups, `fix.group`, `Fix: run context-brake fix`, flags, outcomes, exit code).
- Changed files: created `schemas/fix-report.schema.json`, `tests/e2e/e2e-fix.test.ts`; modified `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts`, `tests/unit/schemas.test.ts`, `tests/integration/package-contents.test.ts`, `README.md`, `tests/unit/e2e-smoke-set.test.ts` (not listed in the task: the guard test lists the e2e smoke set; it now names `e2e-fix.test.ts`, one built-CLI file per command as `.agents/rules/tests.md` asks).
- Checks: `npm run build` pass; `npm run lint` pass; `npm run typecheck` pass; `npm run schemas:check` pass (4 schemas); first `npm run coverage` failed 1 test (`e2e-smoke-set` guard, fixed above); second `npm run coverage`: 287 files, 1538 passed, 1 skipped, All files 96.31 % statements, 93.23 % branches, 97.36 % functions, exit 0, wall 3m13s; `npm run test:budget`: 159.7 s against 180 s, exit 0 (new files in the 10 slowest: `e2e-fix` 11.5 s, `fix-interactive` 11.0 s, `fix-command` 9.4 s).
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21, after `npm run build`.
- Open items: `npm run coverage` wall time 193 s (with npm start-up) is above the 180 s rule in `.agents/rules/tests.md`; `test:budget` (the gate for `npm test`) passes. prd-23 measured coverage at 135.7 s and 167 s on the same machine under varying load. The new fix suites add about 30 s of test time.

### ADR candidates

None - direct TechSpec implementation (DEC-14, DEC-15).
