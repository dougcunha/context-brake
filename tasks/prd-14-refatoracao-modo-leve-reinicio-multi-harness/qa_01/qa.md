# QA report — prd-14-refatoracao-modo-leve-reinicio-multi-harness

## Summary

- Status: REJECTED
- Execution: delegated QA runner
- Code state: `a31e183` (HEAD) plus the uncommitted feature diff (128 `git status --porcelain` lines before and after this run; the only change is the new `qa_01/` folder; `dist/` and `coverage/` are ignored)
- Latest review: `codereview_07/codereview.md` (APPROVED WITH RESERVATIONS; reservations accepted as HIL 3 open items by DEC-HIL-06)
- Previous QA: —

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.19.0 (npm 11.17.0) |
| Platforms | Ran: Windows 11 Pro 10.0.26200, with the built CLI spawned from Node, PowerShell 7 (`pwsh`), and Git Bash. Not run: Linux and macOS (CI matrix only) |
| Build command | `npm install --ignore-scripts`; `npm run build` (exit 0) |
| Fixtures | Per scenario, a new temporary repository under the session scratchpad (outside the worktree), with `git init` and a separate `HOME`/`USERPROFILE`. Harness files were copied from `tests/fixtures/harnesses/claude-code/user-settings.json`, `codex-cli/user-hooks.json`, `cursor/user-hooks.json`, `github-copilot-cli/settings.json`, `pi/settings.json`, `oh-my-pi/config.yml`, `opencode/opencode.json`, and `antigravity-cli/user-hooks.json`. Hook payloads came from `session-start.json`, `post-tool-use.json`, `stop.json`, `agent-end-reset.json`, `session-start-new.json`, `session-stop-reset.json`, and `tool-result.json` |
| Child environment | `PATH` = Node and Git only (no harness executables); `NO_COLOR=1`; `CLAUDE_PROJECT_DIR` and `CURSOR_PROJECT_DIR` unset |
| Scenario scripts | `qa_01/evidence/scripts/` (copies of the scratch scripts; `lib.mjs` holds the fixture layout) |

