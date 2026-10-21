# QA report — prd-24-doctor-fix-command (`context-brake fix`)

## Summary

- Status: APPROVED
- Execution: delegated QA runner
- Code state: `419c0bd328b2cd209ed98846e6b50b73ef4664fd` plus the uncommitted worktree (89 `git status --porcelain` entries, the same before and after QA: `evidence/git-status-before.txt`)
- Latest review: `codereview_04/codereview.md` (APPROVED WITH RESERVATIONS; reservations decided in `workflow.md` A-08)
- Previous QA: —

## Sources

| Source | State |
| --- | --- |
| `prd.md`, `techspec.md`, `tasks.md` | read |
| `done/task_01.md` to `done/task_06.md`, `codereview_01..03/done/task_07..09.md` | 9 handoffs present, each with `Produced result` |
| `workflow.md`, `codereview_04/codereview.md` | read; review cycle closed (A-08) |
| `context-snapshot.md` | not present |

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0 (npm 11.19.0) |
| Platforms | Windows 11 Pro 10.0.26200: Git Bash and PowerShell 7 ran. Linux and macOS did not run (CI per TechSpec) |
| Build command | `npm install --ignore-scripts`, `npm run build` (exit 0, `evidence/build.log`), `npm run schemas:check` (exit 0, `evidence/schemas-check.log`) |
| Fixtures | Each scenario: new `mkdtemp` directory under `%TEMP%` with `git init`, `.claude/settings.json` copied from `tests/fixtures/harnesses/claude-code/user-settings.json` (user `PreToolUse` hook), a user `CLAUDE.md` (with a CRLF line), and a user `.gitignore`; then built `init --yes --harness claude-code` |
| Isolation | Each child process gets a temporary `HOME`, `USERPROFILE`, `CLAUDE_CONFIG_DIR`, `APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`, and `NO_COLOR=1`. `CLAUDE_*` and `CONTEXT_BRAKE_*` variables removed. stdin is a pipe (no TTY) |
| PATH kinds | `noClaude`: Node, System32, Windows, Git `ucrt64/bin` (Claude Code version unknown, bridge source). `withClaude`: adds `C:\Users\Admin\.local\bin` (real `claude --version` = `2.1.306`, mod source). Each evidence file records its PATH kind |
| Driver | `qa-driver.mjs` in the session scratchpad (outside the worktree); it validates JSON with the built zod schemas `dist/src/core/contracts/fix-report.js` and `diagnostics.js` |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 | TC-01, TC-02, TC-05 | end-to-end + unit | PASSED | `evidence/s02-doctor-json.txt`, `s06b-doctor-json.txt` (`NO_PROJECT_HARNESS` = decision), `s08-doctor-json-before.txt` (`AUTO_RESTART_OUTDATED_MOD` = automatic); `suites.log` (`fix-groups.test.ts` for the full table and TC-02) |
| FR-02 | TC-03 | end-to-end + unit | PASSED | `evidence/s02-doctor-text.txt`: `WARN (0 errors, 2 warnings, 1 fixable)`, 1 `Fix: run context-brake fix`, manual remediation kept |
| FR-03 | TC-10, TC-24 | end-to-end + integration | PASSED | `evidence/s08-*.txt`: config byte-identical, mod reinstalled with `autoRestart` kept; `s07-changed-files.txt`: only owned files changed |
| FR-04 | TC-11 | integration | PASSED | `suites.log` (`fix-interactive.test.ts`, simulated TTY). Real-terminal script: NOT VERIFIABLE (see Manual acceptance) |
| FR-05 | TC-12 | integration | PASSED | `suites.log` (`fix-interactive.test.ts`, text prompt path). `askUi` select path: no automated test (see Limitations) |
| FR-06 | TC-13 | end-to-end | PASSED | `evidence/s05-*.txt` (`--yes` keeps, `--yes --force` replaces); `s06b-*.txt` (`--yes` and `--yes --force` skip `NO_PROJECT_HARNESS`; `--harness claude-code` installs) |
| FR-07 | TC-14 | end-to-end | PASSED | `evidence/s03-fix-no-tty.txt`: exit 2, `CONFIRMATION_REQUIRED`, file hashes equal |
| FR-08 | TC-15 | end-to-end | PASSED | `evidence/s03-fix-dry-run-text.txt` (`Dry run: no file was changed.`), all fixture file hashes equal |
| FR-09 | TC-08, TC-16 | end-to-end + unit | PASSED | `evidence/s07-fix-yes-text.txt`: `FIXED ASSET_OUTDATED`, `SKIPPED ASSET_MODIFIED` (with reason), `MANUAL RUNTIME_ERRORS_RECORDED` (with remediation); `s10` gives `failed` with cause |
| FR-10 | TC-17 | end-to-end + unit | PASSED | `evidence/s08-fix-yes-text.txt`: `FIXED AUTO_RESTART_OUTDATED_MOD` with `Restart Claude Code to load the new mod.` |
| FR-11 | TC-18 | end-to-end | PASSED | `evidence/s01-*.txt`: text names `context-brake init`, JSON `stopped: not_installed`, no file created |
| FR-12 | TC-19 | end-to-end | PASSED | `evidence/s07-fix-nothing-*.txt`, `s11-fix-yes-json-again.txt`: `stopped: nothing_to_fix`, manual list printed, no change |
| FR-13 | TC-08, TC-09, TC-20, TC-25 | end-to-end | PASSED | 0: `s12-*.txt`; 1: `s07-fix-nothing-json.txt`; 2: `s10-fix-yes-json-readonly.txt` (EPERM, `failed`), `s09-fix-yes-json.txt` (TC-25); 64: `s04-*.txt` (`--json` alone, `--force` alone, unknown harness, unknown option) |
| FR-14 | TC-21, TC-22 | end-to-end | PASSED | `evidence/s03-fix-dry-run.json` parses with `fixReportSchema`, `mode: dry_run`, exit = `exitCode`; `schemas-check.log` exit 0 |
| FR-15 | TC-04 | end-to-end + unit | PASSED | `evidence/s02-doctor-json.txt` validates with `doctorReportSchema`, `schemaVersion` 1; `suites.log` (`schemas.test.ts`, document without `fix`) |
| FR-16 | TC-23 | end-to-end + review | PASSED | `evidence/help.txt` lists `context-brake fix [options]` and the `fix` command; `README.md:332` row lists `--dry-run`, `--yes` (`-y`), `--force`, `--harness <id>`, `--json`; `README.md:169` explains the groups and the `fix` field |
| NFR-01 | TC-24 | end-to-end | PASSED | `evidence/s07-*`: `CLAUDE.md` byte-identical, user `PreToolUse` hook kept, `.gitignore` user lines kept |
| NFR-02 | TC-06, TC-12, TC-13 | end-to-end + integration | PASSED | `s05`, `s07`: a modified asset changes only with `--yes --force` |
| NFR-03 | TC-14, TC-17 | end-to-end | PASSED | All text runs with `NO_COLOR=1` show text labels; errors on stderr with `[ERROR] <CODE>`; no prompt without a TTY |
| NFR-04 | — | end-to-end | PASSED (Windows); Linux and macOS NOT VERIFIABLE | Git Bash: all runs; PowerShell: `evidence/powershell-run.txt` (s03, s12). Symlinked instruction files not exercised |
| NFR-05 | TC-08 | end-to-end | PASSED | Exit codes 0, 1, 2, 64 observed; doctor exit codes unchanged (`s12-doctor-*`) |
| OBJ-01 | TC-10 | end-to-end | PASSED | `evidence/s12-*.txt`: only `ASSET_OUTDATED`; `fix --yes` exit 0; `doctor` exit 0 |
| OBJ-02 | TC-11, TC-14 | end-to-end + integration | PASSED | `s03` (no change without consent); `fix-interactive.test.ts` |
| OBJ-03 | TC-16 | end-to-end | PASSED | `s07-fix-yes-text.txt` Result card lists each open finding with group outcome and remediation |

