# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md`
2. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Assistant question

## Outcome

The prd-16 assistant asks whether to keep ContextBrake's files out of Git (preselected from the stored state, hidden outside Git), shows it in the summary, and emits `--gitignore` or `--no-gitignore` only when the answer differs, so the printed command reproduces the plan.

## Dependencies and boundaries

- Depends on: T02, T03
- Unblocks: T06
- In scope: `questions-misc.ts` (or a sibling), `types.ts`, `summary.ts`, `assistant-context.ts` (`insideGit`), `assistant-questions.ts`; tests.
- Out of scope: new flags (T02); the rich prompt port (the existing `confirmSpec` is reused).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-09 | `prd.md#functional-requirements` | Question, preselection, equivalent command |
| US-05 | `prd.md#stories-and-journeys` | Decide in the wizard |
| DEC-08 | `techspec.md#technical-decisions` | Question rules |
| CMP-09, TC-08 | `techspec.md` | Component and tests |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (30-line functions, 100-line files, three parameters), `javascript-typescript.md`, `file-changes.md`, `tests.md`, `cli-output.md`.
- Code: `src/cli/assistant/questions-misc.ts` (`askMisc`), `ask.ts` (`confirmSpec`), `assistant-context.ts` (`buildAssistantContext`), `tests/integration/init-assistant-equivalence.test.ts` and `tests/helpers/assistant-world.ts` (scenario table, `makeProject`, `projectTree`).

## Work

- [x] T05.1 `AssistantContext.insideGit` (from `isInsideGitWorkingTree`); facts field `gitIgnore: boolean | null`; summary line `Git ignore: yes`, `no`, or `not applicable (not a Git repository)`.
- [x] T05.2 The question last in the order, default from `config.gitIgnore !== false`, flag only when different; update the prd-16 order tests where they list the prompts.
- [x] T05.3 Tests: `tests/unit/assistant-questions-gitignore.test.ts` and two scenarios (answer no, and answer yes against a stored opt-out) in the equivalence file, in a fixture with an empty `.git` directory.

## Acceptance criteria

- With stored state on and the answer yes, no flag; answer no emits `--no-gitignore`; stored off and answer yes emits `--gitignore`.
- Outside Git the question is not asked and the summary says not applicable.
- The replay of the printed command on a copy yields the same tree as the assisted run.
- Existing assistant tests still pass (their fixtures have no `.git`, so the question is hidden).

## Verification

- Unit and integration: `npm test -- tests/unit/assistant-questions-gitignore.test.ts tests/integration/init-assistant-equivalence.test.ts`.
- End-to-end: not applicable here. Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: the tests above, `npm test`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-09`, `TC-08`.

## Affected files

- Modify: `src/cli/assistant/questions-misc.ts`, `types.ts`, `summary.ts`, `assistant-context.ts`, `assistant-questions.ts`, `tests/integration/init-assistant-equivalence.test.ts`
- Create: `tests/unit/assistant-questions-gitignore.test.ts`

## Observability and recovery

- Operational signal: the summary line. Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: The assistant asks last, only inside Git, 'Keep ContextBrake's files out of Git (adds them to .gitignore)?' with the stored state preselected (rich confirm and line prompt both), emits --gitignore or --no-gitignore only when the answer differs from the stored state, shows 'Git ignore: yes | no | not applicable (not a Git repository)' in the summary, and the printed command reproduces the plan (replay trees equal). AssistantContext gains insideGit; AssistantFacts gains gitIgnore.
- Changed files: created src/cli/assistant/questions-gitignore.ts (17 lines), tests/unit/assistant-questions-gitignore.test.ts (5 tests); modified src/cli/assistant/questions-misc.ts (27), types.ts, assistant-questions.ts, summary.ts (37), assistant-context.ts, tests/helpers/assistant-context.ts, tests/helpers/assistant-world.ts (makeProject git option), tests/unit/assistant-output.test.ts, tests/integration/init-assistant-equivalence.test.ts (3 Git scenarios)
- Checks: npm run lint and typecheck exit 0; npm test (whole suite): 256 files, 1450 tests passed, 137.7 s wall; quality sweep: no hit, every file at or below 100 lines.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: none

### ADR candidates

None - direct TechSpec implementation or local decision.
