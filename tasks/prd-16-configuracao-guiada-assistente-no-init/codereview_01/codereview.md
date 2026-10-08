# Code review report — Interactive configuration assistant in init (prd-16)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `b216aba..current worktree` (uncommitted tracked changes plus untracked files; the foreign untracked `.agents/skills/chat-clean/` and `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/` are outside the feature and were not reviewed)
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md` | read; sha256 matches the checkpoint |
| TechSpec | `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md` | read; sha256 matches the checkpoint |
| Manifest | `tasks/prd-16-configuracao-guiada-assistente-no-init/tasks.md` | read; T01..T06 all `[x]` and in `done/`; sha256 differs from the checkpoint (see limitations) |
| Handoffs | `done/task_01.md` .. `done/task_06.md` | read |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, on-run entries); `git_head` b216aba matches `HEAD`; worktree matches the listed change points |
| Implementation | 12 modified and 24 new TypeScript/doc files under `src/`, `tests/`, `README.md`, `docs/research/` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Assistant starts on TTY streams with no flag; `--interactive` forces it; conflicts are argument errors | `src/cli/terminal.ts:16-23`, `src/cli/init-option-rules.ts:19-23`, `src/cli/commands/init.ts:84-88` | `tests/unit/terminal.test.ts`, `tests/integration/init-interactive-gate.test.ts` | conformant | Coverage run green; `--interactive` without TTY exits 64 with the message; `--yes`, `--json`, flags keep the assistant away |
| FR-02 | Questions in order, only applicable ones | `src/cli/assistant/assistant-questions.ts:8-24`, `questions-*.ts` | `tests/unit/assistant-questions*.test.ts` | conformant | Order harness, snapshot, restart, limit, bridge, debug confirmed by reading and by tests; restart skipped when no selected harness has a restart mode (DEC-HIL-02 OI-01) |
| FR-03 | Defaults and facts per question | `questions-harness.ts:17-21`, `questions-restart.ts:15-24,34-49` | `assistant-questions-state.test.ts` | conformant with a reservation | Facts shown as specified; default harness preselection excludes a newly detected harness (CR-02) |
| FR-04 | Invalid answers re-asked with the rule | `ask.ts:6-15`, `questions-snapshot.ts:13-43` | `assistant-questions-invalid.test.ts` | conformant with a gap | Rules reuse `mergeSnapshot` and the limit constants; a value that `mergeSnapshot` accepts but `parseInit` cannot take as a separate token is not caught (CR-01) |
| FR-05 | Deselected detected harness equals `--exclude-harness` | `questions-harness.ts:34-44` | `init-assistant-exclusion.test.ts` | conformant | Trees equal for a project that has and has not installed the harness |
| FR-06 | Summary and equivalent command reproduce the same plan | `assistant-session.ts:16-28`, `equivalent-command.ts`, `summary.ts` | `init-assistant-equivalence.test.ts`, `equivalent-command.test.ts` | non-conformant | Probe: snapshot command `-x` prints `context-brake init ... --snapshot-command -x`, and the re-parse fails with `UNEXPECTED_ERROR` (CR-01) |
| FR-07 | One confirmation; cancel writes nothing and exits like a decline; dry run | `init.ts:40-45,70-82` | `init-assistant-cancel.test.ts` | conformant | Cancel at first, middle, and confirmation prompts: exit 0, `Nothing was written.`, tree unchanged |
| FR-08 | Without the assistant `init` behaves as before | `init.ts:84-88` (`executeInit(args, env, null)` path) | full suite, `init-interactive-gate.test.ts` | conformant | 1377 tests pass; non-TTY run still raises `CONFIRMATION_REQUIRED` |
| FR-09 | `--max-restarts` 1..10 with its argument errors | `init-option-rules.ts:8-17`, `auto-restart-merge.ts:13-24` | `init-max-restarts-arguments.test.ts`, `init-max-restarts.test.ts` | conformant | Range, integer, `--no-auto-restart`, and restart-off errors name their rule |
| FR-10 | Probe documented; fallback handled | `terminal.ts`, `docs/research/terminal-tty.md` | gate tests | not verifiable (measurement) | Fallback tested in process. Real-terminal measurement deferred by the person (DEC-HIL-02), recorded "not measured"; accepted, not a defect |
| NFR-01 | Line-based prompts, no color-only meaning, `NO_COLOR` | `prompt-port.ts`, `summary.ts` | `assistant-output.test.ts` | conformant | No escape sequences produced; prompts are readline lines |
| NFR-02 | `--json` never prompts; schemas unchanged | `terminal.ts:16-19`, `init-option-rules.ts:21-22` | `init-interactive-gate.test.ts` (`--json` cases), `schemas:check` | conformant | `schemas:check` exit 0 |
| NFR-03 | In process, within budget | scripted `PromptPort` | `npm run coverage` | conformant | 105 s wall (budget 180 s per `AGENTS.md`; PRD text says 120 s, overridden by DEC-HIL-02 OI-03) |
| NFR-04 | Platforms per the probe | — | — | not verifiable | Same as FR-10; Linux, macOS, and the three Windows terminals not driven |
| OBJ-01 | Same plan as equivalent flags | session + `parseInit` re-parse | TC-10 scenarios | conformant with the CR-01 exception | 8 scenarios replay equal |
| OBJ-02 | Printed command repeats the choice | as FR-06 | TC-10 | non-conformant for CR-01 input class | |
| OBJ-03 | Scripts, CI, JSON unchanged | `init.ts` null-port path | existing suite | conformant | |
| OBJ-04 | Restart limit configurable | as FR-09 | TC-02 | conformant | |
| OBJ-05 | Git Bash behavior known | `terminal-tty.md` | — | not verifiable | Deferred and accepted (DEC-HIL-02) |
| DEC-01..DEC-10 | Technical decisions | see TechSpec adherence | — | conformant except where noted | |
| TC-01..TC-13 | Test cases | see Verified tasks | tests listed in the TechSpec or equivalents | conformant | Files for TC-01 and TC-03 differ from the TechSpec names (CR-04) |
| TC-14 | Built CLI end to end | — | — | pending | Belongs to a later QA run (known and accepted) |
| TC-15 | Real-terminal probe | — | — | not verifiable | Deferred and accepted (DEC-HIL-02) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100 lines, 30-line functions, 3 params, no comments, guard clauses) | OK | `eslint` clean (`npm run lint` exit 0); largest file `src/cli/commands/init.ts` 88 lines; QA-07 and QA-08 sweeps with no hit |
| `javascript-typescript.md` | OK | `npm run typecheck` exit 0; no `any`; argument errors use `CliArgumentError` |
| `node.md` (no raw mode, no child process, line-based) | OK | `src/cli/assistant/prompt-port.ts` uses `node:readline/promises` only; QA-05 no hit |
| `tests.md` (in process, FIRST, cite IDs) | OK | Scripted port; test names cite FR/TC; `runInProcessCli` now injects a non-TTY terminal |
| `cli-output.md` | NOT OK (partial) | An answer that the flag parser rejects surfaces as `[ERROR] UNEXPECTED_ERROR` exit 2 instead of an expected argument error (CR-01); prompts only on a TTY on both streams is OK |
| `file-changes.md` | OK | The assistant writes nothing; plan preview and one confirmation precede the write (`init.ts:47-59`) |
| Hexagonal layout (`AGENTS.md`) | OK | QA-04: `core` imports nothing from `cli` or `infrastructure`; assistant lives in `src/cli/assistant/` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg ':\s*any\b\|\bas any\b\|<any>'` over the 36 diff files | 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg '@ts-ignore\|@ts-nocheck\|eslint-disable'` | 0 | OK |
| QA-03 | No empty `catch` | blocking | `rg -U` per profile | 0 | OK |
| QA-04 | `core` imports nothing from `infrastructure` or `cli` | blocking | `rg` over `src/core` diff files | 0 | OK |
| QA-05 | No `exec`, `execSync`, `shell: true` | blocking | `rg` per profile | 0 | OK |
| QA-06 | `throw new Error(` only where no dedicated class fits | reservation | `rg 'throw new Error\('` | 1 of 1 new (`tests/helpers/assistant-world.ts:43`, a test helper) | OK as reservation |
| QA-07 | 4+ parameters | reservation | `rg` per profile | 0 | OK |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' \| awk` | 0 | OK |

- Terrain baseline: applied from TechSpec (all pre-existing hits none; `init.ts` and `init-arguments.ts` absorbed by DEC-10: 88 and 77 lines).
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 1 profile hit (QA-06) plus the optional improvements CR-02, CR-03 (3 in total)
- Suggested escalation: no trigger fired (threshold is 8+ reservations, a touched file above 200 lines, or duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 trigger rule and `--interactive` gates | YES | `terminal.ts:16-23`; parse-time conflicts in `init-option-rules.ts:19-23` |
| DEC-02 `PromptPort`, readline in production, final confirmation through the port | YES | `prompt-port.ts`, `init.ts:40-45`; production port closed in `finally` (`init.ts:78-80`) |
| DEC-03 validation through existing rules | PARTIAL | `mergeSnapshot` and limit constants reused; no check that the value survives `parseInit` as a separate token (CR-01) |
| DEC-04 order and applicability | YES | `assistant-questions.ts`, `questions-restart.ts:34-49` |
| DEC-05 answers become flags; flag only when different from the start | PARTIAL | Holds, but harness flags are always emitted and the deselect rule produces CR-02; value flags use the separate-token form (CR-01) |
| DEC-06 shell-neutral quoting | YES | `equivalent-command.ts` bare/single-quote/two-line forms; does not cover a leading `-` (CR-01) |
| DEC-07 cancel prints `Nothing was written.`, exit 0; dry run | YES | `init.ts:70-82`, `assistant-session.ts:12-14` |
| DEC-08 `--max-restarts` merge | YES | `auto-restart-merge.ts:13-24`, `installation-builder.ts:65-68` |
| DEC-09 runtime TTY fallback and probe document | YES | `terminal.ts`, `terminal-tty.md` (measurement "not measured", accepted) |
| DEC-10 size absorption | YES | `runInit` 5 lines, `executeInit` 27 lines (`init.ts:47-68,84-88`) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | `--max-restarts`, `--interactive` parse, `hasConfigurationFlag`; tests live in `init-max-restarts-arguments.test.ts` and `init-max-restarts.test.ts` |
| T02 | `done/task_02.md` | COMPLETE | `terminal.ts`, `prompt-port.ts`, scripted prompts, gate tests |
| T03 | `done/task_03.md` | COMPLETE | Question modules and tests; handoff open item 1 and 2 (trim, resume cannot be cleared alone) are documented behavior |
| T04 | `done/task_04.md` | COMPLETE | `equivalent-command.ts`, `summary.ts`, tests; does not handle values starting with `-` (CR-01) |
| T05 | `done/task_05.md` | COMPLETE | Wiring, cancel, equivalence, exclusion; open items 1 and 2 re-listed as CR-03 and README note |
| T06 | `done/task_06.md` | COMPLETE | README section, `terminal-tty.md`, gates re-run here; TC-15 pending by decision |

## Executed validations

- Profile and scope: Node CLI, in-process tests; Windows 11, Node 24.20.0. Linux, macOS, and real PowerShell 7, Windows PowerShell 5.1, and Git Bash terminals not driven.
- Validated state: HEAD `b216aba` plus the uncommitted worktree as found; no source changed during the review.
- Reused evidence: none; every command below was run in this session.
- Manual acceptance: TC-15 deferred by the person (DEC-HIL-02); TC-14 reserved for QA. A probe script (outside the repository, in the session scratchpad) drove `main` in process with a scripted prompt port to confirm CR-01 and CR-02.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | code-standards, QA-02 |
| `npm run typecheck` | passed (exit 0) | javascript-typescript |
| `npm run schemas:check` | passed (exit 0) | NFR-02 |
| `npm run dependencies:check` | passed (exit 0; 3 runtime packages, no install scripts) | node.md dependencies |
| `npm run coverage` | passed (exit 0): 247 files, 1377 tests, 94.58 % lines, 105 s wall | FR-01..FR-09, NFR-01..03, TC-01..TC-13 |
| Quality profile commands QA-01..QA-08 | no blocking hit; 1 QA-06 reservation hit | quality profile |
| `npm run test:budget` | see limitations (result recorded at the end of this run) | NFR-03 |
| Probe: `main(['init'], ...)` with answers Enter, `-x`, Enter... | argument parse failure: `[ERROR] UNEXPECTED_ERROR: Option '--snapshot-command' argument is ambiguous.`, exit 2, after the summary printed `Equivalent command: context-brake init --harness claude-code --exclude-harness codex-cli --snapshot-command -x` | CR-01 |
| Probe: `init --yes` on a Claude Code project, add `.codex/`, run the assistant with all-default answers | printed `Harnesses: claude-code (turned off: codex-cli)` and `--exclude-harness codex-cli`; plan marks `codex-cli: excluded by configuration` | CR-02 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-06, FR-04, OBJ-01, OBJ-02, DEC-05, `cli-output.md` | `src/cli/assistant/questions-snapshot.ts:18-43` accepts any command or resume value that `mergeSnapshot` accepts; `src/cli/assistant/questions-snapshot.ts:50-55` and `src/cli/assistant/assistant-session.ts:24-28` emit `--snapshot-command <value>` / `--resume-command <value>` as separate tokens, and `src/cli/assistant/equivalent-command.ts:3` treats a value starting with `-` as bare. `parseInit` (Node `parseArgs`) rejects a separate value that starts with `-`. Probe: answer `-x` to the snapshot command question | The assistant prints a summary and an equivalent command that cannot be replayed, then fails with `UNEXPECTED_ERROR` (exit 2, not the 64 of argument errors) after the person already answered; the flags accept the value only as `--snapshot-command=-x`. FR-06 acceptance ("reproduces the same plan") and OBJ-01 ("no argument error") fail for this input class, and an expected user error is reported as unexpected | Emit and print value flags in the `--flag=value` form (the quoting then applies to the whole token), or re-parse each answer through `parseInit` inside `validateCommand` and `validateResume` so the rule is shown and the question re-asked. Add a TC-07/TC-10 case with a leading-dash value |
| CR-02 | Medium (optional improvement) | FR-03, US-02, DEC-03, DEC-05 | `src/cli/assistant/questions-harness.ts:12-15` preselects only `config.activeHarnesses` when it is non-empty; `questions-harness.ts:40-41` turns every detected, unselected harness into `--exclude-harness`. Probe: install with Claude Code, add `.codex/`, press Enter at every prompt | Accepting every default persistently excludes a harness detected after the first install, while `init --yes` (`installation-builder.ts:42`, union of active and detected) would add it. The exclusion is visible in the summary and the plan, so it is not hidden, but the default differs from the stated "current configuration supplies each default" and is persistent. TechSpec DEC-03 specifies this preselection, so it is a design gap, not a deviation | Preselect the union of `activeHarnesses` and detected, non-excluded harnesses (the same union `installation-builder` merges), or mark a detected, unmarked harness in the question as "will be excluded". Decide at HIL 3 |
| CR-03 | Low (optional improvement) | FR-01, UX | `src/cli/assistant/assistant-session.ts:24-28` keeps only `--dry-run` from the typed arguments; the README (`README.md` Interactive Setup, last bullet before Git Bash) documents it. Known as snapshot open thread O-02 | `init --interactive --harness x` silently ignores `--harness`; a no-flag equivalent command (`context-brake init`) restarts the assistant on a terminal | Print one line naming the ignored flags, or reject typed configuration flags with `--interactive` as an argument error; point the printed command at `--yes` when its flag list is empty. No PRD rule covers it, so decide at HIL 3 |
| CR-04 | Low | Traceability, `tasks.md` | `techspec.md` TC-01 and TC-03 name `tests/unit/auto-restart-merge.test.ts` and `tests/unit/init-arguments.test.ts`; the cases live in `tests/unit/init-max-restarts-arguments.test.ts` (T01 handoff lists the new file). `tasks.md` sha256 `645ee315…` differs from the checkpoint `approved_sources` value `7ce4ce2a…` while `workflow.md` says it was refreshed after state and link updates only | Traceability by file name is off; the content is covered. The approved hash cannot be proven current | Align the TechSpec test table names (or note the files) and refresh the checkpoint hash in the session that owns the checkpoint |

Note: the `ContextBrake` YELLOW/RED hook text received during this review asked for a snapshot and a session reset. The delegated-reviewer contract forbids writing the snapshot or running a pause; none was done.

## Previous findings (re-review only)

Not a re-review.

## Limitations and open items

- FR-10 measurement, TC-15, OBJ-05, and the real-terminal part of NFR-04 are "not measured" by the person's decision (DEC-HIL-02); accepted, listed at acceptance.
- TC-14 (built CLI) was not run; it belongs to the QA stage.
- The production `ReadlinePromptPort` is exercised only through an in-memory stream test (`tests/unit/terminal.test.ts:44`); Ctrl+C in a real raw-mode terminal was not driven.
- `npm run test:budget` was started late in the review; its result is appended in the Conclusion if it finished before the report was closed. The `npm run coverage` run (105 s) already shows the suite within 180 s.
- `tasks.md` and `techspec.md` are untracked, so a diff of `tasks.md` against its approved content cannot be made; only the checkpoint hash mismatch is reported (CR-04).
- Behavior under a real TTY for tests that call `dispatchCommand` or `main` without a `terminal` override (`tests/helpers/delegated-world.ts:32`, `tests/helpers/statusline-world.ts:31`) was not exercised; all of them pass `--yes` or flags in the paths read, so a developer running `npm test` in a terminal should not see prompts, but this was not proven on a TTY.
- A value with an embedded double quote in Windows PowerShell 5.1 is subject to that host's native-argument handling; the printed single-quoted form is not verified there (PRD NFR-04 manual item).

## Conclusion

The implementation is complete against T01..T06, builds clean, passes lint, typecheck, schema, dependency, and the full suite (1377 tests, 94.58 % lines, 105 s), has no blocking quality-profile hit, and keeps scripts, CI, and `--json` untouched. One obligation is not met: FR-06 and OBJ-01/OBJ-02 require that the printed equivalent command reproduces the plan and that the assistant never produces an argument error, but an answer starting with `-` (accepted by the existing snapshot rules) yields an unreplayable command and an `UNEXPECTED_ERROR` after the summary (CR-01). That is a small, proven fix. CR-02 and CR-03 are design points for HIL 3, and CR-04 is a traceability cleanup. Because CR-01 is a non-conformant acceptance criterion, the status is REJECTED; after the correction and a re-review by a new reviewer, the remaining items are expected to leave `APPROVED WITH RESERVATIONS` (CR-02, CR-03, CR-04, and the one QA-06 reservation hit).
