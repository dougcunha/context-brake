# Code review report — prd-02.1-freio-por-uso-medido

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `3b94a9c..working tree`. Commits `55d5c7e`, `8e4a137`, `9a16a84`, and `5492604` (prd-06, CI fix, SDD skills) are upstream and outside this feature. The feature's scope is `git diff HEAD` (HEAD `5492604`) plus the untracked files listed below.
- Previous review: —
- Reviewer session: `bdc9931c-2075-4cdb-b3c2-c61fb222be2d`, which wrote no code of this feature (independence rule met).

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02.1-freio-por-uso-medido/prd.md` (sha256 `f9108261…`, DEC-HIL-03) | read |
| TechSpec | `tasks/prd-02.1-freio-por-uso-medido/techspec.md` (sha256 `6f0d3134…`, DEC-HIL-04) | read |
| Manifest | `tasks/prd-02.1-freio-por-uso-medido/tasks.md` (sha256 `8950b13c…`) | read |
| Implementation | 72 modified files (630+/318−) and untracked files: `src/core/services/config-legacy-checks.ts`, `src/infrastructure/harnesses/claude-code/transcript-usage.ts`, `tests/integration/claude-transcript-usage.test.ts`, `tests/integration/init-legacy-turn-limits.test.ts`, `tests/unit/{runtime-claude-measured,config-legacy-checks,brake-engine-plan-actions}.test.ts`, `tests/e2e/e2e-measured-brake.test.ts`, `tests/helpers/transcript-fixtures.ts`, `tests/fixtures/harnesses/claude-code/transcript-*.jsonl`; handoffs in `done/task_01..05.md` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| OBJ-01 | 200 calls with usage below the critical threshold: 0 blocks | `zone-classifier.ts:classifyZone` | `brake-engine-pre-tool.test.ts:88` (200 pre/post events), `e2e-measured-brake.test.ts:43` | conformant | Turn axis removed from `CRITICAL`; tests pass |
| OBJ-02 | Measured usage = sum of the three `usage` fields | `transcript-usage.ts:usageOf`, `runtime.ts:measuredUsage` | `claude-transcript-usage.test.ts:25`, `runtime-claude-measured.test.ts:39` | conformant | TC-13 sums to 194,431 |
| OBJ-03 | No stop instruction without a plan | `zone-actions.ts:ZONE_ACTIONS.{YELLOW,RED}.withoutPlan` | `brake-engine-plan-actions.test.ts:38`, `protocol-service.test.ts:51` | conformant | Negative assertions on "do not start / start no new" |
| OBJ-04 | p95 ≤ 100 ms with a 20 MB transcript | `transcript-usage.ts:scanBackwards` (64 KiB chunks, 4 MiB cap) | `claude-transcript-usage.test.ts:81`, `runtime-overhead.test.ts:91` | conformant | T04 handoff: 1.90x baseline, same as without a transcript; re-run passed in this review |
| FR-01 | `CRITICAL` only by usage | `zone-classifier.ts:21` | `zone-classifier.test.ts:23-26` (74% / 500 turns → `RED`) | conformant | — |
| FR-02 | Optional turn limits up to `RED`; non-increasing limits rejected | `configuration.ts:checkTurnPair`, `zone-classifier.ts:turnLimits` | `zone-classifier.test.ts`, `configuration.test.ts` (TC-02, TC-03) | conformant | Paired presence and `<` rule with path and message |
| FR-03 | Turn shown; ceiling only with limits | `telemetry-block.ts:renderTurn`, `zone-classifier.ts:redStartTurn` | `telemetry-block.test.ts` (TC-05) | conformant | `turn=12` or `turn=12/100` |
| FR-04 | Latest main-thread assistant usage; sidechain excluded | `transcript-usage.ts:usageOf` (`isSidechain === true` skipped) | `claude-transcript-usage.test.ts:29` (TC-14) | conformant | — |
| FR-05 | Estimate on missing, unreadable, or no-usage transcript | `transcript-usage.ts:readTranscriptUsage`, `runtime.ts:measuredUsage` catch | `claude-transcript-usage.test.ts:36-66`, `runtime-claude-measured.test.ts:63-76` | conformant | `null` or logged `TranscriptUnreadableError`, no throw |
| FR-06 | Ignore responses from before a reset | `session-counters.ts:lastResetAt`, `session-zone.ts:isStale` | `session-zone.test.ts:72` (before, equal, after), `session-counters.test.ts` (TC-12) | conformant | — |
| FR-07 | Window = harness value or `contextWindowCeiling`; documented as a budget | `usage-resolver.ts:24`; README config note; protocol text | `usage-resolver.test.ts` (TC-10), `readme-config-example.test.ts` | conformant | README explains the 96,000-token `CRITICAL` point |
| FR-08 | Plan-aware `YELLOW`/`RED` actions in block and protocol | `zone-guidance.ts:resolveGuidance`, `zone-actions.ts:compactZoneAction`, `zoneActionClause` | `brake-engine-plan-actions.test.ts`, `zone-guidance.test.ts`, `protocol-service.test.ts`, `protocol-zone-coherence.test.ts` | conformant | Both variants come from the same table |
| FR-09 | Legacy configs valid; `doctor` warns; `init --yes` migrates; custom limits kept | `configuration.ts` (optional fields), `config-legacy-checks.ts`, `installation-builder.ts:30` | `config-legacy-checks.test.ts`, `init-legacy-turn-limits.test.ts` (TC-19, TC-20) | conformant | See OI-02 for the runtime effect before migration |
| FR-10 | README, telemetry-block doc, protocol, research section, `doctor` capability | `capabilities.ts:8` (`unknown` with impact), docs diff | `harness-adapters.test.ts` (TC-21), `protocol-service.test.ts` (TC-22) | conformant | Research section records the fields, the 2026-09-25 check, and that the format is undocumented |
| NFR-01 | Bounded read, 20 MB | `transcript-usage.ts` (`MAXIMUM_BYTES` 4 MiB) | TC-16 | conformant | — |
| NFR-02 | Resilient parsing; only I/O failures logged | `transcript-usage.ts:parseLine`, `runtime.ts:measuredUsage` | TC-15, `runtime-claude-measured.test.ts:70` | conformant | Unparseable lines skipped silently (DEC-HIL-03) |
| NFR-03 | No transcript text persisted | `usageOf` returns only tokens and timestamp | `runtime-claude-measured.test.ts:70`, e2e TC-18 | conformant | Only the error class name is logged (`failureDetail`) |
| NFR-04 | `schemaVersion` 1, additive schema, block version, ≤ 60 tokens, no runtime dependencies | `schemas/context-brake.config.schema.json` (only `required` entries removed), `TELEMETRY_BLOCK_VERSION = 2` | `telemetry-block-budget.test.ts` (TC-06), `schemas:check` | conformant | `package.json` unchanged |
| NFR-05 | Quality gates | — | lint, typecheck, coverage, `schemas:check`, `package:smoke` | conformant | See Executed validations |
| NFR-06 | Linux, macOS, Windows; paths with spaces and accents | — | TC-16 (accented paths) on Windows | not verifiable | Linux and macOS depend on the CI matrix, which was not run; see limitations |
| Manual acceptance | 30+ calls in a real Claude Code session | — | — | not verifiable | Owner: user, planned for QA (step 6) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` hexagonal boundaries | OK | QA-04 has no hits. The transcript format stays in `claude-code/transcript-usage.ts`. |
| `harness-adapters.md` (undocumented behavior) | OK (scoped deviation) | DEC-12, authorized by DEC-REQ-01: the capability is `unknown`, never `supported`, and every failure falls back to the estimate. |
| `harness-adapters.md` (research re-check) | OK | `docs/research/harness-integrations.md` Claude Code section updated |
| `file-changes.md` | OK | `init` plans an `update` with a preview; `--dry-run` writes nothing (`init-legacy-turn-limits.test.ts:25`) |
| `cli-output.md` | OK | New `doctor` finding uses the existing finding shape and remediation field |
| `javascript-typescript.md`, `node.md` | OK | Async `fs/promises` on the hook path (QA-06: no hits); `handle.close()` in `finally` |
| `tests.md` | OK | TCs are named in test titles; fixtures are synthetic |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over the feature's `.ts` files | 0 | OK |
| QA-02 | Suppressions | blocking | same | 0 | OK |
| QA-03 | Empty `catch` | blocking | same | 0 | OK |
| QA-04 | core → infrastructure/cli | blocking | same over `src/core/**` | 0 | OK |
| QA-05 | stdout on the hook path | blocking | same over hook files | 1 (`process-hook-host.ts:29`, the default `writeStdout`) | excluded by the profile (response writer) |
| QA-06 | Synchronous fs in the transcript reader | blocking | same | 0 | OK |
| QA-07 | Clock in core | reservation | same | 0 | OK (`Date.parse` of stored timestamps is not a clock read, per the profile) |
| QA-08 | 4+ parameters; file > 100 lines | reservation | same | 1 parameter match (false positive: a destructured `it.each` object at `brake-engine-plan-actions.test.ts:34`); 4 files over 100 lines, 2 of them new | 2 new reservation hits (OI-01); `e2e-brake.test.ts` (106) and `e2e-simulated-long-task.test.ts` (103) are unchanged from HEAD, so pre-existing |

