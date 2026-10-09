# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_02/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T01 — The README names every kind of file the block lists

## Outcome

The "What is listed" bullet of the README section "Keeping ContextBrake Out of Git" names the runtime state files that `init` writes under `.context-brake/runtime/`, as the shipped block does.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: that one bullet of `README.md`; the README test that guards it.
- Out of scope: code, the PRD, the TechSpec, and other documents.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_02/CR-01 | `codereview.md#findings` | The bullet names the configuration file, the manifest, and the manifest assets only; the block also lists `/.context-brake/runtime/claude-mod-install.json` and `/.context-brake/runtime/claude-statusline.json` (FR-10, DEC-HIL-03) |

## Requirements

- The bullet says the block also lists the state files `init` writes under `.context-brake/runtime/` while they exist or are planned, and names the 2 current files.
- The rest of the bullet (files `init` only edits, folders, symbolic links) stays as it is.

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

- Produced result: the README "What is listed" bullet now names the state files `init` writes under `.context-brake/runtime/` (`claude-mod-install.json`, `claude-statusline.json`); a new README test asserts the sentence.
- Changed files: modified README.md (LF kept), tests/unit/readme-gitignore.test.ts
- Checks: the new test failed against the old text (1 failed, 2 passed) and passes against the new; `npm test -- tests/unit/readme-gitignore.test.ts tests/unit/readme-support-table.test.ts` 8 passed; `npm run lint` no issues; `npm run typecheck` exit 0; `npm run coverage` exit 0: 258 files passed, 94.78 % lines, 131 s wall.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11.
- Open items: none
