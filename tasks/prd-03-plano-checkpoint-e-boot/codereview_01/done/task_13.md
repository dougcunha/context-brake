# T13 — Clear terminal whitespace findings

## Outcome

The five files named in CR-04 have one terminal newline and `git diff --check` passes.

## Dependencies and boundaries

- Depends on: none.
- Unblocks: re-review hygiene gate.
- In scope: terminal blank lines in the five named files.
- Out of scope: logic or formatting changes elsewhere.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_01/CR-04` | `codereview.md#Findings` | Extra EOF blank lines fail diff hygiene |

## Requirements

- Remove only redundant terminal blank lines; retain one final newline and all code content.
- Check the resulting diff for unrelated changes.

## Context to recover on demand

- Rules: `code-standards.md`, `tests.md`.
- Files: `src/cli/commands/plan.ts`, `src/cli/output/text.ts`, `src/cli/plan-arguments.ts`, `src/core/contracts/diagnostics.ts`, `tests/unit/doctor-checks.test.ts`.

## Work

- [x] T13.1 Normalize EOF in the five listed files.
- [x] T13.2 Run `git diff --check` and inspect the five-file diff.

## Acceptance criteria

- No extra EOF blank lines remain in those files.
- `git diff --check` passes for the integrated worktree.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: inspect `git diff --check` and diff.
- Platforms: all.
- Environment dependency: Git.
- Commands: `git diff --check`; final code-change gate: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: zero diff hygiene errors and no logic diff for these five files.

## Affected files

- Modify: `src/cli/commands/plan.ts`, `src/cli/output/text.ts`, `src/cli/plan-arguments.ts`, `src/core/contracts/diagnostics.ts`, `tests/unit/doctor-checks.test.ts`.
- Create: none.

## Observability and recovery

- Operational signal: `git diff --check` exit status.
- Recovery: restore only the terminal whitespace if needed.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: The five CR-04 files now end with one terminal newline; the extra blank lines are gone.
- Changed files: `src/cli/commands/plan.ts`, `src/cli/output/text.ts`, `src/cli/plan-arguments.ts`, `src/core/contracts/diagnostics.ts`, `tests/unit/doctor-checks.test.ts` (terminal whitespace only).
- Checks: `git diff --check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run coverage -- --maxWorkers=4` passed on the current worktree.
- Validated state: Windows, Node 24; coverage suite passed after build. The task is a whitespace-only correction and did not change behavior.
- Open items: CR-01 through CR-03 remain; cross-platform matrix remains a feature-level evidence limit.
