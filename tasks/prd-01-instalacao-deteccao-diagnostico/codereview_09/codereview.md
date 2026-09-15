# Code review report: PRD-01 installation, detection, and diagnostics

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `2a26a3e..301de3e` (reviewable code state `2ec5d5d`; `301de3e` is docs-only; CI head SHA `2ec5d5de1b25804f45fb1fe9e134ee789934436d`)
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_08/codereview.md` (SHA-256 `AD7824807E4B29B36ABF9C8C66138B84B4F9C6D26A8049EC228369C9B956D332`, unchanged)

The correction set resolves all six `codereview_08` findings. The trailing-comment removal defect (CR-01) is fixed and independently reproduced as an exact byte round trip; capability/support levels match the approved PRD 1.1 rule (CR-02); the owned `.gitignore` block, its doctor check, and the removal consent path exist and are tested (CR-03); the overhead measurer exercises the registered event and named tool handler (CR-04); the README matches runtime behavior and is drift-guarded (CR-05); and one current nine-job CI run proves the correction state on Ubuntu, macOS, and Windows under Node 20/22/24 (CR-06). Two optional documentation/bookkeeping items remain (CR-07, CR-08).

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read in full |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read in full |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read in full |
| Follow-up PRD | `tasks/prd-01.1-pendencias-da-instalacao/prd.md` | read in full (referenced subset) |
| Follow-up TechSpec | `tasks/prd-01.1-pendencias-da-instalacao/techspec.md` | read in full (referenced subset) |
| Previous review | `codereview_08/codereview.md` | read in full; hash recorded and unchanged |
| Correction tasks | `codereview_08/done/task_29.md`..`task_35.md` | all read in full, every Handoff read |
| CI | GitHub Actions run `34980598912` at `2ec5d5d` | verified: `status=completed`, `conclusion=success`, 9 jobs |
| Project rules | `AGENTS.md`, `C:\Users\Admin\.claude\RTK.md`, applicable `.agents/rules/*.md` | read and applied |
| Implementation | committed range `2a26a3e..301de3e`; 82 changed paths (61 TypeScript) | delimited by the immutable Git range; clean worktree at `301de3e` |

No `--base` was supplied; the correction set is an immutable committed range. `codereview_08`, all earlier reports, and all task files were not modified by this review. The only file created is this report.

## Coverage matrix

States: conformant / non-conformant / pending / not verifiable.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect the eight MVP harnesses | detector registry, per-harness detectors | detection unit/integration suites | conformant | `npm test` 85 files/350 pass |
| RF2 | Report project vs machine origin and version | detection service, version probes | detection/version suites | conformant | suites pass; `VERSION_FLOOR_UNVERIFIED` when no floor |
| RF3 | Shared instruction files are not harness proof | detectors require strong project evidence | UT-01, IT-16 | conformant | suites pass |
| RF4 | Explicit include/exclude precedence | detection service selection | UT-02, IT-03 | conformant | suites pass |
| RF5 | Register each documented extension mechanism | eight adapters, registry | adapter/registration/E2E suites | conformant | suites pass; CI green |
| RF6 | Preserve existing user integrations | `json-span-utils.ts:36-99`, Codex/Cursor updaters | `codex-cursor-user-hooks.test.ts`, `e2e-user-hook-preservation.test.ts` | conformant | fresh probe: exact round trip; CR-01 resolved |
| RF7 | Do not modify invalid harness config | adapter planners, change applier | UT-05, IT-04, E2E-05 | conformant | suites pass |
| RF8 | Assign and display support level per capability matrix | `support-service.ts:46-56`, eight adapter `CAPABILITIES` | `support-service.test.ts`, `harness-adapters.test.ts` | conformant | profiles match PRD 1.1 table; TC-01/TC-02 pass |
| RF9 | Warn when version is below minimum | `version-service.ts`, `support-service.ts:9-27` | `adapter-version-probes.test.ts`, TC-12 | conformant | injected old/current fixtures; no invented floors |
| RF10 | Create the project protocol file | `protocol-service.ts` | protocol/package suites | conformant | suites pass |
| RF11 | Add a short reference between owned markers | `instruction-service.ts`, markers | instruction-policy suites | conformant | suites pass |
| RF12 | Do not create instruction files by default | instruction-service policy | UT-08, IT-06 | conformant | suites pass |
| RF13 | Deduplicate symlinked instruction files | physical identity resolution | IT-05, CA-07 E2E | conformant | suites pass |
| RF14 | Detect/migrate legacy `CONTEXTOPS` with consent | legacy-preview, instruction-service | UT-09, IT-07 | conformant | suites pass |
| RF15 | Create config with defaults | config store, installation-builder | config/E2E suites | conformant | suites pass |
| RF16 | Validate config with field/value/rule | Zod schema + cross-field refinements | UT-12, IT-10 | conformant | suites pass |
| RF17 | Publish config schema | generated schemas | `schemas:check` | conformant | command passes |
| RF18 | Dry-run without mutation | CLI preview, plan service | IT-08, E2E-06/E2E-11 | conformant | suites pass |
| RF19 | Removal preserves other content; state only with consent | removal-service, gitignore-service, state-removal | UT-11, IT-09, E2E-07 | conformant | suites pass; default keeps block |
| RF20 | Doctor lists state, version, level, missing capabilities | doctor-service, harness-diagnosis | diagnostic suites, E2E-08 | conformant | suites pass |
| RF21 | Validate config, markers, protocol, plan/checkpoint, ignore block | doctor-checks, `gitignore-checks.ts:26-36` | UT-25, IT-18, doctor E2E | conformant | `STATE_FILES_NOT_IGNORED` / `MALFORMED_GITIGNORE_MARKERS` |
| RF22 | Measure overhead of configured integration | `overhead-measurer.ts`, `in-process-sampler.ts` | UT-17, TC-04, `doctor-benchmark.test.ts` | conformant | event argv + named handler selected; CR-04 resolved |
| RF23 | Text + JSON parity and distinct exit codes | text/json renderers, exit-codes | E2E-08, UT-20 | conformant | suites pass |
| RF24 | Owned `.gitignore` block for plan/checkpoint | `gitignore-service.ts`, `gitignore-markers.ts`, wiring | UT-21..UT-25, IT-17/18, E2E-11 | conformant | CR-03 resolved; suites pass |
| CA-01 | Init registers Claude project integration | planners, change applier | E2E-01, IT-01 | conformant | suites + CI E2E-10 |
| CA-02 | Codex and Cursor install together | registries/planners | E2E-02, IT-02 | conformant | suites pass |
| CA-03 | Shared-instructions-only repo writes nothing, warning exit | detection + CLI | E2E-03, UT-01/UT-03 | conformant | suites pass |
| CA-04 | Exclude Copilot, install Cursor | CLI selection | IT-03, UT-02 | conformant | suites pass |
| CA-05 | Three installs preserve user integrations | JSON item editors | IT-01, E2E-04, E2E-11, `codex-cursor-user-hooks.test.ts` | conformant | fresh probe idempotent; user bytes identical |
| CA-06 | Invalid harness config isolated | adapter conflict mapping | UT-05, IT-04, E2E-05 | conformant | suites pass |
| CA-07 | Symlink `AGENTS.md`→`CLAUDE.md`: one block, link kept | identity resolution | IT-05, E2E-10 | conformant | suites + CI pass |
| CA-08 | Reference block ≤10 lines and points to protocol | instruction-service | UT-07 | conformant | three-line block asserted |
| CA-09 | No instruction file created by default | instruction policy | UT-08, IT-06 | conformant | suites pass |
| CA-10 | Unconfirmed legacy migration leaves bytes equal | legacy-preview | UT-09, IT-07 | conformant | suites pass |
| CA-11 | Dry-run changes nothing | plan/CLI | IT-08, E2E-06, E2E-11 | conformant | suites pass |
| CA-12 | Removal keeps plan/checkpoint (ignored by git) unless consent | removal-service, gitignore, state-removal | IT-09, IT-18, E2E-07 | conformant | `git status --porcelain` proof |
| CA-13 | Invalid config exits with error and pointers | config validation | UT-12, IT-10 | conformant | suites pass |
| CA-14 | Removed integration appears missing, error exit | doctor | UT-13, IT-11 | conformant | suites pass |
| CA-15 | Copilot shows `full` + timeout limitation (PRD 1.1) | adapter declaration, limitation projection | UT-14, `copilot-failure-policy.test.ts`, `e2e-support-limitations.test.ts` | conformant | Copilot `full`; limitation present; no warning finding |
| CA-16 | Old harness shows detected/minimum/affected | version gating | UT-15, IT-13 | conformant | suites pass |
| CA-17 | `doctor --json` matches published schema and text | report-service, JSON renderer | E2E-08, UT-16 | conformant | suites pass |
| CA-18 | Doctor shows overhead p95 vs target | measurer, doctor projection | UT-17, IT-14, TC-04 | conformant | suites pass; informational status |
| CA-19 | README quick start reaches error-free diagnosis | README, CLI | E2E-09, package smoke | conformant | E2E-09 passes; README corrected |
| CA-20 | Linux/macOS/Windows × PowerShell/Git Bash scenarios | CI matrix, shell tests | E2E-10, `codex-hook-command-shells.test.ts` | conformant | run `34980598912` all 9 jobs success at `2ec5d5d` |
| CA-21 | `.gitignore` block idempotent, user bytes preserved | gitignore-service | UT-21..UT-24, IT-17, E2E-11 | conformant | suites pass; one block after 3 runs |
| PRD 1.1 FR-01 | RF24/RF19 git-ignore lifecycle | `gitignore-service.ts`, wiring, conflict isolation | UT-21..25, IT-17/18, E2E-11 | conformant | T31/T32; CR-03 resolved |
| PRD 1.1 FR-02 | Support-level rule (`full`/`partial`/`cooperative`) | `support-service.ts:46-56`, adapters | TC-01, TC-02 | conformant | exhaustive combinations pass |
| PRD 1.1 FR-03 | Failure/timeout limitation shown, no exit change | adapter `timeout_fail_closed` + `limitations` projection | TC-03, `copilot-failure-policy.test.ts`, E2E support-limitations | conformant | text/JSON parity; exit 0 |
| PRD 1.1 FR-04 | Context usage declared only when received | adapter `context_usage` states | TC-02 | conformant | claude/cursor/copilot/codex/antigravity unavailable; pi/omp available |
| PRD 1.1 FR-05 | Measure registered event, payload, tool handler | `overhead-measurer.ts:31,56`, `in-process-sampler.ts:36-67` | TC-04, `overhead-measurer.test.ts`, `in-process-sampler.test.ts` | conformant | sentinel counters prove named handler only |
| PRD 1.1 FR-06 | Read documented payload field names | `antigravity-cli/schemas.ts`, `pi/schemas.ts`, `oh-my-pi/schemas.ts` | none in this set | pending | not part of the CR-01..CR-06 correction set; schemas still use `toolName`/`name`; belongs to the PRD 1.1 cycle |
| PRD 1.1 FR-07 | Manifest records the running package version | `installation-builder.ts` | none in this set | pending | still defaults `1.0.0`; not in this correction set |
| PRD 1.1 FR-08 | Compare managed assets with the package | none in this set | none in this set | pending | belongs to the PRD 1.1 cycle |
| PRD 1.1 FR-09 | Remove runtime state only with `--remove-state` | `state-removal.ts` covers plan/checkpoint only | none for runtime dir | pending | `runtime-state-files.ts`/directory pruning absent; not in this set |
| PRD 1.1 FR-10 | One legacy warning per file | legacy preview only | none in this set | pending | not in this correction set |
| PRD 1.1 FR-11 | Protocol aligned to 2026-09-14 decisions | `protocol-service.ts` unchanged | none in this set | pending | `docs/context-brake-protocol.md` unchanged; not in this set |
| PRD 1.1 FR-12 | Research minimum harness versions | `docs/research/harness-integrations.md` unchanged | none in this set | pending | not in this correction set |
| PRD 1.1 FR-13 | Correct documentation to real state | `README.md` corrected; research file unchanged | `readme-support-table.test.ts` | partial | README path/table/block/marker conformant (CR-05 resolved); 2026-09-14 research record still pending |
| PRD 1.1 NFR-01 | Quality gates, asset typecheck, five repeatable runs | gates green; `tsconfig.check.json` excludes `assets/` | T35 five runs, CI matrix | partial | all gates and five runs pass; asset-source typecheck (DEC-13) not in this set |
| PRD 1.1 NFR-02 | Config stays `schemaVersion` 1; additive schemas | schemas regenerated additively | `schemas:check`, `schemas.test.ts` | conformant | `ignore_block`, `tool_coverage` added; version 1 |
| PRD 1.1 NFR-03 | Linux/macOS/Windows, Node 20/22/24 | CI matrix | CI run `34980598912` | conformant | 9/9 jobs success |
| PRD 1.1 NFR-04 | `init`/`doctor` finish in ≤5 s | E2E-09 timing | E2E-09 | conformant | suite passes |
| PRD 1.1 NFR-05 | Every user-file change follows `file-changes.md` | change engine, gitignore service | byte-preservation suites | conformant | suites pass; probe exact round trip |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` | OK | PRD/TechSpec/tasks/handoffs read; matrix, profile, findings, immutable report; no other file changed |
| `RTK.md` | OK | repository commands issued through `rtk` |
| `code-standards.md`, `javascript-typescript.md`, `node.md` | OK | build/lint/typecheck pass; QA-01..QA-06 zero true hits |
| Hexagonal dependency rule | OK | QA-04 (`core` importing `infrastructure`/`cli`) zero hits |
| `harness-adapters.md` | OK | adapter declarations match the PRD 1.1 contract table; fixtures per adapter |
| `file-changes.md` | OK | install/remove round trip reproduces exact bytes; CR-01 resolved |
| `cli-output.md` | OK | text/JSON parity asserted; no limitation creates a finding or changes exit code |
| `tests.md` | OK | both POSIX shells and the Windows cmd path are registered per platform; local skip / CI fail policy enforced |
| `antislop` / `antislop-copywriting` | OK | report states observed behavior and concrete evidence |

## Quality profile

Executed the PRD-01 TechSpec profile (QA-01..QA-06) over the 61 TypeScript files in the reviewable diff `2a26a3e..301de3e`.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' <files>` | 0 new of 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <files>` | 0 new of 0 | OK |
| QA-03 | empty `catch` / `.catch(() => {})` | blocking | `rg -n -U --type ts 'catch...(empty)` | 0 new of 0 | OK |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" <core files>` | 0 new of 0 | OK |
| QA-05 | generic `throw new Error(` | reservation | `rg -n --type ts 'throw new Error\(' <files>` | 0 new of 0 | OK |
| QA-06 | 4+ parameters, or `.ts` file above 100 lines | reservation | TechSpec param regex + `Get-Content`/line count | 1 scan hit, 0 genuine; no file >100 lines | OK (false positive: `in-process-sampler.ts:36` has 3 parameters; the regex matched a comma inside `ReadonlyMap<string, HookHandler>`) |

Also checked PRD 1.1 blocking QA-05 (`execSync(`, `exec(`, `shell: true`): 0 hits.

- Terrain baseline: PRD-01 TechSpec baseline at `99643a5`, PRD 1.1 baseline at `f2227e1`. The correction set re-touches baseline rows (`snapshot-helper.ts`, adapters, `support-service.ts`) and adds files with no baseline row (`in-process-sampler.ts`, `gitignore-*.ts`, helper tests); all baseline rows carry no pre-existing QA-01..QA-06 hit, so no genuine hit needed discounting.
- Hits discounted by baseline: 0.
- Reservations accumulated in the feature: 0 genuine (1 regex false positive, explained above).
- Suggested escalation: no trigger fired (fewer than 8 reservation hits, no file above 200 lines, no block duplicated three times).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal boundaries and dependency direction | YES | QA-04 zero hits |
| T25 item-level JSON editing preserves unrelated bytes | YES | `json-span-utils.ts:36-99`; fresh probe exact round trip for both harnesses |
| DEC-03 Antigravity registers only `PreInvocation` | YES | adapter declares `pre_tool_block` unsupported; cooperative |
| Removal validates each harness config and isolates conflicts | YES | removal-service conflict set; IT-04/E2E-05 |
| DEC-04 Codex POSIX + Windows commands and git-root warning | YES | `commandWindows` registered; `cmd.exe /C`/`sh -lc`/`bash -lc` tests; CI run `34980598912` |
| Capability profile and support-level contract (PRD 1.1) | YES | adapter tables match; TC-01 exhaustive, TC-02 exact |
| `IgnoreBlock`, DEC-02 build step 9, UT-21..25, IT-17/18, E2E-11 | YES | `gitignore-service.ts`, `gitignore-checks.ts`, wiring, suites pass |
| `OverheadMeasurement` exercises the exact installed invocation | YES | event argv at `overhead-measurer.ts:31`; named handler at `in-process-sampler.ts:36-47` |
| Benchmark status is informational | YES | `toMeasurement` status data only; no finding; doctor exit unaffected |
| Report schemas additive at `schemaVersion` 1 | YES | `ignore_block`, `tool_coverage` present; `schemas:check` passes |
| Vitest coverage thresholds ≥80% | YES | 92.33% statements / 86.01% branches / 95.68% functions / 92.33% lines |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01-T06 | `done/task_1.md`..`done/task_6.md` | COMPLETE | predecessor work; current gates pass |
| T07-T22 | `codereview_01`..`codereview_05` `done/` | COMPLETE | archived; current gates pass |
| T23-T28 | `codereview_06`/`codereview_07` `done/` | COMPLETE | archived; prior findings closed below |
| T29 | `codereview_08/done/task_29.md` | COMPLETE | Handoff complete; exact byte round trip reproduced; CR-01 resolved |
| T30 | `codereview_08/done/task_30.md` | COMPLETE | HIL decision recorded; profiles match; TC-01/02/03 pass; CR-02 resolved |
| T31 | `codereview_08/done/task_31.md` | COMPLETE | pure ignore-block services; UT-21..25 pass; CR-03 |
| T32 | `codereview_08/done/task_32.md` | COMPLETE | init/remove/doctor wiring; IT-17/18, E2E-11 pass; CR-03 |
| T33 | `codereview_08/done/task_33.md` | COMPLETE | event argv + named handler; sentinel counters; CR-04 resolved |
| T34 | `codereview_08/done/task_34.md` | COMPLETE | README corrected; `readme-support-table.test.ts` passes; CR-05 resolved |
| T35 | `codereview_08/done/task_35.md` | COMPLETE | five local runs; CI run `34980598912` 9/9 success; CR-06 resolved |

All 35 task files were uniquely located (35 files, 35 unique names, 0 duplicate). T29-T35 sit in `codereview_08/done/` with complete Handoffs, but their Work checklists remain `- [ ]` (see CR-08); completion is established from the Handoff plus enforced tests, not from the checkbox state.

## Executed validations

- Profile and scope: built CLI, runtime assets, schemas, unit/integration/E2E suites, coverage, package contents, dependency scripts, diff hygiene, feature Markdown links, task inventory, TechSpec quality profile, and a fresh trailing-comment round trip.
- Validated state: committed `2ec5d5d` (code) / `301de3e` (docs); clean worktree; Windows 11 Pro, PowerShell 7, Node v24.19.0, npm 11.17.0.
- Reused evidence: GitHub Actions run `34980598912` at `2ec5d5d` supplies cross-platform proof for this exact code state (Ubuntu/macOS/Windows × Node 20/22/24); reused because code, configuration, platform matrix, and environment match the reviewed revision.
- Manual acceptance: no real Claude/Codex/Cursor/Copilot/Antigravity/OpenCode/Pi/Oh-My-Pi binary was launched; registration shapes and payloads were checked against adapters, fixtures, and the recorded research.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | compiled CLI, schemas, runtime assets |
| `npm run lint` | passed | code standards, size rules |
| `npm run typecheck` | passed | TypeScript contracts |
| `npm test` | passed: 85 files, 350 passed, 0 skipped, 0 failed | all unit/integration/E2E IDs incl. E2E-10/11 |
| `npm run coverage` | passed: 92.33 / 86.01 / 95.68 / 92.33% (≥80) | TechSpec coverage thresholds |
| `npm run schemas:check` | passed | RF17, TC-15, NFR-02 |
| `npm run assets:check` | passed | runtime asset currency |
| `npm run dependencies:check` | passed: 3 runtime dependencies, no install scripts | RF23 |
| `npm run package:smoke` | passed: 212 packaged files verified, CLI smoke | CA-14, CA-19 |
| `git diff --check` | passed (exit 0) | patch hygiene |
| feature Markdown link scan | passed: 48 Markdown files, 40 local links, 0 broken | task/report integrity |
| task inventory scan | 35 unique task files, 0 missing/duplicate; 32 unchecked Work boxes (CR-08) | task traceability |
| TechSpec QA-01..QA-06 over 61 TS files | 0 blocking hits; 1 QA-06 regex false positive | quality profile |
| fresh trailing-comment round-trip probe (built CLI) | passed: codex/cursor `commentAfterInstall=true`, `commentAfterRemove=true`, `userAfterRemove=true`, `exactRoundTrip=true`; three installs idempotent | RF6, RF19, CA-05, CA-07, CA-12, T29 |
| GitHub Actions run `34980598912` (`gh run view`) | success, headSha `2ec5d5d`, 9/9 jobs success (3 OS × 3 Node); Ubuntu Node 20 ran both `sh -lc` and `bash -lc` shell cases | CA-20, NFR-03, CR-06 |
| `codereview_08/codereview.md` SHA-256 | `AD7824807E4B29B36ABF9C8C66138B84B4F9C6D26A8049EC228369C9B956D332` (unchanged) | immutable review history |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-07 | Low | PRD-01 RF8 / CA-15 matrix vs PRD 1.1 FR-02 | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md:144` still lists Antigravity as `Parcial`, while PRD 1.1 FR-02 and the adapter derive `cooperative` (`antigravity-cli/adapter.ts:15`, `readme-support-table.test.ts:60-64`) | The PRD-01 source matrix contradicts the approved PRD 1.1 level rule for Antigravity; readers can infer a blocking capability that is not installed | Update the PRD-01 Antigravity matrix row (or add a superseded note) to `cooperative`, mirroring PRD 1.1 FR-02. Documentation only; no runtime effect |
| CR-08 | Low | Task bookkeeping / `sdd-review-code` step 1 | `codereview_08/done/task_29.md`..`task_35.md` keep their Work checklists as `- [ ]` (32 boxes) although each is archived in `done/` with a complete Handoff and green tests | Archived correction tasks appear incomplete to a checkbox-only scan, weakening traceability even though the work is proven | Tick the Work checkboxes (or align the tasks with the corrected plan format). No code or requirement impact |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_08/CR-01` | resolved | `json-span-utils.ts:36-99`; fresh built-CLI probe exact round trip, comment preserved on remove, idempotent over three installs |
| `codereview_08/CR-02` | resolved | `support-service.ts:46-56`; eight adapter `CAPABILITIES` match PRD 1.1; TC-01/02/03 pass; Antigravity `cooperative` per recorded HIL decision |
| `codereview_08/CR-03` | resolved | `gitignore-service.ts`, `gitignore-markers.ts`, `gitignore-checks.ts`; wiring in installation/removal/doctor; UT-21..25, IT-17/18, E2E-11 pass |
| `codereview_08/CR-04` | resolved | `overhead-measurer.ts:31,56`; `in-process-sampler.ts:36-67`; sentinel tests prove event argv and named handler; antigravity now `PreInvocation` |
| `codereview_08/CR-05` | resolved | `README.md:63` `.omp/extensions/`; `:116` three-line pointer; support table `:55-64`; `readme-support-table.test.ts` passes |
| `codereview_08/CR-06` | resolved | `codex-hook-command-shells.test.ts:90-95` runs both shells on POSIX; CI run `34980598912` Ubuntu Node 20 executed `sh -lc` and `bash -lc`; all 9 jobs success |

## Limitations and open items

- The reviewed bound is the `codereview_08` correction set (`2a26a3e..301de3e`), not the full PRD 1.1 feature. PRD 1.1 has no `tasks.md`; FR-06..FR-12, FR-09 runtime-state removal, the asset typecheck (NFR-01/DEC-13), and the 2026-09-14 research record are pending and belong to the separate PRD 1.1 cycle (PRD 1.1 DEC-14 step 2). They are not obligations of this correction set.
- Local platform is Windows; the POSIX and macOS slices are established by CI run `34980598912` at `2ec5d5d` and were not re-executed locally. No native Linux/macOS shell was run in this environment.
- No authenticated vendor harness binary was executed; benchmark behavior was verified with synthetic built-asset and in-process fixtures, and registrations against adapter schemas and recorded research.
- `tasks.md` does not index T25-T35; the correction lineage stops at `codereview_06`. This is pre-existing and PRD 1.1 declares PRD-01 task-history reorganization out of scope.
- The PRD 1.1 feature has no task decomposition yet; when it is planned, FR-06..FR-13 must be verified separately before that feature can be approved.

## Conclusion

The `codereview_08` correction set is complete and correct. All six prior findings are resolved with direct evidence: an exact-byte trailing-comment round trip, capability declarations matching the approved PRD 1.1 rule, a working and diagnosed `.gitignore` lifecycle, an event-accurate overhead benchmark, a drift-guarded README, and a current nine-job CI run on the exact code revision. All PRD-01 RF1-RF24 and CA-01-CA-21 obligations are conformant, the quality profile has no blocking or genuine reservation hit, and the two remaining items are optional documentation/bookkeeping improvements. The review is therefore APPROVED WITH RESERVATIONS.
