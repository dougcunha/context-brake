# QA report — 19-skills-name-and-invocation (skill names in the configuration, invocation formatted by each harness)

## Summary

- Status: APPROVED
- Execution: delegated QA runner
- Code state: commit `7295a433a4f1f79430b0c5281cb46ab8495b6db6` plus the uncommitted worktree diff (84 paths in `git status --porcelain`, identical before and after QA; `dist/` rebuilt by `npm run build` at the start)
- Latest review: `tasks/prd-19-skills-name-and-invocation/codereview_03/codereview.md` (APPROVED WITH RESERVATIONS, cycle closed)
- Previous QA: `tasks/prd-19-skills-name-and-invocation/qa_01/qa.md` (REJECTED, BUG-01); correction in `qa_01/done/task_01.md`

BUG-01 of qa_01 is resolved: the built `init` now names the flag and the config file together with the bare name. Every other obligation passed again on the built CLI and hooks or is proven by unit and integration evidence from the same code state. No new finding.

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0 |
| Platforms | Windows 11 Pro 10.0.26200 (Git Bash host, children spawned by Node without a shell). Not run: Linux, macOS, Node 20 |
| Build command | `npm run build` (schemas:generate, assets:build, tsc), commands from `AGENTS.md` |
| Fixtures | Payloads copied from `tests/fixtures/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}/{post-tool-use,session-start,pre-invocation}.json`. The repository has no fixture repository folder; each scenario ran in its own `mkdtemp` + `git init` directory under the OS temp folder, outside the worktree (as `tests/e2e` does) |
| Isolation | Every child process ran with `NO_COLOR=1` and `HOME`, `USERPROFILE`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`, `COPILOT_HOME` pointing to an empty temp folder |
| Driver scripts | Outside the worktree (session scratchpad): `qa2.mjs` (S1, S2, S3, S5, TC-09 doctor), `qa2b.mjs` (S4 hooks); their outputs are the evidence files |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 name rule | TC-01 | end-to-end (init flag, published schema) + unit | PASSED | `qa_02/evidence/s1-init-rejections.json`, `s5-schema-validation.json`, `tc-targeted-vitest.txt` |
| FR-02 old format rejected with a fix | TC-02 | end-to-end (flag path and stored config path) | PASSED (BUG-01 resolved) | `s1-init-rejections.json`, `s3-old-format-stored-config.json` |
| FR-03 per-harness form in zone action and resume text | TC-03, TC-04, TC-13 | end-to-end for the 5 process-hook harnesses; unit/integration for Pi, Oh-My-Pi, OpenCode | PASSED | `s4-hook-round-trips.json`, `s2-all-harness-init-doctor.json`, `tc-targeted-vitest.txt` |
| FR-04 unknown formatter gives the sentence | TC-05 | unit (same code state) | PASSED | `tc-targeted-vitest.txt` (`zone-guidance`, `failure-policy-snapshot-reset`), `gate-coverage.txt` |
| FR-05 flags take bare names, replay equal | TC-06, TC-13 | end-to-end (init writes bare names); integration (replay) | PASSED | `s2-all-harness-init-doctor.json`, `s4-hook-round-trips.json`, `tc-targeted-vitest.txt` (`init-snapshot`, `init-assistant-equivalence`, `e2e-init`) |
| FR-06 wizard validates and previews | TC-07 | unit (scripted prompts; no TTY) | PASSED | `tc-targeted-vitest.txt` (`assistant-questions-invalid`, `assistant-questions`) |
| FR-07 bare name printed; doctor text and JSON carry forms | TC-08 | end-to-end | PASSED | `s2-all-harness-init-doctor.json`, `s5-schema-validation.json` |
| FR-08 repo config, README, AGENTS.md, SDD references, schemas | TC-09 | automated | PASSED | `tc09-git-grep.txt` (no match, exit 1), `tc09-doctor-repo.out`, `gate-schemas-check.txt` |
| FR-09 research doc Skills entries | TC-10 | review | PASSED | `docs/research/harness-integrations.md` lines 71, 96, 119, 138, 157, 178, 200, 219 (eight "Skills no projeto e invocação (PRD-19)" entries, verified 13/10/2026, with source links) |
| NFR-01 syntax in the harness folder, no id branching | TC-03, TC-11 | unit (same code state) | PASSED | `tc-targeted-vitest.txt`, `gate-coverage.txt` |
| NFR-02 60-token budget | TC-12 | unit | PASSED | `tc-targeted-vitest.txt` (`telemetry-block-budget`) |
| NFR-03 platform | review | end-to-end on Windows only | PASSED on Windows; Linux and macOS NOT VERIFIABLE | limitations |
| NFR-04 errors without stack trace | TC-02 | end-to-end | PASSED | `s1-init-rejections.json`, `s3-old-format-stored-config.json` (no stack frame in any output) |
| NFR-05 schemas current | `schemas:check` | automated | PASSED | `gate-schemas-check.txt`, `s5-schema-validation.json` |
| OBJ-03 old format fails in init, doctor, hooks | TC-02 | end-to-end | PASSED | `s1-init-rejections.json`, `s3-old-format-stored-config.json` |
| OBJ-04 research doc | TC-10 | review | PASSED | see FR-09 |

## End-to-end runs

All runs used the built CLI (`dist/src/cli/main.js`) or the built hooks installed by that CLI (`init`) into the temporary repository, as child processes, with `NO_COLOR=1`.

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| BUG-01 regression, sigil values | empty git repo | `init --yes --harness claude-code --snapshot-command <v>` for `/sdd-snapshot`, `$x`, `@x` | 64 each | PASSED: stderr `Invalid snapshot option: snapshot.command "/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot. Set it with --snapshot-command <skill> or in context-brake.config.json.` (`$x` and `@x` suggest `x`); directory still holds only `.git`; no stack trace | `s1-init-rejections.json` |
| TC-01 / FR-01 other rejects | empty git repo | same flag with `a b`, `Sdd`, `a--b`, `--snapshot-command=-a`, 65 characters, `a::b`, `:a`, `a:b:c` | 64 each | PASSED: all rejected with the shape rule text plus the flag and file suffix; nothing written | `s1-init-rejections.json` |
| TC-02 resume and trigger flags | empty git repo | `--snapshot-command sdd-snapshot --resume-command /sdd-orchestrate-flow`; same with `$x`; `--no-snapshot-command --resume-command ...`; `--resume-command ok` alone; `--snapshot-trigger BLUE` | 64 each | PASSED: key `snapshot.resumeCommand` with the bare name and `--resume-command <skill>`; explicit incompatibility message; `requires snapshot.command`; `--snapshot-trigger <YELLOW\|RED>`; nothing written | `s1-init-rejections.json` |
| TC-06 / FR-05, FR-07 | empty git repo, all 8 harnesses | `init --yes` with 8 `--harness` flags, `--snapshot-command sdd-snapshot --resume-command anthropic-skills:docs` | 0 | PASSED: config holds `command: sdd-snapshot`, `resumeCommand: anthropic-skills:docs` (plugin prefix accepted) | `s2-all-harness-init-doctor.json` |
| TC-08 / FR-07 doctor text | same repo | `doctor` | 1 (warnings only) | PASSED: `snapshot: sdd-snapshot at RED, resume: anthropic-skills:docs` and one line per harness: `/sdd-snapshot` (claude-code, cursor, github-copilot-cli), `$sdd-snapshot` (codex-cli), `/skill:sdd-snapshot` (pi), `use the sdd-snapshot skill` (antigravity-cli, oh-my-pi, opencode); resume forms likewise | `s2-all-harness-init-doctor.json` |
| TC-08 doctor JSON | same repo | `doctor --json` | 1 | PASSED: one JSON document on stdout; `snapshot.invocations` has 8 `{harness, command, resumeCommand}` rows; validates against `schemas/doctor-report.schema.json` | `s2-all-harness-init-doctor.json`, `s5-schema-validation.json` |
| NFR-05 config schema | published schema | validator run against `schemas/context-brake.config.schema.json` (Ajv 6 with `validateSchema: false`: the only Ajv installed does not know draft 2020-12) | n/a | PASSED: file written by `init` valid; `/sdd-snapshot`, `$x`, `@x`, `Sdd`, `a b`, `a--b`, `-a`, 65 characters, `a:b:c`, `:a` invalid; `sdd-snapshot`, `commit`, `anthropic-skills:docs` valid | `s5-schema-validation.json` |
| OBJ-03 stored old format, doctor | repo initialised by the built CLI, config edited to `"command": "/sdd-snapshot"` and later `"a b"` | `doctor`, `doctor --json` | 2 | PASSED: `[ERROR] INVALID_CONTEXTBRAKE_CONFIG: Configuration validation failed: snapshot.command "/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot.`, remediation names `context-brake.config.json`; JSON finding carries `path: context-brake.config.json`; no stack trace | `s3-old-format-stored-config.json` |
| OBJ-03 stored old format, hook | same repo, built Claude Code hook | installed hook `PostToolUse` with the fixture payload | 0 | PASSED per the TechSpec failure policy: tool call proceeds, stderr `ContextBrake: INVALID_CONFIG`, `errors.jsonl` records `InvalidConfigurationError snapshot.command` | `s3-old-format-stored-config.json` |
| TC-13 / FR-03 RED | temp repo per harness after `init --snapshot-command sdd-snapshot --resume-command sdd-orchestrate-flow`, ceiling 24000, padded payload | installed hook `PostToolUse` (`postToolUse` for Cursor and Copilot) | 0 | PASSED: `zone=RED action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]` for claude-code, cursor, github-copilot-cli; `run "$sdd-snapshot"` for codex-cli; antigravity-cli through `PreInvocation`: `run "use the sdd-snapshot skill"` | `s4-hook-round-trips.json` |
| FR-03 CRITICAL | same procedure, larger padding | same events | 0 | PASSED: `zone=CRITICAL action=run "<form>" now, then end reply with [REQUEST_SESSION_RESET]` with the same five forms | `s4-hook-round-trips.json` |
| FR-03 resume text | fresh repo per harness | `SessionStart` (claude-code with `source: compact`, codex-cli, cursor, github-copilot-cli) | 0 | PASSED: `[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.` (codex-cli `$sdd-orchestrate-flow`). Antigravity `PreInvocation` of a fresh session injects nothing (`injectSteps: []`, no reset happened); its resume form is covered by the doctor row and unit tests | `s4-hook-round-trips.json` |
| TC-09 / FR-08 | this repository, `git grep --untracked -nE '"/sdd-(snapshot\|orchestrate-flow)"\|command "/sdd-' -- . ':!tasks' ':!tests'` | `git grep` | 1 (no match) | PASSED: empty | `tc09-git-grep.txt` |
| TC-09 doctor in this repo | this repository, isolated HOME | `doctor` | 1 | PASSED: no `[ERROR]`; `snapshot: sdd-snapshot at RED, resume: sdd-orchestrate-flow` and `claude-code: /sdd-snapshot, resume: /sdd-orchestrate-flow`; `git status --porcelain` identical before and after | `tc09-doctor-repo.out`, `tc09-doctor-repo.err` |

