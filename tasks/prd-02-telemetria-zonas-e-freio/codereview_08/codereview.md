# Code review report - PRD 02 Telemetry, zones, and brake (Task T08)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `ce3c4c5..working tree` (uncommitted T08 diff of 8 files + 3 untracked files; T06/T07 commits inspected where T08 consumes their assets). No `--base` argument was provided; the scope is delimited by the handoff and the worktree, as recorded under Limitations.
- Previous review: `tasks/prd-02-telemetria-zonas-e-freio/codereview_07/codereview.md` (`APPROVED WITH RESERVATIONS`; carried `codereview_01/CR-01` and `codereview_02/CR-02`)

T08 delivers the eight thin harness assets over `src/`, deletes no code (the `process-hook.ts` removal happened in T06), exposes the esbuild metafile from `bundleAsset`, adds an automated bundle guard over all nine asset entries, adds the real-path overhead suite on built assets, publishes `docs/telemetry-block.md`, and documents the brake, allowlist, upgrade step, and Antigravity auto-approval in the README. All T08 work items and acceptance criteria are met on Windows/Node 24; the CI platform matrix that closes CA-20 remains pending (open item O-04), and three Low optional improvements are recorded. No blocking quality-profile hit and no non-conformant obligation was found.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02-telemetria-zonas-e-freio/prd.md` | read in full (RF1-RF22, CA-01-CA-23) |
| TechSpec | `tasks/prd-02-telemetria-zonas-e-freio/techspec.md` | read in full (DEC-01-DEC-19, CMP-01-CMP-27, TC-01-TC-34, quality profile, terrain baseline) |
| Manifest | `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` | read in full; T08 link and state verified |
| Task and Handoff | `tasks/prd-02-telemetria-zonas-e-freio/task_08.md` | read in full; T08.1-T08.7 checked, handoff complete |
| Context snapshot | `tasks/prd-02-telemetria-zonas-e-freio/context-snapshot.md` | header, next-step brief, open threads (O-02, O-03, O-04), and on-run entries applied |
| Prior reviews | `tasks/prd-02-telemetria-zonas-e-freio/codereview_01` to `codereview_07` | read for carried findings |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests,harness-adapters,file-changes,cli-output}.md` | applied |
| Implementation | T08 diff: `scripts/asset-bundler.ts`, `src/core/validation/configuration-validator.ts`, `README.md`, `package.json`, `tests/test-lanes.ts`, `tests/integration/package-contents.test.ts`, `docs/telemetry-block.md`, `tests/unit/runtime-bundle-imports.test.ts`, `tests/integration/runtime-overhead.test.ts`; consumed: `assets/runtime/*.ts`, `scripts/{build-assets,check-assets,check-package}.ts`, `src/infrastructure/diagnostics/in-process-sampler.ts` | delimited |
| SDD bookkeeping | `tasks/prd-02-telemetria-zonas-e-freio/{context-snapshot,task_08}.md` | updated by the implementer, not reviewed as code |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| T08.1 | Every runtime asset is a thin entry; `process-hook.ts` gone | `assets/runtime/claude-code-hook.ts:1-3` and the other seven delegates; `scripts/asset-bundler.ts:8-18` | `tests/unit/runtime-assets.test.ts` | conformant | Each asset is one import plus one call; `process-hook.ts` is absent (deleted in `3cff470`); the pre-existing empty `entry.ts` stub is CR-02 |
| T08.2 | `bundleAsset` returns `{ text, metafile }` without breaking existing callers | `scripts/asset-bundler.ts:6,22-37,43-45,61-62` | `tests/unit/asset-bundler.test.ts` | conformant | `buildRuntimeAssets`, `findStaleAssets`, `verifyAssets`, `build-assets.ts`, `check-assets.ts` compile and pass; `npm run assets:check` exits 0 |
| T08.3 | Bundle guard over classic `zod`, `jsonc-parser`, `semver`, `node:child_process`, `src/cli/` | `tests/unit/runtime-bundle-imports.test.ts:8-28` (metafile guard) | itself (9 asset cases + 5 fixture cases) | conformant | Guard passes on all nine real entries and fails on each of the five fixtures; `dist/` marker scan (`child_process\|SEMVER_SPEC_VERSION\|jsonc`) has no hits |
| T08.4 | Process post-tool and CRITICAL pre-tool with allowlist, plus in-process `tool_call` measurement | `tests/integration/runtime-overhead.test.ts:28-79`; `src/infrastructure/diagnostics/in-process-sampler.ts:3-4,29-33,52-56` | itself; `tests/integration/doctor-benchmark.test.ts` | conformant | 3 cases pass; suite registered at `tests/test-lanes.ts:26`; seeded ledger, config, and plan in a temporary root; in-process sampler uses the real `ContextUsage` shape and 10+100 samples |
| T08.5 | Block field order, versioning rule, per-zone examples, block and failure messages, reset notice, ledger and log locations with metadata-only rule | `docs/telemetry-block.md:10,27,36-59,68,76,94,108-118` | `tests/integration/package-contents.test.ts:17` | conformant | Field-by-field match with `telemetry-block.ts:14-18`, `block-message.ts:17-25`, `reset-notice.ts:6-8`; storage text matches `runtime-paths.ts:10-29`; doc read against the TechSpec contracts in this review |
| T08.6 | README brake behavior, limits, allowlist, upgrade step, Antigravity note; package the doc; research header note | `README.md:49-59,78,135,164-166,180`; `package.json:13`; research header already carries the 2026-09-15 re-check | `tests/unit/readme-config-example.test.ts`, `tests/unit/readme-support-table.test.ts`, `tests/integration/package-contents.test.ts` | conformant | README example parses against the published schema; support rows match adapter profiles; `npm pack --dry-run` includes `docs/telemetry-block.md` |
| T08.7 | `asset-bundler` and `runtime-assets` tests adjusted only as required | `tests/unit/asset-bundler.test.ts:9` (nine entries); `tests/unit/runtime-assets.test.ts:12-16` (`runProcessHook` assertion) | both | conformant | Focused run passes; assets still contain `runProcessHook` |
| AC1 | Build produces nine assets; no asset carries logic beyond a named call | `scripts/asset-bundler.ts:8-18`; `assets/runtime/*.ts` | `npm run build`, `npm run assets:check` | conformant | Nine files in `dist/assets/runtime/` (8 bundles ≈ 750 KB, the 92-byte legacy stub); sources are one-line delegates apart from `entry.ts` (CR-02) |
| AC2 | Guard fails on forbidden imports and passes on real assets | guard test | guard test | conformant | All 14 cases pass |
| AC3 | Process p95 ≤ 100 ms and in-process p95 ≤ 15 ms in the measurement suite on the CI platforms; doctor stays informational | overhead suite; `doctor-benchmark.test.ts` | both | not verifiable (CI pending) | Local Windows: in-process p95 0.1 ms; process p95 319.8/334.4 ms (post) and 518.0/379.5 ms (pre) against a `node -e ''` baseline p95 of 248.5/162.9 ms on the loaded review machine; doctor informational assertions pass |
| AC4 | Document matches the implementation, states versioning, ships in the package | doc; `package.json:13` | `package-contents` | conformant | Pack includes the doc; contents match the TechSpec contracts |
| AC5 | README example validates; support table matches profiles; no foreign files changed | `README.md:145-180`; support rows | readme tests; diff review | conformant | Tests pass; the diff touches only package-owned files plus SDD artifacts |
| CA-20 | p95 ≤ 100 ms per process call and ≤ 15 ms per in-process call | overhead suite | TC-22 | not verifiable for process (CI); conformant locally for in-process | See AC3; the absolute process target applies on CI runners (`runtime-overhead.test.ts:45`) |
| RF15 | Versioned documented block with stable field names | `docs/telemetry-block.md:1-27`; `TELEMETRY_BLOCK_VERSION` | reused TC-06/TC-07 | conformant | Versioning rule present; tests pass in the full run |
| RF18 | Documented allowlist and its configuration | `README.md:53-57,180`; doc §3 | reused TC-16 | conformant | Text matches `block-message.ts:26-31` and `brake-allowlist.ts:11` |
| CA-13 | Budget statement and its measurement | `docs/telemetry-block.md:18` documents the `tokens=` field; `tests/unit/telemetry-block-budget.test.ts` | TC-07 (reused) | conformant | 50-token/220-character assertions pass in the full run |
| DEC-01 | Runtime logic in `src/`, thin assets | `assets/runtime/*.ts`; `scripts/asset-bundler.ts` | `runtime-assets` | conformant | One import plus one call per harness asset |
| DEC-02 | `zod/mini` in bundles plus bundle guard | `src/core/validation/configuration-validator.ts:1`; guard | TC-24 | conformant | Guard passes; bundle-size caveat recorded under Limitations |
| DEC-06 | Block v1 shared, documented, published | doc §1, §3; `package.json:13` | `package-contents` | conformant | Doc matches the renderers |
| DEC-11 | Block log and error log documented, metadata only | doc §5 | reused TC-20 | conformant | Field list matches `node-runtime-logs` behavior asserted by `runtime-block-log` |
| DEC-17 | Overhead measured on the real paths | overhead suite; `in-process-sampler.ts:29-33` | TC-22 | conformant | Built assets, seeded ledger, allowlist evaluation, real `ContextUsage` |
| CMP-24 | Thin assets, metafile, bundler | `scripts/asset-bundler.ts`; assets | `asset-bundler`, `runtime-bundle-imports` | conformant | See T08.1/T08.2 |
| CMP-25 | Docs, research note, schema, package | `README.md`, `docs/telemetry-block.md`, `package.json`; research note pre-existing | readme tests, `schemas:check`, `package:smoke` | partial | All exit 0; `codereview_01/CR-01` (schema `required`) remains open and outside the task's declared file scope |
| CMP-17, CMP-22 (consumed) | Hosts and in-process sampler keep the real contract | `in-process-sampler.ts:29-33` | `in-process-sampler.test.ts`, `doctor-benchmark` | conformant | Benchmark context returns `{ tokens, contextWindow, percent }` |
| TC-22 | Overhead | overhead suite | itself | conformant (CI pending) | 3 cases pass; p95 values not printed (CR-01) |
| TC-24 | Bundle guard | guard test | itself | conformant | See T08.3 |
| TC-31 | README example and schema currency | `README.md:145-177` | `readme-config-example`; `npm run schemas:check` | conformant | Both exit 0 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | Touched `.ts` files max 80 lines (`tests/integration/runtime-overhead.test.ts`), functions ≤ 30 lines, no comments added, magic values named (`PROCESS_TARGET_MS`, `IN_PROCESS_TARGET_MS`, `TIMEOUT_MS`); `eslint .` exits 0 |
| `javascript-typescript.md` | OK | Strict typecheck clean; no `any`; `zod/mini`; ESM with explicit return types; `spawn` with an argument array |
| `node.md` | OK | Async I/O only on the measured paths; child process started with `spawn(process.execPath, args)` and a timeout; no synchronous API introduced |
| `tests.md` | OK | Perf suite is integration-level in the process lane; temporary directories created and removed per test; deterministic payloads; lanes kept correct |
| `harness-adapters.md` | N/A | No adapter or fixture changed in T08; T06/T07 research notes remain the source of truth |
| `file-changes.md` | N/A | No user-file writer changed; only package-owned docs and manifests |
| `cli-output.md` | N/A | No CLI output changed |
| Independence rule | OK | This session did not author or change any code under review; only read, built, and measured |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|as any\b\|<any>' <T08 files>` | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <T08 files>` | 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n -U 'catch\s*(...)\s*\{\s*\}' <T08 files>` | 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" src/core/validation/configuration-validator.ts` | 0 | OK |
| QA-05 | Synchronous file or process API in runtime modules | blocking | `rg -n '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync\|statSync\|readdirSync)\b' <runtime/engine subset>` | 0 | OK |
| QA-06 | `console.log` or `process.stdout.write` outside the response writer | blocking | `rg -n 'console\.log\|process\.stdout\.write' <hook-path subset>` | 0 | OK |
| QA-07 | `exec`, `execSync`, or `shell: true` in runtime or driving test code | blocking | `rg -n 'execSync\(\|exec\(\|shell:\s*true' <T08 files>` | 0 | OK (suite uses `spawn`) |
| QA-08 | Bundles pulling classic Zod, `jsonc-parser`, `semver`, `node:child_process`, or CLI code | blocking | `npx vitest run tests/unit/runtime-bundle-imports.test.ts` | 0 of 14 cases fail | OK (`DEC-02`) |
| QA-09 | Clock or randomness in `core` | reservation | `rg -n 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' src/core/validation/configuration-validator.ts` | 0 | OK |
| QA-10 | Generic `throw new Error(` | reservation | `rg -n 'throw new Error\(' <T08 files>` | 0 new of 1 pre-existing | pre-existing (`scripts/asset-bundler.ts:70`, baseline hit moved from `:63`) |
| QA-11 | 4+ parameters or `.ts` file above 100 lines | reservation | parameter regex plus `rg -c -H '^'` over the T08 files | 0 | OK (max 80 lines) |

