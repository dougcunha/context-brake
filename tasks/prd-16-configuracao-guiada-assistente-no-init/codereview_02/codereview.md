# Code review report — Interactive configuration assistant in init (prd-16), re-review

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `b216aba..current worktree` (uncommitted tracked changes plus untracked files; the foreign untracked `.agents/skills/chat-clean/` and `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` are outside the feature and were not reviewed)
- Previous review: `tasks/prd-16-configuracao-guiada-assistente-no-init/codereview_01/codereview.md` (REJECTED for CR-01); corrections folder `codereview_01/done/task_01.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md` | read; sha256 `e4eceeca…26975` matches the checkpoint |
| TechSpec | `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md` | read; sha256 `409bc9a3…612f1` matches the checkpoint |
| Manifest | `tasks/prd-16-configuracao-guiada-assistente-no-init/tasks.md` | read; T01..T06 `[x]`, each in `done/` with a Handoff section and no unchecked item; sha256 `645ee315…` now matches the checkpoint |
| Handoffs | `done/task_01.md` .. `done/task_06.md`, `codereview_01/done/task_01.md` | read |
| Previous report | `codereview_01/codereview.md` | read; findings compared by folder + ID, cause, and evidence |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads); `git_head` b216aba matches `HEAD`; worktree matches the listed change points |
| Implementation | the same 36 TypeScript files of codereview_01 (12 modified, new files under `src/cli/assistant/`, `src/cli/terminal.ts`, `src/cli/init-option-rules.ts`, `tests/`), plus `README.md` and `docs/research/` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Assistant on TTY streams with no flag; `--interactive` forces it; conflicts are argument errors | `src/cli/terminal.ts:16-23`, `src/cli/init-option-rules.ts:19-23`, `src/cli/commands/init.ts:84-88` | `tests/unit/terminal.test.ts`, `tests/integration/init-interactive-gate.test.ts` | conformant | Passes in the full suite |
| FR-02 | Questions in order, only applicable ones | `src/cli/assistant/assistant-questions.ts:8-24` | `tests/unit/assistant-questions*.test.ts` | conformant | Order and skip rules read and tested |
| FR-03 | Defaults and facts per question | `questions-harness.ts:11-21`, `questions-restart.ts:15-24,34-49` | `assistant-questions-state.test.ts` | conformant with a reservation | Default preselection excludes a harness detected after the first install (CR-01 below) |
| FR-04 | Invalid answers re-asked with the rule | `ask.ts:6-15`, `questions-snapshot.ts:13-43` | `assistant-questions-invalid.test.ts` | conformant | Rules reuse `mergeSnapshot` and the limit constants; a dash-leading value is now accepted and stays replayable |
| FR-05 | Deselected detected harness equals `--exclude-harness` | `questions-harness.ts:34-44` | `init-assistant-exclusion.test.ts` | conformant | Suite green |
| FR-06 | Summary and equivalent command reproduce the same plan | `assistant-session.ts:16-28`, `equivalent-command.ts`, `summary.ts`, `questions-snapshot.ts:46-48` (`valueFlag`) | `init-assistant-equivalence.test.ts` (9 scenarios incl. dash values), `equivalent-command.test.ts` | conformant | `valueFlag` returns `--flag=value` for a value starting with `-`; the token is bare under `BARE_VALUE` (`equivalent-command.ts:1`, which allows `=`) and a value with spaces is single-quoted as a whole token; the dash scenario replays to an identical tree and a replayed dry run plans no change |
| FR-07 | One confirmation; cancel writes nothing and exits like a decline; dry run | `init.ts:40-45,70-82` | `init-assistant-cancel.test.ts` | conformant | Suite green |
| FR-08 | Without the assistant `init` behaves as before | `init.ts:84-88` (null-port path) | full suite, `init-interactive-gate.test.ts` | conformant | 1379 tests pass; non-TTY run still raises `CONFIRMATION_REQUIRED` |
| FR-09 | `--max-restarts` 1..10 with its argument errors | `init-option-rules.ts:8-17`, `auto-restart-merge.ts:13-24` | `init-max-restarts-arguments.test.ts`, `init-max-restarts.test.ts` | conformant | Suite green |
| FR-10 | Probe documented; fallback handled | `terminal.ts`, `docs/research/terminal-tty.md` | gate tests | not verifiable (measurement) | Fallback tested in process; real-terminal measurement deferred and recorded "not measured" (DEC-HIL-02); accepted by the person, not a defect |
| NFR-01 | Line-based prompts, no color-only meaning, `NO_COLOR` | `prompt-port.ts`, `summary.ts` | `assistant-output.test.ts` | conformant | Readline only, no escape sequences |
| NFR-02 | `--json` never prompts; schemas unchanged | `terminal.ts:16-19`, `init-option-rules.ts:21-22` | `init-interactive-gate.test.ts`, `schemas:check` | conformant | `schemas:check` exit 0 |
| NFR-03 | In process, within budget | scripted `PromptPort` | `npm run test:budget` | conformant | 152.5 s wall under load, budget 180 s (`AGENTS.md`; PRD text 120 s overridden by DEC-HIL-02 OI-03) |
| NFR-04 | Platforms per the probe | — | — | not verifiable | Same as FR-10 |
| OBJ-01 | Same plan as equivalent flags, no argument error | session + `parseInit` re-parse | TC-10 | conformant | CR-01 (previous) exception closed |
| OBJ-02 | Printed command repeats the choice | as FR-06 | TC-10 | conformant | As FR-06 |
| OBJ-03 | Scripts, CI, JSON unchanged | `init.ts` null-port path | existing suite | conformant | |
| OBJ-04 | Restart limit configurable | as FR-09 | TC-02 | conformant | |
| OBJ-05 | Git Bash behavior known | `terminal-tty.md` (rows "not measured") | — | not verifiable | Deferred and accepted (DEC-HIL-02) |
| DEC-01..DEC-10 | Technical decisions | see TechSpec adherence | — | conformant | |
| TC-01..TC-13 | Test cases | see Verified tasks | listed tests | conformant | TC-01/TC-03 file names differ from the TechSpec (CR-03 below) |
| TC-14 | Built CLI end to end | — | — | pending | Belongs to a later QA run (known and accepted) |
| TC-15 | Real-terminal probe | — | — | not verifiable | Deferred and accepted (DEC-HIL-02) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100 lines, 30-line functions, 3 params, guard clauses) | OK | `npm run lint` exit 0; largest touched file `src/cli/commands/init.ts` 88 lines; QA-07 and QA-08 no hit |
| `javascript-typescript.md` | OK | `npm run typecheck` exit 0; no `any`; argument errors use `CliArgumentError` |
| `node.md` | OK | `prompt-port.ts` uses `node:readline/promises` only; QA-05 no hit; `dependencies:check` exit 0 |
| `tests.md` (in process, cite IDs) | OK | Scripted port; new CR-01 tests cite `FR-06`, `TC-07`, `TC-10`, `CR-01` |
| `cli-output.md` | OK | The previous partial NOT OK (a parser rejection surfacing as `UNEXPECTED_ERROR`) is closed: dash-leading answers no longer reach a parser rejection |
| `file-changes.md` | OK | The assistant writes nothing; preview and one confirmation precede the write (`init.ts:47-59`) |
| Hexagonal layout (`AGENTS.md`) | OK | QA-04 no hit; assistant lives in `src/cli/assistant/` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg ':\s*any\b\|\bas any\b\|<any>'` over the 36 diff files | 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg` per profile | 0 | OK |
| QA-03 | No empty `catch` | blocking | `rg -U` per profile | 0 | OK |
| QA-04 | `core` imports nothing from `infrastructure` or `cli` | blocking | `rg` over `src/core` diff files | 0 | OK |
| QA-05 | No `exec`, `execSync`, `shell: true` | blocking | `rg` per profile | 0 | OK |
| QA-06 | `throw new Error(` only where no dedicated class fits | reservation | `rg 'throw new Error\('` | 1 new of 1 (`tests/helpers/assistant-world.ts:43`, a test helper) | OK as reservation |
| QA-07 | 4+ parameters | reservation | `rg` per profile | 0 | OK |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' \| awk` | 0 | OK |

