# Stable execution context

Load in this exact order:

1. `tasks/prd-20-skills-wizard-discovery/prd.md`
2. `tasks/prd-20-skills-wizard-discovery/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Candidate merge and ranking in core

## Outcome

Given the catalogs of the selected harnesses, pure core services return the candidates deduplicated by name with their origins, ranked for the snapshot role and the resume role as DEC-04 defines, with the chosen snapshot skill excluded from the resume list.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T03, T04
- In scope: The contract `skill-catalog.ts`, `skill-candidates.ts`, `skill-ranking.ts`, and their unit tests (TC-03, TC-04, TC-06, TC-11 greps).
- Out of scope: Any file reading, harness folders, prompts, and wiring.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03, FR-04, FR-06, OBJ-04 | `prd.md#functional-requirements` | Scoring, exclusion, union |
| DEC-03, DEC-04, CMP-01..CMP-03 | `techspec.md#technical-decisions` | Merge and score |
| TC-03, TC-04, TC-06 | `techspec.md#test-approach` | Fixture orders |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `code-standards.md`, `javascript-typescript.md`, `tests.md`.
- Existing code: `src/core/contracts/skill-invocation.ts` and `src/core/services/skill-invocation.ts` (slice 19 pattern for a contract plus a pure service); `src/core/contracts/harness.ts` (`HarnessId`).
- Contract or integration: TechSpec "Contracts and data".

## Work

- [x] T01.1 Create `src/core/contracts/skill-catalog.ts` with `CatalogSkill`, `SkillCatalog`, and `SkillCatalogReader`.
- [x] T01.2 Create `src/core/services/skill-candidates.ts` with `SkillCandidate` and `mergeCatalogs` (dedupe by name, origins sorted by harness id).
- [x] T01.3 Create `src/core/services/skill-ranking.ts` with the role terms, the scoring (100 name, 10 description first 300 characters, 0 otherwise), the drop of zero scores and of the excluded name, and the order score, origin count, name.
- [x] T01.4 Add `tests/unit/skill-candidates.test.ts` and `tests/unit/skill-ranking.test.ts` for TC-03, TC-04, TC-06 (including a name match beating a universal weaker match, and the `commit` look-alike).

## Acceptance criteria

- `sdd-snapshot` ranks above `commit` and `sdd-triage` when their descriptions cite a checkpoint; `commit` and `sdd-triage` appear only with the description score, or not at all when the score is 0.
- `sdd-orchestrate-flow` ranks first for the resume role; the excluded name is absent.
- A skill in two harnesses ranks above one in a single harness at equal score; a name match still wins.
- No harness id appears in the two services (QA-05); `core` imports nothing from `infrastructure` or `cli` (QA-03).

## Verification

- Unit: the two test files above with the TC-03, TC-04, TC-06 fixtures.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: none.
- Platforms: pure logic, Windows run here.
- Commands: `npx vitest run tests/unit/skill-ranking.test.ts tests/unit/skill-candidates.test.ts`, `npm run lint`, `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: passing tests, empty QA-03 and QA-05 output.

## Affected files

- Modify: —
- Create: `src/core/contracts/skill-catalog.ts`, `src/core/services/skill-candidates.ts`, `src/core/services/skill-ranking.ts`, `tests/unit/skill-candidates.test.ts`, `tests/unit/skill-ranking.test.ts`

## Observability and recovery

- Operational signal: none
- Recovery: delete the new files

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `SkillCatalog` port types, `mergeCatalogs` (dedupe by name, origins sorted by harness then folder, description of the first origin) and `rankSkills`/`scoreSkill` (100 name, 10 description first 300 characters, drop score 0 and the excluded name, order by score, origin count, name).
- Changed files: created `src/core/contracts/skill-catalog.ts`, `src/core/services/skill-candidates.ts` (22 lines), `src/core/services/skill-ranking.ts` (32 lines), `tests/unit/skill-candidates.test.ts`, `tests/unit/skill-ranking.test.ts`.
- Checks: `npx vitest run` over the two files: 9 tests pass; `npm run lint` and `npm run typecheck` pass; QA-03 and QA-05 greps empty. Deviation from the TechSpec text, recorded: `rankSkills(role, candidates, options)` takes only `{ exclude }` because the origin count already carries the harness coverage (no `selectedCount`).
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted; slice 19 changes pre-exist (hashes in `baseline-hashes.txt`); Windows with Git Bash.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision
