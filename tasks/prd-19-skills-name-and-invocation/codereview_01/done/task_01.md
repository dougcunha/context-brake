# Stable execution context

Load in this exact order:

1. `tasks/prd-19-skills-name-and-invocation/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T01 — Repair the `context-brake init` option row in the README

## Outcome

The `context-brake init` row of the README command table lists `--snapshot-trigger <YELLOW|RED>` and `--resume-command <skill>` once each, renders as one table row, and carries no fragment of the old text format.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02 (both run before the re-review; no code dependency)
- In scope: the Options cell of the `context-brake init` row in `README.md`, and a scan of the rest of the README and `docs/` for the same half-applied replacement
- Out of scope: any other README content, code, schemas, CR-02..CR-06

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#Findings` | `README.md:325` has an unescaped `\|`, a stale `\|RED>` fragment, and a second `--resume-command <text>`; FR-08 and T05 incomplete |

## Requirements

- FR-08: the README uses the bare skill name; `--resume-command` takes `<skill>` (FR-05).
- The pipe inside `<YELLOW|RED>` stays escaped (`<YELLOW\|RED>`) as in the original row (`git show 7295a43:README.md`, the `context-brake init` row), so the table cell does not split.
- Flag order and every other flag in the cell stay as they are.

## Context to recover on demand

- TechSpec: `DEC-08` (docs changed last), `Contracts and data`
- Rules and skills: `cli-output.md`
- Code: `README.md` — row starting with `` | `context-brake init` ``; `git show 7295a43:README.md` for the original row

## Work

- [ ] T01.1 Replace the three corrupted flag entries (`--snapshot-trigger <YELLOW|RED>`, `--resume-command <skill>\|RED>`, `--resume-command <text>`) with `--snapshot-trigger <YELLOW\|RED>`, `--resume-command <skill>` (once)
- [ ] T01.2 Search `README.md` and `docs/` for `\|RED>`, `<text>` next to `resume-command`, and other unescaped pipes inside table cells added by this feature; fix any hit
- [ ] T01.3 Confirm the row has the same number of table cells as the header

## Acceptance criteria

- The `context-brake init` row mentions `--resume-command` exactly once, as `--resume-command <skill>`.
- `--snapshot-trigger <YELLOW\|RED>` has an escaped pipe and the row has two cells after the command cell.
- `git grep -nE '"/sdd-(snapshot|orchestrate-flow)"|command "/sdd-'` outside `tasks/` and `tests/` stays empty (TC-09).

## Verification

- Unit: not applicable
- Integration: not applicable
- End-to-end: not applicable
- Manual: read the row; count pipes (`awk -F'|'`) against the header row
- Platforms: documentation only
- Environment dependency: none
- Commands: `git grep -nE 'resume-command' README.md`; the TC-09 `git grep`; `npm run lint`
- Expected evidence: one `--resume-command` hit in the init row, no `\|RED>`, TC-09 empty

## Affected files

- Modify: `README.md`

## Observability and recovery

- Operational signal: none
- Recovery: `git diff README.md` and revert the row

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: the `context-brake init` row of the README option table now lists `--snapshot-trigger <YELLOW\|RED>` (escaped pipe, as at `7295a43`) and `--resume-command <skill>` once; the stale `<skill>\|RED>` fragment and the second `--resume-command <text>` are gone.
- Changed files: `README.md` (line 325).
- Checks: `grep -F` for `|RED>` and `resume-command <text>` in `README.md` and `docs/` finds only the prose at line 234 (unescaped pipe outside a table, correct) and the repaired row; `awk -F'|'` field count of the row is 6 against 5 in the header, the extra field being the escaped pipe inside the cell, so the row has the same three cells; TC-09 `git grep` outside `tasks/` and `tests/` returns 0 hits. No other half-applied replacement found.
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted; Windows with Git Bash; documentation only, so lint, typecheck, and tests are unaffected.
- Open items: none.
