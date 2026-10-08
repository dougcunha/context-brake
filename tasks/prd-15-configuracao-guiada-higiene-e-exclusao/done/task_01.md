# Stable execution context

Load in this exact order:

1. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
2. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Report unrecognized keys in doctor and let remove proceed

## Outcome

`doctor` names every unrecognized configuration key with its path and a remediation line naming `context-brake init --yes`, in text and JSON, and still diagnoses the active harnesses. `remove` no longer stops on unrecognized keys: it removes the integration and deletes the configuration. The tolerant read (sanitizer plus `ProjectConfigStore.readTolerant`) that `init` reuses in T02 exists.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02
- In scope: `InvalidConfigurationError.remediation` and the unrecognized-only body; `core/validation/configuration-sanitizer.ts`; `ProjectConfigStore.readTolerant`; doctor finding and sanitized configuration; tolerant `remove`.
- Out of scope: the `init` flow and preview (T02); any CLI error-document or `composition-root` change (DEC-01); the runtime hook read (DEC-14).
- Human decision: DEC-HIL-02 (`workflow.md`) clarifies FR-01 for `init` (OI-01, DEC-03) and `remove` (OI-02, DEC-12); the PRD text is unchanged.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Doctor names each key and the fix; other validation errors keep today's message (read with DEC-03, DEC-12) |
| FR-02 | `prd.md#functional-requirements` | Sanitizing parse that drops only unrecognized keys (used by T02) |
| FR-08 | `prd.md#functional-requirements` | `remove` still deletes the configuration |
| NFR-04 | `prd.md#non-functional-requirements` | Text and JSON carry the same content |
| DEC-01, DEC-02, DEC-12 | `techspec.md#technical-decisions` | Remediation property; sanitizer and tolerant read; tolerant `remove` |
| CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-14 | `techspec.md#components-and-flow` | Validator, sanitizer, store, `remove.ts`, doctor checks, `doctor.ts` |
| TC-01, TC-02, TC-03 | `techspec.md#test-approach` | Validator unit; doctor and remove integration; sanitizer unit |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/code-standards.md`, `javascript-typescript.md` (dedicated error class, `cause`, immutability, `unknown`), `cli-output.md`, `tests.md`.
- Existing code: `src/core/validation/configuration-validator.ts` (error class, `toIssues`, `valueAtPath`); `src/infrastructure/storage/project-config-store.ts`; `src/core/services/doctor-checks.ts:6-13`; `src/cli/commands/doctor.ts:21-30` (`readConfigSafely`); `src/cli/commands/remove.ts:19-26` (`loadExistingConfig`); `src/core/services/doctor-service.ts` (`targetIds` use `input.config`).
- Contract or integration: `techspec.md#contracts-and-data` (message and remediation text), `techspec.md#errors-security-and-recovery`.
- Existing tests to update: `tests/unit/configuration-snapshot.test.ts:18-21`; `tests/integration/invalid-config.test.ts` and `remove-invalid-config.test.ts` use non-key issues and stay valid; check for tests that expect `remove` to fail on an unrecognized key.

## Work

- [x] T01.1 Give `InvalidConfigurationError` a `remediation: string | null` set when every issue has the unrecognized-key rule; build the multi-line body for that case and keep the single-line message otherwise. Name the remediation sentence as a constant.
- [x] T01.2 Add `configuration-sanitizer.ts`: `sanitizeConfiguration(input)` returns `{ config, dropped }` (`dropped` items `{ path, received }`); strip by issue path from a deep copy and re-parse until valid; the first pass with any other issue throws the `InvalidConfigurationError` of that pass; never mutate the input.
- [x] T01.3 Add `ProjectConfigStore.readTolerant()` (JSON syntax errors still raise `invalidSyntaxError`); keep `read()` strict.
- [x] T01.4 `doctor`: when the strict read fails and the error is repairable, also read the sanitized configuration and pass it with `configError`; `checkConfig` uses `error.remediation` when present, else the existing sentence.
- [x] T01.5 `remove`: `loadExistingConfig` reads with `readTolerant` and uses its `config`.
- [x] T01.6 Tests: update `tests/unit/configuration-snapshot.test.ts:21`; add `tests/unit/configuration-validator.test.ts` (TC-01), `tests/unit/configuration-sanitizer.test.ts` (TC-03), `tests/integration/config-repair-errors.test.ts` (TC-02).

## Acceptance criteria

