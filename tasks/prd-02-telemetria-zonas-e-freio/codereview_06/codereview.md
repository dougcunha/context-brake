# Code review report — PRD 02 Telemetry, zones, and brake (Task T06)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `0512615..working tree` (accumulated changes including the five process harness runtimes, capabilities, schemas, thin asset hooks, updated research documentation, fixtures, unit and integration test suites against commit `0512615`)
- Previous review: `tasks/prd-02-telemetria-zonas-e-freio/codereview_05/codereview.md` (`APPROVED WITH RESERVATIONS`, CR-01, CR-02)

Task T06 implementation satisfies all obligations, acceptance criteria, and architectural decisions. All five process harnesses (Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, and Antigravity CLI) now execute the real brake over the shared engine. Each harness received dedicated `runtime.ts` and `capabilities.ts` modules, moving capabilities to a single shared source of truth. Assets in `assets/runtime/` shrank to thin delegates calling `runProcessHook`, while obsolete `assets/runtime/process-hook.ts` was deleted. Claude Code and Codex CLI register `Stop` and render the documented `/clear` or `/new` reset notice only upon the `[REQUEST_SESSION_RESET]` signal. Cursor and Copilot register `preCompact` and reset their session ledgers there. Antigravity registers `PreToolUse` (approved via OI-01 at HIL) and `PostToolUse`, injecting telemetry via `PreInvocation` and replying `{}` to `PostToolUse`. Subagent isolation is enforced in Claude Code via separate ledgers. Tool results are never replaced (`modifiedResult` is never used). Parallel turns are accurately counted across concurrent built hooks. All 637 tests pass across 134 files with 93.49% statement/line coverage and zero new defects.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02-telemetria-zonas-e-freio/prd.md` | read in full |
| TechSpec | `tasks/prd-02-telemetria-zonas-e-freio/techspec.md` | read in full |
| Manifest | `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` | read in full |
| Task & Handoff | `tasks/prd-02-telemetria-zonas-e-freio/task_06.md` | read in full |
| Predecessor tasks | `tasks/prd-02-telemetria-zonas-e-freio/done/task_01.md` through `done/task_05.md` | read in full |
| Previous reviews | `tasks/prd-02-telemetria-zonas-e-freio/codereview_01` through `codereview_05` | read in full |
| Research | `docs/research/harness-integrations.md` | read and updated |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests,harness-adapters,file-changes,cli-output}.md` | read and applied |
| Implementation | 22 harness source/runtime files, 5 hook assets, 2 runtime host files, 15 test suites | delimited |

