# Implementation plan — init keeps ContextBrake's own files out of Git

## Stable sources

- PRD: `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md`
- TechSpec: `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Pure module that adds, replaces, and removes the marked `.gitignore` block | — | T03, T04 |
| T02 | `gitIgnore` setting, `--gitignore` / `--no-gitignore`, owner `gitignore`, regenerated schemas | — | T03, T05 |
| T03 | `init` plans the block from the manifest; Git facts; tracked-files finding; `init-flow.ts` extraction | T01, T02 | T04, T05, T06 |
| T04 | `remove` takes the block out | T01, T03 | T06 |
| T05 | Assistant question, summary line, equivalence | T02, T03 | T06 |
| T06 | README, rules, earlier-PRD notes, repository `.gitignore`, gates | T03, T04, T05 | — |

Execution order: T01, T02, T03, T04, T05, T06 (one task per run).

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Block with one line per owned file | T03 | TC-02, TC-04 |
| FR-02 | `prd.md#functional-requirements` | Rebuilt from the manifest | T03 | TC-05 |
| FR-03 | `prd.md#functional-requirements` | No harness files; symlink path | T03 | TC-02, TC-04 |
| FR-04 | `prd.md#functional-requirements` | Plan, bytes preserved, malformed markers | T01, T03 | TC-01, TC-04, TC-05 |
| FR-05 | `prd.md#functional-requirements` | `--gitignore` / `--no-gitignore`, stored | T02, T03 | TC-03, TC-05 |
| FR-06 | `prd.md#functional-requirements` | `remove` | T01, T04 | TC-01, TC-06 |
| FR-07 | `prd.md#functional-requirements` | Outside Git | T03 | TC-04 |
| FR-08 | `prd.md#functional-requirements` | Tracked files finding | T03 | TC-07 |
| FR-09 | `prd.md#functional-requirements` | Assistant question | T05 | TC-08 |
| FR-10 | `prd.md#functional-requirements` | Docs and rules | T06 | TC-10 |
| NFR-01 | `prd.md#non-functional-requirements` | Safety, idempotency | T01, T03 | TC-01, TC-05 |
| NFR-02 | `prd.md#non-functional-requirements` | Schemas, exit codes | T02 | TC-09 |
| NFR-03 | `prd.md#non-functional-requirements` | Platforms, no process for the block | T03 | TC-02, TC-04 |
| NFR-04 | `prd.md#non-functional-requirements` | 180 s budget | every task, T06 | `npm run test:budget` |
| OBJ-01..05 | `prd.md#outcomes-and-metrics` | Outcomes | T03, T04, QA run | TC-04, TC-05, TC-06, TC-11 |
| DEC-01..10 | `techspec.md#technical-decisions` | Design decisions | T01 (02, 03), T02 (04, 05), T03 (01, 05, 06, 07, 09), T05 (08), T06 (10) | per task |
| TC-11 | `techspec.md#test-approach` | Built CLI in a real Git folder | QA run (`sdd-execute-qa`) | `qa_01/qa.md` |

## Tasks

- [T01 — Managed `.gitignore` block module](done/task_01.md): marker block apply/remove over strings, byte-preserving.
- [T02 — `gitIgnore` setting, flags, and plan owner](done/task_02.md): config key, merge, flags, owner `gitignore`, schemas.
- [T03 — `init` plans the block](done/task_03.md): lines from the manifest, plan change, Git facts, tracked finding, extraction.
- [T04 — `remove` takes the block out](done/task_04.md): block removal and empty-file deletion.
- [T05 — Assistant question](done/task_05.md): prompt, summary, equivalence with the printed command.
- [T06 — Docs, rules, repository `.gitignore`, and gates](done/task_06.md): documents, repository cleanup, all gates.

## Coverage gate

- Coverage: pass. Every FR, NFR, and OBJ maps to a task and a TC; TC-11 is the QA run.
- Traceability: pass. DEC-01..10 and CMP-01..10 appear in the tasks that implement them.
- Dependencies: pass. Acyclic; T01 and T02 are independent.
- Atomicity: pass. T03 is the largest (lines, plan, Git module, extraction, three integration files); if it overruns, split the `init-flow.ts` extraction and the Git module into a preceding task without changing IDs.
- Executability: pass. Commands are the `AGENTS.md` commands; fixtures are temporary folders with an empty `.git` directory; only QA runs a real Git process.
- Validation profile: pass. TC-01..TC-10 run in process; TC-11 runs the built CLI in a real `git init` folder; no real terminal is needed.
- Idempotency: pass. T03 and T05 assert that a second run and the replay of the printed command plan no further change.

## Assumptions and open items

- Assumption: fixtures outside Git (the temporary folders every existing test uses) get no `.gitignore`, so the existing suite is unaffected.
- Open item OI-01 (HIL 2): clarify the PRD edge for a `.gitignore` with no final newline (TechSpec Risks).
- Open item OI-02 (HIL 2): earlier PRD sentences get a supersede note, not a rewrite.
- Required environment: None for T01..T06 (all in process). QA (TC-11) needs Git installed on the machine that runs it.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done

## Problems and solutions

- None.
