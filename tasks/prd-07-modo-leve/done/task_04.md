# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/prd.md`
2. `tasks/prd-07-modo-leve/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — doctor no modo leve

## Outcome

In light mode, `doctor` does not read the plan or checkpoint files, and it skips the protocol, instruction-block, `.gitignore`, and state-file checks. It reports:

- `LIGHT_MODE_LEFTOVER` for leftover reference blocks and for a protocol still listed in the manifest;
- `DELEGATED_SNAPSHOT_INACTIVE` when a delegated section exists;
- `checkpointMode.effective: "light"`, reason `light_mode`, and a `lightMode` field.

The text output shows the mode line. Outside light mode, the `doctor` output is unchanged.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T05, T06
- In scope:
  - `snapshot-helper.ts`: the `includeState` option;
  - `doctor.ts`;
  - `project-file-checks.ts`, extracted from `doctor-service.ts`;
  - `delegated-diagnostics.ts`;
  - the `checkpointMode` schema in `diagnostics.ts`;
  - `text.ts`;
  - regenerating `schemas/doctor-report.schema.json`.
- Out of scope: `init` (T03) and the runtime (T02).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02, FR-10, FR-11, FR-12 | `prd.md#functional-requirements` | No state reads, inactive delegated section, light checks, JSON report |
| NFR-01 | `prd.md#non-functional-requirements` | Unchanged `doctor` output outside light mode |
| DEC-09, DEC-10 | `techspec.md#technical-decisions` | Snapshot option, findings, report shape |
| CMP-08, CMP-09 | `techspec.md#components-and-flow` | `doctor` components |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `cli-output.md`.
- Existing code:
  - `src/core/services/doctor-service.ts#diagnoseProject`, lines 93–99; the file is at 100 lines.
  - `doctor-checks.ts`.
  - `delegated-diagnostics.ts#checkpointModeReport` and `delegatedSnapshotFindings`.
  - `src/core/contracts/diagnostics.ts:23`.
  - `src/cli/commands/doctor.ts`.
  - `src/cli/snapshot-helper.ts#collectProjectSnapshots`.
  - `src/cli/output/text.ts:58`.
- Tests to mirror: `tests/integration/doctor-delegated-snapshot.test.ts`.

## Work

- [x] T04.1 Add `{ includeState }` to `collectProjectSnapshots`, defaulting to `true`. `doctor.ts` passes `false` when the config has `lightMode` and then passes no plan or checkpoint snapshot.
- [x] T04.2 Create `src/core/services/project-file-checks.ts#projectFileFindings`:
  - in full mode, it runs the current instruction, protocol, state, and `.gitignore` checks;
  - in light mode, it runs the DEC-10 checks.

  `diagnoseProject` calls it and stays at 100 lines or fewer. In light mode, `delegatedSnapshotFindings` returns `[]`.
- [x] T04.3 Extend `checkpointModeReport`:
  - add `effective: 'light'` and `reason: 'light_mode'`;
  - add an optional `lightMode` field, present only in light mode.

  Extend the `checkpointMode` schema in `diagnostics.ts` the same way, then regenerate `doctor-report.schema.json`.
- [x] T04.4 Add the text line `checkpoint mode: light (trigger: <zone>)` to `text.ts`.
- [x] T04.5 Add integration tests: TC-09 in `tests/integration/doctor-light-mode.test.ts`.

## Acceptance criteria

- **Clean install:** a clean light install with no protocol, plan, or checkpoint file is `healthy`.
- **Leftovers:** a leftover reference block in `AGENTS.md` raises `LIGHT_MODE_LEFTOVER` with remediation `Run context-brake init --yes.` So does a manifest that still lists a `protocol` asset.
- **Delegated section:** a delegated section raises `DELEGATED_SNAPSHOT_INACTIVE`, and neither `DELEGATED_SNAPSHOT_NO_PATHS` nor `DELEGATED_SKILL_UNRECOGNIZED`.
- **State files:** an invalid `task_plan.json` present in light mode raises no `INVALID_STATE_FILE`, and it is not read, as shown by the snapshot list passed to the service.
- **JSON report:** `doctor --json` in light mode has `checkpointMode: { effective: "light", reason: "light_mode", delegatedSnapshot: <section or null>, lightMode: { triggerZone } }`. Outside light mode, `doctor --json` has no `lightMode` key and matches the current fixtures.
- **Schema:** `npm run schemas:check` passes.

## Verification

- Unit: not applicable beyond existing doctor unit suites, which must pass unchanged.
- Integration: TC-09 on temporary repositories.
- End-to-end: not applicable (T06).
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: test counts and a green schema check.

## Affected files

- Modify:
  - `src/cli/snapshot-helper.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/text.ts`
  - `src/core/services/doctor-service.ts`, `src/core/services/delegated-diagnostics.ts`, `src/core/contracts/diagnostics.ts`
  - `schemas/doctor-report.schema.json`
- Create: `src/core/services/project-file-checks.ts`, `tests/integration/doctor-light-mode.test.ts`

## Observability and recovery

- Operational signal: the `doctor` text and JSON show the mode and the leftovers.
- Recovery: revert the commit. The `lightMode` field is optional and additive.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - In light mode, `doctor` reads no plan or checkpoint file through `collectDoctorSnapshots`, which leaves out the state paths when `config.lightMode` is set.
  - `projectFileFindings` runs the four full-mode checks. In light mode it runs only the leftover checks: `LIGHT_MODE_LEFTOVER` per instruction file that still has a reference block, and for a `protocol` asset still in the manifest.
  - `delegatedSnapshotFindings` returns only `DELEGATED_SNAPSHOT_INACTIVE` in light mode.
  - `checkpointModeReport` returns `{ effective: 'light', reason: 'light_mode', delegatedSnapshot, lightMode }`.
  - The text shows `checkpoint mode: light (trigger: <zone>)`.
- Deviations within DEC-09 and DEC-10:
  - I added `collectDoctorSnapshots(root, config)` next to `collectProjectSnapshots`, instead of an `includeState` parameter. The effect is the same, and it avoids a fourth parameter.
  - The mode line moved to `src/cli/output/doctor-mode-text.ts` (`renderCheckpointModeLine`), which keeps `text.ts` at 96 lines.
- Changed files:
  - Modified: `src/core/contracts/diagnostics.ts`, `src/core/services/delegated-diagnostics.ts` (43 lines), `src/core/services/doctor-service.ts` (97), `src/cli/snapshot-helper.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/text.ts` (96), `schemas/doctor-report.schema.json`.
  - New code: `src/core/services/project-file-checks.ts`, `src/cli/output/doctor-mode-text.ts`.
  - New test: `tests/integration/doctor-light-mode.test.ts` (5 tests).
- Checks:
  - `npm run typecheck` and `npm run lint` pass. `npm run schemas:generate` updated `doctor-report.schema.json`.
  - TC-09: 5 tests pass.
  - The existing `doctor`, `delegated-install-support`, `gitignore-checks`, report, and text suites pass: 14 files, 50 tests.
- Validated state: working tree at `c3fb6a8` plus the T01 to T04 diffs, on Windows 11 with Node 24. The e2e `doctor` flows run against a rebuilt `dist/` in T06.
- Quality profile: QA-01 to QA-09 have no hits.
- Open items:
  - The TC-09 clean-install case asserts that no full-mode or leftover finding appears, rather than the overall `healthy` status. The status also depends on host harness detection (version floor, executables), which varies by machine. The PRD-06 doctor test makes the same choice.

### ADR candidates

None - direct TechSpec implementation or local decision.
