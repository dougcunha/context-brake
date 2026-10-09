# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T03 — The ownership rule text covers the block

## Outcome

The "Touch Only What ContextBrake Owns" section of `.agents/rules/file-changes.md` agrees with the shipped behavior.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: the first and last bullets of that section; the README test that guards the rule text.
- Out of scope: other documents (already updated by T06 of the feature).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-03 | `codereview.md#findings` | The section still says only harness entries and manifest files change and `remove` deletes only manifest assets, config, manifest, and runtime files (FR-10, DEC-10) |

## Requirements

- The first bullet allows changing the marked block in the project `.gitignore`.
- The `remove` bullet says `remove` also deletes that block.

## Context to recover on demand

- Rules and skills: `file-changes.md`.
- Code: `.agents/rules/file-changes.md` lines 15 to 20, `tests/unit/readme-gitignore.test.ts`.

## Work

- [x] T03.1 Amend the two bullets.
- [x] T03.2 Extend `tests/unit/readme-gitignore.test.ts` to assert both bullets.

## Acceptance criteria

- The rule file reads consistently; the test fails against the old text and passes against the new.

## Verification

- Unit: `npm test -- tests/unit/readme-gitignore.test.ts`. Integration: none. End-to-end: not applicable. Manual: none.
- Platforms: all. Environment dependency: none.
- Commands: the test above, `npm run lint`, `npm run typecheck`.
- Expected evidence: the test citing `FR-10`, `CR-03`.

## Affected files

- Modify: `.agents/rules/file-changes.md`, `tests/unit/readme-gitignore.test.ts`

## Observability and recovery

- Operational signal: none. Recovery: revert the change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: file-changes.md now says ContextBrake changes its own marked block in the project .gitignore and that remove deletes it; the README/rule test asserts both bullets.
- Changed files: modified .agents/rules/file-changes.md, tests/unit/readme-gitignore.test.ts
- Checks: npm run lint and typecheck exit 0; npm run coverage exit 0: 258 files, 1456 tests, 94.78% lines, 119.4 s wall (one combined run for the three corrections); quality sweep over the touched files: no hit, no file above 100 lines.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: none
