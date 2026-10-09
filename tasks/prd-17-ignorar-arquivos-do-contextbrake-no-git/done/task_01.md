# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md`
2. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Managed `.gitignore` block module

## Outcome

A pure module can add, replace, and remove the marked ContextBrake block in the text of a `.gitignore`, keeping every byte outside the markers, and reports malformed markers instead of guessing.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03, T04
- In scope: `src/core/services/gitignore-block.ts` (`applyIgnoreBlock`, `removeIgnoreBlock`, marker constants, EOL detection) and its unit tests.
- Out of scope: where the lines come from (T03), the plan and the filesystem.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04 | `prd.md#functional-requirements` | Marked block, bytes outside preserved, malformed markers refuse |
| FR-06 | `prd.md#functional-requirements` | Removal and empty-file result |
| NFR-01 | `prd.md#non-functional-requirements` | Idempotent, safe |
| DEC-02, DEC-03 | `techspec.md#technical-decisions` | Markers, separator, EOL, removal |
| CMP-01, TC-01 | `techspec.md` | Module and test |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (30-line functions, 100-line files, three parameters), `javascript-typescript.md`, `file-changes.md`, `tests.md`.
- Contract: `techspec.md` DEC-02 and DEC-03 and the block example under Contracts and data.

## Work

- [x] T01.1 `applyIgnoreBlock(content: string | null, lines: readonly string[])` returning `{ content }` or `{ error }`: append (blank-line separator, line break added when the last line has none), replace in place, CRLF when the file contains CRLF, identical output on a second call; an empty `lines` removes the block.
- [x] T01.2 `removeIgnoreBlock(content: string)` returning `{ content: string | null }` or `{ error }`: drop the block and the blank line before it; `null` content when nothing remains.
- [x] T01.3 Unit tests (TC-01) for null, empty, LF, CRLF, comments and blank lines, no final newline, existing block, two blocks, start without end, end without start.

## Acceptance criteria

- Every byte outside the markers is unchanged after apply and after remove, except the single inserted line break for a file with no final newline.
- apply(apply(x)) equals apply(x); remove(apply(x)) equals x for files that end with a line break.
- Malformed marker combinations return an error and never a changed text.
- No file above 100 lines; no function above 30 lines.

## Verification

- Unit: `npm test -- tests/unit/gitignore-block.test.ts`.
- Integration: none. End-to-end: not applicable. Manual: none.
- Platforms: Linux, macOS, Windows (string logic only).
- Commands: `npm test -- tests/unit/gitignore-block.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-04`, `FR-06`, `TC-01`; gates green.

## Affected files

- Create: `src/core/services/gitignore-block.ts`, `tests/unit/gitignore-block.test.ts`

## Observability and recovery

- Operational signal: none. Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: src/core/services/gitignore-block.ts adds (blank-line separator, a line break when the last line has none), replaces in place, and removes the marked block; CRLF is used when the file contains CRLF; malformed or repeated markers return an error and no text. removeIgnoreBlock returns null content when nothing remains.
- Changed files: created src/core/services/gitignore-block.ts (63 lines), tests/unit/gitignore-block.test.ts (17 tests)
- Checks: npm run lint and npm run typecheck exit 0; 17 new tests pass (null/empty/LF/CRLF/no final newline/existing block/idempotence/round trips/malformed); quality sweep over the two files: no hit, no file above 100 lines. The full coverage run is deferred to T03 and T06 because this task adds only an unused pure module.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: none

### ADR candidates

None - direct TechSpec implementation or local decision.
