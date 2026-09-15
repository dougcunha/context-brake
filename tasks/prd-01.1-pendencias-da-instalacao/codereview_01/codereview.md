# Code review report — PRD 1.1 installation follow-ups

## Summary

- Status: REJECTED
- Git scope: `Not delimited by --base — uncommitted worktree against HEAD 1e7e091` (see limitations)
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_09/codereview.md` (predecessor covering `FR-01`–`FR-05`)

The `FR-06`–`FR-13` implementation and the `NFR-01` asset-typecheck slice are functionally complete: adapter payload schemas match documented field names, the manifest records the real package version, `doctor`/`init` classify current/outdated/modified assets, `remove --remove-state` deletes the PRD-02 runtime state and prunes emptied directories, the legacy warning prints once per file, the protocol `CRITICAL` row admits `git add`, the version-gating regression is fixed, the research file is re-checked, and `assets/runtime/` is typechecked. Every quality gate passes and `npm test` passed five consecutive times. The review is nevertheless `REJECTED`: the feature's own blocking quality rule `QA-03` has a new hit in a file this feature created, and `NFR-03`'s cross-platform claim has no evidence for the reviewed state.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01.1-pendencias-da-instalacao/prd.md` | read in full (current version) |
| TechSpec | `tasks/prd-01.1-pendencias-da-instalacao/techspec.md` | read in full (current version) |
| Manifest | `tasks/prd-01.1-pendencias-da-instalacao/tasks.md` | read in full |
| Handoffs | `tasks/prd-01.1-pendencias-da-instalacao/done/task_01.md`..`task_09.md` | all read in full |
| Predecessor review | `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_09/codereview.md` | read (context for `FR-01`–`FR-05`) |
| Project rules | `AGENTS.md`, `.agents/rules/{code-standards,javascript-typescript,node,tests,harness-adapters,file-changes,cli-output}.md` | read and applied |
| Implementation | worktree at HEAD `1e7e091`: 41 tracked modified paths + 18 untracked paths, 47 TypeScript files | delimited by handoffs + worktree (no `--base`) |

No `--base` was supplied. The implementation is uncommitted; the reviewable set is the working tree against `1e7e091`, bounded by the T01–T09 handoffs and their `Affected files`. `techspec.md` itself is part of the worktree diff (the current version was read once). No code, task, or previous report was modified by this review; the only file created is this report.

## Coverage matrix

