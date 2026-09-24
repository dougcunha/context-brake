# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Runner contracts, configuration, exit codes, and summary schema

## Outcome

The runner's data contracts and ports exist in `core`. `context-brake.config.json` accepts an optional `runner` section with the DEC-08 defaults. `EXIT_CODES` gains `limitReached` and `decisionRequired`. `schemas/run-summary.schema.json` is generated, checked, and packaged.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T03, T05, T06, T07
- In scope:
  - `run-records.ts`: session line, run record, summary, end and stop reasons, approvals file, and runner configuration defaults.
  - `run-ports.ts`.
  - The `runner` configuration section and its cross-field rule `maxSessionMinutes ≤ maxTotalMinutes`.
  - The new exit codes.
  - The schema generate, check, and package lists, and the regenerated configuration schema.
- Out of scope: any behavior that uses these contracts; CLI parsing.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF7, RF17, RF18 | `prd.md#limites-e-condições-de-parada`, `#telemetria-por-comando-e-relatório` | Limits configuration; record and summary shapes |
| DEC-08, DEC-14, DEC-15, DEC-16 | `techspec.md#technical-decisions` | Defaults, record fields, summary schema, exit codes |
| CMP-01, CMP-02, CMP-03, CMP-26 | `techspec.md#components-and-flow` | Contracts, ports, configuration, schema scripts |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `cli-output.md` (exit codes)
- Existing code:
  - `src/core/contracts/configuration.ts:47,60`: the `z._default` pattern for an optional section.
  - `src/core/contracts/session-ledger.ts`: the `zod/mini` line-schema style.
  - `src/cli/exit-codes.ts`.
  - `scripts/generate-schemas.ts`, `check-schemas.ts`, `check-package.ts`.
- Contract: `techspec.md#contracts-and-data`

## Work

- [x] T01.1 Add `run-records.ts`:
  - Literal unions derived from constants: end reasons, stop reasons, validation status, token source.
  - Zod schemas for the session line, run record, approvals file, and run summary.
  - Keep each file at or under 100 lines; split when needed.
- [x] T01.2 Add `run-ports.ts` with the ports named in CMP-02, typed only with `core` types.
- [x] T01.3 Add the optional `runner` section and its defaults to `configuration.ts` and `DEFAULT_CONFIG`; add the cross-field rule.
- [x] T01.4 Add `limitReached: 3` and `decisionRequired: 4` to `EXIT_CODES`.
- [x] T01.5 Publish `run-summary.schema.json` through the generate, check, and package scripts; regenerate the configuration schema.

## Acceptance criteria

- An existing configuration without `runner` parses unchanged, and the parsed value carries the defaults.
- Invalid runner values fail with the field path and the violated rule: zero, negative, non-integer, or `maxSessionMinutes` above `maxTotalMinutes`.
- The session-line and summary schemas are strict objects: they reject content-like fields and accept the DEC-14 fields.
- `npm run schemas:check` and `npm run package:smoke` pass with the new schema in the tarball.

## Verification

- Unit: schema acceptance and rejection per field; defaults; exit codes of existing keys unchanged.
- Integration: not applicable.
- End-to-end: not applicable.
- Platforms: platform-independent.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`
- Environment dependency: none.
- Expected evidence:
  - New unit tests green.
  - Schema check output.
  - The package file list includes `schemas/run-summary.schema.json`.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `src/cli/exit-codes.ts`, `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts`, `schemas/context-brake.config.schema.json`
- Create: `src/core/contracts/run-records.ts`, `src/core/contracts/run-ports.ts`, `schemas/run-summary.schema.json`, `tests/unit/run-records.test.ts`, `tests/unit/runner-configuration.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: the change is additive; reverting it restores the prior schemas.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - **Runner records (DEC-14).** Literal unions come from constants: `SESSION_END_REASONS` (DEC-05), `RUN_STOP_REASONS`, `VALIDATION_STATUSES`, `TOKEN_SOURCES` (an alias of `USAGE_SOURCES`), `RUN_LIMITS`, `RUN_OUTCOMES`, and `RUN_STATUSES` (`running` plus the outcomes). Every `zod/mini` schema is a strict object: the session line with all DEC-14 fields, the run record (`run.json`: status, stop reason, limit, `resumedFrom`, active session key, counters), and the approvals file with its sha256 hash format.
  - **Run summary (DEC-15).** It lives in `run-summary.ts`, split out to keep `run-records.ts` under 100 lines, together with `decisionRequestSchema`.
  - **Runner configuration (DEC-08).** `RUNNER_DEFAULTS` and `runnerConfigurationSchema` hold per-field defaults, messages `must be an integer` and `must be greater than 0`, and the cross-field rule `maxSessionMinutes ≤ maxTotalMinutes`. `configuration.ts` adds `runner: z._default(...)` in the `brake` pattern, and `DEFAULT_CONFIG.runner`.
  - **Ports (CMP-02).** `run-ports.ts` declares `SessionLauncher`, `HarnessSessionProcess` / `RunningHarnessSession`, `ValidationExecutor` / `RunningValidation`, `RunStore` (with `STATE_FILES` for snapshot and restore), `ApprovalStore`, `RunLock`, `CommandApprover`, `StepApprover`, and `LedgerWatcher` / `LedgerWatch`. They use only `core` types, and `Clock` is reused from `session-ledger.ts`.
  - **Exit codes (DEC-16).** `EXIT_CODES` gains `limitReached: 3` and `decisionRequired: 4`.
  - **Published schemas (CMP-26).** `run-summary.schema.json` is generated, checked, and required in the package.
