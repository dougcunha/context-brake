# Implementation plan — Human-readable doctor output

## Stable sources

- PRD: `tasks/prd-23-doctor-readable-output/prd.md`
- TechSpec: `tasks/prd-23-doctor-readable-output/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `activeSessions` lists only main-agent sessions, in text and JSON | — | T03 |
| T02 | `doctor` prints the new card layout (header, Problems, Harnesses, Context, Sessions, Checks passed) on stdout for every status | — | T03 |
| T03 | `doctor --verbose` shows limitations and passed-check messages; the default output ends with the hint line; the README documents the new output | T01, T02 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Header with label and counts | T02 | TC-01 |
| FR-02 | `prd.md#functional-requirements` | Section order; empty sections omitted | T02 | TC-02 |
| FR-03 | `prd.md#functional-requirements` | Problems: errors first, fields, `Fix:` | T02 | TC-03, TC-13 |
| FR-04 | `prd.md#functional-requirements` | `No problems found.` | T02 | TC-03 |
| FR-05 | `prd.md#functional-requirements` | Harness row, overhead `WARN`, excluded harnesses | T02 | TC-04 |
| FR-06 | `prd.md#functional-requirements` | Status and exit code unchanged | T02 | TC-04 |
| FR-07 | `prd.md#functional-requirements` | Context section | T02 | TC-05 |
| FR-08 | `prd.md#functional-requirements` | Sessions section | T02 | TC-06 |
| FR-09 | `prd.md#functional-requirements` | Main-agent sessions only | T01 | TC-09 |
| FR-10 | `prd.md#functional-requirements` | Checks passed, default and verbose | T02 (default), T03 (verbose) | TC-07 |
| FR-11 | `prd.md#functional-requirements` | Limitations only with `--verbose`; hint line | T02 (hidden), T03 (flag, hint) | TC-08 |
| FR-12 | `prd.md#functional-requirements` | `--verbose` flag; no effect with `--json` | T03 | TC-11, TC-12 |
| FR-13 | `prd.md#functional-requirements` | Text on stdout for every status | T02 | TC-13 |
| FR-14 | `prd.md#functional-requirements` | README documents layout and `--verbose` (help unchanged, DEC-11) | T03 | TC-14 |
| NFR-01 | `prd.md#non-functional-requirements` | Schema unchanged | T01, T03 | TC-12, `npm run schemas:check` |
| NFR-02 | `prd.md#non-functional-requirements` | Text labels; color via `style.ts` | T02 | TC-10 |
| NFR-03 | `prd.md#non-functional-requirements` | Fixed thousands separator | T02 | TC-05, TC-06 |
| NFR-04 | `prd.md#non-functional-requirements` | ASCII titles and labels; glyph fallback | T02 | TC-10 |
| NFR-05 | `prd.md#non-functional-requirements` | English text | T02, T03 | review |
| DEC-01..DEC-08, DEC-10 | `techspec.md#technical-decisions` | Cards, labels, formatter split, one `now`, dead code, rows, overhead, tokens, hint | T02 (DEC-10 in T03) | TC-01..TC-08, TC-10 |
| DEC-09 | `techspec.md#technical-decisions` | Filter in `datedSession` | T01 | TC-09 |
| DEC-11 | `techspec.md#technical-decisions` | Help unchanged (confirmed 2026-10-21) | T03 | diff review |
| DEC-12 | `techspec.md#technical-decisions` | `verbose` in `ParsedDoctorArgs` | T03 | TC-11 |
| TC-01..TC-14 | `techspec.md#test-approach` | Scenarios | T01, T02, T03 | listed suites |
| QA-01..QA-07 | `techspec.md#quality-profile` | Quality profile | T01, T02, T03 | profile commands on each task diff |

## Tasks

- [T01 — List only main-agent sessions](done/task_01.md): `datedSession` skips ledgers whose session line has an agent id.
- [T02 — Render the doctor report as cards on stdout](done/task_02.md): a pure formatter builds the 5 sections with `renderCard`, the writer uses stdout for every status, and the old helpers go away.
- [T03 — Add `doctor --verbose` and document the new output](done/task_03.md): the parser accepts `--verbose`, the default output ends with the hint line, and the README matches the new output.

## Coverage gate

- Coverage: pass; every FR, NFR, DEC, and TC maps to a task.
- Traceability: pass; FR-10 and FR-11 split between T02 (default behavior) and T03 (verbose and hint), both named in the matrix.
- Dependencies: pass; acyclic. T01 and T02 touch different files; T03 touches `doctor-text.ts`, `doctor-rows.ts`, and `doctor.ts` after T02, and the README after T01.
- Atomicity: pass; T01 is 1 source file and 1 test; T02 is 7 source files and 6 test files of one layer (`src/cli/output/`); T03 is 4 source files, 2 tests, and the README.
- Executability: pass; commands from `AGENTS.md`.
- Validation profile: pass; unit and in-process integration tests only; `tests/e2e/e2e-doctor.test.ts` stays unchanged and must pass; output is platform-independent with `PLAIN_STYLE`.
- Idempotency: pass; read-only command, no persisted state.

## Assumptions and open items

- Assumption: no script parses the doctor text (PRD); the README points automation to `--json`.
- Decided: DEC-11 = help unchanged, README only (user, 2026-10-21).
- Required environment: None.

## State

- [x] T01 — completed
- [x] T02 — completed
- [x] T03 — completed

## Problems and solutions

- T02: 3 integration suites outside the TechSpec test list asserted the old doctor text (`tests/integration/doctor-active-sessions.test.ts`, `doctor-exclusion.test.ts`, `debug-mode-lifecycle.test.ts`); updated to the card rows (AUTO-04). A Python heredoc turned `
` into a real newline inside a regex in `config-repair-errors.test.ts`; fixed with a direct edit.