Snapshot load: `context-snapshot.md` was read whole (3.7 KiB) and filtered for an independent stage: header, next step brief, open threads O-04, O-05, O-07, and O-09, and `on-run` entry L-05 (build before `runtime-in-process.test.ts`). The header was valid: `git_head` `a31e183` matches HEAD, `covers_through` T21 matches `codereview_06/done/`, and the worktree matches. No entry was suspect. The `on-edit` decisions and learnings were not used as evidence.

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 Handoff action at RED/CRITICAL with restart on and no skill; none when restart is off | TC-01 | end-to-end (built Codex PostToolUse hook) + unit | PASSED | `evidence/telemetry-action.txt` |
| FR-02 The next session starts with the instruction and the path | TC-02, TC-09, TC-10 | end-to-end (built Claude, Codex, Cursor, and Copilot SessionStart hooks; built Pi and Oh-My-Pi extensions) | PASSED | `evidence/session-start-*.txt`, `evidence/inprocess-*.txt` |
| FR-03 One delivery; archive keeps 10 | TC-02, TC-03 | end-to-end + integration | PASSED | `evidence/session-start-archive-limit.txt`, `evidence/session-start-*.txt` |
| FR-04 Fresh-handoff gate | TC-04, TC-07, TC-09 | end-to-end (built Pi and Oh-My-Pi files) + integration (Claude mod, `claude-mod-handoff.test.ts`) | PASSED | `evidence/inprocess-*.txt`, `evidence/coverage.log` |
| FR-05 Neutral core; Claude mod unchanged | TC-05, TC-06, TC-07 | unit + integration | PASSED | `evidence/coverage.log` (`restart-neutrality`, `restart-flow`, `claude-mod-*` suites green) |
| FR-06 Probe results in research with version and date | TC-08 | document check | PASSED | `docs/research/harness-integrations.md:139,158,162,179,183`; `probe/captures/{pi,omp,opencode-v2}.jsonl` |
| FR-07 Automatic restart where verified (Pi) | TC-09, TC-13 | end-to-end | PASSED | `evidence/init-auto-restart-pi.txt`, `evidence/inprocess-pi.txt` |
| FR-08 Semi-automatic elsewhere | TC-10, TC-13 | end-to-end | PASSED | `evidence/init-auto-restart-*.txt`, `evidence/codex-stop-notice.txt`, `evidence/inprocess-oh-my-pi.txt` |
| FR-09 Limit, typed-prompt reset, environment switch, non-interactive | TC-07, TC-09 | end-to-end (Pi, Oh-My-Pi) + integration (Claude mod) | PASSED | `evidence/inprocess-*.txt`, `evidence/coverage.log` |
| FR-10 `auto_restart` state and impact per harness | TC-12 | end-to-end | PASSED | `evidence/doctor-*.txt`, `evidence/init-auto-restart-*.txt` |
| FR-11 Doctor per harness: ready, not loaded, outdated, last skip; codes reused | TC-12 | end-to-end | PASSED (JSON); text output lacks the harness, see BUG-01 | `evidence/doctor-*.txt` |
| FR-12 Consistent marker detection | TC-11 | end-to-end (Codex Stop, Pi `agent_end`, Oh-My-Pi `session_stop`) + unit | PASSED | `evidence/codex-stop-notice.txt`, `evidence/inprocess-*.txt` |
| FR-13 `remove` / `--no-auto-restart` remove restart artifacts, keep and name handoffs | TC-14 | end-to-end | FAILED (artifacts and handoffs correct; `--no-auto-restart` exits 1 with an unexplained warning, BUG-02) | `evidence/remove-*.txt`, `evidence/no-auto-restart-*.txt`, `evidence/no-auto-restart-warning.txt` |
| UX: `init --auto-restart` reports the restart mode for each active harness; `doctor` shows the restart state per harness | TC-13, TC-12 | end-to-end (text, `NO_COLOR`) | FAILED (BUG-01) | `evidence/init-auto-restart-all.txt` |
| NFR-01 No clear without a passing gate; errors keep the session | TC-05, TC-09 | integration + end-to-end (skip paths) | PASSED | `evidence/coverage.log`, `evidence/inprocess-*.txt` |
| NFR-02 Linux, macOS, Windows (PowerShell, Git Bash) | — | end-to-end on Windows | PASSED on Windows; Linux and macOS NOT VERIFIABLE here | `evidence/shells.txt` |
| NFR-03 120 s budget; probes outside `npm test` | TC-15 | suite | PASSED (72.0 s) | `evidence/test-budget.log` |
| NFR-04 Handoffs under `.context-brake/`, untracked | TC-13 | end-to-end (`git status --ignored`) | PASSED | `evidence/init-auto-restart-all.txt` |
| NFR-05 Restart off installs and injects nothing | TC-01, TC-02, TC-13 | end-to-end | PASSED | `evidence/init-restart-off.txt`, `evidence/session-start-restart-off.txt`, `evidence/doctor-restart-off.txt`, `evidence/telemetry-action.txt` |
| Manual acceptance: real Pi/Oh-My-Pi session to RED; Codex `/new` | `techspec.md:122` | manual | NOT VERIFIABLE (assigned to the person at HIL 3) | — |

## End-to-end runs

