# PRD — Human-readable doctor output

Slice 1 of 2 under prefix `doctor` (`sdd-orchestrate-prds`, approved 2026-10-21). Next slice: `prd-24-doctor-fix-command`.

## Problem and context

The user says the text output of `context-brake doctor` is hard to read (request of 2026-10-21). A run on this repository on 2026-10-21 showed these problems (`src/cli/output/text.ts:14-34`):

1. The first line says `healthy`, but the harness line says `overhead: 133.7ms/100ms (fail)`. The reader cannot tell which one is correct. No finding exists for overhead, so the status and the exit code ignore it (`src/core/services/report-service.ts`, `src/cli/exit-codes.ts`).
2. Each capability limitation prints as a long paragraph on every run (`text.ts:25`).
3. All items use the same `  - ` prefix. There are no sections.
4. Findings print last, and `[OK]` findings mix with `[WARN]` and `[ERROR]` findings.
5. The same session id prints 3 or 4 times with different windows. Cause (fact): the ledger key is the session id plus the agent id (`src/infrastructure/runtime/runtime-paths.ts:22`), so each subagent has its own ledger. `activeSessions` emits one row per ledger (`src/core/services/active-sessions.ts:18-25`). Subagent rows show the estimated 128000 window.
6. When the status is `errors`, the whole report goes to stderr (`text.ts:15`). `.agents/rules/cli-output.md` says that results go to stdout.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | A user finds what is wrong and what to do from the first lines of the output. | Problems print before all other sections; each problem shows its fix text |
| OBJ-02 | The output has one meaning. | No status, overhead, or session line contradicts another line |
| OBJ-03 | The default output is short. | Limitations and passed-check messages print only with `--verbose` |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer who runs `doctor` after `init` | See the problems first, each with its fix | Fixes the installation without reading JSON | Report with warnings and errors |
| US-02 | Developer with a healthy installation | Get a short confirmation | Does not read paragraphs that need no action | Report with only `ok` findings |
| US-03 | Developer who uses subagents | See one line per session | Reads the real usage of the session | Session with 3 subagents |
| US-04 | Developer who investigates support gaps | See the capability limitations and passed-check messages | Has the full detail on request | `doctor --verbose` |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | The first line gives the status label and the count of errors and warnings. | A report with 1 error and 2 warnings starts with `ContextBrake doctor: ERROR (1 error, 2 warnings)`; a report without them starts with `ContextBrake doctor: OK (no problems found)` |
| FR-02 | The text has sections in this order: `Problems`, `Harnesses`, `Context`, `Sessions`, `Checks passed`. A section without content does not print, except `Problems`. | Unit test on a full report checks the order of the section titles; a report without sessions has no `Sessions` title |
| FR-03 | `Problems` lists errors first, then warnings, in report order inside each severity. Each problem shows the label, the code, the harness or path when present, the message, and the impact and remediation text when present. | A problem with all fields prints label, code, harness, message, a line `Impact: …`, and a line `Fix: …` with the existing `remediation` text |
| FR-04 | Without errors and warnings, `Problems` prints one line `No problems found.` | Unit test on a report with only `ok` findings |
| FR-05 | `Harnesses` prints one line per integration with harness, state, support level, version when known, and overhead p95 against the target. An overhead with status `fail` carries the label `WARN`. Excluded harnesses print in this section as `excluded by configuration`. | Unit test: overhead `fail` prints `WARN` on that line; the first line status does not change |
| FR-06 | The report status and the exit code do not change. They come from the findings only. | A report with overhead `fail` and no warning findings keeps `status: "healthy"` and exit code 0 |
| FR-07 | `Context` prints the context window source, mod and bridge state, and last window; the snapshot settings with each harness invocation; and `debug mode: on` when on. | Unit test with snapshot, invocations, and debug mode |
| FR-08 | `Sessions` prints one row per active session with session id, percentage, used and window tokens, zone, source, and time since last activity. A session without a known id prints as `(unknown session)`. | Unit test with 2 sessions and 1 unknown id |
| FR-09 | Active sessions include only main-agent ledgers. A ledger whose session line has an agent id is left out of `activeSessions`, in text and JSON. A ledger without a session line counts as a main session. | Unit test on `activeSessions`: 1 main ledger and 3 subagent ledgers of the same session id give 1 entry; the doctor JSON lists 1 entry |
| FR-10 | `Checks passed` prints the codes of the `ok` findings on one line. With `--verbose`, it prints one line per `ok` finding with code and message. | Unit test for both modes |
| FR-11 | Capability limitations print only with `--verbose`, under their harness in `Harnesses`. Without `--verbose`, the output ends with one line that names `--verbose` when limitations or `ok` messages are hidden. | Unit test: default output has no limitation text and has the hint line; `--verbose` output has each limitation |
| FR-12 | `doctor` accepts `--verbose`. With `--json`, `--verbose` has no effect: the JSON always holds all data. | Argument parser test; `doctor --json --verbose` gives the same document as `doctor --json` |
| FR-13 | The text report goes to stdout for every status. The exit code still gives the status. | Unit test: a report with status `errors` writes to stdout and nothing to stderr |
| FR-14 | The README and the CLI help describe the new layout and `--verbose`. | README command table (line 329 at `419c0bd`) lists `--verbose`; the sections "Active Sessions in `doctor`" and the debug-mode text match the new output |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Contract | `schemas/doctor-report.schema.json` does not change; `npm run schemas:check` passes. Only the content of `activeSessions` changes (FR-09) |
| NFR-02 | Accessibility | Every status has a text label (`OK`, `WARN`, `ERROR`). Color only reinforces it, through `src/cli/output/style.ts`; no color when `NO_COLOR` is set or stdout is not a TTY |
| NFR-03 | Determinism | Token counts use a fixed thousands separator (`,`), not the locale of the machine. The same report gives the same text on Linux, macOS, and Windows |
| NFR-04 | Platform | Section titles and labels use ASCII. Unicode glyphs, if used, follow the `style.ts` unicode detection with an ASCII fallback |
| NFR-05 | Messages | All text is English, per `.agents/rules/cli-output.md` |