Gates on this code state (all exit 0): `npm run build` (`gate-build.txt`); `npm run lint` (`gate-lint.txt`); `npm run typecheck` (`gate-typecheck.txt`); `npm run schemas:check` (`gate-schemas-check.txt`); `npm run dependencies:check` (`gate-dependencies-check.txt`, 9 packages, no install scripts); `npm run package:smoke` (`gate-package-smoke.txt`); `npm run coverage`: 258 files, 1342 tests, 95.99% statements, 92.97% branches (`gate-coverage.txt`); `npm run test:budget`: 92.9 s wall of 180 s (`gate-test-budget.txt`); targeted run of the TC files, 16 files and 152 tests (`tc-targeted-vitest.txt`, includes `tests/e2e/e2e-init.test.ts`, TC-13).

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| None listed in the TechSpec ("Manual acceptance: none") | n/a | n/a | n/a |
| Interactive wizard typed `/sdd-snapshot` then a valid name, with the per-harness preview | not executable by a runner (needs a TTY and the user) | proven instead by the scripted-prompt unit tests in the targeted and coverage runs | NOT VERIFIABLE by hand; automated evidence PASSED |
| Real harness sessions honoring the printed form | not run (no harness sessions in a delegated QA runner) | the model-side effect is assumption A-01 in the PRD, outside this slice's verification | NOT VERIFIABLE |

