# Code review report — prd-03-plano-checkpoint-e-boot

## Summary

- Status: **APPROVED WITH RESERVATIONS**
- Git scope: `86961bb..ba11fe2` plus the scoped uncommitted T17 correction and flow artifacts. `.agents/scheduled_tasks.lock` and the PRD 02 closure files are outside this feature.
- Previous review: `codereview_03/codereview.md` (`APPROVED WITH RESERVATIONS`); before it `codereview_02/codereview.md` and `codereview_01/codereview.md` (`REJECTED`).
- Independence: this session authored none of the implementation or correction code; the prior session implemented T17. All validations below were executed in this session.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `prd.md`, approved `DEC-EX-T05` SHA-256 `b244d285…` | Read; hash matches the checkpoint |
| TechSpec | `techspec.md`, amended under `DEC-EX-T14`/`DEC-EX-T14B`, SHA-256 `cea69cb8…` | Read; amendments match their approved scopes |
| Manifest | `tasks.md` | Read; all nine task links resolve; `T01`–`T09` state `done` |
| Corrections | `qa_01/done/task_17.md`; immutable `qa_01/qa.md`; `codereview_01/done/task_10.md`–`task_13.md`; `codereview_02/done/task_14.md`–`task_16.md` | Read; histories preserved |
| Implementation | Commits `284c933` (implementation) and `ba11fe2` (docs) plus the uncommitted T17 correction: `src/cli/output/text.ts`, `tests/integration/plan-status-command.test.ts`, `tests/e2e/e2e-plan-status.test.ts` | Delimited; untracked `qa_01/done/task_17.md` included |

## Coverage matrix

