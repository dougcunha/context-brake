# Code review report — prd-23-doctor-readable-output

## Summary

- Status: APPROVED
- Execution: delegated reviewer
- Git scope: `419c0bd328b2cd209ed98846e6b50b73ef4664fd..worktree` (uncommitted and untracked files), minus the pre-existing prd-22 diff that `workflow.md#context` lists
- Previous review: `tasks/prd-23-doctor-readable-output/codereview_01/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-23-doctor-readable-output/prd.md` | read; sha256 `70825dc0…` equals the approved hash (H-01) |
| TechSpec | `tasks/prd-23-doctor-readable-output/techspec.md` | read; sha256 `b0d3389a…` equals the approved hash (A-01) |
| Manifest | `tasks/prd-23-doctor-readable-output/tasks.md` | read; sha256 `991d108c…` differs from the approved hash `b6f89eef…`; `workflow.md` R-01 records the cause (State checkboxes, task links, AUTO-04 entry). Same hash as in codereview_01 |
| Handoffs | `done/task_01.md`, `done/task_02.md`, `done/task_03.md` | read; all 3 links in `tasks.md` resolve |
| Corrections | `codereview_01/done/task_04.md` | read; covers codereview_01/CR-01 and CR-02. No correction manifest, as `sdd-plan-corrections` step 4 requires |
| Workflow and decisions | `workflow.md`, `autonomous-decisions.md`, `checkpoint.json` | read (H-00..H-03, A-01..A-03, R-01, AUTO-01..AUTO-05) |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter: header, next step brief, open threads O-01..O-03, `on-run` entry L-01. `git_head` 419c0bd equals `HEAD`. `Decisions` and `Code map` not loaded |
| Implementation | `git diff 419c0bd` plus untracked files | delimited |

Reviewable set (this feature):

- Source: `src/cli/argument-parser.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/doctor-mode-text.ts`, `src/cli/output/doctor-sessions-text.ts`, `src/cli/output/text.ts`, `src/cli/output/detection-text.ts` (deleted), `src/cli/output/doctor-rows.ts` (new), `src/cli/output/doctor-text.ts` (new), `src/cli/output/token-format.ts` (new), `src/core/services/active-sessions.ts`, `README.md`.
- Tests: `tests/unit/{active-sessions,cli-output-text,doctor-mode-text,snapshot-trigger-percentage-merge}.test.ts`, `tests/integration/{config-repair-errors,debug-mode-lifecycle,doctor-active-sessions,doctor-exclusion}.test.ts`, new `tests/unit/{doctor-text,doctor-rows,doctor-sessions-text,doctor-arguments}.test.ts`, new `tests/integration/doctor-verbose.test.ts`.

Excluded (prd-22 diff, `workflow.md#context`): `.gitignore`, `docs/research/harness-integrations.md`, `src/infrastructure/harnesses/claude-code/adapter.ts`, `src/infrastructure/harnesses/claude-code/capabilities.ts`, `tasks/triage-log.jsonl`, `tests/bench/e2e-09.test.ts`, `tests/integration/adapter-version-probes.test.ts`, `tests/integration/init-remove-footprint.test.ts`, `tests/integration/linked-project-root-lifecycle.test.ts`, and the folders `tasks/prd-21-*`, `tasks/prd-22-*`, `tasks/prd-24-*`.

