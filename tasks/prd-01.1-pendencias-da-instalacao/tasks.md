# Implementation plan — PRD 1.1 installation follow-ups

## Stable sources

- PRD: `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
- TechSpec: `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Scope note

`FR-01`–`FR-05` and their `OBJ`/`US`/`CA` obligations are already implemented and reviewed (`tasks/prd-01-instalacao-deteccao-diagnostico/codereview_09/codereview.md`, `APPROVED WITH RESERVATIONS`, range `2a26a3e..301de3e`) and are out of this plan's scope, per the TechSpec's `Sources and traceability`. This plan covers only `FR-06`–`FR-13` and the `assets/` typecheck slice of `NFR-01`.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Adapter payload schemas match documented field names | — | T08, T09 |
| T02 | Manifest records the real package version | — | T03, T09 |
| T03 | Doctor/init classify managed assets (current/outdated/modified) | T02 | T09 |
| T04 | `remove --remove-state` deletes runtime state; empty-directory pruning | — | T09 |
| T05 | Single legacy-block warning per file | — | T09 |
| T06 | Protocol `CRITICAL` row allows `git add` | — | T09 |
| T07 | Version-floor gating fixed; researched minimum versions declared | — | T08, T09 |
| T08 | Research file reflects the 2026-09-14 re-check | T01, T07 | T09 |
| T09 | `assets/` typechecked; full quality gate green together | T01, T02, T03, T04, T05, T06, T07, T08 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-06 | `prd.md#functional-requirements` | Read harness payloads by documented field names | T01 | `tests/unit/harness-schemas-process.test.ts`, `tests/unit/harness-schemas-in-process.test.ts` |
| FR-07 | `prd.md#functional-requirements` | Manifest records the real installing package version | T02 | `tests/unit/package-metadata.test.ts`, `tests/e2e/e2e-01-02.test.ts` |
| FR-08 | `prd.md#functional-requirements` | Compare managed assets with manifest and running package | T03 | `tests/unit/asset-currency.test.ts`, `tests/integration/doctor-asset-currency.test.ts`, `tests/e2e/e2e-asset-currency.test.ts` |
| FR-09 | `prd.md#functional-requirements` | Delete runtime execution state only with `--remove-state` | T04 | `tests/unit/state-removal.test.ts`, `tests/unit/runtime-state-files.test.ts`, `tests/integration/runtime-state-removal.test.ts`, `tests/integration/directory-pruner.test.ts` |
| FR-10 | `prd.md#functional-requirements` | One legacy-block warning per file | T05 | `tests/unit/init-legacy-preview.test.ts`, `tests/e2e/e2e-legacy-preview.test.ts` |
| FR-11 | `prd.md#functional-requirements` | Protocol file aligned to 2026-09-14 decisions | T06 | `tests/unit/protocol-service.test.ts` |
| FR-12 | `prd.md#functional-requirements` | Research minimum harness versions from official sources | T07 | `tests/unit/support-service-version-gating.test.ts`, `tests/unit/support-service.test.ts`, T07 manual review |
| FR-13 | `prd.md#functional-requirements` | Correct documentation to real state | T08 | `docs/research/harness-integrations.md` diff, T08 manual review |
| NFR-01 | `prd.md#non-functional-requirements` | Typecheck includes `assets/`; gates pass together | T09 | full command gate in T09's Handoff |
| NFR-02 | `prd.md#non-functional-requirements` | Config stays `schemaVersion: 1`; schemas only additive | T04 | `npm run schemas:check`, `install-report.schema.json` diff |
| NFR-03 | `prd.md#non-functional-requirements` | Linux/macOS/Windows, Node 20/22/24 | T04, T09 | CI matrix run |
| NFR-04 | `prd.md#non-functional-requirements` | `init`/`doctor` finish in ≤5s | T03 | existing E2E-09 timing (unaffected budget, confirmed at T09's gate) |
| NFR-05 | `prd.md#non-functional-requirements` | User-file changes follow `file-changes.md` | T02, T03, T04 | byte-preservation assertions in each task's integration/E2E tests |
| RF9 (parent PRD-01) | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | Warn below verified minimum version | T07 | `tests/unit/support-service-version-gating.test.ts`, `tests/unit/support-service.test.ts` |
| US-03 | `prd.md#stories-and-journeys` | Discover an outdated asset with remediation | T03 | `tests/integration/doctor-asset-currency.test.ts` |
| US-06 | `prd.md#stories-and-journeys` | Control when runtime state is erased | T04 | `tests/integration/runtime-state-removal.test.ts`, `tests/integration/directory-pruner.test.ts` |
| US-07 | `prd.md#stories-and-journeys` | Read the legacy-block warning once | T05 | `tests/e2e/e2e-legacy-preview.test.ts` |
| DEC-01 | `techspec.md#technical-decisions` | Documented payload schemas | T01 | — |
| DEC-02 | `techspec.md#technical-decisions` | Package-metadata reader; required manifest version | T02 | — |
| DEC-03 | `techspec.md#technical-decisions` | `classifyAssetCurrency`; doctor/init wiring | T03 | — |
| DEC-04 | `techspec.md#technical-decisions` | Runtime-state listing; directory pruning | T04 | — |
| DEC-05 | `techspec.md#technical-decisions` | Legacy preview vs. text-report deduplication | T05 | — |
| DEC-06 | `techspec.md#technical-decisions` | `CRITICAL` row wording | T06 | — |
| DEC-07 | `techspec.md#technical-decisions` | Version-gating fix; researched floors | T07 | — |
| DEC-08 | `techspec.md#technical-decisions` | Research file update | T08 | — |
| DEC-09 | `techspec.md#technical-decisions` | Asset typecheck scope | T09 | — |
| TC-01…TC-09 | `techspec.md#test-approach` | One test-case row per task | T01…T09 (1:1) | listed per task above |

## Tasks

- [T01 — Adapter payload schemas match documented field names](done/task_01.md): Antigravity, Pi, and Oh-My-Pi schemas parse the field names their vendor documentation defines.
- [T02 — Manifest records the real package version](done/task_02.md): `init`/`remove` read and record the running package's actual `package.json` version instead of a hardcoded `1.0.0`.
- [T03 — Doctor and init classify managed assets as current, outdated, or modified](done/task_03.md): `doctor` warns on an outdated or modified runtime asset; `init` never overwrites a modified one.
- [T04 — `remove --remove-state` deletes runtime state and prunes empty directories](done/task_04.md): the PRD-02 runtime-state directory is deleted only with explicit consent, and empty ContextBrake directories no longer linger.
- [T05 — Single legacy-block warning per file](done/task_05.md): `init`'s combined text output shows one `LEGACY_BLOCK_DETECTED` warning per file instead of two.
- [T06 — Protocol `CRITICAL` row allows `git add`](done/task_06.md): the generated and packaged protocol matches the 2026-09-14 product decision on the critical-ceiling command allowlist.
- [T07 — Version-floor gating fixed; researched minimum versions declared](done/task_07.md): only an `old` version probe downgrades a capability; harnesses with an official source declare their minimum version.
- [T08 — Research file reflects the 2026-09-14 re-check](done/task_08.md): `docs/research/harness-integrations.md` records the field-name and minimum-version facts behind T01 and T07.
- [T09 — `assets/runtime/` is typechecked; full quality gate green together](done/task_09.md): `assets/` joins the typecheck scope, and the complete feature passes every quality gate in one pass.

## Coverage gate

- Coverage: pass. Every `FR-06`–`FR-13` and the `NFR-01` asset-typecheck slice has exactly one task; `FR-01`–`FR-05` are explicitly out of scope with cited evidence (see Scope note); `OBJ-01`'s review/QA closure is a process step after this plan, not a coding task, tracked as an open item below.
- Traceability: pass. Every PRD obligation in scope and every TechSpec `DEC`/`TC` ID resolves to at least one task in the matrix above; no task lacks a source.
- Dependencies: pass, acyclic. T03 depends only on T02 (needs a real `packageVersion` to compare against); T08 depends only on T01 and T07 (needs their confirmed facts to record); T09 depends on all others as the closing full-gate proof. T01, T02, T04, T05, T06, T07 have no cross-task dependency and can execute in any order or in parallel.
- Atomicity: pass. Each task is one reviewable, independently testable vertical slice (implementation plus its own unit/integration/E2E tests) touching a bounded, mostly non-overlapping file set; the only shared file across tasks is `src/core/services/removal-service.ts` (T04 only) and `src/core/contracts/changes.ts`/`schemas/install-report.schema.json` (T04 only, single task), so no two tasks race on the same file.
- Executability: pass. Every task cites real `AGENTS.md` commands (`npm run build`, `typecheck`, `lint`, `test`, `coverage`, `schemas:check`, `assets:check`, `dependencies:check`, `package:smoke`) and exact existing file/line evidence; no placeholder command.
- Validation profile: pass. End-to-end tests are used only where the TechSpec's Test approach marks them (T02, T03, T04, T05 built-CLI scenarios); everything else is unit or integration, per `.agents/rules/tests.md`. Platforms: Linux, macOS, Windows (PowerShell and Git Bash) apply to T04 (paths, directory removal) and T09 (closing CI matrix run); the rest are platform-independent. Environment: none of T01, T02, T03, T05, T06, T09 need anything beyond the existing toolchain; T07 needs a manual review of cited vendor sources before a floor is declared; T09 needs T01–T08 complete first.
- Idempotency: pass. T02's manifest write, T03's classification, T04's deletion/pruning, and T05's preview/report deduplication are each explicitly specified to produce no further change on a second run with unchanged inputs, matching `file-changes.md`'s idempotency requirement; each task's Acceptance criteria states the no-op case.

## Assumptions and open items

- Assumption: the runtime-state directory FR-09 removes is `.context-brake/runtime/`, as defined by the PRD-02 TechSpec (`tasks/prd-02-telemetria-zonas-e-freio/techspec.md:148,158,232`). If PRD-02 changes that path before T04 executes, T04 must be re-scoped to match (per the PRD's own `Assumptions and sources`).
- Open item: `OBJ-01`'s closure — this feature's own `sdd-review-code` and QA, followed by PRD-01's first QA covering RF1–RF24 and CA-01–CA-21 — is a process step after T01–T09 land, not a task in this plan. Owner: whoever runs the review/QA skills after T09's Handoff is recorded; affects nothing in this plan's task set, only the feature's overall completion.
- Open item: T07's researched minimum versions depend on finding an official release note or changelog naming the introducing version for each harness's registered mechanisms; some harnesses may have none, in which case T07 records "not documented" per FR-12's own allowance, and no task is blocked by that outcome.
- Required environment: T07 needs a manual review of any cited vendor source before a floor is declared (an incorrect floor is a false compatibility claim, per PRD-01's TechSpec "Honest version compatibility" decision). T09 needs T01–T08 already applied to the working tree so its full-gate run reflects the whole feature, not a partial one. No other task in this plan needs an external environment, credential, or authorization beyond the existing local Node.js/npm toolchain.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done
- [x] T07 — done
- [x] T08 — done
- [x] T09 — done

## Problems and solutions

- T02: the task's Affected files listed `remove.ts` as a modify target ("do the same in remove.ts wherever the manifest is rewritten"), but `removal-service.ts`'s `planCoreDeletions` only ever deletes the manifest outright — there is no code path where `remove` rewrites it with a new `packageVersion`. Resolution: left `remove.ts` unmodified and recorded the reasoning in T02's Handoff; no functional gap results because nothing rewrites the manifest on that path today.
- T04: kept `tests/integration/safe-removal.test.ts` unchanged and put all new T04 coverage in a new `tests/integration/runtime-state-removal.test.ts` plus `tests/integration/directory-pruner.test.ts`, instead of extending `safe-removal.test.ts` in place as its Affected files listed — the added scenarios pushed that file over the lint `max-lines-per-function`/file-size limits. Registered the new process-lane file in `tests/test-lanes.ts` (it imports `remove.ts`, matching the `/cli/commands/` process marker). Directory pruning also had to special-case the `.context-brake` root as lenient (no report when `runtime/` legitimately lingers without `--remove-state`) versus strict for directories actually targeted for full clearing, to avoid turning default `remove`'s expected retention of PRD-02 runtime state into a spurious warning/exit-code-1 — this distinction wasn't spelled out in the task file and was inferred from the acceptance criteria and UX section of the PRD.
- T07: live research (WebFetch against Claude Code's and Cursor's official hooks/changelog pages) found no official source stating the *introducing* version for any of the 8 harnesses' registered mechanisms — only later incremental-refinement versions are documented. Per FR-12's explicit "not documented" allowance, no adapter declares a `minimumVersion`; T07.3 and T07.5 are marked done as "not applicable" with the reasoning recorded in T07's Handoff, rather than fabricating a floor to satisfy the letter of those subtasks.
- T03: discovered that `tsconfig.check.json` does not actually typecheck `tests/` or `scripts/` — its own `include` lists them, but it inherits `exclude: ["tests", "scripts"]` from the base `tsconfig.json` and never overrides it, and `exclude` wins. Verified by injecting a deliberate type error into a test file and observing zero `tsc` errors. This predates this feature entirely and affects every task's test files, not just T03's, but it is squarely **T09's** responsibility (typecheck scope and the full-gate proof) to fix `tsconfig.check.json` and absorb whatever type errors surface across the whole test suite once fixed.
- T09: fixed the `tsconfig.check.json` `exclude`-inheritance gap T03 flagged, by adding `"exclude": []` alongside the task's literal `assets/**/*.ts` include addition. This surfaced 21 real, pre-existing type errors across 9 files (8 test files, 1 script) that had never actually been typechecked — all fixed with minimal, assertion-preserving edits (readonly-array typing, undefined guards, literal-widening annotations on `CapabilityState`/`Severity` unions). None were caused by T01–T08; all were latent. Full gate (build, typecheck, lint, test, coverage, schemas:check, assets:check, dependencies:check, package:smoke) passes green in one pass with these fixes in place.
