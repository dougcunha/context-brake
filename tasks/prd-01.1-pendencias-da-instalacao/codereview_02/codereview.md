# Code review report — PRD 1.1 installation follow-ups (re-review)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `1e7e091..a26e45a` (feature + corrections commit `a26e45a9e051b653c8a561673cb02dfcaf4b1b38`, parent `1e7e091`; clean worktree) — no `--base` was passed, see limitations
- Previous review: `tasks/prd-01.1-pendencias-da-instalacao/codereview_01/codereview.md` (`REJECTED`, CR-01..CR-04)

The `FR-06`–`FR-13` implementation and the `NFR-01` asset-typecheck slice remain functionally complete, and the four `codereview_01` corrections (T10–T13) close every prior finding. The blocking `QA-03` hit in `directory-pruner.test.ts` is gone (its line now uses non-swallowing retry cleanup), `runtime-state-files.ts` resolves directory paths without `parentPath`, `remove --remove-state` prunes an already-empty runtime directory, and the `tasks.md`/`techspec.md`/`task_02.md` traceability citations point at the tests that actually prove the obligations. `NFR-03` is now proven by CI run `35008179245` on the exact reviewed SHA (9/9 jobs: Linux/macOS/Windows × Node 20/22/24), and `NFR-04` was measured on an eight-harness fixture (`init` 659 ms; `doctor` without overhead measurement 145 ms, both ≤5 s). One optional improvement remains: the declared `engines.node: ">=20"` floor still includes Node 20.0.x, where neither `Dirent.parentPath` (v20.12.0) nor `Dirent.path` (v20.1.0) exists, so nested runtime files are not resolved there.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01.1-pendencias-da-instalacao/prd.md` | read in full (current version) |
| TechSpec | `tasks/prd-01.1-pendencias-da-instalacao/techspec.md` | read in full (current version) |
| Manifest | `tasks/prd-01.1-pendencias-da-instalacao/tasks.md` | read in full |
| Handoffs | `tasks/prd-01.1-pendencias-da-instalacao/done/task_01.md`..`task_09.md` | all read in full |
| Correction handoffs | `tasks/prd-01.1-pendencias-da-instalacao/codereview_01/task_10.md`..`task_13.md` | all read in full |
| Previous review | `tasks/prd-01.1-pendencias-da-instalacao/codereview_01/codereview.md` | read in full |
| Predecessor review | `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_09/codereview.md` | read (context for `FR-01`–`FR-05`) |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests,harness-adapters,file-changes,cli-output}.md` | read and applied |
| Implementation | commit `a26e45a` over `1e7e091`: 70 changed paths, 47 TypeScript files; clean worktree | delimited by the feature commit + T01–T13 handoffs (no `--base`) |

No `--base` was supplied. The implementation is now committed: `a26e45a` is a single feature commit whose parent, `1e7e091`, is exactly the HEAD the previous review used as its worktree base, so `1e7e091..a26e45a` is the whole reviewable set — original work plus corrections, including `codereview_01/` (report and correction handoffs) and `done/`. The only untracked path is `.agents/scheduled_tasks.lock`, unrelated to the feature. No code, task, or previous report was modified by this review; the only file created is this report.

## Coverage matrix

