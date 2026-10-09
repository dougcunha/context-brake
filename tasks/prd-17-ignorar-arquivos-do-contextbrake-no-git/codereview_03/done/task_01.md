# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T01 — The README names all 3 runtime state files

## Outcome

The "What is listed" bullet of the README names all 3 runtime state files the PRD clarification names: `claude-mod-install.json`, `claude-statusline.json`, and `claude-statusline-opt-out.json`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: the parenthetical of that bullet in `README.md`; the expected string in `tests/unit/readme-gitignore.test.ts`.
- Out of scope: code, the PRD, the TechSpec, and other documents.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/CR-01 | `codereview.md#findings` | The bullet names 2 of the 3 runtime state files; it omits `claude-statusline-opt-out.json`, which the built CLI lists after `init --yes --no-statusline-bridge` (FR-10, DEC-HIL-03, PRD Assumptions) |

## Requirements

- The parenthetical names the 3 files and says the opt-out marker exists when the status line bridge is off.
- The rest of the bullet stays as it is.

## Context to recover on demand

- TechSpec: DEC-01 (as clarified by DEC-HIL-03).
- Rules and skills: `cli-output.md` does not apply (documentation only); snapshot learning L-01 (README.md stays LF).
- Code: `README.md` "What is listed" bullet; `src/core/services/gitignore-plan.ts` `runtimeStatePaths`; `tests/unit/readme-gitignore.test.ts`.

## Work

- [x] T01.1 Amend the bullet.
- [x] T01.2 Extend `tests/unit/readme-gitignore.test.ts` to assert the runtime state files in the bullet.

## Acceptance criteria

- The bullet names the runtime state files; the test fails against the old text and passes against the new.
- README.md keeps LF line endings.

## Verification

- Unit: `npm test -- tests/unit/readme-gitignore.test.ts`. Integration: none. End-to-end: not applicable. Manual: none.
- Platforms: all. Environment dependency: none.
- Commands: the test above, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Expected evidence: the test citing `FR-10`, `CR-01`.

## Affected files

- Modify: `README.md`, `tests/unit/readme-gitignore.test.ts`

## Observability and recovery

- Operational signal: none. Recovery: revert the change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: the README "What is listed" parenthetical names `claude-mod-install.json`, `claude-statusline.json`, and `claude-statusline-opt-out.json` (when the status line bridge is off); the README test expects the 3-file wording.
- Changed files: modified README.md (LF kept), tests/unit/readme-gitignore.test.ts
- Checks: the updated test failed against the 2-file text (1 failed, 2 passed) and passes against the new; `npm test -- tests/unit/readme-gitignore.test.ts tests/unit/readme-support-table.test.ts` 8 passed; `npm run lint` no issues; `npm run typecheck` exit 0. `npm run coverage` not rerun: no source file changed since the green run of codereview_02/done/task_01.md (258 files, 94.78 %).
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11.
- Open items: none
