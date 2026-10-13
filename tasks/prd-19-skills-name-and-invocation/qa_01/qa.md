# QA report — 19-skills-name-and-invocation (skill names in the configuration, invocation formatted by each harness)

## Summary

- Status: REJECTED
- Execution: delegated QA runner
- Code state: commit `7295a433a4f1f79430b0c5281cb46ab8495b6db6` plus the uncommitted worktree diff (83 changed paths, same count before and after QA; `dist/` rebuilt by `npm run build` at the start)
- Latest review: `tasks/prd-19-skills-name-and-invocation/codereview_02/codereview.md` (APPROVED WITH RESERVATIONS, cycle closed)
- Previous QA: —

One finding: BUG-01 (Low) is the flag-name gap in the FR-02 error for `init --snapshot-command`; it is the same gap the review carried as CR-01 (accepted open item AUTO-11). Everything else passed or is proven by same-state unit and integration evidence.

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0 |
| Platforms | Windows 11 Pro 10.0.26200, Git Bash and PowerShell host. Not run: Linux, macOS, Node 20 |
| Build command | `npm run build` (schemas:generate, assets:build, tsc), commands from `AGENTS.md` |
| Fixtures | Payloads copied from `tests/fixtures/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}/{post-tool-use,session-start,pre-invocation}.json`; each scenario ran in its own `mkdtemp` + `git init` directory under the OS temp folder, outside the worktree. The repository has no fixture repository folder; `tests/e2e` builds its temporary repositories the same way |
| Isolation | Every child process ran with `NO_COLOR=1` and `HOME`, `USERPROFILE`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `APPDATA` pointing to an empty temp folder, except the first exploratory `init` (see limitations) |
| Driver scripts | Outside the worktree (session scratchpad): `qa-e2e.mjs`, `qa-s4.mjs`, `qa-s4b.mjs`, `qa-schema.mjs`, `qa-hooklog.mjs`; outputs are the evidence files |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 name rule | TC-01 | end-to-end (init flag, schema, doctor) + unit | PASSED | `evidence/s1-init-rejections.json`, `evidence/s5-schema-validation.json`, `evidence/gate-coverage.txt` |
| FR-02 old format rejected with a fix | TC-02 | end-to-end | FAILED (flag path), PASSED (config-file path) | `evidence/s1-init-rejections.json`, `evidence/s3-old-format-stored-config.json`; BUG-01 |
| FR-03 per-harness form in zone action and resume text | TC-03, TC-04, TC-13 | end-to-end for the 5 process-hook harnesses; unit/integration for Pi, Oh-My-Pi, OpenCode | PASSED | `evidence/s4-hook-round-trips.json`, `evidence/s4b-hook-red-zone.json`, `evidence/tc-targeted-vitest.txt` |
| FR-04 unknown formatter gives the sentence | TC-05 | unit (same code state) | PASSED | `evidence/tc-targeted-vitest.txt` (`zone-guidance`, `failure-policy`), `evidence/gate-coverage.txt` |
| FR-05 flags take bare names, replay equal | TC-06, TC-13 | end-to-end (init writes bare names); integration (replay) | PASSED | `evidence/s2-all-harness-init-doctor.json`, `evidence/s4-hook-round-trips.json`, `evidence/tc-targeted-vitest.txt` (`init-snapshot`, `init-assistant-equivalence`) |
| FR-06 wizard validates and previews | TC-07 | unit (scripted prompts; no TTY available) | PASSED | `evidence/tc-targeted-vitest.txt` (`assistant-questions-invalid`), `evidence/gate-coverage.txt` |
| FR-07 bare name printed; doctor text and JSON carry forms | TC-08 | end-to-end | PASSED | `evidence/s2-all-harness-init-doctor.json`, `evidence/s5-schema-validation.json` |
| FR-08 repo config, README, AGENTS.md, SDD references, schemas | TC-09 | automated | PASSED | `evidence/tc09-git-grep.txt` (empty), `evidence/tc09-doctor-repo.out`, `evidence/gate-schemas-check.txt` |
| FR-09 research doc Skills entries | TC-10 | review | PASSED | `docs/research/harness-integrations.md` lines 71, 96, 119, 138, 157, 178, 200, 219 (eight entries) |
| NFR-01 syntax in the harness folder, no id branching | TC-03, TC-11 | unit (same code state) | PASSED | `evidence/gate-coverage.txt`, `evidence/tc-targeted-vitest.txt` |
| NFR-02 60-token budget | TC-12 | unit | PASSED | `evidence/tc-targeted-vitest.txt` (`telemetry-block-budget`) |
| NFR-03 platform | review | end-to-end on Windows only | PASSED on Windows; Linux and macOS NOT VERIFIABLE | limitations |
| NFR-04 errors without stack trace | TC-02 | end-to-end | PASSED | `evidence/s1-init-rejections.json`, `evidence/s3-old-format-stored-config.json` (no stack trace anywhere) |
| NFR-05 schemas current | `schemas:check` | automated | PASSED | `evidence/gate-schemas-check.txt`, `evidence/s5-schema-validation.json` |
| OBJ-03 old format fails in init, doctor, hooks | TC-02 | end-to-end | PASSED, with the BUG-01 wording gap | `evidence/s3-old-format-stored-config.json`, `evidence/s3b-hook-old-format-log.json` |
| OBJ-04 research doc | TC-10 | review | PASSED | see FR-09 |

