# QA report — Manual handoff command in Claude Code (PRD-21)

## Summary

- Status: BLOCKED
- Execution: delegated QA runner
- Code state: `c17fd0a23ed18791ed995e3babaac77314267334` plus the working tree (13 modified tracked files, `.gitignore`, and 9 untracked code and test files, the same list as `codereview_03`). `git status --porcelain` had the same 24 entries before and after this run (`evidence/git-status-before.txt`, `evidence/git-status-after.txt`). No changed code file is newer than `codereview_03/codereview.md` (latest code file 19:00:03; review 19:13:06).
- Latest review: `codereview_03/codereview.md` (APPROVED WITH RESERVATIONS; reservations finalized by AUTO-08)
- Previous QA: `qa_02/qa.md` (REJECTED, BUG-01; correction `qa_02/done/task_06.md`)

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0 (npm 11.19.0) |
| Platforms | Windows 11 Pro 10.0.26200, Git Bash. Claude Code 2.1.306 for `claude plugin validate` and `claude plugin test` (no interactive session). Linux and macOS did not run |
| Build command | `npm run build` (exit 0). Also `npm run lint`, `npm run typecheck`, `npm run schemas:check` (exit 0 each, `evidence/*.exit.txt`) |
| Fixtures | No fixture repository exists under `tests/fixtures/` for this flow. QA used a new `git init` repository in the scratchpad (`qa3-repo`, outside the worktree) with a user `CLAUDE.md` (CRLF) and a user `.gitignore`. `HOME`, `USERPROFILE`, and `CLAUDE_CONFIG_DIR` pointed to a scratchpad folder. The kit probe ran on a copy of the installed plugin folder (`qa3-kit`) |
| Sources | `prd.md` sha256 `4ed9669b…`, `techspec.md` `715550dc…`, `tasks.md` `c31a4836…`: equal to `checkpoint.json` `approved_sources`. The TechSpec hash differs from the one in `codereview_03` (`d0884d23…`) because R-09 changed only the "Risks" text after the review |
| Snapshot | `context-snapshot.md` loaded with the independent-stage filter (header, next step brief, open threads, `on-run` L-01..L-03). The header says `covers_through: qa_01`; the stage source shows `qa_02`, T06, and `codereview_03`. The snapshot is behind, so this run treated it as hints only |

## Acceptance checklist

