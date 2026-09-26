# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/prd.md`
2. `tasks/prd-07-modo-leve/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — E2E e documentação

## Outcome

The built CLI, run as a child process against temporary fixture repositories, proves OBJ-01, OBJ-02, OBJ-03, OBJ-05, and the FR-09 round trip. The README documents light mode (when to use it, `init --light`, the config example, what it does not do, and how to leave it) and the active-session list in `doctor`.

## Dependencies and boundaries

- Depends on: T02, T03, T04, T05
- Unblocks: —
- In scope:
  - `tests/e2e/e2e-light-mode.test.ts`;
  - the README section, the command table row, and the feature table row;
  - `tests/unit/readme-light-example.test.ts`.
- Out of scope: production code changes, except fixes for defects that the e2e run exposes. A fix goes back to the owning task's contract.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| OBJ-01, OBJ-02, OBJ-03, OBJ-05 | `prd.md#outcomes-and-metrics` | End-to-end outcomes |
| FR-08, FR-09 | `prd.md#functional-requirements` | Inventory and round trip through the built CLI |
| TC-13, TC-14 | `techspec.md#test-approach` | e2e and README example |

## Context to recover on demand

- Applicable rules: `.agents/rules/tests.md`, `cli-output.md`.
- Existing code:
  - `tests/e2e/e2e-delegated-snapshot.test.ts`, the closest model;
  - `tests/e2e/cli-runner.ts`;
  - the simulated-usage helpers used by `tests/e2e/e2e-simulated-usage.test.ts`.
- README: the `### Delegated Snapshot Mode` section, the command table at line 240, and the feature table at line 270.

## Work

- [x] T06.1 Write TC-13 in `tests/e2e/e2e-light-mode.test.ts`, with these steps:
  1. Run `init --light --yes` and check the file inventory.
  2. Feed the Claude Code hook simulated usage to `YELLOW`, `RED`, and `CRITICAL`. Check the light blocks and that `PreToolUse` in `CRITICAL` is not denied.
  3. Send `SessionStart` with `task_plan.json` present, and check that it injects nothing.
  4. Run `doctor --json` and check `effective: light` and that `activeSessions[0]` matches the last hook reading.
  5. Run a full `init`, then `init --light --yes`, then `init --no-light --yes`, and check the managed files after each step.
- [x] T06.2 Add a `### Light Mode` README section after the delegated one, with the `lightMode` example, and update the command and feature tables. Document the `doctor` active-session list and its 30-minute "last activity" heuristic.
- [x] T06.3 Add TC-14 in `tests/unit/readme-light-example.test.ts`: the README example parses with `parseConfiguration`.
- [x] T06.4 Rebuild `dist/` and run the full validation.

## Acceptance criteria

- TC-13 passes against the built CLI. It asserts:
  - the exact inventory from OBJ-01;
  - blocks with no forbidden word;
  - no deny in `CRITICAL`;
  - no `SessionStart` output;
  - `checkpointMode.effective === "light"`;
  - `activeSessions[0]` equals the last hook reading of the driven session;
  - a full install restored byte-identical to a fresh one.
- The README example parses, and the README states that light mode has no brake, no protocol, no boot, and no snapshot command, and that `run` does not support it.
- `npm run coverage` passes with at least 80% coverage.

## Verification

- Unit: TC-14.
- Integration: not applicable.
- End-to-end: TC-13 with the built CLI.
- Platforms: CI matrix.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- Environment dependency: none. Rebuild `dist/` before e2e.
- Expected evidence: test counts, coverage summary, and a green package smoke test.

## Affected files

- Modify: `README.md`
- Create: `tests/e2e/e2e-light-mode.test.ts`, `tests/unit/readme-light-example.test.ts`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - TC-13 in `tests/e2e/e2e-light-mode.test.ts` runs the built CLI and the installed Claude Code hook as child processes and proves:
    - the exact OBJ-01 inventory;
    - the light blocks at `YELLOW`, `RED`, and `CRITICAL`, with no forbidden word;
    - no deny for a `Write` in `CRITICAL`;
    - no `SessionStart` output with `task_plan.json` present;
    - `doctor --json` reporting `effective: light` and listing the driven session in `activeSessions`;
    - the full → light → full round trip reproducing a fresh full install.
  - The README has a `### Light Mode` section and an `### Active Sessions in doctor` section, plus updated command, feature, and status texts. TC-14 checks that the README example parses.
- Changed files:
  - Modified: `README.md`, `tests/test-lanes.ts`.
  - New tests: `tests/e2e/e2e-light-mode.test.ts` (2), `tests/unit/readme-light-example.test.ts` (1).
  - In `tests/test-lanes.ts`, the process lane now lists `wrap-light-mode`, `doctor-light-mode`, and `doctor-active-sessions`. `test-lanes.test.ts` flagged `wrap-light-mode`; the two doctor suites follow `doctor-delegated-snapshot`.
- Checks (integrated validation of T01–T06):
  - `npm run build`, `schemas:check`, `dependencies:check`, and `package:smoke` exit 0. `typecheck` and `lint` pass.
  - The first `npm run coverage` failed on one test, `test-lanes`, because of the missing lane registration. After the fix, the rerun gives 279 files, 1,765 passed, 3 skipped, and 0 failed, with coverage of 95.54% statements, 91.04% branches, 96.46% functions, and 95.54% lines.
- Validated state: working tree at `c3fb6a8` plus the T01–T06 diffs, on Windows 11 with Node 24 and `dist/` rebuilt. Linux and macOS are covered only by CI, which has not run.
- Quality profile: QA-01 to QA-08 have no hits. QA-09: `tests/test-lanes.ts` grows from 103 lines (pre-existing, above the limit) to 106 with three list entries, so this change aggravates a reservation that was already there.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision.