- Terrain baseline: applied from the TechSpec (HEAD `3b94a9c`). The prd-06 files, which the TechSpec baseline does not cover, were compared against HEAD `5492604`.
- Hits discounted by baseline: 2 (the pre-existing e2e line counts) plus the profile-excluded QA-05 writer.
- Reservations accumulated in the feature: 2 (`tests/integration/runtime-overhead.test.ts` 97 → 107 lines; `tests/unit/process-hook-host.test.ts` 98 → 105 lines; eslint `max-lines`, which counts non-blank lines, passes).
- Suggested escalation: no trigger fired (2 < 8 reservations; no touched file above 200 lines; no duplication in 3+ places observed).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | `zone-classifier.ts:17-25` |
| DEC-02 | YES | `configuration.ts:62-80`; `DEFAULT_CONFIG` has no turn fields; the schema only relaxes `required` |
| DEC-03 | YES | `config-legacy-checks.ts:checkLegacyTurnLimits`, `normalizeTurnLimits`; `installation-builder.ts:30` |
| DEC-04 | YES | `telemetry-block.ts:3-4`, `block-message.ts:14`; `docs/telemetry-block.md` documents v2 |
| DEC-05 | YES | `zone-actions.ts:44-56`, `planVariants` |
| DEC-06 (revised, DEC-HIL-04) | YES | `zone-guidance.ts:22-31`: without the section, the plan is read only for `YELLOW`/`RED` (pre-tool calls `readGuidance` without a zone, so there is no `stat`); with the section, behavior is unchanged from prd-06; `readPlanPresence`/`hasPlan` removed, and `plan-validation-reader.ts`/`runtime-composition.ts` equal HEAD |
| DEC-07 | YES | `transcript-usage.ts` (64 KiB, 4 MiB, backward scan, torn tail skipped, `TranscriptUnreadableError`) |
| DEC-08 | YES | `runtime.ts:55` (`agent_id` skips the read) |
| DEC-09 | YES | `session-counters.ts:34`, `session-zone.ts:22-25` |
| DEC-10 | YES | `session-zone.ts:9`, `usage-resolver.ts:24` |
| DEC-11 | YES | `process-hook-host.ts:14,73` (line-neutral), `runtime.ts:52-69` |
| DEC-12 | YES | `capabilities.ts:8` |
| DEC-13 | YES | `wrap-telemetry.ts` uses `readZone`; `failure-policy.ts` untouched |
| Contracts (config, block v2, ledger, error log, payload) | YES | No new ledger line types; error code `UNEXPECTED` reused |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Classifier, schema, protocol conditions; TC-01–TC-04 present and passing |
| T02 | `done/task_02.md` | COMPLETE | Block v2 and plan-aware actions; the plan port was replaced during the T04 reconciliation (DEC-HIL-04, recorded in `tasks.md` Problems and solutions); TC-05–TC-09 present and passing |
| T03 | `done/task_03.md` | COMPLETE | `lastResetAt`, nullable window, stale drop; TC-10–TC-12 |
| T04 | `done/task_04.md` | COMPLETE | Reader, async adapter input, e2e; TC-13–TC-18 |
| T05 | `done/task_05.md` | COMPLETE | Legacy migration, capability, docs; TC-19–TC-23 |

