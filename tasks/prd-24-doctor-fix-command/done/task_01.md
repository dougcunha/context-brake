# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/prd.md`
2. `tasks/prd-24-doctor-fix-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Doctor fix groups

## Outcome

`doctor --json` gives every `warning` and `error` finding a `fix.group` (`automatic`, `decision`, `manual`); `ok` findings have none. The doctor text replaces the `Fix:` note of `automatic` and `decision` problems with `Fix: run context-brake fix` and adds `, N fixable` to the header.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03
- In scope: CMP-01, CMP-02 (finding field only), CMP-04 (`fixGroups?` only), CMP-05, CMP-06, CMP-10, CMP-11; regenerated `doctor-report.schema.json` and `install-report.schema.json`.
- Out of scope: `CLI_ERROR_COMMANDS` (T04), the `'keep'` request (T02), the fix report schema (T03, T06).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Group per finding |
| FR-02 | `prd.md#functional-requirements` | Text fix line and count |
| FR-15 | `prd.md#functional-requirements` | Optional schema field |
| DEC-01, DEC-02, DEC-11, DEC-14 | `techspec.md#technical-decisions` | Assignment point, maps, text, contract file |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`, `harness-adapters.md`, `cli-output.md`
- Existing code: `src/cli/commands/doctor.ts` (diagnosis to move into `src/cli/doctor-diagnosis.ts`), `src/core/contracts/diagnostics.ts:9`, `src/core/validation/configuration-validator.ts:6`, `src/cli/output/doctor-rows.ts:32-37`, `src/cli/output/doctor-text.ts:24-33`, adapters `claude-code/adapter.ts`, `pi/adapter.ts`, `oh-my-pi/adapter.ts`
- Contract: `techspec.md#contracts-and-data` (doctor finding)

## Work

- [ ] T01.1 Create `src/core/contracts/fix.ts` (`FIX_GROUPS`, `FixGroup`, `FIX_OUTCOMES`, `fixFieldSchema`) and add the optional `fix` field to the finding schema.
- [ ] T01.2 Add `fixGroups?` to `HarnessAdapter`; create `claude-code/fix-groups.ts`; set the maps on the Claude Code, Pi, and Oh-My-Pi adapters.
- [ ] T01.3 Create `src/core/services/fix-groups.ts` with `CORE_FIX_GROUPS` and `assignFixGroups` (DEC-01, DEC-02).
- [ ] T01.4 Move the diagnosis of `runDoctor` into `diagnoseDoctor(env, harness)` in `src/cli/doctor-diagnosis.ts`, including the restart findings and `assignFixGroups`; `runDoctor` renders its result.
- [ ] T01.5 Doctor text: fix note and fixable count (DEC-11).
- [ ] T01.6 Run `npm run schemas:generate`; check that only the optional `fix` field changed in the 2 schema files.

## Acceptance criteria

- Each code of the PRD table gives its group; `INVALID_CONTEXTBRAKE_CONFIG` is `automatic` only for unrecognized keys.
- `ok` findings have no `fix`; an unlisted `warning` code is `manual`.
- Doctor JSON shape, status, and exit codes otherwise unchanged.

## Verification

- Unit: TC-01, TC-02 (`tests/unit/fix-groups.test.ts`); TC-03 (`tests/unit/doctor-text.test.ts`); TC-04 (`tests/unit/schemas.test.ts`).
- Integration: TC-05 (`tests/integration/doctor-fix-groups.test.ts`); existing doctor suites still pass.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows local.
- Commands: touched suites by path with `npx vitest run <files>`; `npm run typecheck`; `npm run lint`; `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: passing suites and a schema diff limited to `fix`.

## Affected files

- Modify: `src/core/contracts/diagnostics.ts`, `src/core/contracts/adapter.ts`, `src/infrastructure/harnesses/claude-code/adapter.ts`, `src/infrastructure/harnesses/pi/adapter.ts`, `src/infrastructure/harnesses/oh-my-pi/adapter.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/doctor-rows.ts`, `src/cli/output/doctor-text.ts`, `schemas/doctor-report.schema.json`, `schemas/install-report.schema.json`, `tests/unit/doctor-text.test.ts`, `tests/unit/schemas.test.ts`
- Create: `src/core/contracts/fix.ts`, `src/core/services/fix-groups.ts`, `src/infrastructure/harnesses/claude-code/fix-groups.ts`, `src/cli/doctor-diagnosis.ts`, `tests/unit/fix-groups.test.ts`, `tests/integration/doctor-fix-groups.test.ts`

## Observability and recovery

- Operational signal: `doctor --json` `fix` field; doctor text fix line.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: doctor assigns `fix.group` after the diagnosis (`assignFixGroups`, core map plus adapter maps); `ok` findings have no `fix`; doctor text replaces the `Fix:` note of `automatic`/`decision` problems with `Fix: run context-brake fix` and adds `, N fixable` to the header; `diagnoseDoctor` in `src/cli/doctor-diagnosis.ts` returns `{ report, now, isInstalled }` for reuse by `fix` (`isInstalled` = config file present or unreadable, or manifest present; DEC-10 step 3).
- Changed files: created `src/core/contracts/fix.ts`, `src/core/services/fix-groups.ts`, `src/infrastructure/harnesses/claude-code/fix-groups.ts`, `src/infrastructure/harnesses/common/restart-fix-groups.ts` (shared Pi/Oh-My-Pi map, not listed in the task; same DEC-02 content), `src/cli/doctor-diagnosis.ts`, `tests/helpers/fix-world.ts` (listed in T04; created here for TC-05 and extended in T04), `tests/unit/fix-groups.test.ts`, `tests/integration/doctor-fix-groups.test.ts`; modified `src/core/contracts/diagnostics.ts`, `src/core/contracts/adapter.ts`, the Claude Code, Pi, and Oh-My-Pi adapters, `src/cli/commands/doctor.ts`, `src/cli/output/doctor-rows.ts`, `src/cli/output/doctor-text.ts`, `schemas/doctor-report.schema.json`, `schemas/install-report.schema.json`, `tests/unit/doctor-text.test.ts`, `tests/unit/schemas.test.ts`, `tests/integration/config-repair-errors.test.ts` (text assertion now expects `Fix: run context-brake fix`; JSON still asserts the remediation and the `automatic` group).
- Checks: `npx vitest run` on fix-groups, doctor-text, schemas, doctor-rows, doctor-fix-groups: 60 passed; 26 doctor-related suites (unit and integration): 95 passed after the config-repair update; `npm run typecheck` pass; `npm run lint` pass; `npm run schemas:check` pass (diff limited to the optional `fix` object in both report schemas). Quality profile QA-01 to QA-07 over the task files: no hit.
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation (DEC-01, DEC-02, DEC-11).