States: conformant / non-conformant / pending / not verifiable.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `.gitignore` block for plan/checkpoint; dry-run and marker conflicts | predecessor (`gitignore-service.ts`, untouched by `1e7e091..a26e45a`) | predecessor suites (UT-21..24, IT-17/18, E2E-11) | conformant | `codereview_09` verified; module unchanged in this diff; reused evidence |
| FR-02 | Support-level rule (full/partial/cooperative) | predecessor (`support-service.ts` level derivation; adapters) | predecessor suites (TC-01/TC-02) | conformant | `codereview_09`; reused evidence |
| FR-03 | Failure/timeout limitation per harness | predecessor (adapter limitations) | predecessor suites (TC-03, E2E support-limitations) | conformant | `codereview_09`; reused evidence |
| FR-04 | Context usage declared only when received | predecessor (adapter `context_usage`) | predecessor suites | conformant | `codereview_09` (claude/cursor unavailable, pi/omp available); reused |
| FR-05 | Event/payload/handler-accurate overhead measurement | predecessor (`overhead-measurer.ts`, `in-process-sampler.ts`, untouched) | predecessor suites (TC-04) | conformant | `codereview_09` sentinel counters; reused evidence |
| FR-06 | Read documented payload field names | `antigravity-cli/schemas.ts:13-21`, `pi/schemas.ts:7-17`, `oh-my-pi/schemas.ts:7-17` | `tests/unit/harness-schemas-process.test.ts:81-86`, `harness-schemas-in-process.test.ts:32-63` | conformant | fixtures carry documented names + an extra passthrough field; tests pass; no adapter reads the old names |
| FR-07 | Manifest records the running package version | `package-metadata.ts:22-63`, `installation-builder.ts:48`, `init.ts:67` | `tests/unit/package-metadata.test.ts`, `tests/e2e/e2e-01-02.test.ts:27-36` | conformant | E2E asserts `manifest.packageVersion === package.json.version`; error paths unit-tested |
| FR-08 | Classify assets current/outdated/modified; never overwrite a modified asset | `asset-currency.ts:10-88`, `doctor-service.ts:49-50`, `installation-service.ts:80-85` | `asset-currency.test.ts`, `doctor-asset-currency.test.ts:60-78`, `e2e-asset-currency.test.ts` | conformant | unit truth table; integration current/outdated/modified; E2E rewrites outdated, preserves modified bytes, reports `MODIFIED_OWNED_ASSET` |
| FR-09 | Delete runtime state only with `--remove-state`; prune emptied dirs | `runtime-state-files.ts:4-27`, `directory-pruner.ts:32-82`, `state-removal.ts:19-24`, `change-applier.ts:65-87`, `remove.ts:48-52,75` | `state-removal.test.ts`, `runtime-state-files.test.ts`, `runtime-state-removal.test.ts`, `directory-pruner.test.ts` | conformant | default keeps files; `--remove-state` deletes+prunes; already-empty runtime dir now pruned; race fails `FILE_CHANGED_SINCE_PREVIEW`; stray file `skipped` (exit 1). CR-03 resolved |
| FR-10 | One legacy warning per file in text; JSON unchanged | `init.ts:49-58,82,88`, `text.ts:11-13,31-34` | `init-legacy-preview.test.ts`, `e2e-legacy-preview.test.ts:55-77` | conformant | gated preview + `(code,path)` skip set; E2E asserts exactly one occurrence for `--yes` and `--dry-run --json` |
| FR-11 | Protocol aligned to 2026-09-14 decisions | `protocol-service.ts:12`, `docs/context-brake-protocol.md:18` | `protocol-service.test.ts:33-50` | conformant | `CRITICAL` row lists `git status`, `git add`, `git commit`; packaged file byte-identical to `renderProtocol(DEFAULT_CONFIG)` |
| FR-12 | Research minimum versions; gate only on `old` | `support-service.ts:9-13`, `docs/research/harness-integrations.md` (8 sections) | `support-service-version-gating.test.ts`, manual review (T07 Handoff) | conformant | only `old` downgrades; truth table with/without floor; no adapter declares a floor because no official introducing-version source exists — recorded as "não documentada (14/09/2026)" per FR-12's own allowance |
| FR-13 | Correct documentation to real state | `docs/research/harness-integrations.md:47,67,85,100,114,128,143,158`; field names at `:121-122,135-136,151`; `README.md:57-64,116` | `readme-support-table.test.ts` (unchanged, passing) | conformant | 8/8 `Versão mínima` lines with date; `.omp/extensions/`, three-line block, and support table match FR-02/FR-03 |
| NFR-01 | Typecheck includes `assets/`; all gates + 5 consecutive `npm test` | `tsconfig.check.json:1-5` (`assets/**/*.ts`, `exclude: []`) | full gate + CI | conformant | build/typecheck/lint/schemas/assets/dependencies/package:smoke pass; coverage 92.66/86.71/95.93/92.66; `npm test` ×5: 95 files, 389 tests, exit 0 each; CI matrix green |
| NFR-02 | `schemaVersion: 1`; schemas only additive; no new runtime dep | `changes.ts:5,19`; `schemas/install-report.schema.json:170-175` | `schemas:check`, `dependencies:check` | conformant | only `runtime_state` added to `CHANGE_OWNERS`; 3 runtime dependency packages, no install scripts |
| NFR-03 | Linux/macOS/Windows × Node 20/22/24 | CI matrix | GitHub Actions run `35008179245` | conformant | `gh run view`: success, headSha `a26e45a`, 9/9 jobs success (ubuntu/macos/windows × 20/22/24) |
| NFR-04 | `init`/`doctor` ≤5 s with eight harnesses, excluding confirmation and overhead | `doctor-service.ts:49` adds read-only `planInstall` per harness | E2E-09 (`e2e-09.test.ts:9,46-52`), eight-harness probe (this review) | conformant | measured on an eight-harness fixture: `init --yes` 659 ms (source) / 867 ms (built CLI), `init --dry-run` 842 ms, `diagnoseProject` without measurer 145 ms; overhead measurement (17.7 s) is the excluded term |
| NFR-05 | User-file changes follow `file-changes.md` | change engine, `directory-pruner.ts:55-72`, runtime-state paths | byte-preservation and idempotency suites; `sha256` preconditions | conformant | deletes only under `.context-brake/`; `rmdir` never follows symlinks and stops at non-empty dirs; suites pass |
| OBJ-01 | PRD-01 quality cycle closed | review half: this report; QA half: pending | — | pending | the review half is satisfied by this report if approved; the first PRD-01 QA (RF1–RF24, CA-01–CA-21) is TC-10's next process stage, not part of this review |
| OBJ-02 | No capability contradicts the recorded documentation; 8/8 levels per FR-02 | predecessor (FR-02 + README table) | `readme-support-table.test.ts`, predecessor suites | conformant | `codereview_09` CA-15/FR-02; README table matches; reused evidence |
| OBJ-03 | Overhead measured by the registered event/payload/handler in 8/8 | predecessor (FR-05, untouched) | predecessor suites | conformant | `codereview_09` FR-05; reused evidence |
| OBJ-04 | Every managed asset differing from the running package appears in `doctor` with remediation | `asset-currency.ts:18-25`, `doctor-service.ts:49` | `doctor-asset-currency.test.ts`, `e2e-asset-currency.test.ts` | conformant | `ASSET_OUTDATED` with installed version and `Run context-brake init --yes.` |
| OBJ-05 | CA-21 and CA-12 pass on Linux/macOS/Windows | predecessor FR-01/FR-19; this feature's CI run | predecessor suites, CI run `35008179245` | conformant | reused `codereview_09` CA-12/CA-21 evidence + 9/9 CI jobs on the reviewed SHA |
| US-01 | Claude Code context usage shown as unavailable/estimated | predecessor | predecessor suites | conformant | `codereview_09` FR-04; reused evidence |
| US-02 | Copilot CLI shows full level and timeout limitation | predecessor | predecessor suites | conformant | `codereview_09` FR-02/FR-03 (CA-15); reused evidence |
| US-03 | Discover an outdated asset with remediation | `asset-currency.ts:18-25` | `doctor-asset-currency.test.ts:60-78` | conformant | `ASSET_OUTDATED` + remediation assertion |
| US-04 | Overhead measured on the real pre-tool handler with documented payload | predecessor | predecessor suites | conformant | `codereview_09` FR-05; reused evidence |
| US-05 | Plan/checkpoint stay ignored after `init` and default `remove` | predecessor | predecessor suites | conformant | `codereview_09` FR-01/CA-21; reused evidence |
| US-06 | Control when runtime state is erased | `remove.ts:48-52,75`, `state-removal.ts:19-24` | `runtime-state-removal.test.ts:37-99` | conformant | default preserves runtime files and `.context-brake/`; `--remove-state` erases and prunes; exit 1 only for stray content |
| US-07 | Read the legacy warning once | `init.ts:49-58,82,88`, `text.ts:31-34` | `e2e-legacy-preview.test.ts:55-77` | conformant | exactly-once counts in combined output |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` | OK | PRD/TechSpec/tasks/handoffs/corrections read; matrix, profile, prior-finding states, immutable report; no other file changed; next suffix `codereview_02` reserved |
| `code-standards.md`, `javascript-typescript.md`, `node.md` | OK | build/lint/typecheck pass; dedicated `PackageMetadataError`; no `any`/suppressions (QA-01/QA-02 zero); `node:path`/`node:fs/promises` only |
| Hexagonal dependency rule | OK | QA-04 (`core` importing `infrastructure`/`cli`) zero hits; `asset-currency.ts` imports only contracts and `change-plan-service` |
| `harness-adapters.md` | OK | schemas non-strict with `.passthrough()`; adapters, fixtures, and research file updated in the same feature for T01/T07/T08; no unconfirmed capability claimed |
| `file-changes.md` | OK | `remove --remove-state` deletes only under `.context-brake/runtime/`; SHA-256 precondition per file; pruning uses `rmdir`, refuses symlinks, stops at non-empty directories; idempotency tested |
| `cli-output.md` | OK | text/JSON parity preserved (`--json` keeps one finding per file, DEC-05); warnings do not add exit codes beyond the existing severity rule; `NO_COLOR` untouched |
| `tests.md` | OK | the CR-01 swallowed cleanup is replaced by `maxRetries` cleanup; new process-lane files registered in `tests/test-lanes.ts`; T09 type fixes preserve every assertion (diffed: optional chaining, union annotations, narrowing guards only) |
| CLI policy in `AGENTS.md` | OK | E2E runs the built CLI against temporary fixture repositories; `npm run package:smoke` verifies the packaged CLI |

## Quality profile

Executed the current TechSpec profile (QA-01..QA-07) over the 47 TypeScript files in `1e7e091..a26e45a`.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' <files>` | 0 new of 1 (`tests/integration/linked-project-root.test.ts:27`, pre-existing at `1e7e091`, unchanged) | OK |
| QA-04 | `core` importing `infrastructure`/`cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" <core files>` | 0 new of 0 | OK |
| QA-05 | `exec`, `execSync`, `shell: true` | blocking | `rg -n '\bexecSync\|\bexec(\|shell:\s*true' <files>` | 0 new of 0 | OK |
| QA-06 | Generic `throw new Error(` where a class names a fixable failure | reservation | `rg -n 'throw new Error\(' <files>` | 1 new of 3 (`scripts/check-install-scripts.ts:10`, a lockfile build check; pre-existing `:14` and `tests/unit/link-capability.test.ts:37`) | OK (reservation only, justified) |
| QA-07 | 4+ parameters, or `.ts` above 100 lines | reservation | param regex + line count | 0 new of 0 (max params ≤3; longest touched file 99 lines) | OK |

