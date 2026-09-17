# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Protocol checkpoint-commit switch

## Outcome

The generated protocol file instructs the red-zone commit with the `checkpoint:` prefix under the default configuration, omits every mention of committing when `instructCheckpointCommit` is off, and keeps the complete boot routine for harnesses without session-start injection.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T09
- In scope: threading the existing configuration key into zone actions and protocol rendering, and confirming the boot routine's completeness.
- Out of scope: adding configuration keys, since both already ship; committing from the CLI, which the PRD excludes; and boot delivery itself (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF13 | `prd.md#boot-no-início-da-sessão` | Protocol file keeps the boot routine for harnesses without injection |
| RF17 | `prd.md#checkpoint-e-commit` | Red zone updates both files and commits with the `checkpoint:` prefix when validation passes |
| RF18 | `prd.md#checkpoint-e-commit` | The commit instruction can be turned off by configuration |
| CMP-12, CMP-13 | `techspec.md#components-and-flow` | Zone actions and protocol service |
| DEC-11 | `techspec.md#technical-decisions` | `instructCheckpointCommit` threaded into `ProtocolZoneContext` |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/file-changes.md` (ContextBrake owns this generated file; applying the same plan twice changes nothing), `cli-output.md`, `code-standards.md` (named constants, no magic strings).
- Existing code: `src/core/services/zone-actions.ts:13` — the `RED` protocol text hardcoding the commit sentence; `:17-21` — `ProtocolZoneContext`, which does not yet carry the switch.
- Existing code: `src/core/services/protocol-service.ts:10-23` — `buildZoneRows` passes only plan file, checkpoint file, and additional allowed commands; `:36-42` — the boot routine to preserve.
- Existing code: `src/core/contracts/configuration.ts:56,60` — `instructCheckpointCommit` already required and defaulted to `true`.
- Existing code: `src/core/services/doctor-checks.ts:39-53` — `checkProtocolFile` compares rendered content, so the switch must round-trip without a spurious mismatch finding.

## Work

- [ ] T06.1 Add the switch to `ProtocolZoneContext` and make the `RED` clause omit the commit sentence when it is off, keeping the plan and checkpoint update instruction in both cases.
- [ ] T06.2 Pass the key through `buildZoneRows` in the protocol service.
- [ ] T06.3 Confirm the `Starting a new session` routine satisfies RF13 in full, adjusting wording only where a step is missing.
- [ ] T06.4 Tests: rendered protocol with the switch on and off, and a doctor check confirming no mismatch finding for either setting.

## Acceptance criteria

- With the default configuration, the protocol's red-zone row instructs committing with the `checkpoint:` prefix followed by the step title.
- With `instructCheckpointCommit` set to `false`, no row of the protocol mentions committing, while the instruction to update both files remains.
- The critical-zone row keeps allowing the plan and checkpoint writes, the validation command, and the git commands, so the brake never blocks the save the red zone demands.
- The protocol file contains the complete boot routine, so an agent on a harness without session-start injection can follow it from the file alone.
- Rendering twice with the same configuration produces identical content, and `doctor` reports no protocol mismatch for either setting.

## Verification

- Unit: rendered protocol text for both settings, asserting presence and absence of the commit instruction and the preserved allowances.
- Integration: `doctor` against a fixture repository with each setting, asserting no `PROTOCOL_FILE_MISMATCH` finding.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: exact-text assertions for both settings plus the clean doctor run.

## Affected files

- Modify: `src/core/services/zone-actions.ts`, `src/core/services/protocol-service.ts`, `docs/context-brake-protocol.md` (regenerated if wording changes)
- Create: `tests/unit/protocol-commit-switch.test.ts`, `tests/integration/protocol-content.test.ts`

## Observability and recovery

- Operational signal: `doctor` already reports a protocol mismatch when the file drifts from configuration.
- Recovery: the protocol file is generated; re-running `init` restores it.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
