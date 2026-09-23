# QA report — prd-03-plano-checkpoint-e-boot

## Summary

- Status: **REJECTED**
- Code state: `91b4e68` plus the uncommitted implementation and correction worktree recorded in `workflow.md#Baseline-and-pre-existing-changes` (same scope `codereview_03/codereview.md` reviewed)
- Latest review: `codereview_03/codereview.md` (`APPROVED WITH RESERVATIONS`; reservations finalized as accepted open items under `DEC-RES-01`)
- Previous QA: — (first QA run)
- Independence: this session wrote none of the code under test and ran QA after closing the review cycle.

Every acceptance obligation (CA-01–CA-17) verified and passed. The run is `REJECTED` solely on `BUG-01`, a reproducible defect in `plan status` text output found in the CA-03 state, per the status rule "any failed obligation or `BUG-NN`".

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.19.0 |
| Platforms | Windows 11 ran and passed. Linux, macOS, and Node 20/22 did not run; HIL 1 accepted this evidence limit (`workflow.md#Pending-items-for-HIL-1`) |
| Build command | `npm run build` (executed before scenarios; built CLI `dist/src/cli/main.js` and built runtime assets used) |
| Fixtures | `tests/fixtures/harnesses/<harness>/session-start.json` and `pre-compact.json` payload shapes; generated temporary fixture repositories at `%TEMP%\cb-qa-01-cli\*` and `%TEMP%\cb-qa-01-boot\*`, each in its own directory (never a real repository or user-level harness configuration) |
| Reproducible runners | `qa_01/evidence/run-cli-scenarios.ps1`, `qa_01/evidence/run-boot-scenarios.ps1`, `qa_01/evidence/probe.mjs`, `qa_01/evidence/in-process-probe.mjs`, `qa_01/evidence/write-config.mjs`, `qa_01/evidence/validate-plan-status.mjs`, `qa_01/evidence/measure-tokens.mjs` |
| Git | repository available; scenario CA-09/CA-10 used a dedicated temporary repository |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| CA-01 (US1, RF1, RF3) | TC-01 | end-to-end | PASSED | `qa_01/evidence/cli-scenarios.txt` |
| CA-02 (RF2) | TC-02 | end-to-end | PASSED | `qa_01/evidence/cli-scenarios.txt` |
| CA-03 (RF7) | TC-03 | end-to-end | PASSED | `qa_01/evidence/cli-scenarios.txt` (rule named; output defect recorded as `BUG-01`) |
| CA-04 (RF7, RF11) | TC-04 | end-to-end (built hook) | PASSED | `qa_01/evidence/boot-scenarios.txt` |
| CA-05 (US2, US3, RF9) | TC-05 | end-to-end (built hooks + in-process extensions) | PASSED | `qa_01/evidence/boot-scenarios.txt`, `qa_01/evidence/simulated-suites.txt` |
| CA-06 (RF10) | TC-06 | end-to-end | PASSED | `qa_01/evidence/boot-scenarios.txt` |
| CA-07 (RF12) | TC-07 | end-to-end | PASSED | `qa_01/evidence/boot-scenarios.txt`, `qa_01/evidence/ca07-boot.json` |
| CA-08 (RF12, size objective) | TC-08 | end-to-end + unit | PASSED | `qa_01/evidence/ca08-boot.json` (282 tokens measured with `js-tiktoken` `o200k_base`); TC-08 unit case green in the suite |
| CA-09 (RF14) | TC-09 | end-to-end (temp git repository) | PASSED | `qa_01/evidence/boot-scenarios.txt` |
| CA-10 (RF14) | TC-10 | end-to-end (temp git repository) | PASSED | `qa_01/evidence/boot-scenarios.txt` |
| CA-11 (US4, RF15) | TC-11 | end-to-end (simulated agent) | PASSED | `qa_01/evidence/simulated-suites.txt` |
| CA-12 (RF16) | TC-12 | end-to-end | PASSED | `qa_01/evidence/boot-scenarios.txt` |
| CA-13 (US7, RF13) | TC-13 | end-to-end | PASSED | `qa_01/evidence/cli-scenarios.txt` |
| CA-14 (US5, RF17, RF18) | TC-14 | end-to-end | PASSED | `qa_01/evidence/cli-scenarios.txt` |
| CA-15 (US6, RF19, RF20) | TC-15 | end-to-end | PASSED | `qa_01/evidence/cli-scenarios.txt` (JSON validated against `planStatusReportSchema`) |
| CA-16 (RF8) | TC-16 | end-to-end (CLI + boot) | PASSED | `qa_01/evidence/cli-scenarios.txt`, `qa_01/evidence/boot-scenarios.txt` |
| CA-17 (protocol objective) | TC-17 | end-to-end (simulated, 20 sessions per full-level harness) | PASSED | `qa_01/evidence/simulated-suites.txt` |

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| CA-01 | `fx-init` (empty) | `context-brake plan init --task=refactor-auth` | 0 | PASSED | `cli-scenarios.txt` |
| CA-02 | `fx-init` | `context-brake plan init --task=second`, then `--yes` | 2, then 0 | PASSED | `cli-scenarios.txt` (SHA-256 identical after refusal) |
| CA-03 | `fx-bad` (two `IN_PROGRESS`) | `context-brake plan status` | 2 | PASSED with `BUG-01` | `cli-scenarios.txt` |
| CA-04 | `fx-bad` (malformed checkpoint) | built `claude-code` hook `SessionStart` | 0 | PASSED | `boot-scenarios.txt` |
| CA-05 | `fx-main` | built hooks `SessionStart`/`sessionStart`/`preCompact` x claude-code, codex-cli, cursor, github-copilot-cli, antigravity-cli + in-process pi, oh-my-pi | 0 | PASSED (13 checks) | `boot-scenarios.txt` |
| CA-06 | `fx-done` (all complete) | built hooks `SessionStart`, `sessionStart` | 0 | PASSED (empty stdout) | `boot-scenarios.txt` |
| CA-07 | `fx-budget` | built `github-copilot-cli` hook `sessionStart` | 0 | PASSED | `boot-scenarios.txt`, `ca07-boot.json` (199 tokens; constraints intact; checkpoint pointer present) |
| CA-08 | `fx-twenty` (20/20/20) | built `github-copilot-cli` hook `sessionStart` + `measure-tokens.mjs` | 0 | PASSED | `ca08-boot.json` (282 tokens <= 1,000) |
| CA-09 | `fx-git` (side commit deleted from refs) | built `claude-code` hook `SessionStart` | 0 | PASSED | `boot-scenarios.txt` (names recorded and current commit) |
| CA-10 | `fx-git` (tracked file edited) | built `claude-code` hook `SessionStart` | 0 | PASSED | `boot-scenarios.txt` |
| CA-11 | simulated agent suite | `npm test -- e2e-simulated-boot e2e-simulated-long-task --maxWorkers=1` | 0 | PASSED | `simulated-suites.txt` (validation within 3 tool calls before any edit) |
| CA-12 | `fx-plain` (non-repo), then empty `PATH` | built `claude-code` hook `SessionStart` | 0 | PASSED (2 checks) | `boot-scenarios.txt` (`not_repository`, `git_missing`) |
| CA-13 | `fx-protocol` | `context-brake init --yes` then read `docs/context-brake-protocol.md` | 0 | PASSED | `cli-scenarios.txt` |
| CA-14 | `fx-protocol` | `context-brake init --yes` with default config, then `instructCheckpointCommit: false` | 0 | PASSED (2 checks) | `cli-scenarios.txt` |
| CA-15 | `fx-status` (5 steps, 2 completed) | `context-brake plan status --json` and `plan status` with `NO_COLOR=1` | 0 | PASSED | `cli-scenarios.txt`, schema check `VALID` |
| CA-16 | `fx-old`, `fx-oldboot` (schemaVersion 2) | `context-brake plan status`, built `claude-code` hook `SessionStart` | 2, 0 | PASSED | `cli-scenarios.txt`, `boot-scenarios.txt` |
| CA-17 | simulated long-task suite (20 sessions per full-level harness) | `npm test -- e2e-simulated-boot e2e-simulated-long-task --maxWorkers=1` | 0 | PASSED | `simulated-suites.txt` (113/113 tests; valid checkpoint, `checkpoint:` commit, unconditional clean tree per session) |