- Terrain baseline: applied from the TechSpec for the 24 listed target files (0 pre-existing hits there). The baseline does not enumerate test files, so the one remaining QA-03 hit was discounted manually after confirming it is byte-identical at `1e7e091`. See limitations.
- Hits discounted by baseline: 1.
- Reservations accumulated in the feature: 1 new (`scripts/check-install-scripts.ts:10`), justified — a fail-fast lockfile guard in a build-check script, not a domain failure with a dedicated class; below the trigger.
- Suggested escalation: no trigger fired (fewer than 8 reservation hits, no file above 200 lines, no block duplicated three or more times in the reviewed code).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 documented payload schemas, non-strict | YES | three schemas + fixtures; extra fields parse; typed access asserted |
| DEC-02 `readPackageVersion`, required `pkgVer` | YES | `package-metadata.ts:22-63`; `installation-builder.ts:48` has no fallback; dist/source/missing/name-mismatch/non-semver unit-tested; `remove` has no manifest-rewrite site (documented in T02 Handoff) |
| DEC-03 `classifyAssetCurrency`; doctor/init wiring | YES | `asset-currency.ts:10-14`; `doctor-service.ts:49`; `installation-service.ts:80-85` |
| DEC-04 runtime-state listing, `runtime_state` owner, pruning | YES | `runtime-state-files.ts`, `directory-pruner.ts:44-48`, `change-applier.ts:73`; CR-03 resolved by T12 with an already-empty-directory test |
| DEC-05 legacy preview vs. text-report dedup | YES | `init.ts:49-58,82,88`; `text.ts:11-13,31-34`; unit + E2E exactly-once |
| DEC-06 `CRITICAL` row wording + packaged file | YES | `protocol-service.ts:12` == `docs/context-brake-protocol.md:18`; byte test passes |
| DEC-07 only `old` downgrades; researched floors | YES | `support-service.ts:9-13`; truth table; no fabricated floor |
| DEC-08 research file 2026-09-14 records | YES | 8/8 sections carry `Versão mínima` and the field-name facts |
| DEC-09 asset typecheck scope | YES | `tsconfig.check.json` includes `assets/**/*.ts` and overrides `exclude`; injected-error probe recorded in T09 |
| `ChangeOwner` adds `runtime_state` (additive) | YES | `changes.ts:5`; `schemas/install-report.schema.json:170-175`; `schemas:check` |
| `ASSET_OUTDATED`/`ASSET_MODIFIED` messages and remediation | YES | `asset-currency.ts:18-34` match the contract templates |
| Report schemas additive at version 1 | YES | `schemas:check`; config `schemaVersion` 1; no runtime dependency added |
| CMP-11 `schemas/doctor-report.schema.json` | YES | no shape change was required (finding codes are free-form under the existing regex); `schemas:check` passes on the generated files |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | schemas + fixtures rewritten; schema suites pass |
| T02 | `done/task_02.md` | COMPLETE | reader + wiring; unit + E2E pass; T02.4 `remove.ts` clause marked not applicable |
| T03 | `done/task_03.md` | COMPLETE | classifier + doctor/init wiring; unit/integration/E2E pass |
| T04 | `done/task_04.md` | COMPLETE | lister + pruner + owner; unit/integration pass; CR-03 edge closed by T12 |
| T05 | `done/task_05.md` | COMPLETE | preview gating + skip key; unit/E2E pass |
| T06 | `done/task_06.md` | COMPLETE | row + packaged file; byte test passes |
| T07 | `done/task_07.md` | COMPLETE | gating fix + manual research; truth table passes; no floor declared (no source) |
| T08 | `done/task_08.md` | COMPLETE | research file updated; `readme-support-table` unchanged and passing |
| T09 | `done/task_09.md` | COMPLETE | `tsconfig.check.json` fixed (`exclude: []`); full gate green in one pass; 21 latent type errors fixed assertion-preservingly |
| T10 | `codereview_01/task_10.md` | COMPLETE | CR-01: swallowed cleanup replaced with `maxRetries: 5, retryDelay: 100` |
| T11 | `codereview_01/task_11.md` | COMPLETE | CR-02: `entry.parentPath ?? entry.path ?? runtimeDir` fallback + unit test |
| T12 | `codereview_01/task_12.md` | COMPLETE | CR-03: `removeState` threaded to the applier; already-empty runtime tree pruned; integration test |
| T13 | `codereview_01/task_13.md` | COMPLETE | CR-04: `tasks.md`, `techspec.md`, and `done/task_02.md` citations reconciled to the real suites |

