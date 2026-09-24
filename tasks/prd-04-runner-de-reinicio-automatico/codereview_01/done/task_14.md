# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T14 — The documented duration bound includes the final validation

## Outcome

The TechSpec and the `run` text output state that `maxTotalMinutes` bounds harness sessions, and that the validation after the last session can add up to `validationTimeoutSeconds`. The user knows the real upper bound.

## Dependencies and boundaries

- Depends on: T10 (both edit `techspec.md`)
- Unblocks: —
- In scope:
  - the TechSpec text for DEC-09 and "Risks and open items";
  - a note in the text summary on a `maxTotalMinutes` stop;
  - one unit test.
- Out of scope:
  - clamping the validation timeout, which the user declined (DEC-EXC-CR05);
  - any change to the JSON summary.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-05 | `codereview.md#Findings` | Total duration can exceed `maxTotalMinutes` by the validation time (PRD objective "Limites respeitados") |
| DEC-EXC-CR05 | `workflow.md#Human Decisions Log` | Human decision: document the overrun |

## Requirements

- DEC-09 states the bound as `maxTotalMinutes + validationTimeoutSeconds + 10 s stop grace` and cites DEC-EXC-CR05.
- When `limit` is `maxTotalMinutes`, `formatSummary` adds one labeled line that names the possible validation overrun. The summary for every other stop is unchanged.

## Context to recover on demand

- TechSpec: DEC-09, "Risks and open items"
- Rules: `cli-output.md`
- Code: `src/cli/output/run-text.ts:46-60`, `tests/unit/run-text.test.ts`

## Work

- [x] T14.1 Update the DEC-09 text and add a risk entry in the TechSpec.
- [x] T14.2 Add the summary note, with a `run-text.test.ts` case.

## Acceptance criteria

- The TechSpec states the bound and cites DEC-EXC-CR05.
- The text summary of a `maxTotalMinutes` stop includes the note. Every other stop is unchanged.

## Verification

- Unit: `tests/unit/run-text.test.ts`
- Integration: not applicable
- End-to-end: not applicable
- Manual: not required
- Platforms: any
- Environment dependency: none
- Commands:
  - `npm run build`
  - `npm run typecheck`
  - `npm run lint` (only the 14-error baseline is allowed)
  - `npm run coverage` (serialized, in the background)
- Expected evidence: the new unit case is green

## Affected files

- Modify:
  - `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
  - `src/cli/output/run-text.ts`
  - `tests/unit/run-text.test.ts`

## Observability and recovery

- Operational signal: the summary note
- Recovery: revert the text

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: DEC-09 now states the `maxTotalMinutes + validationTimeoutSeconds + 10 s stop grace` bound under DEC-EXC-CR05; DEC-08 and the risk entry agree. The text summary adds one labeled duration note only when `limit` is `maxTotalMinutes`. JSON output is unchanged.
- Changed files: `techspec.md`, `src/cli/output/run-text.ts`, `tests/unit/run-text.test.ts`.
- Checks: focused unit suite passed (16 tests); build and typecheck passed; full coverage passed. Lint reports only the 14 pre-existing errors in PRD-03 QA evidence scripts. `git diff --check` passed.
- Validated state: Source and focused test were inspected after the edit; the full coverage command exited 0 on Windows. The test covers both the `maxTotalMinutes` note and unchanged other limits. No environment dependency is required for this text-only correction.
- Open items: Re-review must run in a new session that authored none of T10–T14. Local Windows evidence still does not execute the POSIX-only T11 cases; CI is needed for those.
