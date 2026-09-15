# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_08/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward.

---

# T30: Make support levels and capability limitations match the installed integrations

## Outcome

`init` and `doctor`, in text and JSON, derive support from the approved capability rule and report exact per-harness limitations without using failure or timeout behavior to lower the level.

## Dependencies and boundaries

- Depends on: a HIL resolution of the Antigravity contradiction recorded below.
- Unblocks: T33, T34, and T35.
- In scope: capability IDs, level derivation, eight adapter declarations, install-plan limitations, text/JSON parity, schema regeneration, removal of the Copilot warning finding, and focused support tests.
- Out of scope: registering Antigravity `PreToolUse`, implementing PRD-02 telemetry/brake behavior, changing schema version 1, version-floor research, and README prose owned by T34.
- Pending HIL decision: PRD-01 TechSpec DEC-03 installs only Antigravity `PreInvocation` and defers blocking to PRD-02; PRD 1.1 FR-02/TechSpec DEC-02 declares `pre_tool_block: supported` and expects `partial`; `codereview_08/CR-02` rejects that current declaration as an overclaim. Recommended resolution: keep DEC-03's safety boundary, declare Antigravity blocking unsupported for the currently installed integration, and amend the PRD 1.1 expectation to `cooperative` until PRD-02 installs selective blocking. Do not change the Antigravity state or its expected level without the HIL decision.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_08/CR-02` | `codereview.md#findings` | Current levels and capability declarations downgrade documented full integrations and overclaim unavailable behavior. |
| PRD 1.1 | FR-02, FR-03, FR-04, NFR-02 | Defines level inputs, failure/timeout limitations, context usage, and additive schema compatibility. |
| PRD 1.1 TechSpec | DEC-02, DEC-03, `Capability declarations`, TC-01 to TC-03 | Defines `tool_coverage`, the full-support set, exact adapter states/impacts, and report behavior. |
| PRD-01 | RF3, RF8, RF20, CA-15 | Requires a truthful support statement and limitations. |

## Requirements

- Add `tool_coverage` to `CAPABILITY_IDS` and the generated doctor-report capability enum without changing `schemaVersion`.
- Derive `cooperative` when `pre_tool_block` is not supported; derive `full` only when `pre_tool_block`, `tool_coverage`, `post_tool_telemetry`, and `session_boot` are all supported; otherwise derive `partial`.
- `context_usage` and `timeout_fail_closed` remain visible capabilities and limitations but never affect the level.
- Apply the exact seven settled adapter rows and impact strings from PRD 1.1 TechSpec `Capability declarations`. Apply the Antigravity row only after the HIL gate is resolved and the specification records the chosen current-integration meaning.
- Add `limitations` to `HarnessInstallPlan`; installation and removal planning must copy level and limitations from one derived profile rather than computing parallel claims.
- `init` text and JSON print limitations beside the harness result. `doctor` continues to use the same profile. Limitation-only output creates no warning finding and does not change the exit code.
- Remove `COPILOT_TIMEOUT_LIMITATION`; Copilot remains `full`, its timeout behavior appears as a limitation, and a non-timeout command failure remains documented as denying.
- Regenerate additive report schemas and update tests that enumerate capability IDs, combinations, harness plans, or serialized output.

## Context to recover on demand

