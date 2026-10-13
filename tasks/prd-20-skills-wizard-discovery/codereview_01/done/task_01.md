# Stable execution context

Load in this exact order:

1. `tasks/prd-20-skills-wizard-discovery/codereview_01/codereview.md`
2. This file

---

# T01 — Resume question: no `none`, refuse the word, and cover the resume paths

## Outcome

The resume question no longer offers a choice that has no effect: `none` is offered only for the snapshot skill, the word `none` at the resume prompt is refused with the way to remove the skill, and the resume paths and the terminal (`askUi`) path are covered by tests.

## Dependencies and boundaries

- Depends on: —
- In scope: `skill-options.ts`, `questions-snapshot.ts` (`validateResume`), README wording, tests, the FR-07 tripwire test
- Out of scope: a flag that clears only the resume skill (not in the PRD)

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#Findings` | choosing `none` for the resume skill has no effect on a stored value (FR-05, DEC-06) |
| codereview_01/CR-02 | `codereview.md#Findings` | typing `none` at the resume prompt stores a skill named `none` |
| codereview_01/CR-03 | `codereview.md#Findings` | no tests for resume `none`, resume `type another`, Enter keeping a configured resume skill, the `askUi` path |
| codereview_01/CR-04 | `codereview.md#Findings` | the FR-07 tripwire is not shown to be connected |

## Work

- [x] T01.1 `buildOptions` adds `none` only for the snapshot role (restores DEC-06; AUTO-18)
- [x] T01.2 `validateResume` refuses the word `none` with a message that names `--no-snapshot-command`
- [x] T01.3 Tests: `tests/unit/questions-skill-resume-paths.test.ts` (no `none` at resume, refusal, Enter keeps a configured resume skill, type another, the select path through `ScriptedUiPrompts`) and a positive tripwire case in `tests/integration/init-skill-catalog-not-read.test.ts`
- [x] T01.4 README sentence updated

## Acceptance criteria

- The resume list has no `none`; typing `none` there is refused and re-asked; a configured resume skill stays unless the user picks another; the snapshot `none` still works.

## Verification

- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`

## Handoff

- Produced result: as in Outcome. The decision to drop `none` from the resume role and keep the PRD's "same options" intent satisfied by "type another" is AUTO-18.
- Changed files: `src/cli/assistant/skill-options.ts`, `src/cli/assistant/questions-snapshot.ts` (76 lines), `README.md`, `tests/helpers/scripted-ui-prompts.ts`, `tests/unit/questions-skill-resume-paths.test.ts`, `tests/integration/init-skill-catalog-not-read.test.ts`.
- Checks: 21 tests in the five affected files pass; `npm run lint`, `npm run typecheck`, `npm run build`, `npm run schemas:check` pass; `npm run coverage`: 268 files, 96.07%, exit 0. Reservation hit: the tripwire `new Error` in the test helper `ScriptedUiPrompts.ask` (QA-07, test code).
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted; Windows with Git Bash.
- Open items: none.