States: conformant / non-conformant / pending / not verifiable.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `.gitignore` block for plan/checkpoint; dry-run and marker conflicts | predecessor (`gitignore-service.ts`) | predecessor suites | conformant | `tasks.md` Scope note; `codereview_09` verified; not re-verified here |
| FR-02 | Support-level rule (full/partial/cooperative) | predecessor (`support-service.ts`, adapters) | predecessor suites | conformant | `codereview_09`; not re-verified here |
| FR-03 | Failure/timeout limitation per harness | predecessor (adapter limitations) | predecessor suites | conformant | `codereview_09`; not re-verified here |
| FR-04 | Context usage declared only when received | predecessor (adapter `context_usage`) | predecessor suites | conformant | `codereview_09`; not re-verified here |
| FR-05 | Event/payload/handler-accurate overhead measurement | predecessor (`overhead-measurer.ts`) | predecessor suites | conformant | `codereview_09`; not re-verified here |
| FR-06 | Read documented payload field names | `antigravity-cli/schemas.ts:10-20`, `pi/schemas.ts:7-17`, `oh-my-pi/schemas.ts:7-17` | `tests/unit/harness-schemas-in-process.test.ts`, `harness-schemas-process.test.ts` | conformant | fixtures rewritten with extra passthrough field; 387 tests pass; no adapter reads the old names |
| FR-07 | Manifest records the running package version | `package-metadata.ts:46-63`, `installation-builder.ts:44-48` | `tests/unit/package-metadata.test.ts`, `tests/e2e/e2e-01-02.test.ts` | conformant | E2E asserts `manifest.packageVersion === package.json.version`; T02.4 `remove.ts` half has no site (`removal-service.ts` only deletes the manifest) |
| FR-08 | Classify managed assets; never overwrite a modified asset | `asset-currency.ts:10-88`, `doctor-service.ts:48-50`, `installation-service.ts:80-88` | `asset-currency.test.ts`, `doctor-asset-currency.test.ts`, `e2e-asset-currency.test.ts` | conformant | unit truth table; integration current/outdated/modified; E2E rewrites outdated, preserves modified bytes with `MODIFIED_OWNED_ASSET` |
| FR-09 | Delete runtime state only with `--remove-state`; prune empty dirs | `runtime-state-files.ts`, `directory-pruner.ts`, `state-removal.ts:19-24`, `removal-service.ts:86`, `change-applier.ts:57-64` | `state-removal.test.ts`, `runtime-state-files.test.ts`, `runtime-state-removal.test.ts`, `directory-pruner.test.ts` | conformant | default keeps runtime files; `--remove-state` deletes and prunes; race fails with `FILE_CHANGED_SINCE_PREVIEW`; stray file `skipped` (exit 1). Edge gap at CR-03 |
| FR-10 | One legacy warning per file in text; JSON unchanged | `init.ts:47-56,80-84`, `text.ts:11-35` | `init-legacy-preview.test.ts`, `e2e-legacy-preview.test.ts` | conformant | gated preview + skip key; E2E asserts exactly one occurrence for `--yes` and `--dry-run --json` |
| FR-11 | Protocol aligned to 2026-09-14 decisions | `protocol-service.ts:12`, `docs/context-brake-protocol.md:18` | `tests/unit/protocol-service.test.ts:33-50` | conformant | `CRITICAL` row lists `git status`, `git add`, `git commit`; packaged file byte-identical to `renderProtocol(DEFAULT_CONFIG)`; `doctor` emits `PROTOCOL_FILE_MISMATCH` on drift |
| FR-12 | Research minimum harness versions; gate only on `old` | `support-service.ts:9-14`, `harness-integrations.md` | `support-service-version-gating.test.ts` | conformant | only `old` downgrades; no adapter declares a floor (no official source), recorded as "não documentada (14/09/2026)" per FR-12's allowance |
| FR-13 | Correct documentation to real state | `docs/research/harness-integrations.md` | manual review (`readme-support-table.test.ts` unchanged) | conformant | Antigravity `toolCall.name/args`; Pi/Oh-My-Pi `toolName/toolCallId/input/content`; 8/8 floor lines |
| NFR-01 | Typecheck includes `assets/`; gates pass; 5 consecutive `npm test` | `tsconfig.check.json` (`assets/**/*.ts`, `exclude: []`) | `npm run typecheck`; full gate | conformant | build/typecheck/lint/coverage(92.62/86.65/95.9/92.62)/schemas/assets/dependencies/package:smoke pass; 5/5 test runs green (95 files, 387 tests) |
| NFR-02 | `schemaVersion: 1`; schemas only additive | `changes.ts:4`, `install-report.schema.json` | `schemas:check` | conformant | only `runtime_state` added to `CHANGE_OWNERS`; no dependency added |
| NFR-03 | Linux/macOS/Windows × Node 20/22/24 | — | CI matrix | not verifiable | no CI run for this uncommitted state; local evidence is Windows 11 / Node 24 only (see limitations) |
| NFR-04 | `init`/`doctor` ≤5 s | `planInstall` reads only, no processes | existing timing suite | conformant | `doctor-asset-currency`/`doctor-benchmark` suites pass; T09 handoff full gate |
| NFR-05 | User-file changes follow `file-changes.md` | change engine, gitignore/runtime-state paths | byte-preservation suites | conformant | 387 tests pass, including byte-preservation and idempotency suites |
| OBJ-01 | PRD-01 quality cycle closed | this review + QA (process) | — | pending | this is the feature's `sdd-review-code`; the report below is not `APPROVED`; QA not yet run |
| US-03 | Discover an outdated asset with remediation | `asset-currency.ts:18-25` | `doctor-asset-currency.test.ts` | conformant | `ASSET_OUTDATED` with remediation `Run context-brake init --yes.` |
| US-06 | Control when runtime state is erased | `state-removal.ts:19-24` | `runtime-state-removal.test.ts` | conformant | default preserves; `--remove-state` erases |
| US-07 | Read the legacy warning once | `init.ts`, `text.ts` | `e2e-legacy-preview.test.ts` | conformant | exactly-once assertions |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` | OK | PRD/TechSpec/tasks/handoffs read; matrix, profile, findings, immutable report; no other file changed |
| `code-standards.md`, `javascript-typescript.md`, `node.md` | OK | build/lint/typecheck pass; dedicated `PackageMetadataError`; no `any`/suppression; QA-04/QA-05 zero hits |
| Hexagonal dependency rule | OK | QA-04 (`core` importing `infrastructure`/`cli`) zero hits; `asset-currency.ts` imports only contracts + a core service |
| `harness-adapters.md` | OK | schemas non-strict; research file, adapters, and fixtures updated together for T01/T07; no unconfirmed capability claimed |
| `file-changes.md` | OK | `remove --remove-state` deletes only `.context-brake/runtime/`; SHA-256 precondition kept per file; pruning stops at non-empty/symlinked dirs |
| `cli-output.md` | OK | text/JSON parity preserved; `--json` keeps one finding per file (DEC-05); warnings do not change `doctor`'s code except the existing severity rule |
| `tests.md` | NOT OK | `tests/integration/directory-pruner.test.ts:30` swallows a cleanup error (`catch(() => {})`), a QA-03 hit (CR-01); FIRST cleanup assertions weakened |

## Quality profile

Executed the current TechSpec profile (QA-01..QA-07) over the 47 TypeScript files in the reviewable set.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `rg -n -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' <files>` | 1 new of 2 (`tests/integration/directory-pruner.test.ts:30` new; `tests/integration/linked-project-root.test.ts:27` pre-existing) | NOT OK |
| QA-04 | `core` importing `infrastructure`/`cli` | blocking | `rg -n "from '(\.\./)+(infrastructure\|cli)/" <core files>` | 0 new of 0 | OK |
| QA-05 | `exec`, `execSync`, `shell: true` | blocking | `rg -n '\bexecSync\(\|\bexec\(\|shell:\s*true' <files>` | 0 new of 0 | OK |
| QA-06 | Generic `throw new Error(` where a class names the failure | reservation | `rg -n 'throw new Error\(' <files>` | 1 new of 2 (`scripts/check-install-scripts.ts:10`, a build-check script; not a fixable domain failure) | OK (reservation only) |
| QA-07 | 4+ parameters, or `.ts` above 100 lines | reservation | param regex + line count | 0 new of 0 (max params ≤3; no file >100 lines) | OK |

