# Implementation plan — Skill discovery and alternatives in the init wizard

## Stable sources

- PRD: `tasks/prd-20-skills-wizard-discovery/prd.md`
- TechSpec: `tasks/prd-20-skills-wizard-discovery/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Pure core services merge the catalogs of the selected harnesses and rank candidates for the snapshot and resume roles | — | T02, T03, T04 |
| T02 | A bounded, frontmatter-only, symlink-safe reader returns validated skills of a folder set | T01 | T03 |
| T03 | The eight harnesses declare their project skill folders (vendor re-check), an exhaustive resolver, and the catalog port implementation | T01, T02 | T04 |
| T04 | The init wizard offers the best matches, alternatives, type another, and none, with typed fallback and no scan outside the wizard | T01, T03 | T05 |
| T05 | Benchmark, README and docs, and the closing gates | T04 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Read-only catalog per harness | T02, T03 | TC-01 |
| FR-02 | `prd.md#functional-requirements` | Frontmatter-only, validated, bounded, symlink-safe | T02 | TC-02, TC-12 |
| FR-03 | `prd.md#functional-requirements` | Snapshot scoring | T01 | TC-03 |
| FR-04 | `prd.md#functional-requirements` | Resume scoring and exclusion | T01, T04 | TC-04, TC-05 |
| FR-05 | `prd.md#functional-requirements` | Option list and order | T04 | TC-05 |
| FR-06 | `prd.md#functional-requirements` | Union across harnesses | T01, T04 | TC-06 |
| FR-07 | `prd.md#functional-requirements` | No scan with flags or non-interactive | T04, T05 | TC-07, TC-14 |
| FR-08 | `prd.md#functional-requirements` | Catalog failure falls back | T04 | TC-08 |
| NFR-01 | `prd.md#non-functional-requirements` | Only the validated name is stored or shown | T02, T04 | TC-09 |
| NFR-02 | `prd.md#non-functional-requirements` | 200 skills within 500 ms | T05 | TC-10 |
| NFR-03 | `prd.md#non-functional-requirements` | Core scoring over a port | T01, T03 | TC-11 (QA-03, QA-05) |
| NFR-04 | `prd.md#non-functional-requirements` | Platforms, symlinks, junctions | T02 | TC-12 |
| NFR-05 | `prd.md#non-functional-requirements` | Words, not color | T04 | TC-13 |
| OBJ-01..OBJ-04, US-01..US-04 | `prd.md#outcomes-and-metrics` | Outcomes and journeys | T01, T03, T04 | TC-01, TC-03, TC-05 |
| TC-01..TC-14 | `techspec.md#test-approach` | Scenarios | as above | test files named in the TechSpec |

## Tasks

- [T01 — Candidate merge and ranking in core](done/task_01.md): contract, merge by name, and snapshot and resume ranking with unit tests.
- [T02 — Bounded catalog reader](done/task_02.md): frontmatter parser and the bounded folder scan with warnings.
- [T03 — Skill folders per harness and the resolver](done/task_03.md): eight folder constants after the vendor re-check, resolver, and `createSkillCatalogReader`.
- [T04 — Wizard picker and wiring](done/task_04.md): the `select` picker, typed fallback, context wiring, and tests.
- [T05 — Benchmark, documentation, and closing gates](done/task_05.md): TC-10, README and docs, final gates.

## Coverage gate

- Coverage: pass; every FR, NFR, and OBJ of the PRD maps to a task and a test.
- Traceability: pass; TC-01 to TC-14 map to tasks.
- Dependencies: pass; acyclic, T01 to T02 to T03 to T04 to T05.
- Atomicity: pass; T04 is the largest and fits one session (one new file plus small edits in four files).
- Executability: pass; commands come from `AGENTS.md`.
- Validation profile: pass; unit and integration in process, one benchmark, the existing built-CLI smoke as regression; Windows run here, Linux and macOS unverified locally.
- Idempotency: pass; the scan is read-only.

## Assumptions and open items

- Assumption: the wizard keeps the typed question when nothing matches (US-03 read as "type another and none are the only ways").
- Assumption: FR-06 "ranks above" applies among equal scores so a name match is never outranked (TechSpec DEC-04).
- Open item: ancestor and user-scope folders are out of scope (PRD); a skill kept in a parent folder is not suggested.
- Required environment: network access for the vendor re-check in T03; if unavailable, the folders of the research doc stand and the gap goes to the handoff.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done

## Problems and solutions

- T04: the resume question also offers `none` (PRD FR-05 wins over TechSpec DEC-06).
- T01: `rankSkills` takes only `{ exclude }` (no `selectedCount`); the TechSpec DEC-04 text lists both and the origin count makes the second redundant.