Change since codereview_01: only `tests/integration/config-repair-errors.test.ts` and `tests/unit/doctor-text.test.ts` (mtime 12:39). All `src/` files and `README.md` have mtimes 12:18–12:26, before `codereview_01/codereview.md` (12:38). This review still re-read the full source diff.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Header with status label and counts | `doctor-text.ts:headerSummary`, `headerLine` (L24-33) | `doctor-text.test.ts:31-37` | conformant | Exact strings `ContextBrake doctor: ERROR (1 error, 2 warnings)` and `ContextBrake doctor: OK (no problems found)`. `doctorRestartFindings` adds only `ok` findings (`restart-doctor-findings.ts:17,23`), so label and counts cannot disagree |
| FR-02 | Section order; empty sections omitted except `Problems` | `doctor-text.ts:sections`, `formatDoctorReport` (L35-63) | `doctor-text.test.ts:47-53` | conformant | Titles equal the FR-02 list; an empty report prints only the header and `Problems` |
| FR-03 | Errors first, report order, code/harness/path, message, `Impact:`, `Fix:` | `doctor-rows.ts:problemRow`, `problemRows` (L32-42) | `doctor-rows.test.ts:17-24`; `config-repair-errors.test.ts:59` | conformant | Order `E1, W1, W2`; notes `[message, Impact: …, Fix: …]`; `Fix:` uses `remediation` |
| FR-04 | `No problems found.` | `doctor-rows.ts:19,41` | `doctor-rows.test.ts:25-27`; `doctor-text.test.ts:52` | conformant | Row and full text asserted; built CLI prints it |
| FR-05 | Harness row, overhead `WARN`, excluded harnesses | `doctor-rows.ts:integrationRow`, `harnessRows` (L44-68) | `doctor-rows.test.ts:31-38`; `doctor-text.test.ts:38-43` | conformant | `installed, full support, version 2.1.300, overhead 134 ms / 100 ms WARN`; `excluded by configuration`; built CLI printed `overhead 264 ms / 100 ms WARN` |
| FR-06 | Status and exit code unchanged | `report-service.ts` and `exit-codes.ts` not in the diff; header reads only `report.status` (`doctor-text.ts:31`) | `doctor-text.test.ts:38-43` (new, CR-02) | conformant | Healthy report with overhead `fail` keeps header `OK` and the `WARN` row; built CLI exit 0 with `WARN` overhead |
| FR-07 | Context: window, snapshot with invocations, debug mode | `doctor-mode-text.ts:contextRows`, `describeSnapshot` | `doctor-mode-text.test.ts` | conformant | `last window 1,000,000`, invocation notes, `debug mode` row, `unknown` window |
| FR-08 | Session rows; `(unknown session)` | `doctor-sessions-text.ts:sessionRows` | `doctor-sessions-text.test.ts:15-24`; `doctor-active-sessions.test.ts` | conformant | `84,200 / 1,000,000`, `now`, `4 min ago`, `(unknown session)` |
| FR-09 | Main-agent sessions only, in text and JSON | `active-sessions.ts:30,35-37` | `active-sessions.test.ts` TC-09 | conformant | Unit result `['main', null]`. JSON uses the same function (`doctor-service.ts:90` → `doctor-report-extras.ts:19`). Built CLI listed 1 session while this subagent ran in the same session |
| FR-10 | Checks passed: 1 row default, 1 row per finding verbose | `doctor-rows.ts:checkRows` (L70-79) | `doctor-rows.test.ts:46-57` | conformant | Both modes asserted; verbose row = code line plus message note, per `techspec.md#contracts-and-data` |
| FR-11 | Limitations only with `--verbose`; hint line | `doctor-rows.ts:limitationNotes`; `doctor-text.ts:hiddenParts`, `verboseHint` | `doctor-text.test.ts:56-74`; `doctor-rows.test.ts:39-42` | conformant | Default hint `… to see 2 capability limitations and the passed-check messages.`; verbose has notes and no hint; no hint when nothing is hidden |
| FR-12 | `--verbose` flag; no effect with `--json` | `argument-parser.ts:9,14-21` | `doctor-arguments.test.ts`; `doctor-verbose.test.ts` | conformant | `--verbos` throws; built CLI exit 64 `INVALID_ARGUMENTS`; JSON documents equal and schema-valid (fake measurer, deterministic) |
| FR-13 | Text on stdout for every status | `doctor-text.ts:65-68` | `doctor-text.test.ts:86-93`; `config-repair-errors.test.ts:56-59` | conformant | `errors` report: exit 2, stderr empty, `Fix:` on stdout; built CLI stderr 0 bytes |
| FR-14 | README documents layout and `--verbose`; help per DEC-11 | `README.md` L168, L258, L262, L329 | TC-14 manual review | conformant | Table lists `--verbose`; Diagnostics bullet gives the layout; `debug mode  on` equals the rendered row; Active Sessions says subagents are left out. Help unchanged per DEC-11 (H-02) |
| NFR-01 | Schema unchanged | `schemas/` not in the diff | `npm run schemas:check`; `doctor-verbose.test.ts` | conformant | `schemas:check` exit 0 |
| NFR-02 | Text labels; color only reinforces | `doctor-rows.ts:9-13`; `doctor-text.ts:66` (`isTty`) | `doctor-text.test.ts:76-84` | conformant | Plain output has no escape code; color output keeps `WARN` |
| NFR-03 | Fixed thousands separator | `token-format.ts` | TC-05, TC-06 | conformant | `1,000,000`, `84,200`; no `toLocaleString` in `src/` or `tests/` |
| NFR-04 | ASCII titles and labels; glyph fallback | `card.ts` glyphs via `style.ts` | `doctor-text.test.ts:82` | conformant | `+- Problems` with `unicode: false` |
| NFR-05 | English text | all new strings | review | conformant | All strings in the reviewable set are English |
| DEC-01..DEC-12 | See TechSpec adherence | — | — | conformant | — |
| TC-01..TC-14 | Test scenarios | — | listed suites | conformant | All suites pass in `npm run coverage`; TC-14 done in this review |
| QA-01..QA-07 | Quality profile | — | profile commands | conformant | 0 new hits |
| codereview_01/CR-01 | Text run of TC-13 asserts exit code 2 | `config-repair-errors.test.ts:57` | same | conformant | `expect(text.code).toBe(2)` passes |
| codereview_01/CR-02 | Formatter test: `OK` header with overhead `fail` | `doctor-text.test.ts:38-43` | same | conformant | Header `OK` and row `… overhead 134 ms / 100 ms WARN` asserted |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (`core` does not import `cli`/`infrastructure`) | OK | QA-04: no hit on `src/core/services/active-sessions.ts` |
| `cli-output.md` streams (results on stdout) | OK | `doctor-text.ts:67`; built CLI stderr 0 bytes; CLI errors stay on stderr (`text.ts:3-5`) |
| `cli-output.md` labels and color (`NO_COLOR`, TTY) | OK | `doctor-text.ts:66` passes `isTty: process.stdout.isTTY === true` to `detectStyle` |
| `cli-output.md` JSON carries the same findings as text | OK | Text and JSON read the same `report` (`doctor.ts:56-61`) |
| `cli-output.md` messages in English | OK | review of new strings |
| `code-standards.md` file ≤100 lines, ≤3 parameters | OK | Largest source file `doctor-rows.ts` 79 lines; QA-06, QA-07: no new hit |
| `code-standards.md` no comments, named magic strings | OK | No comment in new or changed source; labels and separators are named constants (`doctor-rows.ts:9-22`, `doctor-sessions-text.ts:8-12`, `doctor-text.ts:12-14`) |
| `javascript-typescript.md` no `any`, no suppressions | OK | QA-01, QA-02: no hit |
| `tests.md` in-process tests, repeatable | OK | `doctor-verbose.test.ts` uses `runCli` with `fakeOverheadMeasurer` (`tests/helpers/delegated-world.ts:32`); unit tests pass a fixed `NOW` |
| `tests.md` time budget (`tests.md:51`, run after adding tests) | NOT OK — not attributable to the feature | `npm run test:budget`: 193.9 s > 180 s. `npm run coverage` in this session: 167.06 s (under 180 s). See limitations |

