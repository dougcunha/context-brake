# Stable execution context

Load in this exact order:

1. `tasks/prd-19-skills-name-and-invocation/prd.md`
2. `tasks/prd-19-skills-name-and-invocation/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Doctor shows the forms

## Outcome

`doctor` prints the configured names and, for each active harness, the form it will receive; `doctor --json` carries `snapshot.invocations`; the published schema is regenerated.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T05
- In scope: `snapshotReport` schema, `doctor-report-extras.ts`, the resolver wiring in `doctor-service.ts` and the composition root, `doctor-mode-text.ts`, tests TC-08.
- Out of scope: the wizard, flags, docs.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07, NFR-05 | `prd.md#functional-requirements` | Names and forms printed; schemas current |
| DEC-04, DEC-06, CMP-10, CMP-11 | `techspec.md#technical-decisions` | Resolver, `invocations` field |
| TC-08 | `techspec.md#test-approach` | Text and JSON |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md` (text labels), `tests.md` (`doctor` runs in process with the fake measurer and runner), `ts-tests`.
- Existing code: `src/core/contracts/diagnostics.ts:24`, `src/core/services/doctor-report-extras.ts`, `src/core/services/doctor-service.ts`, `src/cli/output/doctor-mode-text.ts`, `tests/unit/doctor-mode-text.test.ts`, `tests/integration/doctor-light-mode.test.ts`.
- Contract or integration: TechSpec "Contracts and data".

## Work

- [x] T03.1 Add `invocations` to `snapshotReport` (optional array of `{ harness, command, resumeCommand }`); build it in `doctor-report-extras.ts` for `config.activeHarnesses` with the resolver passed into the doctor input.
- [x] T03.2 Print one line per harness in `doctor-mode-text.ts`, with the label `plain sentence` for the sentence form.
- [x] T03.3 Wire `SKILL_INVOCATIONS` in the CLI composition root.
- [x] T03.4 Update and add tests; run `npm run schemas:generate`.

## Acceptance criteria

- With `claude-code` and `codex-cli` active and `sdd-snapshot` configured, the text shows `/sdd-snapshot` and `$sdd-snapshot` on separate lines and the JSON lists both.
- With no snapshot command, no invocation line is printed and the JSON has no `invocations`.
- `doctor` output for a repository with no config is unchanged.

## Verification

- Unit: text for sentence and slash forms; report builder.
- Integration: `doctor --json` in a fixture project parses with `doctorReportSchema`.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: green commands; schemas current.

## Affected files

- Modify: `src/core/contracts/diagnostics.ts`, `src/core/services/doctor-report-extras.ts`, `src/core/services/doctor-service.ts`, `src/cli/output/doctor-mode-text.ts`, the CLI composition root, `schemas/*`, the affected tests.
- Create: none.

## Observability and recovery

- Operational signal: the `doctor` lines.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `doctor --json` carries `snapshot.invocations` (`{ harness, command, resumeCommand }` per active harness, present only when a snapshot command and a resolver exist); the `doctor` text prints one `- <harness>: <form>[, resume: <form>]` line under the snapshot line. The CLI passes `resolveSkillInvocation` into `diagnoseProject`.
- Changed files: `src/core/contracts/diagnostics.ts`, `src/core/services/doctor-service.ts`, `doctor-report-extras.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/doctor-mode-text.ts`, `schemas/doctor-report.schema.json` (regenerated), `schemas/context-brake.config.schema.json`; tests `doctor-mode-text`, `doctor-light-mode`, `light-mode-lifecycle`, new `doctor-report-extras.test.ts`.
- Checks: `npm run lint` and `npm run typecheck` clean; `npm run coverage` 258 files, 1334 tests passed, 95.98% statements; `npm run schemas:check` passes after `schemas:generate`.
- Validated state: working tree on `master` at base `7295a43` plus T01 to T03, Windows, Node 24.
- Open items: AUTO-08 rewords the `plain sentence` label (PRD UX bullet and DEC-06): the sentence form is printed as words.

### ADR candidates

None - direct TechSpec implementation or local decision.
