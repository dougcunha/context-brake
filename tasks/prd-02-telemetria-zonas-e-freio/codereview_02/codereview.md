# Code review report — PRD 02 Telemetry, zones, and brake (Task T02)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `b9647e9..working tree` (accumulated working tree changes including T01 contracts and T02 core services/contracts/tests against commit `b9647e9813a5cdc45f426cc2d9bfcdc8e13370e0`)
- Previous review: `tasks/prd-02-telemetria-zonas-e-freio/codereview_01/codereview.md` (`APPROVED WITH RESERVATIONS`, CR-01)

Task T02 implementation satisfies all obligations, acceptance criteria, and architectural decisions. Pure contracts [`zones.ts`](file:///D:/MyProjects/ContextBrake/src/core/contracts/zones.ts) and [`runtime.ts`](file:///D:/MyProjects/ContextBrake/src/core/contracts/runtime.ts) are established without Zod. Session zone classification in [`zone-classifier.ts`](file:///D:/MyProjects/ContextBrake/src/core/services/zone-classifier.ts) implements exact integer percentage floor and highest-zone-first evaluation matching all PRD boundary criteria. Usage resolution in [`usage-resolver.ts`](file:///D:/MyProjects/ContextBrake/src/core/services/usage-resolver.ts) cleanly separates measured vs. estimated readings, handles missing or null tokens, and respects configured vs. reported window ceilings. Telemetry block v1 in [`telemetry-block.ts`](file:///D:/MyProjects/ContextBrake/src/core/services/telemetry-block.ts) and protocol rendering in [`protocol-service.ts`](file:///D:/MyProjects/ContextBrake/src/core/services/protocol-service.ts) share a unified source of truth in [`zone-actions.ts`](file:///D:/MyProjects/ContextBrake/src/core/services/zone-actions.ts), maintaining byte-for-byte protocol stability for defaults while appending extra commands to `CRITICAL` when configured. Worst-case blocks in all four zones are proven within token (≤ 50 `o200k_base`) and character (≤ 220) budgets via `js-tiktoken`. All 450 tests pass and quality profile checks report 0 blocking hits.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02-telemetria-zonas-e-freio/prd.md` | read in full |
| TechSpec | `tasks/prd-02-telemetria-zonas-e-freio/techspec.md` | read in full |
| Manifest | `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` | read in full |
| Task & Handoff | `tasks/prd-02-telemetria-zonas-e-freio/task_02.md` | read in full |
| Predecessor task | `tasks/prd-02-telemetria-zonas-e-freio/done/task_01.md` | read in full |
| Previous review | `tasks/prd-02-telemetria-zonas-e-freio/codereview_01/codereview.md` | read in full |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests}.md` | read and applied |
| Implementation | 8 source files and 7 unit test suites in working tree | delimited |

The reviewable diff for T02 comprises `src/core/contracts/{zones,runtime}.ts`, `src/core/services/{zone-classifier,usage-resolver,zone-actions,telemetry-block,injection-policy}.ts`, `src/core/services/protocol-service.ts`, `package.json`, `package-lock.json`, and the unit test suites under `tests/unit/`.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF5 | Use harness-reported context usage when available | `src/core/services/usage-resolver.ts:23-25` | `tests/unit/usage-resolver.test.ts:30-34` | conformant | `source: 'measured'`, `usedTokens` and `windowTokens` match reported values |
| RF6 | Estimate usage from local session data otherwise | `src/core/services/usage-resolver.ts:17-19,26` | `tests/unit/usage-resolver.test.ts:9-28` | conformant | `baseline + ceil(chars / 4) + turns * tokensPerTurn`, `source: 'estimated'` |
| RF7 | Active model window when reported, else config ceiling | `src/core/services/usage-resolver.ts:24,26` | `tests/unit/usage-resolver.test.ts:20-23,41-46` | conformant | Window changes applied mid-session; fallback to `contextWindowCeiling` |
| RF8 | Record source as measured or estimated | `src/core/contracts/zones.ts:2`, `src/core/services/usage-resolver.ts:24,26` | `tests/unit/usage-resolver.test.ts:13,33` | conformant | `source: 'measured' \| 'estimated'` strictly typed and populated |
| RF9 | Single configuration shared between integration and protocol | `src/core/services/protocol-service.ts:10-23`, `zone-classifier.ts:10-15` | `tests/unit/protocol-zone-coherence.test.ts:46-74` | conformant | Both read `config.telemetry.zones`; boundaries match across custom configs |
| RF10 | Classify session in GREEN, YELLOW, RED, CRITICAL | `src/core/services/zone-classifier.ts:10-15` | `tests/unit/zone-classifier.test.ts:8-34` | conformant | Tested at 49/7 (GREEN), 50/8 (YELLOW), 65/10 (YELLOW), 66/11 (RED), 74/11 (RED), 75/12 (CRITICAL) |
| RF12 | Telemetry block with turn/ceiling, usage/window, source, zone, action | `src/core/services/telemetry-block.ts:14-18` | `tests/unit/telemetry-block.test.ts:16-43` | conformant | Fixed field order `[ContextBrake v1] turn=... usage=... tokens=... source=... zone=... action=...` |
| RF13 | Continuous (`always`) and default (`threshold_only`) injection modes | `src/core/services/injection-policy.ts:10-13` | `tests/unit/injection-policy.test.ts:9-30` | conformant | Injects when `always`, when non-GREEN, or when usage reaches activation threshold |
| RF15 | Versioned, documented block format with stable field names | `src/core/services/telemetry-block.ts:4,17` | `tests/unit/telemetry-block.test.ts:38-43` | conformant | `[ContextBrake v1]` header; field sequence pinned by index assertions |
| RF16 | Red zone action instructs save plan/checkpoint, commit, reset signal | `src/core/services/zone-actions.ts:13` | `tests/unit/telemetry-block.test.ts:23` | conformant | `save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]` |
| CA-01 | Yellow session in default mode receives block | `src/core/services/injection-policy.ts:12` | `tests/unit/injection-policy.test.ts:10-12` | conformant | Verified for 55% usage in default mode |
| CA-02 | Green session below threshold receives no block | `src/core/services/injection-policy.ts:12` | `tests/unit/injection-policy.test.ts:13-15` | conformant | Returns `false` for 30% usage / 5 turns in `threshold_only` mode |
| CA-03 | Boundary classifications at 49/50/66/75% and 7/8/11/12 turns | `src/core/services/zone-classifier.ts:10-15` | `tests/unit/zone-classifier.test.ts:8-21` | conformant | Exact boundary table verified; highest zone wins when conditions disagree |
| CA-04 | Custom zone config renders and classifies with equal limits | `src/core/services/protocol-service.ts:10-23`, `zone-classifier.ts:10-15` | `tests/unit/protocol-zone-coherence.test.ts:71-73` | conformant | Protocol text extracted boundaries match classifier outcomes for custom configs |
| CA-09 | Measured harness usage sets source=measured and identical tokens | `src/core/services/usage-resolver.ts:23-25`, `telemetry-block.ts:17` | `tests/unit/telemetry-block.test.ts:29-32`, `usage-resolver.test.ts:31-34` | conformant | `source=measured tokens=54000/128000` |
| CA-10 | Harness without usage sets source=estimated | `src/core/services/usage-resolver.ts:26`, `telemetry-block.ts:17` | `tests/unit/telemetry-block.test.ts:16-19`, `usage-resolver.test.ts:9-15` | conformant | `source=estimated` populated from character and turn arithmetic |
| CA-13 | Worst-case block occupies ≤ 50 tokens (o200k_base) and ≤ 220 chars | `src/core/services/telemetry-block.ts:14-18` | `tests/unit/telemetry-block-budget.test.ts:16-22` | conformant | Max length 190 chars, max tokens 50 (GREEN 34, YELLOW 47, RED 50, CRITICAL 42) |
| CA-22 | Green-by-usage session with 8 turns receives yellow block | `src/core/services/injection-policy.ts:12`, `zone-classifier.ts:13` | `tests/unit/injection-policy.test.ts:16-18` | conformant | Turn count pushes zone to YELLOW, triggering injection in default mode |
| DEC-03 | Integer percentage floor, highest-zone-first, turnCeiling in block | `src/core/services/zone-classifier.ts:6-14` | `tests/unit/zone-classifier.test.ts:36-48` | conformant | `floor((used * 100) / window)`; >= 100% is CRITICAL; zero/negative window guard |
| DEC-05 | Measured only for Pi/Oh-My-Pi, estimated elsewhere | `src/core/services/usage-resolver.ts:20-27` | `tests/unit/usage-resolver.test.ts:30-52` | conformant | Preserves parallel estimate in `measuredTokens`; falls back to estimate on null |
| DEC-06 | Block v1, shared zone actions with protocol | `src/core/services/zone-actions.ts:10-38` | `tests/unit/protocol-service.test.ts:44-67` | conformant | Single record defines protocol and compact strings; protocol byte-identical |
| DEC-07 | `threshold_only` and `always` injection policy | `src/core/services/injection-policy.ts:10-13` | `tests/unit/injection-policy.test.ts:9-30` | conformant | Disjunction of non-GREEN or percentage >= threshold; always mode returns true |
| CMP-01, CMP-02 | `zones.ts` and `runtime.ts` contracts | `src/core/contracts/zones.ts`, `src/core/contracts/runtime.ts` | `npm run typecheck` | conformant | Clean contracts without Zod; runtime types defined for downstream tasks |
| CMP-04, CMP-05, CMP-07 | Classifier, resolver, actions, block, and policy services | `src/core/services/{zone-classifier,usage-resolver,zone-actions,telemetry-block,injection-policy}.ts` | Focused Vitest suites (49 tests) | conformant | Modules cleanly partitioned, 100% unit tested |
| CMP-14 | Protocol renderer from zone actions | `src/core/services/protocol-service.ts:1-30` | `tests/unit/protocol-service.test.ts:1-68` | conformant | `renderProtocol` consumes `zoneActionClause`; default protocol unchanged |
| TC-01, TC-02, TC-05, TC-06, TC-07, TC-28 | Test cases for boundaries, coherence, injection, block, budget, resolver | `tests/unit/{zone-classifier,protocol-zone-coherence,injection-policy,telemetry-block,telemetry-block-budget,usage-resolver}.test.ts` | Vitest suites | conformant | All 49 tests pass |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | All 15 files ≤ 70 lines (limit 100); all functions ≤ 30 lines; 0 comments; parameter count ≤ 3; named constants used; no blank lines inside functions |
| `javascript-typescript.md` | OK | Strict typecheck clean; 0 `any`; literal unions with exhaustive `switch` (`zoneActionClause`); immutable data structures; pure functions in core |
| `node.md` | OK | Pure ESM; Node 20+ compatibility; zero install scripts in dependencies (`npm run dependencies:check`) |
| `tests.md` | OK | Vitest unit tests; parameterized boundaries (`it.each`); budget tested with tokenizer; protocol byte-for-byte regression check |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|as any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}' <files>` | 0 new of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" <core_files>` | 0 new of 0 | OK |
| QA-05 | Synchronous file or process API in runtime modules | blocking | `rg -n --type ts '\b(readFileSync\|...)\b' <in_process_files>` | 0 (no runtime modules in diff) | OK |
| QA-06 | `console.log` or `process.stdout.write` outside response writer | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' <hook_files>` | 0 (no hook files in diff) | OK |
| QA-07 | `exec`, `execSync`, or `shell: true` | blocking | `rg -n --type ts '\bexecSync\(\|\bexec\(\|shell:\s*true' <files>` | 0 new of 0 | OK |
| QA-08 | Runtime bundles pulling heavy dependencies | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | skipped (T08 deliverable; no runtime bundle in diff) | OK |
| QA-09 | Clock or randomness in `core` | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' <core_files>` | 0 new of 0 | OK |
| QA-10 | Generic `throw new Error(` | reservation | `rg -n --type ts 'throw new Error\(' <files>` | 1 new (test helper guard) | reservation (CR-02) |
| QA-11 | 4+ parameters or file > 100 lines | reservation | 4+ parameters scan; line count per file | 0 new of 0 | OK |

