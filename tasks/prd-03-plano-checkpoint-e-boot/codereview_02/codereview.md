# Code review report — prd-03-plano-checkpoint-e-boot

## Summary

- Status: **REJECTED**
- Git scope: `86961bb..91b4e68` plus the current staged, unstaged, and untracked PRD 03 implementation and correction files. PRD 02 closure artifacts and `.agents/scheduled_tasks.lock` are outside this feature.
- Previous review: `codereview_01/codereview.md` (`REJECTED`).
- Independence: this session did not author the implementation or correction code.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `prd.md`, approved `DEC-EX-T05` SHA-256 `b244d285…` | Read; hash matches checkpoint |
| TechSpec | `techspec.md`, approved `DEC-EX-T05` SHA-256 `da6349bf…` | Read; hash matches checkpoint |
| Manifest | `tasks.md`, nine `done/task_*.md` handoffs | Read; all nine links resolve and states are complete |
| Corrections | `codereview_01/codereview.md`, four `codereview_01/done/task_*.md` handoffs | Read; all four corrections complete |
| Implementation | Base, worktree, built assets, source and tests named below | Delimited; includes untracked source and tests |

## Coverage matrix

`C` means conformant; `P` means pending repeatable validation. Every row is checked against the current code and tests; the first review's unaffected evidence is retained where the source and contract did not change.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Create both state files | `commands/plan.ts` | TC-01 | C | Built CLI and store tests |
| RF2 | Refuse overwrite without confirmation | `commands/plan.ts` | TC-02 | C | Existing files remain identical |
| RF3 | Example step and validation command | `plan-scaffold.ts` | TC-01 | C | Scaffold assertion |
| RF4 | Plan fields and statuses | `contracts/task-plan.ts` | TC-03 | C | Strict validator tests |
| RF5 | Checkpoint Git and memory fields | `contracts/state-checkpoint.ts` | TC-16 | C | Strict validator tests |
| RF6 | Publish versioned schemas | `generate-schemas.ts`, `check-package.ts` | TC-18 | C | Schema currency and package smoke pass |
| RF7 | Validate files and consistency | `validation/*-validator.ts` | TC-03 | C | Schema and cross-file tests |
| RF8 | Earlier-version migration message | Validators | TC-16 | C | Version mismatch names migration |
| RF9 | Deliver boot on documented channels | `boot-summary.ts`, `boot-reader.ts`, harness adapters | TC-05 | P | Git comparison is included, but one full run returned `null` for Copilot CLI startup boot |
| RF10 | Suppress inactive or complete boot | `boot-policy.ts`, `boot-reader.ts` | TC-06 | C | Missing and completed state skip inspection |
| RF11 | Invalid state yields repair instruction only | `boot-policy.ts`, `boot-reader.ts` | TC-04 | C | Invalid content withheld; no Git inspection |
| RF12 | Budget and retained constraints | `boot-summary.ts` | TC-07, TC-08 | C | Budget and reduction assertions |
| RF13 | Protocol boot routine | `protocol-service.ts` | TC-13 | C | Protocol content test |
| RF14 | Compare commit, history, and tree | `git-inspector.ts`, `git-divergence.ts`, `boot-reader.ts` | TC-09, TC-10 | C | Built hook names dirty and missing/outside-history states |
| RF15 | Validate before editing | `boot-summary.ts` | TC-11 | C | Simulated first call executes validation |
| RF16 | Report omitted Git checks | `git-divergence.ts`, `boot-reader.ts` | TC-12 | C | Built hook reports no-Git and non-repository omissions |
| RF17 | Red-zone state and commit instruction | `zone-actions.ts` | TC-14, TC-17 | C | Protocol and simulated commits |
| RF18 | Switch off commit instruction | `zone-actions.ts` | TC-14 | C | Switch-off assertion |
| RF19 | Text status and validity | `plan-status.ts`, `output/text.ts` | TC-15 | C | CLI status tests |
| RF20 | JSON status parity | `diagnostics.ts`, `commands/plan.ts` | TC-15 | C | JSON schema and parity tests |
| CA-01, CA-02 | Init and overwrite scenarios | `commands/plan.ts` | TC-01, TC-02 | C | CLI e2e |
| CA-03 | Two active steps rejected | Plan validator | TC-03 | C | Unit test |
| CA-04 | Bad checkpoint withheld | Boot policy and reader | TC-04 | C | Built delivery test |
| CA-05 | Delivery on supported startup and compaction channels | Harness adapters and boot policy | TC-05 | P | Copilot CLI startup boot returned `null` in one full run; isolated rerun passed |
| CA-06 | Suppression for completed plan | Boot policy | TC-06 | C | Completed plan silent |
| CA-07, CA-08 | Constraints and 1,000-token fixture | Boot renderer | TC-07, TC-08 | C | Unit tests |
| CA-09 | Outside-history commits named | Inspector, comparison, reader | TC-09 | C | Built-hook test names recorded and current commits |
| CA-10 | Dirty tree named | Inspector, comparison, reader | TC-10 | C | Built-hook test names pending changes |
| CA-11 | Validation within three calls before edit | Simulator | TC-11 | C | First recorded call validates |
| CA-12 | No-Git omission named | Inspector, comparison, reader | TC-12 | C | Built-hook no-Git and non-repository cases |
| CA-13 | Protocol fallback | `protocol-service.ts` | TC-13 | C | Integration test |
| CA-14 | Conditional checkpoint commit | `zone-actions.ts` | TC-14 | C | Unit test |
| CA-15 | Five-step JSON status | CLI status | TC-15 | C | CLI e2e |
| CA-16 | Migration message | Validators | TC-16 | C | Unit test |
| CA-17 | Twenty sessions per full harness leave clean tree | Long-task simulator | TC-17 | C | Empty `git status --porcelain` is unconditional, including failure profile; checkpoint and commit asserted |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` independence | OK | Separate session; no implementation code authored here |
| `code-standards.md` and TypeScript rules | Reservation | `e2e-simulated-long-task.test.ts` has 103 physical lines (QA-07) |
| `node.md` and `harness-adapters.md` | OK | Process runner uses argument arrays and deadlines; documented channels only |
| `file-changes.md` and `cli-output.md` | OK | Existing store and CLI evidence; no changed user-file path in corrections |
| Manifest and correction integrity | OK | T01–T09 and T10–T13 handoffs are present; T09 link repaired |
| Mandatory full validation | NOT OK | Three full coverage runs each failed one of 954 tests; see CR-01 |

## Quality profile

The TechSpec QA-01–QA-08 searches ran over `src/`, `scripts/`, and `tests/`; QA-07 counted physical lines. The scope is wider than the changed-file requirement. Baseline hits are excluded from new findings.

| ID | Rule | Class | Hits and state |
| --- | --- | --- | --- |
| QA-01 | `any` | blocking | 0; OK |
| QA-02 | Core importing infrastructure or CLI | blocking | 0; OK |
| QA-03 | Sync APIs in in-process adapters | blocking | 0; OK |
| QA-04 | Shell execution APIs | blocking | 0 introduced; pre-existing RegExp `.exec()` in `version-service.ts`; OK |
| QA-05 | Empty `catch` | blocking | 0; OK |
| QA-06 | Generic `throw new Error` | reservation | 0 introduced; touched scripts and simulator hits predate the feature; OK |
| QA-07 | TypeScript file above 100 physical lines | reservation | **1 introduced:** `tests/e2e/e2e-simulated-long-task.test.ts` grew from 91 to 103 physical lines; reservation RV-01. `e2e-brake.test.ts` was already 106 lines at base. |
| QA-08 | Clock or randomness in core | reservation | 0; OK |

- Terrain baseline: applied from `techspec.md#Terrain baseline` at `86961bb`.
- Reservations accumulated in this feature: 1 new hit (RV-01).
- Suggested escalation: no trigger fired; fewer than eight reservation hits, no touched file above 200 lines, and no repeated block in three places.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01–DEC-08, DEC-10–DEC-15 | PARTIAL | Schemas, CLI, protocol, and budget pass; one full run lost Copilot CLI startup boot under DEC-01/02 |
| DEC-09 / CMP-16 | YES | `NodeBootReader` calls `NodeGitInspector` for valid active state under approved `DEC-EX-CR01` |
| TC-01–TC-18 | PARTIAL | TC-05 failed intermittently; corrected TC-09/10/12/17 passed in full runs |
| TechSpec quality profile | RESERVATION | QA-07 one new optional hit; no blocking hit |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01–T04 | `done/task_01.md`–`done/task_04.md` | COMPLETE | Entities, stores, inspector, boot policy; unaffected evidence retained |
| T05 | `done/task_05.md` | COMPLETE | Reopened after CR-01; T10 closes integrated Git delivery with built-hook evidence |
| T06–T08 | `done/task_06.md`–`done/task_08.md` | COMPLETE | Protocol, status, schemas; unaffected evidence retained |
| T09 | `done/task_09.md` | COMPLETE | Reopened after CR-03; T12 proves unconditional clean tree, T11 reconciles handoff and link |
| T10–T13 | `codereview_01/done/task_10.md`–`task_13.md` | COMPLETE | Four correction handoffs and current evidence present |