## End-to-end runs

All runs use the built CLI `node dist/src/cli/main.js` as a child process. Per-check results: `evidence/checks-*.json`.

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| s01 FR-11 | git dir, no `.claude`, no install | `fix`; `fix --yes --json` | 2; 2 | PASSED | `evidence/s01-*.txt` |
| s02 FR-01/02/15 | installed, hook outdated | `doctor --json`; `doctor` | 1; 1 | PASSED | `evidence/s02-*.txt` |
| s03 FR-07/08/14 | installed, hook outdated | `fix`; `fix --dry-run`; `fix --dry-run --json`; `fix --force --dry-run --json` | 2; 1; 1; 1 | PASSED | `evidence/s03-*` |
| s04 FR-13 | installed | `fix --json`; `fix --force`; `fix --yes --harness nope`; `fix --bogus` | 64 each | PASSED | `evidence/s04-*.txt` |
| s05 FR-06 | installed, hook modified | `fix --yes --json`; `fix --yes --force --json` | 1; 1 | PASSED | `evidence/s05-*.txt` |
| s06 (invalid fixture) | installed, `.claude` removed, `CLAUDE.md` kept | `doctor --json`; `fix --yes ...` | 2; 1 | Not an obligation run: `CLAUDE.md` is project evidence of claude-code, so no `NO_PROJECT_HARNESS`. Replaced by s06b | `evidence/s06-*.txt` |
| s06b FR-06 | installed, `.claude`, `CLAUDE.md`, home `.claude` removed | `fix --yes --json`; `fix --yes --force --json`; `fix --yes --force --harness claude-code --json` | 2; 2; 1 | PASSED | `evidence/s06b-*.txt` |
| s07 FR-09/12, NFR-01/02 | installed with `--statusline-bridge`; hook outdated, bridge script modified, 1 runtime error | `fix --yes`; `fix --yes --json`; `fix --yes --force`; `fix --yes`; `fix --yes --json` | 1 each | PASSED | `evidence/s07-*` |
| s08 FR-03/10 | `withClaude`, `init --auto-restart`; mod folder removed, hook outdated | `fix --yes`; `doctor` | 1; 1 | PASSED (exit 1 from manual `AUTO_RESTART_NOT_LOADED` and `STATUSLINE_LOCAL_TRACKED`, same as before) | `evidence/s08-*.txt` |
| s09 TC-25 | installed, hook outdated, config `{ "broken": ` | `fix --yes --json` | 2 | PASSED | `evidence/s09-fix-yes-json.txt` |
| s10 FR-13 (2) | installed, hook outdated and read-only | `fix --yes --json` | 2 | PASSED (`failed`, EPERM detail) | `evidence/s10-fix-yes-json-readonly.txt` |
| s11 FR-12 | `withClaude`, hook outdated | `fix --yes --json` twice | 1; 1 | PASSED | `evidence/s11-*.txt` |
| s12 OBJ-01 | `withClaude`, `.gitignore` ignores `.claude/settings.local.json`, hook outdated | `fix --yes`; `doctor` | 0; 0 | PASSED | `evidence/s12-*.txt`; PowerShell rerun `evidence/powershell-run.txt` |
| s13 FR-03 | installed, hook outdated | `init --dry-run --json`; `fix --dry-run --json` | — | PASSED (both plan kind `create` for the outdated hook) | `evidence/s13-*.txt` |