- Terrain baseline: Applied from TechSpec at `b9647e9`. Target files clean.
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 1 (CR-02: `throw new Error` in test helper `protocol-zone-coherence.test.ts:23`)
- Suggested escalation: no trigger fired (1 reservation < 8 trigger limit)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| `DEC-03` (Integer percentage, highest-zone-first) | YES | Implemented in `zone-classifier.ts:6-15`; tested in `zone-classifier.test.ts` |
| `DEC-05` (Usage estimation formula) | YES | Implemented in `usage-resolver.ts:17-27`; tested in `usage-resolver.test.ts` |
| `DEC-06` (Block v1 line, shared zone actions) | YES | Implemented in `zone-actions.ts`, `telemetry-block.ts`, `protocol-service.ts` |
| `DEC-07` (Injection policy) | YES | Implemented in `injection-policy.ts:10-13`; tested in `injection-policy.test.ts` |
| `CMP-01`, `CMP-02` (Contracts) | YES | Defined in `src/core/contracts/{zones,runtime}.ts` without Zod |
| `CMP-04`, `CMP-05`, `CMP-07`, `CMP-14` (Services) | YES | Services implemented and wired to protocol generation |
| `TC-07` (Token and character budget) | YES | `js-tiktoken` (`o200k_base`) verifies all 4 zones ≤ 50 tokens and ≤ 220 characters |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T02 | `tasks/prd-02-telemetria-zonas-e-freio/task_02.md` | COMPLETE | All 6 checklist items done; handoff fully documented; all acceptance criteria met |

