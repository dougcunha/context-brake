# Stable execution context

Load in this exact order:

1. `tasks/prd-23-doctor-readable-output/prd.md`
2. `tasks/prd-23-doctor-readable-output/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Add `doctor --verbose` and document the new output

## Outcome

`context-brake doctor --verbose` shows the capability limitations under each harness and one row per passed check with its message. Without `--verbose`, the output ends with the hint line when something is hidden. `doctor --json --verbose` gives the same document as `doctor --json`. The README describes the new layout, `--verbose`, and the main-session rule.

## Dependencies and boundaries

- Depends on: T01, T02
- Unblocks: —
- In scope: `verbose` in `ParsedDoctorArgs`; verbose rows in `harnessRows` and `checkRows`; the hint line (DEC-10); passing `args.verbose` in `runDoctor`; README.
- Out of scope: the help text (DEC-11, confirmed); new data in the JSON report.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-10 | `prd.md#functional-requirements` | Verbose: one row per `ok` finding with its message |
| FR-11 | `prd.md#functional-requirements` | Limitations with `--verbose`; hint line otherwise |
| FR-12 | `prd.md#functional-requirements` | `--verbose` flag; no effect with `--json` |
| FR-14 | `prd.md#functional-requirements` | README |
| NFR-01 | `prd.md#non-functional-requirements` | Schema unchanged |
| DEC-10, DEC-11, DEC-12 | `techspec.md#technical-decisions` | Hint condition and text; help unchanged; parser field |
| CMP-01, CMP-02, CMP-08, CMP-09, CMP-11 | `techspec.md#components-and-flow` | Components |
| TC-07, TC-08, TC-11, TC-12, TC-14 | `techspec.md#test-approach` | Scenarios |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md`, `code-standards.md`, `tests.md`; skill `ts-tests`.
- Existing code: `src/cli/argument-parser.ts` (`parseDoctor`, strict `parseArgs`); `src/cli/output/doctor-text.ts` and `doctor-rows.ts` from T02; `src/cli/commands/doctor.ts`.
- Documentation: `README.md` command table (doctor row, line 329 at `419c0bd`), "Active Sessions in `doctor`" (line 262), debug-mode sentence (line 258), lines that quote old doctor text (`excluded by configuration` at line 202, `debug mode: on` at line 258).

## Work

- [x] T03.1 Add `verbose` to `ParsedDoctorArgs` and `parseDoctor` (DEC-12).
- [x] T03.2 With `verbose`, add limitation notes in `harnessRows` and one row per `ok` finding in `checkRows`.
- [x] T03.3 Add the hint line in `formatDoctorReport` per DEC-10.
- [x] T03.4 Pass `args.verbose` from `runDoctor`.
- [x] T03.5 Write `tests/unit/doctor-arguments.test.ts` (TC-11) and extend `doctor-text.test.ts` and `doctor-rows.test.ts` (TC-07 verbose, TC-08); add TC-12 (`--json` equals `--json --verbose`, schema parse).
- [x] T03.6 Update the README: command table, doctor layout, `--verbose`, main sessions only.

## Acceptance criteria

- `doctor --verbose` prints each limitation as a note under its harness and has no hint line.
- The default output with 2 limitations and 1 `ok` finding ends with `Run context-brake doctor --verbose to see 2 capability limitations and the passed-check messages.`
- A report with no limitations and no `ok` finding has no hint line.
- `doctor --verbos` exits 64 with `INVALID_ARGUMENTS`.
- `doctor --json --verbose` and `doctor --json` give equal documents that parse with `doctorReportSchema`.

## Verification

- Unit: TC-07 (verbose), TC-08, TC-11.
- Integration: TC-12, in process with the fake overhead measurer and process runner (`tests.md`, Time Budget and Processes).
- End-to-end: not applicable; the final full run includes `tests/e2e/e2e-doctor.test.ts`.
- Manual: TC-14, README diff review; run `node dist/src/cli/main.js doctor --verbose` after `npm run build`.
- Platforms: platform-independent.
- Commands: `npx vitest run tests/unit/doctor-arguments.test.ts tests/unit/doctor-text.test.ts tests/unit/doctor-rows.test.ts` plus the TC-12 suite; then, as the last task, `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: suites pass; coverage run passes; schema check passes.

## Affected files

- Modify: `src/cli/argument-parser.ts`, `src/cli/output/doctor-text.ts`, `src/cli/output/doctor-rows.ts`, `src/cli/commands/doctor.ts`, `README.md`, `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-rows.test.ts`, the TC-12 suite
- Create: `tests/unit/doctor-arguments.test.ts`

## Observability and recovery

- Operational signal: the hint line names what `--verbose` adds.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `doctor --verbose` (`ParsedDoctorArgs.verbose`) adds limitation notes under each harness and one `OK` row per passed check with its message; without it, `formatDoctorReport` ends with `Run context-brake doctor --verbose to see <n> capability limitation(s) and the passed-check messages.` when something is hidden (DEC-10); `runDoctor` passes `args.verbose`; README updated (command table, Diagnostics bullet with the layout, debug-mode sentence, main-agent rule in "Active Sessions in `doctor`"); help text unchanged (DEC-11).
- Changed files: `src/cli/argument-parser.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/doctor-rows.ts` (79 lines), `src/cli/output/doctor-text.ts` (68 lines), `README.md`, `tests/unit/doctor-rows.test.ts`, `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-arguments.test.ts` (new), `tests/integration/doctor-verbose.test.ts` (new, TC-12 suite).
- Checks: T03 suites 22/22 passed; `npm run lint` clean; `npm run typecheck` clean; `npm run schemas:check` passed; `npm run coverage` 277 files, 1450 passed, 1 skipped, all files 96.15% lines, `doctor-rows.ts`, `doctor-text.ts`, `token-format.ts` 100%, duration 135.7 s; QA-01, QA-02, QA-06, QA-07 on the diff: no hit; `npm run build` then `node dist/src/cli/main.js doctor` ends with the hint naming 2 capability limitations.
- Validated state: base `419c0bd` plus the pre-existing prd-22 diff and T01-T03, Windows 11, Node.js 24.20.0, Git Bash.
- Open items: none. `npm run test:budget` not run; the coverage run took 135.7 s, under the 180 s budget.

### ADR candidates

None - direct TechSpec implementation or local decision (DEC-10 to DEC-12).
