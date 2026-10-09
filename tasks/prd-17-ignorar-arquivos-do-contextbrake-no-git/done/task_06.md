# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md`
2. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Docs, rules, repository `.gitignore`, and gates

## Outcome

The README, `AGENTS.md`, and `file-changes.md` describe the managed block and the opt-out instead of "never edits `.gitignore`"; earlier PRD sentences carry a supersede note; this repository's own `.gitignore` relies on the block; every gate is green.

## Dependencies and boundaries

- Depends on: T03, T04, T05
- Unblocks: —
- In scope: the documents above, `tests/unit/readme-gitignore.test.ts`, the repository `.gitignore` (remove the manual ContextBrake lines that `init` now generates, keep `/.agents/settings.json`), running every gate and recording the results.
- Out of scope: new behavior.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-10 | `prd.md#functional-requirements` | Docs and rules updated |
| NFR-04 | `prd.md#non-functional-requirements` | Budget |
| DEC-10 | `techspec.md#technical-decisions` | Doc changes and repository `.gitignore` |
| CMP-10, TC-10, TC-09 | `techspec.md` | Docs and gates |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (30-line functions, 100-line files, three parameters), `javascript-typescript.md`, `file-changes.md`, `tests.md`; `README.md` must stay LF (edit with the Edit tool, never Python text writes).
- Code: `README.md` (Interactive Setup, Updating and Removal, CLI table), `AGENTS.md` (Project constraints), `.agents/rules/file-changes.md`, `.gitignore`, `tests/unit/readme-config-example.test.ts` (README tests).

## Work

- [x] T06.1 README: `--gitignore` and `--no-gitignore` in the init row; a short "Keeping ContextBrake out of Git" section (what the block lists, opt-out, tracked-files note, `remove`); replace "It does not touch `.gitignore`".
- [x] T06.2 `AGENTS.md` and `.agents/rules/file-changes.md`: the managed block is the one exception to "never edits `.gitignore`".
- [x] T06.3 Search the earlier PRDs and docs for the old statement and add the one-line "Superseded for the managed block by prd-17" note; `tests/unit/readme-gitignore.test.ts` asserts the README flags and the rule text.
- [x] T06.4 Run `init` on this repository to generate the block, drop the manual ContextBrake lines it replaces from `.gitignore` (keep `/.agents/settings.json`), and check `git status`.
- [x] T06.5 Run `npm run lint`, `typecheck`, `coverage`, `schemas:check`, `test:budget`, `dependencies:check`; record the results.

## Acceptance criteria

- A search for the old "never edits .gitignore" statements finds none outside history notes; the README documents both flags.
- `git status` in this repository lists no ContextBrake-owned file.
- Every gate exits `0`; `npm test` and `npm run coverage` finish within the 180 s budget (report load-related variance honestly).

## Verification

- Unit: `npm test -- tests/unit/readme-gitignore.test.ts tests/unit/readme-config-example.test.ts`.
- Integration: the whole suite through `npm run coverage`.
- End-to-end: not applicable here (TC-11 in QA). Manual: none.
- Platforms: as the gates run (Windows here).
- Commands: as in T06.5.
- Environment dependency: none.
- Expected evidence: command outputs with exit codes and test counts.

## Affected files

- Modify: `README.md`, `AGENTS.md`, `.agents/rules/file-changes.md`, `.gitignore`, earlier PRD files (one-line notes)
- Create: `tests/unit/readme-gitignore.test.ts`

## Observability and recovery

- Operational signal: none. Recovery: revert the documentation commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: README: new section 'Keeping ContextBrake Out of Git' (block example, what is listed and not, rebuild on every init, opt-out, tracked files, outside Git, removal), the init row lists --gitignore and --no-gitignore, and the two statements that ContextBrake never touches .gitignore now describe the block (the old CONTEXTBRAKE marker note says the current block has different markers). .agents/rules/file-changes.md and AGENTS.md name the marked block as the one exception; prd-12 PRD and TechSpec carry a supersede note. T06.4: the repository's own .gitignore keeps the manual lines of commit 5c97f37 because here .claude is an MSYS symlink (to /d/MyProjects/ContextBrake/.agents) that Node on Windows cannot follow, so a generated block would list /.claude/hooks/... and not the /.agents/hooks/... files Git sees; a real init was not run on this repository for the same reason.
- Changed files: modified README.md (kept LF), AGENTS.md, .agents/rules/file-changes.md, tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md and techspec.md, tests/unit/readme-support-table.test.ts (the claim test now expects 'it never edits instruction files' and the managed block); created tests/unit/readme-gitignore.test.ts
- Checks: npm run lint, typecheck, schemas:check, dependencies:check exit 0; npm run test:budget exit 0, test run 106.7 s wall against 180 s (slowest: statusline-shell 18.8 s, init-assistant-equivalence 15.8 s, codex-hook-command-shells 13.2 s); npm run coverage exit 0: 257 files, 1452 tests, 94.77% lines. A first gates run failed one existing README test that asserted the old statement; it was updated.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: (1) init-assistant-equivalence now takes about 16 s under parallel load (12 scenarios of 5 init runs each); it is the second slowest file and still within the budget. (2) On Windows with an MSYS symlink for a harness folder, the generated block cannot name the link target (Node cannot resolve it); POSIX symlinks and Windows junctions resolve (tested with a junction). (3) TC-11 (real git status in a git init folder) belongs to the QA run.

### ADR candidates

None - direct TechSpec implementation or local decision.
