# Stable execution context

Load in this exact order:

1. `tasks/prd-16-configuracao-guiada-assistente-no-init/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T01 — Printed command stays replayable for values that start with a dash

## Outcome

An answer such as `-x` to the snapshot command or the resume command no longer breaks the session: the flag list the assistant produces, and the equivalent command it prints, re-parse with `parseInit` and reproduce the same plan, with no `UNEXPECTED_ERROR`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: emitting `--snapshot-command` and `--resume-command` as one `--flag=value` token when the value starts with `-`; tests for the unit and the printed-command replay.
- Out of scope: CR-02 (harness preselection), CR-03 (typed flags with `--interactive`), and CR-04 (TechSpec test-file names): these are design points or bookkeeping decided at HIL 3, not planned here. The tokens of every other value stay as they are.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | The printed command and the re-parse fail for a command or resume value starting with `-` (FR-06, FR-04, OBJ-01, OBJ-02, DEC-05, `cli-output.md`) |

## Requirements

- Every flag list the assistant returns re-parses through `parseInit` to the same values the answers describe (FR-06, OBJ-01).
- The printed equivalent command keeps the DEC-06 quoting; `--snapshot-command=-x` is a bare token and a value with spaces after the `=` is single-quoted as a whole token.
- No new answer rule: values the existing snapshot rules accept stay accepted.
- The flag list for values that do not start with `-` is unchanged (separate tokens), so existing expectations hold.

## Context to recover on demand

- TechSpec: `techspec.md#technical-decisions` DEC-03, DEC-05, DEC-06.
- Rules and skills: `code-standards.md` (30-line functions, 100-line files), `tests.md`.
- Code: `src/cli/assistant/questions-snapshot.ts` (`askCommandOptions` builds the flags), `src/cli/assistant/equivalent-command.ts` (quoting), `src/cli/init-arguments.ts` (`parseInit`).

## Work

- [x] T01.1 Add one helper that returns `[name, value]`, or `[`${name}=${value}`]` when the value starts with `-`, and use it for `--snapshot-command` and `--resume-command` in `questions-snapshot.ts`.
- [x] T01.2 Unit test in `tests/unit/assistant-questions-invalid.test.ts` (TC-07): leading-dash command and resume answers produce `--flag=value` tokens and `parseInit(flags)` returns those values; `formatEquivalentCommand` prints them as bare tokens.
- [x] T01.3 Integration scenario in `tests/integration/init-assistant-equivalence.test.ts` (TC-10): snapshot command `-x` and resume command `-y` with restart off; the replay of the printed command writes the same tree and exits without an argument error.

## Acceptance criteria

- With the answers `-x` (command) and `-y` (resume), the session exits `0` or `1`, the printed command contains `--snapshot-command=-x` and `--resume-command=-y`, and replaying it with `--yes` on a copy yields the same tree.
- The nine existing equivalence scenarios and the question tests still pass unchanged.
- `src/` files touched stay at or below 100 lines and no function above 30 lines.

## Verification

- Unit: `npm test -- tests/unit/assistant-questions-invalid.test.ts tests/unit/equivalent-command.test.ts`.
- Integration: `npm test -- tests/integration/init-assistant-equivalence.test.ts`.
- End-to-end: not applicable here (TC-14 stays with QA).
- Manual: none.
- Platforms: Linux, macOS, Windows (no shell is spawned).
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Expected evidence: new tests citing `FR-06`, `TC-07`, `TC-10`, `CR-01`; lint, typecheck, and coverage green.

## Affected files

- Modify: `src/cli/assistant/questions-snapshot.ts`, `tests/unit/assistant-questions-invalid.test.ts`, `tests/integration/init-assistant-equivalence.test.ts`

## Observability and recovery

- Operational signal: the printed equivalent command.
- Recovery: revert the change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `valueFlag(name, value)` in `questions-snapshot.ts` returns `[name, value]`, or the single token `name=value` when the value starts with `-`; `--snapshot-command` and `--resume-command` use it. An answer `-x` or `-y` now yields `--snapshot-command=-x` and `--resume-command=-y`, which `parseInit` accepts and the printed command shows as bare tokens. Values that do not start with a dash keep their separate-token form, so the other scenarios are unchanged.
- Changed files: modified `src/cli/assistant/questions-snapshot.ts` (72 lines), `tests/unit/assistant-questions-invalid.test.ts` (new case: flags, `parseInit` values, printed command), `tests/integration/init-assistant-equivalence.test.ts` (new scenario with dash values: replay writes the same tree and a replayed dry run plans no change).
- Checks: `npm run lint` and `npm run typecheck` clean; targeted tests pass (24); `npm run coverage` exit 0: 247 files, 1379 tests, 94.58 % lines, 204 s wall (machine load; the previous green full runs were 105 to 121 s, and the new tests add about 1 s); quality sweep over the touched files: no hit.
- Validated state: HEAD `b216aba` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: CR-02, CR-03, and CR-04 were not planned: CR-02 and CR-03 are design points listed for HIL 3 (O-02), and CR-04 is bookkeeping (the checkpoint hash of `tasks.md` is refreshed by the coordinator at closing; the TC-01 and TC-03 test files differ from the TechSpec table names and are noted in `workflow.md`).
