# QA report — Manual handoff command in Claude Code (PRD-21)

## Summary

- Status: BLOCKED
- Execution: delegated QA runner
- Code state: `c17fd0a23ed18791ed995e3babaac77314267334` plus the working tree (13 modified tracked files and 9 untracked code and test files, the same list as `codereview_02`); `git status --porcelain` had the same 23 entries before and after this run
- Latest review: `codereview_02/codereview.md` (APPROVED WITH RESERVATIONS; reservations decided by AUTO-06)
- Previous QA: —

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0 (npm 11.19.0) |
| Platforms | Windows 11 Pro 10.0.26200, Git Bash. Linux and macOS did not run. Claude Code 2.1.306 (`claude plugin validate` only; no interactive session) |
| Build command | `npm run build` (exit 0); also `npm run lint`, `npm run typecheck`, `npm run schemas:check` (exit 0 each) |
| Fixtures | No fixture repository exists under `tests/fixtures/` for this flow. QA used a new `git init` repository in the scratchpad (`qa-e2e-01-repo`) with a user `CLAUDE.md` (CRLF) and a user `.gitignore`, and `HOME`, `USERPROFILE`, `CLAUDE_CONFIG_DIR` set to a scratchpad folder. The bundle driver uses the host fake `tests/fixtures/claude-mod-host.ts` and `claude-mod-host-ports.ts` (read only) |
| Sources | `prd.md`, `techspec.md`, `tasks.md` sha256 equal `checkpoint.json` `approved_sources`; `done/task_01..04.md`, `codereview_01/done/task_05.md` read; no `context-snapshot.md` |

## Acceptance checklist

