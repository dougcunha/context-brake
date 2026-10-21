# Stable execution context

Load in this exact order:

1. `tasks/prd-23-doctor-readable-output/prd.md`
2. `tasks/prd-23-doctor-readable-output/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Render the doctor report as cards on stdout

## Outcome

`context-brake doctor` prints the header line and the cards `Problems`, `Harnesses`, `Context`, `Sessions`, and `Checks passed`, in this order, on stdout for every status. Problems come first with `Impact:` and `Fix:` notes. Overhead `fail` shows `WARN` on the harness row without a status change. Limitations and passed-check messages stay hidden (the `verbose` option exists but is always false until T03).

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03
- In scope: `formatDoctorReport` and `renderDoctorText` in `doctor-text.ts`; row builders; `formatTokens`; one `now` in `runDoctor`; removal of `renderFinding`, `excludedDetectionLines`, `renderModeLines`, `renderActiveSessionsText`, and `detection-text.ts`; repointing the tests that use them.
- Out of scope: the `--verbose` flag, the verbose rows, and the hint line (T03); the README (T03); `init`/`remove` output (`install-text.ts`, `install-rows.ts`); the help text (DEC-11).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Header with label and counts |
| FR-02 | `prd.md#functional-requirements` | Section order; empty sections omitted, except `Problems` |
| FR-03, FR-04 | `prd.md#functional-requirements` | Problem rows; `No problems found.` |
| FR-05, FR-06 | `prd.md#functional-requirements` | Harness rows, overhead `WARN`, excluded harnesses; status unchanged |
| FR-07, FR-08 | `prd.md#functional-requirements` | Context and Sessions cards |
| FR-10, FR-11 | `prd.md#functional-requirements` | Default mode: checks on one row; limitations hidden |
| FR-13 | `prd.md#functional-requirements` | stdout for every status |
| NFR-02..NFR-05 | `prd.md#non-functional-requirements` | Labels, fixed separator, ASCII, English |
| DEC-01..DEC-08 | `techspec.md#technical-decisions` | Cards, bare labels, formatter split, one `now`, dead code, row shape, overhead segment, `formatTokens` |
| CMP-01..CMP-07, CMP-09 | `techspec.md#components-and-flow` | Components |
| TC-01..TC-07, TC-10, TC-13 | `techspec.md#test-approach` | Scenarios |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md`, `code-standards.md`, `javascript-typescript.md`, `tests.md`; skill `ts-tests`.
- Existing code: `src/cli/output/install-text.ts:26-34` (pattern to copy); `src/cli/output/card.ts` (`renderCard`, `CardRow`); `src/cli/output/style.ts` (`detectStyle`, `PLAIN_STYLE`); `src/cli/output/text.ts`, `doctor-mode-text.ts`, `doctor-sessions-text.ts`, `detection-text.ts` (logic to move); `src/core/services/trigger-text.ts` (`describeTrigger`); `src/cli/commands/doctor.ts:38-61`.
- Contract: `techspec.md#contracts-and-data` (exact text of each card).
- Tests to repoint: `tests/unit/cli-output-text.test.ts`, `tests/unit/doctor-mode-text.test.ts`, `tests/unit/snapshot-trigger-percentage-merge.test.ts:32`, `tests/integration/config-repair-errors.test.ts:56`.

## Work

- [x] T02.1 Create `src/cli/output/token-format.ts` with `formatTokens` (DEC-08).
- [x] T02.2 Create `src/cli/output/doctor-rows.ts` with `problemRows`, `harnessRows`, and `checkRows` (DEC-02, DEC-06, DEC-07).
- [x] T02.3 Change `doctor-mode-text.ts` to `contextRows` plus `describeSnapshot`, and `doctor-sessions-text.ts` to `sessionRows(sessions, now)`.
- [x] T02.4 Create `src/cli/output/doctor-text.ts` with `formatDoctorReport(report, { verbose, now, style })` and `renderDoctorText(report, { verbose, now })` writing to stdout (DEC-03).
- [x] T02.5 Reduce `text.ts` to `renderCliErrorText`; delete `detection-text.ts` (DEC-05).
- [x] T02.6 In `runDoctor`, read `systemClock.now()` once, pass it to `diagnoseProject` and to `renderDoctorText` with `verbose: false` (DEC-04).
- [x] T02.7 Write `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-rows.test.ts`, `tests/unit/doctor-sessions-text.test.ts`; rewrite `cli-output-text.test.ts` and `doctor-mode-text.test.ts`; repoint `snapshot-trigger-percentage-merge.test.ts:32` and `config-repair-errors.test.ts:56` (stdout, `Fix:`).

