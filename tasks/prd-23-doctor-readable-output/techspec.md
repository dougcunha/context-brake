# TechSpec — Human-readable doctor output

## Sources and traceability

- PRD: `tasks/prd-23-doctor-readable-output/prd.md`
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/cli-output.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`
- Research: none; no harness behavior changes
- Evidence in existing code (at `419c0bd`):
  - `src/cli/output/text.ts:14-34` (`renderDoctorText`), `:6-12` (`renderFinding`, no caller in `src/`)
  - `src/cli/output/install-text.ts:26-34`: pure `formatInstallReport(report, style)` plus thin writer `renderInstallText`
  - `src/cli/output/card.ts` (`renderCard`, `CardRow`, note wrap at 76 columns), `src/cli/output/style.ts` (`detectStyle`, `PLAIN_STYLE`, `NO_COLOR`, unicode detection)
  - `src/cli/output/doctor-mode-text.ts`, `doctor-sessions-text.ts`, `detection-text.ts` (only caller: `text.ts`)
  - `src/core/services/active-sessions.ts:18-32`, `src/core/contracts/session-ledger.ts:17` (`agentId` nullable on the session line)
  - `src/cli/commands/doctor.ts:38-61`, `src/cli/argument-parser.ts` (`parseDoctor`), `src/cli/composition-root.ts:12-27` (`renderHelp`)

## Solution summary

The doctor text moves to the pattern that `init` already uses: a pure formatter `formatDoctorReport(report, options)` that returns a string, and a thin writer that picks the style from stdout and writes to stdout. The formatter builds the sections `Problems`, `Harnesses`, `Context`, `Sessions`, and `Checks passed` as `CardRow[]` lists and renders each one with `renderCard`, so doctor and `init` share the same section look, tones, and note wrapping. `--verbose` adds the capability limitations and the passed-check messages; without it, a final hint line names `--verbose`.

The only change outside `src/cli/` is in `activeSessions`: it skips ledgers whose session line has an agent id, so text and JSON list only main sessions. The doctor JSON schema, the report status, and the exit codes do not change.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-02, NFR-02, NFR-04 | Render each section with `renderCard` from `card.ts`. Section titles are the PRD names. | `init` output already uses cards (`install-text.ts:19-23`); the card gives aligned labels, tones, ASCII fallback for glyphs, and note wrap at 76 columns for limitation text | Bare titles as in the PRD sample: simpler, but a second visual language next to `init`. The PRD sample is an example; the TechSpec sets the spacing |
| DEC-02 | FR-01, FR-03, FR-05, FR-10, NFR-02 | Doctor uses bare labels `OK`, `WARN`, `ERROR` (no brackets) in the header and in rows. `install-rows.ts` keeps `[WARN]`. | FR-01 prescribes `ContextBrake doctor: ERROR (…)`; the same form in rows keeps one style inside doctor | Brackets everywhere: matches `init`, contradicts FR-01. `init` output is out of scope |
| DEC-03 | All FR on text | Split into `formatDoctorReport(report, { verbose, now, style })` (pure) and `renderDoctorText(report, options)` (writer: `detectStyle` on stdout, `process.stdout.write`). | Same split as `formatInstallReport` / `renderInstallText`; unit tests pass `PLAIN_STYLE` and a fixed `now`; 3 options in one object avoid a 4+ parameter list | Keep writing to the stream inside each helper (today's design): untestable without spies |
| DEC-04 | FR-08 | `runDoctor` reads `systemClock.now()` once and passes the same instant to `diagnoseProject` and to the formatter. | Today diagnosis uses `systemClock.now()` and `text.ts:32` uses `new Date()`: two instants for one report | — |
| DEC-05 | FR-03, FR-05, FR-07, FR-08, FR-10, FR-11 | Remove `renderFinding`, `excludedDetectionLines` (delete `detection-text.ts`), `renderModeLines`, and `renderActiveSessionsText`. Their logic moves to row builders that return `CardRow[]`. `doctor-mode-text.ts` keeps a string helper `describeSnapshot(snapshot)` for the snapshot value. | All 4 have no caller outside `text.ts` and tests (grep at `419c0bd`); keeping them leaves dead code | Keep them as wrappers: dead code, 2 styles to maintain |
| DEC-06 | FR-03 | A problem row is `{ label: 'WARN' or 'ERROR', value: CODE plus harness plus path joined by 2 spaces, notes: [message, 'Impact: …', 'Fix: …'] }`, absent fields left out. | `notes` as an array lets `prd-24-doctor-fix-command` add or replace one note without reshaping the row | Message in `value`: long values do not wrap in `card.ts` |
| DEC-07 | FR-05, FR-06 | The harness row value is `state, <level> support[, version X][, overhead N ms / T ms]`; with overhead status `fail`, the value ends with ` WARN` and the row tone is `warn`. `N` is `Math.round(p95Milliseconds)`. The overhead segment prints only when `overhead` is not null and `p95Milliseconds` is not null. Status and exit code stay with `buildDoctorReport`. | Text label required by NFR-02; current code prints the segment under the same condition (`text.ts:21`) | — |
| DEC-08 | NFR-03 | New helper `formatTokens(n)` in `src/cli/output/token-format.ts` inserts `,` every 3 digits with a regular expression. Sessions and the Context `last window` value use it. | `toLocaleString()` depends on the machine locale | `Intl.NumberFormat('en-US')`: fixed too, but heavier and ICU-dependent |
| DEC-09 | FR-09 | `datedSession` returns `[]` when `summarizeLedger(lines).sessionLine?.agentId` is a string. A ledger without a session line passes. | Ledger key is session id plus agent id (`runtime-paths.ts:22`); `SessionLine.agentId` is nullable (`session-ledger.ts:17`) | Filter in the CLI: JSON would still list subagents, against FR-09 |
| DEC-10 | FR-11 | The hint line prints when at least 1 integration has limitations or at least 1 `ok` finding exists, and `verbose` is false. Text: `Run context-brake doctor --verbose to see ` + the hidden parts joined by ` and `: `<n> capability limitation(s)`, `the passed-check messages`, + `.`. | Gives the exact condition the PRD leaves open | — |
| DEC-11 | FR-14 | `renderHelp` does not change. Only the README documents `--verbose` and the layout. | `renderHelp` lists no options for any command (`composition-root.ts:12-27`); FR-14 acceptance names only the README | Add an `Options:` block for doctor only: inconsistent help. Confirmed by the user on 2026-10-21 |
| DEC-12 | FR-12 | `ParsedDoctorArgs` gains `verbose: boolean`; `--json` ignores it. | `parseArgs` strict mode rejects unknown flags today | — |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/cli/output/doctor-text.ts` | New | `formatDoctorReport` (header, card order, hint line) and `renderDoctorText` (style detection, stdout) | CMP-02, CMP-03, CMP-04, `card.ts`, `style.ts` |
| CMP-02 | `src/cli/output/doctor-rows.ts` | New | `problemRows`, `harnessRows` (with excluded detections and verbose limitations), `checkRows` | DEC-02, DEC-06, DEC-07 |
| CMP-03 | `src/cli/output/doctor-mode-text.ts` | Modified | `contextRows(report, verbose)`: window, snapshot with invocation notes, debug mode; `describeSnapshot` | CMP-05, `trigger-text.ts` |
| CMP-04 | `src/cli/output/doctor-sessions-text.ts` | Modified | `sessionRows(sessions, now)` | CMP-05 |
| CMP-05 | `src/cli/output/token-format.ts` | New | `formatTokens` | DEC-08 |
| CMP-06 | `src/cli/output/text.ts` | Modified | Keeps only `renderCliErrorText` | DEC-05 |
| CMP-07 | `src/cli/output/detection-text.ts` | Removed | — | DEC-05 |
| CMP-08 | `src/cli/argument-parser.ts` | Modified | `--verbose` for doctor | DEC-12 |
| CMP-09 | `src/cli/commands/doctor.ts` | Modified | One `now`; passes `{ verbose, now }` to `renderDoctorText` | DEC-04 |
| CMP-10 | `src/core/services/active-sessions.ts` | Modified | Skips subagent ledgers | DEC-09 |
| CMP-11 | `README.md` | Modified | Command table row, "Active Sessions in `doctor`", debug-mode sentence, doctor layout | FR-14 |