`C` means conformant. Unchanged rows retain `codereview_03` evidence where source and contract did not change; every row was re-exercised by the full suite and coverage runs executed in this session, and the rows touched by T17 were re-checked against current code and tests.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Create both state files | `commands/plan.ts:47-60` | TC-01 | C | Built CLI and store tests |
| RF2 | Refuse overwrite without confirmation | `commands/plan.ts:52-57`, `confirmation.ts:11-21` | TC-02 | C | Existing files remain byte-identical |
| RF3 | Example step and validation command | `plan-scaffold.ts:20-29` | TC-01 | C | Scaffold assertion |
| RF4 | Plan fields and statuses | `contracts/task-plan.ts:16-23` | TC-03 | C | Strict validator tests |
| RF5 | Checkpoint Git and memory fields | `contracts/state-checkpoint.ts:19-41` | TC-16 | C | Strict validator tests |
| RF6 | Publish versioned schemas | `generate-schemas.ts`, `check-package.ts:22-23` | TC-18 | C | `schemas:check` and `package:smoke` pass this session |
| RF7 | Validate files and consistency | `validation/*-validator.ts`, `task-plan.ts:48-55` | TC-03 | C | Unique ids, one `IN_PROGRESS`, active step present |
| RF8 | Earlier-version migration message | `validation/issues.ts:24-28` | TC-16 | C | Version mismatch names the version 1 migration |
| RF9 | Deliver boot on documented channels | `brake-engine.ts`, `boot-summary.ts`, harness adapters | TC-05 | C | Six startup and four compaction channels; full suite green |
| RF10 | Suppress inactive or complete boot | `boot-policy.ts:26,35` | TC-06 | C | Missing and completed state skip inspection |
| RF11 | Invalid state yields repair instruction only | `boot-policy.ts:19-44` | TC-04 | C | Invalid content withheld; secret sentinels absent |
| RF12 | Budget and retained constraints | `boot-summary.ts:70-86` | TC-07, TC-08 | C | Files, then older decisions, never constraints; checkpoint pointer |
| RF13 | Protocol boot routine | `protocol-service.ts:41-47` | TC-13 | C | Six-step routine; packaged file byte-equal |
| RF14 | Compare commit, history, and tree | `git-inspector.ts`, `git-divergence.ts:6-23`, `boot-reader.ts:32-36` | TC-09, TC-10 | C | Built hook names dirty and outside-history states |
| RF15 | Validate before editing | `boot-summary.ts:35-39` | TC-11 | C | Simulated first call validates (nuance in limitations) |
| RF16 | Report omitted Git checks | `git-divergence.ts:8-10`, `boot-reader.ts:39-46` | TC-12 | C | Built hook reports `git_missing` and `not_repository` omissions |
| RF17 | Red-zone state and commit instruction | `zone-actions.ts:13,28-34` | TC-14, TC-17 | C | Protocol row instructs the `checkpoint:` commit; state files stay out of commits (CA-17) |
| RF18 | Switch off commit instruction | `zone-actions.ts:28-34` | TC-14 | C | Protocol red row drops the sentence (telemetry residual: RV-03) |
| RF19 | Text status and validity | `plan-status.ts`, `output/text.ts:68-91` | TC-15 | C | **Re-verified after T17**: missing and invalid plans are distinguished through `files.plan.exists`; CLI status tests |
| RF20 | JSON status parity | `diagnostics.ts:38-42`, `commands/plan.ts:79-86` | TC-15 | C | Same report object; `planStatusReportSchema.safeParse` asserted (published-schema gap: RV-04) |
| CA-01, CA-02 | Init and overwrite scenarios | `commands/plan.ts` | TC-01, TC-02 | C | CLI e2e |
| CA-03 | Two active steps rejected | `task-plan.ts:51` | TC-03 | C | **Re-verified after T17**: rule named; the built CLI no longer reports the existing invalid plan as missing |
| CA-04 | Bad checkpoint withheld | `boot-policy.ts`, `boot-reader.ts` | TC-04 | C | Only `Repair <file>:` instruction; no state content |
| CA-05 | Delivery on supported startup and compaction channels | Harness adapters, `brake-engine.ts` | TC-05 | C | All six startup; compaction on the four documented channels; Cursor/Copilot asserted silent |
| CA-06 | Suppression for completed plan | `boot-policy.ts:35` | TC-06 | C | Completed plan silent through the built hook |
| CA-07, CA-08 | Constraints and 1,000-token fixture | `boot-summary.ts` | TC-07, TC-08 | C | `js-tiktoken` fixture ≤ 1,000 tokens with 20 constraints intact |
| CA-09 | Outside-history commits named | Inspector, comparison, reader | TC-09 | C | Built hook names recorded and current commits |
| CA-10 | Dirty tree named | Inspector, comparison, reader | TC-10 | C | Built hook names pending changes |
| CA-11 | Validation within three calls before edit | `e2e-simulated-boot.test.ts:75-90` | TC-11 | C | First recorded call validates, before edit (modeling note in limitations) |
| CA-12 | No-Git omission named | Inspector, comparison, reader | TC-12 | C | Built hook `git_missing` and `not_repository` cases |
| CA-13 | Protocol fallback | `protocol-service.ts` | TC-13 | C | Integration test |
| CA-14 | Conditional checkpoint commit | `zone-actions.ts:28-34` | TC-14 | C | Switch-on and switch-off assertions (residual: RV-03) |
| CA-15 | Five-step JSON status | CLI status | TC-15 | C | CLI e2e; schema-valid JSON |
| CA-16 | Migration message | Validators | TC-16 | C | Unit test |
| CA-17 | Twenty sessions per full harness leave clean tree | Long-task simulator | TC-17 | C | Unconditional empty `git status --porcelain`; checkpoint and commit asserted |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` independence | OK | Separate session from the T17 authoring session; this session wrote only the report and flow state |
| `code-standards.md` and TypeScript rules | OK with reservation | typecheck passes; T17 files are within the 100-line limit (91/100/97); two trivial style hits persist (RV-02) |
| `node.md` and `harness-adapters.md` | OK with reservation | `NodeProcessRunner` argument arrays and timeouts only (`DEC-EX-CR01` intact); documented channels only; one deadline edge recorded as RV-05 |
| `file-changes.md` and `cli-output.md` | OK with reservation | Atomic temp+rename stores unchanged; T17 makes the invalid-plan message name the file and its repair without the false absence claim; plan output schemas still unpublished (RV-04) |
| `tests.md` | OK | T17 adds a CA-03-cited built-CLI regression and strengthens the malformed-plan integration assertion; focused run 2 files / 9 tests, full suite 173 files / 967 tests |
| Manifest and task integrity | OK | T01–T09 in `done/`, T10–T13 in `codereview_01/done/`, T14–T16 in `codereview_02/done/`, T17 in `qa_01/done/`; all nine manifest links resolve; every Work box checked |
| Mandatory full validation | OK with reservation | `npm test` 173/967 and `npm run coverage` green in this session; repository-wide `npm run lint` fails on five QA evidence scripts introduced after `codereview_03` (RV-07) |

## Quality profile

The TechSpec QA-01–QA-08 searches ran over `src/`, `scripts/`, and `tests/` with `rg`; every hit was compared against `86961bb` (added lines in `git diff 86961bb..HEAD` plus new-file hits) and subtracted against the Terrain baseline.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg ':\s*any\b|\bas any\b|<any>'` | 0 | OK |
| QA-02 | Core importing infrastructure or CLI | blocking | `rg "from '(\.\./)+(infrastructure\|cli)/" src/core` | 0 | OK |
| QA-03 | Sync APIs in in-process adapters | blocking | `rg '\b(readFileSync\|writeFileSync\|existsSync\|spawnSync)\b' src/infrastructure` | 0 | OK |
| QA-04 | Shell execution APIs | blocking | `rg '\bexecSync\(\|\bexec\(\|shell:\s*true'` | 1, pre-existing | pre-existing `version-service.ts:30` RegExp `.exec()`; file untouched |
| QA-05 | Empty `catch` | blocking | `rg -U 'catch\s*(\([^)]*\))?\s*\{\s*\}'` | 0 | OK |
| QA-06 | Generic `throw new Error(` | reservation | `rg 'throw new Error\('` | 1 introduced of 29 | RV-02; 28 matched lines exist at `86961bb` (tracked-diff comparison shows exactly one added line) |
| QA-07 | File above 100 physical lines | reservation | `rg -c '^'` | 1 introduced of 3 | RV-01 (`e2e-simulated-long-task.test.ts` 103); `e2e-brake.test.ts` 106 and `instruction-service.ts` 103 pre-exist at base; T17 files at 91/100/97 |
| QA-08 | Clock or randomness in core | reservation | `rg 'Date\.now\(\)\|new Date\(\)' src/core` | 0 | OK (CLI timestamps use the `now` injection point) |