- Terrain baseline: applied from TechSpec (all pre-existing hits none; `init.ts` and `init-arguments.ts` absorbed by DEC-10: 88 and 77 lines)
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 4 (1 QA-06 hit plus the optional improvements CR-01, CR-02, CR-03 below)
- Suggested escalation: no trigger fired (threshold is 8+ reservations, a touched file above 200 lines, or duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 trigger rule and `--interactive` gates | YES | `terminal.ts:16-23`; `init-option-rules.ts:19-23` |
| DEC-02 `PromptPort`, readline in production, final confirmation through the port | YES | `prompt-port.ts`, `init.ts:40-45,78-80` |
| DEC-03 validation through existing rules | YES | `mergeSnapshot` and limit constants reused; the dash-leading value is accepted by the rules and made replayable by `valueFlag` without a new answer rule |
| DEC-04 order and applicability | YES | `assistant-questions.ts`, `questions-restart.ts:34-49` |
| DEC-05 answers become flags; flag only when different from the start | YES | Holds; value flags use the separate-token form, or `--flag=value` for a leading dash; harness preselection is the design point in CR-01 |
| DEC-06 shell-neutral quoting | YES | `equivalent-command.ts`; a `--flag=-x` token is bare, one with spaces is quoted whole |
| DEC-07 cancel and dry run | YES | `init.ts:70-82`, `assistant-session.ts:12-14` |
| DEC-08 `--max-restarts` merge | YES | `auto-restart-merge.ts:13-24`, `installation-builder.ts:65-68` |
| DEC-09 runtime TTY fallback and probe document | YES | `terminal.ts`, `terminal-tty.md` ("not measured", accepted) |
| DEC-10 size absorption | YES | `runInit` 5 lines, `executeInit` 27 lines |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01..T06 | `done/task_01.md` .. `done/task_06.md` | COMPLETE | Handoffs present, all checkboxes marked; implementation re-read against them |
| Correction T01 (codereview_01 CR-01) | `codereview_01/done/task_01.md` | COMPLETE | `valueFlag` at `src/cli/assistant/questions-snapshot.ts:46-48`, used for `--snapshot-command` and `--resume-command` (lines 62, 64); unit test `tests/unit/assistant-questions-invalid.test.ts:34-41`; integration scenario `tests/integration/init-assistant-equivalence.test.ts:14`; file stays at 72 lines, no function above 30 lines |

## Executed validations

- Profile and scope: Node CLI, in-process tests; Windows 11, Node 24.20.0. Linux, macOS, and real PowerShell 7, Windows PowerShell 5.1, and Git Bash terminals not driven.
- Validated state: HEAD `b216aba` plus the uncommitted worktree as found; no source changed during the review.
- Reused evidence: none; every command below was run in this session.
- Manual acceptance: TC-15 deferred by the person (DEC-HIL-02); TC-14 reserved for QA.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | code-standards, QA-02 |
| `npm run typecheck` | passed (exit 0) | javascript-typescript |
| `npm run schemas:check` | passed (exit 0) | NFR-02 |
| `npm run dependencies:check` | passed (exit 0) | node.md dependencies |
| `npm run test:budget` | passed (exit 0): full `npm test` 152.5 s wall, budget 180 s | NFR-03, FR-01..FR-09, TC-01..TC-13 |
| `npm run coverage` (first full run) | failed: 1 of 1379 tests, `tests/integration/node-process-runner.test.ts` "stops descendants when the parent times out" (timing-sensitive; file and `src/infrastructure/` untouched by the feature) | see limitations |
| `npm test -- tests/integration/node-process-runner.test.ts` | passed (9 of 9) | confirms the failure was load-related |
| `npm run coverage` (second full run) | passed (exit 0): 247 files, 1379 tests, 94.58 % lines, 196 s wall under machine load | FR-01..FR-09, NFR-01..03, TC-01..TC-13 |
| Quality profile commands QA-01..QA-08 | no blocking hit; 1 QA-06 reservation hit | quality profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium (optional improvement) | FR-03, US-02, DEC-03, DEC-05 | `src/cli/assistant/questions-harness.ts:12-15` preselects only `config.activeHarnesses` when non-empty; `questions-harness.ts:40-41` turns every detected, unselected harness into `--exclude-harness` | Accepting every default persistently excludes a harness detected after the first install, while `init --yes` would add it. The exclusion is visible in the summary and plan; TechSpec DEC-03 specifies this preselection, so it is a design gap, not a deviation | Preselect the union of active and detected, non-excluded harnesses, or mark the detected, unmarked harness as "will be excluded". Decide at HIL 3 (known and left open by the person) |
| CR-02 | Low (optional improvement) | FR-01, UX | `src/cli/assistant/assistant-session.ts:24-28` keeps only `--dry-run` from the typed arguments | `init --interactive --harness x` silently ignores `--harness`; a no-flag printed command (`context-brake init`) restarts the assistant on a terminal. Documented in the README | Print one line naming the ignored flags, or reject typed configuration flags with `--interactive`; point the printed command at `--yes` when its flag list is empty. Decide at HIL 3 (known and left open by the person) |
| CR-03 | Low | Traceability | `techspec.md` TC-01 and TC-03 name `tests/unit/auto-restart-merge.test.ts` and `tests/unit/init-arguments.test.ts`; the cases live in `tests/unit/init-max-restarts-arguments.test.ts` | File-name traceability is off; the content is covered | Align the TechSpec test table or note the files in the session that owns the TechSpec |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 (Medium, FR-06/OBJ-01/OBJ-02: dash-leading command or resume value gives an unreplayable command and `UNEXPECTED_ERROR`) | resolved | `valueFlag` (`questions-snapshot.ts:46-48`) emits `--snapshot-command=-x` / `--resume-command=-y`; `parseInit` accepts them (unit test line 38), the printed command is `context-brake init --harness claude-code --snapshot-command=-x --resume-command=-y` (line 39), and the integration scenario replays to a byte-equal tree with a no-change dry run. Both suites green |
| codereview_01/CR-02 (harness preselection) | persistent | Same cause and evidence as CR-01 here; unchanged by design, deferred to HIL 3 |
| codereview_01/CR-03 (typed flags dropped with `--interactive`) | persistent | Same cause and evidence as CR-02 here; unchanged by design, deferred to HIL 3 |
| codereview_01/CR-04 (tasks.md hash vs checkpoint; TC file names) | partly resolved | The checkpoint `approved_sources` hash for `tasks.md` (`645ee315…`) now equals the file's sha256; the TC-01/TC-03 file-name mismatch remains as CR-03 here |

## Limitations and open items

- FR-10 measurement, TC-15, OBJ-05, and the real-terminal part of NFR-04 are "not measured" by the person's decision (DEC-HIL-02); accepted, to be listed as open limitations at acceptance.
- TC-14 (built CLI) was not run; it belongs to the QA stage.
- The first `npm run coverage` run in this review failed on one timing-sensitive process-termination test unrelated to the feature (`node-process-runner.test.ts`, untouched); it passed alone and in the second full run and in `test:budget`. Wall times (152 to 217 s) swung with machine load, as the snapshot (L-07) also records; `test:budget` passed within 180 s.
- The production `ReadlinePromptPort` is exercised only through an in-memory stream test; Ctrl+C in a real raw-mode terminal was not driven.
- Behavior under a real TTY for tests that call `dispatchCommand` or `main` without a `terminal` override was not exercised; the paths read pass `--yes` or flags.
- A value with an embedded double quote under Windows PowerShell 5.1 native-argument handling is not verified (manual NFR-04 item). The `--flag=value` form for dash-leading values was verified through `parseInit` and the shell-words test helper, not in a real PowerShell or POSIX shell.
- `tasks.md` and `techspec.md` are untracked, so a diff against approved content cannot be made; only the sha256 comparison with the checkpoint was done (both match).
- The `/usr/bin/time` wrapper used in the first gate script is not installed in this environment; the coverage run was repeated without it.

## Conclusion

The previous blocking finding is resolved: a snapshot or resume answer that starts with a dash now yields a replayable `--flag=value` token, the printed command reproduces the plan, and the new unit and integration cases pass. Lint, typecheck, schemas, dependencies, the 180 s budget, and the full suite with coverage (1379 tests, 94.58 % lines) are green, with one unrelated load-sensitive test failing once and passing on rerun. No blocking quality-profile hit exists, and the checkpoint hash of `tasks.md` now matches. What remains are optional improvements (the harness preselection default, silently dropped typed flags with `--interactive`, the TechSpec test-file names) and one QA-06 reservation hit in a test helper, plus the accepted deferrals (FR-10 measurement, TC-15, OBJ-05) and TC-14 for the QA run. Status: APPROVED WITH RESERVATIONS.
