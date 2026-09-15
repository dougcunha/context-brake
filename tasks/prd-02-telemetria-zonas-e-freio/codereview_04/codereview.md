# Code review report — PRD 02 Telemetry, zones, and brake (Task T04)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `2513088..working tree` (accumulated changes including T04 services, runtime adapters, hosts, unit/integration test suites, and fixtures against commit `2513088`)
- Previous review: `tasks/prd-02-telemetria-zonas-e-freio/codereview_03/codereview.md` (`APPROVED WITH RESERVATIONS`, CR-01, CR-02)

Task T04 implementation satisfies all obligations, acceptance criteria, and architectural decisions. The brake engine evaluates runtime events against turn/token usage, returning `deny` with exact v1 block messages and recording metadata-only entries in `blocks.jsonl` when `CRITICAL`. The allowlist allows reads/writes to plan/checkpoint files, the active step validation command, git safe verbs (`status`, `add`, `commit`), and configured extra commands, while rejecting shell operator chaining (`;`, `&`, `|`, etc.). The failure policy guarantees that failures below the ceiling never block, whereas above the ceiling allowlisted targets remain accessible and non-allowlisted targets receive the failure deny variant with an error record in `errors.jsonl`. Brake mode is accurately derived from capabilities (`enforced` only when both `pre_tool_block` and `tool_coverage` are supported; otherwise `cooperative`). Both runtime hosts—process hook host (one stdout response, 1500 ms deadline, exit 0) and in-process host (async I/O, cache invalidation on reset, zero stdout)—are verified across unit and spawned process integration suites. All 566 tests pass across 120 files with 93.4% coverage and zero new blocking defects.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02-telemetria-zonas-e-freio/prd.md` | read in full |
| TechSpec | `tasks/prd-02-telemetria-zonas-e-freio/techspec.md` | read in full |
| Manifest | `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` | read in full |
| Task & Handoff | `tasks/prd-02-telemetria-zonas-e-freio/task_04.md` | read in full |
| Predecessor tasks | `tasks/prd-02-telemetria-zonas-e-freio/done/task_01.md`, `done/task_02.md`, `done/task_03.md` | read in full |
| Previous reviews | `tasks/prd-02-telemetria-zonas-e-freio/codereview_01/codereview.md`, `codereview_02/codereview.md`, `codereview_03/codereview.md` | read in full |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests,harness-adapters}.md` | read and applied |
| Implementation | 13 source/contract files, 13 test suites, fixture entry, and lane registration | delimited |