Manifest state, links, and the DAG are consistent: all five tasks are in `done/` and marked `[x]`, and every file named in the handoffs exists. `tests/integration/plan-presence-reader.test.ts` is absent, as the T04 reconciliation says.

## Executed validations

- Profile and scope: Claude Code hook run as one process per event (built CLI), the CLI `doctor` and `init` commands, and in-process adapters through the shared contract. End-to-end tests run the built hook against fixture repositories, as the CLI policy requires.
- Validated state: HEAD `5492604` plus the uncommitted feature diff, Windows 11, Node from the repository toolchain, Git Bash, 2026-09-25.
- Reused evidence: none for the gates; all gates were re-run in this session. T04's overhead ratio (1.90x) was reused only as context; the overhead suite itself was re-run.
- Manual acceptance: not run (owner: user, step 6 QA).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | TC-18 prerequisites |
| `npm run schemas:check` | passed | NFR-04, DEC-02 |
| `npm run lint` | passed (0 problems) | NFR-05 |
| `npm run typecheck` | passed | NFR-05 |
| `npm run coverage` (run 1) | failed: 2 of 1,589 tests in `tests/integration/boot-git-delivery.test.ts` (boot output without the `## Repository state` section) | see limitations |
| `npx vitest run tests/integration/boot-git-delivery.test.ts` | passed 5/5 | isolates the run 1 failure |
| `npm run coverage` (run 2) | passed: 244 files, 1,586 passed, 3 skipped; statements 95.43%, branches 90.34%, functions 97%, lines 95.43% | NFR-05, TC-01–TC-23 |
| `npm run package:smoke` | passed (exit 0) | NFR-05 |