## End-to-end runs

All runs used the built CLI (`dist/src/cli/main.js`) or the built hooks installed by that CLI (`init`) into the temp repository, as child processes, with `NO_COLOR=1`.

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-02 / FR-02 sigil values | empty git repo | `init --yes --harness claude-code --snapshot-command <v>` for `/sdd-snapshot`, `$x`, `@x` | 64 each | PASSED: stderr `Invalid snapshot option: snapshot.command "/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot.` (`$x` and `@x` suggest `x`); no file written; no stack trace. Names the key, not the flag (BUG-01) | `evidence/s1-init-rejections.json` |
| TC-01 / FR-01 other rejects | empty git repo | same flag with `a b`, `Sdd`, `a--b`, `--snapshot-command=-a`, 65 characters, `a::b`, `:a`, `a:b:c` | 64 each | PASSED: all rejected with the shape rule text, nothing written | `evidence/s1-init-rejections.json` |
| TC-02 resume flag | empty git repo | `--snapshot-command sdd-snapshot --resume-command /sdd-orchestrate-flow`; same with `$x`; `--no-snapshot-command --resume-command sdd-orchestrate-flow` | 64 each | PASSED: key `snapshot.resumeCommand` with bare name, or the explicit incompatibility message; nothing written | `evidence/s1-init-rejections.json` |
| TC-06 / FR-05, FR-07 | empty git repo, all 8 harnesses | `init --yes` with 8 `--harness` flags, `--snapshot-command sdd-snapshot --resume-command anthropic-skills:docs` | 0 | PASSED: config holds `command: sdd-snapshot`, `resumeCommand: anthropic-skills:docs` (plugin prefix accepted) | `evidence/s2-all-harness-init-doctor.json` |
| TC-08 / FR-07 doctor text | same repo | `doctor` | 1 (warnings only) | PASSED: `snapshot: sdd-snapshot at RED, resume: anthropic-skills:docs` and one line per harness: `/sdd-snapshot` (claude-code, cursor, github-copilot-cli), `$sdd-snapshot` (codex-cli), `/skill:sdd-snapshot` (pi), `use the sdd-snapshot skill` (antigravity-cli, oh-my-pi, opencode); resume forms likewise | `evidence/s2-all-harness-init-doctor.json` |
| TC-08 doctor JSON | same repo | `doctor --json` | 1 | PASSED: one JSON document on stdout, `snapshot.invocations` has 8 `{harness, command, resumeCommand}` rows; validates against `schemas/doctor-report.schema.json` (Ajv) | `evidence/s2-all-harness-init-doctor.json`, `evidence/s5-schema-validation.json` |
| NFR-05 config schema | published schema | Ajv against `schemas/context-brake.config.schema.json` | n/a | PASSED: file written by `init` valid; `/sdd-snapshot`, `$x`, `@x`, `Sdd`, `a b`, `a--b`, `-a`, 65 characters, `a:b:c`, `:a` invalid; `sdd-snapshot`, `commit`, `anthropic-skills:docs` valid | `evidence/s5-schema-validation.json` |
| OBJ-03 stored old format, doctor | git repo initialised by built CLI, config edited to `"command": "/sdd-snapshot"` and later `"a b"` | `doctor`, `doctor --json` | 2 | PASSED: `[ERROR] INVALID_CONTEXTBRAKE_CONFIG: Configuration validation failed: snapshot.command "/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot.` with `path: context-brake.config.json` and remediation naming the file; JSON finding carries the same; no stack trace | `evidence/s3-old-format-stored-config.json` |
| OBJ-03 stored old format, hook | same repo, built Claude Code hook | `node .claude/hooks/context-brake.mjs PostToolUse < post-tool-use.json` | 0 | PASSED per TechSpec failure policy: tool call proceeds, stderr `ContextBrake: INVALID_CONFIG`, `errors.jsonl` records `InvalidConfigurationError snapshot.command`; doctor then adds `RUNTIME_ERRORS_RECORDED` | `evidence/s3b-hook-old-format-log.json`, `evidence/s3-old-format-stored-config.json` |
| TC-13 / FR-03 RED, claude-code | temp repo after `init --snapshot-command sdd-snapshot --resume-command sdd-orchestrate-flow`, ceiling 24000 | installed hook `PostToolUse`, payload padded to usage ~71% | 0 | PASSED: `zone=RED action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]` | `evidence/s4b-hook-red-zone.json` |
| FR-03 RED, codex-cli | same procedure | installed hook `PostToolUse` | 0 | PASSED: `zone=RED action=run "$sdd-snapshot", then ...` | `evidence/s4b-hook-red-zone.json` |
| FR-03 RED, cursor | same procedure | installed hook `postToolUse` | 0 | PASSED: `run "/sdd-snapshot"` | `evidence/s4b-hook-red-zone.json` |
| FR-03 RED, github-copilot-cli | same procedure | installed hook `postToolUse` | 0 | PASSED: `run "/sdd-snapshot"` | `evidence/s4b-hook-red-zone.json` |
| FR-03 RED, antigravity-cli | same procedure | `PostToolUse` (returns `{}` by design) then `PreInvocation` | 0 | PASSED: injected step `run "use the sdd-snapshot skill", then ...` | `evidence/s4b-hook-red-zone.json` |
| FR-03 CRITICAL, five process harnesses | same procedure, padded to usage above 100% | same events | 0 | PASSED: `zone=CRITICAL action=run "<form>" now, then end reply with [REQUEST_SESSION_RESET]` with `/sdd-snapshot`, `$sdd-snapshot`, `/sdd-snapshot`, `/sdd-snapshot`, `use the sdd-snapshot skill` | `evidence/s4-hook-round-trips.json` |
| FR-03 resume text | same procedure, fresh repo per harness | `SessionStart` (claude-code with `source: compact`, codex-cli, cursor, github-copilot-cli) | 0 | PASSED: `[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.` (codex-cli `$sdd-orchestrate-flow`). Antigravity `PreInvocation` of a fresh session injects nothing (no reset happened); its resume form is covered by the doctor row and unit tests | `evidence/s4-hook-round-trips.json` |
| TC-09 / FR-08 | this repository, `git grep --untracked` | `git grep --untracked -nE '"/sdd-(snapshot\|orchestrate-flow)"\|command "/sdd-' -- . ':!tasks' ':!tests'` | 1 (no match) | PASSED: empty | `evidence/tc09-git-grep.txt` |
| TC-09 doctor in this repo | this repository, isolated HOME | `doctor` | 1 | PASSED: no `[ERROR]`; `snapshot: sdd-snapshot at RED, resume: sdd-orchestrate-flow` and `claude-code: /sdd-snapshot, resume: /sdd-orchestrate-flow`; warnings only (ASSET_OUTDATED for two installed runtime assets = open thread O-02 / AUTO-10, STATUSLINE_PREVIOUS_CHANGED, VERSION_FLOOR_UNVERIFIED). `git status --porcelain` identical before and after | `evidence/tc09-doctor-repo.out`, `evidence/tc09-doctor-repo.err` |

