# T12 — Report an unverified harness version floor as a stable doctor warning

## Outcome

For every diagnosed integration whose capability profile has no verified minimum version, `context-brake doctor` emits exactly one warning finding with code `VERSION_FLOOR_UNVERIFIED`. Text and JSON consumers receive the same finding, the support profile remains honest and unchanged, and a report with no errors exits with the existing warning code instead of reporting `healthy`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: `codereview_04/CR-02`, T16.
- In scope: deriving the missing warning in the doctor core flow; stable finding fields; doctor status/exit behavior through the existing report policy; focused unit and built-CLI coverage, including the quick-start scenario.
- Out of scope: inventing numeric version floors, changing adapter capability tables or support levels, changing exit-code constants, vendor research, and `codereview_04/OI-02` overhead semantics.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_04/CR-02` | `codereview.md#findings` | An integration with `minimumVersion: null` contributes only free-text limitation data, so doctor can return `healthy`, exit 0, and an empty findings list while compatibility is explicitly unverified. |
| TechSpec | `CapabilityProfile` degradation rule (lines 189–208) | An unknown floor must produce `VERSION_FLOOR_UNVERIFIED` and must not claim version compatibility. |
| PRD | RF20, RF23, CA-16, CA-17, CA-19 | Doctor remains transparent, schema-valid, and error-free while distinguishing warnings from healthy results. |

## Requirements

- Add one `DiagnosticFinding` per diagnosed integration whose derived `CapabilityProfile.minimumVersion` is `null`; use severity `warning`, code `VERSION_FLOOR_UNVERIFIED`, the harness identifier, and actionable message/impact/remediation fields.
- Do not infer the warning from display text. Derive it from the typed capability profile in the core doctor flow, and do not emit duplicates when the adapter also reports other limitations.
- Preserve the integration's support level, capabilities, limitations, and version probe. A missing verified floor is not evidence that the integration is unsupported.
- Reuse the existing report precedence: errors still produce `errors`/exit 2; otherwise the new warning produces `warnings`/exit 1. Do not change named exit-code values.
- Human output and `--json` must expose the same stable code and remediation, and the JSON document must validate against `doctorReportSchema` and the published schema.
- CA-19 remains “error-free”: E2E-09 must assert zero error findings and the time bounds while expecting the documented warning result rather than exit 0.

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — `CapabilityProfile`, unknown-floor degradation, doctor report, exit codes, and CA-16/CA-17 coverage.
- Rules and skills: `.agents/rules/code-standards.md`, `.agents/rules/javascript-typescript.md`, `.agents/rules/node.md`, `.agents/rules/tests.md`, `.agents/rules/cli-output.md`, `AGENTS.md`, `sdd-execute-task`.
- Code: `src/core/services/doctor-service.ts:31-74` — assembles each integration and all findings; `src/core/services/support-service.ts:41-62` — exposes the unknown floor and limitation; `src/core/services/report-service.ts:29-33,69-76` — already maps warning findings to status/exit; `src/core/contracts/diagnostics.ts` — canonical finding and doctor schemas.

## Work

- [x] T12.1 Add failing doctor-service tests for an unknown floor, a verified floor, multiple diagnosed integrations, and coexistence with an error finding; assert exactly-once warning generation and severity precedence.
- [x] T12.2 Create the typed unknown-floor finding in the core doctor flow and append it before `buildDoctorReport`, keeping harness adapters and output renderers free of duplicated policy.
- [x] T12.3 Extend report/text tests to prove `warnings`/exit 1, stable code, harness, impact, and remediation while preserving error precedence and readable `WARN` output.
- [x] T12.4 Update E2E-09 to parse the JSON with `doctorReportSchema`, expect exit 1 and `VERSION_FLOOR_UNVERIFIED`, assert zero error findings and unchanged time limits, and exercise human output for equivalent warning identity.
- [x] T12.5 Run all repository gates and verify `npm run schemas:check` reports no drift unless the canonical Zod contract genuinely required a compatible schema update.

## Acceptance criteria

- A diagnosed Claude fixture with `minimumVersion: null` yields one warning whose code is exactly `VERSION_FLOOR_UNVERIFIED`, includes `harness: "claude-code"`, and tells the user that compatibility cannot be verified and how to proceed.
- The same report has status `warnings`, exit code 1, unchanged support profile data, and schema-valid text/JSON projections with the same finding identity.
- A profile with a verified floor does not receive this warning; multiple integrations receive at most one warning each; any error still determines status `errors` and exit 2.
- E2E-09 remains under five seconds for the core command and two minutes for the workflow, with no error findings.

## Verification

