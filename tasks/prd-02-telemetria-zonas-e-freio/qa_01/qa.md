# QA report — PRD 02 Telemetry, zones, and brake

## Summary

- Status: APPROVED
- Code state: `86961bb`
- Latest review: [codereview_09/codereview.md](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/codereview_09/codereview.md)
- Previous QA: —

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.19.0 |
| Platforms | Windows 11 (tested); Linux and macOS (pending remote CI matrix O-04) |
| Build command | `npm run build` |
| Fixtures | `tests/fixtures/harnesses/*`, `tests/fixtures/benchmark`, `tests/fixtures/instructions`, `tests/fixtures/runtime-host` |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| Zonas coerentes | TC-01, TC-02 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| Freio eficaz | TC-15, TC-16, TC-23, TC-27 | end-to-end / unit | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt), [e2e-simulated-long-task.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-simulated-long-task.txt) |
| Medição honesta | TC-11, TC-12, TC-13 | end-to-end / unit | PASSED | [e2e-simulated-usage.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-simulated-usage.txt) |
| Custo baixo por injeção | TC-05, TC-07 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| Overhead contido | TC-22 | integration | PASSED | [runtime-overhead.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/runtime-overhead.txt) |
| Falha previsível | TC-04, TC-17, TC-18 | integration / unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF1 (parallel turn counting) | TC-08 | integration | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF2 (session isolation and persistence) | TC-08, TC-29 | integration | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF3 (session reset and compaction) | TC-09, TC-26 | unit / integration | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF4 (subagent turn counting) | TC-10 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF5 (harness-reported usage) | TC-11 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF6 (local usage estimation) | TC-12, TC-28 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF7 (model window resolution) | TC-11, TC-28 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF8 (usage source recorded) | TC-06, TC-11, TC-12 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF9 (shared zone and ceiling config) | TC-02, TC-31 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF10 (default zone classification) | TC-01 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF11 (boundary validation & equality) | TC-03, TC-31 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF12 (telemetry block delivery) | TC-06, TC-14, TC-33 | unit / integration | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF13 (injection modes & activation threshold) | TC-05 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF14 (original tool output intact) | TC-14 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF15 (versioned & documented block format) | TC-06, TC-07 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF16 (red zone action instruction) | TC-06 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF17 (critical ceiling tool call block) | TC-15, TC-27, TC-32 | end-to-end / unit | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| RF18 (critical allowlist execution) | TC-16, TC-27, TC-30 | end-to-end / unit | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| RF19 (fail-open below, fail-closed above) | TC-04, TC-17, TC-18, TC-32 | integration / unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| RF20 (local block record with metadata only) | TC-20, TC-27 | end-to-end / integration | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| RF21 (cooperative brake mode in doctor) | TC-19, TC-25, TC-27, TC-34 | end-to-end / integration | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| RF22 (reset notice on end-of-response signal) | TC-21, TC-26 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-01 (yellow block at 55% in default mode) | TC-05, TC-27 | end-to-end / unit | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| CA-02 (no block in green below threshold) | TC-05 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-03 (boundary zone classification values) | TC-01 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-04 (custom config matches protocol & classification) | TC-02 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-05 (incoherent zone config rejected) | TC-03 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-06 (3 parallel + 1 isolated = 4 turns) | TC-08 | integration | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-07 (new session/compaction restarts count at 1) | TC-09 | unit / integration | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-08 (subagent counts isolated) | TC-10 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-09 (measured usage matches harness API) | TC-11 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-10 (unmeasured usage marks source=estimated) | TC-12 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-11 (estimate within 10 points of measured) | TC-13 | end-to-end | PASSED | [e2e-simulated-usage.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-simulated-usage.txt) |
| CA-12 (separated context keeps output intact) | TC-14 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-13 (default block ≤ 60 tokens) | TC-07 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-14 (code read denied above critical ceiling) | TC-15, TC-27 | end-to-end / unit | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| CA-15 (save sequence allowed above ceiling) | TC-16, TC-27 | end-to-end / unit | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| CA-16 (failure below passes, above ceiling blocks) | TC-04, TC-17, TC-18 | integration / unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-17 (Codex CLI cooperative diagnosis with reason) | TC-19, TC-27 | end-to-end / integration | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| CA-18 (local block log metadata without content) | TC-20, TC-27 | end-to-end / integration | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| CA-19 (reset signal shows new-session command) | TC-21 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-20 (overhead p95 ≤ 100ms process / ≤ 15ms in-process) | TC-22 | integration | PASSED | [runtime-overhead.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/runtime-overhead.txt) |
| CA-21 (long-task efficacy: 0 forbidden calls, save completes) | TC-23 | end-to-end | PASSED | [e2e-simulated-long-task.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-simulated-long-task.txt) |
| CA-22 (turn-triggered yellow block with green usage) | TC-05 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| CA-23 (turnCeiling mismatch rejected) | TC-03 | unit | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-27 (E2E brake flow, block, deny, save sequence, doctor parity) | Temporary git repos for Claude Code and Codex CLI | `npx vitest run tests/e2e/e2e-brake.test.ts` | 0 | PASSED | [e2e-brake.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-brake.txt) |
| TC-13 (Simulated usage estimation accuracy \|diff\| ≤ 10 points) | Temporary git repo (Claude Code) and in-process mocks (Pi, Oh-My-Pi) | `npx vitest run tests/e2e/e2e-simulated-usage.test.ts` | 0 | PASSED | [e2e-simulated-usage.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-simulated-usage.txt) |
| TC-23 (Long-task efficacy across 100 simulated sessions in 5 full-level harnesses) | Fresh temporary git repos per session (Claude Code, Cursor, Copilot CLI, Pi, Oh-My-Pi) | `npx vitest run tests/e2e/e2e-simulated-long-task.test.ts` | 0 | PASSED | [e2e-simulated-long-task.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/e2e-simulated-long-task.txt) |
| TC-22 (Runtime overhead targets: process p95 ≤ 100ms, in-process ≤ 15ms) | Temporary git repo with pre-seeded ledger and built assets | `npx vitest run tests/integration/runtime-overhead.test.ts` | 0 | PASSED | [runtime-overhead.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/runtime-overhead.txt) |
| TC-24 / QA-08 (Runtime asset bundle import guard) | Built assets and esbuild metafiles | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | 0 | PASSED | [runtime-bundle-imports.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/runtime-bundle-imports.txt) |
| Full regression test suite (146 files, 813 tests) | All fixture repositories and test suites | `npm test` | 0 | PASSED | [full-test-suite.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/full-test-suite.txt) |
| Code coverage check (Statements 93.31% > 80%) | Full test suite under V8 coverage | `npm run coverage` | 0 | PASSED | [coverage.txt](file:///D:/MyProjects/ContextBrake/tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/coverage.txt) |

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| Long-task efficacy & estimation validation (CA-11, CA-21) | Deterministic harness simulator (TechSpec DEC-19, line 264) | 100 simulated long-task sessions across 5 full harnesses and 16 usage accuracy scenarios verified with 0 unallowlisted calls and error margin bounded by 5 points | PASSED (automated simulation) |

## Findings

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

No defects or acceptance criteria failures were found.

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| — | Initial QA run | — |

## Limitations and open items

- Platform execution: Local QA was executed on Windows 11 / Node.js 24.19.0. Final verification across Linux and macOS with Node 20, 22, and 24 is tracked under open thread O-04 for remote CI matrix validation.
- Live harness execution: Per PRD and TechSpec DEC-19 ("Verificação por simulação"), long-task acceptance is conducted deterministically by the harness simulator driving the built CLI and assets against documented vendor payloads without external network, credentials, or live human interaction. Undocumented payload captures remain fixture-gated where noted in [harness-integrations.md](file:///D:/MyProjects/ContextBrake/docs/research/harness-integrations.md) (OI-03, OI-04, OI-05).
- Cursor CLI write payload: Cursor vendor documentation does not specify a distinct file-write payload structure; above-ceiling file modifications are asserted denied in test suites as documented in `task_09.md#Handoff`.
- Prior code review reservations: Three non-blocking Low reservations remain documented from code review (`codereview_01/CR-01` schema `required: brake`, `codereview_02/CR-02` / `codereview_09/CR-01` generic error in test helper, and `codereview_09/CR-02` 106 physical lines in `e2e-brake.test.ts`). None constitutes an acceptance failure or defect.

## Conclusion

PRD-02 (Telemetry, zones, and brake) has achieved full implementation and verification across all 22 Functional Requirements (`RF1`–`RF22`) and all 23 Acceptance Criteria (`CA-01`–`CA-23`). The deterministic harness simulator proves that context usage estimation is bounded within 5 percentage points (well within the 10-point threshold), the complete brake workflow (GREEN → YELLOW → RED → CRITICAL) correctly blocks unallowlisted actions while preserving checkpoint/git state saving, doctor diagnoses cooperative harnesses with full text and JSON parity, and 100 simulated long-task sessions executed without a single out-of-allowlist call at or above the critical ceiling. All 813 test cases pass with 93.31% statement coverage, and all quality checks (build, lint, typecheck, schemas, assets, packaging, overhead) are clean.

Status is **APPROVED**.