Suite totals: 2 test files / 113 tests passed for the simulated routes. Earlier in the same code state this session also ran `npm test` (173 files / 966 tests) and `npm run coverage` (173 files / 966 tests, 93.55% statements) green as part of `codereview_03`.

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| — | — | No manual scripts exist in the TechSpec ("Manual: none" in every task verification); simulated sessions are the PRD's accepted verification route ("Verificação por simulação") | not applicable |

## Findings

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-01 | Low | CA-03 state, RF19 status output, `cli-output.md` Messages | In a directory whose `task_plan.json` exists but contains two `IN_PROGRESS` steps (fixture `fx-bad` in `qa_01/evidence/run-cli-scenarios.ps1`), run `context-brake plan status` | The command reports that the file exists but is invalid, naming file, field path, and violated rule, without claiming no plan exists or instructing `plan init` ("Each error says what happened, which file or harness is involved, and how to fix it"; PRD "Mensagens de erro de validação indicam arquivo, caminho do campo e regra violada") | It prints `[OK] No plan exists at task_plan.json. Run 'context-brake plan init --task="<name>"' to create one.` followed by the correct `[ERROR] INVALID_STATE_FILE: State file task_plan.json is invalid: steps must not contain more than one IN_PROGRESS step.` The first line is false (the file exists) and its remediation targets an existing file: refused without `--yes`, and `plan init --yes` would overwrite the fixable plan. Suspected area: `src/cli/output/text.ts:70-73` renders the missing-plan line for any `null` `report.plan`, and `src/core/services/plan-status.ts:18-26` returns `plan: null` for both missing and invalid files (the JSON output distinguishes them correctly via `files.plan.exists`) | `qa_01/evidence/cli-scenarios.txt` (CA-03 block) |

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| — | — | First QA run; no previous `BUG-NN` exists |