The reviewable diff for T04 comprises:
- `src/core/contracts/runtime.ts`
- `src/core/services/{shell-command-matcher,brake-allowlist,block-message,reset-notice,brake-engine,failure-policy,brake-mode}.ts`
- `src/infrastructure/runtime/{plan-validation-reader,tool-path-normalizer,process-hook-host,in-process-host,runtime-composition}.ts`
- `tests/fixtures/runtime-host/host-entry.ts`
- `tests/test-lanes.ts`
- Unit suites: `tests/unit/{brake-allowlist,shell-command-matcher,plan-validation-reader,tool-path-normalizer,brake-engine-pre-tool,brake-engine-lifecycle,failure-policy,brake-mode,reset-notice,process-hook-host,in-process-host,runtime-composition}.test.ts`
- Integration suite: `tests/integration/runtime-host-process.test.ts`

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF17 | Deny above ceiling when zone is CRITICAL with block message and block record | `src/core/services/brake-engine.ts:46-54`, `block-message.ts:17-20` | `tests/unit/brake-engine-pre-tool.test.ts:44-50`, `tests/integration/runtime-host-process.test.ts:41-50` | conformant | Code read at CRITICAL returns deny with exact reason=critical_ceiling text and logs to blocks.jsonl |
| RF18 | Allowlist: plan, checkpoint, validation command, safe git, extra commands | `src/core/services/brake-allowlist.ts:13-21`, `shell-command-matcher.ts:29-34` | `tests/unit/brake-allowlist.test.ts:20-30`, `tests/unit/brake-engine-pre-tool.test.ts:60-73` | conformant | Allowed calls return neutral; chained operators (;&|) and unknown tools denied |
| RF19 | Failure policy: never block below ceiling, keep allowlist usable above it, error log | `src/core/services/failure-policy.ts:51-59`, `process-hook-host.ts:54-60` | `tests/unit/failure-policy.test.ts:35-56`, `tests/unit/process-hook-host.test.ts:68-89` | conformant | 40% returns neutral; CRITICAL fallback denies non-allowlisted read and permits checkpoint/git |
| RF20 | Block record on deny containing metadata only | `src/core/services/brake-engine.ts:52`, `tests/integration/runtime-block-log.test.ts` | `tests/unit/brake-engine-pre-tool.test.ts:48`, `tests/integration/runtime-host-process.test.ts:49` | conformant | Tool name, zone, turn, percentage, source, and reason recorded without tool content |
| RF21 | Cooperative mode derived when pre-tool blocking is unsupported | `src/core/services/brake-mode.ts:8-15` | `tests/unit/brake-mode.test.ts:30-59` | conformant | Enforced only when both pre_tool_block and tool_coverage are supported; cooperative for others |
| RF22 | Reset signal detection and user notice | `src/core/services/reset-notice.ts:3-8`, `brake-engine.ts:77-81` | `tests/unit/reset-notice.test.ts:4-19`, `tests/integration/runtime-host-process.test.ts:72-76` | conformant | Trimmed final [REQUEST_SESSION_RESET] triggers notify_user with descriptor newSessionCommand |
| CA-14 | Deny shape and block message formatting | `src/core/services/block-message.ts:17-23` | `tests/unit/brake-engine-pre-tool.test.ts:47` | conformant | Exact block message matched against contract specification |
| CA-15 | Allowlist execution and chaining rejection | `src/core/services/shell-command-matcher.ts:12-14,29-34` | `tests/unit/brake-allowlist.test.ts:32-40` | conformant | Operator regex catches ;, &, |, `, $(, <, >, CR, LF; multi-path file writes denied |
| CA-16 | Fallback to last recorded zone and default paths | `src/core/services/failure-policy.ts:54-58,68-74` | `tests/unit/failure-policy.test.ts:59-71` | conformant | Invalid configuration falls back to DEFAULT_CONFIG and permits allowlisted commands |
| CA-17 | Mode derivation across harness capability profiles | `src/core/services/brake-mode.ts:8-15` | `tests/unit/brake-mode.test.ts:31-46` | conformant | Claude/Cursor/Copilot/Pi/OhMyPi are enforced; Codex/OpenCode/Antigravity are cooperative |
| CA-19 | Reset notice detection at response end | `src/core/services/reset-notice.ts:3-5` | `tests/unit/reset-notice.test.ts:5-14` | conformant | Mid-text signal ignored; exact trimmed match detected |
| DEC-08 | Allowlist rules, shell matching, path normalization | `src/core/services/brake-allowlist.ts`, `tool-path-normalizer.ts` | `tests/unit/brake-allowlist.test.ts`, `tests/unit/tool-path-normalizer.test.ts` | conformant | POSIX paths relative to project root, symlink parent resolution verified |
| DEC-09 | Failure boundary, fallback decision, error logging | `src/core/services/failure-policy.ts:34-59` | `tests/unit/failure-policy.test.ts:34-95` | conformant | Dedicated error classes, typed error codes, deadline enforcement, errors.jsonl logging |
| DEC-10 | Mode resolution rules | `src/core/services/brake-mode.ts:8-15` | `tests/unit/brake-mode.test.ts:30-59` | conformant | Missing or unknown capability state defaults to cooperative |
| DEC-12 | Reset notice format and detection | `src/core/services/reset-notice.ts:6-8` | `tests/unit/reset-notice.test.ts:15-18` | conformant | Renders user notification naming descriptor command |
| DEC-15 | Process hook host lifecycle, 16 MiB stdin, 1500 ms deadline | `src/infrastructure/runtime/process-hook-host.ts:33-60` | `tests/unit/process-hook-host.test.ts:44-98`, `tests/integration/runtime-host-process.test.ts` | conformant | Valid/error payloads write one response, always exit 0; stdin truncated at cap; deadline handled |
| DEC-18 | Provisional plan reader for validation command | `src/infrastructure/runtime/plan-validation-reader.ts:13-40` | `tests/unit/plan-validation-reader.test.ts:21-41` | conformant | Current step command resolved; fallbacks to IN_PROGRESS and COMPLETED steps; tolerant parse |
| CMP-08 | Services: shell matcher, allowlist, block message, reset notice | `src/core/services/{shell-command-matcher,brake-allowlist,block-message,reset-notice}.ts` | Unit suites (35 tests) | conformant | Pure services in core, zero external dependencies |
| CMP-09 | Brake decision engine | `src/core/services/brake-engine.ts:26-81` | `tests/unit/brake-engine-pre-tool.test.ts`, `tests/unit/brake-engine-lifecycle.test.ts` | conformant | Implements all 5 runtime events, injection policy, and telemetry blocks |
| CMP-10 | Failure policy | `src/core/services/failure-policy.ts:51-81` | `tests/unit/failure-policy.test.ts` | conformant | Categorizes errors, runs within deadline, resolves fallback |
| CMP-11 | Brake mode service | `src/core/services/brake-mode.ts:8-15` | `tests/unit/brake-mode.test.ts` | conformant | Derives mode and explanatory reason from descriptor capabilities |
| CMP-16 | Plan validation reader and tool path normalizer | `src/infrastructure/runtime/{plan-validation-reader,tool-path-normalizer}.ts` | Unit suites (7 tests) | conformant | Async fs/promises, Zod mini schema, path canonicalization |
| CMP-17 | Process hook host, in-process host, runtime composition | `src/infrastructure/runtime/{process-hook-host,in-process-host,runtime-composition}.ts` | Unit suites and spawned integration suite | conformant | Process host exits 0; in-process host caches sessions and avoids stdout |
| TC-15 | Pre-tool deny decision and block record | `src/core/services/brake-engine.ts:46-54` | `tests/unit/brake-engine-pre-tool.test.ts:44-50` | conformant | Exact block string and BlockRecord asserted |
| TC-16 | Allowlist allow/deny matrix | `src/core/services/brake-allowlist.ts` | `tests/unit/brake-allowlist.test.ts:20-40` | conformant | Matrix of file reads/writes, shell verbs, chained commands tested |
| TC-17 | Failure policy tests | `src/core/services/failure-policy.ts` | `tests/unit/failure-policy.test.ts:34-95` | conformant | Below ceiling neutral, CRITICAL deny, default paths, deadline exceeded tested |
| TC-21 | Reset notice tests | `src/core/services/reset-notice.ts` | `tests/unit/reset-notice.test.ts:4-19` | conformant | Positive/negative detection and command formatting verified |
| TC-25 | Brake mode tests | `src/core/services/brake-mode.ts` | `tests/unit/brake-mode.test.ts:30-59` | conformant | Real adapter profiles and synthetic capability definitions verified |
| TC-30 | Plan validation reader tests | `src/infrastructure/runtime/plan-validation-reader.ts` | `tests/unit/plan-validation-reader.test.ts:21-41` | conformant | Step resolution, JSON error tolerance, missing files verified |
| TC-32 | In-process host semantics and cache | `src/infrastructure/runtime/in-process-host.ts` | `tests/unit/in-process-host.test.ts:30-86` | conformant | Stdout spy confirms no writes; reset invalidates cache |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | All touched source files ≤ 100 lines (longest is `process-hook-host.ts` at 100 lines); all functions ≤ 30 lines; 0 comments in source files; parameters ≤ 3; named constants used |
| `javascript-typescript.md` | OK | Strict typecheck clean; 0 `any`; `zod/mini` schemas; dedicated error classes; exhaustive switch statements; explicit return types |
| `node.md` | OK | Exclusively asynchronous I/O (`fs/promises`); no synchronous fs APIs; paths constructed with `node:path`; child process spawned with argument array |
| `harness-adapters.md` | OK | Failure policy handled gracefully without uncaught exceptions; process hook always exits 0; in-process host never writes to stdout |
| `tests.md` | OK | Process-lane suite registered in `tests/test-lanes.ts`; temporary directories created in `beforeEach` and removed in `afterEach` with retry delay |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|as any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}' <files>` | 0 new of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" <core_files>` | 0 new of 0 | OK |
| QA-05 | Synchronous file or process API in runtime modules | blocking | `rg -n --type ts '\b(readFileSync\|...)\b' <in_process_files>` | 0 new of 0 | OK (all I/O async) |
| QA-06 | `console.log` or `process.stdout.write` outside response writer | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' <hook_files>` | 1 expected (`process-hook-host.ts:28` response writer) | OK (permitted response writer) |
| QA-07 | `exec`, `execSync`, or `shell: true` | blocking | `rg -n --type ts '\bexecSync\(\|\bexec\(\|shell:\s*true' <files>` | 0 new of 0 | OK |
| QA-08 | Runtime bundles pulling heavy dependencies | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | skipped (T08 deliverable; no runtime bundle in diff) | OK |
| QA-09 | Clock or randomness in `core` | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' <core_files>` | 0 new of 0 | OK (Clock injected) |
| QA-10 | Generic `throw new Error(` | reservation | `rg -n --type ts 'throw new Error\(' <files>` | 0 in src (mock throw guards in test suites) | OK |
| QA-11 | 4+ parameters or file > 100 lines | reservation | Line count and max-params scan | 0 new of 0 (all files ≤ 100 lines) | OK |

