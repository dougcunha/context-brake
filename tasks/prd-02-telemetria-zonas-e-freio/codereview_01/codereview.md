# Code review report — PRD 02 Telemetry, zones, and brake (Task T01)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `b9647e9..working tree` (4 modified files in working tree against commit `b9647e9813a5cdc45f426cc2d9bfcdc8e13370e0` plus `tasks/prd-02-telemetria-zonas-e-freio/task_01.md`)
- Previous review: — (initial review for PRD 02)

The implementation of Task T01 satisfies all specified requirements, acceptance criteria, and architectural decisions. `configurationSchema` and `zonesSchema` have been migrated to `zod/mini` preserving canonical issue paths, received values, and error messages. The optional `brake` section with `additionalAllowedCommands` enforces length (≤ 20), uniqueness, trimming, and rejection of shell operators and line breaks. Cross-field validation correctly requires `telemetry.turnCeiling === telemetry.zones.criticalTurn` reporting the `telemetry.turnCeiling` path. Five unused classic Zod schemas and the `zod` import were safely removed from `src/core/contracts/harness.ts`. The published schema was regenerated and verified against drift, and all unit, lint, typecheck, coverage, and smoke checks pass cleanly with 0 quality profile hits. One low-severity reservation (CR-01) is recorded regarding output vs. input semantics in `scripts/generate-schemas.ts`.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02-telemetria-zonas-e-freio/prd.md` | read in full |
| TechSpec | `tasks/prd-02-telemetria-zonas-e-freio/techspec.md` | read in full |
| Manifest | `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` | read in full |
| Task & Handoff | `tasks/prd-02-telemetria-zonas-e-freio/task_01.md` | read in full |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests}.md` | read and applied |
| Implementation | 4 modified files in working tree against HEAD `b9647e9` | delimited |

The implementation scope consists of the working tree changes for Task T01: `src/core/contracts/configuration.ts`, `src/core/contracts/harness.ts`, `tests/unit/configuration.test.ts`, and `schemas/context-brake.config.schema.json`. Pre-existing untracked files (`tasks/prd-02-telemetria-zonas-e-freio/` task manifests and `.agents/scheduled_tasks.lock`) are unchanged.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF11 | Validate increasing limits, full coverage, and turn-ceiling equality | `src/core/contracts/configuration.ts:46-55` (`zonesSchema`, `telemetrySchema`) | `tests/unit/configuration.test.ts:25-41,64-67` | conformant | `yellowMaxPercentage`, `yellowMaxTurn`, and `turnCeiling === zones.criticalTurn` checks pass |
| CA-05 | Incoherent zone configuration rejected with field and rule | `src/core/contracts/configuration.ts:46-52` (`zonesSchema`) | `tests/unit/configuration.test.ts:25-29,34-40` | conformant | Reports issue path, received value, and rule message; existing issue paths and messages unchanged |
| CA-23 | `turnCeiling` different from `criticalTurn` rejected with field and rule | `src/core/contracts/configuration.ts:53-55` (`telemetrySchema`) | `tests/unit/configuration.test.ts:64-67` | conformant | Returns `{ path: 'telemetry.turnCeiling', received, rule: 'must equal telemetry.zones.criticalTurn' }` |
| RF18 (config) | Configurable allowed commands with trimming, uniqueness, limit ≤ 20, and shell operator prohibition | `src/core/contracts/configuration.ts:39-45,56` (`brakeSchema`) | `tests/unit/configuration.test.ts:59-92` | conformant | Rejects untrimmed, duplicates, > 20 commands, and `;`, `&`, `\|`, backtick, `$(`, `<`, `>`, CR, LF |
| DEC-02 | Shared schema on `zod/mini`; unused classic exports deleted | `src/core/contracts/configuration.ts:1`, `src/core/contracts/harness.ts:1-50` | `tests/unit/configuration.test.ts`, `tests/unit/schemas.test.ts` | conformant | `configuration.ts` migrated to `zod/mini`; 5 unused exports removed from `harness.ts`; 0 callers broken |
| DEC-03 | `turnCeiling` equality rule | `src/core/contracts/configuration.ts:53-55` | `tests/unit/configuration.test.ts:64-67` | conformant | Equality enforced; `DEFAULT_CONFIG` has `turnCeiling: 12` and `criticalTurn: 12` |
| CMP-12 | Configuration contracts on `zod/mini` with `brake` section and equality rule | `src/core/contracts/configuration.ts:1-61` | `tests/unit/configuration.test.ts:23-92` | conformant | `DEFAULT_CONFIG` includes `brake: { additionalAllowedCommands: [] }`; v1 file without `brake` defaults to `[]` |
| CMP-13 | Zod-free harness contracts | `src/core/contracts/harness.ts:1-50` | `npm run typecheck`, `npm run lint` | conformant | `harness.ts` has no Zod dependency and no unused schema exports |
| TC-03 | Config validation unit cases | `tests/unit/configuration.test.ts:59-92` | Vitest configuration suite | conformant | 36 configuration unit tests pass (all pre-existing + 7 new test cases) |
| TC-31 | Schema currency and README example | `schemas/context-brake.config.schema.json`, `tests/unit/readme-config-example.test.ts` | `npm run schemas:check`, Vitest readme suite | conformant | `schemas:check` passes with zero drift; README example parses cleanly |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | All files ≤ 100 lines (`configuration.ts` 61, `harness.ts` 49, `configuration.test.ts` 92); functions ≤ 30 lines; 0 comments; parameter count ≤ 3; named constants used |
| `javascript-typescript.md` | OK | Strict typecheck clean; no `any`; `zod/mini` schemas; immutable patterns; proper ES module exports |
| `node.md` | OK | Standard Node.js 20+ APIs; POSIX relative path handling |
| `tests.md` | OK | Vitest unit tests; table-driven parameterization (`it.each`); exact issue path, received value, and rule assertions |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|as any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' <files>` | 0 new of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" <core_files>` | 0 new of 0 | OK |
| QA-05 | Synchronous file or process API in runtime modules | blocking | `rg -n --type ts '\b(readFileSync\|...)\b' <in_process_files>` | 0 (no runtime modules in diff) | OK |
| QA-06 | `console.log` or `process.stdout.write` outside response writer | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' <hook_files>` | 0 (no hook files in diff) | OK |
| QA-07 | `exec`, `execSync`, or `shell: true` | blocking | `rg -n --type ts '\bexecSync\(\|\bexec\(\|shell:\s*true' <files>` | 0 new of 0 | OK |
| QA-08 | Runtime bundles pulling heavy dependencies | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | skipped (T08 deliverable; no runtime bundle in diff) | OK |
| QA-09 | Clock or randomness in `core` | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' <core_files>` | 0 new of 0 | OK |
| QA-10 | Generic `throw new Error(` | reservation | `rg -n --type ts 'throw new Error\(' <files>` | 0 new of 0 | OK |
| QA-11 | 4+ parameters or file > 100 lines | reservation | 4+ parameters scan; line count per file | 0 new of 0 | OK |