- Terrain baseline: applied from `techspec.md#Terrain-baseline` at `86961bb`.
- Hits discounted by baseline: 31 (QA-04: 1, QA-06: 28, QA-07: 2).
- Reservations accumulated in the feature: 2 profile reservation hits (RV-01, RV-02), 4 previously accepted optional items (RV-03–RV-06), and 1 new optional improvement (RV-07).
- Suggested escalation: no trigger fired; 2 profile reservation hits (below 8), largest touched file `git-inspector.ts` at 96 lines (below 200), and no block duplicated in three places.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01–DEC-08, DEC-10–DEC-15 | YES | Engine boot decision, adapter gates, excluded harnesses, tolerant reader, validation errors, schema versioning, budget order, commit switch, `plan status` report, `--yes` refusal, extracted parser; unchanged and re-exercised by this session's full runs |
| DEC-09 / CMP-16 | YES | `NodeBootReader` calls `NodeGitInspector` for valid active state under `DEC-EX-CR01`; `plan status` uses the same inspector |
| DEC-12 / CMP-21 / TC-15 | YES | `renderPlanStatusText` renders the same validated report as JSON and, after T17, emits the initialization message only when `files.plan.exists` is false |
| `DEC-EX-CR01` process boundary | YES | `NodeProcessRunner` with argument arrays and timeouts remains the only process path; bundle guard unchanged |
| `DEC-EX-T05` documented-channel matrix | YES | Six startup channels; compaction reinjection only for Claude Code, Codex CLI, Pi, Oh-My-Pi; Cursor/Copilot asserted silent on `preCompact` |
| `DEC-EX-T14` safe omission | YES | `failure-policy.ts:55,71-73` emits one omission only for `session_reset` + deadline + `session_boot` supported; 1500 ms deadline retained; compaction edge recorded as RV-05 |
| `DEC-EX-T14B` boot Git budget | YES | `runtime-composition.ts:18,60` wires `BOOT_GIT_BUDGET_MS` (1000 ms) only into the boot path; `git-inspector.ts` clamps every command and degrades to `checks_omitted`; `plan.ts:78` keeps the unbounded inspector |
| TC-01–TC-18 | YES | All expected results proven in this session's full runs; TC-06's file cell is stale (`techspec.md` names a file that does not exist; results live in `tests/unit/boot-summary.test.ts` and `tests/integration/boot-delivery.test.ts`) |
| TechSpec quality profile | RESERVATION | Two optional reservation hits (RV-01, RV-02); no blocking hit |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01–T04 | `done/task_01.md`–`done/task_04.md` | COMPLETE | Entities, stores, inspector, boot policy; unaffected evidence retained |
| T05 | `done/task_05.md` | COMPLETE | Reopened after `codereview_01/CR-01`; T10 closed integrated Git delivery; `DEC-EX-T05` contract recorded |
| T06–T08 | `done/task_06.md`–`done/task_08.md` | COMPLETE | Protocol switch, status command, schema publishing |
| T09 | `done/task_09.md` | COMPLETE | Reopened after `codereview_01/CR-03`; T12/T11 reconciled clean-tree evidence and the manifest link |
| T10–T13 | `codereview_01/done/task_10.md`–`task_13.md` | COMPLETE | Four correction handoffs with current evidence |
| T14 | `codereview_02/done/task_14.md` | COMPLETE | Three completions (diagnostics; `DEC-EX-T14` omission + lane; `DEC-EX-T14B` T14.6 budget) with both reopenings preserved |
| T15 | `codereview_02/done/task_15.md` | COMPLETE | Sampler classification and bounded retries verified in `sample-failure.ts`, `process-sampler.ts:48-56` |
| T16 | `codereview_02/done/task_16.md` | COMPLETE | Interleaved measurement pairs verified in `runtime-overhead.test.ts:30-43` |
| T17 | `qa_01/done/task_17.md` | COMPLETE | `qa_01/BUG-01` corrected: missing-plan message gated on `files.plan.exists`, malformed-plan integration assertion, CA-03 built-CLI regression; focused 9/9 and full suite 967/967 green |