Kit probe = `claude plugin test` on the installed bundle, scenarios P1..P5 (`evidence/kit-probe-run.txt`, test file `evidence/kit-probe-handoff.test.ts.txt`). Suites = `evidence/vitest-feature-suites.txt` (13 files, 102 tests, exit 0). E2E-01 = built `init` in the temporary repository.

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 | TC-07, TC-08, TC-16; MA-01 | end-to-end (E2E-01 validator, kit probe registration) + integration; live typeahead manual | PASSED (bundle); live part NOT VERIFIABLE | `evidence/e2e01-validate-plugin.stdout.txt` (`command.run{command=?}`, `$.command.register`), `evidence/e2e01-checks.txt` (spec text in bundle) |
| FR-02 | MA-02 | manual | NOT VERIFIABLE | — |
| FR-03 | TC-09; BUG-01 test | end-to-end (kit probe P1, P2) + integration | PASSED | P1: accepted line; 0 submits at hook return and at 50 ms; 1 `prompt.submit` with the exact prompt by 500 ms; guard written `{ consecutive: 0, toolCallsSinceSeed: null }` from 2; no handoff file write. The "no `command.run` of `clear`" part was not instrumented in the probe and rests on TC-09 |
| FR-04 | TC-01, TC-04 | end-to-end (kit probe P1, P3) + unit | PASSED | Snapshot prompt `… Do this now: run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET].`; handoff prompt `… save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]. …`; neither starts with `/` |
| FR-05 | TC-03, TC-10; MA-05 | end-to-end (kit probe P4) + integration; live part manual | PASSED (bundle); MA-05 NOT VERIFIABLE | P4: off line, 0 submits, guard unchanged |
| FR-06 | TC-03, TC-11 | end-to-end (kit probe P5) + integration | PASSED | P5: `SKIP_DISABLED_ENV` notice as `{ text }`, 1 log record `SKIP_DISABLED_ENV`, 0 submits, 0 `ui.log`, guard unchanged. Other stand-down cases by TC-11 |
| FR-07 | TC-02 | end-to-end (kit probe P2, P3) + unit | PASSED | `"  the parser\n  bug QA3MARK  "` → `"the parser bug QA3MARK"`; 600 characters → 500 |
| FR-08 | TC-12 | integration | PASSED | Suites (`claude-mod-handoff-restart`, 7 tests) |
| FR-09 | TC-13 | integration | PASSED | Suites |
| FR-10 | TC-09, TC-11, TC-14 | end-to-end (kit probe P1, P4, P5) + integration | PASSED | Reset only on submit in P1; unchanged in P4, P5; TC-14 at the limit in suites |
| FR-11 | TC-07; MA-03 | end-to-end (bundle has 0 `immediate`) + integration; live queue manual | PASSED (spec); live part NOT VERIFIABLE | `evidence/e2e01-checks.txt` |
| FR-12 | TC-16, TC-17 | end-to-end + review | PASSED | `evidence/schemas-check.exit.txt`; `evidence/tc17-diff-readme.txt` (no diff in `schemas/`, `src/cli/assistant/`, `src/core/contracts/`, `package.json`); P5 log code is an existing code |
| FR-13 | TC-16 | review | NOT VERIFIABLE (pending by DEC-09, A-02) | `plugin.json` version `1.2.0` in `evidence/e2e01-checks.txt` |
| FR-14 | TC-17 | review | PASSED | `evidence/tc17-diff-readme.txt` (README line 298; no diff in `src/cli/assistant/`) |
| NFR-01 | TC-16 | end-to-end (validator) + integration | PASSED | `evidence/e2e01-validate-plugin.stdout.txt`: calls only `$.command.register`, `$.clock.after`, `$.prompt.submit`, and members that existed before |
| NFR-02 | TC-15 | end-to-end (kit probe P2) + integration | PASSED | No written file contains the focus marker `QA3MARK` or `/handoff` |
| NFR-03 | TC-01 | unit + review | PASSED | Suites; `npm run lint` exit 0 |
| NFR-04 | TC-05, TC-06; MA-04 | integration; live timing manual | PASSED (in process); live part NOT VERIFIABLE | Suites (`claude-mod-seed-switch`, 7 tests) |
| NFR-05 | TC-15 | integration | PASSED | Suites. The kit negative control shows the timer-path rejection handler: a refused submit gives the `ERROR_INTERNAL` notice and no uncaught error |
| NFR-06 | TC-09..TC-11 | end-to-end (kit probe P1, P4, P5) | PASSED | Every line starts with `ContextBrake: `, in English |
| NFR-07 | DEC-04, TC-08 | end-to-end on Windows; other platforms and versions manual | NOT VERIFIABLE (Linux, macOS, P-05) | — |
| OBJ-01, OBJ-04 | MA-01, MA-04 | manual | NOT VERIFIABLE | — |
| OBJ-02, OBJ-03 | TC-12, TC-10, TC-11 | end-to-end (kit probe P4, P5) + integration | PASSED | `evidence/kit-probe-run.txt`, suites |

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Build | worktree | `npm run build` | 0 | PASSED | `evidence/build.*` |
| QA-E2E-01 init | `qa3-repo` | `node D:/MyProjects/ContextBrake/dist/src/cli/main.js init --harness claude-code --auto-restart --yes` | 0 | PASSED: mod bundle installed, byte-equal to `dist/assets/runtime/claude-code-mod.mjs` (sha256 `1b884d13…`); `CLAUDE.md` byte-equal (sha256 before = after); user `.gitignore` lines kept, marked block added | `evidence/e2e01-init.*`, `evidence/e2e01-checks.txt`, `evidence/e2e01-preimage.sha256` |
| QA-E2E-01 validate (plugin folder) | same | `claude plugin validate .context-brake/claude-mod/context-brake-restart` | 0 | PASSED: "Validation passed"; hooks include `command.run{command=?}`. Directory-catalog notes (README, LICENSE, icon) do not apply to a local mod | `evidence/e2e01-validate-plugin.*` |
| QA-E2E-01 validate (TechSpec path) | same | `claude plugin validate .context-brake/claude-mod` | 0 | PASSED (marketplace manifest only) | `evidence/e2e01-validate-marketplace.*` |
| QA-E2E-01 doctor | same | `NO_COLOR=1 node …/main.js doctor` | 1 | PASSED: WARN with `AUTO_RESTART_NOT_LOADED`, `CONTEXT_MOD_SILENT` (no session loaded the mod yet); no finding for the command | `evidence/e2e01-doctor.*` |
| QA-E2E-01 doctor JSON | same | `node …/main.js doctor --json` | 1 | PASSED: JSON parses; `schemaVersion` 1; codes `AUTO_RESTART_NOT_LOADED`, `CONTEXT_MOD_SILENT`, `AUTO_RESTART_HANDOFF` (same as `qa_01`) | `evidence/e2e01-doctor-json.*` |
| Bundle checks | installed bundle | `sha256sum`, `cmp`, `grep -cE "from ['\"]node:\|readFileSync\|…\|process\.env\|process\.stdout"`, `grep -c immediate` | 0 | PASSED: byte-equal to `dist`; 0 forbidden hits; 0 `immediate` | `evidence/e2e01-checks.txt` |
| BUG-01 regression: kit probe P1..P5 | copy of installed plugin folder | `claude plugin test .` (Claude Code 2.1.306; timers on `mock.clock`, advanced 50 ms and 500 ms) | 0 | PASSED: 5 of 5 | `evidence/kit-probe-run.txt`, `evidence/kit-probe-handoff.test.ts.txt` |
| BUG-01 negative control | same copy, `submitAfterCommand` changed to a direct submit (pre-T06) | `claude plugin test .` | 1 | Expected failure: P1..P3 fail with 0 submits and the `ERROR_INTERNAL` notice in `ui.log`; P4, P5 pass. The kit enforces the host check, so the P1 pass is meaningful | `evidence/kit-probe-control-direct-submit.txt` |
| Feature suites | in process | `npx vitest run tests/unit/manual-handoff.test.ts tests/unit/zone-guidance.test.ts tests/unit/auto-restart-policy.test.ts tests/integration/claude-mod tests/integration/mod-reading-git-status.test.ts` | 0 | PASSED: 13 files, 102 tests | `evidence/vitest-feature-suites.txt` |
| Full coverage, run 1 | in process | `npm run coverage` (ran in parallel with the kit probes) | 1 | 291 of 292 files passed; 1577 passed, 1 failed, 1 skipped. The failure is `tests/integration/node-process-runner.test.ts` (IT-13, CA-16), outside this feature, with no diff from the base | `evidence/coverage.*` |
| Failed test alone | in process | `npx vitest run tests/integration/node-process-runner.test.ts` | 0 | PASSED: 8 of 8 | `evidence/rerun-node-process-runner.txt` |
| Full coverage, run 2 | in process | `npm run coverage` (no parallel load) | 0 | PASSED: 292 files; 1578 passed, 1 skipped; 96.38% statements, 93.35% branches; 177.1 s | `evidence/coverage-rerun.*` |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| QA-E2E-01 | delegated QA runner | See End-to-end runs | PASSED |
| MA-01 live `/handoff`, snapshot turn, `/clear`, seed | not run (needs a person in an interactive Claude Code session) | — | NOT VERIFIABLE |
| MA-02 `/handoff` after a restart | not run | — | NOT VERIFIABLE |
| MA-03 `/handoff` typed during a turn | not run | — | NOT VERIFIABLE |
| MA-04 seed is the first prompt of the new session; timing | not run | — | NOT VERIFIABLE |
| MA-05 `/handoff` without `autoRestart` | not run | — | NOT VERIFIABLE |