## User experience

Default output for a report with 1 warning (example; the TechSpec sets the exact spacing):

```
ContextBrake doctor: WARN (0 errors, 1 warning)

Problems
  WARN  ASSET_OUTDATED  claude-code  .claude/hooks/context-brake-hook.mjs
        The installed asset is older than this ContextBrake version.
        Impact: The hook runs code from an earlier release.
        Fix: Run context-brake init --yes.

Harnesses
  claude-code  installed  support full  overhead 134 ms / 100 ms  WARN

Context
  window      mod (mod reporting, bridge installed, last window 1,000,000)
  snapshot    sdd-snapshot at RED, resume sdd-orchestrate-flow
              claude-code: /sdd-snapshot, resume /sdd-orchestrate-flow
  debug mode  on

Sessions
  9dd660a8-a33e-485c-a961-fa9618ebd62e   8%     84,200 / 1,000,000  GREEN  measured  now
  a9a303ca-6196-4af9-9ea0-7c0cb7ffcc1e  25%    253,054 / 1,000,000  GREEN  measured  now

Checks passed: AUTO_RESTART_READY, CONTEXT_MOD_READY, AUTO_RESTART_HANDOFF

Run context-brake doctor --verbose to see 2 capability limitations and the passed-check messages.
```

A healthy report prints `Problems` with `No problems found.`. The error state of the command (invalid arguments, unexpected error) does not change.

## Constraints and dependencies

- `.agents/rules/cli-output.md` applies to all output.
- `prd-24-doctor-fix-command` depends on this slice: it adds a "fixable" marker and a `fix` hint to the `Problems` section defined here. This slice renders only the existing `remediation` text.
- Derived tests to revalidate in the TechSpec: `tests/unit/cli-output-text.test.ts`, `tests/unit/doctor-mode-text.test.ts`, `tests/integration/config-repair-errors.test.ts`, `tests/unit/snapshot-trigger-percentage-merge.test.ts`. `tests/e2e/e2e-doctor.test.ts` checks only `--json`.

## Out of scope

- The `context-brake fix` command, a structured `fix` field on findings, and any "fixable" marker (`prd-24-doctor-fix-command`).
- A finding for overhead, or a change to status or exit-code rules.
- The text of each finding message, impact, and remediation.
- The output of `init` and `remove` (`src/cli/output/install-text.ts` has its own renderer).
- An agent id field in `activeSessions`, and usage readings for subagents.
- The 128000 estimated window of subagent ledgers.

## Assumptions and sources

- Product decision (user, 2026-10-21): show only main-agent sessions, in text and JSON (FR-09).
- Product decision (user, 2026-10-21): overhead `fail` changes only the text, not the status (FR-05, FR-06).
- Product decision (user, 2026-10-21): the report always goes to stdout (FR-13).
- Assumption: no script parses the text output of `doctor`; the README points automation to `--json`. Impact if wrong: a script that matches the old lines breaks.
- Assumption: a ledger without a `session` line belongs to a main agent. Source: the bridge writes `statusline` and `reset` lines before the first hook (`3f4be95d…` ledger at 2026-10-21). Impact if wrong: a subagent ledger prints as `(unknown session)`.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
