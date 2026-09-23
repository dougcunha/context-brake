# QA report — prd-03-plano-checkpoint-e-boot

## Summary

- Status: **APPROVED**
- Code state: `ba11fe2664dfb626786d2f05ede1e55d889ec6eb` plus the scoped uncommitted T17 correction (`src/cli/output/text.ts`, `tests/integration/plan-status-command.test.ts`, `tests/e2e/e2e-plan-status.test.ts`; 25 insertions, 4 deletions) — the same scope `codereview_04/codereview.md` approved.
- Latest review: `codereview_04/codereview.md` (`APPROVED WITH RESERVATIONS`; RV-07 finalized as an accepted open item under `DEC-RES-02`)
- Previous QA: `qa_01/qa.md` (`REJECTED` on `BUG-01`; report kept immutable)
- Independence: this session wrote none of the code under test; it authored only the `qa_02/` evidence tooling and this report. CLI QA was authorized at HIL 2 (`DEC-HIL-02`) and released by `DEC-RES-02`.

All seventeen acceptance obligations (CA-01–CA-17) were verified end to end against fixture repositories and a temporary git repository with the rebuilt CLI and rebuilt hooks, and all passed. `qa_01/BUG-01` is resolved: an existing-but-invalid `task_plan.json` is no longer reported as missing and no longer suggests `plan init`, while an absent plan keeps the healthy initialization guidance. Both mandatory commands have a green run in this session on the current code state (`npm test` 173 files / 967 tests; `npm run coverage` 173 files / 967 tests at 93.55% statements). Earlier load-sensitive attempts and their documented, approved degradation paths are recorded under Limitations; they are not acceptance-obligation failures.

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.19.0 |
| Platforms | Windows 11 ran and passed. Linux, macOS, and Node 20/22 did not run; HIL 1 accepted this evidence limit (`workflow.md#Pending-items-for-HIL-1`, `O-07`) |
| Build command | `npm install --ignore-scripts`; `npm run build` (schemas generate, runtime assets, tsc) before every scenario; built CLI `dist/src/cli/main.js` and built runtime assets used throughout |
| Fixtures | Generated temporary fixture repositories under `%TEMP%\cb-qa-02-cli\*` and `%TEMP%\cb-qa-02-boot\*` following the documented payload shapes (`tests/fixtures/harnesses/<harness>/session-start.json`, `pre-compact.json`), plus a dedicated temporary git repository for CA-09/CA-10. Never a real repository or user-level harness configuration |
| Reproducible runners | `qa_02/evidence/run-cli-scenarios.ps1`, `run-boot-scenarios.ps1`, `probe.mjs`, `in-process-probe.mjs`, `write-config.mjs`, `validate-plan-status.mjs`, `measure-tokens.mjs` — lint-clean copies of the `qa_01` runners with strengthened CA-03/T17 assertions and token capture for CA-07/CA-08 |
| Git | repository available; CA-09/CA-10 used the dedicated temporary repository |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| CA-01 (US1, RF1, RF3) | TC-01 | end-to-end | PASSED | `qa_02/evidence/cli-scenarios.txt` |
| CA-02 (RF2) | TC-02 | end-to-end | PASSED | `qa_02/evidence/cli-scenarios.txt` (SHA-256 identical after refusal) |
| CA-03 (RF7) | TC-03 | end-to-end | PASSED | `qa_02/evidence/cli-scenarios.txt` (rule named; invalid plan never reported as missing; no `plan init` guidance) |
| CA-04 (RF7, RF11) | TC-04 | end-to-end (built hook) | PASSED | `qa_02/evidence/boot-scenarios.txt` |
| CA-05 (US2, US3, RF9) | TC-05 | end-to-end (built hooks + in-process extensions) | PASSED | `qa_02/evidence/boot-scenarios.txt` (13 checks plus the DEC-05 exclusion), `qa_02/evidence/simulated-suites.txt` |
| CA-06 (RF10) | TC-06 | end-to-end | PASSED | `qa_02/evidence/boot-scenarios.txt` |
| CA-07 (RF12) | TC-07 | end-to-end | PASSED | `qa_02/evidence/boot-scenarios.txt`, `qa_02/evidence/ca07-boot.json` (199 tokens; constraints intact; checkpoint pointer) |
| CA-08 (RF12, size objective) | TC-08 | end-to-end + unit | PASSED | `qa_02/evidence/ca08-boot.json` (282 tokens with `js-tiktoken` `o200k_base`; 1,006 UTF-8 bytes — byte-proxy nuance under Limitations); TC-08 unit case green in the suite |
| CA-09 (RF14) | TC-09 | end-to-end (temp git repository) | PASSED | `qa_02/evidence/boot-scenarios.txt` (recorded and current commit named) |
| CA-10 (RF14) | TC-10 | end-to-end (temp git repository) | PASSED | `qa_02/evidence/boot-scenarios.txt` (pending changes named) |
| CA-11 (US4, RF15) | TC-11 | end-to-end (simulated agent) | PASSED | `qa_02/evidence/simulated-suites.txt` (validation within 3 tool calls before any edit) |
| CA-12 (RF16) | TC-12 | end-to-end | PASSED | `qa_02/evidence/boot-scenarios.txt` (`not_repository`, `git_missing`) |
| CA-13 (US7, RF13) | TC-13 | end-to-end | PASSED | `qa_02/evidence/cli-scenarios.txt` (complete boot routine in the protocol file) |
| CA-14 (US5, RF17, RF18) | TC-14 | end-to-end | PASSED | `qa_02/evidence/cli-scenarios.txt` (commit instruction on, then off) |
| CA-15 (US6, RF19, RF20) | TC-15 | end-to-end | PASSED | `qa_02/evidence/cli-scenarios.txt` (5 steps, active step 3, both files valid; JSON `VALID` against `planStatusReportSchema`; text labels with `NO_COLOR`) |
| CA-16 (RF8) | TC-16 | end-to-end (CLI + boot) | PASSED | `qa_02/evidence/cli-scenarios.txt`, `qa_02/evidence/boot-scenarios.txt` (migration to schema version 1 named) |
| CA-17 (protocol objective) | TC-17 | end-to-end (simulated, 20 sessions per full-level harness) | PASSED | `qa_02/evidence/simulated-suites.txt` (valid checkpoint, `checkpoint:` commit, unconditional clean tree) |