Each command ran as a child process against its own fixture copy. Every command line, exit code, stdout, and stderr is in the evidence file, and per-check results are in `evidence/*-results.json`. Totals: CLI 296 checks, 2 failed; hooks 42, 0 failed; in-process 16, 0 failed.

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-13 init per harness, dry run then twice applied | each of the 6 harnesses with a restart mode, one fixture each | `init --yes --auto-restart --dry-run`; `init --yes --json --auto-restart` ×2 | 0 | PASSED: one `AUTO_RESTART_MODE` per harness with the DEC-10 text, `--json` valid against `installReportSchema`, `.context-brake/.gitignore` = `handoff.md\nhandoffs/\n` recorded in the manifest, restart file only on Pi/Oh-My-Pi (Claude mod only on Claude Code), dry run writes nothing, second run `plan.changes = []` | `evidence/init-auto-restart-<harness>.txt` |
| TC-13 harness with no restart mode | `opencode` only; `antigravity-cli` only | `init --yes --auto-restart [--json]` | 64 | PASSED: `INVALID_ARGUMENTS` (`EXIT_CODES.invalidArguments`), clear target message, nothing written | `evidence/init-auto-restart-{opencode,antigravity-cli}.txt` |
| TC-13 without Claude Code | pi + codex-cli | `init --yes --json --auto-restart` | 0 | PASSED: no Claude mod | `evidence/init-auto-restart-pi-codex.txt` |
| UX + NFR-04 all harnesses | all 8 | `init --yes --auto-restart` (text); `git status --porcelain --ignored -- .context-brake` | 0 | FAILED on the harness name in text (BUG-01); JSON modes per harness correct; Git ignores `handoff.md` and `handoffs/` | `evidence/init-auto-restart-all.txt` |
| NFR-05 restart off | all 8 | `init --yes --json` | 0 | PASSED: no restart file, ignore file, mod, `AUTO_RESTART_MODE`, or `autoRestart` | `evidence/init-restart-off.txt` |
| TC-12 doctor per harness | each of the 6 | `doctor`, `doctor --json`, after seeding v2 logs (current with `SKIP_HANDOFF_STALE`, `componentVersion 0.0.1`, and a v1 file), a pending `handoff.md`, then `init --snapshot-command /sdd-snapshot` | 1 (warnings: version floor, not loaded) | PASSED: schema valid, exit equals `report.exitCode`, declared `auto_restart` impact, `NOT_LOADED` → `READY` + `LAST_SKIP` → `OUTDATED_MOD` → v1 ignored (`NOT_LOADED`), semi-automatic `READY` with `harness`, `AUTO_RESTART_HANDOFF` for none pending, pending, and snapshot skill; Pi `READY` carries "Automatic restart: …" | `evidence/doctor-<harness>.txt` |
| FR-11 restart off | pi + codex-cli | `doctor --json` | 1 | PASSED: no `AUTO_RESTART_*` finding | `evidence/doctor-restart-off.txt` |
| TC-14 remove | each of the 6 with a pending handoff, 10 archived handoffs, a restart log | `remove --yes --dry-run`; `remove --yes` | 0 | PASSED: kept handoffs named in the dry run and the applied run (`AUTO_RESTART_HANDOFF_KEPT`), no restart artifact or `runtime/restart/`, handoff and archive intact, harness files byte-identical to the fixture | `evidence/remove-<harness>.txt` |
| TC-14 `--no-auto-restart` | same | `init --yes --no-auto-restart [--dry-run]` | 0 on five harnesses; 1 on claude-code | FAILED on claude-code (BUG-02; in this matrix only the Claude fixture had a second `runtime/` entry, `claude-statusline.json`; `no-auto-restart-warning.txt` reproduces it on pi and codex-cli with a session ledger); artifacts, handoffs, config, and telemetry integration correct on all six | `evidence/no-auto-restart-<harness>.txt`, `evidence/no-auto-restart-warning.txt` |
| TC-02/TC-10 session start | claude-code (`startup`, `clear`, `compact`), codex-cli (`startup`, `clear`, `compact`), cursor (`sessionStart`), github-copilot-cli (`source: new`) | installed `.<h>/hooks/context-brake.mjs <SessionStart>` with stdin payload | 0 | PASSED: the first start injects `[ContextBrake resume v1] Read ".context-brake/handoffs/<UTC>.md" …`, the file moved with its content, a second start injects nothing, `compact` neither claims nor injects | `evidence/session-start-<harness>.txt` |
| FR-03 archive limit | claude-code with 10 archived files | `SessionStart clear` ×2 | 0 | PASSED: 10 files after each claim, the delivered file kept, the oldest pruned | `evidence/session-start-archive-limit.txt` |
| NFR-05 session start, restart off | claude-code, codex-cli | `SessionStart clear` | 0 | PASSED: no resume text; `handoff.md` stays pending | `evidence/session-start-restart-off.txt` |
| TC-01 telemetry | codex-cli, turn and window limits lowered | `.codex/hooks/context-brake.mjs PostToolUse` ×7 per mode | 0 | PASSED: handoff mode RED and CRITICAL end with `action=save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]`; YELLOW generic; restart off has neither path nor marker; snapshot mode names `/sdd-snapshot` | `evidence/telemetry-action.txt` |
| TC-11 / DEC-18 Codex Stop | codex-cli, restart on and off | `.codex/hooks/context-brake.mjs Stop` with the marker alone, on its own last line, at the end of a line, and mid-reply | 0 | PASSED: the first three fire the notice and the mid-reply case does not; restart on adds "Run /new to start a new session; it resumes by itself.", restart off keeps the old text | `evidence/codex-stop-notice.txt` |
| TC-09 Pi built files | pi, after `init --auto-restart` | `node inproc-driver.mjs <fixture> pi <scenario>` loads the installed `.pi/extensions/context-brake.js` and `context-brake-restart.js` with a fake host | 0 | PASSED: fresh handoff → `/context-brake-restart` dispatched, one seed, `RESTARTED`, new session's `before_agent_start` returns the resume text with the archived path; stale → `SKIP_HANDOFF_STALE`; missing → `SKIP_HANDOFF_MISSING`; `CONTEXT_BRAKE_AUTO_RESTART=0` → `SKIP_DISABLED_ENV`; `mode: print` → `SKIP_NON_INTERACTIVE`; limit 2 → `PAUSED_LOOP_GUARD`, then a typed prompt resets it | `evidence/inprocess-pi.txt` |
| DEC-19 Oh-My-Pi built files | oh-my-pi | same driver with `session_stop` and `session_switch` | 0 | PASSED: same matrix; the editor is prefilled with `/context-brake-restart`, one command run seeds once, `session_switch` delivers the resume text. The command's own `input` does not reset the guard; a typed prompt does | `evidence/inprocess-oh-my-pi.txt` |
| NFR-02 shells | pi + codex-cli; pi | Git Bash `bash -c "node …/main.js init --yes --auto-restart"`, then `remove --yes`; `pwsh` `& node …/main.js init …`, `remove …` | 0 | PASSED in Git Bash and PowerShell 7. A Windows PowerShell 5.1 spawn from this QA harness printed nothing (exit 0) and is treated as a harness quoting problem: `tests/integration/cli-shells.test.ts` covers PowerShell and passed in coverage | `evidence/shells.txt` |
| Suite | — | `npm run coverage`; `npm run test:budget`; `npm run lint`; `npm run typecheck`; `npm run schemas:check` | 0 each | PASSED: 218 files, 1169 tests, 94.04% statements and lines, 90.15% branches; budget 72.0 s wall (limit 120 s) | `evidence/coverage.log`, `evidence/test-budget.log`, `evidence/{lint,typecheck,schemas-check}.log` |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| Real Pi session to RED with restart on and no snapshot skill: handoff written, new session opens by itself, resume instruction received (`techspec.md:122`) | — | Needs the person's Pi account and an interactive terminal; the TechSpec assigns it to the person at HIL 3 | NOT VERIFIABLE |
| Real Oh-My-Pi session: prefilled `/context-brake-restart`, one Enter, resumed session | — | Same | NOT VERIFIABLE |
| Real Codex CLI session: `/new` notice, then the resumed session | — | Same | NOT VERIFIABLE |