- Terrain baseline: Applied from TechSpec at `b9647e9`. Target files clean.
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| `DEC-02` (Shared schema on `zod/mini`, unused classic exports deleted) | YES | `configuration.ts` migrated to `zod/mini`; 5 unused exports removed from `harness.ts` |
| `DEC-03` (`turnCeiling` equals `criticalTurn`) | YES | Cross-field check rejects divergence with issue path `telemetry.turnCeiling` |
| `CMP-12` (Configuration contract) | YES | `brake.additionalAllowedCommands` validated and defaulted; `DEFAULT_CONFIG` updated |
| `CMP-13` (Zod-free harness contract) | YES | 5 unused schema exports and `zod` import removed |
| `TC-03` (Config validation cases) | YES | Extended `tests/unit/configuration.test.ts` with 7 new tests covering all boundaries |
| `TC-31` (Schema currency and README example) | YES | Regenerated `schemas/context-brake.config.schema.json`; `schemas:check` passes; README example validates |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `tasks/prd-02-telemetria-zonas-e-freio/task_01.md` | COMPLETE | All 5 checklist items done; handoff fully documented; all acceptance criteria verified |

## Executed validations

- Profile and scope: Unit and static validations for pure configuration parsing and contracts.
- Validated state: Working tree changes on commit `b9647e9` (Node v24.19.0, Windows 11, PowerShell 7).
- Reused evidence: None. All checks freshly executed.
- Manual acceptance: None required for T01.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run typecheck` | passed (exit 0) | CMP-12, CMP-13, DEC-02 |
| `npm run lint` | passed (exit 0) | Code standards, QA-01..QA-04 |
| `npx vitest run tests/unit/configuration.test.ts tests/unit/schemas.test.ts tests/unit/readme-config-example.test.ts` | passed (40 tests, exit 0) | RF11, CA-05, CA-23, RF18, TC-03, TC-31 |
| `npm run schemas:check` | passed (exit 0) | TC-31, DEC-02 |
| `npm run coverage` | passed (407 tests, exit 0; statements/lines 92.7%) | Full regression suite; `configuration.ts` 100% lines/statements |
| `npm run package:smoke` | passed (220 files, exit 0) | Packaging integrity |
| QA-01..QA-11 profile scans | passed (0 hits) | Quality profile QA-01 to QA-11 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | `DEC-02` / `scripts/generate-schemas.ts` | `schemas/context-brake.config.schema.json:189` — `brake` and `additionalAllowedCommands` appear in `required` array of the published schema | Because `z.toJSONSchema` uses output semantics by default, fields with defaults (`z._default`) are marked required in the JSON Schema. Editor validation against `$schema` in v1 config files omitting `brake` might report a missing required property, even though runtime parsing (`parseConfiguration`) accepts the omission and defaults it correctly. | In a future task (or T08 asset/packaging pass), update `scripts/generate-schemas.ts` and `scripts/check-schemas.ts` to generate input-semantic schema (`io: 'input'`) for `context-brake.config.schema.json`. |

## Previous findings (re-review only)

Initial review of PRD 02 — no previous findings.

## Limitations and open items

- Task T01 is limited to configuration contracts and schema parsing. The runtime engine, hosts, harness adapters, and simulator acceptance will be delivered and verified in tasks T02–T09.
- CR-01 is an optional improvement for external schema consumer / editor UX; it does not affect CLI execution or runtime configuration validation.

## Conclusion

Task T01 is approved with reservations (`APPROVED WITH RESERVATIONS`). All requirements, acceptance criteria, and technical decisions are conformant. All verification gates (typecheck, lint, focused tests, full regression coverage, schema currency, package smoke, and QA profile scans) passed with zero defects. One low-severity reservation (CR-01) is documented for future refinement.