## Acceptance criteria

- The text matches `techspec.md#contracts-and-data` for every card, with `PLAIN_STYLE`.
- A report with status `errors` writes everything to stdout and nothing to stderr; the exit code is 2.
- Overhead 133.7 ms / 100 ms with status `fail` prints `overhead 134 ms / 100 ms WARN`, and the header stays `OK` when no warning finding exists.
- Token counts print as `1,000,000` on every platform.
- No new file above 100 lines; no QA-01 to QA-03 hit; `doctor --json` output is unchanged.

## Verification

- Unit: TC-01 to TC-07 and TC-10 in the new and rewritten suites.
- Integration: TC-13 in `tests/integration/config-repair-errors.test.ts` (in process, invalid configuration fixture).
- End-to-end: not changed; `tests/e2e/e2e-doctor.test.ts` must still pass in the final full run.
- Manual: run `node dist/src/cli/main.js doctor` on this repository after `npm run build` and compare with the PRD sample.
- Platforms: platform-independent text with `PLAIN_STYLE`; Windows locally, Linux and macOS in CI.
- Commands: `npx vitest run tests/unit/doctor-text.test.ts tests/unit/doctor-rows.test.ts tests/unit/doctor-sessions-text.test.ts tests/unit/cli-output-text.test.ts tests/unit/doctor-mode-text.test.ts tests/unit/snapshot-trigger-percentage-merge.test.ts tests/integration/config-repair-errors.test.ts`, then `npm run lint` and `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: listed suites pass; QA profile clean on the task diff.

## Affected files

- Modify: `src/cli/output/text.ts`, `src/cli/output/doctor-mode-text.ts`, `src/cli/output/doctor-sessions-text.ts`, `src/cli/commands/doctor.ts`, `tests/unit/cli-output-text.test.ts`, `tests/unit/doctor-mode-text.test.ts`, `tests/unit/snapshot-trigger-percentage-merge.test.ts`, `tests/integration/config-repair-errors.test.ts`
- Create: `src/cli/output/doctor-text.ts`, `src/cli/output/doctor-rows.ts`, `src/cli/output/token-format.ts`, `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-rows.test.ts`, `tests/unit/doctor-sessions-text.test.ts`
- Remove: `src/cli/output/detection-text.ts`

## Observability and recovery

- Operational signal: the doctor text itself.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `formatDoctorReport` / `renderDoctorText` (`src/cli/output/doctor-text.ts`) render the header and the cards Problems, Harnesses, Context, Sessions, Checks passed with `renderCard`, always on stdout; row builders in `doctor-rows.ts`, `doctor-mode-text.ts` (`contextRows`, `describeSnapshot`), `doctor-sessions-text.ts` (`sessionRows`); `formatTokens` in `token-format.ts`; `text.ts` keeps only `renderCliErrorText`; `detection-text.ts` removed; `runDoctor` reads `systemClock.now()` once. The `verbose` option is in the type and always `false` until T03.
- Changed files: `src/cli/output/{doctor-text,doctor-rows,token-format}.ts` (new), `src/cli/output/{doctor-mode-text,doctor-sessions-text,text}.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/detection-text.ts` (deleted); tests `tests/unit/{doctor-text,doctor-rows,doctor-sessions-text}.test.ts` (new), `tests/unit/{doctor-mode-text,cli-output-text,snapshot-trigger-percentage-merge}.test.ts`, `tests/integration/{config-repair-errors,doctor-active-sessions,doctor-exclusion,debug-mode-lifecycle}.test.ts`.
- Checks: the 7 T02 suites 28/28 passed; all 24 in-process suites that run doctor 80/80 passed; `npx eslint` on the 17 touched files clean; `npm run typecheck` clean; QA-01, QA-02, QA-03, QA-06, QA-07 on the diff: no hit (largest new file `doctor-rows.ts`, 67 lines); `npm run build` then `node dist/src/cli/main.js doctor` on this repository printed the card layout with `overhead 155 ms / 100 ms WARN`, header `OK (no problems found)`, exit 0.
- Validated state: base `419c0bd` plus the pre-existing prd-22 diff and T01, Windows 11, Node.js 24.20.0, Git Bash.
- Open items: 3 integration suites outside the TechSpec list also asserted the old text (`doctor-active-sessions`, `doctor-exclusion`, `debug-mode-lifecycle`); they now assert the card rows (AUTO-04). Card labels are painted `muted` by `card.ts`, so the `WARN`/`ERROR` row label keeps its text but not its color; the row value carries the tone.

### ADR candidates

None - direct TechSpec implementation or local decision (DEC-01 to DEC-08).
