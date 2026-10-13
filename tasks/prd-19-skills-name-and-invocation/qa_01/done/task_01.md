# Stable execution context

Load in this exact order:

1. `tasks/prd-19-skills-name-and-invocation/qa_01/qa.md`
2. This file

---

# T01 — Name the flag and the config file in the invalid-skill-name error of `init`

## Outcome

`init --snapshot-command /sdd-snapshot` (and `--resume-command`, `--snapshot-trigger`) rejects the value with an error that says what happened, which flag or file, and how to fix it.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: the message built by `mergeSnapshot` in `src/core/services/snapshot-merge.ts`; the tests that assert it
- Out of scope: the name rule, the config-file error from `doctor` (already names the file), the hook failure policy, CR-04..CR-06 of the reviews

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| qa_01/BUG-01 | `qa.md#Findings` | the error names the key and the bare name but neither the flag nor the file (FR-02, NFR-04; carried from codereview_01/CR-03) |

## Requirements

- FR-02: the error says what happened, which file or flag, and how to fix it; the bare name stays in the message.
- The existing prefix `Invalid snapshot option: snapshot.<field>` stays, because the wizard re-ask shows the same message.

## Context to recover on demand

- TechSpec: `DEC-07`; PRD `FR-02`
- Code: `src/core/services/snapshot-merge.ts` — `mergeSnapshot`

## Work

- [x] T01.1 Append ` Set it with <flag> or in context-brake.config.json.` to the merge error, with the flag chosen by the failing field
- [x] T01.2 Extend the two flag-rejection cases of `tests/integration/init-snapshot.test.ts` to assert the flag and the file

## Acceptance criteria

- The built `init --snapshot-command /sdd-snapshot` stderr contains `--snapshot-command <skill>` and `context-brake.config.json` along with the bare name; exit 64, nothing written.

## Verification

- Unit/integration: `tests/integration/init-snapshot.test.ts`, `tests/unit/assistant-questions-invalid.test.ts`, `tests/unit/snapshot-merge.test.ts`
- End-to-end: QA scenario S1 rerun by the next QA run
- Platforms: Windows with Git Bash
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`

## Affected files

- Modify: `src/core/services/snapshot-merge.ts`, `tests/integration/init-snapshot.test.ts`

## Handoff

- Produced result: the merge error ends with `Set it with --snapshot-command <skill> or in context-brake.config.json.` (`--resume-command <skill>` and `--snapshot-trigger <YELLOW|RED>` for the other fields); the prefix and the bare-name text are unchanged.
- Changed files: `src/core/services/snapshot-merge.ts` (33 to 37 lines), `tests/integration/init-snapshot.test.ts`.
- Checks: 4 test files (40 tests) pass; `npm run lint` and `npm run typecheck` pass; full coverage run follows in the execution report.
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted; Windows with Git Bash.
- Open items: none.
