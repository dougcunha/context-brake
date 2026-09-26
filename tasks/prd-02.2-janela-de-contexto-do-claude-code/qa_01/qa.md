# QA report — PRD 2.2 real context window in Claude Code

## Summary

- Status: APPROVED
- Code state: `8dd3baa` (branch `feat/prd-02.2-claude-context-window`, draft PR #2); the worktree changes no code
- Latest review: `codereview_02/codereview.md` (APPROVED)
- Previous QA: —
- Independence: this session wrote no code and made no corrections. It ran the review before this QA.

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.19.0 locally; CI covers Node 20, 22, and 24 |
| Platforms | Windows 11 with Git Bash `sh` (this run). Linux and macOS end-to-end suites (`e2e-statusline-bridge`, `e2e-statusline-shell`) passed on CI run 36257966989 for the same commit. PowerShell-only Windows was not run; it is unsupported by design (TechSpec Risks). |
| Build command | `npm run build` (run in this session before QA) |
| Fixtures | `tests/fixtures/harnesses/claude-code/statusline.json` as the stdin payload. Temporary repositories under `%TEMP%/cb-qa-*`, including a root with spaces and accents (`QA Root/ação`) and a root containing `$`. A temporary `HOME`/`USERPROFILE` is used for user-scope settings. No real repository or user configuration was touched. |
| Script | `qa_01/evidence/qa-statusline.mjs` runs the built CLI (`dist/src/cli/main.js`), the installed hook, and the installed status line command through `sh -c`. `run-output.txt` holds the output and `results.json` the details. |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 | TC-10–TC-12, TC-15 | end-to-end | PASSED | `A-01`…`A-05`, `F-01`, `F-02`, `G-01`: without the flag, nothing changes. `--dry-run` lists both files and writes nothing. The bridge command is absolute, with forward slashes. Comments and other keys are kept, and `.claude/settings.json` stays untouched. A second run and a flagless run change nothing. Without Claude Code, and with both flags, `init` exits 64. A root with `$` gets `STATUSLINE_UNSUPPORTED_PATH` and no write. |
| FR-02 / OBJ-02 / US-02 | TC-06, TC-10 | end-to-end | PASSED | `A-06`, `B-02`, `C-01`, `D-01`: output is byte-equal through `sh -c`, including ANSI, quotes, and two lines. Previous commands from the user, project, and local scopes are wrapped, with the local scope winning. Exit code 3 is kept. A trailing `#` comment works. With no previous command, the command has no `--pipe` and the output is empty. `padding` and `refreshInterval` are copied. |
| FR-03 / NFR-03 | TC-01, TC-09 | end-to-end | PASSED | `A-07-ledger.json`: one `statusline` line per run with only `v, type, at, windowTokens, inputTokens, usedPercentage, model`. No cost, path, or output appears in the ledger. |
| FR-04 / US-01 / US-03 | TC-03 | end-to-end + real session | PASSED | `A-08-tool-lines.json`: the window changes from 200,000 to 1,000,000 with the next status line run. At 600,000/1,000,000 the block shows `usage=60%` and `zone=YELLOW`; at 660,000 it shows `RED`. `real-session-ledger.txt`: this Claude Code session records `windowTokens: 1000000` on more than 200 status line runs, and its tool lines are measured over 1,000,000. |
| FR-05 | TC-04 | end-to-end | PASSED | With no transcript, the bridge tokens give `source=measured`, `usedTokens=15500`, and window 200,000. The first status line reading after the reset is measured again. |
| FR-06 / OBJ-01 | TC-02, TC-22 | end-to-end | PASSED | After a `SessionStart` with `source: compact` and a post-compact status line with `current_usage: null`, the reading is `source=estimated` with `windowTokens: 1000000`. |
| FR-07 / US-04 | TC-16–TC-18 | end-to-end + integration | PASSED | `A-09`…`A-14`: `doctor --json` returns `{bridge: installed, source: statusline, lastWindowTokens: 1000000}` and `schemaVersion: 1`. `STATUSLINE_LOCAL_TRACKED` follows `git check-ignore` and clears once the file is ignored. `PREVIOUS_CHANGED`, `MISSING_SCRIPT`, and `INACTIVE` (with `bridge: inactive`) each appear, all with remediation. The text output has one `- context window:` line and no ANSI with `NO_COLOR`. Schema validation is TC-18, which passed in the full suite on the same code. |
| FR-08 / US-05 | TC-12, TC-13 | end-to-end | PASSED | `A-15`: `--no-statusline-bridge` restores a JSONC local file byte for byte and deletes the state. `B-03`: `remove` deletes the local file the bridge created. `C-02`: a previous local `statusLine` is restored with an equal value and no other key changed (see limitations). |
| FR-09 | TC-19 | unit | PASSED | TC-19 in the full suite on `8dd3baa` (codereview_02). The README states "RED starts above 650,000 tokens", which matches the observed behavior. |
| NFR-01 / OBJ-04 | TC-20 | integration (CI) | PASSED | CI run 36257966989, 9/9 jobs (codereview_02) |
| NFR-02 | TC-08 | end-to-end | PASSED | `E-01`: invalid stdin keeps the user's output and exit code 0 |
| NFR-04 | TC-01, TC-18 | end-to-end + integration | PASSED | `schemaVersion: 1`; `schemas:check` passed |
| NFR-05 | — | gates | PASSED | codereview_02: lint, typecheck, full suite with 95.39% coverage, schemas, package smoke |
| NFR-06 | TC-11, TC-21 | end-to-end | PASSED for POSIX shells | the root `QA Root/ação` on Windows Git Bash; Linux and macOS on CI |
| OBJ-03 | TC-05, PRD 2.1 suites | unit/integration | PASSED | full suite on `8dd3baa` |
| Manual acceptance | five-step script | manual | PASSED (accepted by DEC-HIL-06) | 25/09/2026 user run (`done/task_05.md#handoff`); this session's real ledger for step 3 |

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| A: install, preserve, record, zones, doctor, restore (user-scope previous command, JSONC local file, spaces and accents) | `statusline.json` | `context-brake init [--dry-run] [--statusline-bridge \| --no-statusline-bridge]`, `doctor [--json]`, hook `PostToolUse`/`SessionStart`, `sh -c <statusLine.command>` | 0 for all | PASSED (23 checks) | `A-*.json`, `A-*.txt` |
| B: project-scope previous command with exit 3; `remove` | `statusline.json` | `init --statusline-bridge`, `remove --yes` | 0 / pipeline 3 | PASSED | `B-*.json` |
| C: local scope wins; trailing comment; restore | `statusline.json` | `init --statusline-bridge`, `--no-statusline-bridge` | 0 | PASSED | `C-*.json` |
| D: no previous command | `statusline.json` | `init --statusline-bridge`, `sh -c` | 0 | PASSED | `D-01-init.json` |
| E: invalid stdin | — | `sh -c <statusLine.command>` with `{not json` | 0 | PASSED | `E-01-init.json`, `run-output.txt` |
| F: argument errors | — | `init --statusline-bridge` without Claude Code; both flags | 64 | PASSED | `F-*.json` |
| G: unsupported root | — | `init --statusline-bridge` in `qa-$dollar` | 0 with a conflict | PASSED | `G-01-dollar-root.json` |

Total: 34/34 checks passed (`run-output.txt`).

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| TechSpec steps 1–5 (1M model, existing status line, `/model`, `remove`) | user, 25/09/2026, before correction round 1 | reported passed, with no per-step detail | PASSED (reused under DEC-HIL-06) |
| Step 3 in a real session (block over the 1M window) | agent, reading this session's own ledger on 26/09/2026 | more than 200 `statusline` lines with `windowTokens: 1000000`, and tool lines measured over 1,000,000: the status line `session_id` matches the hooks' | PASSED |
| Real Claude Code with the corrected two-line command (codereview_01/CR-05) | — | not run; the user accepted the current evidence (DEC-HIL-06) | not run, accepted |

## Findings

No `BUG-NN`.

## Limitations and open items

- The two-line bridge command has not run inside real Claude Code. `sh -c` runs it on all 9 CI jobs and in this QA, and Claude Code runs `statusLine.command` through the same shell. The user accepted this gap (DEC-HIL-06). This repository keeps the old one-line command until `init --statusline-bridge` runs again.
- A previous local `statusLine` is restored with an equal value, but the object is re-serialized: `{ "type": "command", … }` comes back as `{"type":"command",…}` (`C-03-restore-bytes.json`). FR-08 requires the key to be equal and no other key to change, and that holds. Byte-for-byte restoration holds when there was no previous local value (`A-15`). This is an observation, not a defect.
- PRD 2.2 US-01 says `RED` "starts at 650,000 tokens". The PRD-02 zone rule (RF10) and the README say "above 65%", and 650,000 of 1,000,000 is still `YELLOW`. The code follows RF10, and the zone percentages are out of scope for PRD 2.2. The US-01 wording is loose, and a later PRD edit can align it.
- PowerShell-only Windows was not run; it is unsupported by design.

## Conclusion

APPROVED. Every PRD 2.2 acceptance obligation passes. End-to-end runs of the built CLI, hook, and status line command against temporary repositories cover them, together with integration and CI evidence for the same commit. QA found no defects. Manual acceptance rests on the user's 25/09 run and this session's real ledger, as the user decided in DEC-HIL-06.