The reviewable diff for T06 comprises:
- `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}/{runtime,capabilities,schemas,planner,adapter}.ts`
- `src/infrastructure/harnesses/claude-code/claude-merger.ts`
- `src/infrastructure/harnesses/common/{antigravity,codex,cursor}-hooks-updater.ts`
- `src/infrastructure/harnesses/common/runtime-support.ts`
- `src/infrastructure/runtime/{process-hook-host,tool-path-normalizer}.ts`
- `assets/runtime/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}-hook.ts`
- (Deleted) `assets/runtime/process-hook.ts`
- `docs/research/harness-integrations.md`
- `README.md`
- `tests/test-lanes.ts`
- `tests/helpers/{built-hook,harness-payloads,runtime-seed}.ts`
- Unit test suites: `tests/unit/runtime-{claude,codex,cursor,copilot,antigravity}.test.ts`, `tests/unit/claude-runtime-session-key.test.ts`, `tests/unit/adapter-planners.test.ts`, `tests/unit/harness-adapters.test.ts`, `tests/unit/hook-registration-paths.test.ts`, `tests/unit/readme-support-table.test.ts`, `tests/unit/reset-notice.test.ts`, `tests/unit/harness-schemas-process.test.ts`, `tests/unit/brake-mode.test.ts`
- Integration test suites: `tests/integration/runtime-parallel-turns.test.ts`, `tests/integration/runtime-invalid-config.test.ts`, `tests/integration/runtime-failure-policy.test.ts`, `tests/integration/runtime-{codex,cursor,copilot,antigravity}.test.ts`, `tests/integration/{claude-preservation,codex-hook-command-shells,package-assets,antigravity-registration}.test.ts`
- E2E test suites: `tests/e2e/e2e-antigravity-registration.test.ts`
- Fixture updates: `tests/fixtures/harnesses/*`

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF3 | Session reset mapped per harness | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/runtime-*.test.ts`, `tests/integration/runtime-*.test.ts` | conformant | `SessionStart` mapped to `new` (`startup`/`fork`), `compact` (`clear`/`compact`), while `resume` is ignored; Cursor and Copilot reset on `preCompact` |
| RF4 | Subagents isolated | `src/infrastructure/harnesses/claude-code/runtime.ts:25-32` | `tests/unit/claude-runtime-session-key.test.ts`, `tests/integration/runtime-parallel-turns.test.ts:51-68` | conformant | Subagent turn counts recorded in separate ledgers keyed with `subagent:${agent_id}` without polluting parent session |
| RF5-RF8 | Estimated usage from documented payloads | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/runtime-*.test.ts` | conformant | Context usage computed from observed characters and turn counts based on documented payload fields |
| RF12 | Telemetry block injected without modifying output | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/runtime-*.test.ts`, `tests/integration/runtime-copilot.test.ts:22-38` | conformant | `additionalContext` (Claude, Copilot) or `additional_context` (Cursor) or `injectSteps` (Antigravity) used; `modifiedResult` never present |
| RF14 | Original tool output intact | `src/infrastructure/harnesses/*/runtime.ts` | `tests/integration/runtime-copilot.test.ts:34-36` | conformant | Response writer preserves harness-specific payload and never overwrites output content |
| RF17 | Pre-tool deny above ceiling | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/runtime-*.test.ts`, `tests/integration/runtime-failure-policy.test.ts:36-58` | conformant | Deny shape matches harness specification with `reason=critical_ceiling` |
| RF18 | Allowlist honored at CRITICAL | `src/infrastructure/harnesses/*/runtime.ts` | `tests/integration/runtime-failure-policy.test.ts:47-58` | conformant | State files, validation command, and safe git operations proceed even at CRITICAL |
| RF19 | Failure policy below and above ceiling | `src/infrastructure/runtime/process-hook-host.ts:35-51` | `tests/integration/runtime-failure-policy.test.ts:18-34` | conformant | Failure below ceiling allows calls to proceed; failure at CRITICAL enforces allowlist |
| RF21 | Cooperative mode for Codex and Antigravity | `src/infrastructure/harnesses/{codex-cli,antigravity-cli}/capabilities.ts` | `tests/unit/brake-mode.test.ts:21-25`, `tests/unit/readme-support-table.test.ts:22` | conformant | `cooperative` mode derived from `capabilities.ts`; exposed in doctor and README table |
| RF22 | Reset notice on Stop signal | `src/infrastructure/harnesses/{claude-code,codex-cli}/runtime.ts` | `tests/unit/reset-notice.test.ts:41-59`, `tests/integration/runtime-codex.test.ts:38-46` | conformant | `systemMessage` with `/clear` (Claude) and `/new` (Codex) emitted only when trimmed message is `[REQUEST_SESSION_RESET]` |
| CA-06, TC-08 | Built hooks count parallel calls correctly | `assets/runtime/claude-code-hook.ts`, `tests/helpers/built-hook.ts` | `tests/integration/runtime-parallel-turns.test.ts:22-49` | conformant | 3 concurrent hooks + 1 isolated call reports exactly `turn=4/12` |
| CA-07 | Reset events per harness | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/runtime-*.test.ts` | conformant | Verified for `startup`, `clear`, `compact`, `preCompact` |
| CA-08 | Subagents isolated in separate ledgers | `src/infrastructure/harnesses/claude-code/runtime.ts` | `tests/integration/runtime-parallel-turns.test.ts:51-68` | conformant | Subagent turns never alter main session turn count |
| CA-10 | Block delivery per harness | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/runtime-*.test.ts`, `tests/integration/runtime-*.test.ts` | conformant | Delivered via harness-specific metadata fields |
| CA-12 | Original tool output intact | `src/infrastructure/harnesses/*/runtime.ts` | `tests/integration/runtime-copilot.test.ts:34-36` | conformant | No modification of tool outputs |
| CA-14 | Deny payload structure | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/runtime-*.test.ts` | conformant | Exact JSON response formats per harness specification |
| CA-15 | Allowlist paths and commands | `src/infrastructure/harnesses/*/runtime.ts` | `tests/integration/runtime-failure-policy.test.ts:47-58` | conformant | Allowlist bypass verified for read/write on safe targets |
| CA-16 | Fallback on corrupt state | `src/infrastructure/runtime/process-hook-host.ts` | `tests/integration/runtime-failure-policy.test.ts:18-34` | conformant | Handled per failure policy |
| CA-17 | Cooperative brake marked in doctor | `src/infrastructure/harnesses/{codex-cli,antigravity-cli}/capabilities.ts` | `tests/unit/brake-mode.test.ts:21-25` | conformant | Correctly categorized in capabilities and reports |
| CA-18 | Local block records | `src/infrastructure/runtime/process-hook-host.ts` | `tests/integration/runtime-failure-policy.test.ts` | conformant | Blocks written to `blocks.jsonl` |
| CA-19 | Reset notice emitted only on signal | `src/infrastructure/harnesses/{claude-code,codex-cli}/runtime.ts` | `tests/unit/reset-notice.test.ts:41-59` | conformant | Emitted only when signal matches `[REQUEST_SESSION_RESET]` |
| DEC-05 | Character and turn estimation | `src/infrastructure/harnesses/*/runtime.ts` | `tests/unit/runtime-*.test.ts` | conformant | Estimation logic conformant with documented payloads |
| DEC-08 | Allowlist input extraction | `src/infrastructure/harnesses/*/runtime.ts` | `tests/integration/runtime-failure-policy.test.ts` | conformant | File and command args extracted cleanly across harness varieties |
| DEC-09 | Failure policy execution | `src/infrastructure/runtime/process-hook-host.ts` | `tests/integration/runtime-failure-policy.test.ts` | conformant | Safe fail-open below ceiling, fail-closed above ceiling |
| DEC-10 | Brake mode determination | `src/infrastructure/harnesses/*/capabilities.ts` | `tests/unit/brake-mode.test.ts` | conformant | Enforced vs cooperative derived from capabilities |
| DEC-12 | Reset notice delivery | `src/infrastructure/harnesses/{claude-code,codex-cli}/runtime.ts` | `tests/unit/reset-notice.test.ts` | conformant | Reset notice formats conform to spec |
| DEC-13 | Event registrations | `src/infrastructure/harnesses/*/adapter.ts` | `tests/unit/hook-registration-paths.test.ts` | conformant | Registrations aligned with harness lifecycle capabilities |
| DEC-14 | Antigravity PreToolUse and trade-off (OI-01) | `src/infrastructure/harnesses/antigravity-cli/runtime.ts` | `tests/unit/runtime-antigravity.test.ts`, `tests/integration/runtime-antigravity.test.ts` | conformant | PreToolUse registers decision, denies above ceiling, documents auto-approval trade-off |
| CMP-18 to CMP-21, CMP-24 | Process harness runtimes, adapters, schemas, and assets | `src/infrastructure/harnesses/*` | Entire test suite | conformant | Modular ports and adapters structure preserved |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | All touched source, asset, helper, and test files ≤ 100 lines (longest is `process-hook-host.ts` at 66 lines); all functions ≤ 30 lines; 0 comments in source files; parameters ≤ 3; named constants used |
| `javascript-typescript.md` | OK | Strict typecheck clean; 0 `any`; `zod/mini` schemas; immutable patterns; return types declared on all methods |
| `node.md` | OK | Exclusively asynchronous I/O (`fs/promises`); paths constructed with `node:path`; handles `ENOENT` cleanly |
| `harness-adapters.md` | OK | Documented harness events only; non-strict schemas; stdout rule observed (only process-hook-host writes to stdout); failure policy implemented; version gates documented |
| `file-changes.md` | OK | Surgical hook updaters and mergers; idempotency preserved across repeated init/remove cycles |
| `cli-output.md` | OK | Text and JSON outputs render cleanly; empty stdout on silent executions |
| `tests.md` | OK | Tests run against temporary directories cleaned up in `afterEach`; real fixtures preserved; mock timers and stdout spy restored |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|as any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}' <files>` | 0 new of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" <core_files>` | 0 new of 0 | OK (no core changes in T06) |
| QA-05 | Synchronous file or process API in runtime modules | blocking | `rg -n --type ts '\b(readFileSync\|...)\b' <in_process_files>` | 0 new of 0 | OK (all I/O async) |
| QA-06 | `console.log` or `process.stdout.write` outside response writer | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' <hook_files>` | 0 new of 0 | OK (`process-hook-host.ts:29` is the single designated response writer) |
| QA-07 | `exec`, `execSync`, or `shell: true` | blocking | `rg -n --type ts '\bexecSync\(\|\bexec\(\|shell:\s*true' <files>` | 0 new of 0 | OK |
| QA-08 | Runtime bundles pulling heavy dependencies | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | skipped (T08 deliverable; inspected manually for forbidden imports) | OK |
| QA-09 | Clock or randomness in `core` | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' <core_files>` | 0 new of 0 | OK (no core changes in T06) |
| QA-10 | Generic `throw new Error(` | reservation | `rg -n --type ts 'throw new Error\(' <files>` | 0 new of 0 | OK |
| QA-11 | 4+ parameters or file > 100 lines | reservation | Line count and max-params scan | 0 new of 0 (all touched files ≤ 100 lines) | OK |

- Terrain baseline: Applied from TechSpec at `b9647e9`. Target files clean.
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 1 (pre-existing CR-02 from T02; 0 new in T06)
- Suggested escalation: no trigger fired

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| `DEC-05` (Payload character and turn estimation) | YES | Implemented across all 5 `runtime.ts` modules |
| `DEC-08` (Allowlist path and command extraction) | YES | Implemented across all 5 `runtime.ts` modules |
| `DEC-09` (Process hook host failure policy) | YES | Implemented in `process-hook-host.ts` |
| `DEC-10` (Brake mode per harness) | YES | Centralized in `capabilities.ts` per harness |
| `DEC-12` (Reset notice strings and signal) | YES | Verified in Claude Code and Codex CLI runtimes |
| `DEC-13` (Event lifecycle registrations) | YES | Verified in all harness planners, adapters, and schemas |
| `DEC-14` (Antigravity PreToolUse and auto-approval trade-off) | YES | Implemented and approved via OI-01 at HIL |
| `CMP-18` to `CMP-21`, `CMP-24` (Components and ports) | YES | Hexagonal architecture preserved across adapters and runtimes |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T06 | `tasks/prd-02-telemetria-zonas-e-freio/task_06.md` | COMPLETE | All 7 sub-items completed; handoff documented; all acceptance criteria met |

## Executed validations

- Profile and scope: Process harness runtimes, capabilities, schemas, thin asset hooks, built hook execution, failure policies, subagent isolation, parallel turn counters, and reset notices.
- Validated state: Working tree on commit `0512615` (Node v24.19.0, Windows 11, PowerShell 7).
- Reused evidence: None. All checks freshly executed.
- Manual acceptance: Real payloads captured for Claude Code, Codex CLI, and Copilot CLI; documentation-based fixtures for Cursor and Antigravity recorded as gaps (OI-04).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run typecheck` | passed (exit 0) | Strict TypeScript compliance |
| `npm run lint` | passed (exit 0) | Coding standards, QA-01..QA-05 |
| `npx vitest run tests/unit/runtime-*.test.ts tests/integration/runtime-*.test.ts` | passed (13 files, 56 tests, exit 0) | RF3-RF8, RF12, RF14, RF17-RF19, RF21, RF22, CA-06..CA-19 |
| `npm run schemas:check` | passed (exit 0) | Schema currency check |
| `npm run dependencies:check` | passed (3 runtime dependencies, no install scripts) | NFR dependencies check |
| `npm run package:smoke` | passed (294 files, exit 0) | Packaging integrity |
| QA-01..QA-11 profile scans | passed (0 blocking hits, 0 new reservations) | Quality profile QA-01 to QA-11 |

## Findings

No new findings were introduced in Task T06.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | persistent | `schemas/context-brake.config.schema.json:189` — `brake` remains in `required` array due to output semantics in `scripts/generate-schemas.ts`. Scheduled for T08; untouched by T06. |
| `codereview_02/CR-02` | persistent | `tests/unit/protocol-zone-coherence.test.ts:23` — `throw new Error(...)` in test helper guard. Untouched by T06. |

## Limitations and open items

- Real CLI payloads were verified and captured for Claude Code 2.1.273, Codex CLI 0.154.0, and Copilot CLI 1.0.85. Cursor and Antigravity CLI were not locally installed, so their fixtures remain documentation-based (OI-04).
- Antigravity CLI `PreToolUse` registration and support level change to partial with cooperative brake was approved at HIL (OI-01) and recorded in DEC-14.
- Previous findings CR-01 and CR-02 remain open as non-blocking optional reservations.

## Conclusion

Task T06 is approved with reservations (`APPROVED WITH RESERVATIONS`). All obligations, acceptance criteria, and technical decisions are conformant. The full test suite passes with 93.49% statement/line coverage and zero new defects.