- Terrain baseline: applied from the TechSpec for the 24 listed target files (0 pre-existing hits there). The baseline omits the test files in the diff; `linked-project-root.test.ts:27` is pre-existing at `1e7e091` and was discounted manually. See limitations.
- Hits discounted by baseline: 1.
- Reservations accumulated in the feature: 1 (`check-install-scripts.ts:10`), justified; below the 8-hit trigger.
- Suggested escalation: no trigger fired (fewer than 8 reservation hits, no file above 200 lines, no block duplicated three or more times).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 documented payload schemas, non-strict | YES | three schemas + fixtures; extra fields parse; `antigravityToolCallSchema` |
| DEC-02 `readPackageVersion`, required `pkgVer` | YES | `package-metadata.ts:22-63`; `pkgVer` required in `installation-builder.ts:44-48`; dist/source candidates unit-tested. `remove` has no manifest-rewrite site |
| DEC-03 `classifyAssetCurrency`; doctor/init wiring | YES | `asset-currency.ts:10-14`; `doctor-service.ts:49`; `installation-service.ts:80-83` |
| DEC-04 `runtime-state-files`, `runtime_state` owner, pruning | PARTIAL | code and tests present; already-empty runtime dir not pruned (CR-03) |
| DEC-05 legacy preview vs. text-report dedup | YES | `init.ts:47-56,80-84`; `text.ts:11-35` |
| DEC-06 `CRITICAL` row wording + packaged file | YES | `protocol-service.ts:12` == `docs/context-brake-protocol.md:18`; unit byte test |
| DEC-07 only `old` downgrades; researched floors | YES | `support-service.ts:9-14`; truth table test; no fabrication |
| DEC-08 research file 2026-09-14 records | YES | 8/8 sections updated; field names recorded |
| DEC-09 asset typecheck scope | YES | `tsconfig.check.json` includes `assets/**/*.ts` and overrides `exclude` |
| `ChangeOwner` adds `runtime_state` (additive) | YES | `changes.ts:4`; `install-report.schema.json:170-174`; `schemas:check` |
| `ASSET_OUTDATED`/`ASSET_MODIFIED` messages | YES | `asset-currency.ts:18-34` match the contract templates |
| Report schemas additive at version 1 | YES | `schemas:check`; config `schemaVersion` 1 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | schemas + fixtures rewritten; schema suites pass |
| T02 | `done/task_02.md` | COMPLETE | reader + wiring; unit + E2E pass; T02.4 `remove.ts` half has no code path (documented) |
| T03 | `done/task_03.md` | COMPLETE | classifier + doctor/init wiring; unit/integration/E2E pass |
| T04 | `done/task_04.md` | COMPLETE | lister + pruner + owner; unit/integration pass; empty-runtime-dir edge open (CR-03) |
| T05 | `done/task_05.md` | COMPLETE | preview gating + skip key; unit/E2E pass |
| T06 | `done/task_06.md` | COMPLETE | row + packaged file; unit byte test passes |
| T07 | `done/task_07.md` | COMPLETE | gating fix + research; truth table passes; T07.3/T07.5 N/A (no source) |
| T08 | `done/task_08.md` | COMPLETE | research file updated; `readme-support-table` unchanged and passing |
| T09 | `done/task_09.md` | COMPLETE | `tsconfig.check.json` fixed; full gate green in one pass; 21 latent type errors fixed |