E2E-01 = built CLI `init` in the temporary repository. E2E-02 = the installed bundle `.context-brake/claude-mod/context-brake-restart/hooks/register.mjs` (sha256 equal to `dist/assets/runtime/claude-code-mod.mjs`) driven by the host fake. Suites = `evidence/vitest-feature-suites.txt` (13 files, 101 tests, exit 0).

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 | TC-07, TC-08, TC-16; MA-01 | end-to-end (E2E-01, E2E-02) + integration; live typeahead manual | PASSED (bundle); live part NOT VERIFIABLE | `evidence/e2e02-drive-installed-mod.txt`, `evidence/e2e01-validate-subfolder.stdout.txt`, `evidence/e2e01-checks.txt` |
| FR-02 | MA-02 | manual | NOT VERIFIABLE | — |
| FR-03 | TC-09 | end-to-end (E2E-02) + integration | PASSED | `evidence/e2e02-drive-installed-mod.txt` |
| FR-04 | TC-01, TC-04 | end-to-end (E2E-02, prompt equals `zoneAction` at trigger zone RED) + unit | PASSED | `evidence/e2e02-drive-installed-mod.txt`, `evidence/vitest-feature-suites.txt` |
| FR-05 | TC-03, TC-10; MA-05 | end-to-end (E2E-02) + integration; live part manual | PASSED (bundle); MA-05 NOT VERIFIABLE | `evidence/e2e02-drive-installed-mod.txt` |
| FR-06 | TC-03, TC-11 | end-to-end (E2E-02) + integration | PASSED | `evidence/e2e02-drive-installed-mod.txt` |
| FR-07 | TC-02 | end-to-end (E2E-02) + unit | PASSED | `evidence/e2e02-drive-installed-mod.txt` |
| FR-08 | TC-12 | end-to-end (E2E-02) + integration | PASSED | `evidence/e2e02-drive-installed-mod.txt` |
| FR-09 | TC-13 | end-to-end (E2E-02) + integration | PASSED | `evidence/e2e02-drive-installed-mod.txt` |
| FR-10 | TC-09, TC-11, TC-14 | end-to-end (E2E-02) + integration | PASSED | `evidence/e2e02-drive-installed-mod.txt` |
| FR-11 | TC-07; MA-03 | end-to-end (spec has no `immediate`) + integration; live queue manual | PASSED (spec); live part NOT VERIFIABLE | `evidence/e2e02-drive-installed-mod.txt`, `evidence/e2e01-checks.txt` |
| FR-12 | TC-16, TC-17 | end-to-end + review | PASSED | `evidence/schemas-check.exit.txt`, `evidence/tc17-diff-readme.txt` (empty diff of `schemas`, `src/cli`, `src/core/contracts`, `package.json`), E2E-02 `RESTARTED` |
| FR-13 | TC-16 | review | NOT VERIFIABLE (pending by DEC-09, A-02) | `plugin.json` version `1.2.0` in `evidence/e2e01-checks.txt` |
| FR-14 | TC-17 | review | PASSED | `evidence/tc17-diff-readme.txt` (README line 298; no diff in `src/cli`) |
| NFR-01 | TC-16 | end-to-end (validator) + integration | PASSED | `evidence/e2e01-validate-subfolder.stdout.txt` (`$.command.register`, `command.run{command=?}`, `$.clock.after`) |
| NFR-02 | TC-15 | end-to-end (E2E-02) + integration | PASSED | `evidence/e2e02-drive-installed-mod.txt` (log has no focus marker, no `/handoff`, no prompt text) |
| NFR-03 | TC-01 | unit + review | PASSED | `evidence/vitest-feature-suites.txt`, `evidence/lint.exit.txt` |
| NFR-04 | TC-05, TC-06; MA-04 | integration + E2E-02 (seed after switch at tick 3); live timing manual | PASSED (in process); live part NOT VERIFIABLE | `evidence/vitest-feature-suites.txt`, `evidence/e2e02-drive-installed-mod.txt` |
| NFR-05 | TC-15 | end-to-end (E2E-02) + integration | PASSED | `evidence/e2e02-drive-installed-mod.txt` |
| NFR-06 | TC-09..TC-11 | end-to-end (E2E-02) | PASSED | `evidence/e2e02-drive-installed-mod.txt` |
| NFR-07 | DEC-04, TC-08 | end-to-end on Windows; other platforms and versions manual | NOT VERIFIABLE (Linux, macOS, P-05) | — |
| OBJ-01, OBJ-04 | MA-01, MA-04 | manual | NOT VERIFIABLE | — |
| OBJ-02, OBJ-03 | TC-12, TC-10, TC-11 | end-to-end (E2E-02) | PASSED | `evidence/e2e02-drive-installed-mod.txt` |

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Build | worktree | `npm run build` | 0 | PASSED | `evidence/build.*` |
| QA-E2E-01 init | `qa-e2e-01-repo` | `node D:/MyProjects/ContextBrake/dist/src/cli/main.js init --harness claude-code --auto-restart --yes` | 0 | PASSED: mod bundle written; `CLAUDE.md` byte-equal (sha256 before = after); user `.gitignore` lines kept, marked block added | `evidence/e2e01-init.*`, `evidence/e2e01-files.txt`, `evidence/e2e01-checks.txt`, `evidence/e2e01-gitignore-after.txt` |
| QA-E2E-01 validate (TechSpec path) | same | `claude plugin validate .context-brake/claude-mod` | 0 | PASSED: "Validation passed" (marketplace manifest only) | `evidence/e2e01-validate-techspec-path.*` |
| QA-E2E-01 validate (plugin folder) | same | `claude plugin validate .context-brake/claude-mod/context-brake-restart` | 0 | PASSED: hooks list `command.run{command=?}`; calls `$.command.register (via registerHandoffCommand)`; no error. Directory-catalog notes (README, LICENSE, icon) do not apply to a local mod | `evidence/e2e01-validate-subfolder.*` |
| QA-E2E-01 doctor | same | `NO_COLOR=1 node .../main.js doctor` | 1 | PASSED: WARN with `AUTO_RESTART_NOT_LOADED`, `CONTEXT_MOD_SILENT` (no session loaded the mod yet); no finding for the command | `evidence/e2e01-doctor.*` |
| QA-E2E-01 doctor JSON | same | `node .../main.js doctor --json` | 1 | PASSED: JSON parses, `schemaVersion` 1, codes `AUTO_RESTART_NOT_LOADED`, `CONTEXT_MOD_SILENT`, `AUTO_RESTART_HANDOFF` only | `evidence/e2e01-doctor-json.*`, `evidence/e2e01-doctor-json-schema.txt` |
| Bundle checks | installed bundle | `sha256sum`, `grep -cE 'node:|readFileSync|…|process\.env'`, `grep -c immediate` | 0 | PASSED: same hash as `dist`; 0 forbidden hits; 0 `immediate` | `evidence/e2e01-checks.txt` |
| E2E-02 bundle driver (25 scenarios) | installed bundle + host fake | `npx tsx scratchpad/drive-installed-mod.mts D:/MyProjects/ContextBrake <qa-e2e-01-repo> <scratchpad>` | 0 | PASSED: 25 of 25 | `evidence/e2e02-drive-installed-mod.txt`, script `evidence/drive-installed-mod.mts.txt` |
| Feature suites | in process | `npx vitest run tests/unit/manual-handoff.test.ts tests/unit/zone-guidance.test.ts tests/unit/auto-restart-policy.test.ts tests/integration/claude-mod tests/integration/mod-reading-git-status.test.ts` | 0 | PASSED: 13 files, 101 tests | `evidence/vitest-feature-suites.txt` |

