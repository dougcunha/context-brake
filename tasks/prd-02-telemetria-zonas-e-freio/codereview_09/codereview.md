# Code review report — PRD 02 Telemetry, zones, and brake (Task T09)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `4a9f5fe..working tree` (uncommitted T09 diff: 8 new test and support files, plus updated `task_09.md` and `context-snapshot.md`). No `--base` argument was provided; the scope is delimited by the handoff and the worktree, as recorded under Limitations.
- Previous review: `tasks/prd-02-telemetria-zonas-e-freio/codereview_08/codereview.md` (`APPROVED WITH RESERVATIONS`; carried `codereview_01/CR-01` and `codereview_02/CR-02`, and added optional improvements `codereview_08/CR-01`, `CR-02`, `CR-03`)

T09 delivers the deterministic harness simulator and three end-to-end acceptance suites (`e2e-simulated-usage.test.ts`, `e2e-brake.test.ts`, and `e2e-simulated-long-task.test.ts`). The simulator drives both in-process extensions (Pi and Oh-My-Pi) with `o200k_base`-backed token context usage and process hooks (Claude Code, Codex CLI, Cursor, and GitHub Copilot CLI) using documented payloads in temporary Git repositories without network, external dependencies, or real credentials. All obligations and acceptance criteria are met on Windows 11 / Node 24. Two new Low reservations are recorded (QA-10 generic error throw in test helper; QA-11 106 physical lines in `e2e-brake.test.ts`), and the multi-platform CI matrix remains open (O-04). No blocking quality-profile hit and no non-conformant obligation was found.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02-telemetria-zonas-e-freio/prd.md` | read in full (RF1-RF22, CA-01-CA-23) |
| TechSpec | `tasks/prd-02-telemetria-zonas-e-freio/techspec.md` | read in full (DEC-01-DEC-19, CMP-01-CMP-27, TC-01-TC-34, quality profile, terrain baseline) |
| Manifest | `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` | read in full; T09 link, dependencies, and state verified |
| Task and Handoff | `tasks/prd-02-telemetria-zonas-e-freio/task_09.md` | read in full; T09.1-T09.5 checked, handoff complete |
| Context snapshot | `tasks/prd-02-telemetria-zonas-e-freio/context-snapshot.md` | header, next-step brief, open threads (O-02, O-04, O-05, O-06, O-07), and on-run entries applied |
| Prior reviews | `tasks/prd-02-telemetria-zonas-e-freio/codereview_01` to `codereview_08` | read for carried findings |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests,harness-adapters,file-changes,cli-output}.md` | applied |
| Implementation | T09 files: `tests/support/harness-simulator/{scenarios,agent-profiles,process-driver,in-process-driver,session-recorder}.ts`, `tests/e2e/{e2e-simulated-usage,e2e-brake,e2e-simulated-long-task}.test.ts` | delimited |
| SDD bookkeeping | `tasks/prd-02-telemetria-zonas-e-freio/{context-snapshot,task_09}.md` | updated by the implementer, not reviewed as code |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| T09.1 | Implement `scenarios.ts` and `agent-profiles.ts` with simulated sessions and agent behaviors | `tests/support/harness-simulator/{scenarios,agent-profiles}.ts` | consumed by all 3 E2E suites | conformant | Catalog of 20 profiles, 4 corpora (code, json, log, prose), 128k/200k windows, compliant/ignores/operator/compaction/subagent/failure profiles |
| T09.2 | Implement `process-driver.ts` and `in-process-driver.ts` with built CLI install, hook execution, and extension mock | `tests/support/harness-simulator/{process-driver,in-process-driver}.ts` | consumed by all 3 E2E suites | conformant | Installs built CLI with `runBuiltCli`; invokes hooks with documented payloads; mocks Pi/Oh-My-Pi API with incremental token sums |
| T09.3 | Implement `session-recorder.ts` and `e2e-simulated-usage.test.ts` asserting \|measured − estimated\| ≤ 10 points | `tests/support/harness-simulator/session-recorder.ts`; `tests/e2e/e2e-simulated-usage.test.ts` | itself (17 tests) | conformant | 16 measured cases pass with max margin ≤ 5 points; Claude Code repeated runs produce identical normalized ledgers |
| T09.4 | Create `e2e-brake.test.ts` asserting GREEN→CRITICAL, block, deny, save sequence, and `doctor` parity | `tests/e2e/e2e-brake.test.ts` | itself (2 tests) | conformant | Yellow block at turn 8, Red at 11, code read denied at 12, save sequence executed, checkpoint committed, doctor report validated with text/JSON parity |
| T09.5 | Create `e2e-simulated-long-task.test.ts` with 20 sessions per full-level harness | `tests/e2e/e2e-simulated-long-task.test.ts` | itself (100 tests) | conformant | 20 sessions each for Claude Code, Cursor, Copilot CLI, Pi, Oh-My-Pi; 0 out-of-allowlist calls above ceiling; checkpoints saved and committed |
| AC1 | Simulator installs built CLI, drives process and in-process harnesses, produces identical ledgers without clock/network | `process-driver.ts`, `in-process-driver.ts`, `session-recorder.ts` | `e2e-simulated-usage.test.ts:83-93` | conformant | Built CLI runs against fresh temporary git repositories; normalized ledgers match across runs |
| AC2 | Every simulated usage reading reports `source=estimated` with measured API value; diff ≤ 10 points | `in-process-driver.ts:66-68`, `e2e-simulated-usage.test.ts:43-47` | `e2e-simulated-usage.test.ts` | conformant | All 16 matrix combinations pass with margin ≤ 5 points; default constants kept |
| AC3 | E2E brake run produces documented block and deny, keeps repo byte-stable, doctor validates with parity | `e2e-brake.test.ts:35-80` | `e2e-brake.test.ts` | conformant | `src/app.ts` and `src/util.ts` byte-stable; `src/generated.ts` absent; doctor passes schema and text/JSON parity |
| AC4 | Long-task sessions execute no out-of-allowlist call at/above ceiling, save sequence completes, checkpoint parses | `e2e-simulated-long-task.test.ts:49-65` | `e2e-simulated-long-task.test.ts` | conformant | All 100 sessions verify zero forbidden calls at/above ceiling, checkpoint valid JSON with `schemaVersion: 1`, commit `checkpoint: step 1` |
| AC5 | Temporary repositories removed per test | `afterEach` and `finally` hooks in all three E2E suites | suites | conformant | `rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })` on every test fixture |
| CA-01 | Yellow session in default mode receives block after tool | `e2e-brake.test.ts:38-39` | `e2e-brake.test.ts` | conformant | Asserted `zone=YELLOW`, `turn=8/12` |
| CA-11 | Estimate stays within 10 percentage points of measured in simulated sessions | `e2e-simulated-usage.test.ts:68-80` | `e2e-simulated-usage.test.ts` (TC-13) | conformant | 16 cases pass across 4 corpora and 2 context windows |
| CA-14 | Above ceiling, code read is not executed and gets instruction | `e2e-brake.test.ts:41,44-47` | `e2e-brake.test.ts` (TC-27) | conformant | `hookSpecificOutput.permissionDecision === 'deny'`, reason contains `tool=Read` and `reason=critical_ceiling` |
| CA-15 | Checkpoint write, validation, git add, and commit execute | `e2e-brake.test.ts:49-51` | `e2e-brake.test.ts` (TC-27) | conformant | All 7 save sequence steps executed; commit subject `checkpoint: step 1` verified |
| CA-17 | Codex CLI appears with cooperative brake and hosted-tools reason | `e2e-brake.test.ts:69-80` | `e2e-brake.test.ts` (TC-27) | conformant | `BRAKE_COOPERATIVE` warning with `Hosted tools such as web search bypass Codex CLI hooks.` |
| CA-18 | Local record shows session, tool, zone, and reason with no tool content | `e2e-brake.test.ts:55-58` | `e2e-brake.test.ts` (TC-27) | conformant | `blocks.jsonl` verified: contains tool and reason, does not contain `app.ts` |
| CA-21 | No out-of-allowlist call above ceiling; every session saves and commits | `e2e-simulated-long-task.test.ts` | `e2e-simulated-long-task.test.ts` (TC-23) | conformant | 100 sessions across 5 harnesses conform |
| RF6, RF7, RF8 | Estimated usage, model window, source recorded | `in-process-driver.ts`, `e2e-simulated-usage.test.ts` | TC-13 | conformant | Verified in ledger assertions |
| RF12 | Deliver telemetry block | `process-driver.ts`, `in-process-driver.ts`, `e2e-brake.test.ts` | TC-27 | conformant | Verified at turn 8 (YELLOW) and turn 11 (RED) |
| RF17, RF18, RF19 | Pre-tool deny above ceiling, allowlist, fail-safe | `agent-profiles.ts`, `e2e-brake.test.ts`, `e2e-simulated-long-task.test.ts` | TC-23, TC-27 | conformant | Deny shape, allowlist execution, and `reason=integration_failure` verified |
| RF20 | Block log without tool content | `session-recorder.ts`, `e2e-brake.test.ts:55-58` | TC-20 (end-to-end) | conformant | Verified in `blocks.jsonl` |
| RF21 | Cooperative mode exposed | `e2e-brake.test.ts:69-80` | TC-19, TC-27 | conformant | Verified for Codex CLI |
| DEC-05, DEC-19 | Token estimation calibration and deterministic harness simulator | `scenarios.ts`, `session-recorder.ts` | TC-13, TC-23 | conformant | Baseline 15,000 / turn 150 calibrated without runtime changes; simulator deterministic |
| DEC-08, DEC-10, DEC-11 | Allowlist, brake mode, doctor findings | `agent-profiles.ts`, `e2e-brake.test.ts` | TC-27 | conformant | Allowlist steps, cooperative doctor finding, exit code 1 verified |
| CMP-26, CMP-27 | Simulator support and acceptance test suites | all 8 files | all 3 suites | conformant | Full acceptance suite suite runs in 146 test files, 813 tests |
| TC-13, TC-20, TC-23, TC-27 | Acceptance test cases | `tests/e2e/e2e-*.test.ts` | vitest | conformant | TC-13 (17 tests), TC-27 (2 tests), TC-23 (100 tests), TC-20 E2E verified |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | All 8 files ≤ 106 lines; functions ≤ 30 lines; no dead comments; constants extracted (`SESSION_TIMEOUT_MS`, `USAGE_TURNS`, `COMMAND_TIMEOUT_MS`, etc.); `eslint .` exits 0 |
| `javascript-typescript.md` | OK | Strict typecheck clean; no `any`; explicit typing on functions; `execFile` with argument array |
| `node.md` | OK | Async child process execution with `execFile` and explicit timeout (`COMMAND_TIMEOUT_MS = 15000`); no synchronous I/O or shell expansion (`shell: true` absent) |
| `tests.md` | OK | Built CLI and built assets executed in fresh temporary directories; cleanup in `afterEach`/`finally`; zero network access; deterministic seed data and mocks |
| `harness-adapters.md` | OK | Documented hook payload shapes (`PreToolUse`, `PostToolUse`, `preToolUse`, `postToolUse`, `preCompact`, `SessionStart`) and response structures respected per harness |
| `file-changes.md` | OK | All file modifications in tests isolated to temporary roots; working tree clean outside test fixtures |
| `cli-output.md` | OK | `doctor` validated for exit code 1 on findings, schema validation on `--json`, and full text/JSON parity |
| Independence rule | OK | This review session did not author or change any code under review; all code was executed and audited independently |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|as any\b\|<any>' <T09 files>` | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <T09 files>` | 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n -U 'catch\s*(...)\s*\{\s*\}' <T09 files>` | 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | Checked; no `src/` files touched in T09 | 0 | OK |
| QA-05 | Synchronous file or process API in runtime modules | blocking | Checked; no runtime modules modified; tests use async `fs/promises` and `promisify(execFile)` | 0 | OK |
| QA-06 | `console.log` or `process.stdout.write` outside response writer | blocking | `rg -n 'console\.log\|process\.stdout\.write' <T09 files>` | 0 | OK |
| QA-07 | `exec`, `execSync`, or `shell: true` in runtime or driving test code | blocking | `rg -n 'execSync\(\|exec\(\|shell:\s*true' <T09 files>` | 0 | OK (`promisify(execFile)` used with argument array) |
| QA-08 | Bundles pulling classic Zod, `jsonc-parser`, `semver`, `node:child_process`, or CLI code | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | 0 of 14 cases fail | OK |
| QA-09 | Clock or randomness in `core` | reservation | Checked; no `core` files modified | 0 | OK |
| QA-10 | Generic `throw new Error(` | reservation | `rg -n 'throw new Error\(' <T09 files>` | 1 (`process-driver.ts:69`) | reservation (`CR-01`) |
| QA-11 | 4+ parameters or `.ts` file above 100 lines | reservation | Line count scan over T09 files | 1 (`e2e-brake.test.ts: 106 lines`) | reservation (`CR-02`) |

