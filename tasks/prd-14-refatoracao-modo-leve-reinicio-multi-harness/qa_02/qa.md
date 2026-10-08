# QA report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: APPROVED
- Execution: delegated QA runner
- Code state: `a31e1833d195a02614d4e64f8ccc29199b1df83d` (HEAD) plus the uncommitted feature diff with T10-T24. `git status --porcelain` had 133 lines at the start. At the end it differs only by `?? tasks/prd-14-…/qa_02/` and `?? .agents/skills/chat-clean/`, which this run did not create (see limitations). `dist/` and `coverage/` are ignored
- Latest review: `codereview_09/codereview.md` (APPROVED WITH RESERVATIONS, no findings; every reservation decided by DEC-HIL-06 and DEC-HIL-07)
- Previous QA: `qa_01/qa.md` (REJECTED: BUG-01, BUG-02). Its corrections are in `qa_01/done/task_22.md` and `task_23.md`, and a later one is in `codereview_08/done/task_24.md`

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.19.0 (npm 11.17.0) |
| Platforms | Ran on Windows 11 Pro 10.0.26200: the built CLI spawned from Node, Git Bash, and PowerShell 7.6.6 (run directly). Not run: Linux and macOS (CI matrix only). PowerShell 7 and 5.1 spawned from the Node harness printed nothing (see limitations) |
| Build command | `npm install --ignore-scripts` (exit 0); `npm run build` (exit 0, `evidence/build.log`) |
| Fixtures | Each scenario gets a new temporary repository under the session scratchpad (`qa2/runs/`, outside the worktree), with `git init` and its own `HOME`/`USERPROFILE`. Harness files are copied from `tests/fixtures/harnesses/{claude-code/user-settings.json, codex-cli/user-hooks.json, cursor/user-hooks.json, github-copilot-cli/settings.json, pi/settings.json, oh-my-pi/config.yml, opencode/opencode.json, antigravity-cli/user-hooks.json}`. Hook payloads come from the `session-start.json`, `post-tool-use.json`, `stop.json`, `agent-end-reset.json`, `session-start-new.json`, `session-stop-reset.json`, and `tool-result.json` fixtures |
| Child environment | `PATH` holds Node and Git only (no harness executables), `NO_COLOR=1` |
| Scenario scripts | `evidence/scripts/`, copied from `qa_01/evidence/scripts/` with these changes: the evidence and scratch paths now point to qa_02; `cli-scenarios.mjs` expects the T23 messages `Restart is <mode> on <harness id>.`; the per-harness text check now parses the harness id from each line (the old substring test let `pi` match inside `oh-my-pi`); the `--no-auto-restart` matrix adds a session ledger next to `runtime/restart/` and asserts that it is kept and that there is no `[WARN]`; doctor's text `READY` line is asserted; `probe-warn3.mjs` and `doctor-all.mjs` became check-based regressions for BUG-02 and BUG-01; `shells.mjs` adds `pwsh` |