## Findings

No blocking findings.

### Optional improvements

| ID | Severity | Source | Evidence | Impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| OI-01 | Low | QA-08 (reservation) | `tests/integration/runtime-overhead.test.ts` 97 → 107 raw lines; `tests/unit/process-hook-host.test.ts` 98 → 105 raw lines | Test files pass the 100-line guideline in raw lines; eslint `max-lines` (non-blank lines) passes | Move the 20 MB transcript overhead case to its own suite, and the async `mapInput` cases to a sibling `process-hook-host-*.test.ts` |
| OI-02 | Medium (product risk, spec-conformant) | FR-09, DEC-02/DEC-03, US-04 | `configuration.ts:64` keeps `greenMaxTurn`/`yellowMaxTurn` active at runtime; `zone-classifier.test.ts:84` shows a legacy 7/10 config at 30% usage and 500 turns → `RED` | Installations upgraded without running `init --yes` still reach `YELLOW` at turn 8 and `RED` at turn 11. `RED` tells the agent to end with `[REQUEST_SESSION_RESET]`, close to the catalogo-2-0 symptom, though without blocking. The PRD only requires the `doctor` warning and migration on `init`. | A product decision, not an in-contract correction: either keep it, relying on the README upgrade note and `doctor`, or ignore the exact retired triple (7/10/12 with `criticalTurn` present) at runtime until `init --yes` normalizes it |
| OI-03 | Low | DEC-09 | `session-zone.ts:24` compares `Date.parse` results; `transcript-usage.ts:772` accepts any string `timestamp` | A non-ISO transcript timestamp yields `NaN`, so the measurement is never considered stale and a pre-compaction reading could be used after a reset | Treat an unparseable `at` as stale (fall back to the estimate), or validate `timestamp` as ISO-8601 in the reader schema |

## Limitations and open items

- Run 1 of `npm run coverage` failed 2 tests in `tests/integration/boot-git-delivery.test.ts` (boot built hook, RF14/RF16/CA-12 of PRD-03). This feature touches no boot code: `git diff HEAD` contains no boot source, only the test helper `tests/unit/brake-engine-boot.test.ts`. The suite passed 5/5 in isolation and inside the full coverage run 2. The likely cause is the git probe's time budget under parallel load. This is recorded as an environment flake outside this feature, and its root cause is not proven.
- NFR-06: Linux and macOS were not run locally; they depend on the CI matrix after the push.
- Manual acceptance in a real Claude Code session (TechSpec test approach) is pending; owner: user, at QA.
- The feature is uncommitted. The Git index still marks 7 files as unmerged (content resolved, no conflict markers), and `stash@{0}` is kept. Committing and cleaning the index are the user's call.

## Conclusion

Every PRD obligation, TechSpec decision, and TC maps to implementation and passing tests. The five tasks are complete with consistent handoffs, and the blocking quality profile is clean. Two optional reservations remain (OI-01, OI-03), plus one product-risk decision (OI-02) that is outside the approved contract. Manual acceptance and the Linux/macOS matrix remain for QA.