The first run of the E2E-02 driver had 3 failed checks. All 3 were defects of the QA script, not of the product: (1) the check expected `session.start` to return `undefined`, but the hook returns the `next` value; the one-line `ui.log` was correct. (2) The FR-09 fresh case moved the fake clock ahead of the file write, so the file was stale by construction. (3) The NFR-05 case had no guard state, so `resetConsecutive` did no store write and the failure could not occur. After the script corrections, the run gave 25 of 25. The saved evidence is the final run.

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

## Limitations and open items

- MA-01..MA-05 are essential manual acceptance (TechSpec, Test approach; A-03). They need a person in an interactive Claude Code 2.1.287+ session with the rebuilt mod installed by `init`. They block `APPROVED`: FR-02, the live parts of FR-01, FR-05, FR-11, NFR-04, and OBJ-01 and OBJ-04 stay open.
- FR-13 is pending by DEC-09, AUTO-03, and A-02 until the next release bump; `MOD_VERSION` and `plugin.json` are `1.2.0`. Accepted open item for HIL 3.
- NFR-07: only Windows ran. Linux and macOS did not run. The first Claude Code version with `$.command.register` and `$.clock.after` is unknown (P-05).
- E2E-02 drives the built bundle with the in-process host fake. The fake fires `clock.after` at once and does not reproduce the real `/clear` timing or the mod state reset after `session.end`.
- TechSpec text: QA-E2E-01 names `claude plugin validate .context-brake/claude-mod`. That path validates only the marketplace manifest. The hooks module is validated only at `.context-brake/claude-mod/context-brake-restart`. Both ran and passed. The TechSpec text can name the plugin folder.
- `doctor --json` was parsed and its codes compared, but strict JSON Schema validation did not run: the scratchpad script could not load `ajv`. `npm run schemas:check` passed and `schemas/` has no diff from the base.
- This run did not do the full `npm run coverage` again. It ran the feature suites by path (13 files, 101 tests). `codereview_02` ran the full coverage (292 files, 1577 passed) on the same code files. This run found the same `git status` list and the same approved-source hashes.
- `doctor` exits 1 on a fresh install because of 2 pre-existing warnings (no session loaded the mod yet). This is the existing behavior, not a finding of this feature.
- During this run ContextBrake reported the zones RED and CRITICAL and asked for `sdd-snapshot` and a reset. The delegated QA runner contract forbids writing a snapshot and running the session pause, so the run did not do this.

## Conclusion

No obligation failed. Every obligation that a fixture can represent passed: on the installed bundle from the built `init` (25 of 25 scenarios), on `claude plugin validate` 2.1.306, on `doctor`, and on 101 in-process tests from the same code state. Lint, typecheck, build, and schemas check pass. The status is BLOCKED, not APPROVED, because the essential manual scripts MA-01..MA-05 need a person in an interactive Claude Code session, and FR-13 waits for the release bump. Next: the user runs MA-01..MA-05 at HIL 3.