## Executed validations

- Profile and scope: built CLI, runtime assets, schemas, unit/integration/E2E suites, coverage, package contents, dependency scripts, patch hygiene, feature Markdown links, TechSpec quality profile, and a purpose-built eight-harness timing/behavior fixture.
- Validated state: clean worktree at `a26e45a` (parent `1e7e091`); Windows 11 Pro, PowerShell 7, Node v24.19.0, npm 11.17.0.
- Reused evidence: `FR-01`–`FR-05` and their `US`/`OBJ` consequences from `codereview_09` (`2a26a3e..301de3e`), whose modules (`gitignore-service.ts`, `overhead-measurer.ts`, `in-process-sampler.ts`, instruction/legacy services) are untouched by `1e7e091..a26e45a`; T09's injected-error probe for the asset typecheck.
- Manual acceptance: no vendor harness binary was launched; step-hook execution is measured through the adapters' registered fixtures as designed. `FR-12`'s version-floor research is a manual HIL item recorded in T07's Handoff (all eight harnesses recorded as "não documentada (14/09/2026)").

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | compiled CLI, schemas, runtime assets |
| `npm run typecheck` | passed (0 errors) | FR-06..FR-13, NFR-01 assets scope |
| `npm run lint` | passed (0 issues) | code standards |
| `npm test` ×5 consecutive | passed, exit 0 each: 95 files, 389 tests | all in-scope FR/NFR; NFR-01 repeatability |
| `npm run coverage` | passed, exit 0: 92.66% stmts / 86.71% branch / 95.93% funcs / 92.66% lines (≥80) | NFR-01 |
| `npm run schemas:check` | passed | NFR-02 |
| `npm run assets:check` | passed | FR-07, NFR-01 |
| `npm run dependencies:check` | passed: 3 runtime deps, no install scripts | NFR-02 |
| `npm run package:smoke` | passed: 220 packaged files, CLI help | NFR-01, NFR-04 |
| `gh run view 35008179245` | success, headSha `a26e45a`, 9/9 jobs | NFR-03, CA-20, NFR-01 (CI) |
| Eight-harness fixture: built `init --yes --json`, `init --dry-run`, `doctor`, `doctor --json` | `init` 867 ms exit 0 with 8/8 project detections; dry-run 842 ms; `doctor` text 21.9 s (17.7 s of it overhead measurement); `diagnoseProject` without measurer 145 ms | NFR-04, OBJ-02 |
| `git diff --check 1e7e091..a26e45a` | passed (exit 0) | patch hygiene |
| Markdown link scan (`prd.md`, `techspec.md`, `tasks.md`, 14 handoffs/reports) | passed: all local links resolve (17 files) | task/report integrity |
| TechSpec QA-01..QA-07 over 47 TS files | 0 new blocking hits; 1 justified reservation | quality profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| — | — | — | No blocking or new findings in this review; all prior findings are resolved (see next section) | — | — |

