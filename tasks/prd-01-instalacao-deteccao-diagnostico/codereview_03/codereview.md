# Code review report — Installation, Detection, and Diagnostics

## Summary

- Status: REJECTED
- Git scope: `Not delimited — see limitations` (repository has zero commits; reviewed the full worktree plus the `done/` handoffs and the `codereview_01`/`codereview_02` corrections)
- Previous review: `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_02/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read (629 lines, full) |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read (tasks 1–6; correction tasks unlinked) |
| Handoffs | `done/task_1.md` … `done/task_6.md` | read |
| Correction handoffs | `codereview_01/done/task_07.md`, `task_08.md`, `task_09.md`; `codereview_02/done/task_10.md` | read (four unlinked extras; see limitations) |
| Previous reports | `codereview_01/codereview.md`, `codereview_02/codereview.md` | read |
| Implementation | Worktree `src/`, `tests/`, `schemas/`, `assets/`, `scripts/`, `.github/`, `README.md`, `AGENTS.md`, `package.json` | delimited by worktree only |

`git rev-list --count --all` = 0 and there is no `HEAD` or remote, so no `--base` can be resolved to a commit. The reviewable set is the whole untracked worktree, cross-checked against the six original handoffs and the four correction handoffs. All eight `src/infrastructure/harnesses/*/planner.ts` files were confirmed to route every planned `realPath` through `resolveChangeTarget` (T10), so the `codereview_02` correction is present in the reviewed tree.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect the eight MVP harnesses | `src/infrastructure/harnesses/registry.ts` + per-harness detectors | IT-16 | conformant | 8 descriptors; `tests/integration/detection-cross-signals.test.ts` |
| RF2 | Report project vs machine origin and version | `detection-service.ts`, `detection-collector.ts` | UT-03, UT-15 | conformant | `HarnessDetection.evidence`/`versionSource` in install/doctor JSON |
| RF3 | Shared instruction files are not proof | `claude-code/detector.ts`, shared-evidence filter | UT-01 | conformant | `detection-service.ts`; IT-16 |
| RF4 | Explicit include/exclude precedence | `argument-validator.ts`, `detection-service.ts` | UT-02, IT-03 | conformant | conflicting pair → `INVALID_ARGUMENTS` |
| RF5 | Register in each vendor extension mechanism | per-harness `planner.ts` | IT-01, IT-02 | conformant | 5 file/JSON hooks + 3 in-process plugins; assets packed from `dist/assets/runtime/` |
| RF6 | Preserve existing user integrations/config bytes | per-harness planners + `json-document-editor.ts` | IT-01, UT-04, UT-19 | conformant | minified + JSONC fixtures; independent minified repro re-parsed with user key intact |
| RF7 | Invalid vendor config isolated, peers continue | planners return `INVALID_HARNESS_CONFIG`; `installation-service.ts` | UT-05, IT-04, E2E-05 | conformant | `tests/integration/multi-harness-install.test.ts` |
| RF8 | Support level per harness | `support-service.ts` + capability tables | UT-18 | conformant | `deriveSupportProfile`; live doctor shows `claude-code: installed (support: full …)` |
| RF9 | Warn on version below minimum | `support-service.ts` | UT-15 | conformant | limitation text carries detected/minimum/capability (injected fixtures) |
| RF10 | Create the protocol file | `protocol-service.ts` | protocol unit, E2E-01 | conformant | `docs/context-brake-protocol.md` matches `renderProtocol` |
| RF11 | Add ≤10-line reference block between own markers | `instruction-markers.ts`, `instruction-service.ts` | UT-07, IT-06 | conformant | 3-line block; CA-08 |
| RF12 | Do not create instruction files unless authorized | `instruction-service.ts` | UT-08, IT-06 | conformant | `--create-instructions` only |
| RF13 | Symlink target edited once, link preserved | `instruction-service.ts` dedup by `fileIdentity` | UT-06, IT-05, E2E-10 | conformant | `realPath`-targeted write; link survives |
| RF14 | Legacy `CONTEXTOPS` migration offered with preview | `legacy-preview.ts`, `installation-service.ts`, `init.ts` | legacy-preview unit, E2E legacy | conformant | live repro: `LEGACY_BLOCK_DETECTED` + `--migrate-legacy` on stderr, file byte-identical |
| RF15 | Create config with defaults | `configuration.ts`, `installation-builder.ts` | configuration tests | conformant | `DEFAULT_CONFIG` matches TechSpec |
| RF16 | Validate config with field/value/rule | `configuration-validator.ts` | UT-12, IT-10 | conformant | cross-field path/`received`/rule |
| RF17 | Publish config schema | `schemas/*.schema.json`, `scripts/generate-schemas.ts` | `schemas:check`, `package:smoke` | conformant | 3 Draft 2020-12 schemas current and packed |
| RF18 | Dry-run preview, no side effects | `commands/init.ts`, `commands/remove.ts` | UT-10, IT-08, E2E-06 | conformant | no write port called |
| RF19 | Conservative removal; state only on consent | `removal-service.ts`, `removal-helper.ts` | UT-11, IT-09, E2E-07 | conformant | modified assets → conflict; `--remove-state` only |
| RF20 | Doctor lists state/version/support/missing capabilities | `doctor-service.ts`, adapters, `output/text.ts` | IT-11, E2E-08 | conformant | `HarnessDiagnostic` |
| RF21 | Doctor validates config/markers/protocol/state | `doctor-checks.ts` | doctor-checks unit, IT-10 | conformant | read-only, never repairs |
| RF22 | Measure overhead p95 vs PRD-02 target | `overhead-measurer.ts`, `p95.ts` | UT-17, IT-14, E2E-08 | conformant | live doctor: `overhead: 137ms/100ms (fail)`; see OI-02 |
| RF23 | Text + JSON parity, distinct exit codes | `report-service.ts`, `output/*`, `exit-codes.ts` | UT-16, UT-20, E2E-08 | conformant | 0/1/2, 64, 130 |
| CA-01 | `init --yes` on Claude registers + config + summary | `commands/init.ts` | E2E-01, E2E-10 | conformant | executed; exit 0 |
| CA-02 | Codex + Cursor configured together | `installation-service.ts` | E2E-02, IT-02 | conformant | executed |
| CA-03 | AGENTS.md-only repo → no integration, warning | `installation-service.ts` | E2E-03, UT-01 | conformant | executed; exit 1 with remediation |
| CA-04 | Exclude Copilot, install Cursor | `argument-validator.ts`, detection | UT-02, IT-03 | conformant | dedicated files untouched |
| CA-05 | Three runs preserve users, one integration | planners + `change-plan-service.ts` | E2E-04, UT-04, IT-01 | conformant | standard and harness-junction fixtures byte-idempotent |
| CA-06 | Invalid harness file untouched, error, peers continue | planners, `change-applier.ts` | E2E-05, IT-04, UT-05 | conformant | executed |
| CA-07 | Symlinked `AGENTS.md` → one block, link kept | `instruction-service.ts` | E2E-10, IT-05, UT-06 | conformant | PowerShell + bash executed |
| CA-08 | Reference block ≤10 lines, points to protocol | `instruction-markers.ts` | UT-07, IT-06 | conformant | 3 lines |
| CA-09 | No instruction file created without option | `instruction-service.ts` | UT-08, IT-06 | conformant | executed |
| CA-10 | Legacy preview without confirmation | `legacy-preview.ts`, `init.ts` | legacy-preview unit, E2E legacy | conformant | live repro; file byte-identical |
| CA-11 | Dry-run changes nothing and lists changes | `commands/init.ts` | E2E-06, IT-08, UT-10 | conformant | executed |
| CA-12 | Remove owned content, keep rest and state | `removal-service.ts` | E2E-07, IT-09, UT-11 | conformant | executed |
| CA-13 | Invalid zone cross-field → error with field/value/rule | `configuration-validator.ts` | UT-12, IT-10 | conformant | executed |
| CA-14 | Manually removed integration → `missing`, error | `doctor-service.ts` | E2E-08, IT-11, UT-13 | conformant | executed |
| CA-15 | Copilot partial + timeout reason | `github-copilot-cli/adapter.ts` | IT-12, UT-14, E2E-08 | conformant | limitation emitted |
| CA-16 | Old version shows detected/minimum/capability | `support-service.ts` | IT-13, UT-15 | conformant | injected fixtures (TechSpec permits); see limitations |
| CA-17 | `doctor --json` valid per published schema, same findings | `report-service.ts`, `output/json.ts` | E2E-08, UT-16 | conformant | executed |
| CA-18 | Doctor shows measured p95 and goal | `overhead-measurer.ts` | E2E-08, IT-14, UT-17 | conformant | live doctor shows p95/goal/status |
| CA-19 | README quick-start ≤2 min error-free | `README.md`, `e2e-09.test.ts` | E2E-09 | conformant | executed in the coverage run |
| CA-20 | CA-01/05/07 on Linux, macOS, Windows shells | E2E-10 + `.github/workflows/ci.yml` | E2E-10 | **not verifiable** | Windows PowerShell + MSYS bash executed here; Linux, macOS and Git for Windows not run — see CR-01 and limitations |
| TechSpec `ChangePlan.projectRoot` | "Absolute canonical root" | `main.ts:40` passes raw `process.cwd()` | — | **non-conformant** | CR-01: on a junction-reached root the plan carries the logical path and every command aborts |
| `file-changes.md` | Resolve links/junctions and write only inside the repository root | root never canonicalized; `path-boundary.ts:33-39` canonicalizes only the root | — | **non-conformant** | CR-01: `init`/`doctor`/`remove` all exit 2 with `UNEXPECTED_ERROR` on a junctioned root |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | `npm run lint` exit 0; 100-line/30-line/3-param enforced in `eslint.config.js`; no `any`/`as any` found by `rg` |
| `javascript-typescript.md` | OK | strict ESM, literal unions, Zod at boundaries; `npm run typecheck` exit 0 |
| `node.md` | OK | `spawn`/argument arrays and timeouts in `node-process-runner.ts`/`overhead-measurer.ts`; async I/O; 3 runtime deps, no install scripts |
| `tests.md` | NOT OK | coverage green, but no fixture runs any command from a symlinked/junctioned project root, hiding CR-01 |
| `harness-adapters.md` | OK | non-strict vendor schemas; `docs/research/harness-integrations.md` Copilot section reconciled |
| `file-changes.md` | NOT OK | the root confinement check rejects a legitimate inside-root path when the root is a junction (CR-01) |
| `cli-output.md` | OK | results/findings split, one JSON document, `[OK]/[WARN]/[ERROR]`, no TTY prompt without `--yes` |
| Hexagonal architecture (`AGENTS.md`) | OK | no `src/core` import of `infrastructure/` or `cli/` (grep clean) |
| `sdd-review-code` | OK | this report follows `references/TEMPLATE.md` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 (derived) | ≤100 lines/file, ≤30 lines/function, ≤3 params | blocking | `npm run lint` | 0 | OK |
| QA-02 (derived) | ≥80% lines/statements/functions/branches | blocking | `npm run coverage` | 0 | OK (90.99 / 90.99 / 96.12 / 81.51) |
| QA-03 (derived) | strict typecheck | blocking | `npm run typecheck` | 0 | OK |
| — | Formal TechSpec quality profile (QA-NN rules) and Terrain baseline | — | — | — | missing — see limitations |

- Terrain baseline: missing — the TechSpec defines no quality profile or baseline. The repository's declared constraints (lint limits, coverage thresholds, strict typecheck) were run as absolute gates, not a delta.
- Hits discounted by baseline: not applicable (no baseline).
- Reservations accumulated in the feature: 0 (no profile reservation rules exist; the correction handoffs report none).
- Suggested escalation: no trigger fired (no profile reservations).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal ports/adapters, acyclic modules | YES | `src/core/contracts/*`, `cli/composition-root.ts`; no reverse imports |
| Durable self-contained runtime assets, no hook-time npx | YES | `dist/assets/runtime/{context-brake-runtime,process-hook}.mjs`, `{opencode,pi,omp}-*.js`; `package:smoke` packs 187 files |
| Machine-only signals stay candidates | YES | `detection-service.ts`; live run lists `.codex`/`.pi`/… as `candidate` |
| Surgical edit preserving trivia; refuse invalid | YES | multi-line + minified + JSONC comment fixtures; live minified repro re-parsed |
| Per-file atomicity + optimistic concurrency | YES | `atomic-writer.ts`, `change-applier.ts`; IT-15 and the junction concurrency repro stay green |
| `FileChange.realPath` is the canonical target | YES | all eight planners use `resolveChangeTarget` (`change-target.ts`); junction harness install verified end to end |
| `ChangePlan.projectRoot` is the absolute canonical root | **NO** | `main.ts:40` passes `process.cwd()` unchanged; `change-plan-service.ts` copies it into the plan |
| Legacy migration has its own consent | YES | `legacy-preview.ts` previews; `--migrate-legacy` gates the write; file byte-identical otherwise |
| Removal conservative, state explicit | YES | `removal-helper.ts`; IT-09 |
| Existing config authoritative; unmanaged protocol is a conflict | YES | `protocol-service.ts`; `commands/init.ts` |
| Stable health exits 0/1/2, 64, 130 | YES | `exit-codes.ts`, `report-service.ts` |
| Honest version compatibility (nullable floor) | PARTIAL | floors are `null`; the named `VERSION_FLOOR_UNVERIFIED` code is still not emitted (limitation text only) — see limitations |
| Overhead targets 100 ms process / 15 ms in-process | YES | adapter `benchmarkFixture()` values; live doctor reports p95 and goal |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_1.md` | COMPLETE | package/config/schemas/exit codes |
| T02 | `done/task_2.md` | COMPLETE | detection, selection, version/support policy |
| T03 | `done/task_3.md` | COMPLETE | change engine; contains the `path-boundary.ts` behavior behind CR-01 |
| T04 | `done/task_4.md` | COMPLETE | eight adapters; research reconciled |
| T05 | `done/task_5.md` | COMPLETE | init/remove/doctor; `main.ts` project root behind CR-01 |
| T06 | `done/task_6.md` | COMPLETE | packaging/CI/README |
| T07 (correction) | `codereview_01/done/task_07.md` | COMPLETE | minified JSON editor + exception isolation |
| T08 (correction) | `codereview_01/done/task_08.md` | COMPLETE | `LEGACY_BLOCK_DETECTED` preview |
| T09 (correction) | `codereview_01/done/task_09.md` | COMPLETE | README example/wording + guard test |
| T10 (correction) | `codereview_02/done/task_10.md` | COMPLETE | canonical harness change targets; verified by live junction repro |

All six manifest tasks are linked and marked `[x]` in `tasks.md`. The four correction handoffs exist, are marked complete, and carry traceability to the previous findings but are not referenced by `tasks.md`.

## Executed validations

- Profile and scope: full worktree; Windows 11 (win32, `MINGW64_NT-10.0-26200`), Node v24.19.0, npm 11.17.0, PowerShell 7.6.6 and MSYS bash. Linux, macOS and Git for Windows were not executed.
- Validated state: `dist/` rebuilt from the current worktree (`npm run build`); configuration and platform fixed to the above.
- Reused evidence: handoff command results were not reused; every gate below was re-run on the current tree.
- Manual acceptance: no interactive TTY session was performed; non-TTY `--yes` paths and junction fixtures were exercised.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | RF10, RF17, runtime assets |
| `npm run typecheck` | passed | QA-03 |
| `npm run lint` | passed | QA-01, code standards |
| `npm run coverage` (59 files, 198 tests) | passed | UT-01…UT-20, IT-01…IT-16, E2E-01…E2E-10, QA-02 |
| `npm run schemas:check` | passed | RF17 |
| `npm run dependencies:check` | passed (3 runtime deps, no install scripts) | `node.md` |
| `npm run assets:check` | passed | RF5 durability |
| `npm run package:smoke` | passed (187 packaged files) | RF17, CA-19 |
| repro: junction `.claude` → `.agents`, built CLI `init --yes`, then second run | passed (exit 0, one integration, user `UserHook` kept, link still a link, byte-identical rerun) | `codereview_02/CR-01`, RF6, CA-05 |
| repro: `setJsonProperty('{"hooks":{"UserHook":"node custom.js"}}', …)` via built CLI | passed (parseable, user key preserved, `PreToolUse` added) | `codereview_01/CR-01`, RF6 |
| repro: legacy `CONTEXTOPS` fixture, built CLI `init --yes` | passed (`LEGACY_BLOCK_DETECTED`, `--migrate-legacy`, file byte-identical, exit 1) | `codereview_01/CR-02`, RF14, CA-10 |
| repro: junctioned project root `C:\…\linkrepo3` → `realrepo3`, PowerShell, `init --yes` / `doctor` / `remove --dry-run` | **failed** (`UNEXPECTED_ERROR: Path 'context-brake.config.json' resolves outside repository root …`, exit 2 for all three) | TechSpec `ChangePlan.projectRoot`, `file-changes.md` — see CR-01 |
| repro: same fixture from the canonical root `…\realrepo3` | passed (exit 0, plan lists config/manifest/protocol) | CR-01 isolation |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | TechSpec `ChangePlan.projectRoot` ("Absolute canonical root"); `file-changes.md` ("Resolve symbolic links and junctions before writing", "Write only inside the repository root"); CR-01 of `codereview_02` remains unfixed at its root cause | `src/cli/main.ts:40` sets `projectRoot: process.cwd()` unchanged; `isWithinRepository` (`src/infrastructure/storage/path-boundary.ts:33-39`) canonicalizes the root but returns the **logical** path for a missing target, so `assertWithinRepository` throws `RepositoryBoundaryError` for a legitimate inside-root path; `planConfigChange`/`planManifestChange` (`src/core/services/installation-builder.ts:12,34`), `NodeManifestStore.manifestPath` (`manifest-store.ts:9,28`) and `removal-service.ts:45,47` build `realPath` with `resolve(root, …)`, which cannot match the canonical snapshot `realPath`. Repro: `cmd mklink /J linkrepo3 realrepo3`, then PowerShell `Set-Location …\linkrepo3` (which yields `process.cwd() = …\linkrepo3`) and run the built CLI — `init --yes`, `doctor` and `remove --dry-run` each print `UNEXPECTED_ERROR: Path 'context-brake.config.json' resolves outside repository root '…\linkrepo3'` and exit 2; the same fixture from `…\realrepo3` returns exit 0. `ChangePlan.projectRoot` is also reported as the non-canonical path. | On Windows, running any command from a directory that is a junction/symlink (a common `C:`→`D:` layout and any PowerShell/terminal session that preserves the link) makes ContextBrake unusable: `init`, `doctor` and `remove` abort before planning with an internal error instead of a finding, no integration is registered and the user gets no remediation. The same non-canonical root is the latent second failure: because `resolve(root, …)` planned paths never equal canonical snapshot paths, a config/manifest `update` gets `beforeSha256: null` and would fail with a false `FILE_CHANGED_SINCE_PREVIEW` once the boundary check stops throwing (demonstrated directly on `createChangePlan`: a matching snapshot still yields `beforeSha256 = null`). | Canonicalize the project root once at the CLI boundary — resolve `process.cwd()` with `realpath` in `main.ts`/composition root and pass that single value everywhere — so `ChangePlan.projectRoot` is the "absolute canonical root" the TechSpec requires and every `resolve(root, …)` planned path agrees with the canonical snapshot `realPath`. Additionally make the boundary check symmetric by canonicalizing the missing target's nearest existing ancestor (the logic already exists in `change-target.ts`), and route the config/manifest planned changes through `resolveChangeTarget` so a symlinked config or manifest also matches. Add a regression fixture (Windows junction, POSIX symlinked root or `realpath` mismatch) asserting `init --yes`, `doctor` and `remove --dry-run` succeed from such a root and that a second `init` is a no-op. |

## Optional improvements

| ID | Severity | Source | Evidence | Impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| OI-01 | Low | `cli-output.md`, TC text/JSON parity | Persistent from `codereview_02/OI-01`: the legacy finding is rendered twice on a human `init --yes` run — once on stderr before confirmation (`init.ts:45-50`) and again inside the report (`output/text.ts:24`). Live repro counts 1 on stderr and 1 on stdout. | Cosmetic duplicate notice; no requirement breach. | Emit the pre-confirmation preview to stderr only, or skip it when the same finding is already in the report output. |
| OI-02 | Low | RF22, RF23 (doctor health surface) | Live doctor on an installed Claude fixture prints `overhead: 137ms/100ms (fail)` and still reports `[OK] ContextBrake doctor: healthy` with exit 0. `OverheadMeasurement.status` is never converted to a `DiagnosticFinding`, and `deriveDoctorStatus` only reads findings (`report-service.ts`). | Automation (US6) reading the exit code cannot detect a failed hook-overhead target. | When `overhead.status === 'fail'` for a configured integration, emit a warning finding (for example `OVERHEAD_TARGET_EXCEEDED`) so text/JSON and the exit code agree; keep the measurement itself unchanged. |
| OI-03 | Low | T10.4 verification wording | `tests/integration/symlinked-harness-config.test.ts` and `tests/e2e/e2e-symlinked-harness-config.test.ts` `return` silently when the runner cannot create the link, instead of skipping with an explicit reason. | On a runner without link privileges the regression would appear green while testing nothing. | Replace the bare `return` with a skip carrying the reason, or assert link creation on supported platforms. |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` (minified JSON editor) | resolved | Built-CLI repro on `{"hooks":{"UserHook":"node custom.js"}}` exits 0 and produces parseable JSON with the user key and the new `PreToolUse` entry; `tests/integration/minified-config.test.ts` and `tests/e2e/e2e-minified-config.test.ts` pass. |
| `codereview_01/CR-02` (legacy preview) | resolved | Built-CLI repro emits `LEGACY_BLOCK_DETECTED` plus `--migrate-legacy` and leaves the file byte-identical; `tests/e2e/e2e-legacy-preview.test.ts` passes. |
| `codereview_01/CR-03` (README example) | resolved | `tests/unit/readme-config-example.test.ts` parses the published example with `configurationSchema` and passes. |
| `codereview_02/CR-01` (non-canonical `FileChange.realPath` for harness configs) | resolved | All eight planners call `resolveChangeTarget`; junction fixture (`.claude` → `.agents`) installs with exit 0, keeps the link and the user hook, and a second run is byte-identical. The unfixed **root cause** of that class is re-raised as this review's `CR-01`. |

## Limitations and open items

- No git base: the repository has zero commits and no remote, so the reviewable set is the whole worktree and cannot be attributed to a commit range.
- No formal TechSpec quality profile (QA-NN rules) and no Terrain baseline exist; the repository's declared constraints were run as absolute gates.
- CA-20 is not verifiable here for Linux, macOS or Git for Windows. Only Windows PowerShell 7 and MSYS bash were executed. `.github/workflows/ci.yml` configures the full matrix, but there is no green CI artifact (no commits, no remote). `tests/e2e/shell-runner.ts:findBashPath` finds no Git for Windows install on this machine and falls back to `bash` on `PATH` (MSYS), so the local "bash" evidence is MSYS bash, not Git Bash — its status carries into `CR-01`'s Windows severity judgement.
- Real minimum-version handling cannot be observed end to end because every adapter reports `minimumVersion: null`; CA-16 is covered only by injected fixtures, which the TechSpec permits. The diagnostic code `VERSION_FLOOR_UNVERIFIED` named in the TechSpec is still not emitted as a finding; the unverified floor is surfaced only as a `support.limitations` entry with impact text (`support-service.ts:42`) and does not affect doctor status. Carried over from `codereview_01`/`codereview_02`; it is not the blocker in this review.
- The four correction handoffs (`codereview_01/done/task_07.md`–`task_09.md`, `codereview_02/done/task_10.md`) are not linked from `tasks.md`; finding-to-task traceability exists inside each file, but task-to-manifest traceability does not.
- No fixture exercises a symlinked or junctioned **project root**, which is what hid `CR-01`; the existing junction fixtures cover harness config directories with a canonical root.
- No interactive TTY confirmation session was performed; only `--yes`/non-TTY paths were exercised.

## Conclusion

The `codereview_02` correction is present and effective: the junctioned-harness-config repro now installs, keeps the link and the user content, and is byte-idempotent, and all three `codereview_01` findings remain resolved. The automated suite is green — 198 tests across 59 files with coverage 90.99 / 81.51 / 96.12 / 90.99 (lines / branches / functions / statements) and all build, typecheck, lint, schema, dependency, asset and package gates passing. However, the root cause behind the previous `realPath` finding is still open outside the harness planners: the CLI never canonicalizes the project root (`main.ts:40`), so `ChangePlan.projectRoot` violates the TechSpec's "absolute canonical root", the root-confinement check rejects legitimate inside-root paths, and `init`, `doctor` and `remove` all abort with `UNEXPECTED_ERROR`/exit 2 when the repository is reached through a junction — reproduced here from `C:\…\linkrepo3`, with the identical fixture succeeding from its canonical target (`CR-01`, High). CA-20's Linux/macOS/Git-Bash evidence is also unavailable in this environment and cannot be turned into approval. Because a TechSpec contract and a `file-changes.md` rule are non-conformant and essential platform evidence is missing, the review is **REJECTED** pending correction of `CR-01`; `OI-01`–`OI-03` are optional, and the version-floor and profile items remain documented limitations.