Snapshot load: `context-snapshot.md` (3.6 KiB) was read whole and filtered for an independent stage, using only the header, the next step brief, open threads O-04, O-05, O-07, and O-09, and the `on-run` entry L-05 (build before `runtime-in-process.test.ts`, satisfied by `npm run build`). The header is valid: `git_head` `a31e183` matches HEAD, `covers_through` T24 matches `codereview_08/done/`, and the worktree matches the description. No entry is suspect. `Decisions` and the `on-edit` learning were not used.

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 Handoff action at RED/CRITICAL with restart on and no skill; nothing when restart is off | TC-01 | end-to-end (built Codex PostToolUse hook) + unit | PASSED | `evidence/telemetry-action.txt` |
| FR-02 The next session starts with the instruction and the path | TC-02, TC-09, TC-10 | end-to-end (built Claude, Codex, Cursor, and Copilot SessionStart hooks; built Pi and Oh-My-Pi extensions) | PASSED | `evidence/session-start-*.txt`, `evidence/inprocess-*.txt` |
| FR-03 One delivery; the archive keeps 10 | TC-02, TC-03 | end-to-end + integration | PASSED | `evidence/session-start-archive-limit.txt`, `evidence/session-start-*.txt` |
| FR-04 Fresh-handoff gate | TC-04, TC-07, TC-09 | end-to-end (built Pi and Oh-My-Pi files) + integration (Claude mod) | PASSED | `evidence/inprocess-*.txt`, `evidence/coverage.log` |
| FR-05 Neutral core; Claude mod unchanged | TC-05, TC-06, TC-07 | unit + integration | PASSED | `evidence/coverage.log` (`restart-neutrality`, `restart-flow`, and `claude-mod-*` suites green) |
| FR-06 Probe results in the research doc with version and date | TC-08 | document check | PASSED | `docs/research/harness-integrations.md:139` (OpenCode 2.0.18, 07/10/2026), `:158`, `:162` (Pi 1.0.4), `:179`, `:183` (Oh-My-Pi 18.8.1); `probe/captures/` |
| FR-07 Automatic restart where verified (Pi) | TC-09, TC-13 | end-to-end | PASSED | `evidence/init-auto-restart-pi.txt`, `evidence/inprocess-pi.txt` |
| FR-08 Semi-automatic restart elsewhere | TC-10, TC-13 | end-to-end | PASSED | `evidence/init-auto-restart-*.txt`, `evidence/codex-stop-notice.txt`, `evidence/inprocess-oh-my-pi.txt` |
| FR-09 Limit, typed-prompt reset, env switch, non-interactive | TC-07, TC-09 | end-to-end (Pi, Oh-My-Pi) + integration (Claude mod) | PASSED | `evidence/inprocess-*.txt`, `evidence/coverage.log` |
| FR-10 `auto_restart` state and impact per harness | TC-12 | end-to-end | PASSED | `evidence/doctor-*.txt`, `evidence/init-auto-restart-*.txt` |
| FR-11 Doctor per harness: ready, not loaded, outdated, last skip; codes reused | TC-12 | end-to-end (JSON and text) | PASSED | `evidence/doctor-*.txt`, `evidence/doctor-all-text.txt` |
| FR-12 Consistent marker detection | TC-11 | end-to-end (Codex Stop, Pi `agent_end`, Oh-My-Pi `session_stop`) + unit | PASSED | `evidence/codex-stop-notice.txt`, `evidence/inprocess-*.txt` |
| FR-13 `remove` and `--no-auto-restart` remove restart artifacts and keep and name handoffs | TC-14 | end-to-end | PASSED | `evidence/remove-*.txt`, `evidence/no-auto-restart-*.txt`, `evidence/no-auto-restart-warning.txt` |
| UX: `init --auto-restart` reports the mode per active harness; `doctor` shows the restart state per harness | TC-13, TC-12 | end-to-end (text, `NO_COLOR`) | PASSED | `evidence/init-auto-restart-all.txt`, `evidence/doctor-all-text.txt` |
| NFR-01 No clear without a passing gate; errors keep the session | TC-05, TC-09 | integration + end-to-end (skip paths) | PASSED | `evidence/coverage.log`, `evidence/inprocess-*.txt` |
| NFR-02 Linux, macOS, Windows (PowerShell, Git Bash) | — | end-to-end on Windows | PASSED on Windows (Git Bash, PowerShell 7, Node spawn); Linux and macOS NOT VERIFIABLE here | `evidence/shells.txt`, `evidence/shells-pwsh-direct.txt` |
| NFR-03 120 s budget; probes outside `npm test` | TC-15 | suite | PASSED (102.7 s wall) | `evidence/test-budget.log` |
| NFR-04 Handoffs under `.context-brake/` and untracked | TC-13 | end-to-end (`git status --ignored`) | PASSED | `evidence/init-auto-restart-all.txt` |
| NFR-05 Restart off installs and injects nothing | TC-01, TC-02, TC-13 | end-to-end | PASSED | `evidence/init-restart-off.txt`, `evidence/session-start-restart-off.txt`, `evidence/doctor-restart-off.txt`, `evidence/telemetry-action.txt` |
| Manual acceptance: real Pi/Oh-My-Pi session to RED; Codex `/new` | `techspec.md:122` | manual | NOT VERIFIABLE (the TechSpec assigns it to the person at HIL 3) | — |

## End-to-end runs