- Unit: doctor-service unknown/known floor and deduplication cases; report-service warning/error precedence; text renderer includes the stable code and remediation.
- Integration: not applicable; the policy is pure core behavior and adapter fixtures are injected.
- End-to-end: E2E-09 runs built CLI in JSON and text modes, validates the JSON schema, observes exit 1, and finds no errors.
- Manual: `node dist/src/cli/main.js doctor --json` in a fixture with an installed integration; expect `warnings`, exit 1, and one stable unknown-floor finding.
- Platforms: Linux, macOS, and Windows through the normal suite; platform evidence is finalized by T16.
- Environment dependency: none for implementation and local tests.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`, `npm run schemas:check`, `npm run dependencies:check`, `npm run package:smoke`.
- Expected evidence: failing-then-passing focused tests, schema-valid built-CLI output, all gates green, and no generated-schema drift unless justified by a canonical contract change.

## Affected files

- Modify: `src/core/services/doctor-service.ts`, `tests/unit/doctor-service.test.ts`, `tests/unit/report-service.test.ts`, `tests/unit/cli-output-text.test.ts`, `tests/e2e/e2e-09.test.ts`.
- Create: —

## Observability and recovery

- Operational signal: human output contains a `WARN` finding and JSON contains `findings[].code === "VERSION_FLOOR_UNVERIFIED"`, with `status: "warnings"` and exit 1.
- Recovery: revert the core finding derivation and its tests; no user files, adapter configuration, or stored state are changed by doctor.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. `src/core/services/doctor-service.ts` gained `unverifiedFloorFinding(harness, support)`, which returns one `warning` `DiagnosticFinding` with code `VERSION_FLOOR_UNVERIFIED` whenever the derived `CapabilityProfile.minimumVersion` is `null`, and `diagnoseHarness` now appends it to that integration's findings before `buildDoctorReport`. Derivation reads the typed capability profile only — no display text, no new adapter or renderer policy. The support profile (level, capabilities, limitations, version probe) is unchanged, so a diagnosed integration with an unknown floor stays `full` support while the report becomes `warnings`/exit 1; any error finding still wins with `errors`/exit 2. `finding.code` is an open `^[A-Z0-9_]+$` pattern in the canonical Zod contract, so no schema change was required and `schemas:check` reports no drift.
- Changed files:
  - `src/core/services/doctor-service.ts` (added the finding derivation; imported `CapabilityProfile`; `findings` is now a mutable copy of the adapter findings)
  - `tests/unit/doctor-service.test.ts` (rewritten around a `makeAdapter(id, minimumVersion, findings)` factory that keeps UT-13 intact and adds the four CR-02 cases)
  - `tests/unit/report-service.test.ts` (added warning/exit-1 and error-precedence coverage)
  - `tests/unit/cli-output-text.test.ts` (asserts `[WARN] VERSION_FLOOR_UNVERIFIED` plus its remediation in rendered output)
  - `tests/e2e/e2e-09.test.ts` (parses with `doctorReportSchema`, expects warnings/exit 1, zero error findings, the stable code, unchanged time bounds, and equivalent human warning identity)
  - `tests/e2e/e2e-07-08.test.ts` (consequential: E2E-08 encoded the superseded exit-0 contract — now expects warnings/exit 1 with the stable code)
  - `tests/e2e/e2e-linked-project-root.test.ts` (consequential: the linked-root doctor assertion encoded the superseded `healthy`/exit-0 contract — now expects `warnings`/exit 1 with the stable code; the nine link-capability bare returns in this same file remain CR-04's scope, owned by T14)
- Checks:
  - Failing-first: `npx vitest run tests/unit/doctor-service.test.ts tests/unit/report-service.test.ts tests/unit/cli-output-text.test.ts` → 3 failed | 9 passed (the three unknown-floor cases returned `[]`), then 12/12 passing after the derivation.
  - `npm run build` — passed.
  - `npm run typecheck` — passed.
  - `npm run lint` — passed (an initial `max-lines-per-function` violation in the new `describe` callback was fixed by splitting it).
  - `npm test` — passed: 61 files, 208 tests (was 203; +5 new cases).
  - `npm run coverage` — passed all four thresholds: 91.34% statements, 91.34% lines, 82.82% branches, 96.15% functions.
  - `npm run schemas:check` — passed, no drift (the finding code requires no contract change).
  - `npm run dependencies:check` — passed: 3 runtime packages, zero install scripts.
  - `npm run package:smoke` — passed.
  - Manual, built CLI in a fresh fixture with an installed claude-code integration: `init --yes` exit 0; `doctor --json` exit 1 with `status: "warnings"`, `exitCode: 1`, exactly one finding `{code: VERSION_FLOOR_UNVERIFIED, severity: warning, harness: claude-code}`, and the integration still `state: installed, support: full, minimumVersion: null`; `doctor` text exit 1 printing `[WARN] VERSION_FLOOR_UNVERIFIED: The minimum verified version for claude-code is unknown, so version compatibility cannot be verified.` with its remediation.
- Validated state: worktree state (the repository still has zero commits and no `HEAD`, so no revision can be named); Node v24.19.0, npm 11.17.0, Windows 11, PowerShell 7.6.6. Platform coverage is Windows only — Linux/macOS evidence stays with T16. The temporary fixture used for the manual check was deleted; no user files or stored state were modified.
- Open items: none for T12. The two consequential E2E assertion updates are required by the changed contract, not new scope. `codereview_04/OI-02` (failed overhead target does not create a finding) is deliberately untouched, and CA-16's numeric floor remains unclaimed by design.