- TechSpec: PRD 1.1 `DEC-02`, `DEC-03`, `Capability declarations`, `Report contracts`, TC-01, TC-02, TC-03, and TC-15.
- Rules and skills: `cli-output.md`, `harness-adapters.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, and `antislop`.
- Code: `src/core/contracts/harness.ts:14-50` - closed capability and support enums.
- Code: `src/core/services/support-service.ts:46-62` - current all-capabilities level rule.
- Code: `src/core/contracts/changes.ts:19-31` and `src/core/contracts/diagnostics.ts` - install and doctor schemas.
- Code: `src/core/services/installation-service.ts:49-60` and `removal-service.ts:57-71` - plan profile projection.
- Code: `src/cli/output/text.ts` - text projection.
- Call graph: `deriveSupportProfile` is consumed by all eight adapters and support/failure-policy tests.

## Work

- [ ] T30.1 Obtain and record the HIL decision for the Antigravity contradiction; update the affected PRD 1.1 expectation/decision if the current installed channel remains non-blocking.
- [ ] T30.2 Add failing exhaustive level tests and exact profile tests for every settled adapter plus the approved Antigravity outcome.
- [ ] T30.3 Implement `tool_coverage`, the four-capability full-support set, exact adapter states/impacts, and the approved Antigravity state.
- [ ] T30.4 Project limitations into installation/removal plans and text/JSON output, remove the Copilot warning finding, and preserve exit-code behavior.
- [ ] T30.5 Regenerate report schemas, add integration/E2E output parity tests, and run gates and the quality profile.

## Acceptance criteria

- TC-01 exhaustively proves the three support levels and proves that context/timeout states never alter them.
- TC-02 matches every adapter's state, level, and exact limitation text to the approved table, including the recorded Antigravity decision.
- TC-03 proves equivalent limitations in `init` text/JSON and `doctor` text/JSON; limitations alone leave the command exit code unchanged.
- Copilot is `full` with a timeout limitation and no `COPILOT_TIMEOUT_LIMITATION` finding.
- Codex remains `partial` because hosted tools bypass hooks, not because context usage or timeout is unsupported.
- Generated schemas are current, additive, and remain version 1.

## Verification

- Unit: `support-service.test.ts`, `harness-adapters.test.ts`, report/schema tests, and CLI text projection tests.
- Integration: `copilot-failure-policy.test.ts` proves limitation behavior without a warning finding.
- End-to-end: add a built-CLI support-limitation scenario covering Copilot and Cursor text/JSON parity.
- Manual: HIL records the Antigravity decision before implementation proceeds past T30.1.
- Platforms: local platform during implementation; T35 supplies the final CI matrix.
- Environment dependency: HIL decision for Antigravity; no network or vendor binary is required after that decision.
- Commands: `npm run build`, focused Vitest files, `npm run schemas:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: recorded decision, exact eight-profile snapshot/assertions, output parity, unchanged limitation-only exit code, current schemas, and green gates.

## Affected files

- Modify: `tasks/prd-01.1-pendencias-da-instalacao/prd.md` and/or `techspec.md` only as required to record the HIL Antigravity resolution.
- Modify: `src/core/contracts/harness.ts`, `src/core/contracts/changes.ts`, `src/core/contracts/diagnostics.ts`, `src/core/services/support-service.ts`.
- Modify: all eight `src/infrastructure/harnesses/*/adapter.ts` capability declarations.
- Modify: `src/core/services/installation-service.ts`, `src/core/services/removal-service.ts`, `src/cli/output/text.ts`.
- Modify: `schemas/install-report.schema.json`, `schemas/doctor-report.schema.json` through schema generation.
- Modify: `tests/unit/support-service.test.ts`, `tests/unit/harness-adapters.test.ts`, `tests/unit/cli-output-text.test.ts`, `tests/integration/copilot-failure-policy.test.ts`, and affected report/schema tests.
- Create: `tests/e2e/e2e-support-limitations.test.ts`.

## Observability and recovery

- Operational signal: `init` and `doctor` show the same level and limitations for each harness in both formats.
- Recovery: revert T30 and regenerate schemas; this restores the old enum and output but also restores CR-02.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- HIL decision (recorded verbatim, resolved before implementation; T30.1):
  > Antigravity CLI keeps DEC-03's safety boundary: PRD-01 installs ONLY the `PreInvocation` hook; it does NOT register `PreToolUse` (no neutral pass-through exists; `allow` auto-approves).
  > Therefore Antigravity CLI's `pre_tool_block` is declared `unsupported`, so its derived level becomes `cooperative` (DEC-02: cooperative when `pre_tool_block` is not supported).
  > Amend `tasks/prd-01.1-pendencias-da-instalacao/prd.md` FR-02 so Antigravity CLI is listed as `cooperative` (not `partial`), and amend the PRD 1.1 TechSpec capability table row and impact table to record this decision. Use this exact new impact text for Antigravity CLI `pre_tool_block`: `PRD-01 installs only the Antigravity CLI PreInvocation hook; selective pre-tool blocking arrives with PRD-02.`
  > The final Antigravity row is: `pre_tool_block` U, `tool_coverage` ?, `post_tool_telemetry` U, `session_boot` U, `context_usage` U, `timeout_fail_closed` ? → level `cooperative`.