## Limitations and open items

- Linux, macOS, and Node 20/22 matrix did not run (accepted evidence limit since HIL 1); affects all obligations' platform reach.
- Pi and Oh-My-Pi delivery verified through their real built extensions loaded in-process in a child process and through documented fixtures; no real local harness installation exists (accepted).
- CA-08 measured 282 tokens (1,006 UTF-8 bytes). The renderer's internal conservative bound counts bytes and never reduces constraints (RF12), so the byte proxy can be exceeded by a few bytes when constraints alone overflow it; the PRD's token requirement (at most 1,000 tokens) is met with wide margin and TC-08 asserts tokens directly.
- CA-11's "uses only the boot content" is modeled by a static simulated agent plus ordering assertions, per the PRD's simulation-based verification.
- RV-01–RV-06 were finalized as accepted open items at the reservations gate (`DEC-RES-01`) and are not QA findings; they remain visible at HIL 3.
- `plan init` interactive decline path (TTY prompt answered no) was not exercised; its non-TTY refusal and `--yes` overwrite paths were.

## Conclusion

All seventeen acceptance obligations were verified end to end against fixture repositories and temporary git repositories with the built CLI and built hooks, and all passed, including the simulated-agent routes CA-11 and CA-17 (113/113) and the compaction channel matrix of CA-05. One reproducible output defect, `BUG-01`, was found in the CA-03 state: `plan status` claims no plan exists and suggests `plan init` while the plan file exists but is invalid, contradicting the correct error finding printed beside it. Under the status rule, any `BUG-NN` makes the run **REJECTED**. The correction round is limited to `BUG-01` (text rendering of the missing-plan state); after corrections, a new review and a new QA run are required in sessions that did not make them.