Supporting commands on the same code state:

| Command | Result | Evidence |
| --- | --- | --- |
| `npx vitest run` on the 13 prd-24 suites (e2e-fix, doctor-fix-groups, fix-command, fix-interactive, fix-stops, statusline-keep, asset-currency, doctor-fix-pointer, fix-arguments, fix-groups, fix-outcomes, fix-text, schemas) | 13 files, 94 tests passed | `evidence/suites.log` |
| `npm run lint` | exit 0 | `evidence/lint.log` |
| `npm run typecheck` | exit 0 | `evidence/typecheck.log` |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| TechSpec script: real terminal, outdated asset + modified asset + inactive bridge; answer `n`, `s`, `y` | not executed (delegated runner has no human at a real terminal) | — | NOT VERIFIABLE |

This script is not essential evidence. The PRD acceptance criteria for FR-04 and FR-05 are "Integration test with a simulated TTY" and "Integration test per code with simulated answers". The TechSpec script covers the same flow a second time. The same flow runs in `fix-interactive.test.ts` (TC-11, TC-12) with a simulated TTY and the text prompt fallback, and it passes in `evidence/suites.log`.

## Findings

No `BUG-NN`.

## Limitations and open items

- The manual real-terminal script stays NOT VERIFIABLE (contract). FR-04 and FR-05 are proven by integration tests with a simulated TTY only.
- The `askUi` select path of the clack prompt (DEC-13) has no automated test and did not run (codereview_04 limitation).
- NFR-04: Linux and macOS did not run (CI per TechSpec). Symlinked instruction files were not exercised in QA.
- `npm install --ignore-scripts` added `"license": "MIT"` to `package-lock.json` line 10. QA removed that 1 line with `sed` so the worktree matches the pre-QA `git status` (`evidence/git-status-before.txt`); no other tracked file changed. `npm run build` also regenerated `schemas/`; `schemas:check` and `git status` show no change.
- Note, not a defect of this feature: the plan labels an existing outdated asset `create`; `init --dry-run` on the same state gives the same label (s13), so it comes from the shared `init` planner.
- Every git fixture shows the manual `STATUSLINE_LOCAL_TRACKED` until the user ignores `.claude/settings.local.json`; that is why most runs exit 1. s12 shows exit 0 when the user ignores it.
- JSON validation: the published `schemas/*.schema.json` files use draft 2020-12, and the repository has only ajv 6 (draft-07). QA validated JSON with the built zod schemas. `schemas:check` (exit 0) proves that the published files equal the zod schemas.
- Evidence files: `checks-s06b-s12-s13.json` holds a first s06b attempt that kept `CLAUDE.md` and failed (fixture error). The valid s06b run is `checks-s06b.json`. The PowerShell rerun overwrote `s03-*` and `s12-*`, so those files come from PowerShell. The Git Bash results for s03 and s12 are in `checks-s01-s02-s03-s04.json` and `checks-s06b-s12-s13.json`.
- Accepted open items from the review stay: `STATUSLINE_BRIDGE_ABSENT` after an opt-out, test time budget, `.agents/rules/tests.md` e2e list, DEC-06 scope.

## Conclusion

All 16 FR, 5 NFR, and 3 OBJ obligations have a passing route on this code state. 13 end-to-end scenarios on the built CLI pass on Windows in Git Bash, and 2 of them also pass in PowerShell. The prd-24 suites, lint, typecheck, build, and schemas check pass. QA found no defect. The real-terminal script and Linux and macOS are not verifiable here. Integration tests from the same code state cover the TTY flow, and the TechSpec assigns the other platforms to CI. Status: APPROVED.
