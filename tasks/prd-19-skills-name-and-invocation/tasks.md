# Implementation plan — Skill names in the configuration, invocation formatted by each harness

## Stable sources

- PRD: `tasks/prd-19-skills-name-and-invocation/prd.md`
- TechSpec: `tasks/prd-19-skills-name-and-invocation/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | The configuration accepts only a skill name and rejects the old format with a fix message; the invocation formats exist; every test fixture holds bare names | — | T02 |
| T02 | Zone action and resume text are rendered with the format of the harness that receives them; each of the 8 harnesses declares its form | T01 | T03, T04 |
| T03 | `doctor` text and JSON show the name and the per-harness form | T02 | T05 |
| T04 | `init` flags, prompts, preview, help, and summary speak in skill names with the per-harness preview | T02 | T05 |
| T05 | This repository's configuration, README, `AGENTS.md`, SDD references, research doc, and schemas use the bare name; the end-to-end smoke proves the round trip | T03, T04 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Name rule | T01 | TC-01 |
| FR-02 | `prd.md#functional-requirements` | Old format rejected with a fix | T01, T04 | TC-02 |
| FR-03 | `prd.md#functional-requirements` | Per-harness forms in the text | T02, T05 | TC-03, TC-04, TC-13 |
| FR-04 | `prd.md#functional-requirements` | Fallback sentence | T02 | TC-05 |
| FR-05 | `prd.md#functional-requirements` | Flags take the bare name | T04, T05 | TC-06, TC-13 |
| FR-06 | `prd.md#functional-requirements` | Wizard validates and previews | T04 | TC-07 |
| FR-07 | `prd.md#functional-requirements` | Names and forms printed | T03, T04 | TC-08 |
| FR-08 | `prd.md#functional-requirements` | Repo config and docs | T05 | TC-09 |
| FR-09 | `prd.md#functional-requirements` | Research doc entries | T05 | TC-10 |
| NFR-01 | `prd.md#non-functional-requirements` | Syntax inside the harness folder | T02 | TC-03, TC-11, QA-07 |
| NFR-02 | `prd.md#non-functional-requirements` | 60-token budget | T02 | TC-12 |
| NFR-03 | `prd.md#non-functional-requirements` | Platforms | T01-T05 | no shell or path code added; review |
| NFR-04 | `prd.md#non-functional-requirements` | Error messages | T01, T04 | TC-02 |
| NFR-05 | `prd.md#non-functional-requirements` | Schemas current | T01, T03, T05 | `npm run schemas:check` |
| TC-01..TC-13 | `techspec.md#test-approach` | Scenarios | as in the table above | test files named in the TechSpec |

## Tasks

- [T01 — Skill name rule and formats](done/task_01.md): bare-name schema, fix message, standard formats, and bare-name fixtures across the suite.
- [T02 — Harness-rendered guidance](done/task_02.md): descriptor field, eight harness forms, resolver, and zone and resume text.
- [T03 — Doctor shows the forms](done/task_03.md): `snapshot.invocations` in JSON and one line per harness in text.
- [T04 — Flags and wizard in skill names](done/task_04.md): prompts, per-harness preview, help text, and summary.
- [T05 — Repository, docs, and end-to-end](done/task_05.md): own config, README, AGENTS.md, SDD references, research doc, schemas, smoke test, final gates.

## Coverage gate

- Coverage: pass; every FR and NFR of the PRD maps to a task and a test.
- Traceability: pass; TC-01 to TC-13 map to tasks.
- Dependencies: pass; acyclic, T01 to T02 to T03 and T04 to T05.
- Atomicity: pass; T01 and T02 are the largest, each fits one session (T01 is mostly mechanical fixture edits).
- Executability: pass; commands come from `AGENTS.md`.
- Validation profile: pass; unit and integration in process, one end-to-end smoke case; Linux, macOS, Windows.
- Idempotency: pass; `init` replay is covered by TC-06.

## Assumptions and open items

- Assumption: the repository's installed hooks keep working while the code changes, because the bundled hook script is only refreshed by `init` (TechSpec DEC-08).
- Open item: none.
- Required environment: None.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done

## Problems and solutions

- None.
- T01 (2026-10-13): the dead `valueFlag` in `questions-snapshot.ts` and the two replay scenarios (space, leading dash) are consequences of the name rule; T04 removes the code. See `done/task_01.md#Handoff`.