- Terrain baseline: applied from the TechSpec (`b9647e9`); the only target-file hit in the reviewable set is the pre-existing QA-10 `throw new Error(` in `scripts/asset-bundler.ts`, whose line moved from 63 to 70.
- Hits discounted by baseline: 1
- Reservations accumulated in the feature: 1 (`codereview_02/CR-02`, QA-10 test helper, still open); the non-QA optional finding `codereview_01/CR-01` is tracked separately.
- Suggested escalation: no trigger fired. Fewer than eight reservations (1), no touched TypeScript file above 200 lines (max 80; `README.md` is pre-existing documentation), and no symbol or block repeated three or more times in the diff.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| `DEC-01` (thin assets, logic in `src/`) | YES | `assets/runtime/*.ts` are one import plus one call; the bundler keeps them in `ASSET_ENTRIES` |
| `DEC-02` (mini-only bundles, guard) | YES | `configuration-validator.ts:1` uses `zod/mini`; the guard passes on all nine entries and fails on fixtures; the previous classic-Zod path is gone (bundle guard would now reject it) |
| `DEC-06` (block v1 documented and published) | YES | `docs/telemetry-block.md` matches `telemetry-block.ts`, `block-message.ts`, and `reset-notice.ts`; packaged |
| `DEC-11` (logs documented, metadata only) | YES | Doc §5 matches the log writers |
| `DEC-17` (real-path overhead measurement) | YES | Built assets measured on the post-tool and CRITICAL pre-tool paths with a seeded ledger; sampler uses the real `ContextUsage`; bundles stay unminified |
| `TC-22`, `TC-24`, `TC-31` | YES | Focused suite 40/40; `schemas:check`, `assets:check`, `package:smoke` exit 0 |
| Migration note (`PROTOCOL_FILE_MISMATCH`) | YES | `README.md:135` states the rerun requirement |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T08 | `tasks/prd-02-telemetria-zonas-e-freio/task_08.md` | COMPLETE | T08.1-T08.7 `[x]`; handoff documents result, changed files, checks, and validated state; manifest still lists T08 as pending, the expected pre-review state |

