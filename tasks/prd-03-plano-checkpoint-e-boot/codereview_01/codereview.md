# Code review report — prd-03-plano-checkpoint-e-boot

## Summary

- Status: **REJECTED**
- Git scope: `86961bb..91b4e68` plus staged, unstaged, and untracked prd-03 files present on 2026-09-21. `.agents/scheduled_tasks.lock` and prd-02 closure artifacts are pre-existing or unrelated.
- Previous review: none.
- Review independence: this session did not author the implementation.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `prd.md`, approved hash `b244d285…` (`DEC-EX-T05`) | read; hash matches checkpoint |
| TechSpec | `techspec.md`, approved hash `da6349bf…` (`DEC-EX-T05`) | read; hash matches checkpoint |
| Manifest | `tasks.md` and nine `done/task_*.md` handoffs | read; T09 link is broken |
| Implementation | Git base above, current worktree, built runtime assets, and focused source/tests | delimited; untracked source included |

## Coverage matrix

`C` means conformant; `N` means non-conformant. Tests named below passed, but a passing isolated test does not prove its integration path.

| Source | Obligation | Implementation and test | State | Evidence |
| --- | --- | --- | --- | --- |
| RF1 | `plan init` creates both files | `commands/plan.ts`; TC-01 | C | CLI e2e and stores tests pass |
| RF2 | No overwrite without confirmation | `commands/plan.ts`; TC-02 | C | e2e checks files remain identical |
| RF3 | Example step and command | `plan-scaffold.ts`; TC-01 | C | scaffold has step 1 and `npm test` |
| RF4 | Plan fields and statuses | `contracts/task-plan.ts`; unit validator | C | schema and strict parse |
| RF5 | Checkpoint git and memory fields | `contracts/state-checkpoint.ts`; unit validator | C | schema and strict parse |
| RF6 | Publish versioned schemas | `generate-schemas.ts`, `check-package.ts`; TC-18 | C | schemas check and package smoke pass |
| RF7 | Validate files and consistency | `validation/*-validator.ts`; TC-03, doctor tests | C | duplicate, active step, and cross-file checks |
| RF8 | Earlier version migration message | validators; TC-16 | C | version mismatch names version 1 migration |
| RF9 | Boot content and delivery | `boot-summary.ts`, `boot-reader.ts`, adapters; TC-05 | N | delivery works, but repository divergences cannot reach boot (CR-01) |
| RF10 | Suppress inactive/completed boot | `boot-policy.ts`; TC-06 | C | missing and complete plan cases pass |
| RF11 | Invalid state yields repair instruction | `boot-policy.ts`; TC-04 | C | integration excludes invalid file content |
| RF12 | Budget and retained constraints | `boot-summary.ts`; TC-07, TC-08 | C | tokenizer fixture and reduction tests pass |
| RF13 | Protocol boot routine | `protocol-service.ts`; TC-13 | C | protocol content test passes |
| RF14 | Compare commit/history/tree for boot | `git-inspector.ts`, `git-divergence.ts`; TC-09, TC-10 | N | inspector and formatter are isolated from `NodeBootReader` (CR-01) |
| RF15 | Validate before editing | `boot-summary.ts`; TC-11 | C | simulated agent validates at first tool call |
| RF16 | Report omitted git checks | `git-divergence.ts`; TC-12 | N | runtime boot always renders no divergence (CR-01) |
| RF17 | Red-zone state and commit instruction | `zone-actions.ts`; TC-14, TC-17 | C | switch-on text and save sequence pass |
| RF18 | Switch off commit instruction | `zone-actions.ts`; TC-14 | C | switch-off test passes |
| RF19 | Text status and file validity | `plan-status.ts`, `output/text.ts`; TC-15 | C | status tests pass |
| RF20 | JSON status parity | `diagnostics.ts`, `commands/plan.ts`; TC-15 | C | schema-valid JSON test passes |
| CA-01, CA-02 | Init and overwrite examples | T02 e2e | C | TC-01, TC-02 |
| CA-03 | Two active steps rejected | T01 unit | C | TC-03 |
| CA-04 | Bad JSON withheld at startup | T05 integration | C | TC-04 |
| CA-05, CA-06 | Delivery and suppression | T05 integration; T09 startup simulation | C | TC-05, TC-06 |
| CA-07, CA-08 | Constraints and 1,000-token fixture | T04 unit | C | TC-07, TC-08 |
| CA-09 | Outside-history commits named in boot | T03 inspector and T04 unit | N | combined runtime path passes empty divergences (CR-01) |
| CA-10 | Dirty tree named in boot | T03 inspector and T04 unit | N | same combined-path gap (CR-01) |
| CA-11 | Validation within three calls before edit | T09 simulated boot | C | validation is first recorded call |
| CA-12 | No-git omission named in boot | T03 inspector and T04 unit | N | same combined-path gap (CR-01) |
| CA-13 | Protocol fallback | T06 integration | C | TC-13 |
| CA-14 | Conditional checkpoint commit | T06 unit | C | TC-14 |
| CA-15 | Five-step JSON status | T07 e2e | C | TC-15 |
| CA-16 | Migration message | T01 unit | C | TC-16 |
| CA-17 | 20 sessions each leave clean tree | T09 simulated long task | N | each harness includes a failure profile permitted to leave modified config (CR-03) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` independence | OK | separate session; only report and flow state written |
| `code-standards.md`, TypeScript and Node rules | OK with finding | lint/typecheck pass; one pre-existing 106-line test remains unchanged in length |
| `harness-adapters.md` | OK within documented channel scope | six startup and four compaction fixtures pass; vendor capture gaps remain in accepted open items |
| `file-changes.md`, `cli-output.md` | OK | temp-file stores, no-overwrite tests, text/JSON checks pass |
| Manifest link integrity | NOT OK | `tasks.md:64` points to absent `task_09.md` (CR-02) |

## Quality profile

The TechSpec profile was run across `src/`, `scripts/`, and `tests/`, then compared with `86961bb` for touched files. This scope is wider than the required changed-file set.

| ID | Rule | Class | Hits and state |
| --- | --- | --- | --- |
| QA-01 | `any` | blocking | 0; OK |
| QA-02 | core imports infrastructure or CLI | blocking | 0; OK |
| QA-03 | sync APIs in Pi/Oh-My-Pi adapters | blocking | 0; OK |
| QA-04 | shell execution APIs | blocking | 0 introduced; broad search finds pre-existing RegExp `.exec()` in `version-service.ts`; OK |
| QA-05 | empty `catch` | blocking | 0; OK |
| QA-06 | generic `throw new Error` | reservation | 0 introduced; hits in touched scripts and simulator predate this diff; OK |
| QA-07 | file above 100 lines | reservation | 0 introduced; `e2e-brake.test.ts` is 106 lines both at base and now; OK |
| QA-08 | core clock/randomness | reservation | 0; OK |

- Terrain baseline: applied from `techspec.md#Terrain baseline` and base commit. Hits discounted by baseline: pre-existing QA-04, QA-06, and QA-07 hits noted above.
- Reservations accumulated in this feature: 0. Suggested escalation: no trigger fired; no new reservation hits, touched files above 200 lines, or duplicated block in three places.
- Additional hygiene: `git diff --check` fails on extra blank lines at EOF in five touched files (CR-04).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 to DEC-08, DEC-10 to DEC-15 | YES, except integrated git delivery | schemas, CLI, hooks, protocol, and relevant tests pass |
| DEC-09 / CMP-16 | PARTIAL | `NodeGitInspector` exists and `plan status` uses it, but boot does not |
| TC-01 to TC-08, TC-11, TC-13 to TC-16, TC-18 | YES | focused cases included in passing suite |
| TC-09, TC-10, TC-12 | PARTIAL | individual inspector/formatter tests pass; no runtime boot comparison |
| TC-17 | NO | failure profile weakens clean-tree assertion |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | schemas, validators, unit tests |
| T02 | `done/task_02.md` | COMPLETE | scaffold, stores, CLI e2e |
| T03 | `done/task_03.md` | COMPLETE | git port, inspector and divergence tests |
| T04 | `done/task_04.md` | COMPLETE | boot renderer, policy, budget tests |
| T05 | `done/task_05.md` | INCOMPLETE | boot transport passes, integrated git input absent (CR-01) |
| T06 | `done/task_06.md` | COMPLETE | protocol switch tests |
| T07 | `done/task_07.md` | COMPLETE | status and doctor validation tests |
| T08 | `done/task_08.md` | COMPLETE | schema currency and package smoke |
| T09 | `done/task_09.md` | INCOMPLETE | acceptance assertion misses clean-tree requirement; manifest link broken (CR-02, CR-03) |