## Findings

No `BUG-NN` in this run.

Observations that are not findings:

- `init --resume-command ok` alone prints `snapshot.resumeCommand requires snapshot.command. Set it with --resume-command <skill> or in context-brake.config.json.`; the pointed flag is not the missing piece. This is `codereview_03/CR-01` (Low, optional, wording only); the PRD does not constrain this message.
- The hook path for an invalid stored config prints only `ContextBrake: INVALID_CONFIG` on stderr and logs `InvalidConfigurationError snapshot.command`; the file and fix text appear in `doctor`. The TechSpec defines this as the failure policy, so it is recorded, not reported.
- `--snapshot-trigger BLUE` shows the raw validator text (`Invalid option: expected one of "YELLOW"|"RED"`) before the flag suffix; outside the FR-02 scope.

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| qa_01/BUG-01 (FR-02 flag error without flag or file) | resolved | `qa_02/evidence/s1-init-rejections.json`: `init --yes --harness claude-code --snapshot-command /sdd-snapshot` exits 64 with `... use the bare name sdd-snapshot. Set it with --snapshot-command <skill> or in context-brake.config.json.`, nothing written; `--resume-command` and `--snapshot-trigger` name their own flags; `tests/integration/init-snapshot.test.ts` passes in `tc-targeted-vitest.txt` |