## Executed validations

- Profile and scope: runtime assets, bundler, bundle guard, overhead measurement on built assets, published documentation and package contents. No browser or UI layer (CLI project).
- Validated state: `ce3c4c5` + T08 working tree, Windows 11, Node.js 24.19.0 (matching the handoff); code was not modified during review (`git status` unchanged before and after).
- Reused evidence: none carried over unverified; every check was re-executed in this session, and results matched the handoff.
- Manual acceptance: `docs/telemetry-block.md` was read against the TechSpec contracts during this review (field order, messages, notice, storage). No other manual work is required by T08.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (schemas, assets, tsc) | AC1, DEC-01, DEC-02, DEC-17 |
| `npm run typecheck` | passed | T08.2, T08.3, T08.4 |
| `npm run lint` | passed | rules compliance |
| `npx vitest run runtime-bundle-imports asset-bundler runtime-assets readme-config-example readme-support-table runtime-overhead doctor-benchmark package-contents` | passed (8 files, 40 tests, 60.5 s) | T08.1-T08.7, AC1-AC5, TC-22/24/31 |
| `npm run assets:check` | passed | T08.1, T08.2, AC1 |
| `npm run schemas:check` | passed | TC-31, CMP-25 |
| `npm run dependencies:check` | passed (3 runtime dependencies, no install scripts) | CMP-25 (`js-tiktoken` dev) |
| `npm run package:smoke` | passed | AC4, packaging |
| `npm test` | passed (143 files, 694 tests, 169.7 s) | regression, lane registration |
| `npm run coverage` | passed (thresholds met; 5,598/5,999 statements ≈ 93.3%) | `tests.md`, feature gates |
| Independent `rg` scan of `dist/assets/runtime` for `child_process\|SEMVER_SPEC_VERSION\|jsonc` | no hits | QA-08, DEC-02 |
| Independent p95 probe on the built assets (post-tool, critical pre-tool, in-process) | post 319.8/334.4 ms, pre 518.0/379.5 ms, baseline 248.5/162.9 ms, in-process 0.1 ms | CA-20, TC-22 (see Limitations) |
| QA-01 to QA-11 scans over the T08 file set | 0 blocking hits; 1 pre-existing reservation discounted | quality profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low (optional) | T08 Verification ("Expected evidence: a green measurement log with the p95 per harness"), TC-22 | `tests/integration/runtime-overhead.test.ts:43-47` — the 100 ms assertion applies only when `CI` is set; otherwise the bound is `max(100, baseline * 3 + 150)`; the suite never prints a p95 and measures one process asset (Claude Code) and one in-process asset (Pi) | A green local run is a smoke check, not evidence of CA-20, and the expected measurement log does not exist; the binding gate is CI (`:45`), which cannot run here | Optional: log the measured p95 per measured asset and either iterate the five process and three in-process assets or record in the handoff why one of each is representative of the shared host code |
| CR-02 | Low (optional) | T08.1 | `assets/runtime/entry.ts:1` — `runtimeAssetEntry()` is empty; `scripts/asset-bundler.ts:9` bundles it to `dist/assets/runtime/context-brake-runtime.mjs` (92 bytes) and `tests/integration/package-contents.test.ts:18` requires it, but no installer or runtime path consumes it | T08.1's confirmation ("every asset ... naming `runProcessHook` or a harness factory") does not hold for this entry, and a dead asset stays in the published package | Optional: remove the entry from `ASSET_ENTRIES`, `check-package.ts`, and the test's `REQUIRED_FILES`, or justify keeping it in the handoff |
| CR-03 | Low (optional) | T08.6 ("add `docs/telemetry-block.md` to ... `REQUIRED_FILES`") | `scripts/check-package.ts:17-28` — `REQUIRED_FILES` lists `docs/context-brake-protocol.md` but not `docs/telemetry-block.md`; only `tests/integration/package-contents.test.ts:17` enforces it | `npm run package:smoke` alone would not catch the new document dropping out of the tarball | Optional: add `docs/telemetry-block.md` to `check-package.ts`'s list for parity with the test |

