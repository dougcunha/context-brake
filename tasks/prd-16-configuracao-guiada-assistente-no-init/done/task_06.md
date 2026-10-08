# Stable execution context

Load in this exact order:

1. `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md`
2. `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Document and close the gates

## Outcome

The README documents the assistant and the two new flags, the research folder has the terminal probe document with its table ready (and filled where the person has run it), and the repository gates are green.

## Dependencies and boundaries

- Depends on: T05
- Unblocks: —
- In scope: README (init options table row, a short "Interactive setup" section with an example and the non-interactive guarantee); `docs/research/terminal-tty.md` (probe command, table of terminals × Node × `isTTY` values, the `--interactive` fallback message) and its row in `docs/research/README.md`; running every gate; recording the manual acceptance state.
- Out of scope: new behavior; running the probe in terminals the agent cannot open (owner: the person, TC-15).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-10 | `prd.md#functional-requirements` | Probe recorded in `docs/research/`; fallback documented |
| OBJ-05 | `prd.md#outcomes-and-metrics` | Git Bash behavior known and documented (after the person's run) |
| NFR-03, NFR-04 | `prd.md#non-functional-requirements` | Budget and platforms |
| DEC-09 | `techspec.md#technical-decisions` | Probe procedure |
| CMP-10 | `techspec.md#components-and-flow` | Docs |
| TC-12, TC-15 | `techspec.md#test-approach` | Suite; manual probe |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md`, `code-standards.md`; `AGENTS.md` for the commands and the 180 s budget.
- Existing docs: `README.md` (CLI table, configuration section), `docs/research/README.md` (index in Portuguese: add a row in the same style), `tests/unit/readme-config-example.test.ts`.
- Contract or integration: `techspec.md` DEC-09 (exact probe commands and message).

## Work

- [x] T06.1 README: add `--interactive` and `--max-restarts <1-10>` to the init row and an "Interactive setup" section (when it starts, that scripts and `--json` are unaffected, the equivalent command, cancel).
- [x] T06.2 Create `docs/research/terminal-tty.md`: purpose, the probe one-liner and `init --interactive --dry-run` steps, a table for Git Bash (mintty, with and without its pseudo-console option), PowerShell 7, and Windows PowerShell 5.1 (Node version, terminal version, stdin/stdout `isTTY`, result), with unmeasured cells marked "not measured"; add its row to `docs/research/README.md`.
- [x] T06.3 Run `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run test:budget`, `npm run dependencies:check`; record results in the handoff.
- [x] T06.4 Record the manual acceptance state in the handoff (what the person ran, or "pending: needs real terminals").

## Acceptance criteria

- The README example config test passes; the init row lists both flags.
- `docs/research/terminal-tty.md` exists, is indexed, and states the fallback behavior; its table is either filled with measured values (Node and terminal versions) or marked "not measured" for the cells the person has not run.
- Every gate command exits `0`; `npm test` and `npm run coverage` finish within the 180 s budget of `AGENTS.md`.
- No new behavior is introduced in this task.

## Verification

- Unit: `tests/unit/readme-config-example.test.ts`.
- Integration: the whole suite through `npm run coverage`.
- End-to-end: not applicable here (TC-14 in QA).
- Manual: the person runs the probe in the three terminals (TC-15) and pastes the results; owner: the person.
- Platforms: Windows terminals as listed; Linux and macOS terminals are not driven here and stay unverified.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run test:budget`, `npm run dependencies:check`.
- Environment dependency: real terminals for TC-15 (open item OI-02 at HIL 2).
- Expected evidence: command outputs with exit codes and test counts; the research document.

## Affected files

- Modify: `README.md`, `docs/research/README.md`
- Create: `docs/research/terminal-tty.md`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the documentation commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the README has an "Interactive Setup" section (when the assistant starts, the questions in order, summary and equivalent command, confirming and cancelling, the Git Bash note), the `init` row lists `--max-restarts <1-10>` and `--interactive`, and the loop-guard bullet points to `init --max-restarts`. `docs/research/terminal-tty.md` documents the trigger, the fallback message, the probe, and a results table; the four real-terminal rows (Git Bash with and without the pseudo-console option, PowerShell 7, Windows PowerShell 5.1) are marked "not measured", and one measured reference row records the agent's piped shell (Node 24.20.0, stdin and stdout `isTTY` both `undefined`). `docs/research/README.md` indexes it. No behavior changed.
- Changed files: modified `README.md`, `docs/research/README.md`; created `docs/research/terminal-tty.md`.
- Checks: `npm run lint` exit 0; `npm run typecheck` exit 0; `npm run schemas:check` exit 0; `npm run dependencies:check` exit 0 (3 runtime packages, no install scripts); `npm run test:budget` exit 0, test run 120.6 s wall against the 180 s budget, slowest files `statusline-shell` 19.1 s, `codex-hook-command-shells` 14.7 s, `init-assistant-equivalence` 12.4 s (third; 9 tests, about 1 s each alone, so it grows with machine load); `npm run coverage` exit 0, 247 files, 1377 tests passed, 94.58% lines, 121.4 s. A first gates run failed three README tests (`readme-config-example`, `readme-light-example`) because rewriting `README.md` from Python left CRLF line endings, which break the `\n` match of the example blocks; I restored LF and both files pass. The 183 to 222 s readings of T02, T03, and T05 were machine load: the same suite measured 104.6 s (T04) and 120.6 s here.
- Validated state: HEAD `b216aba` plus the uncommitted working tree; Windows 11, Node 24.20.0 for the probe row, Node 24.19 for the earlier runs.
- Manual acceptance (T06.4): TC-15 is pending: the person has not run the probe in Git Bash (mintty), PowerShell 7, or Windows PowerShell 5.1 (deferred at HIL 2, DEC-HIL-02), so FR-10's measurement and OBJ-05 stay an open limitation. The fallback behavior is tested in process only. TC-14 (built CLI) belongs to the QA run.
- Open items: the two from T05 (typed configuration flags dropped with `--interactive`; a no-flag printed command restarts the assistant on a terminal), both documented in the README; the `printedFlags` helper keeps one QA-06 reservation hit in a test.

### ADR candidates

None - direct TechSpec implementation or local decision.