Optional improvements:

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| OI-01 | Low (optional) | FR-09 / NFR-03 residual of CR-02 | `src/infrastructure/storage/runtime-state-files.ts:14,18`; `node_modules/@types/node/fs.d.ts:200-252` (`Dirent.parentPath` `@since v20.12.0`, `Dirent.path` `@since v20.1.0`); `package.json:14-16` declares `engines.node: ">=20"` | On Node 20.0.x both directory fields are absent, so the fallback resolves entries against the runtime root and nested runtime files are not listed/deleted by `remove --remove-state`. CI's `node-version: 20` resolves to the latest 20.x, so CI cannot catch it; impact is limited to a narrow, non-LTS patch release and is not destructive | Either document an effective floor of `>=20.1.0` (or `>=20.12.0`) in `package.json`/README, or resolve nested entries without the recursive option; verify on Node 20.0.x before declaring it fixed |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | resolved | `tests/integration/directory-pruner.test.ts:30` now `rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })`; QA-03 scan shows 0 new hits across the diff |
| `codereview_01/CR-02` | resolved | `runtime-state-files.ts:18` resolves `entry.parentPath ?? entry.path ?? runtimeDir`; `runtime-state-files.test.ts:24-34` asserts the `entry.path` fallback; typecheck/lint/tests pass. Residual Node 20.0.x window recorded as OI-01 |
| `codereview_01/CR-03` | resolved | `directory-pruner.ts:44-48` adds `.context-brake/runtime` (and empty subdirectories) as prune candidates when `removeState`; `directory-pruner.test.ts:35-51` proves an already-empty tree is removed; default `remove` remains lenient at the root |
| `codereview_01/CR-04` | resolved | `tasks.md:35,38,45` and `techspec.md:148,151` cite `runtime-state-removal.test.ts`, `directory-pruner.test.ts`, and `support-service-version-gating.test.ts`; `done/task_02.md:47` marks the `remove.ts` clause not applicable |

