# Stable execution context

Load in this exact order:

1. `tasks/prd-20-skills-wizard-discovery/prd.md`
2. `tasks/prd-20-skills-wizard-discovery/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Skill folders per harness and the resolver

## Outcome

Each of the eight harnesses declares its project skill folders after a re-check against the vendor docs, an exhaustive resolver exposes them, and a `SkillCatalogReader` for any harness returns its skills from a fixture project.

## Dependencies and boundaries

- Depends on: T01, T02
- Unblocks: T04
- In scope: Eight `skill-folders.ts` files, the resolver, the port implementation `createSkillCatalogReader()` composed from the resolver and the reader, the vendor re-check with research doc updates, and TC-01.
- Out of scope: The wizard and the scoring.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, OBJ-03, NFR-03 | `prd.md#functional-requirements` | Per-harness catalog through one port |
| DEC-01, CMP-06 | `techspec.md#technical-decisions` | Folders and exhaustive resolver |
| TC-01, TC-11 | `techspec.md#test-approach` | Eight harnesses |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `harness-adapters.md`, `code-standards.md`, `tests.md`.
- Existing code: `src/infrastructure/harnesses/skill-invocations.ts` and each `*/skill-invocation.ts` (pattern to copy); `src/infrastructure/harnesses/registry.ts`.
- Contract or integration: TechSpec "Contracts and data" folder table.
- Harness reference: the "Skills no projeto e invocação (PRD-19)" line of each harness section in `docs/research/harness-integrations.md`; re-check each linked vendor page before writing that harness file (WebFetch) and update the line when the folders differ (AGENTS.md requires it).

## Work

- [x] T03.1 Re-check the vendor page of each harness for the project skill folders; record the date and any difference in the research doc line.
- [x] T03.2 Create `src/infrastructure/harnesses/<harness>/skill-folders.ts` (8) exporting the folder constant, and `src/infrastructure/harnesses/skill-folders.ts` with the exhaustive `Record<HarnessId, readonly string[]>` and `resolveSkillFolders`.
- [x] T03.3 Create `src/infrastructure/skills/skill-catalog.ts` exporting `createSkillCatalogReader(): SkillCatalogReader`, which calls the reader with the resolved folders of the harness (the file holds only this composition).
- [x] T03.4 Add `tests/integration/skill-catalog-harnesses.test.ts` for TC-01: `it.each` over `HARNESS_IDS` with one skill in the first declared folder, plus an empty project with no warning.

## Acceptance criteria

- For each of the eight harnesses the fixture skill is returned and an empty project returns an empty list with no warning.
- A ninth `HarnessId` would fail to compile without folders (the record is exhaustive).
- The research doc lines are current, or untouched when the vendor pages agree, with the re-check date in the handoff.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/skill-catalog-harnesses.test.ts`.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows run here.
- Commands: `npx vitest run tests/integration/skill-catalog-harnesses.test.ts`, `npm run lint`, `npm run typecheck`.
- Environment dependency: network access for the vendor page re-check; if a page cannot be fetched, keep the folders of the research doc and record the gap in the handoff.
- Expected evidence: eight passing cases, research doc diff or a note of no change.

## Affected files

- Modify: `docs/research/harness-integrations.md` (only where the re-check differs)
- Create: `src/infrastructure/harnesses/skill-folders.ts`, `src/infrastructure/harnesses/*/skill-folders.ts` (8), `src/infrastructure/skills/skill-catalog.ts`, `tests/integration/skill-catalog-harnesses.test.ts`

## Observability and recovery

- Operational signal: none
- Recovery: revert the folder constants

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: eight `skill-folders.ts` constants, the exhaustive `SKILL_FOLDERS: Record<HarnessId, readonly string[]>` resolver (`resolveSkillFolders`), and `createSkillCatalogReader()` composing the resolver and `readSkillFolders`. Vendor re-check on 13/10/2026 with WebFetch: Claude Code, Codex, Cursor, Copilot CLI, OpenCode, Antigravity match the TechSpec table. Differences recorded in `docs/research/harness-integrations.md` (three new PRD-20 bullets): Pi documents `.agents/skills/` and recursive discovery but not `.pi/skills`; Oh-My-Pi documents `.github/skills`, `.agents/skills`, `.agent/skills` but not `.omp/skills` in writing; Claude Code also treats `.claude/commands/*.md` as skills (the catalog ignores them, DEC-08). `.pi/skills` and `.omp/skills` stay declared (harmless when absent).
- Changed files: created `src/infrastructure/harnesses/skill-folders.ts`, `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,opencode,pi,oh-my-pi,antigravity-cli}/skill-folders.ts`, `src/infrastructure/skills/skill-catalog.ts`, `tests/integration/skill-catalog-harnesses.test.ts`; modified `docs/research/harness-integrations.md`.
- Checks: 16 tests pass (each harness reads a skill from every folder it declares, in order, and an empty project gives an empty catalog); `npm run lint` and `npm run typecheck` pass; QA-01, QA-02 greps empty.
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted; Windows with Git Bash; network available for the re-check.
- Open items: ancestor and recursive discovery (Codex, Pi, OpenCode), `.claude/commands`, and nested `.claude/skills` are not read (PRD out of scope, DEC-08); the Antigravity user-scope paths stay out of scope.

### ADR candidates

None - direct TechSpec implementation or local decision