Flow: `runDoctor` diagnoses as today, adds restart findings, then either writes JSON (unchanged) or calls `renderDoctorText(report, { verbose, now })`. The writer calls `detectStyle({ env, platform, isTty: process.stdout.isTTY })` and writes `formatDoctorReport(...)` to stdout for every status. The formatter emits the header line, then, separated by blank lines, the cards in FR-02 order: `Problems` always, the others only with at least 1 row, then the hint line (DEC-10).

## Contracts and data

- **Doctor JSON (`schemas/doctor-report.schema.json`)**: no shape change. `activeSessions` no longer holds entries from subagent ledgers (FR-09). The array stays omitted when empty (`doctor-report-extras.ts`).
- **CLI arguments**: `doctor --verbose` (boolean, default false). `--json --verbose` gives the same document as `--json`.
- **Exit codes**: unchanged (`src/cli/exit-codes.ts`).
- **Doctor text** (human output, not a contract; exact strings fixed by the unit tests):
  - Header: `ContextBrake doctor: <OK|WARN|ERROR> (<e> error(s), <w> warning(s))`; with no errors and no warnings: `ContextBrake doctor: OK (no problems found)`. The label follows `report.status`; the counts come from `report.findings`.
  - `Problems`: rows per DEC-06, errors first, then warnings, report order inside each severity; or 1 row with an empty label and value `No problems found.`.
  - `Harnesses`: rows per DEC-07; excluded detections as `excluded by configuration` with tone `muted`; limitations as notes `<capability>: <impact>` only with `verbose`.
  - `Context`: `window` → `<source> (mod <mod>, bridge <bridge>, last window <tokens|unknown>)`; `snapshot` → `describeSnapshot` (`<command> at <trigger>[, resume <resume>]` or `not configured (zone headers only, trigger <trigger>)`), notes `<harness>: <command>[, resume <resume>]`; `debug mode` → `on`.
  - `Sessions`: label `<sessionId>` or `(unknown session)`; value `<harness>  <p>%  <used> / <window>  <zone>  <source>  <ago>`, or `<harness>  usage unknown since last reset  <ago>`; `<ago>` is `now` below 1 minute, else `<m> min ago`.
  - `Checks passed`: default 1 row, label `OK`, value the `ok` codes joined by `, `; with `verbose`, 1 row per `ok` finding, value the code, note the message.