## Limitations and open items

- No `--base` was passed. The scope was delimited by the single feature commit `a26e45a` (parent `1e7e091`, the base the previous review used) plus the T01–T13 handoffs; the worktree is clean, so committed and worktree state coincide. A future review can pin `--base 1e7e091` explicitly.
- `NFR-03` is proven for the CI matrix's Node 20/22/24 patch levels, not for Node 20.0.x (see OI-01). That runtime is not installed locally, so the residual could not be executed; the finding rests on the `@types/node` API annotations.
- The TechSpec's Terrain baseline enumerates only the 24 target source/config files, not the test files the profile also scans. The remaining QA-03 hit (`linked-project-root.test.ts:27`) is pre-existing at `1e7e091` and was discounted manually; the baseline gap persists from the previous review.
- `OBJ-01`'s QA half — the first PRD-01 QA covering RF1–RF24 and CA-01–CA-21 (TC-10, owner: product owner) — is the next process stage after this review and is not part of the reviewed obligations.
- `FR-12`'s manual research found no official source naming the introducing version for any harness's registered mechanisms, so no adapter declares a floor; all eight sections record "não documentada (14/09/2026)". This is FR-12's explicit allowance and does not weaken any capability claim.
- No vendor harness executable was launched in this review; the measured step-handler path is covered by the adapters' registered fixtures and the existing overhead suites.

## Conclusion

The feature is ready to advance. Every in-scope obligation (`FR-06`–`FR-13`, `NFR-01`–`NFR-05`) is conformant with executed evidence, the predecessor obligations reuse the still-valid `codereview_09` verification because their modules are untouched, all prior findings CR-01–CR-04 are resolved by T10–T13, and the quality profile has no new blocking hit and one justified reservation. The previously unverifiable `NFR-03` is closed by CI run `35008179245` on the exact reviewed SHA, and the previously rejected `QA-03` hit is gone. The opinion is `APPROVED WITH RESERVATIONS` solely for OI-01 (the Node 20.0.x residual of the declared `engines` floor), which is optional and does not block the feature's next stage: PRD-01's first QA covering RF1–RF24 and CA-01–CA-21.