## Executed validations

- State: Windows 11, Node 24, current worktree over `91b4e68`; built CLI and runtime assets used for e2e. This review ran all commands on the current code, so no handoff result was needed for the reported pass.
- Manual acceptance: pending CLI QA after correction and re-review. Real Pi/Oh-My-Pi captures and Linux/macOS/Node 20/22 matrix remain previously accepted evidence limits.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | build and runtime assets |
| `npm run lint` | passed | code standards |
| `npm run typecheck` | passed | contracts |
| `npm test -- --maxWorkers=4` | passed, 168 files / 946 tests | TC-01 to TC-18, except integration gaps above |
| `npm run coverage -- --maxWorkers=4` | passed, 93.61% statements (6,343/6,776) | 80% coverage gate |
| `npm run schemas:check` | passed | RF6 |
| `npm run dependencies:check` | passed | dependency policy |
| `npm run package:smoke` | passed, 351 packaged files | TC-18 |
| `git diff --check` | failed, five extra EOF blank lines | CR-04 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | RF9, RF14, RF16; CA-09, CA-10, CA-12; DEC-09 | `src/infrastructure/runtime/boot-reader.ts:25` constructs `{divergences: []}`; `runtime-composition.ts:51` supplies that reader to all harnesses. Only `plan-status.ts:42` calls `compareGitState`. | Startup and compaction boot never reports missing/outside-history commits, dirty trees, or omitted checks. | Wire a real git comparison into boot for valid checkpoints and add a built-hook integration test for divergence and no-git cases. Preserve the runtime bundle constraint or obtain an architecture exception. |
| CR-02 | Medium | Task manifest integrity | `tasks.md:64` links `task_09.md`, but the file is at `done/task_09.md`. | The manifest's T09 evidence cannot be reached by its link, despite checked state. | Repair the link and reconcile T09 evidence with the manifest. |
| CR-03 | Medium | CA-17, TC-17 | `agent-profiles.ts:6` includes `failure_above_ceiling` in the 20 sessions; `e2e-simulated-long-task.test.ts:67` accepts `M context-brake.config.json` for that profile. | The test suite reports 20 successful sessions while at least one per harness fails the required clean-tree criterion. | Restore the fixture config before final assertion, or test failure recovery separately and use 20 clean sessions for CA-17. |
| CR-04 | Low | Code hygiene | `git diff --check` reports extra EOF blank lines in `commands/plan.ts`, `output/text.ts`, `plan-arguments.ts`, `diagnostics.ts`, and `doctor-checks.test.ts`. | The diff hygiene check fails. | Remove only the extra terminal blank lines and rerun the check. |

## Previous findings

None; this is the first review.

## Limitations and open items

- This Windows/Node 24 run does not establish Linux/macOS or Node 20/22 behavior; `workflow.md` records prior acceptance of that evidence limit.
- Pi and Oh-My-Pi delivery is tested with documented fixtures; no local real installation is available.
- CLI QA is scheduled after an approved re-review and has not run in this review session.

## Conclusion

The integrated boot lacks a required git comparison, the manifest has a broken task link, and the long-task acceptance test permits a dirty final tree. These are blocking gaps under the review status rule, so this report is **REJECTED** despite the passing automated suite and coverage gate.