Suite totals: focused simulated routes 2 files / 113 tests passed. The integrated commands on this code state: `npm test` 173 files / 967 tests passed (388.9 s) and `npm run coverage` 173 files / 967 tests at 93.55% statements / 87.2% branches / 95.44% functions (396.6 s) after the load-sensitive attempts listed under Limitations.

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| CA-01 | `fx-init` (empty) | `context-brake plan init --task=refactor-auth` | 0 | PASSED | `cli-scenarios.txt` |
| CA-02 | `fx-init` | `plan init --task=second`, then `--yes` | 2, then 0 | PASSED | `cli-scenarios.txt` |
| CA-03 | `fx-bad` (two `IN_PROGRESS`) | `context-brake plan status` | 2 | PASSED | `cli-scenarios.txt` (only `INVALID_STATE_FILE` naming the rule; no absence claim, no `plan init`) |
| T17 regression | `fx-noplan` (config only) | `context-brake plan status` | 0 | PASSED | `cli-scenarios.txt` (healthy missing-plan guidance retained) |
| CA-04 | `fx-bad` (malformed checkpoint) | built `claude-code` hook `SessionStart` | 0 | PASSED | `boot-scenarios.txt` |
| CA-05 | `fx-main` | built hooks `SessionStart`/`sessionStart`/`preCompact` × claude-code, codex-cli, cursor, github-copilot-cli, antigravity-cli + in-process pi, oh-my-pi | 0 | PASSED (14 checks) | `boot-scenarios.txt` |
| CA-06 | `fx-done` (all complete) | built hooks `SessionStart`, `sessionStart` | 0 | PASSED (empty stdout) | `boot-scenarios.txt` |
| CA-07 | `fx-budget` | built `github-copilot-cli` hook `sessionStart` + `measure-tokens.mjs` | 0 | PASSED | `boot-scenarios.txt`, `ca07-boot.json` |
| CA-08 | `fx-twenty` (20/20/20) | built `github-copilot-cli` hook `sessionStart` + `measure-tokens.mjs` | 0 | PASSED | `boot-scenarios.txt`, `ca08-boot.json` |
| CA-09 | `fx-git` (side commit removed from refs) | built `claude-code` hook `SessionStart` | 0 | PASSED | `boot-scenarios.txt` |
| CA-10 | `fx-git` (tracked file edited) | built `claude-code` hook `SessionStart` | 0 | PASSED | `boot-scenarios.txt` |
| CA-11 | simulated agent suite | `npm test -- e2e-simulated-boot e2e-simulated-long-task --maxWorkers=1` | 0 | PASSED | `simulated-suites.txt` |
| CA-12 | `fx-plain` (non-repo), then empty `PATH` | built `claude-code` hook `SessionStart` | 0 | PASSED (2 checks) | `boot-scenarios.txt` |
| CA-13 | `fx-protocol` | `context-brake init --yes` then read `docs/context-brake-protocol.md` | 0 | PASSED | `cli-scenarios.txt` |
| CA-14 | `fx-protocol` | `context-brake init --yes` default, then `instructCheckpointCommit: false` | 0 | PASSED (2 checks) | `cli-scenarios.txt` |
| CA-15 | `fx-status` (5 steps, 2 completed) | `plan status --json` and `plan status` with `NO_COLOR=1` | 0 | PASSED | `cli-scenarios.txt` |
| CA-16 | `fx-old`, `fx-oldboot` (schemaVersion 2) | `plan status`, built `claude-code` hook `SessionStart` | 2, 0 | PASSED | `cli-scenarios.txt`, `boot-scenarios.txt` |
| CA-17 | simulated long-task suite (20 sessions per full-level harness) | `npm test -- e2e-simulated-boot e2e-simulated-long-task --maxWorkers=1` | 0 | PASSED | `simulated-suites.txt` (113/113; valid checkpoint, `checkpoint:` commit, unconditional clean tree) |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| — | — | No manual scripts exist in the TechSpec ("Manual: none" in every task verification); simulated sessions are the PRD's accepted verification route ("Verificação por simulação") | not applicable |