Each command ran as a child process against its own fixture copy. Every command line, exit code, stdout, and stderr is in its evidence file, and per-check results are in `evidence/*-results.json` and `evidence/*.log`. Totals: CLI 319 checks, 0 failed; hooks 42, 0 failed; in-process 16, 0 failed; BUG-02 regression 19, 0 failed; BUG-01 doctor regression 2, 0 failed; shells 6, of which the 2 spawned-PowerShell checks are harness failures, replaced by the direct PowerShell 7 run.

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-13 init per harness: dry run, then two applied runs | each of the 6 harnesses with a restart mode | `init --yes --auto-restart --dry-run`; `init --yes --json --auto-restart` ×2 | 0 | PASSED. One `AUTO_RESTART_MODE` per harness reads `Restart is <mode> on <harness id>.` with the DEC-10 impact. `--json` is valid against `installReportSchema`. `.context-brake/.gitignore` is `handoff.md\nhandoffs/\n` and recorded in the manifest. The restart file exists only on Pi and Oh-My-Pi (the Claude mod only on Claude Code). The dry run writes nothing, and the second run has `plan.changes = []` | `evidence/init-auto-restart-<harness>.txt` |
| TC-13 harness with no restart mode | `opencode` only; `antigravity-cli` only | `init --yes --auto-restart [--json]` | 64 | PASSED: `--auto-restart needs at least one active harness with a restart mode`, nothing written | `evidence/init-auto-restart-{opencode,antigravity-cli}.txt` |
| TC-13 without Claude Code | pi + codex-cli | `init --yes --json --auto-restart` | 0 | PASSED: no Claude mod | `evidence/init-auto-restart-pi-codex.txt` |
| UX + NFR-04, all harnesses (qa_01/BUG-01 init half) | all 8 | `init --yes --auto-restart` (text); `git status --porcelain --ignored -- .context-brake` | 0 | PASSED: 8 text lines name 8 distinct harness ids and match the JSON. Git ignores `handoff.md` and `handoffs/` | `evidence/init-auto-restart-all.txt` |
| NFR-05 restart off | all 8 | `init --yes --json` | 0 | PASSED: no restart file, ignore file, mod, `AUTO_RESTART_MODE`, or `autoRestart` | `evidence/init-restart-off.txt` |
| TC-12 doctor per harness | each of the 6 | `doctor`, `doctor --json` after seeding v2 logs (current with `SKIP_HANDOFF_STALE`, `componentVersion 0.0.1`, a v1 file), a pending `handoff.md`, then `init --snapshot-command /sdd-snapshot` | 1 (warnings: version floor and missing executables in a fixture-only PATH) | PASSED: schema valid, exit equals `report.exitCode`, declared `auto_restart` impact. The findings go `NOT_LOADED` → `READY` + `LAST_SKIP` → `OUTDATED_MOD` → v1 ignored (`NOT_LOADED`). The semi-automatic `READY` line names its harness in JSON and in text (`Semi-automatic restart is ready on <id>.`). `AUTO_RESTART_HANDOFF` is reported for no pending handoff, for a pending one, and for the snapshot skill | `evidence/doctor-<harness>.txt` |
| qa_01/BUG-01 doctor half | all 8 | `init --yes --auto-restart`; `doctor` (text) | 0 / 1 | PASSED: three `AUTO_RESTART_READY` lines name `codex-cli`, `cursor`, and `github-copilot-cli` | `evidence/doctor-all-text.txt` |
| FR-11 restart off | pi + codex-cli | `doctor --json` | 1 | PASSED: no `AUTO_RESTART_*` finding | `evidence/doctor-restart-off.txt` |
| TC-14 remove | each of the 6 with a pending handoff, 10 archived handoffs, a restart log, and a session ledger | `remove --yes --dry-run`; `remove --yes` | 0 | PASSED: the dry run and the applied run name the kept handoffs (`AUTO_RESTART_HANDOFF_KEPT`). No restart artifact or `runtime/restart/` remains. The handoff and the archive are intact, and the harness files are byte-identical to the fixture | `evidence/remove-<harness>.txt` |
| TC-14 `--no-auto-restart` (qa_01/BUG-02) | same, with a session ledger under `runtime/sessions/` | `init --yes --no-auto-restart [--dry-run]` | 0 on all six | PASSED: no `[WARN]` header. Restart artifacts and `runtime/restart/` are gone, the session ledger is kept, handoffs are kept and named, `autoRestart` is removed, and the telemetry integration stays | `evidence/no-auto-restart-<harness>.txt` |
| qa_01/BUG-02 reproduction | claude-code; pi, codex-cli, and oh-my-pi with a ledger; pi without one; pi text form | `init --yes --auto-restart`; write `runtime/restart/<h>/s1.json`; `init --yes [--json] --no-auto-restart` | 0 | PASSED: status `success`, no `skipped` outcome, `runtime/restart/` gone, other runtime entries kept, text header `[OK]` | `evidence/no-auto-restart-warning.txt` |
| TC-02/TC-10 session start | claude-code (`startup`, `clear`, `compact`), codex-cli (same), cursor (`sessionStart`), github-copilot-cli (`source: new`) | installed `.<h>/hooks/context-brake.mjs <SessionStart>` with a stdin payload | 0 | PASSED: the first start injects `[ContextBrake resume v1] Read ".context-brake/handoffs/<UTC>.md" …` and the file moves with its content. A second start injects nothing, and `compact` neither claims nor injects | `evidence/session-start-<harness>.txt` |
| FR-03 archive limit | claude-code with 10 archived files | `SessionStart clear` ×2 | 0 | PASSED: 10 files after each claim, the delivered file kept, the oldest pruned | `evidence/session-start-archive-limit.txt` |
| NFR-05 session start, restart off | claude-code, codex-cli | `SessionStart clear` | 0 | PASSED: no resume text; `handoff.md` stays pending | `evidence/session-start-restart-off.txt` |
| TC-01 telemetry | codex-cli with lowered limits | `.codex/hooks/context-brake.mjs PostToolUse` ×7 per mode | 0 | PASSED: in handoff mode, RED and CRITICAL end with `action=save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]`, and YELLOW stays generic. Restart off shows neither the path nor the marker. Snapshot mode names `/sdd-snapshot` | `evidence/telemetry-action.txt` |
| TC-11 / DEC-18 Codex Stop | codex-cli, restart on and off | `Stop` with the marker alone, on its own last line, at the end of a line, and mid-reply | 0 | PASSED: the first three fire the notice and the mid-reply case does not. With restart on, the notice adds "Run /new to start a new session; it resumes by itself." | `evidence/codex-stop-notice.txt` |
| TC-09 Pi built files | pi after `init --auto-restart` | `node inproc-driver.mjs <fixture> pi <scenario>` (installed `.pi/extensions/*.js`, fake host) | 0 | PASSED. A fresh handoff dispatches `/context-brake-restart`, seeds once, logs `RESTARTED`, and the next `before_agent_start` returns the archived path. Stale, missing, `CONTEXT_BRAKE_AUTO_RESTART=0`, and `mode: print` produce `SKIP_HANDOFF_STALE`, `SKIP_HANDOFF_MISSING`, `SKIP_DISABLED_ENV`, and `SKIP_NON_INTERACTIVE`. With limit 2, the run reaches `PAUSED_LOOP_GUARD`, then a typed prompt resets it | `evidence/inprocess-pi.txt` |
| DEC-19 Oh-My-Pi built files | oh-my-pi | same driver with `session_stop` and `session_switch` | 0 | PASSED: same matrix. The editor is prefilled with `/context-brake-restart`, one command run seeds once, and `session_switch` delivers the resume text | `evidence/inprocess-oh-my-pi.txt` |
| NFR-02 shells | pi + codex-cli | Git Bash `bash -c "node …/main.js init --yes --auto-restart"`, then `remove --yes`; PowerShell 7.6.6 `& node …\main.js init …`, `remove …` | 0 | PASSED in Git Bash and in PowerShell 7 run directly. PowerShell 7 and 5.1 spawned from the Node harness printed nothing (exit 0), which is a harness problem (see limitations) | `evidence/shells.txt`, `evidence/shells-pwsh-direct.txt` |
| Suite | — | `npm run lint`, `typecheck`, `schemas:check`, `dependencies:check`, `coverage`, then `test:budget` | 0 each | PASSED: 218 files and 1171 tests. Coverage: 94.04% statements and lines, 90.13% branches, 94.73% functions. Budget: 102.7 s wall (limit 120 s) | `evidence/{lint,typecheck,schemas-check,dependencies-check,coverage,test-budget}.log` |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| Real Pi session to RED with restart on and no snapshot skill: handoff written, new session opens by itself, resume instruction received (`techspec.md:122`) | — | Needs the person's Pi account and an interactive terminal; assigned to the person at HIL 3 | NOT VERIFIABLE |
| Real Oh-My-Pi session: prefilled `/context-brake-restart`, one Enter, resumed session | — | Same | NOT VERIFIABLE |
| Real Codex CLI session: `/new` notice, then the resumed session | — | Same | NOT VERIFIABLE |