## Executed validations

- Profile and scope: built CLI, runtime assets, schemas, unit/integration/E2E suites, coverage, package contents, dependency scripts, patch hygiene, feature Markdown links, TechSpec quality profile.
- Validated state: uncommitted worktree at HEAD `1e7e091`; Windows 11 Pro, PowerShell 7, Node v24.19.0, npm 11.17.0.
- Reused evidence: T09's injected-error probe (asset file) and the T09 full-gate run are reused for the same worktree; `FR-01`–`FR-05` evidence is reused from `codereview_09` because those modules are outside this diff.
- Manual acceptance: no vendor harness binary was launched; schema/payload shapes were checked against the adapters, fixtures, and the recorded research. `FR-12`'s version-floor research is a manual HIL item recorded in T07's handoff.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | compiled CLI, schemas, runtime assets |
| `npm run typecheck` | passed | FR-06..FR-13, NFR-01 (assets scope) |
| `npm run lint` | passed (0 issues) | code standards |
| `npm test` | passed ×5 consecutive: 95 files, 387 tests, 0 failed | all in-scope FR/NFR; NFR-01 repeatability |
| `npm run coverage` | passed: 92.62% stmts / 86.65% branch / 95.9% funcs / 92.62% lines (≥80) | NFR-01 |
| `npm run schemas:check` | passed | NFR-02 |
| `npm run assets:check` | passed | FR-07, NFR-01 |
| `npm run dependencies:check` | passed: 3 runtime deps, no install scripts | NFR-02 |
| `npm run package:smoke` | passed: CLI smoke, packaged assets | NFR-01, NFR-04 |
| `git diff --check` | passed (exit 0) | patch hygiene |
| Markdown link scan (`prd.md`, `techspec.md`, `tasks.md`) | passed: all local links resolve | task/report integrity |
| TechSpec QA-01..QA-07 over 47 TS files | 1 blocking hit (QA-03); 0 others | quality profile |
| `@types/node` annotation check | `parentPath` `@since v20.12.0` | CR-02 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium (blocking class) | QA-03 | `tests/integration/directory-pruner.test.ts:30` — `await rm(dir, { recursive: true, force: true }).catch(() => {});`, introduced by T04 in a new file | A failing temp-dir cleanup passes silently, hiding leaked fixtures; violates the feature's own blocking rule and the spirit of `tests.md` cleanup assertions | Replace with a non-swallowing cleanup as `tests/integration/runtime-state-removal.test.ts:40` does, or assert/log the error. Cause proven: the line matches QA-03 exactly |
| CR-02 | Medium | FR-09 / NFR-03 | `src/infrastructure/storage/runtime-state-files.ts:12` uses `entry.parentPath`, documented `@since v20.12.0` (`node_modules/@types/node/fs.d.ts:246-248`), while `package.json:14-16` declares `engines.node: ">=20"` | On Node 20.0–20.11 `parentPath` is `undefined`, so `relative(runtimeDir, undefined)` throws and `remove --remove-state` fails with an unexpected error, contradicting the declared support range | Use `entry.parentPath ?? entry.path`, or raise `engines` to `>=20.12`. CI's `node-version: 20` resolves to the latest 20.x, so CI would not catch this |
| CR-03 | Low | FR-09 / T04 Handoff open item | `src/infrastructure/storage/directory-pruner.ts:21-33` only visits ancestors of files actually deleted; `planRuntimeStateDeletions` returns no changes when `.context-brake/runtime/` exists but holds no files | `remove --remove-state` does not remove an already-empty `.context-brake/runtime/` (or empty parents), so FR-09's "ele é removido" is only met when the directory contains files | Prune `.context-brake/runtime/` when `removeState` is set even with no listed files, or document the boundary. Depends on an empty-dir-only state |
| CR-04 | Low | tasks.md / TechSpec traceability | `tasks.md:35` and `techspec.md:148` cite `tests/integration/safe-removal.test.ts` for FR-09/TC-05, but that file is unchanged and the new coverage is in `tests/integration/runtime-state-removal.test.ts` and `tests/integration/directory-pruner.test.ts`; `tasks.md:38`/`techspec.md:151` cite `support-service.test.ts`/`adapter-version-probes.test.ts` while the new gating truth table is `tests/unit/support-service-version-gating.test.ts`; `done/task_02.md:47` marks T02.4 `[x]` although `remove.ts` was intentionally left unmodified | The manifest's evidence links do not resolve to the tests that actually prove the obligation, weakening traceability for the next reviewer or QA | Point each row at the real test file, and mark T02.4 as "not applicable" with its handoff note |