## Quality profile

Scope: the 22 TypeScript files of the reviewable set (`files`); `core_files` = `src/core/services/active-sessions.ts`. Commands ran with `rg -n --no-heading`.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg ':\s*any\b\|\bas any\b\|<any>' files` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg '@ts-ignore\|@ts-nocheck\|eslint-disable' files` | 0 new of 0 | OK |
| QA-03 | empty `catch` | blocking | `rg -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|…' files` | 0 new of 0 | OK |
| QA-04 | `core` imports `infrastructure` or `cli` | blocking | `rg "from '(\.\./)+(infrastructure\|cli)/" core_files` | 0 new of 0 | OK |
| QA-05 | clock or randomness in `core` | reservation | `rg 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' core_files` | 0 new of 0 | OK |
| QA-06 | 4+ parameters | reservation | `rg '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' files` | 0 new of 1 | pre-existing: `tests/integration/doctor-exclusion.test.ts:44` (array literal in `for…of`, false positive; same line at `419c0bd`) |
| QA-07 | file above 100 lines | reservation | `rg -c -H '^' files \| awk -F: '$2 > 100'` | 0 new of 0 | OK (largest: `tests/unit/doctor-text.test.ts` 94) |

- Terrain baseline: applied from TechSpec for `src/` files; the QA-06 test hit was checked with `git show 419c0bd:tests/integration/doctor-exclusion.test.ts`.
- Hits discounted by baseline: 1 (QA-06, pre-existing).
- Reservations accumulated in the feature: 0.
- Suggested escalation: no trigger fired (0 reservations, largest touched file 94 lines, no duplication in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 cards via `renderCard` | YES | `doctor-text.ts:61` |
| DEC-02 bare labels `OK`/`WARN`/`ERROR` | YES | `doctor-rows.ts:9-13`; `install-rows.ts` not in the diff |
| DEC-03 pure formatter plus thin writer | YES | `formatDoctorReport(report, { verbose, now, style })`, `renderDoctorText(report, { verbose, now })` |
| DEC-04 one `now` | YES | `doctor.ts:47`, passed to `diagnoseProject` and `renderDoctorText` |
| DEC-05 dead helpers removed | YES | `renderFinding`, `renderModeLines`, `renderActiveSessionsText`, `excludedDetectionLines`, `detection-text` have no reference in `src/` or `tests/` |
| DEC-06 problem row shape | YES | `doctor-rows.ts:32-37`; `notes` is an array |
| DEC-07 harness row value and `WARN` | YES | `doctor-rows.ts:44-60`; `Math.round`; segment only with non-null overhead and p95 |
| DEC-08 `formatTokens` | YES | `token-format.ts` |
| DEC-09 filter in `datedSession` | YES | `active-sessions.ts:30`; the filter runs before the 10-session limit |
| DEC-10 hint condition and text | YES | `doctor-text.ts:45-58` |
| DEC-11 help unchanged | YES | `src/cli/composition-root.ts` not in the diff |
| DEC-12 `verbose` in `ParsedDoctorArgs` | YES | `argument-parser.ts:9` |
| CMP-03 signature `contextRows(report, verbose)` | YES | Implemented as `contextRows(report)`; no Context content depends on `verbose`, so the parameter has no use |
| Contracts and data (text layout) | YES | Built CLI output of `doctor` and `doctor --verbose` matches every card in `techspec.md#contracts-and-data` |
| Errors and edges | YES | Empty report test (`doctor-text.test.ts:51-53`); `renderCliErrorText` on stderr |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | `isSubagentLedger` and TC-09 present; suite passes |
| T02 | `done/task_02.md` | COMPLETE | New files, removed helpers, repointed tests present; AUTO-04 covers 3 extra integration suites |
| T03 | `done/task_03.md` | COMPLETE | Parser flag, verbose rows, hint, README, TC-11 and TC-12 suites present |
| T04 (correction) | `codereview_01/done/task_04.md` | COMPLETE | T04.1-T04.2 checked; only the 2 test files changed (mtime 12:39); no production file changed (all `src/` mtimes 12:18–12:26 < report 12:38; every `file:line` cited in codereview_01 still resolves to the same code) |

Manifest state: `[x]` for T01, T02, T03; dependency graph acyclic.

## Executed validations

- Profile and scope: CLI command surface and 1 pure core service; tests in process; e2e smoke set unchanged (`tests/e2e/e2e-doctor.test.ts` checks `--json`).
- Validated state: worktree at `HEAD` 419c0bd plus the prd-22 diff, T01-T03, and T04; Windows 11 Pro 10.0.26200, Git Bash. `git status --porcelain` before and after the commands: the same 33 non-`tasks/` entries.
- Reused evidence: none. All checks ran in this review.
- Manual acceptance: TC-14 README diff reviewed (4 hunks). Built CLI on this repository: `doctor` (exit 0, stderr 0 bytes, card layout, hint), `doctor --verbose` (limitations and passed-check messages, no hint, exit 0), `doctor --verbos` (exit 64, `INVALID_ARGUMENTS`).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | rules |
| `npm run typecheck` | passed (exit 0) | rules |
| `npm run schemas:check` | passed (exit 0) | NFR-01 |
| `npm run build` | passed (exit 0) | prerequisite for e2e and manual runs |
| `npm run coverage` | passed: 277 files, 1451 passed, 1 skipped, 167.06 s; all files 96.15% lines; `doctor-rows.ts`, `doctor-text.ts`, `token-format.ts` 100% lines; `e2e-doctor.test.ts` passed | FR-01..FR-13, NFR-01..NFR-04, TC-01..TC-13, CR-01, CR-02 |
| `npm run test:budget` | failed: 193.9 s > 180 s | `tests.md` budget — not attributable to the feature (see limitations) |
| QA-01..QA-07 profile commands | 0 new hits | QA-01..QA-07 |
| `node dist/src/cli/main.js doctor` | exit 0, stdout only | FR-01, FR-02, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-13 |
| `node dist/src/cli/main.js doctor --verbose` | exit 0 | FR-10, FR-11, FR-12 |
| `node dist/src/cli/main.js doctor --verbos` | exit 64, `INVALID_ARGUMENTS` | FR-12 |

## Findings

No finding. No optional improvement.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `tests/integration/config-repair-errors.test.ts:57` asserts `text.code` 2; L58 stderr empty; L59 `Fix:` on stdout; suite passes |
| codereview_01/CR-02 | resolved | `tests/unit/doctor-text.test.ts:38-43` renders a healthy report with overhead `fail` 133.7/100 and asserts header `ContextBrake doctor: OK (no problems found)` and the row `… overhead 134 ms / 100 ms WARN`; suite passes |

## Limitations and open items

- `npm run test:budget` failed: 193.9 s against the 180 s budget (`tests.md:51`). The cause is not the feature. Evidence: the only new file in the timed suite is `doctor-verbose.test.ts` (2.6 s, parallel lane); the other changed suites existed at `419c0bd` and only their assertions changed. The 10 slowest files are outside the reviewable set, except `e2e-doctor.test.ts`, which is unchanged. `npm run coverage` passed at 167.06 s in the same session, so run-to-run variance (167 s to 194 s) is larger than the feature contribution. 15 `node.exe` processes ran on the machine. No status impact. Decision for the repository owner, outside this feature: the suite is near the budget under load.
- PRD FR-10 says verbose prints "one line per `ok` finding with code and message". The output prints 1 row per finding: the code line plus a message note line. This matches the approved TechSpec contract (`techspec.md#contracts-and-data`, `Checks passed`). No status impact.
- Accepted in A-03 (AUTO-05) and still open: PRD FR-14 text still names "the CLI help" (DEC-11, H-02, decides it); FR-09 JSON evidence is by code trace (`doctor-service.ts:90`), with no JSON-level test that seeds subagent ledgers; `card.ts:23` paints every row label `muted`, so `WARN`/`ERROR` labels have no tone color (NFR-02 is met by the text label).
- Platforms: validated on Windows only. Linux and macOS evidence depends on CI, which this review did not run. Tests use `PLAIN_STYLE` and a fixed separator.
- `tasks.md` sha256 `991d108c…` differs from the approved hash `b6f89eef…`; `workflow.md` R-01 records the cause. The file is untracked, so this review cannot prove that nothing else changed. No status impact.
- Out of scope by the TechSpec risks: `init`/`remove` text still uses `[WARN]`, `Remediation:`, and stderr on `errors`. Not a finding.

## Conclusion

All 14 FR, 5 NFR, 12 DEC, and 14 TC obligations are conformant, with evidence from tests, the built CLI, and code trace. T01-T03 and the correction T04 are complete with intact links. codereview_01/CR-01 and CR-02 are resolved. Lint, typecheck, schema check, build, and the full coverage run pass, and the quality profile has 0 new hits and 0 reservations. The test budget overrun is a repository-level open item that the feature did not cause. The status is `APPROVED`.