## Findings

No findings.

Observations, not findings (open items for HIL 3):

- The `init` config preview still reads "no snapshot command, so only zone headers will be injected (trigger: RED); turn on the automatic restart for interactive Claude Code", unchanged since qa_01 (`evidence/init-auto-restart-all.txt`, "config preview summary" note). FR-05's criterion does not cover this text.
- Accepted items carried by DEC-HIL-06 and DEC-HIL-07, such as `AUTO_RESTART_LAST_SKIP` naming its harness only in the remediation line. They were not re-judged here.

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| qa_01/BUG-01 (per-harness restart lines do not name their harness in text) | resolved | `init-all`: 8 `AUTO_RESTART_MODE` text lines name 8 distinct harness ids, for example `Restart is semi-automatic on codex-cli.` (`evidence/init-auto-restart-all.txt`). Doctor text: `Semi-automatic restart is ready on <id>.` for codex-cli, cursor, and github-copilot-cli (`evidence/doctor-all-text.txt`, `evidence/doctor-<harness>.txt`) |
| qa_01/BUG-02 (`init --no-auto-restart` exits 1 with an unexplained `[WARN]` when `runtime/` holds other state) | resolved | The `probe-warn3` rerun on claude-code, pi, codex-cli, and oh-my-pi gives exit 0, status `success`, no `skipped` outcome, `runtime/restart/` gone, the ledger kept, and an `[OK]` text header (`evidence/no-auto-restart-warning.txt`). The six-harness `--no-auto-restart` matrix with a ledger all exit 0 (`evidence/no-auto-restart-<harness>.txt`) |