Gates on this code state (all exit 0): `npm run build`; `npm run lint` (`evidence/gate-lint.txt`); `npm run typecheck` (`evidence/gate-typecheck.txt`); `npm run schemas:check` (`evidence/gate-schemas-check.txt`); `npm run dependencies:check` (`evidence/gate-dependencies.txt`); `npm run package:smoke` (`evidence/gate-package-smoke.txt`); `npm run coverage`: 258 files, 1342 tests, 95.98% statements, 92.98% branches (`evidence/gate-coverage.txt`); `npm run test:budget`: 95.6 s wall of 180 s (`evidence/gate-test-budget.txt`); targeted run of the TC files, 10 files and 115 tests (`evidence/tc-targeted-vitest.txt`, includes `tests/e2e/e2e-init.test.ts` TC-13).

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| None listed in the TechSpec ("Manual acceptance: none") | — | — | n/a |
| Interactive wizard typed `/sdd-snapshot` then a valid name, with the per-harness preview | not executable by a runner (needs a TTY and the user) | proven instead by the scripted-prompt unit and integration tests in the coverage run | NOT VERIFIABLE by hand; automated evidence PASSED |
| Real harness sessions (Claude Code, Codex, Cursor, Copilot CLI, Antigravity, Pi, Oh-My-Pi, OpenCode) honoring the printed form | not run (no harness sessions in a delegated QA runner) | the model-side effect is assumption A-01 in the PRD, outside this slice's verification | NOT VERIFIABLE |

