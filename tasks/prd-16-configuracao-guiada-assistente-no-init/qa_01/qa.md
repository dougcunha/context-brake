# QA report — Interactive configuration assistant in init (prd-16)

## Summary

- Status: APPROVED
- Execution: delegated QA runner
- Code state: HEAD `b216aba24e0d1ab7e0870c49b882ae51c426faed` plus the uncommitted prd-16 worktree as found (no `src/`, `tests/`, `docs/`, `README.md` or `scripts/` file is newer than the review report; `git status --porcelain` is unchanged except for the added `qa_01/` folder)
- Latest review: `codereview_02/codereview.md` (APPROVED WITH RESERVATIONS, reservations CR-01..CR-03 decided as optional improvements for HIL 3; none is a defect)
- Previous QA: — (first run)

Sources read: `prd.md`, `techspec.md`, `tasks.md` (T01..T06 done with handoffs in `done/`), `codereview_02/codereview.md`, `context-snapshot.md` loaded through the independent-stage filter (header, next step brief, open threads O-01..O-03; the author's Decisions and Learnings were not used). The snapshot header says `git_head b216aba`, which matches `HEAD`.

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0 |
| Platforms | Windows 11 Pro 10.0.26200. Shells that ran: Git Bash (MSYS bash, scoop Git 2.56.0.2), PowerShell 7.6 (`pwsh`), Windows PowerShell 5.1 (`powershell`). Not run: Linux, macOS, and real TTY sessions in any terminal (see limitations) |
| Build command | `npm run build` (exit 0; `dist/` rebuilt before the runs; `schemas:generate` and `assets:build` left the tracked tree unchanged) |
| Fixtures | `tests/fixtures/harnesses/claude-code/user-settings.json` copied to `.claude/settings.json` and `tests/fixtures/harnesses/codex-cli/user-hooks.json` copied to `.codex/hooks.json` in a fresh temporary project per scenario under `%TEMP%\cb-qa16-*` (outside the worktree). The repository has no whole-repository fixtures; these two harness fixture files are the user-owned content the runs must preserve |
| Isolation | Every child process ran with `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `CODEX_HOME`, `XDG_CONFIG_HOME` pointed at an empty temporary home and `NO_COLOR=1`; no real repository and no user-level harness configuration was touched |
| Runner scripts | `evidence/scripts/qa-run.mjs` (orchestrator) and `evidence/scripts/driver.mjs` (runs the built `dist/src/cli/main.js` `main()` in a child process with an injected TTY and scripted answers, the "in-process assistant session" of TC-14) |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 | TC-03, TC-04, TC-05, TC-14 | end-to-end (gate) plus unit/integration | PASSED | `evidence/TC14-gate/`; `npm test` green (1379 tests) |
| FR-02 | TC-06 | unit (scripted sessions); question sequence also captured on the built artifact | PASSED | `evidence/TC14-replay-*/questions-asked.jsonl`; `npm test` |
| FR-03 | TC-06 | unit; facts (support level, detected marks, restart modes, handoff/snapshot note) visible in the captured prompts | PASSED | `evidence/TC14-replay-yellow-resume-debug/questions-asked.jsonl`; `npm test` |
| FR-04 | TC-07 | unit | PASSED (unit evidence, same code state) | `npm test` |
| FR-05 | TC-09 | integration; also end to end in the `deselect-codex-restart-on` scenario (`--exclude-harness codex-cli` printed and replayed to equal bytes) | PASSED | `evidence/TC14-replay-deselect-codex-restart-on/`; `npm test` |
| FR-06 | TC-08, TC-10, TC-14 | end-to-end | PASSED | `evidence/TC14-replay-*/` (7 scenarios, bash, PowerShell 7 and Windows PowerShell 5.1) |
| FR-07 | TC-11 | end-to-end on the built artifact (cancel by end of input, assistant `--dry-run`) plus integration | PASSED | `evidence/TC14-cancel-dry-run/`; `npm test` |
| FR-08 | TC-05, TC-12, TC-14 | end-to-end (non-TTY `init` still `CONFIRMATION_REQUIRED`, `--yes` unchanged) plus suite | PASSED | `evidence/TC14-gate/`; `npm test` 1379 of 1379 |
| FR-09 | TC-01, TC-02, TC-14 | end-to-end plus unit/integration | PASSED | `evidence/TC14-max-restarts/` |
| FR-10 | TC-05, TC-15 | fallback end to end (no-TTY child process) and in process; measurement is manual | PASSED for the fallback; measurement NOT VERIFIABLE | `evidence/TC14-gate/interactive-no-tty.txt`; `docs/research/terminal-tty.md` rows "not measured" |
| NFR-01 | TC-13 | unit; the built run ran with `NO_COLOR=1` and printed plain text | PASSED (unit plus built-artifact text) | `evidence/TC14-replay-*/assisted-session.txt`; `npm test` |
| NFR-02 | TC-13 | end-to-end (`--json` runs never prompt and print JSON) plus `schemas:check` | PASSED | `evidence/TC14-gate/plain-init-json-no-yes.txt`, `evidence/TC14-replay-*/dry-run-on-assisted.txt`; `npm run schemas:check` exit 0 |
| NFR-03 | TC-12 | suite | PASSED | `npm test` 1379 tests in 111 s wall (budget 180 s per `AGENTS.md`) |
| NFR-04 | TC-15 | manual (real terminals); replay of the printed command checked in three shells | NOT VERIFIABLE for the terminals' TTY behavior; quoting PASSED in three shells | `evidence/TC14-replay-*/replay-*.txt` |
| OBJ-01 | TC-10 | end-to-end | PASSED | seven scenarios, `evidence/TC14-replay-*/` |
| OBJ-02 | TC-10, TC-14 | end-to-end | PASSED | same |
| OBJ-03 | TC-12 | suite plus built `--yes`/`--json` runs | PASSED | `npm test`; `evidence/TC14-gate/yes-still-works.txt` |
| OBJ-04 | TC-02, TC-14 | end-to-end | PASSED | `evidence/TC14-max-restarts/` |
| OBJ-05 | TC-15 | manual | NOT VERIFIABLE (deferred by the person, DEC-HIL-02) | `docs/research/terminal-tty.md` |

## End-to-end runs

All commands ran as child processes of the built CLI (`node dist/src/cli/main.js`, `stdin` a closed pipe so it is not a TTY) in a temporary fixture copy. Files in each evidence folder hold the exact command, exit code, stdout and stderr.

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-14 non-TTY gate: plain init | claude + codex copy | `init` | 2 | PASSED: `CONFIRMATION_REQUIRED`, no file written | `evidence/TC14-gate/plain-init-no-yes.txt` |
| TC-14 non-TTY gate: plain init, JSON | same | `init --json` | 2 | PASSED: JSON error document with `CONFIRMATION_REQUIRED`, tree unchanged | `evidence/TC14-gate/plain-init-json-no-yes.txt` |
| TC-14 `--interactive` without a TTY | same | `init --interactive` | 64 | PASSED: stderr carries the TechSpec DEC-09 message verbatim and names `--harness`, `--max-restarts`, `--yes`; nothing written | `evidence/TC14-gate/interactive-no-tty.txt` |
| TC-14 `--interactive --dry-run` without a TTY | same | `init --interactive --dry-run` | 64 | PASSED | `evidence/TC14-gate/interactive-no-tty-dry-run.txt` |
| TC-14 `--interactive` with `--yes` / `--json` | same | `init --interactive --yes`, `init --interactive --json` | 64, 64 | PASSED: both name the two flags; the JSON run prints a JSON error document | `evidence/TC14-gate/interactive-with-yes.txt`, `interactive-with-json.txt` |
| TC-14 `--yes` still works unattended | same | `init --yes` | 0 | PASSED: installs, no assistant summary | `evidence/TC14-gate/yes-still-works.txt` |
| TC-14 `--max-restarts` writes the value | fresh copy | `init --auto-restart --max-restarts 3 --yes`, then `init --max-restarts 5 --yes` | 0, 0 | PASSED: `autoRestart.maxConsecutiveRestarts` is 3, then 5 | `evidence/TC14-max-restarts/01-*.txt`, `02-max-5.txt`, `config-after-5.json` |
| TC-14 `--max-restarts` rejects | same copy (limit 5) | `--max-restarts` 11, 0, abc, 2.5, -1 (with `--yes`); `--json` variant; `--no-auto-restart --max-restarts 3`; restart off and no `--auto-restart` | 64 each | PASSED: message `--max-restarts must be an integer from 1 to 10.`; tree byte-identical after the rejected runs, limit still 5; restart-off case writes no config | `evidence/TC14-max-restarts/03-*`, `04-*`, `05-*` |
| TC-14 bounds | two fresh copies | `init --auto-restart --max-restarts 1 --yes`, `... 10 --yes` | 0, 0 | PASSED: 1 and 10 written | `evidence/TC14-max-restarts/06-bound-*.txt` |
| TC-14 replay: every default | fresh copy | assisted session (answers `["","","","","","y"]`), then the printed command in Git Bash | 0 | PASSED: byte-identical tree; replayed `--dry-run --json` on the assisted copy plans no change | `evidence/TC14-replay-every-default/` |
| TC-14 replay: snapshot command with a space, restart limit 3 | fresh copy | printed `context-brake init --harness claude-code --harness codex-cli --snapshot-command '/sdd snapshot' --auto-restart --max-restarts 3`, replayed with `--yes` in Git Bash, PowerShell 7, Windows PowerShell 5.1 | 0 in all three | PASSED: byte-identical to the assisted tree in all three shells; no further change | `evidence/TC14-replay-snapshot-space-restart-3/` |
| TC-14 replay: YELLOW trigger, resume command with a space, debug | fresh copy | printed command in Git Bash and PowerShell 7 | 0 | PASSED | `evidence/TC14-replay-yellow-resume-debug/` |
| TC-14 replay: dash-leading values (`--snapshot-command=-x`, `--resume-command=-y`) | fresh copy | printed command in Git Bash and PowerShell 7 | 0 | PASSED (the codereview_01 CR-01 fix holds on the built artifact) | `evidence/TC14-replay-dash-values/` |
| TC-14 replay: deselect codex-cli, restart on | fresh copy | printed `--harness claude-code --exclude-harness codex-cli --auto-restart` in Git Bash and PowerShell 7 | 0 | PASSED (FR-05) | `evidence/TC14-replay-deselect-codex-restart-on/` |
| TC-14 replay: bridge off, debug on | fresh copy | printed command in Git Bash | 0 | PASSED | `evidence/TC14-replay-bridge-off-debug-on/` |
| TC-14 replay: value with a single quote (`/it's`) | fresh copy | the two labeled printed lines: POSIX (`'/it'\''s'`) in Git Bash, PowerShell (`'/it''s'`) in PowerShell 7 and Windows PowerShell 5.1 | 0 in all three | PASSED: each family's line replays to the byte-identical tree | `evidence/TC14-replay-single-quote-value/` |
| FR-07 cancel | fresh copy | assisted session, second prompt answered with end of input | 0 | PASSED: prints `Nothing was written.`, tree unchanged | `evidence/TC14-cancel-dry-run/cancel-at-second-prompt.txt` |
| FR-07 assistant dry run | same | assisted session with all defaults plus `--dry-run` | 0 | PASSED: plan printed, tree unchanged | `evidence/TC14-cancel-dry-run/assistant-dry-run.txt` |

User-owned content check: in every replay scenario the fixture's `PreToolUse` hook in `.claude/settings.json` is preserved, and in `.codex/hooks.json` too except in the scenario that deselects codex-cli (where the file is not touched by design).

Source of the checks: `evidence/results.json` (per-scenario list of 2 to 13 named checks, all true).

Unit and integration evidence from the same code state: `npm test` exit 0 with 247 files and 1379 tests (111 s wall), `npm run lint` exit 0, `npm run typecheck` exit 0, `npm run schemas:check` exit 0, `npm run build` exit 0. `npm run coverage` was not rerun; the review recorded it (1379 tests, 94.58 % lines) on the same code.

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| TC-15 terminal probe and `init --interactive --dry-run` in Git Bash (mintty), PowerShell 7, Windows PowerShell 5.1 | nobody; deferred by the person at HIL 2 (DEC-HIL-02) | `docs/research/terminal-tty.md` rows stay "not measured"; the no-TTY fallback is covered by the child-process runs above | NOT VERIFIABLE (accepted deferral) |
| Real keyboard session of the assistant (Ctrl+C in raw mode, echo behavior in PowerShell hosts) | nobody; needs a person and a real terminal | not run | NOT VERIFIABLE |

## Findings

No `BUG-NN`. One observation, not a failure of any obligation:

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| OBS-01 | Low (observation, not a defect of this feature) | FR-06 / NFR-04 (shell-neutral printed command) | In Git Bash, with MSYS argument translation on (the default), `node dist/src/cli/main.js init --snapshot-command /sdd-snapshot --yes` | The stored command is `/sdd-snapshot` | MSYS rewrites a slash-leading argument passed to a native program, so the config stores `C:/Users/Admin/scoop/apps/git/2.56.0.2/sdd-snapshot`. It affects any typed `--snapshot-command` or `--resume-command` that starts with `/`, with or without the assistant (so the printed command inherits it); with `MSYS_NO_PATHCONV=1` the value is stored intact. The Git Bash replays in the scenarios above ran with `MSYS_NO_PATHCONV=1` for that reason | `evidence/TC14-obs-msys-pathconv/` |

## Previous findings (re-run only)

Not applicable (first QA run). For context, the review's `codereview_01/CR-01` (dash-leading values) was re-checked end to end in the `dash-values` scenario and holds.

## Limitations and open items

- FR-10 measurement, TC-15, OBJ-05, and the real-terminal part of NFR-04 are not measured (DEC-HIL-02, accepted by the person). `docs/research/terminal-tty.md` must list OBJ-05 as an open limitation at acceptance.
- The assistant was driven only through the built `main()` with an injected TTY and scripted prompts; the production `ReadlinePromptPort` on a real TTY, raw-mode Ctrl+C, and PowerShell host echo were not exercised.
- Linux and macOS were not run; Windows only, with Git Bash, PowerShell 7 and Windows PowerShell 5.1 as replay shells.
- OBS-01 (MSYS path translation of slash-leading values in Git Bash) is outside the feature's code; it means a person who pastes the printed command into default Git Bash on Windows with a `/command` value can store a rewritten path. The README or `terminal-tty.md` could note `MSYS_NO_PATHCONV=1` or a leading `//`; decide at HIL 3 or leave it.
- The runner replayed the printed command through a shell function `context-brake` that calls `node dist/src/cli/main.js`, not through an installed `context-brake` binary on `PATH`; `package:smoke` was not run.
- The review's optional improvements CR-01 (harness preselection), CR-02 (typed flags dropped with `--interactive`) and CR-03 (TechSpec test-file names) are not defects and were not rerun as findings.
- Windows `dist/` and temporary directories created by the runs sit outside the tracked tree (`dist/` is a build output); the temporary directories under `%TEMP%\cb-qa16-*` were left in place.

## Conclusion

TC-14 passes end to end on the built CLI. The non-TTY gate is unchanged (`CONFIRMATION_REQUIRED`, exit 2), `init --interactive` without a TTY exits 64 with the documented message and writes nothing, `--max-restarts` writes and bounds the limit (1 to 10) with exit 64 for every invalid use, and the printed equivalent command from seven assistant sessions replays in Git Bash, PowerShell 7 and Windows PowerShell 5.1 to the same configuration bytes, preserves user-owned hooks, and plans no further change on a second pass. The full suite (1379 tests), lint, typecheck and schema checks are green on the same code state. The only items not verified are the real-terminal measurement and keyboard session (TC-15, OBJ-05, NFR-04), deferred by the person and recorded as an accepted limitation, plus one low observation about MSYS path translation. Status: APPROVED.