- Produced result: T30.1-T30.5 complete. `tool_coverage` added to `CAPABILITY_IDS` and the generated doctor enum; `support-service.ts` derives `cooperative` when `pre_tool_block` is not supported, `full` only when `pre_tool_block`, `tool_coverage`, `post_tool_telemetry`, and `session_boot` are all supported, else `partial`, with `context_usage`/`timeout_fail_closed` never affecting the level. All eight adapter declarations match the PRD 1.1 TechSpec table and exact impact texts (Antigravity `pre_tool_block` unsupported per the HIL decision). `HarnessInstallPlan` carries `limitations`, projected from one `capabilityProfile()` call in both installation and removal services. `init` text and JSON print limitations beside each harness; `doctor` uses the same profile. `COPILOT_TIMEOUT_LIMITATION` removed; Copilot stays `full` with the timeout/command-failure limitation and no warning finding. Schemas regenerated additively at `schemaVersion` 1.
- Changed files: `tasks/prd-01.1-pendencias-da-instalacao/prd.md`, `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`; `src/core/contracts/harness.ts`, `src/core/contracts/changes.ts`, `src/core/contracts/diagnostics.ts`; `src/core/services/support-service.ts`, `src/core/services/installation-service.ts`, `src/core/services/removal-service.ts`; `src/cli/output/text.ts`; all eight `src/infrastructure/harnesses/*/adapter.ts`; `schemas/doctor-report.schema.json`, `schemas/install-report.schema.json` (generated via `npm run schemas:generate`, never hand-edited); `tests/unit/support-service.test.ts`, `tests/unit/harness-adapters.test.ts`, `tests/unit/cli-output-text.test.ts`, `tests/unit/report-service.test.ts`, `tests/unit/schemas.test.ts`, `tests/unit/changes-schema.test.ts`, `tests/integration/copilot-failure-policy.test.ts`; created `tests/e2e/e2e-support-limitations.test.ts`.
- Checks: `npm run build` passed; `npm run schemas:check` passed; `npm run lint` passed; `npm run typecheck` passed; `npm test` passed (77 files, 314 passed, 1 POSIX-only skip); `npm run coverage` passed (statements 92.17%, branches 84.44%, functions 96.08%, lines 92.17%, all above 80%); focused suites passed (support-service 7, harness-adapters 8, cli-output-text 4, report-service 4, copilot-failure-policy 2, schemas 3, changes-schema 5, e2e-support-limitations 2). TechSpec QA-01 to QA-06 over the changed TypeScript files: 0 new hits (no `any`, no `@ts-ignore`/`eslint-disable`, no empty catch, no `core` import of `infrastructure`/`cli`, no generic `throw new Error(`, no 4+ parameter declarations, no file above 100 lines).
- Validated state: code current at the uncommitted correction worktree over `2a26a3e` (Windows 11 Pro, PowerShell 7, Node 24.19.0, npm 11.17.0); `dist/` built from this source before E2E. Derived profile proof (built code, resolved version probe): claude-code `full` SSSS UU; codex-cli `partial` SU SS UU; cursor `full` SSSS U S; github-copilot-cli `full` SSSS UU; opencode `partial` S? UU U?; pi `full` SSSSS?; oh-my-pi `full` SSSSS?; antigravity-cli `cooperative` U? UU U? (states in `pre_tool_block, tool_coverage, post_tool_telemetry, session_boot, context_usage, timeout_fail_closed` order). TC-01 exhaustive test proves all 3^6 combinations and that varying `context_usage`/`timeout_fail_closed` across all three states never changes the level; TC-02 asserts each adapter's exact states, level, and limitation text; TC-03 E2E proves `init` text/JSON and `doctor` text/JSON carry the same Copilot timeout and Cursor context limitations, that `init` applied exits 0 with limitations present, and that no `COPILOT_TIMEOUT_LIMITATION` finding is produced (a unit report test additionally proves limitations alone yield `success`/exit 0 with no findings).
- Open items: Antigravity returns to a blocking level only when PRD-02 installs selective pre-tool blocking (out of scope here). PRD-01's historical high-level support matrix still labels Antigravity `Parcial`; PRD 1.1 FR-02 supersedes it and this task amended only the PRD 1.1 documents as instructed. No other blockers.