## Findings

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-01 | Low | PRD User experience ("`init --auto-restart` reports, for each active harness, whether restart will be automatic or semi-automatic and why"; "`doctor` shows the restart state per harness"); FR-11 in text output; `cli-output.md` (the human output carries the same findings as `--json`) | Fixture with two or more restart harnesses (`scripts/cli-scenarios.mjs`, scenario `init-all`): `NO_COLOR=1 context-brake init --yes --auto-restart`, then `context-brake doctor` | Each `AUTO_RESTART_MODE` and `AUTO_RESTART_READY` text line says which harness it belongs to, as `VERSION_FLOOR_UNVERIFIED` and `AUTO_RESTART_NOT_LOADED` already do in their messages | Eight identical-looking lines such as `[OK] AUTO_RESTART_MODE: Restart is semi-automatic on this harness.`, and three `[OK] AUTO_RESTART_READY: Semi-automatic restart is ready on this harness.` lines in doctor. Only `--json` carries `harness`. `renderFinding` (`src/cli/output/text.ts:5-11`, unchanged since `a31e183`) prints no harness, and the new messages say "on this harness". Suspected area: the messages built for `AUTO_RESTART_MODE` (init) and the semi-automatic `AUTO_RESTART_READY` (doctor), or `renderFinding` | `evidence/init-auto-restart-all.txt` (init text, and the last section: `doctor` text on the all-harness fixture showing three identical `AUTO_RESTART_READY` lines; script `scripts/doctor-all.mjs`) |
| BUG-02 | Medium: it fires in every project that has run a hook, because `runtime/sessions/` then exists, and exit codes are contract under `cli-output.md` | FR-13 / DEC-14 (`init --no-auto-restart` removes the restart logs); `cli-output.md` exit codes (warnings only for real warnings; a WARN status says why) | `scripts/probe-warn3.mjs`: `init --yes --auto-restart`; write `.context-brake/runtime/restart/<h>/s1.json` (as any session that loaded restart does); keep another entry under `.context-brake/runtime/` (Claude Code's own `claude-statusline.json`, or any session ledger under `runtime/sessions/`); `init --yes --json --no-auto-restart` | Exit 0, status `success`: the restart artifacts are gone and everything left under `runtime/` is ContextBrake's own state | Exit 1, status `warnings`, outcome `{"path":".context-brake/runtime","status":"skipped","detail":"Directory is not empty: 1 remaining entry ContextBrake did not delete."}`. The text output shows `[WARN] ContextBrake init (applied)` with no warning line. This reproduces on claude-code, pi, and codex-cli whenever `runtime/` holds anything besides `restart/`, which is the normal state of a project that has run hooks. With `runtime/` holding only `restart/`, the exit is 0. Suspected area: the T16 deletion of `runtime/restart/` logs in the `--no-auto-restart` plan, which prunes the parent `.context-brake/runtime` directory; `tests/integration/init-auto-restart.test.ts` "deletes the restart logs and leaves other runtime state" does not assert the exit code or status | `evidence/no-auto-restart-warning.txt`, `evidence/no-auto-restart-claude-code.txt` |

Observations that are not findings (open items for HIL 3):

- The `init` config preview still reads "no snapshot command, so only zone headers will be injected (trigger: RED); turn on the automatic restart for interactive Claude Code" in handoff mode on every harness (`src/core/services/installation-builder.ts:13`). Restart now applies to all harnesses, and handoff mode injects the handoff action. FR-05's criterion covers contracts, notices, and the log schema, not this preview text. Evidence: `evidence/init-auto-restart-*.txt`.
- The integration rows in `doctor` text show no `auto_restart` line for Pi, which declares `supported` without an impact. The Pi `AUTO_RESTART_READY` finding and the init `AUTO_RESTART_MODE` finding carry "Automatic restart: a valid reset signal opens a new session by itself." (DEC-10).
- In this fixture-only environment `doctor` exits 1 everywhere because of `VERSION_FLOOR_UNVERIFIED` and missing executables. This is pre-existing and outside prd-14.

## Previous findings (re-run only)

Not applicable: this is the first QA run.

## Limitations and open items

- Manual acceptance (real Pi, Oh-My-Pi, and Codex sessions) is NOT VERIFIABLE here. `techspec.md:122` assigns it to the person at HIL 3. It does not block this report, but it stays open for HIL 3.
- NFR-02: only Windows ran (Node spawn, PowerShell 7, Git Bash). Linux and macOS depend on the CI matrix. Windows PowerShell 5.1 spawned from the QA script printed no output; the in-suite `cli-shells.test.ts` covers PowerShell and passed.
- The Claude Code mod (FR-04, FR-05, FR-09 on Claude) was not driven end to end: it needs a real Claude Code mod host. It is proven by the simulated-host integration suites (`claude-mod-*.test.ts`) in the coverage run on this code state.
- OpenCode and Antigravity have no restart mode by DEC-HIL-04 and DEC-HIL-02. Their only checks were the target error and the "No restart" capability text. The OpenCode 2.x load failure is pre-existing (O-07).
- The Pi and Oh-My-Pi drivers stand in for the harness host. They call the installed, built extension files through the API shape the probe captured; they do not prove host behavior beyond those captures.
- What `workflow.md` should record (this runner does not edit it): qa_01 REJECTED with BUG-01 (Low, harness missing from the `AUTO_RESTART_MODE`/`READY` text lines) and BUG-02 (Medium, `init --no-auto-restart` exits 1 with an unexplained warning when `runtime/` holds other ContextBrake state); NFR-03 measured at 72.0 s; manual acceptance pending at HIL 3; preview-text observation for HIL 3.
- Scratch fixtures and logs stay in the session scratchpad (`qa/runs/`), outside the repository. Besides `qa_01/`, the commands changed only `dist/` and `coverage/` (both ignored); `git status --porcelain` differs from the starting state only by `?? tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/qa_01/`.

## Conclusion

The feature behaves as specified on the paths that matter most, and all of them were run end to end against the built CLI, the built hooks, and the built in-process files:

- Handoff-mode telemetry asks for the handoff and the marker, and only in handoff mode.
- A pending handoff is claimed once, archived with at most 10 files kept, and injected at the next session start on Claude Code, Codex, Cursor, Copilot, Pi, and Oh-My-Pi.
- The restart gates, guards, switches, and DEC-19 prefill work in the installed Pi and Oh-My-Pi files.
- Marker detection is consistent, and the `/new` notice names the command.
- `doctor` reports the restart state per harness in JSON.
- `remove` keeps and names the handoffs and leaves foreign content byte-identical.
- The suite passes with 1169 tests and 94.04% line coverage, within the 72.0 s budget run.

Two defects remain in the CLI output:

- BUG-01 (Low): the per-harness restart findings do not name their harness in text, which defeats the PRD's per-harness report for anyone not using `--json`.
- BUG-02 (Medium): `init --no-auto-restart` in a normally used project exits 1 with a WARN header and no visible cause.

Each is a failed observable result, so the status is REJECTED. BUG-02 alone is enough for REJECTED, so the status holds even if HIL 3 reclassifies BUG-01 as a UX note. Both look like small corrections for `sdd-plan-corrections`. Manual acceptance stays pending at HIL 3 under `techspec.md:122`, whatever the outcome of the correction round.