No optional improvements beyond CR-03/CR-04; the single QA-06 reservation (`scripts/check-install-scripts.ts:10`) is justified and is not a finding.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| — | — | First review of this feature; no prior `tasks/prd-01.1-pendencias-da-instalacao/codereview_*` report exists. Predecessor `codereview_09` findings concern PRD-01 and are outside this feature's scope |

## Limitations and open items

- No `--base`: the implementation is uncommitted, so the reviewable set is the worktree against `1e7e091`, bounded by the T01–T09 handoffs. A committed range would make the scope exact.
- `NFR-03` (Linux/macOS/Windows × Node 20/22/24) is `not verifiable` for this state: no CI run exists, and the local environment is Windows 11 / Node 24 only. `remove --remove-state` path and directory-pruning behavior are platform-sensitive; T04's and T09's handoffs name a matrix run only as expected evidence, none is recorded.
- The TechSpec quality-profile baseline covers only the 24 target source/config files; it does not record the test files the profile also scans. This is a baseline gap, so `linked-project-root.test.ts:27` was discounted manually rather than from a recorded baseline. The pattern is widespread terrain debt (19 occurrences in 10 files at `1e7e091`).
- `NFR-01`'s five consecutive `npm test` runs pass locally (Windows, Node 24). The cross-platform repeatability slice depends on the missing CI run above.
- The untracked `.agents/scheduled_tasks.lock` is unrelated to this feature and is not part of the reviewable set.
- `OBJ-01` (a PRD-01.1 `APPROVED` review plus the first PRD-01 QA) is a process step; it remains pending because this report is `REJECTED` and QA has not run.

## Conclusion

The `FR-06`–`FR-13` implementation and the `NFR-01` asset-typecheck slice are correct and well-tested: every functional obligation is conformant, all quality gates pass, coverage is ≥80% on every metric, and `npm test` passed five consecutive times. The verdict is `REJECTED` on two narrow, well-proven items: a new blocking `QA-03` hit in a test file this feature created (`directory-pruner.test.ts:30`), and the unverifiable `NFR-03` cross-platform claim for the reviewed state. Both are cheap to close — replace the swallowed cleanup, reconcile the `parentPath`/`engines` floor, optionally prune an empty runtime directory, and record a CI matrix run — after which a re-review of the affected part can approve the feature.
