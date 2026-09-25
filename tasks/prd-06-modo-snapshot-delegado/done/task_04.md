# Stable execution context

Load in this exact order:

1. `tasks/prd-06-modo-snapshot-delegado/prd.md`
2. `tasks/prd-06-modo-snapshot-delegado/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — CLI: init, protocolo, doctor e run

## Outcome

Users add, change, or remove the delegated section with `init` flags. The generated protocol documents the mode, `doctor` reports the effective mode and delegated findings in text and JSON, and `run` explains that it needs a plan.

## Dependencies and boundaries

- Depends on: T02, which provides the resolver for `doctor` and the guidance text for the protocol.
- Unblocks: T05
- In scope:
  - the `init` flags and `planConfigChange` merge;
  - the protocol `## Delegated snapshot` section;
  - `delegated-diagnostics.ts`, `doctor` wiring, and the `checkpointMode` report field with the regenerated doctor schema;
  - the `run` preflight message.
- Out of scope: runtime hooks (T03) and README (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-09, FR-10 | `prd.md#functional-requirements` | `init` and protocol; safe add and remove |
| FR-11, FR-13 | `prd.md#functional-requirements` | `doctor` validation and JSON |
| FR-12 | `prd.md#functional-requirements` | `run` hint |
| NFR-01 | `prd.md#non-functional-requirements` | Protocol and config byte-identical without the section |
| DEC-08, DEC-09, DEC-10 | `techspec.md#technical-decisions` | CLI decisions |
| CMP-08, CMP-09, CMP-10 | `techspec.md#components-and-flow` | Components |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, plus `.agents/rules/file-changes.md` and `cli-output.md`.
- Existing code:
  - `src/cli/argument-parser.ts#parseInit`;
  - `src/core/services/installation-builder.ts#planConfigChange`;
  - `installation-service.ts`;
  - `protocol-service.ts#renderProtocol`;
  - `doctor-service.ts` (98 lines: put the new checks in `delegated-diagnostics.ts`);
  - `src/core/contracts/diagnostics.ts#doctorReportSchema`;
  - `src/cli/commands/run-preflight.ts#requireRunnablePlan`.
- Tests to model:
  - `tests/integration/protocol-content.test.ts`, `multi-harness-install.test.ts`, `doctor-asset-currency.test.ts`, `run-command-preflight.test.ts`;
  - `tests/unit/protocol-service.test.ts`.

## Work

- [x] T04.1 Parse `--snapshot-command`, `--snapshot-trigger`, `--resume-command`, `--snapshot-path` (repeatable), `--snapshot-skill` (repeatable), and `--no-delegated-snapshot`. Validate them with the T01 schema and route failures through `CliArgumentError` (exit 64). If `argument-parser.ts` passes 100 lines, move init parsing to `src/cli/init-arguments.ts`.
- [x] T04.2 Merge the flags into the config in `planConfigChange`, following DEC-08. The preview summary names the section change.
- [x] T04.3 Append the `## Delegated snapshot` section in `renderProtocol` when the section exists. Without the section, the output stays byte-identical.
- [x] T04.4 Add `checkpointMode` and the findings `DELEGATED_SNAPSHOT_NO_PATHS` and `DELEGATED_SKILL_UNRECOGNIZED` in `delegated-diagnostics.ts`. Add `checkpointMode` to `doctorReportSchema`, regenerate the schemas, and render one text line in `doctor` output.
- [x] T04.5 Add the delegated hint to the missing-plan message in `requireRunnablePlan`.
- [x] T04.6 Add integration tests TC-11, TC-12, and TC-13, plus unit tests for the protocol rendering with and without the section.

## Acceptance criteria

- `init --snapshot-command "/sdd-snapshot" --snapshot-path "tasks/**/context-snapshot.md" --yes` writes the section and a protocol containing the command and trigger zone. A rerun makes no changes.
- `init --no-delegated-snapshot --yes` removes the key. The protocol returns to the byte-identical plan-only text, content outside the markers is unchanged, and an existing `task_plan.json` remains.
- `doctor --json` in a repository with the section and no plan exits healthy (or with the warning when there are no paths) and includes `checkpointMode.effective: "delegated"`.
- `run` with the section and no plan fails with `RUN_PLAN_NOT_RUNNABLE`, and the message mentions the delegated mode and `context-brake plan init`.

## Verification

- Unit: protocol rendering, and flag parsing and validation.
- Integration: TC-11, TC-12, TC-13, in temp repositories.
- End-to-end: not applicable (T05).
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: suites green and the doctor schema regenerated.

## Affected files

- Modify:
  - `src/cli/argument-parser.ts`, `src/cli/commands/init.ts`, `src/cli/commands/doctor.ts`, `src/cli/commands/run-preflight.ts`
  - `src/core/services/installation-builder.ts`, `installation-service.ts`, `protocol-service.ts`, `doctor-service.ts`
  - `src/core/contracts/diagnostics.ts`, `schemas/doctor-report.schema.json`
- Create:
  - `src/core/services/delegated-diagnostics.ts` (and `src/cli/init-arguments.ts` if needed)
  - `tests/integration/init-delegated-snapshot.test.ts`, `tests/integration/doctor-delegated-snapshot.test.ts`

## Observability and recovery

- Operational signal: the `doctor` text and JSON `checkpointMode`.
- Recovery: `init --no-delegated-snapshot`, or reverting the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `init` accepts `--snapshot-command`, `--snapshot-trigger`, `--resume-command`, `--snapshot-path` (repeatable), `--snapshot-skill` (repeatable), and `--no-delegated-snapshot`. They are parsed in `src/cli/init-arguments.ts`, merged by `mergeDelegatedSnapshot`, and applied by `planConfigChange` through `applyDelegatedSnapshot`. Invalid combinations exit 64 with the field path.
  - The protocol appends `## Delegated snapshot` (`delegated-protocol.ts`) only when the section exists.
  - `doctor` reports `checkpointMode` (`effective`, `reason`, `delegatedSnapshot`) and the `DELEGATED_SNAPSHOT_NO_PATHS` (warning) and `DELEGATED_SKILL_UNRECOGNIZED` (ok) findings, and prints a text line when the section exists.
  - `run` adds the delegated hint to `RUN_PLAN_NOT_RUNNABLE`.
- Changed files:
  - Modified: `src/cli/{argument-parser,commands/init,commands/run-preflight,output/text}.ts`, `src/core/contracts/diagnostics.ts`, `src/core/services/{installation-builder,installation-service,protocol-service,doctor-service,report-service}.ts`, `schemas/doctor-report.schema.json`, `tests/test-lanes.ts`, `tests/integration/run-command-preflight.test.ts`.
  - Created: `src/cli/init-arguments.ts`, `src/core/services/{delegated-snapshot-merge,delegated-protocol,delegated-diagnostics}.ts`, `tests/helpers/delegated-world.ts`, `tests/integration/{init-delegated-snapshot,doctor-delegated-snapshot}.test.ts`, `tests/unit/delegated-install-support.test.ts`.
- Checks:
  - `npm run build`: pass.
  - `npm test`: 236 files, 1,499 passed and 3 skipped (the skips existed before).
  - `npm run typecheck`: pass.
  - `eslint .`: pass.
  - `npm run schemas:check`: pass.
  - QA-01 to QA-07 sweeps: empty.
  - QA-08: every file is at or under 100 lines (`init.ts` and `doctor-service.ts` are exactly 100).
- Validated state: working tree on top of `3b94a9c` with T01 to T04 applied, on Windows 11.
- Open items:
  - `doctor --json` now always carries `checkpointMode`, including `reason: no_section`, because FR-13 requires the mode in the JSON. This is an additive, optional schema field. The text output changes only when the section exists. NFR-01 byte-identity therefore holds for config, protocol, and agent-facing text, but not for the doctor JSON document.
  - `ParsedInitArgs.delegatedSnapshot` is optional so the existing programmatic callers stay valid.
  - `doctor-delegated-snapshot.test.ts` runs in the process lane because `doctor` spawns processes for overhead sampling.

### ADR candidates

None - direct TechSpec implementation or local decision.