No blocking finding was identified in the T08 diff.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | persistent | `schemas/context-brake.config.schema.json:190` — `brake` still appears in the root `required` list because `z.toJSONSchema` runs with output semantics (`brake` is `z._default`). Valid v1 files without `brake` parse at runtime (`tests/unit/configuration.test.ts:60-62`) but schema-aware editors would flag them. T08's In-scope list did not include `scripts/generate-schemas.ts` or `schemas/`, so it was not obligated to fix it; keep it scheduled for the next scripts/packaging change |
| `codereview_02/CR-02` | persistent | `tests/unit/protocol-zone-coherence.test.ts:23` — the generic `throw new Error('Missing protocol row ...')` test guard is unchanged; counted as the feature's single QA-10 reservation |

## Limitations and open items

- No `--base` was provided. The reviewable set is the T08 worktree diff plus untracked files against `ce3c4c5`; the thin assets, the `process-hook.ts` deletion, and the in-process sampler changes that T08 consumes were committed in T06/T07 and were inspected at `HEAD` as dependencies, not re-reviewed.
- CI platform evidence is missing (snapshot O-04): the process p95 ≤ 100 ms target and the Linux/macOS × Node 20/22/24 matrix are not verified in this session. Windows/Node 24 passed under the suite's local tolerance; the absolute 100 ms bound is not proven on the loaded review machine (baseline p95 up to 248.5 ms).
- Bundle size contradicts `DEC-02`'s rationale: each runtime asset is ~750 KB (six of nine files sum to 6.0 MB) because a `zod/mini` import retains all 64 zod v4 locale modules (≈340 KB) plus core (≈409 KB); a minimal `zod/mini` schema bundles to 703 KB unminified. This pre-dates T08 (T08 reduced classic Zod by removing it) and is not an acceptance criterion, but the "~21.9 KiB" mitigation claim should be re-measured when the CI overhead gate runs.
- Local process measurements are load-sensitive and include Node startup; they are indicative only.
- Open research gaps remain as recorded in the snapshot (O-02): no real Pi/Oh-My-Pi/OpenCode installation, so OI-03, OI-04, OI-05, and the T06 Cursor/Antigravity capture gaps stay open for PRD-02's final acceptance.

## Conclusion

Task T08 conforms to its work items, acceptance criteria, and the TechSpec decisions it implements: the assets are thin, the bundle guard is real and self-testing, the overhead suite runs against built assets with a seeded ledger, the published document matches the implementation line by line, and the README covers the brake, limits, allowlist, upgrade step, and Antigravity caveat. All local gates (build, typecheck, lint, focused suites, schema/asset/dependency/package smoke, full 694-test regression, coverage) pass on the recorded environment, and no blocking quality-profile hit or non-conformant obligation was found. The status is **APPROVED WITH RESERVATIONS**: three Low optional improvements (CR-01 to CR-03) and two persistent prior Low reservations (`codereview_01/CR-01`, `codereview_02/CR-02`) remain, and the CI platform matrix that completes CA-20 is still pending. This review session changed no code and may continue into `sdd-plan-corrections` or `sdd-execute-qa`; the state snapshot should record stage `review` with this report as `covers_through` and `authored_code: no` if a pause is taken.
