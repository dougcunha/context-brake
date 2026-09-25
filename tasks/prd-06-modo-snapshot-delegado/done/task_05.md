# Stable execution context

Load in this exact order:

1. `tasks/prd-06-modo-snapshot-delegado/prd.md`
2. `tasks/prd-06-modo-snapshot-delegado/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — E2E e documentação

## Outcome

The built CLI proves the delegated mode end to end against fixture repositories, and the README documents how to configure it.

## Dependencies and boundaries

- Depends on: T03, T04
- Unblocks: —
- In scope:
  - `tests/e2e/e2e-delegated-snapshot.test.ts`;
  - a README section with a config example covered by the README example test.
- Out of scope: new behavior.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| OBJ-01, OBJ-02, OBJ-03 | `prd.md#outcomes-and-metrics` | End-to-end outcomes |
| OBJ-04, NFR-01 | `prd.md` | The full suite is unchanged without the section |
| FR-09 | `prd.md#functional-requirements` | Documented configuration |
| TC-14, TC-15 | `techspec.md#test-approach` | Scenarios |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, plus `.agents/rules/cli-output.md`.
- Existing tests to model:
  - `tests/e2e/cli-runner.ts`;
  - `e2e-simulated-usage.test.ts`, `e2e-brake.test.ts`, `e2e-plan-init.test.ts`;
  - `tests/unit/readme-config-example.test.ts`.

## Work

- [x] T05.1 Write an e2e test that:
  - runs `init` with the section on a fixture repo that has Claude Code;
  - drives the hook with simulated usage to RED, then CRITICAL;
  - checks that the blocks cite the command and never mention `task_plan` or `state_checkpoint`;
  - confirms an allowed write passes and a disallowed write is denied;
  - runs `doctor --json` and reads `checkpointMode`;
  - creates a plan with `plan init` and checks that the next block uses the plan action.
- [x] T05.2 Add a README section: purpose, `init` flags, the config example, the trigger zone, allowed paths, skills, the harness limitation from DEC-07, and that `run` needs a plan.
- [x] T05.3 Run the full validation set.

## Acceptance criteria

- The e2e test passes with the built CLI in a temp directory.
- The README example parses under the config schema (TC-15).
- The full suite, lint, typecheck, coverage, and `schemas:check` pass.

## Verification

- Unit: TC-15.
- Integration: not applicable.
- End-to-end: TC-14.
- Manual (optional, user): the real Claude Code session described in `techspec.md#test-approach`.
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- Environment dependency: none.
- Expected evidence: test counts, a green coverage run, and the README diff.

## Affected files

- Modify: `README.md`, `tests/unit/readme-config-example.test.ts` if the example needs its own case
- Create: `tests/e2e/e2e-delegated-snapshot.test.ts`

## Observability and recovery

- Operational signal: none new.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `tests/e2e/e2e-delegated-snapshot.test.ts` runs the built CLI and the installed Claude Code hook. The flow is:
  - `init` with the section;
  - YELLOW without the command, and RED and CRITICAL with it;
  - no plan words in any block;
  - a denied write with the delegated message;
  - an allowed snapshot write and an allowed `Skill` call;
  - `doctor --json` in delegated mode;
  - after `plan init`, a return to the plan action.

  The README has a "Delegated Snapshot Mode" section and the new `init` options. The README test parses the delegated example (TC-15).
- Changed files:
  - Modified: `README.md`, `tests/unit/readme-config-example.test.ts`.
  - Created: `tests/e2e/e2e-delegated-snapshot.test.ts`.
- Checks:
  - `eslint .`: pass.
  - `npm run typecheck`: pass.
  - `npm run schemas:check`: pass.
  - `npm run build`: pass.
  - `npm run coverage`: 237 files, 1,501 passed and 3 skipped (the skips existed before); all files 95.35% lines and statements, 90.01% branches, 96.92% functions.
  - `npm run package:smoke`: pass.
  - `npm run dependencies:check`: pass.
- Validated state: working tree on top of `3b94a9c` with T01 to T05 applied, on Windows 11. Linux and macOS rely on the CI matrix.
- Open items: optional manual acceptance in a real Claude Code session, from `techspec.md#test-approach`, which would also capture a real `Skill` payload (O-01).

### ADR candidates

None - direct TechSpec implementation or local decision.
