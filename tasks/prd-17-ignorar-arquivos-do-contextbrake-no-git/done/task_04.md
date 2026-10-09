# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md`
2. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — `remove` takes the block out

## Outcome

`remove` deletes the ContextBrake block from `.gitignore`, leaves the rest alone, and deletes the file only when nothing else remained.

## Dependencies and boundaries

- Depends on: T01, T03
- Unblocks: T06
- In scope: `removal-service.ts` and `remove.ts` planning the block change; tests.
- Out of scope: init planning (T03).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06 | `prd.md#functional-requirements` | Removal leaves the original; empty file deleted |
| OBJ-05 | `prd.md#outcomes-and-metrics` | No trace after remove |
| DEC-03 | `techspec.md#technical-decisions` | Removal rule |
| CMP-06, TC-06 | `techspec.md` | Component and test |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (30-line functions, 100-line files, three parameters), `javascript-typescript.md`, `file-changes.md`, `tests.md`.
- Code: `src/core/services/removal-service.ts` (`planRemoval`), `src/cli/commands/remove.ts` (snapshots come from `collectProjectSnapshots`, which T03 extended), `gitignore-block.ts`.

## Work

- [x] T04.1 `planRemoval` adds the `.gitignore` change (update or delete, owner `gitignore`) from `removeIgnoreBlock`; malformed markers become a conflict and the file stays.
- [x] T04.2 Tests `tests/integration/remove-gitignore.test.ts` (TC-06): init then remove over a user file and over no file; `remove --dry-run`.

## Acceptance criteria

- After `init` then `remove`, `.gitignore` equals the original (file ending with a line break); a block-only file is deleted.
- `remove` on a project without a block plans no `.gitignore` change.
- Existing `remove` tests pass unchanged.

## Verification

- Unit: none beyond T01. Integration: `npm test -- tests/integration/remove-gitignore.test.ts`.
- End-to-end: not applicable here (TC-11 in QA). Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: the test above, `npm test`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-06`, `OBJ-05`, `TC-06`.

## Affected files

- Modify: `src/core/services/removal-service.ts`, `src/cli/commands/remove.ts`
- Create: `tests/integration/remove-gitignore.test.ts`

## Observability and recovery

- Operational signal: the planned change in `remove --dry-run`. Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: planRemoval now plans the .gitignore change from planGitIgnore (enabled false, so it removes the block): update when user lines remain, delete when nothing remains, a GITIGNORE_MARKERS_MALFORMED conflict and finding for broken markers, nothing when there is no block, and nothing when other removal conflicts keep the config and manifest in place.
- Changed files: modified src/core/services/removal-service.ts (66 lines); created tests/integration/remove-gitignore.test.ts (4 tests)
- Checks: npm run lint and typecheck exit 0; the 4 new tests and the existing init-remove-footprint test pass (8 tests); quality sweep: no hit, no file above 100 lines. The whole suite and coverage run in T05 and T06.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: none

### ADR candidates

None - direct TechSpec implementation or local decision.