## Findings

No `BUG-NN` in this run.

Observation, not a finding: the validator lists `gating hook without .catch: command.run{command=?}` (also for `tool.call` and `prompt.submit`). The command hook catches every error inside `runHandoffCommand`, and the validation passed.

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| qa_02/BUG-01 | resolved (in the kit; live confirmation stays with MA-01) | Kit probe P1 on the bundle that the built `init` installed: `$.command.run({ command: 'handoff' })` answers the accepted line; 0 submits at hook return and at 50 ms; 1 `prompt.submit` with the exact prompt by 500 ms; no `ui.log` line and no `ERROR_INTERNAL` record. The negative control with the pre-T06 direct submit reproduces BUG-01 in the same kit (0 submits, `ERROR_INTERNAL` notice) |

## Limitations and open items

- MA-01..MA-05 are essential manual acceptance (TechSpec, Test approach). They need a person in an interactive Claude Code 2.1.287+ session after `init` again with the rebuilt package. FR-02, the live parts of FR-01, FR-05, FR-11, NFR-04, and OBJ-01 and OBJ-04 stay open.
- FR-13 is pending by DEC-09, AUTO-03, and A-02 until the next release bump; `MOD_VERSION` and `plugin.json` are `1.2.0`.
- NFR-07: only Windows ran. Linux and macOS did not run. The first Claude Code version with `$.command.register` and `$.clock.after` is unknown (P-05).
- Full coverage run 1 had 1 failed test in `tests/integration/node-process-runner.test.ts` (IT-13, CA-16; not in this feature's diff). It ran in parallel with `claude plugin test` child processes and passed alone (8 of 8). It is a load-sensitive test outside this feature, not a PRD-21 finding. Full run 2 without parallel load passed (292 files, 1578 tests).
- The `qa_01` E2E-02 bundle driver (25 scenarios with the host fake) did not run again. T06 changed only the command submit path; the restart path (FR-08, FR-09, NFR-04) rests on the in-process suites of the same code state. The kit probe did not drive `turn.complete` or `/clear`.
- `doctor --json` was parsed and its codes compared; strict JSON Schema validation did not run. `npm run schemas:check` passed and `schemas/` has no diff from the base.
- `context-snapshot.md` is behind (`covers_through: qa_01`); it was loaded as hints with the independent-stage filter.
- `.gitignore` in the diff comes from an `init` run in the repository (as `codereview_03` noted); this run did not judge it.
- `doctor` exits 1 on a fresh install because of 2 pre-existing warnings and a hook overhead WARN (577 ms); existing behavior, not this feature.
- During this run ContextBrake reported the RED zone and asked for `sdd-snapshot` and a reset. The delegated QA runner contract forbids a snapshot and the session pause, so the run did not do them.

## Conclusion

No obligation failed. qa_02/BUG-01 is resolved in the `claude plugin test` kit: the installed bundle sends the `/handoff` prompt to `prompt.submit` after the command hook returns, and a negative control proves that the kit detects the old defect. Every obligation that a fixture can represent passed on the built `init`, the validator, `doctor`, the kit probe (5 of 5), and 102 feature tests. Lint, typecheck, schemas check, and build pass. The status is BLOCKED, not APPROVED, because the essential manual scripts MA-01..MA-05 need a person in an interactive Claude Code session, and FR-13 waits for the release bump. Next: `init` again with the rebuilt package, then the user runs MA-01..MA-05 at HIL 3.