## Executed validations

- Profile and scope: Windows / Node 24, built CLI and runtime hooks, unit/integration/e2e suites and temporary fixture repositories. Cross-platform matrix remains the accepted evidence limit.
- Reused evidence: unchanged obligations from `codereview_01` and task handoffs; corrections rechecked against current code.
- Manual acceptance: CLI QA follows this review after the reservation decision; real Pi/Oh-My-Pi capture and Linux/macOS/Node 20/22 matrix are previously accepted evidence limits.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | Passed | Built CLI and runtime assets |
| `npm run lint` | Passed | Code style |
| `npm run typecheck` | Passed | Contracts |
| `npm run schemas:check` | Passed | RF6 |
| `npm run dependencies:check` | Passed | Dependency policy |
| `npm run package:smoke` | Passed; 351 packaged files | TC-18 |
| `npm run coverage -- --maxWorkers=2` | Failed: 953/954 tests passed; unrelated doctor benchmark recorded zero samples under load. The same benchmark passed 2/2 in isolation. | Full suite, coverage, TC-17 |
| `npm run coverage -- --maxWorkers=1` | Failed: Copilot CLI startup boot returned `null` in the full suite; the exact case passed in isolation. | RF9, CA-05 |
| `npm run coverage -- --maxWorkers=2` (final rerun) | Failed: built post-tool overhead p95 1120.6 ms exceeded the local 1018.5 ms threshold; the three-case overhead suite passed in isolation. | Mandatory full validation; possible runtime impact |
| `npm test -- doctor-benchmark --maxWorkers=1` | Passed 2/2 | Isolated check of first failure |
| `npm test -- e2e-simulated-boot -t "delivers boot on session startup for github-copilot-cli" --maxWorkers=1` | Passed 1/1 | Isolated check of second failure |
| `npm test -- runtime-overhead --maxWorkers=1` | Passed 3/3 | Isolated check of third failure |
| `git diff --check` | Passed | CR-04 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | Mandatory validation; RF9, CA-05, TC-05 | Three `npm run coverage` attempts each failed 1/954 tests: doctor benchmark reported zero samples, Copilot CLI startup returned no boot text, and built post-tool p95 was 1120.6 ms against a 1018.5 ms local ceiling. Each failed case passed in isolation. | The full coverage gate is not repeatably green, and one failure directly affects the boot delivery criterion. Cause remains unproven; a passing isolated case does not prove full-suite reliability. | Cause still pending. Capture hook exit/stderr and benchmark timing evidence during full-suite runs, isolate resource or fixture interactions, then rerun the mandatory full coverage gate. |
| RV-01 | Low, optional | QA-07; `code-standards.md` | `tests/e2e/e2e-simulated-long-task.test.ts:103` — 103 physical lines, above 100 | File length exceeds the project limit; no behavior or test failure observed | Extract a cohesive test helper or shorten the fixture setup without weakening TC-17 assertions |

## Previous findings

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` | Resolved | `boot-reader.ts` inspects Git for valid active state; built-hook integration covers divergent and unavailable cases |
| `codereview_01/CR-02` | Resolved | `tasks.md` links `done/task_09.md`; all nine links resolve |
| `codereview_01/CR-03` | Resolved | Failure profile restores exact installed config, then unconditional empty Git-status assertion runs for all sessions |
| `codereview_01/CR-04` | Resolved | `git diff --check` passes |

## Limitations and open items

- Local validation is Windows / Node 24. The Linux/macOS and Node 20/22 matrix has not run; HIL 1 accepted this evidence limit.
- Pi and Oh-My-Pi boot delivery uses documented fixtures without a local real installation; HIL 1 accepted the simulation approach.
- CLI QA has not run; HIL 2 authorized it after an approved review.
- RV-01 remains an optional quality reservation, but CR-01 blocks the reservations gate and QA.

## Conclusion

The four prior findings are resolved. The mandatory full coverage gate failed three times on the current code, including one intermittent boot delivery failure. This report is **REJECTED** pending a repeatable full-suite pass or a proven correction. RV-01 remains optional after that block is closed.