## Executed validations

- Profile and scope: Windows 11 / Node 24, built CLI and runtime hooks, unit/integration/e2e suites and temporary fixture repositories. Cross-platform matrix remains the accepted evidence limit.
- Validated state: HEAD `ba11fe2` plus the scoped uncommitted T17 correction; build output regenerated before the suite; process-lane tests serialized.
- Reused evidence: unchanged obligations retain `codereview_03` evidence where source and contract did not change; every full-suite and coverage check was re-executed in this session, and the T17 rows were re-checked against current code and tests.
- Manual acceptance: none required (every task records "Manual: none"); CLI QA follows this review under the `DEC-HIL-02` authorization.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | Passed | Built CLI and runtime assets |
| `npm run lint` | **Failed** — 14 `no-undef` errors in five `qa_01/evidence/*.mjs` scripts (RV-07) | Code style |
| `npm run typecheck` | Passed | Contracts |
| `npm run schemas:check` | Passed | RF6 |
| `npm run dependencies:check` | Passed | Dependency policy (3 runtime packages, no install scripts) |
| `npm run package:smoke` | Passed | TC-18 |
| `npm test -- plan-status-command e2e-plan-status --maxWorkers=1` | Passed; 2 files / 9 tests | T17 focused evidence |
| `npm test` | Passed; 173 files / 967 tests (411 s) | Full suite, TC-01–TC-17 |
| `npm run coverage` | Passed (exit 0; 80% thresholds enforced); 93.55% statements / 87.21% branches / 95.44% functions | Mandatory full validation gate |
| `git diff --check` | Passed | `codereview_01/CR-04` hygiene |

## Findings