## Findings

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-01 | Low | FR-02, NFR-04 (carried: `codereview_02/CR-01`, accepted by AUTO-11) | in an empty git repo: `node dist/src/cli/main.js init --yes --harness claude-code --snapshot-command /sdd-snapshot` | The error says what happened, which file or flag, and how to fix it; for the flag the PRD asks for "the same" as the config case, so it should name `--snapshot-command` along with `snapshot.command` and `sdd-snapshot` | stderr is `[ERROR] INVALID_ARGUMENTS: Invalid snapshot option: snapshot.command "/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot.` It names the key and the bare name but neither the flag `--snapshot-command` / `--resume-command` nor the file. Exit code 64 and nothing written are correct. Suspected area: `src/core/services/snapshot-merge.ts:23` (message), `src/cli/init-arguments.ts` | `evidence/s1-init-rejections.json` |

Observations that are not findings:

- The hook path for an invalid stored config prints only `ContextBrake: INVALID_CONFIG` on stderr and logs `InvalidConfigurationError snapshot.command` to `.context-brake/runtime/errors.jsonl`; the file and fix text appear in `doctor`. The TechSpec defines this as the failure policy ("the tool call proceeds and the error is logged"), so it is recorded, not reported.
- Argument `-a` passed as a separate token is intercepted by the argument parser with its own message (exit 64); with `--snapshot-command=-a` it reaches the name rule and is rejected. Both reject.

## Previous findings (re-run only)

Not a re-run after corrections. For reference, the four reservations of `codereview_02` are CR-01 (this report's BUG-01, reproduced), CR-02 (no stored-config test: covered here end to end, OBJ-03 PASSED), CR-03 (per-harness exact text: covered here end to end for five harnesses), CR-04 (test file length: not a QA matter).

## Limitations and open items

- Linux, macOS, and Node 20 were not run; Windows 11 with Node v24.20.0 only. No shell or path-dependent code was added (NFR-03), so the risk is low.
- OpenCode, Pi, and Oh-My-Pi run inside their host processes and cannot be driven as a built hook here. Their forms (`use the sdd-snapshot skill`, `/skill:sdd-snapshot`, `use the sdd-snapshot skill`) are proven by `tests/integration/skill-invocations.test.ts` (resolver and descriptor identity), by the built `doctor` output above, and by the format strings present in the built bundles `opencode-plugin.js`, `pi-extension.js`, and `omp-extension.js`. Their guidance text in a live host was not run.
- Antigravity CLI resume text after a real reset was not reproduced; only the zone action through `PreInvocation` was.
- The interactive wizard (TTY) and the printed equivalent-command replay are covered by in-process scripted tests only (TC-06, TC-07); the built CLI has no non-TTY route to them.
- `context-brake init` was never run against this repository. One exploratory `init` (Claude Code and Codex CLI, in a temporary git repo) ran before the isolated HOME was added to the driver and used the real user environment; it reported only project-level paths in its plan, and the modification times of `~/.claude/settings.json` (11:25) and `$CLAUDE_CONFIG_DIR/settings.json` (09:27) predate it. All recorded evidence comes from later runs with isolated HOME variables.
- `ASSET_OUTDATED` in this repository's `doctor` is open thread O-02 (AUTO-10), not a defect of this slice.
- The snapshot was loaded through the independent-stage filter (header, next step brief, open threads); it predates the corrections and no entry was relied on.
- The worktree was checked before and after: `git status --porcelain` identical (83 paths); build, coverage, and test outputs are in ignored folders. Only `qa_01/` was added.

## Conclusion

The slice does what the PRD asks end to end on Windows. The built `init` stores bare names and accepts the `plugin:name` form. The old format and every other malformed value are rejected with exit 64 and no file written. A stored old-format value is reported by `doctor` with the key, the bare name, and the file. The five process-hook harnesses render the right form at RED and CRITICAL and in the resume text. `doctor` text and JSON list the name and the eight per-harness forms, and the JSON and config validate against the regenerated published schemas. The repository's own configuration and docs use bare names, with TC-09 empty and no doctor error. All gates pass. The one failed acceptance criterion is the FR-02 wording for the flag path: the message does not name `--snapshot-command` (BUG-01, Low), which matches the reservation the review accepted as AUTO-11. Because the contract rejects on any `BUG-NN`, the status is REJECTED; the correction is a one-line message change and the affected scenarios (the `s1` runs) need a re-run after it.