- Terrain baseline: Applied from TechSpec at `b9647e9`. Target files clean.
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 1 (pre-existing CR-02 from T02; 0 new in T04)
- Suggested escalation: no trigger fired

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| `DEC-08` (Allowlist rules, shell matcher, path normalization) | YES | Implemented in `shell-command-matcher.ts`, `brake-allowlist.ts`, `tool-path-normalizer.ts`; tested in `brake-allowlist.test.ts` |
| `DEC-09` (Failure boundary, fallback zone, error logging) | YES | Implemented in `failure-policy.ts`; tested in `failure-policy.test.ts` and `process-hook-host.test.ts` |
| `DEC-10` (Brake mode resolution) | YES | Implemented in `brake-mode.ts`; tested in `brake-mode.test.ts` |
| `DEC-12` (Reset notice detection and format) | YES | Implemented in `reset-notice.ts`; tested in `reset-notice.test.ts` |
| `DEC-15` (Process hook host lifecycle, 16 MiB stdin, 1500 ms deadline, exit 0) | YES | Implemented in `process-hook-host.ts`; tested in unit and spawned integration suites |
| `DEC-18` (Provisional plan reader) | YES | Implemented in `plan-validation-reader.ts`; tested in `plan-validation-reader.test.ts` |
| `CMP-08` to `CMP-11`, `CMP-16`, `CMP-17` (Services, adapters, hosts) | YES | Clean hexagonal architecture; core isolated from node runtime |
| `TC-15`, `TC-16`, `TC-17`, `TC-21`, `TC-25`, `TC-30`, `TC-32` (Test approach) | YES | All test cases covered with dedicated unit and integration suites |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T04 | `tasks/prd-02-telemetria-zonas-e-freio/task_04.md` | COMPLETE | All 9 checklist items done; handoff fully documented; all acceptance criteria met |

