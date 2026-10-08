# Stable execution context

Load in this exact order:

1. `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md`
2. `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Equivalent command and summary

## Outcome

Given a flag list, the CLI can print a shell-neutral equivalent command that `parseInit` accepts, and given the assistant's facts it can print a short plain-text summary. Neither prints in `--json` mode.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T05
- In scope: `formatEquivalentCommand` with the DEC-06 quoting rules (including the two labeled lines for a value with a single quote); `renderSummary`; `NO_COLOR` and no-color-only-meaning checks; text-only output helpers.
- Out of scope: running the questions (T03); writing to the terminal from `init` (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06 | `prd.md#functional-requirements` | Existing flags only; quoting valid in PowerShell and POSIX |
| NFR-01 | `prd.md#non-functional-requirements` | No meaning by color alone; `NO_COLOR` |
| NFR-02 | `prd.md#non-functional-requirements` | Text mode only |
| DEC-06 | `techspec.md#technical-decisions` | Quoting rule |
| CMP-06 | `techspec.md#components-and-flow` | `equivalent-command.ts`, `summary.ts` |
| TC-08, TC-13 | `techspec.md#test-approach` | Quoting and output tests |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md`, `code-standards.md`, `tests.md`.
- Existing code: `src/cli/output/text.ts` (stream conventions, labels); `src/cli/init-arguments.ts` (`parseInit` to check round trips).
- Contract or integration: `techspec.md` DEC-06 and the example commands in Contracts and data.

## Work

- [x] T04.1 `equivalent-command.ts`: bare values match `[A-Za-z0-9_@%+=:,./-]`; other values single-quoted; a value with a single quote returns two labeled forms (POSIX `'\''`, PowerShell `''`).
- [x] T04.2 `summary.ts`: block of the chosen values, the restart mode per harness, the handoff or snapshot carrier, then `Equivalent command: …`; no ANSI codes when `NO_COLOR` is set or the stream is not a TTY, and never color-only meaning.
- [x] T04.3 Tests: `tests/unit/equivalent-command.test.ts` (TC-08, includes parsing the printed flags back through `parseInit` for bare and quoted values), `tests/unit/assistant-output.test.ts` (TC-13).

## Acceptance criteria

- For flag lists drawn from the assistant's vocabulary, the printed command contains only existing `init` flags and re-parses (after removing the quoting) to the same argument values.
- A value with spaces appears as `'…'`; a value with a single quote produces two labeled lines, each correct for its shell family.
- `NO_COLOR=1` output contains no escape sequences; status words (`OK`, `WARN`, `ERROR`) carry the meaning.
- Neither function is called or prints anything when `--json` is set (asserted at the call boundary in T05; here the functions are pure and return strings).
- Every touched `src/` file is at or below 100 lines; no function above 30 lines.

## Verification

- Unit: quoting cases, round trip through `parseInit`, summary snapshots.
- Integration: none in this task.
- End-to-end: not applicable here.
- Manual: none.
- Platforms: Linux, macOS, Windows (assert both shell families' strings, no shell is spawned).
- Commands: `npm test -- tests/unit/equivalent-command.test.ts tests/unit/assistant-output.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-06`, `NFR-01`, `TC-08`, `TC-13`; lint, typecheck, coverage green.

## Affected files

- Modify: —
- Create: `src/cli/assistant/equivalent-command.ts`, `src/cli/assistant/summary.ts`, `tests/unit/equivalent-command.test.ts`, `tests/unit/assistant-output.test.ts`

## Observability and recovery

- Operational signal: the printed command.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `formatEquivalentCommand(flags)` returns `context-brake init <flags>` on one line, with bare values unquoted and any other value single-quoted (valid in PowerShell and POSIX shells and never expanded); a value containing a single quote returns two labeled lines (`POSIX shells:` with `'\''`, `PowerShell:` with `''`). `renderSummary(facts, command)` returns the plain-text summary lines (harnesses and those turned off, snapshot command, restart state with the mode of each harness, status line bridge, debug mode, equivalent command). Both are pure and return strings; they use no color or escape sequences, so `NO_COLOR` is respected trivially and the meaning never depends on color. Printing (text mode only, never with `--json`) is T05.
- Changed files: created `src/cli/assistant/equivalent-command.ts` (21 lines), `src/cli/assistant/summary.ts` (37 lines), `tests/unit/equivalent-command.test.ts`, `tests/unit/assistant-output.test.ts`. No existing file changed.
- Checks: `npm run lint`, `npm run typecheck` clean; 11 new tests pass, including round trips of the printed command through `parseInit` for bare, quoted, and single-quote values in both shell families; `npm run coverage`: 244 files, 1354 tests passed, 104.6 s, 94.54%; quality sweep over the two new `src/` files returned no hit and no file above 100 lines.
- Validated state: HEAD `b216aba` plus the uncommitted working tree; Windows 11, Node 24.19.
- Open items: the 104.6 s wall time confirms the 182 to 183 s readings of T02 and T03 were machine load, not a regression.

### ADR candidates

None - direct TechSpec implementation or local decision.