## Executed validations

- Profile and scope: Pure core services, contracts, and unit test suites.
- Validated state: Working tree on commit `b9647e9` (Node v24.19.0, Windows 11, PowerShell 7).
- Reused evidence: None. All checks freshly executed.
- Manual acceptance: None required for T02.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run typecheck` | passed (exit 0) | CMP-01, CMP-02, CMP-04, CMP-05, CMP-07, CMP-14 |
| `npm run lint` | passed (exit 0) | Coding standards, QA-01..QA-04 |
| `npx vitest run tests/unit/zone-classifier.test.ts tests/unit/protocol-zone-coherence.test.ts tests/unit/injection-policy.test.ts tests/unit/telemetry-block.test.ts tests/unit/telemetry-block-budget.test.ts tests/unit/usage-resolver.test.ts tests/unit/protocol-service.test.ts` | passed (49 tests, exit 0) | RF5–RF10, RF12, RF13, RF15, RF16, CA-01–CA-04, CA-09, CA-10, CA-13, CA-22, TC-01, TC-02, TC-05, TC-06, TC-07, TC-28 |
| `npm run dependencies:check` | passed (3 runtime dependencies, no install scripts) | NFR dependencies rule |
| `npm run schemas:check` | passed (exit 0) | Schema currency check |
| `npm run coverage` | passed (101 files / 450 tests, exit 0; statements/lines 92.81%) | Full regression; core services 100% covered |
| `npm run package:smoke` | passed (220 files, exit 0) | Packaging integrity |
| QA-01..QA-11 profile scans | passed (0 blocking hits, 1 test reservation) | Quality profile QA-01 to QA-11 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-02 | Low | `QA-10` | `tests/unit/protocol-zone-coherence.test.ts:23` — `throw new Error('Missing protocol row ...')` | A generic error is thrown in a test helper to guard missing test rows. Since this is in test code and not on a production error path, user operation is unaffected, but it flags QA-10. | Optional improvement: replace the `throw` with a Vitest assertion (e.g. `expect(row).toBeDefined()`) or a typed test failure helper. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | persistent | `schemas/context-brake.config.schema.json:189` — `brake` remains in `required` array due to output semantics in `scripts/generate-schemas.ts`. Documented as an item for T08 (packaging/scripts pass); untouched by T02. |

## Limitations and open items

- T02 delivers pure classification, usage resolution, telemetry rendering, and protocol synchronization in core. Persistence, session ledgers, allowlists, and harness runtime hooks will be added in T03–T07.
- `RuntimeDescriptor` in `runtime.ts` defines estimation and session reset fields; harness capability definitions will be wired by T06/T07 without requiring changes to T02 callers.
- CR-01 and CR-02 are optional improvements with zero blocking impact.

## Conclusion

Task T02 is approved with reservations (`APPROVED WITH RESERVATIONS`). All functional obligations, acceptance criteria, and quality standards are fully satisfied. The entire test suite passes (450 tests across 101 files) with 92.81% line/statement coverage and zero blocking defects.