## Integrations and interfaces

- CLI command `context-brake doctor [--json] [--harness <id>] [--verbose]`. No harness hook, plugin, file write, or child process changes.

## Errors, security, and recovery

- Errors and edges: a report with no integrations, no context, and no sessions prints the header, `Problems`, and nothing else. CLI errors (`INVALID_ARGUMENTS`, `UNEXPECTED_ERROR`) keep `renderCliErrorText` on stderr; they are errors, not results.
- User files and sensitive data: no change; the text shows the same data as before.
- Concurrency and idempotency: read-only command; unchanged.
- Rollback or reversal: revert the commit; no persisted format changes.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1. Filter subagent ledgers in `activeSessions` | — | TC-09 passes |
| 2. Add `--verbose` to the parser | — | TC-11 passes |
| 3. Build `token-format.ts`, row builders, and `doctor-text.ts`; remove the old helpers | 2 | TC-01 to TC-08, TC-10 pass |
| 4. Wire `runDoctor` (one `now`, options); repoint integration tests | 1, 3 | TC-12, TC-13 pass |
| 5. Update the README | 3 | TC-14 |

## Test approach

- Profile: CLI command surface only (`src/cli/`), plus one pure core service. Node.js `>=20`, TypeScript `^5.9.2` (ESM), Vitest `^3.2.4`. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- End-to-end: not changed; `tests/e2e/e2e-doctor.test.ts` checks only `--json` and must still pass.
- Platforms: no paths, line endings, or processes change; unit tests with `PLAIN_STYLE` give the same text on Linux, macOS, and Windows (NFR-03, NFR-04).
- Command prerequisites and exclusions: all tests stay in the default in-process lane; nothing goes to `PROCESS_LANE_FILES`. Run only the touched suites between steps (user memory); the full suite and coverage run once at the end.
- Tests to revalidate: `tests/unit/cli-output-text.test.ts` (rewritten: it imports `renderFinding` and asserts `[WARN] ContextBrake doctor: warnings` and stderr), `tests/unit/doctor-mode-text.test.ts` (API change), `tests/unit/snapshot-trigger-percentage-merge.test.ts:32` (repoint to `describeSnapshot`), `tests/integration/config-repair-errors.test.ts:56` (asserts stderr and `Remediation:`; becomes stdout and `Fix:`), `tests/unit/active-sessions.test.ts` (new case).

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01 | unit | Reports with 1 error and 2 warnings; with only `ok` findings | `ContextBrake doctor: ERROR (1 error, 2 warnings)`; `ContextBrake doctor: OK (no problems found)` | `tests/unit/doctor-text.test.ts` |
| TC-02 | FR-02 | unit | Full report; report without sessions | Section titles in FR-02 order; no `Sessions` title | `tests/unit/doctor-text.test.ts` |
| TC-03 | FR-03, FR-04 | unit | 1 warning then 1 error in the report; problem with all fields; only `ok` findings | Error row before warning row; notes message, `Impact: …`, `Fix: …`; `No problems found.` | `tests/unit/doctor-rows.test.ts` |
| TC-04 | FR-05, FR-06 | unit | Integration with overhead `fail` 133.7/100 and no warning findings; excluded detection | Row ends with `overhead 134 ms / 100 ms WARN`; header `OK`; `excluded by configuration` row | `tests/unit/doctor-rows.test.ts` |
| TC-05 | FR-07 | unit | Snapshot with invocations, debug mode, context window 1000000 | `window`, `snapshot` with invocation notes, `debug mode  on`, `1,000,000` | `tests/unit/doctor-mode-text.test.ts` |
| TC-06 | FR-08, NFR-03 | unit | 2 sessions (0 and 4 minutes old) and 1 unknown id, fixed `now` | `now`, `4 min ago`, `(unknown session)`, `84,200 / 1,000,000` | `tests/unit/doctor-sessions-text.test.ts` |
| TC-07 | FR-10 | unit | 3 `ok` findings, default and verbose | 1 row with 3 codes; 3 rows with messages | `tests/unit/doctor-rows.test.ts` |
| TC-08 | FR-11 | unit | Integration with 2 limitations and 1 `ok` finding, default and verbose; report with neither | Default: no limitation text, hint names `2 capability limitations` and `the passed-check messages`; verbose: limitation notes, no hint; neither: no hint | `tests/unit/doctor-text.test.ts` |
| TC-09 | FR-09 | unit | 1 main ledger, 3 subagent ledgers of the same session id, 1 ledger without a session line | 2 entries: the main session and the unknown one | `tests/unit/active-sessions.test.ts` |
| TC-10 | NFR-02 | unit | Color style vs `PLAIN_STYLE` | Every status keeps its text label; plain output has no escape codes | `tests/unit/doctor-text.test.ts` |
| TC-11 | FR-12 | unit | `doctor --verbose`, `doctor --json --verbose`, `doctor --verbos` | `verbose: true`; both flags parsed; `INVALID_ARGUMENTS` | `tests/unit/doctor-arguments.test.ts` |
| TC-12 | FR-12, NFR-01 | integration | `doctor --json` and `doctor --json --verbose` on a fixture | Same document; `doctorReportSchema.parse` passes; `npm run schemas:check` passes | `tests/integration/config-repair-errors.test.ts` or a new doctor CLI test |
| TC-13 | FR-13 | integration | Fixture with an invalid configuration (status `errors`) | Text on stdout with `Fix: …`; stderr empty; exit code 2 | `tests/integration/config-repair-errors.test.ts` |
| TC-14 | FR-14 | manual | Review the README diff | Table lists `--verbose`; sections match the new output; subagents left out of active sessions | review |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | empty `catch` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | clock or randomness in `core` | reservation | `"${RG[@]}" 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | — |
| QA-06 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-07 | file above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope: `files` = TypeScript files in the task diff; `core_files` = `src/core/services/active-sessions.ts`.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured at `419c0bd` with the commands of `preparatory-refactoring.md` and QA-01 to QA-07.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/cli/output/text.ts` | 39 | 3 | <4 | 0 | none | recorded |
| `src/cli/output/doctor-mode-text.ts` | 20 | 1 | <4 | 0 | none | recorded |
| `src/cli/output/doctor-sessions-text.ts` | 16 | 1 | <4 | 0 | none | recorded |
| `src/cli/output/detection-text.ts` | 5 | 1 | <4 | 0 | none | removed (DEC-05) |
| `src/cli/output/card.ts` | 36 | 2 | <4 | 0 | none | read only |
| `src/cli/commands/doctor.ts` | 61 | 1 | <4 | 0 | none | recorded |
| `src/cli/argument-parser.ts` | 50 | 6 | <4 | 0 | none | recorded |
| `src/core/services/active-sessions.ts` | 45 | 5 | <4 | 0 | none | recorded |

- Preparatory refactoring: not recommended. No target file crosses a structural threshold.

## Observability and rollout

- Signals: the doctor text itself.
- Migration and compatibility: the text output changes for every user; scripts must use `--json` (PRD assumption). `activeSessions` in JSON loses subagent entries; the field shape is the same.
- Rollout and rollback: ships in the next release with a README note; rollback is a revert.

## Risks and open items

- Risk: a user script matches the old text lines (low probability; the README points automation to `--json`). Mitigation: README note.
- Risk: after this feature, `init`/`remove` text still writes to stderr on `errors` and prints `Remediation:` and `[WARN]` (`install-text.ts:31`, `install-rows.ts`), so `init` and `doctor` differ. Out of scope by PRD; review must not flag it as a regression of this feature.
- DEC-11 (help text unchanged, README only) confirmed by the user on 2026-10-21 at the technical HIL.

## Relevant files

- Modify: `src/cli/output/text.ts`, `src/cli/output/doctor-mode-text.ts`, `src/cli/output/doctor-sessions-text.ts`, `src/cli/commands/doctor.ts`, `src/cli/argument-parser.ts`, `src/core/services/active-sessions.ts`, `README.md`, `tests/unit/cli-output-text.test.ts`, `tests/unit/doctor-mode-text.test.ts`, `tests/unit/snapshot-trigger-percentage-merge.test.ts`, `tests/unit/active-sessions.test.ts`, `tests/integration/config-repair-errors.test.ts`
- Create: `src/cli/output/doctor-text.ts`, `src/cli/output/doctor-rows.ts`, `src/cli/output/token-format.ts`, `tests/unit/doctor-text.test.ts`, `tests/unit/doctor-rows.test.ts`, `tests/unit/doctor-sessions-text.test.ts`, `tests/unit/doctor-arguments.test.ts`
- Remove: `src/cli/output/detection-text.ts`