## Executed validations

- Profile and scope: Core decision services, failure policy, brake mode, runtime hosts (process and in-process), plan validation reader, path normalizer, and integration test lane.
- Validated state: Working tree on commit `2513088` (Node v24.19.0, Windows 11, PowerShell 7).
- Reused evidence: None. All checks freshly executed.
- Manual acceptance: None required for T04.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run typecheck` | passed (exit 0) | CMP-08..CMP-11, CMP-16, CMP-17 |
| `npm run lint` | passed (exit 0) | Coding standards, QA-01..QA-05 |
| `npx vitest run tests/unit/brake-allowlist.test.ts tests/unit/shell-command-matcher.test.ts tests/unit/plan-validation-reader.test.ts tests/unit/tool-path-normalizer.test.ts tests/unit/brake-engine-pre-tool.test.ts tests/unit/brake-engine-lifecycle.test.ts tests/unit/failure-policy.test.ts tests/unit/brake-mode.test.ts tests/unit/reset-notice.test.ts tests/unit/process-hook-host.test.ts tests/unit/in-process-host.test.ts tests/unit/runtime-composition.test.ts tests/integration/runtime-host-process.test.ts` | passed (13 files, 96 tests, exit 0) | RF17..RF22, CA-14..CA-17, CA-19, DEC-08..DEC-10, DEC-12, DEC-15, DEC-18, TC-15..TC-17, TC-21, TC-25, TC-30, TC-32 |
| `npm run schemas:check` | passed (exit 0) | Schema currency check |
| `npm run dependencies:check` | passed (3 runtime dependencies, no install scripts) | NFR dependencies check |
| `npm run coverage` | passed (120 files / 566 tests, exit 0; statements/lines 93.4%) | Full regression; T04 modules > 93% covered |
| `npm run package:smoke` | passed (220 files, exit 0) | Packaging integrity |
| QA-01..QA-11 profile scans | passed (0 blocking hits, 0 new reservations) | Quality profile QA-01 to QA-11 |

## Findings

No new findings were introduced in Task T04.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | persistent | `schemas/context-brake.config.schema.json:189` — `brake` remains in `required` array due to output semantics in `scripts/generate-schemas.ts`. Documented as an item for T08 (packaging/scripts pass); untouched by T04. |
| `codereview_02/CR-02` | persistent | `tests/unit/protocol-zone-coherence.test.ts:23` — `throw new Error(...)` in test helper guard. Untouched by T04. |

## Limitations and open items

- T04 delivers the decision core, failure fallback, allowlist, and runtime host dispatchers. Harness-specific event payload mapping and command hooks registration will be delivered in T06 (process harnesses) and T07 (in-process harnesses).
- Scope additions on `RuntimeDescriptor` (`capabilities`) and `RuntimeDecision` (`message` on deny) in `src/core/contracts/runtime.ts` were completed to satisfy DEC-09 and CMP-02, and will be consumed by T06 and T07.
- Previous findings CR-01 and CR-02 remain open as non-blocking optional reservations.

## Conclusion

Task T04 is approved with reservations (`APPROVED WITH RESERVATIONS`). All requirements, acceptance criteria, and technical decisions are conformant. The entire test suite passes (566 tests across 120 files) with 93.4% statement/line coverage and zero new defects.