## Limitations and open items

- Manual acceptance (real Pi, Oh-My-Pi, and Codex sessions) is NOT VERIFIABLE here. `techspec.md:122` assigns it to the person at HIL 3. It does not block this report but stays open for HIL 3.
- NFR-02: only Windows ran. Linux and macOS depend on the CI matrix.
- PowerShell spawned from the Node QA harness (`pwsh.exe` through its WindowsApps alias, and `powershell.exe` 5.1) printed nothing with exit 0 (`evidence/shells.txt`, 2 harness check failures). PowerShell 7.6.6 run directly in this session passed `init --auto-restart` and `remove` (`evidence/shells-pwsh-direct.txt`), and `tests/integration/cli-shells.test.ts` passed in coverage. Windows PowerShell 5.1 was not run directly.
- The Claude Code mod (FR-04, FR-05, FR-09 on Claude) needs a real mod host to run end to end. The simulated-host suites (`claude-mod-*.test.ts`) prove it in the coverage run on this code state.
- The Pi and Oh-My-Pi drivers stand in for the harness host. They call the installed built files through the API shape the probe captured, and they prove nothing about host behavior beyond those captures.
- OpenCode and Antigravity have no restart mode (DEC-HIL-04, DEC-HIL-02). The only checks there were the target error and the capability text.
- The TechSpec amendments pending HIL 3 (O-04, O-09) were judged against the current text, as codereview_09 did.
- NFR-03: 102.7 s wall in the standalone budget run right after coverage. That is within the 120 s limit but up from codereview_09's 79.1 s and qa_01's 72.0 s on the same tests. Machine load is the likely cause.
- `?? .agents/skills/chat-clean/` appeared in `git status` during this run. This runner did not create it, and it is outside the feature.
- This session's ContextBrake telemetry reached RED and CRITICAL during the run and asked for `/sdd-snapshot` and a reset. The delegated contract forbids the snapshot and the session pause, so the run continued.
- What `workflow.md` should record (this runner does not edit it): qa_02 APPROVED, delegated QA runner. qa_01/BUG-01 and BUG-02 are resolved. CLI 319, hooks 42, in-process 16, and regressions 21 checks all pass. Coverage: 218 files, 1171 tests, 94.04% lines. NFR-03 measured at 102.7 s. Manual acceptance is pending at HIL 3. The preview-text observation carries to HIL 3.
- Scratch fixtures and logs stay in the session scratchpad (`qa2/runs/`). Besides `qa_02/`, the commands changed only `dist/` and `coverage/`, both ignored. An mtime sweep of the worktree also lists:
  - `package-lock.json` and `schemas/*.json`, rewritten by `npm install` and `npm run build` with content identical to HEAD (absent from `git status`);
  - two `.context-brake/runtime/sessions/claude-code/*.jsonl` ledgers written by this session's own hooks.
  
  Nothing under `qa_01/` or any other task artifact changed.

## Conclusion

Every PRD acceptance obligation that can run here was verified on this code state, against the built CLI, the built process hooks, and the built Pi and Oh-My-Pi files.

- Handoff-mode telemetry asks for the handoff and the marker, and does so only in handoff mode.
- A pending handoff is claimed once, archived with at most 10 kept, and delivered at the next session start on every `session_boot` harness.
- The restart gates, guards, and switches work in the installed Pi and Oh-My-Pi files, including the DEC-19 prefill.
- Marker detection is consistent.
- `doctor` reports the per-harness state in JSON and in text.
- `remove` and `--no-auto-restart` keep and name the handoffs, leave foreign content byte-identical, and now exit 0 with `success` when other runtime state remains.

Both qa_01 defects are resolved, and no new failure was found. The suite passes: 1171 tests, 94.04% lines, budget 102.7 s.

The status is APPROVED. The items still open are the manual real-harness sessions, which the TechSpec assigns to the person at HIL 3, and the platforms this Windows machine cannot run. qa_01 also treated both as limitations, not blocks.
