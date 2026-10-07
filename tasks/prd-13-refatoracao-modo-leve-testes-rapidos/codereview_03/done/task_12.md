# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/codereview_03/codereview.md`
2. This file

---

# T12 — Document the fake process runner and correct the T10 record

## Outcome

`.agents/rules/tests.md` tells in-process tests to inject the fake process runner, and the T10 handoff describes its effect accurately.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_03
- In scope: `.agents/rules/tests.md` (Time Budget and Processes); `codereview_01/done/task_10.md` (Handoff, produced result).
- Out of scope: the other optional improvements (accepted by DEC-RES-01); code.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03 optional improvement 1 | `codereview.md#Findings` | Rule names the fake measurer but not the fake runner |
| codereview_03 optional improvement 3 | `codereview.md#Findings` | T10 handoff overstates the version-probe effect |
| DEC-RES-01 | `../workflow.md#Human Decisions Log` | Items 1 and 3 chosen for correction |

## Requirements

- The rule names `tests/helpers/fake-process-runner.ts`, and says that direct callers of `runInit`, `runRemove`, `runDoctor`, and `dispatchCommand` pass both fakes.
- The T10 handoff says that only `git check-ignore` stopped, because the version probes already built no runner.

## Context to recover on demand

- `.agents/rules/tests.md#Time Budget and Processes`; `src/infrastructure/harnesses/common/version-probes.ts:12-14`.

## Work

- [x] T12.1 Extend the in-process line of the rule.
- [x] T12.2 Correct the T10 produced-result line, citing this task.

## Acceptance criteria

- Both texts state the behavior above. `.claude/rules/tests.md` mirrors the rule through the junction.

## Verification

- Unit, integration, and end-to-end: not applicable (text only).
- Manual: read both lines.
- Commands: `diff .agents/rules/tests.md .claude/rules/tests.md`.

## Affected files

- Modify: `.agents/rules/tests.md`, `codereview_01/done/task_10.md`

## Observability and recovery

- Recovery: revert the two lines.

## Handoff

- Produced result: the rule line now names `tests/helpers/fake-process-runner.ts` and requires direct callers to pass `overheadMeasurer: fakeOverheadMeasurer` and `runner: fakeProcessRunner`. The T10 produced result now says that only `git check-ignore` stopped, and that the version probes already returned `unknown` without a runner.
- Changed files: `.agents/rules/tests.md`, `codereview_01/done/task_10.md`.
- Checks: `diff -q .agents/rules/tests.md .claude/rules/tests.md` is empty (junction). No code changed, so the codereview_03 test evidence still applies.
- Validated state: text only.
- Open items: none.