No blocking findings. Optional improvements only:

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| RV-07 | Low, optional | AGENTS.md commands; repository-wide `npm run lint` | `qa_01/evidence/in-process-probe.mjs`, `measure-tokens.mjs`, `probe.mjs`, `validate-plan-status.mjs`, `write-config.mjs` — 14 `no-undef` errors (`process`, `console`, `Buffer`). The files did not exist at `86961bb` and were added with the QA evidence commit `ba11fe2`, after `codereview_03` ran lint green. | `npm run lint` exits 1, so the repository's documented lint command is red; no product, obligation, or shipped-package impact (evidence runners only) | Import the Node globals from their `node:` modules in the five scripts, following the established `tests/fixtures/**/*.mjs` convention (`import process from 'node:process'`), or scope the evidence folder out of ESLint; then rerun `npm run lint` |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` boot git comparison missing | resolved | `boot-reader.ts:32-46` inspects Git for valid active state; `tests/integration/boot-git-delivery.test.ts` covers dirty, outside-history, missing, no-git, and non-repository cases |
| `codereview_01/CR-02` stale T09 link | resolved | `tasks.md` links `done/task_09.md`; all nine task links verified to resolve in this session |
| `codereview_01/CR-03` dirty-tree profile gap | resolved | Failure profile restores the exact config; final empty `git status --porcelain` assertion is unconditional (CA-17 row) |
| `codereview_01/CR-04` EOF blank lines | resolved | `git diff --check` passed this session |
| `codereview_02/CR-01` full-suite gate not repeatably green | resolved | Each family has a proven cause and a correction (T14.4–T14.6, T15, T16); the gate passed in this independent session (`npm test` 173/967; `npm run coverage` green) |
| `codereview_03/RV-01` long-task test length | persistent | Still 103 physical lines; accepted open item under `DEC-RES-01` |
| `codereview_03/RV-02` generic throw and blank line | persistent | `tests/unit/brake-engine-boot.test.ts:62` and `src/cli/commands/plan.ts:81`; accepted open item |
| `codereview_03/RV-03`–`RV-06` | persistent | Telemetry commit-switch residual, missing published plan schemas, Copilot `preCompact` deadline emission, and wiring regression tests; accepted open items with no code change in their areas |
| `qa_01/BUG-01` invalid plan reported as missing | resolved | `output/text.ts:71-73` gates the message on `files.plan.exists`; integration and built-CLI regressions assert the invalid plan reports only actionable findings and no `plan init` guidance; focused 9/9 and full suite green. `qa_01/qa.md` remains immutable `REJECTED` pending an independent re-QA |

## Limitations and open items

- Local validation is Windows / Node 24. The Linux/macOS and Node 20/22 matrix has not run; HIL 1 accepted this evidence limit.
- Pi and Oh-My-Pi boot delivery uses documented fixtures without a local real installation; HIL 1 accepted the simulation approach.
- CA-11's "uses only the boot content" is modeled by a static simulated script plus ordering assertions; structural prohibition of file reads is not enforced (PRD "Verificação por simulação").
- RF15 nuance: when the active step exists with `validationCommand: null`, `boot-summary.ts:36-38` emits the generic validate-first line instead of falling back to the last completed step's command; the PRD edge is handled but the fallback reading is debatable.
- TC-06's file cell in `techspec.md:117` points to a file that does not exist; its expected result is proven in `tests/unit/boot-summary.test.ts` and `tests/integration/boot-delivery.test.ts`.
- The interactive-TTY decline path of `plan init` returns exit 0 with no message and is untested (`plan.ts:57`); non-TTY and `--yes` paths are covered.
- Published JSON Schemas cannot express RF7's consistency rules (unique ids, one `IN_PROGRESS`, active step present); external consumers validating with the JSON Schema alone accept plans the strict validator rejects. Enforced at every internal use.
- Suite behavior under load remains a documented characteristic; both full runs in this session were green without flakes.
- `npm run lint` is red on the five QA evidence scripts (RV-07); correcting it touches only evidence runners or the ESLint scope and does not invalidate the recorded QA behavior.
- CLI QA has not re-run on the corrected code; HIL 2 authorized it after the review cycle closes. `qa_01/qa.md` remains `REJECTED` until an independent `qa_02` validates T17.

## Conclusion

All twenty RF and seventeen CA obligations are conformant against the approved contracts, all seventeen tasks are complete with reconciled handoffs and intact links, and the mandatory test and coverage gate is green in this independent session. `qa_01/BUG-01` is resolved: the text renderer now distinguishes an absent plan from an existing invalid one through `files.plan.exists`, with focused integration and built-CLI evidence and no change to the report object, JSON output, or exit codes. The previous blocking findings remain resolved. One new non-product hygiene failure (`npm run lint`, RV-07) and the six previously accepted optional items remain, none touching a requirement, security, or essential evidence. This report is **APPROVED WITH RESERVATIONS**; the reservations gate decides whether to correct RV-07 or finalize with it recorded as an accepted open item, and CLI QA re-runs after the cycle closes.