- With `stateStorage`, `instructionFiles`, `brake`, `lightMode`, `runner`, `doctor` reports an `error` finding `INVALID_CONTEXTBRAKE_CONFIG` whose `message` lists the five paths and whose `remediation` is `Run context-brake init --yes to drop them, or remove them from context-brake.config.json.`; the JSON validates against `doctorReportSchema`; the active harnesses are still diagnosed.
- A nested key (`telemetry.zones.legacy`) is named with its dotted path.
- A file with an unrecognized key plus another issue keeps the one-line message and the old remediation (`Fix syntax or structure in context-brake.config.json.`).
- `remove --yes` on the five-key fixture exits `0`, deletes the configuration, the manifest, and the harness artifacts, and a second `remove` is a no-op.
- The sanitizer drops nested keys across passes, throws the failing pass's error for non-key issues (a `telemtry` typo that leaves `telemetry` missing is not repaired), and does not mutate its input.
- No new `any`, no comment, touched `src/` files at or below 100 lines.

## Verification

- Unit: `parseConfiguration` on unrecognized-only and mixed input (`message`, `remediation`, `issues`); sanitizer cases (nested, multi-pass, mixed, immutability).
- Integration: `runInProcessCli(['remove','--yes'], dir)` and `runDoctor` with `fakeOverheadMeasurer`/`fakeProcessRunner` on a temporary directory.
- End-to-end: not applicable here (TC-17 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows (no path-specific behavior).
- Commands: `npm test -- tests/unit/configuration-validator.test.ts tests/unit/configuration-sanitizer.test.ts tests/unit/configuration-snapshot.test.ts tests/integration/config-repair-errors.test.ts tests/integration/invalid-config.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: passing tests citing `FR-01`, `FR-02`, `TC-01`..`TC-03` in their names; lint, typecheck, coverage green.

## Affected files

- Modify: `src/core/validation/configuration-validator.ts`, `src/infrastructure/storage/project-config-store.ts`, `src/core/services/doctor-checks.ts`, `src/cli/commands/doctor.ts`, `src/cli/commands/remove.ts`, `tests/unit/configuration-snapshot.test.ts`
- Create: `src/core/validation/configuration-sanitizer.ts`, `tests/unit/configuration-validator.test.ts`, `tests/unit/configuration-sanitizer.test.ts`, `tests/integration/config-repair-errors.test.ts`

## Observability and recovery

- Operational signal: the doctor finding and the remove report.
- Recovery: revert the commit; the strict reads return.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `doctor` reports an unrecognized-only configuration as one error finding whose `message` lists every key path and whose `remediation` is the new `UNRECOGNIZED_KEYS_REMEDIATION` sentence, and still diagnoses the active harnesses (it receives the sanitized configuration). `remove` reads tolerantly and proceeds. `sanitizeConfiguration` and `ProjectConfigStore.readTolerant` exist for T02. Mixed errors keep the one-line message and the old remediation.
- Changed files: modified `src/core/validation/configuration-validator.ts` (remediation, `configurationError`, exported `valueAtPath`), `src/infrastructure/storage/project-config-store.ts`, `src/core/services/doctor-checks.ts`, `src/cli/commands/doctor.ts`, `src/cli/commands/remove.ts`, `tests/unit/configuration-snapshot.test.ts`; created `src/core/validation/configuration-sanitizer.ts`, `tests/unit/configuration-validator.test.ts`, `tests/unit/configuration-sanitizer.test.ts`, `tests/integration/config-repair-errors.test.ts`.
- Checks: `npm run lint` and `npm run typecheck` clean; `npm run coverage`: 222 files, 1186 tests passed, 92.7 s, all-files coverage 94.08%; quality-profile sweep (QA-01..QA-07) over the six touched `src/` files returned no hit and no file above 100 lines.
- Validated state: HEAD `c845728` plus the uncommitted working tree of this task; Windows 11, Node 24.19; no harness binary needed.
- Open items: (1) Evidence for the zod concern raised in review of the plan: a probe on the real `configurationSchema` shows zod reports the unrecognized-keys issue and the cross-field `.check()` issues in the same pass, so `remediation` is accurate for unrecognized-only errors. (2) `remove` still refuses with `MODIFIED_OWNED_ASSET` when the configuration differs from the manifest hash (pre-existing mechanism); the TC-02 test therefore rewrites the manifest hash to mimic an earlier build's consistent files, and QA (TC-17) should build its fixture the same way. (3) T03/T04: verify the restart code registers no extra `hooks.*` events before fixing the "current events" set. T06: `planHarnessRemovals` must take an explicit adapter list and keep the all-adapters fallback in `removal-service.ts`, with a test that a plain `init` plans no harness deletion.

### ADR candidates

None - direct TechSpec implementation or local decision.