- Terrain baseline: applied from the TechSpec (`b9647e9`); baseline hit in `scripts/asset-bundler.ts:70` discounted.
- Hits discounted by baseline: 1
- Reservations accumulated in the feature: 3 (`codereview_02/CR-02` QA-10 test helper; `codereview_09/CR-01` QA-10 `process-driver.ts:69`; `codereview_09/CR-02` QA-11 `e2e-brake.test.ts`).
- Suggested escalation: no trigger fired. Total reservations (3) is well below the 8-reservation threshold; no touched file exceeds 200 lines (max 106 physical / 100 non-blank lines); no repeated symbols or blocks.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| `DEC-05` (estimation calibration) | YES | Tested against 4 corpora and 2 context windows; error margin bounded by 5 points; no runtime descriptor recalibration needed |
| `DEC-06` (block v1, zone actions) | YES | Yellow block at turn 8, Red block at turn 11 asserted in `e2e-brake.test.ts` |
| `DEC-08` (allowlist & fail-safe) | YES | Code reads denied above ceiling; checkpoint, validation, and git status/add/commit allowed; operator traps denied |
| `DEC-10` (brake mode from capabilities) | YES | Claude Code runs in enforced mode; Codex CLI diagnosed as cooperative with hosted-tools limitation |
| `DEC-11` (block log metadata only, doctor) | YES | `blocks.jsonl` contains session/tool/zone/reason without tool parameters; `doctor` exit code 1, text/JSON parity |
| `DEC-19` (deterministic simulator) | YES | Pure deterministic test fixtures, mock APIs, and seeded ledgers; zero reliance on live network or clocks |
| `CMP-26`, `CMP-27` | YES | Simulator modules in `tests/support/harness-simulator/`; suites in `tests/e2e/` |
| `TC-13`, `TC-20`, `TC-23`, `TC-27` | YES | All 4 acceptance test specifications fully covered and passing |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T09 | `tasks/prd-02-telemetria-zonas-e-freio/task_09.md` | COMPLETE | T09.1-T09.5 `[x]`; handoff details simulator design, calibration bounds, test results (119 E2E tests, 813 total), and open items; manifest verified |