- Changed files:
  - Created `src/core/contracts/run-records.ts`, `run-summary.ts`, `runner-configuration.ts`, `run-ports.ts`, `schemas/run-summary.schema.json`, `tests/unit/run-records.test.ts`, and `tests/unit/runner-configuration.test.ts`.
  - Modified `src/core/contracts/configuration.ts`, `src/cli/exit-codes.ts`, `scripts/generate-schemas.ts`, `scripts/check-schemas.ts`, `scripts/check-package.ts`, `schemas/context-brake.config.schema.json`, and `tests/unit/exit-codes.test.ts`.
- Checks:
  - `npm run typecheck`: clean.
  - `npm run build`: exit 0.
  - `npm run schemas:check`: exit 0.
  - `npm run package:smoke`: exit 0, and `npm pack --dry-run` lists `schemas/run-summary.schema.json`.
  - `npm run coverage`: exit 0. 175 files and 1,024 tests passed, including `runner-configuration` (29), `run-records` (27), and `exit-codes` (6). Overall statement coverage is 93.63%. `run-records.ts`, `run-summary.ts`, and `exit-codes.ts` are at 100%, and `configuration.ts` is at 100% of statements.
  - `npm run lint`: 14 errors, all **pre-existing** in the committed files `tasks/prd-03-plano-checkpoint-e-boot/qa_01/evidence/*.mjs` (`no-undef` for `process`/`console`). The same 14 errors appear with this task's changes stashed. None are in files this task touched.
- Validated state: Git base `eb2f386` with the T01 changes uncommitted, on Windows 11 with Git Bash, Node v24.19.0, and npm 11.17.0. Linux and macOS are unverified (PI-03).
- Quality profile:
  - QA-01–QA-05 and QA-07: empty over the task diff.
  - QA-06: hits only on unchanged lines in `scripts/check-package.ts` and `scripts/check-schemas.ts`, which are prior debt outside the `src` Terrain baseline and not aggravated.
  - QA-08: no hits. The largest touched file is `run-ports.ts` at 83 lines.
  - No new reservation hits.
- Open items:
  1. **Interpretation (DEC-15).** The DEC-15 list names both a session count and a `sessions[]` array, which cannot share a key. The count is `sessionCount` and the array is `sessions`. The summary also carries `runId` and `harnessArgs` (DEC-18: "the run summary lists them").
  2. **Interpretation (configuration schema).** `z.toJSONSchema` in its default output mode lists defaulted sections as `required`, which already happened for `brake`. It would also have published `runner` as required, which contradicts the TechSpec ("the regenerated schema marks `runner` optional"). The configuration schema is therefore generated with `io: 'input'`. The diff only drops `brake` and `brake.additionalAllowedCommands` from `required`, a relaxation that matches what the parser already accepts. Other schemas are unchanged.
  3. **Default configuration.** `DEFAULT_CONFIG` now carries `runner`, so `init` writes the runner section into new configuration files, as it already does for `brake`.
  4. **Coverage gap.** `STATE_FILES` (`run-ports.ts:45`) is not yet exercised. T05's `RunStore.restoreState` is its first caller.
  5. **Ports for later tasks.** They are a first cut from CMP-02. T04, T05, and T07 may refine signatures within the TechSpec, recording the change in their handoffs.
  6. **Extra test file.** `tests/unit/exit-codes.test.ts` was extended to assert that the existing codes are unchanged. It is not in the task's file list, but it is the natural home for that test.

### ADR candidates

None - direct TechSpec implementation or local decision.