## Findings

No blocking findings; no `BUG-NN` in this run. `qa_01/BUG-01` is resolved (see below). The load-sensitive suite attempts recorded under Limitations are the documented, user-approved degradation paths (`DEC-EX-T14`, `DEC-EX-T14B`), not defects in an acceptance obligation.

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — |

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| `qa_01/BUG-01` invalid plan reported as missing | resolved | `cli-scenarios.txt` CA-03 block: `plan status` in `fx-bad` exits 2, writes only `[ERROR] INVALID_STATE_FILE: ... steps must not contain more than one IN_PROGRESS step.` to stderr, and contains neither `No plan exists` nor `plan init`. The added T17 check in `fx-noplan` proves the healthy missing-plan guidance (`[OK] No plan exists at task_plan.json. Run 'context-brake plan init --task="<name>"' to create one.`, exit 0) is preserved. Integration and built-CLI regressions also pass in the suite. |

## Limitations and open items

- **Load sensitivity of the delivery suites (approved degradation, not an obligation failure; owner decision suggested).** Under heavy external machine load on this host (background agent services), the approved time budgets elapsed and the documented fallbacks fired, failing the strict assertions of two suites: `tests/integration/boot-git-delivery.test.ts` returned `Repository checks omitted: inspection_failed.` instead of the divergence (`DEC-EX-T14B` budget path) in `npm test` attempts 1 and 2 (3 and 1 failures), `coverage` attempts 1 and 3 (3 and 2 failures), and the first isolated run (2 of 5); `tests/e2e/e2e-simulated-boot.test.ts` returned `Boot omitted: the internal deadline elapsed.` for Copilot CLI startup (`DEC-EX-T14` safe-omission path) in `coverage` attempt 2 (1 failure). The same code state ran green in this session (`npm test` 173/967; `coverage` 173/967 at 93.55%; isolated `boot-git-delivery` 5/5) and in `codereview_04`; direct built-hook invocations for the affected obligations completed in 0.66–0.84 s and reported the divergences (`manual-hook-timing.txt`), and all CA-05/CA-09/CA-10/CA-12 scenarios passed (`boot-scenarios.txt`, `simulated-suites.txt`). Suggested follow-up: decide whether those two suites should tolerate the approved degradation when a budget expires (assert divergence or the omission) or keep the strict assertions with the documented load characteristic. Raw attempts: `full-suite.txt`, `full-suite-rerun.txt`, `coverage.txt`, `coverage-rerun.txt`, `coverage-rerun-2.txt`, `git-delivery-isolated.txt`, `git-delivery-isolated-2.txt`, `full-suite-rerun-2.txt`, `coverage-rerun-3.txt`.
- **CA-08 byte proxy.** The boot measured 282 tokens (1,006 UTF-8 bytes). The renderer's conservative byte bound (`boot-summary.ts:fitsBudget`) can be exceeded only when constraints alone overflow it, and RF12 forbids reducing constraints; the PRD's token requirement is met with wide margin, and TC-08 asserts tokens directly. The `boot-scenarios.txt` line `[CA-08] FAILED - ... (byte upper bound)` is that proxy assertion, not the acceptance criterion; `[CA-08] PASSED` records the measured token criterion.
- Linux, macOS, and Node 20/22 matrix did not run (accepted evidence limit since HIL 1); affects all obligations' platform reach (`O-07`).
- Pi and Oh-My-Pi delivery verified through their built extensions loaded in-process in a child process and through documented fixtures; no real local harness installation exists (accepted).
- CA-11's "uses only the boot content" is modeled by a static simulated agent plus ordering assertions, per the PRD's simulation-based verification.
- RV-01–RV-07 remain accepted open items under `DEC-RES-01`/`DEC-RES-02` and are not QA findings; they stay visible at HIL 3.
- `npm run lint` remains red on the five `qa_01/evidence/*.mjs` scripts (RV-07); the new `qa_02/evidence/*.mjs` scripts are lint-clean and do not extend that baseline.
- The `plan init` interactive TTY decline path was not exercised; its non-TTY refusal and `--yes` overwrite paths were.

## Conclusion

All seventeen acceptance obligations were verified end to end with the rebuilt CLI and rebuilt hooks against fixture repositories and a temporary git repository, including the simulated-agent routes CA-11 and CA-17 (113/113), the six startup channels and four documented compaction channels of CA-05, and the token budget of CA-07/CA-08. `qa_01/BUG-01` is resolved with current built-CLI evidence: an existing invalid plan now produces only actionable findings, and an absent plan keeps the initialization guidance. Both mandatory commands reached green runs on this code state in this session, and the earlier load-sensitive attempts are fully recorded under Limitations with their approved degradation causes. No acceptance obligation failed and no `BUG-NN` is open; the report is **APPROVED**, with the load-sensitivity follow-up suggested for the owner's decision at HIL 3.