## Executed validations

- Profile and scope: deterministic harness simulator and three end-to-end acceptance test suites driving built CLI and built assets in temporary repositories.
- Validated state: `4a9f5fe` + T09 working tree, Windows 11, Node.js 24.19.0; working tree unmodified by tests.
- Reused evidence: none; all commands and test suites were independently executed and verified in this review session.
- Manual acceptance: none; the simulated acceptance suites form the PRD's formal acceptance mechanism.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | builds schemas, assets, and dist |
| `npm run typecheck` | passed | strict TypeScript typechecking |
| `npm run lint` | passed | ESLint rules across entire project |
| `npm run schemas:check` | passed | configuration and diagnostics schemas currency |
| `npm run dependencies:check` | passed | 3 runtime dependencies verified without install scripts |
| `npm run assets:check` | passed | all 9 runtime bundles verified |
| `npm run package:smoke` | passed | verified 315 packaged files, cli help banner |
| `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | passed (14 tests, 786 ms) | QA-08 bundle imports guard |
| `npx vitest run tests/e2e/e2e-simulated-usage.test.ts` | passed (17 tests, 13.1 s) | T09.3, AC2, CA-11, TC-13 |
| `npx vitest run tests/e2e/e2e-brake.test.ts` | passed (2 tests, 28.1 s) | T09.4, AC3, CA-01, CA-14, CA-15, CA-17, CA-18, TC-27 |
| `npx vitest run tests/e2e/e2e-simulated-long-task.test.ts` | passed (100 tests, 129.9 s) | T09.5, AC4, CA-21, TC-23 |
| `npm test` | passed (146 files, 813 tests, 241.9 s) | full project regression suite |
| `npm run coverage` | passed (statements 93.3% > 80% threshold) | coverage requirements |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low (optional) | QA-10 | `tests/support/harness-simulator/process-driver.ts:69` — `if (result.code !== 0) throw new Error(\`context-brake init failed for \${harness}: \${result.stderr}\`);` | Uses generic `Error` constructor in test harness helper | Optional: replace with a specific error class or custom assertion helper |
| CR-02 | Low (optional) | QA-11 | `tests/e2e/e2e-brake.test.ts` has 106 physical lines (100 non-blank lines, passing ESLint `max-lines` config) | Physical line count exceeds 100 lines by 6 lines | Optional: split helper assertions into a dedicated helper module or trim blank lines |

No blocking finding was identified in the T09 diff.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | persistent | `schemas/context-brake.config.schema.json:190` — `brake` still in `required` list; scheduled for post-feature schema generator update |
| `codereview_02/CR-02` | persistent | `tests/unit/protocol-zone-coherence.test.ts:23` — generic `throw new Error` test guard |
| `codereview_08/CR-01` | persistent | `tests/integration/runtime-overhead.test.ts:43-47` — p95 logging and multi-harness overhead measurement |
| `codereview_08/CR-02` | persistent | `assets/runtime/entry.ts` — legacy empty stub remains in package |
| `codereview_08/CR-03` | persistent | `scripts/check-package.ts:17-28` — `docs/telemetry-block.md` missing from smoke checker list |

## Limitations and open items

- No `--base` was provided. Scope was delimited by the uncommitted T09 files against `4a9f5fe` (HEAD).
- CI multi-platform matrix (O-04) is pending: execution was on Windows 11 / Node 24.19.0. Final multi-platform acceptance on Linux/macOS and Node 20/22/24 will validate cross-platform overhead and child process timings.
- As documented in `task_09.md#Handoff`, long-task process sessions seed an 11-turn RED ledger and emit only the post-tool event crossing the ceiling; below-ceiling saves are gated by hook responses.
- Cursor CLI has no documented file-write payload in vendor docs, so above-ceiling file modifications remain asserted denied and recorded as fixture-gated gap (`OI-04`), never silently passed.

## Conclusion

Task T09 completes the implementation and verification requirements for PRD-02's end-to-end acceptance: the deterministic harness simulator accurately replicates process and in-process harness lifecycles, verifies usage estimation within the required 10-point bound across multiple corpora, drives the complete GREEN→CRITICAL brake workflow with full `doctor` parity, and proves long-task efficacy with zero out-of-allowlist executions across 100 simulated sessions. All quality gates (build, lint, typecheck, schemas, assets, packaging, 813 tests, >93% coverage) passed cleanly.

The review status is **APPROVED WITH RESERVATIONS**: two new Low reservations (`codereview_09/CR-01` and `CR-02`) and five persistent prior reservations remain, with the multi-platform CI matrix remaining as an open thread for final feature release.

Because this session authored no code, it may continue into the next SDD stage.
