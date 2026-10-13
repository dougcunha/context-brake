# Stable execution context

Load in this exact order:

1. `tasks/prd-20-skills-wizard-discovery/prd.md`
2. `tasks/prd-20-skills-wizard-discovery/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Bounded catalog reader

## Outcome

A reader returns the validated skills of a set of project folders, reading only the first 8 KiB of each `SKILL.md`, following symbolic links and junctions, staying inside the directory bound, and turning unreadable folders into warnings.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T03
- In scope: `frontmatter.ts`, `skill-catalog-reader.ts` (taking the folder list as an argument), and the integration tests TC-02 and TC-12.
- Out of scope: The folder lists per harness, the wizard, and the resolver.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, NFR-01, NFR-04 | `prd.md#functional-requirements` | Frontmatter-only, validated, bounded, symlink-safe scan |
| DEC-01, DEC-02, DEC-08, CMP-04, CMP-05 | `techspec.md#technical-decisions` | Reader design |
| TC-02, TC-12 | `techspec.md#test-approach` | Fixtures |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`.
- Existing code: `src/core/contracts/skill-name.ts` (`isSkillName`); `src/infrastructure/storage/` for async fs helpers and error style; `tests/integration/` for the temporary-directory pattern.
- Contract or integration: TechSpec "Integrations and interfaces" and "Errors, security, and recovery".

## Work

- [x] T02.1 Create `src/infrastructure/skills/frontmatter.ts`: read the lines between the first two `---`, return `name` and `description` single-line scalars (quotes removed, block scalars give an empty description).
- [x] T02.2 Create `src/infrastructure/skills/skill-catalog-reader.ts` exporting `readSkillFolders(projectRoot, folders)` that lists each folder with `readdir`, resolves entries with `stat`, opens `SKILL.md` with a file handle and reads at most `MAX_FRONTMATTER_BYTES`, validates names with `isSkillName`, keeps the first duplicate, limits to `MAX_SKILL_DIRECTORIES` directories per folder in name order, and returns `{ skills, warnings }`; a missing folder is empty, any other error becomes a warning and the scan continues.
- [x] T02.3 Add `tests/integration/skill-catalog-reader.test.ts` for TC-02 and TC-12: malformed frontmatter, invalid names, a symlink and, on Windows, a junction (skip with a reason when links cannot be created), a 1000-directory folder, a 1 MB `SKILL.md` with the bytes read asserted, a block-scalar description.

## Acceptance criteria

- The malformed and invalid-name fixtures are ignored with no failure; the symlinked skill is found; a 1000-directory folder returns at most the bound and stays fast.
- The read of a 1 MB `SKILL.md` stops at 8 KiB.
- An unreadable folder produces one warning naming the folder and the cause and does not stop the scan; a missing folder produces none.
- No empty `catch` and no synchronous file API (QA-04, QA-06).

## Verification

- Unit: the frontmatter parser cases in a small unit test or the same file.
- Integration: `tests/integration/skill-catalog-reader.test.ts` over temporary fixture projects.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows run here; symlink and junction cases skip with a reason when links cannot be created.
- Commands: `npx vitest run tests/integration/skill-catalog-reader.test.ts`, `npm run lint`, `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: passing tests, empty QA-04 and QA-06 output.

## Affected files

- Modify: —
- Create: `src/infrastructure/skills/frontmatter.ts`, `src/infrastructure/skills/skill-catalog-reader.ts`, `tests/integration/skill-catalog-reader.test.ts`

## Observability and recovery

- Operational signal: warning text from the reader (consumed by T04)
- Recovery: delete the new files

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `parseFrontmatter` (first two `---` lines, single-line `name` and `description`, quotes removed, block scalars give an empty description) and `readSkillFolders(projectRoot, folders)` returning `{ skills, warnings }`: `readdir` per folder (sorted, at most 500 directories), `stat` follows links and junctions, a 8 KiB head read through a file handle, name from the frontmatter or the folder validated by `isSkillName`, first duplicate wins, missing folders and broken links silent, other errors become one warning like `<folder>: EACCES`. Entries are read in chunks of 32 to keep a 200-skill scan fast.
- Changed files: created `src/infrastructure/skills/frontmatter.ts` (25 lines), `src/infrastructure/skills/skill-catalog-reader.ts` (78 lines), `tests/helpers/skill-fixtures.ts`, `tests/integration/skill-catalog-reader.test.ts`, `tests/integration/skill-catalog-bounds.test.ts`.
- Checks: the two integration files pass (10 tests, 1 skipped: directory permissions are not enforced on Windows, so the unreadable-folder case runs on POSIX only); the junction and broken-link cases ran on Windows; `npm run lint` and `npm run typecheck` pass; QA-01, QA-02, QA-04, QA-06, QA-07 greps empty. Unverified on this machine: the EACCES warning path (POSIX only).
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted; Windows with Git Bash.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision
