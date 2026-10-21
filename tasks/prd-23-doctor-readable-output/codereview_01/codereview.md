# Code review report — prd-23-doctor-readable-output

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `419c0bd328b2cd209ed98846e6b50b73ef4664fd..worktree` (uncommitted and untracked files), minus the pre-existing prd-22 diff that `workflow.md#context` lists
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-23-doctor-readable-output/prd.md` | read; sha256 `70825dc0…` equals the approved hash (H-01) |
| TechSpec | `tasks/prd-23-doctor-readable-output/techspec.md` | read; sha256 `b0d3389a…` equals the approved hash (A-01) |
| Manifest | `tasks/prd-23-doctor-readable-output/tasks.md` | read; sha256 `991d108c…` differs from the approved hash `b6f89eef…` (see limitations) |
| Handoffs | `done/task_01.md`, `done/task_02.md`, `done/task_03.md` | read; all 3 links in `tasks.md` resolve |
| Workflow and decisions | `workflow.md`, `autonomous-decisions.md`, `checkpoint.json` | read (H-00..H-03, A-01, A-02, AUTO-01..AUTO-04) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads, `on-run` entry L-01. `git_head` 419c0bd equals `HEAD`. `Decisions` and `Code map` not loaded |
| Implementation | `git diff 419c0bd` plus untracked files | delimited |

Reviewable set (this feature):

- Source: `src/cli/argument-parser.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/doctor-mode-text.ts`, `src/cli/output/doctor-sessions-text.ts`, `src/cli/output/text.ts`, `src/cli/output/detection-text.ts` (deleted), `src/cli/output/doctor-rows.ts` (new), `src/cli/output/doctor-text.ts` (new), `src/cli/output/token-format.ts` (new), `src/core/services/active-sessions.ts`, `README.md`.
- Tests: `tests/unit/{active-sessions,cli-output-text,doctor-mode-text,snapshot-trigger-percentage-merge}.test.ts`, `tests/integration/{config-repair-errors,debug-mode-lifecycle,doctor-active-sessions,doctor-exclusion}.test.ts`, new `tests/unit/{doctor-text,doctor-rows,doctor-sessions-text,doctor-arguments}.test.ts`, new `tests/integration/doctor-verbose.test.ts`.

Excluded from the review (prd-22 diff, `workflow.md#context`): `.gitignore`, `docs/research/harness-integrations.md`, `src/infrastructure/harnesses/claude-code/adapter.ts`, `src/infrastructure/harnesses/claude-code/capabilities.ts`, `tasks/triage-log.jsonl`, `tests/bench/e2e-09.test.ts`, `tests/integration/adapter-version-probes.test.ts`, `tests/integration/init-remove-footprint.test.ts`, `tests/integration/linked-project-root-lifecycle.test.ts`, and the folders `tasks/prd-21-*`, `tasks/prd-22-*`, `tasks/prd-24-*`.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Header with status label and counts | `doctor-text.ts:headerLine`, `headerSummary` (L24-33) | `doctor-text.test.ts` "doctor header" (2 cases) | conformant | Exact strings `ContextBrake doctor: ERROR (1 error, 2 warnings)` and `... OK (no problems found)` asserted |
| FR-02 | Section order; empty sections omitted except `Problems` | `doctor-text.ts:sections`, `formatDoctorReport` (L35-63) | `doctor-text.test.ts` "doctor sections" | conformant | Titles equal the FR-02 list; empty report prints only header and `Problems` |
| FR-03 | Errors first, report order, code/harness/path, message, `Impact:`, `Fix:` | `doctor-rows.ts:problemRow`, `problemRows` (L32-42) | `doctor-rows.test.ts` TC-03 | conformant | Row order `E1, W1, W2`; notes `[message, Impact: …, Fix: …]`; `Fix:` uses the existing `remediation` text |
| FR-04 | `No problems found.` | `doctor-rows.ts:NO_PROBLEMS_ROW` (L19, L41) | `doctor-rows.test.ts`, `doctor-text.test.ts` | conformant | Exact row and full text asserted |
| FR-05 | Harness row, overhead `WARN`, excluded harnesses | `doctor-rows.ts:integrationRow`, `harnessRows` (L44-68) | `doctor-rows.test.ts` TC-04 | conformant | `installed, full support, version 2.1.300, overhead 134 ms / 100 ms WARN`; `excluded by configuration` row; built CLI printed `overhead 481 ms / 100 ms WARN` with header `OK` |
| FR-06 | Status and exit code unchanged | No change in `src/core/services/report-service.ts` or `src/cli/exit-codes.ts` (not in the diff); header reads only `report.status` (`doctor-text.ts:31`) | `tests/bench/doctor-benchmark.test.ts:66-70` (pre-existing, forced `fail` keeps the exit code) | conformant | By trace; no formatter test of the header with overhead `fail` (CR-02) |
| FR-07 | Context: window, snapshot with invocations, debug mode | `doctor-mode-text.ts:contextRows`, `describeSnapshot` | `doctor-mode-text.test.ts` TC-05 | conformant | `last window 1,000,000`, invocation notes, `debug mode` row |
| FR-08 | Sessions rows; `(unknown session)` | `doctor-sessions-text.ts:sessionRows` | `doctor-sessions-text.test.ts` TC-06; `doctor-active-sessions.test.ts` | conformant | `84,200 / 1,000,000`, `now`, `4 min ago`, `(unknown session)` |
| FR-09 | Main-agent sessions only, in text and JSON | `active-sessions.ts:isSubagentLedger` (L29-30, L35-37) | `active-sessions.test.ts` TC-09 | conformant | Unit: `['main', null]`. JSON uses the same function (`doctor-service.ts:90` → `doctor-report-extras.ts:19`), so JSON follows by construction; no JSON-level test with subagent ledgers |
| FR-10 | Checks passed: 1 row default, 1 row per finding verbose | `doctor-rows.ts:checkRows` (L70-79) | `doctor-rows.test.ts` TC-07 | conformant | Both modes asserted; test uses 2 `ok` findings, not 3 as TC-07 says (no effect on the obligation) |
| FR-11 | Limitations only with `--verbose`; hint line | `doctor-rows.ts:limitationNotes`; `doctor-text.ts:hiddenParts`, `verboseHint` | `doctor-text.test.ts` TC-08; `doctor-rows.test.ts` | conformant | Default ends with `Run context-brake doctor --verbose to see 2 capability limitations and the passed-check messages.`; verbose has notes and no hint; neither case has no hint |
| FR-12 | `--verbose` flag; no effect with `--json` | `argument-parser.ts:parseDoctor` (L14-21) | `doctor-arguments.test.ts` TC-11; `doctor-verbose.test.ts` TC-12 | conformant | `--verbos` throws `CliArgumentError`; built CLI exits 64 with `INVALID_ARGUMENTS`; JSON documents equal and schema-valid |
| FR-13 | Text on stdout for every status | `doctor-text.ts:renderDoctorText` (L65-68) | `doctor-text.test.ts` "doctor text stream"; `config-repair-errors.test.ts` TC-13 | conformant | stderr empty and `Fix:` on stdout for an `errors` report; built CLI wrote 0 bytes to stderr. Text run exit code not asserted (CR-01) |
| FR-14 | README documents layout and `--verbose`; help per DEC-11 | `README.md` 4 hunks (L168, L258, L262, L329) | TC-14 manual review | conformant | Command table lists `--verbose`; Diagnostics bullet gives the layout; debug sentence says `debug mode  on`, which equals the rendered row; Active Sessions says subagents are left out. Help unchanged per DEC-11 (H-02); PRD FR-14 text still names "the CLI help" |
| NFR-01 | Schema unchanged | `schemas/` not in the diff | `npm run schemas:check`; `doctor-verbose.test.ts` | conformant | `schemas:check` exit 0 |
| NFR-02 | Text labels; color only reinforces | `SEVERITY_WORDS` (`doctor-rows.ts:9-13`); `detectStyle` with `isTty` (`doctor-text.ts:66`) | `doctor-text.test.ts` TC-10 | conformant | Plain output has no escape code. `card.ts:23` paints every row label `muted`, so `WARN`/`ERROR` labels keep the text but not the tone color; the row value carries the tone |
| NFR-03 | Fixed thousands separator | `token-format.ts:formatTokens` | TC-05, TC-06 | conformant | `1,000,000`, `84,200`; no `toLocaleString` in the reviewable set |
| NFR-04 | ASCII titles and labels; glyph fallback | `card.ts` glyphs via `style.ts` | `doctor-text.test.ts` TC-10 | conformant | `+- Problems` with `unicode: false` |
| NFR-05 | English text | all new strings | review | conformant | All strings in the reviewable set are English |
| DEC-01..DEC-12 | See TechSpec adherence | — | — | conformant | — |
| TC-01..TC-14 | Test scenarios | — | listed suites | conformant | All suites pass in `npm run coverage`; TC-14 done in this review |
| QA-01..QA-07 | Quality profile | — | profile commands | conformant | 0 new hits |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (`core` does not import `cli`/`infrastructure`) | OK | QA-04: no hit on `src/core/services/active-sessions.ts` |
| `cli-output.md` streams (results on stdout) | OK | `doctor-text.ts:67`; built CLI stderr 0 bytes; CLI errors stay on stderr (`text.ts:3-5`) |
| `cli-output.md` labels and color (`NO_COLOR`, TTY) | OK | `doctor-text.ts:66` passes `isTty: process.stdout.isTTY === true` to `detectStyle` |
| `cli-output.md` messages in English | OK | review of new strings |
| `code-standards.md` file under 100 lines, function under 30 lines, at most 3 parameters | OK | Largest file `doctor-rows.ts` 79 lines; QA-06 and QA-07: no new hit |
| `code-standards.md` no comments | OK | No comment in the new or changed source files |
| `code-standards.md` named magic strings | OK | Separators, labels, and texts are named constants (`doctor-rows.ts:9-22`, `doctor-sessions-text.ts:8-12`, `doctor-text.ts:12-14`) |
| `javascript-typescript.md` no `any`, no suppressions | OK | QA-01, QA-02: no hit |
| `tests.md` in-process tests | OK | `doctor-verbose.test.ts` uses `runCli` (`tests/helpers/delegated-world.ts:26`, stream spies); `test-lanes.test.ts` passes |
| `tests.md` test budget (180 s) | OK | `npm run test:budget` not run by T03 or by this review; `npm run coverage` took 175.45 s here (under 180 s, with 2 `doctor` runs in parallel on the machine) and 135.7 s in T03 |
| `tests.md` repeatable (no clock) | OK | Unit tests pass a fixed `NOW`; integration regexes accept 1-2 or 2-3 minutes as before |

## Quality profile

Scope: the 22 TypeScript files of the reviewable set (`files`); `core_files` = `src/core/services/active-sessions.ts`. Commands ran with `rg -n --no-heading`.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg ':\s*any\b\|\bas any\b\|<any>' files` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 new of 0 | OK |
| QA-03 | empty `catch` | blocking | `rg -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' files` | 0 new of 0 | OK |
| QA-04 | `core` imports `infrastructure` or `cli` | blocking | `rg "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 new of 0 | OK |
| QA-05 | clock or randomness in `core` | reservation | `rg 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' core_files` | 0 new of 0 | OK |
| QA-06 | 4+ parameters | reservation | `rg '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' files` | 0 new of 1 | pre-existing: `tests/integration/doctor-exclusion.test.ts:44` (array literal in a `for…of`, a false positive; same line at `419c0bd`) |
| QA-07 | file above 100 lines | reservation | `rg -c -H '^' files \| awk -F: '$2 > 100'` | 0 new of 0 | OK |

- Terrain baseline: applied from TechSpec for `src/` files; the baseline table does not list test files, so the QA-06 test hit was checked with `git show 419c0bd:tests/integration/doctor-exclusion.test.ts`.
- Hits discounted by baseline: 1 (QA-06, pre-existing).
- Reservations accumulated in the feature: 0.
- Suggested escalation: no trigger fired (0 reservations, largest touched file 79 lines, no duplication in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 cards via `renderCard` | YES | `doctor-text.ts:61` |
| DEC-02 bare labels `OK`/`WARN`/`ERROR` | YES | `doctor-rows.ts:9-13`; `install-rows.ts` unchanged |
| DEC-03 pure formatter plus thin writer | YES | `formatDoctorReport(report, { verbose, now, style })`, `renderDoctorText(report, { verbose, now })` |
| DEC-04 one `now` | YES | `doctor.ts:47`, passed to `diagnoseProject` and `renderDoctorText` |
| DEC-05 dead helpers removed | YES | `renderFinding`, `renderModeLines`, `renderActiveSessionsText`, `excludedDetectionLines`, `detection-text.ts` have no reference in `src/` or `tests/` |
| DEC-06 problem row shape | YES | `doctor-rows.ts:32-37`; `notes` is an array |
| DEC-07 harness row value and `WARN` | YES | `doctor-rows.ts:44-60`; `Math.round`; segment only with non-null overhead and p95 |
| DEC-08 `formatTokens` | YES | `token-format.ts` |
| DEC-09 filter in `datedSession` | YES | `active-sessions.ts:30` |
| DEC-10 hint condition and text | YES | `doctor-text.ts:45-58` |
| DEC-11 help unchanged | YES | `src/cli/composition-root.ts` not in the diff |
| DEC-12 `verbose` in `ParsedDoctorArgs` | YES | `argument-parser.ts:9` |
| CMP-03 signature `contextRows(report, verbose)` | YES | Implemented as `contextRows(report)`; no Context content depends on `verbose` in the PRD or the contract, so the parameter would be unused |
| Contracts and data (text layout) | YES | Built CLI output (`doctor`, `doctor --verbose`) matches every card in `techspec.md#contracts-and-data` |
| Errors and edges (empty report; CLI errors on stderr) | YES | `doctor-text.test.ts` empty report; `text.ts:renderCliErrorText` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | T01.1-T01.2 checked; `isSubagentLedger` and TC-09 present; suite passes |
| T02 | `done/task_02.md` | COMPLETE | T02.1-T02.7 checked; new files, removed helpers, and repointed tests present; AUTO-04 covers 3 extra integration suites |
| T03 | `done/task_03.md` | COMPLETE | T03.1-T03.6 checked; parser flag, verbose rows, hint, README, TC-11 and TC-12 suites present |

Manifest state: `[x]` for T01, T02, T03; dependency graph acyclic (T03 depends on T01, T02).

## Executed validations

- Profile and scope: CLI command surface and 1 pure core service; tests in process; e2e smoke set unchanged (`tests/e2e/e2e-doctor.test.ts`).
- Validated state: worktree at `HEAD` 419c0bd plus the prd-22 diff and this feature; Windows 11 Pro 10.0.26200, Node.js 24.20.0, Git Bash. The worktree status before and after the commands is the same (33 non-`tasks/` entries).
- Reused evidence: none. All checks ran in this review.
- Manual acceptance: TC-14 README diff reviewed in this review (4 hunks). Built CLI runs on this repository: `doctor` (exit 0, stderr empty, card layout and hint), `doctor --verbose` (limitations and passed-check messages, no hint), `doctor --verbos` (exit 64, `INVALID_ARGUMENTS`).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | rules |
| `npm run typecheck` | passed (exit 0) | rules |
| `npm run schemas:check` | passed (exit 0) | NFR-01 |
| `npm run build` | passed (exit 0) | prerequisite for e2e and manual runs |
| `npm run coverage` | passed: 277 files, 1450 passed, 1 skipped, 175.45 s; all files 96.15% lines; `doctor-rows.ts`, `doctor-text.ts`, `token-format.ts`, `text.ts` 100% lines | FR-01..FR-13, NFR-01..NFR-04, TC-01..TC-13, e2e `e2e-doctor` |
| QA-01..QA-07 profile commands | 0 new hits | QA-01..QA-07 |
| `node dist/src/cli/main.js doctor` | exit 0, stdout only | FR-01, FR-02, FR-05, FR-07, FR-08, FR-09, FR-10, FR-11, FR-13 |
| `node dist/src/cli/main.js doctor --verbose` | exit 0 | FR-10, FR-11, FR-12 |
| `node dist/src/cli/main.js doctor --verbos` | exit 64, `INVALID_ARGUMENTS` | FR-12 |

## Findings

No blocking finding. The items below are optional improvements.

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low (optional) | TC-13, FR-13 | `tests/integration/config-repair-errors.test.ts:56-58` — the text run (`runInProcessCli(['doctor'], dir)`) asserts stdout and stderr but not `text.code`; TC-13 expects exit code 2. Only the `--json` run asserts `result.code` 2 (L52) | A future change that breaks the exit code of the text path only passes this test. Today `doctor.ts` returns `report.exitCode` on both branches | Add `expect(text.code).toBe(2)` after L56 |
| CR-02 | Low (optional) | TC-04, FR-06 | `tests/unit/doctor-rows.test.ts:31-34` checks the `WARN` row only; no test renders a full report with overhead `fail` and asserts the header `OK`, as TC-04 expects | The FR-06 text acceptance ("first line status does not change") rests on code trace (`doctor-text.ts:31`) and the pre-existing bench, not on a TC-04 test | Add a `formatDoctorReport` case with a `healthy` report and overhead `fail` that asserts the first line `ContextBrake doctor: OK (no problems found)` and the `WARN` harness row |

## Previous findings (re-review only)

Not applicable: first review.

## Limitations and open items

- `tasks.md` sha256 `991d108c…` differs from the approved hash `b6f89eef…` in `checkpoint.json`. The visible changes after approval are the State checkboxes and the "Problems and solutions" entry (AUTO-04). The file is untracked, so this review cannot prove that nothing else changed. No status impact; `workflow.md` can record it.
- Platforms: validated on Windows only. Linux and macOS evidence depends on CI, which this review did not run. The text uses `PLAIN_STYLE` and a fixed separator in tests, so the risk is low.
- `npm run test:budget` was not run. `npm run coverage` took 175.45 s, close to the 180 s budget, with 2 `doctor` runs in parallel on the machine; T03 measured 135.7 s.
- FR-09 JSON evidence is by construction (`doctor-service.ts:90`); no JSON-level test seeds subagent ledgers.
- PRD FR-14 text still names "the CLI help"; DEC-11 (user, H-02) replaces that part. The PRD text was not amended.
- `card.ts:23` paints every row label `muted`, so the `WARN`/`ERROR` label in `Problems` has no tone color. NFR-02 is met by the text label; a change touches the `init` cards too and is outside this scope.
- Out of scope by the TechSpec risks: `init`/`remove` text still uses `[WARN]`, `Remediation:`, and stderr on `errors` (`install-rows.ts:38`). Not a finding.

## Conclusion

All 14 FR, 5 NFR, 12 DEC, and 14 TC obligations are conformant, with evidence from tests, the built CLI, and code trace. T01-T03 are complete with intact links. Lint, typecheck, schema check, build, and the full coverage run pass. The quality profile has 0 new hits. 2 optional test improvements (CR-01, CR-02) remain, so the status is `APPROVED WITH RESERVATIONS`.