Every scenario qa_01 ran (S1 to S5, TC-09) was rerun on the current code state, not only the affected ones: the code change since qa_01 is the message suffix in `snapshot-merge.ts`, and the full path through `init`, `doctor`, and the hooks was exercised again.

## Limitations and open items

- Linux, macOS, and Node 20 were not run; Windows 11 with Node v24.20.0 only. No shell or path-dependent code was added (NFR-03), so the risk is low.
- OpenCode, Pi, and Oh-My-Pi run inside their host processes and cannot be driven as a built hook here. Their forms (`use the sdd-snapshot skill`, `/skill:sdd-snapshot`, `use the sdd-snapshot skill`) are proven by the built `doctor` output above and by `tests/integration/skill-invocations.test.ts` in the coverage run. Their guidance text in a live host was not run.
- Antigravity CLI resume text after a real reset was not reproduced; only the zone action through `PreInvocation` was.
- The interactive wizard (TTY) and the printed equivalent-command replay are covered by in-process scripted tests only (TC-06, TC-07); the built CLI has no non-TTY route to them.
- The published schemas were checked with Ajv 6 (the only Ajv in `node_modules`), with schema meta-validation off because it does not know draft 2020-12; `npm run schemas:check` passes and the validation outcomes match the PRD table.
- A first background gate loop was started and a second one launched after the first seemed to end, so `coverage` and `test:budget` ran twice at once. Those outputs were discarded and both gates were rerun alone; the evidence files are from the clean reruns. The doctor `overhead ... (fail)` line in the evidence reflects machine load, not this feature.
- `context-brake init` was never run against this repository; `doctor` ran in it with an isolated HOME and left `git status --porcelain` unchanged (84 paths before and after). `ASSET_OUTDATED` in the repository doctor is the open thread O-02 (AUTO-10), a warning and not part of this slice.
- The snapshot was loaded through the independent-stage filter (header, next step brief, open threads); it predates the reviews and corrections and no entry was relied on.

## Conclusion

The slice does what the PRD asks end to end on Windows. The built `init` stores bare names and accepts the `plugin:name` form. The old format and every other malformed value are rejected with exit 64, nothing written, and now an error that names the flag, the config file, the key, and the bare name, which resolves BUG-01 of qa_01. A stored old-format value is reported by `doctor` with the key, the bare name, and the file. The five process-hook harnesses render the right form at RED and CRITICAL and in the resume text. `doctor` text and JSON list the name and the eight per-harness forms, and the JSON and config validate against the regenerated published schemas. The repository's own configuration and docs use bare names, with TC-09 empty and no doctor error. All gates pass. No failed obligation and no `BUG-NN`; the unverifiable items (other platforms, live harness sessions, TTY wizard) are limitations the TechSpec does not require as manual acceptance, so the status is APPROVED.
