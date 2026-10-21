# Implementation plan — `context-brake fix` command

## Stable sources

- PRD: `tasks/prd-24-doctor-fix-command/prd.md`
- TechSpec: `tasks/prd-24-doctor-fix-command/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Doctor assigns fix groups; JSON `fix` field; text `Fix: run context-brake fix` and fixable count | — | T03 |
| T02 | Planner inputs: `planInit`, `overwritePaths`, status line `'keep'` | — | T04 |
| T03 | Fix report contract, outcome service, and argument parser | T01 | T04 |
| T04 | `context-brake fix` non-interactive: `--yes`, `--force`, `--harness`, `--dry-run`, `--json`, stops, exit codes, text output, help | T02, T03 | T05, T06 |
| T05 | `context-brake fix` on a TTY: decision questions and confirmation | T04 | T06 |
| T06 | Publication: `fix-report.schema.json`, schema lists, e2e smoke, README | T04, T05 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Fix group per finding | T01 | TC-01, TC-02, TC-05 |
| FR-02 | `prd.md#functional-requirements` | Doctor text fix line and count | T01 | TC-03 |
| FR-03 | `prd.md#functional-requirements` | Plan reruns init, keeps configuration | T02, T04 | TC-10, TC-24 |
| FR-04 | `prd.md#functional-requirements` | Plan shown before confirmation | T05 | TC-11 |
| FR-05 | `prd.md#functional-requirements` | One question per decision | T02, T05 | TC-06, TC-07, TC-12 |
| FR-06 | `prd.md#functional-requirements` | `--yes`, `--force`, `--harness` | T02, T04 | TC-13 |
| FR-07 | `prd.md#functional-requirements` | `CONFIRMATION_REQUIRED` without TTY | T04 | TC-14 |
| FR-08 | `prd.md#functional-requirements` | `--dry-run` changes nothing | T04 | TC-15 |
| FR-09 | `prd.md#functional-requirements` | Outcome per finding | T03, T04 | TC-08, TC-16 |
| FR-10 | `prd.md#functional-requirements` | Restart note | T03, T04 | TC-08, TC-17 |
| FR-11 | `prd.md#functional-requirements` | Needs an installation | T04 | TC-18 |
| FR-12 | `prd.md#functional-requirements` | Nothing to fix | T04 | TC-19 |
| FR-13 | `prd.md#functional-requirements` | Exit codes | T03, T04 | TC-08, TC-09, TC-20 |
| FR-14 | `prd.md#functional-requirements` | `fix --json` and published schema | T03, T04, T06 | TC-09, TC-21, TC-22 |
| FR-15 | `prd.md#functional-requirements` | Doctor schema `fix` field | T01 | TC-04, `schemas:check` |
| FR-16 | `prd.md#functional-requirements` | README and help | T04, T06 | TC-23 |
| NFR-01 | `prd.md#non-functional-requirements` | Writes only through the init plan | T02, T04 | TC-24, TC-10 |
| NFR-02 | `prd.md#non-functional-requirements` | Consent for modified files | T02, T04, T05 | TC-06, TC-12, TC-13 |
| NFR-03 | `prd.md#non-functional-requirements` | Output rules | T04, T05 | TC-14, TC-17 |
| NFR-04 | `prd.md#non-functional-requirements` | Platforms | T02, T04 | Existing planner and applier; Windows local, CI for others |
| NFR-05 | `prd.md#non-functional-requirements` | Exit code constants | T03 | TC-08 |
| DEC-01, DEC-02 | `techspec.md#technical-decisions` | Fix group assignment | T01 | TC-01, TC-02 |
| DEC-03, DEC-04, DEC-05 | `techspec.md#technical-decisions` | Planner inputs | T02 | TC-06, TC-07, TC-24 |
| DEC-06, DEC-07, DEC-08 | `techspec.md#technical-decisions` | Outcomes and exit codes | T03 | TC-08 |
| DEC-09 | `techspec.md#technical-decisions` | Arguments | T03 | TC-09 |
| DEC-10, DEC-12, DEC-15, DEC-16 | `techspec.md#technical-decisions` | Command sequence, text, help, labels | T04 | TC-10 to TC-20, TC-25 |
| DEC-11 | `techspec.md#technical-decisions` | Doctor text | T01 | TC-03 |
| DEC-13 | `techspec.md#technical-decisions` | Prompts | T05 | TC-11, TC-12 |
| DEC-14 | `techspec.md#technical-decisions` | Contract files and schema | T01, T03, T06 | TC-04, TC-22 |

## Tasks

- [T01 — Doctor fix groups](done/task_01.md): doctor findings carry `fix.group`, and the doctor text points fixable problems to `context-brake fix`.
- [T02 — Planner inputs for fix](done/task_02.md): `planInit` plans without output, and the planner accepts `overwritePaths` and the status line request `'keep'`.
- [T03 — Fix report core](done/task_03.md): the fix report contract, the outcome service, and the `fix` argument parser exist with unit tests.
- [T04 — Fix command without prompts](done/task_04.md): `context-brake fix` runs end to end with flags, text and JSON output, stops, and exit codes.
- [T05 — Fix command on a TTY](done/task_05.md): `context-brake fix` asks each decision and the confirmation on a terminal.
- [T06 — Fix publication](done/task_06.md): the fix report schema is published, the e2e smoke runs, and the README documents `fix`.

## Coverage gate

- Coverage: pass. FR-01 to FR-16 and NFR-01 to NFR-05 map to tasks; out-of-scope items stay out.
- Traceability: pass. Every DEC and TC maps to a task.
- Dependencies: pass. Acyclic; T01 and T02 are independent.
- Atomicity: pass. Each task delivers one reviewable result with its tests.
- Executability: pass. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm test` (touched suites by path between tasks), `npm run coverage`, `npm run schemas:check`, `npm run build`, `npm run test:budget`.
- Validation profile: pass. In-process integration tests; one e2e smoke (`tests/e2e/e2e-fix.test.ts`, T06); CLI QA runs after the review (TechSpec Test approach). Windows local; Linux and macOS through CI.
- Idempotency: pass. A second `fix --yes` after a full fix reaches FR-12 (nothing to fix) and writes nothing (T04).

## Assumptions and open items

- Assumption: plain `init` corrects every `automatic` code (PRD); a code that stays reports `failed` (DEC-07).
- Open item: `.agents/rules/tests.md` e2e list names init, doctor, remove; owner: repository owner.
- Required environment: None.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done

## Problems and solutions

- T02: the T02 typecheck ran before `tests/integration/statusline-keep.test.ts` existed, so a type error at line 21 (`string | null | undefined` passed to `localStatusline`) surfaced in T03. Solution: `change.content ?? null`; T03 typecheck passes. Lesson: run `npm run typecheck` after the tests are written.
