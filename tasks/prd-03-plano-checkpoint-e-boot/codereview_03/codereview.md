# Code review report — prd-03-plano-checkpoint-e-boot

## Summary

- Status: **APPROVED WITH RESERVATIONS**
- Git scope: `86961bb..91b4e68` plus the current staged, unstaged, and untracked PRD 03 implementation and correction files. PRD 02 closure artifacts and `.agents/scheduled_tasks.lock` are outside this feature.
- Previous review: `codereview_02/codereview.md` (`REJECTED`); before it `codereview_01/codereview.md` (`REJECTED`).
- Independence: this session authored none of the implementation or correction code; the prior session implemented T14.6. All validations below were executed in this session.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `prd.md`, approved `DEC-EX-T05` SHA-256 `b244d285…` | Read; hash matches checkpoint |
| TechSpec | `techspec.md`, amended under `DEC-EX-T14`/`DEC-EX-T14B` (Failure policy), current SHA-256 `cea69cb8…` | Read; amendments match their approved scopes |
| Manifest | `tasks.md`, sixteen handoffs (`done/` T01–T09, `codereview_01/done/` T10–T13, `codereview_02/done/` T14–T16) | Read; all links resolve, states complete |
| Corrections | `codereview_01/`, `codereview_02/` reports and their `done/task_*.md` handoffs | Read; both histories preserved |
| Implementation | Base, worktree, built assets, source and tests named below | Delimited; includes untracked source and tests |

## Coverage matrix

`C` means conformant; `P` means pending repeatable validation. Unchanged rows retain prior evidence where source and contract did not change; every row touched by correction rounds 1–2 was re-checked against current code and tests.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Create both state files | `commands/plan.ts:47-60` | TC-01 | C | Built CLI and store tests |
| RF2 | Refuse overwrite without confirmation | `commands/plan.ts:52-57`, `confirmation.ts:11-21` | TC-02 | C | Existing files remain byte-identical |
| RF3 | Example step and validation command | `plan-scaffold.ts:20-29` | TC-01 | C | Scaffold assertion |
| RF4 | Plan fields and statuses | `contracts/task-plan.ts:16-23` | TC-03 | C | Strict validator tests |
| RF5 | Checkpoint Git and memory fields | `contracts/state-checkpoint.ts:19-41` | TC-16 | C | Strict validator tests |
| RF6 | Publish versioned schemas | `generate-schemas.ts`, `check-package.ts:22-23` | TC-18 | C | Schema currency and package smoke pass (355 packaged files) |
| RF7 | Validate files and consistency | `validation/*-validator.ts`, `task-plan.ts:48-55` | TC-03 | C | Unique ids, one `IN_PROGRESS`, active step present |
| RF8 | Earlier-version migration message | `validation/issues.ts:24-28` | TC-16 | C | Version mismatch names the version 1 migration |
| RF9 | Deliver boot on documented channels | `brake-engine.ts:71-84`, `boot-summary.ts:46-64`, harness adapters | TC-05 | C | Six startup channels and four compaction channels green in two full runs this session |
| RF10 | Suppress inactive or complete boot | `boot-policy.ts:26,35` | TC-06 | C | Missing and completed state skip inspection |
| RF11 | Invalid state yields repair instruction only | `boot-policy.ts:19-44` | TC-04 | C | Invalid content withheld; secret sentinels absent |
| RF12 | Budget and retained constraints | `boot-summary.ts:70-86` | TC-07, TC-08 | C | Files, then older decisions, never constraints; checkpoint pointer |
| RF13 | Protocol boot routine | `protocol-service.ts:41-47` | TC-13 | C | Six-step routine; packaged file byte-equal |
| RF14 | Compare commit, history, and tree | `git-inspector.ts`, `git-divergence.ts:6-23`, `boot-reader.ts:32-36` | TC-09, TC-10 | C | Built hook names dirty and outside-history states |
| RF15 | Validate before editing | `boot-summary.ts:35-39` | TC-11 | C | Simulated first call validates (nuance in limitations) |
| RF16 | Report omitted Git checks | `git-divergence.ts:8-10`, `boot-reader.ts:39-46` | TC-12 | C | Built hook reports `git_missing` and `not_repository` omissions |
| RF17 | Red-zone state and commit instruction | `zone-actions.ts:13,28-34` | TC-14, TC-17 | C | Protocol row instructs the `checkpoint:` commit; state files stay gitignored and out of commits (CA-17) |
| RF18 | Switch off commit instruction | `zone-actions.ts:28-34` | TC-14 | C | Protocol red row drops the sentence (residual in the telemetry compact action: RV-03) |
| RF19 | Text status and validity | `plan-status.ts`, `output/text.ts:68-89` | TC-15 | C | CLI status tests |
| RF20 | JSON status parity | `diagnostics.ts:38-42`, `commands/plan.ts:79-86` | TC-15 | C | Same report object; `planStatusReportSchema.safeParse` asserted (published JSON Schema artifact gap: RV-04) |
| CA-01, CA-02 | Init and overwrite scenarios | `commands/plan.ts` | TC-01, TC-02 | C | CLI e2e |
| CA-03 | Two active steps rejected | `task-plan.ts:51` | TC-03 | C | Rule name asserted |
| CA-04 | Bad checkpoint withheld | `boot-policy.ts`, `boot-reader.ts` | TC-04 | C | Only `Repair <file>:` instruction; no state content |
| CA-05 | Delivery on supported startup and compaction channels | Harness adapters, `brake-engine.ts:26,75` | TC-05 | C | All six startup; compaction on the four documented channels; Cursor/Copilot asserted silent |
| CA-06 | Suppression for completed plan | `boot-policy.ts:35` | TC-06 | C | Completed plan silent through the built hook |
| CA-07, CA-08 | Constraints and 1,000-token fixture | `boot-summary.ts` | TC-07, TC-08 | C | `js-tiktoken` fixture ≤ 1,000 tokens with 20 constraints intact |
| CA-09 | Outside-history commits named | Inspector, comparison, reader | TC-09 | C | Built hook names recorded and current commits |
| CA-10 | Dirty tree named | Inspector, comparison, reader | TC-10 | C | Built hook names pending changes |
| CA-11 | Validation within three calls before edit | `e2e-simulated-boot.test.ts:75-90` | TC-11 | C | First recorded call validates, before edit (modeling note in limitations) |
| CA-12 | No-Git omission named | Inspector, comparison, reader | TC-12 | C | Built hook `git_missing` and `not_repository` cases |
| CA-13 | Protocol fallback | `protocol-service.ts` | TC-13 | C | Integration test |
| CA-14 | Conditional checkpoint commit | `zone-actions.ts:28-34` | TC-14 | C | Switch-on and switch-off assertions (residual: RV-03) |
| CA-15 | Five-step JSON status | CLI status | TC-15 | C | CLI e2e |
| CA-16 | Migration message | Validators | TC-16 | C | Unit test |
| CA-17 | Twenty sessions per full harness leave clean tree | Long-task simulator | TC-17 | C | Unconditional empty `git status --porcelain`; checkpoint and commit asserted |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `sdd-review-code` independence | OK | Separate session; this session wrote only the report and flow state |
| `code-standards.md` and TypeScript rules | OK with reservation | lint/typecheck pass; two trivial style hits in the feature's diff (RV-02: `tests/unit/brake-engine-boot.test.ts:62`, `src/cli/commands/plan.ts:81`) |
| `node.md` and `harness-adapters.md` | OK with reservation | `NodeProcessRunner` argument arrays and timeouts only (`DEC-EX-CR01` intact); documented channels only; one deadline edge outside the documented channel set (RV-05) |
| `file-changes.md` and `cli-output.md` | OK with reservation | Atomic temp+rename stores, `--yes` confirmation parity, text/JSON parity; `plan status`/`plan init` JSON lack a generated `schemas/` artifact (RV-04) |
| Manifest and task integrity | OK | T01–T16 present in their claimed folders; all links resolve; every Work box checked; handoffs and T14 reopenings complete |
| Mandatory full validation | OK | `npm test` 173/966 and `npm run coverage` 173/966 at 93.55% statements, both green in this session |

## Quality profile

The TechSpec QA-01–QA-08 searches ran over `src/`, `scripts/`, and `tests/` with `rg`, then every hit was compared against `86961bb` (`git diff` added lines plus new-file hits) and subtracted against the Terrain baseline. Scope is wider than the changed-file requirement.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg ':\s*any\b|\bas any\b|<any>'` | 0 | OK |
| QA-02 | Core importing infrastructure or CLI | blocking | `rg "from '(\.\./)+(infrastructure\|cli)/" src/core` | 0 | OK |
| QA-03 | Sync APIs in in-process adapters | blocking | `rg '\b(readFileSync\|writeFileSync\|existsSync\|spawnSync)\b' src/infrastructure` | 0 | OK |
| QA-04 | Shell execution APIs | blocking | `rg '\bexecSync\(\|\bexec\(\|shell:\s*true'` | 1, pre-existing | pre-existing `version-service.ts:30` RegExp `.exec()`; file untouched |
| QA-05 | Empty `catch` | blocking | `rg -U 'catch\s*(\([^)]*\))?\s*\{\s*\}'` | 0 | OK |
| QA-06 | Generic `throw new Error(` | reservation | `rg 'throw new Error\('` | 1 introduced of 28 | RV-02; 27 hits pre-existing (tracked-diff comparison shows zero added lines) |
| QA-07 | File above 100 physical lines | reservation | `rg -c '^'` | 1 introduced of 3 | RV-01 (`e2e-simulated-long-task.test.ts` 91→103); `e2e-brake.test.ts` 105→106 and `instruction-service.ts` 103 pre-exist at base |
| QA-08 | Clock or randomness in core | reservation | `rg 'Date\.now\(\)\|new Date\(\)' src/core` | 0 | OK (CLI timestamps use the `now` injection point) |

- Terrain baseline: applied from `techspec.md#Terrain baseline` at `86961bb`.
- Hits discounted by baseline: 30 (QA-04: 1, QA-06: 27, QA-07: 2).
- Reservations accumulated in the feature: 2 profile reservation hits (RV-01, RV-02).
- Suggested escalation: no trigger fired; 2 reservation hits (below 8), largest touched file `git-inspector.ts` at 96 lines (below 200), and no block duplicated in three places (`issues.ts` extraction, T01 handoff).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01–DEC-08, DEC-10–DEC-15 | YES | Engine boot decision, adapter gates, excluded harnesses, tolerant reader, validation errors, schema versioning, budget order, commit switch, `plan status` report, `--yes` refusal, extracted parser |
| DEC-09 / CMP-16 | YES | `NodeBootReader` calls `NodeGitInspector` for valid active state under `DEC-EX-CR01`; `plan status` uses the same inspector |
| `DEC-EX-CR01` process boundary | YES | `NodeProcessRunner` with argument arrays and timeouts is the only process path; bundle guard unchanged |
| `DEC-EX-T05` documented-channel matrix | YES | Six startup channels; compaction reinjection only for Claude Code, Codex CLI, Pi, Oh-My-Pi; Cursor/Copilot asserted silent on `preCompact` |
| `DEC-EX-T14` safe omission | YES | `failure-policy.ts:55,71-73` emits one omission (`boot-summary.ts:88-90`, zero state content) only for `session_reset` + `DEADLINE_EXCEEDED` + `session_boot` supported; 1500 ms deadline retained (`process-hook-host.ts:31`); compaction-deadline edge recorded as RV-05 |
| `DEC-EX-T14B` boot Git budget | YES | `runtime-composition.ts:18,58-64` wires `BOOT_GIT_BUDGET_MS` (1000 ms) only into the boot path; `git-inspector.ts:27-36,59-66,83-95` races and clamps every command (discovery included) and degrades to `checks_omitted`; `plan.ts:78` keeps the unbounded inspector |
| TC-01–TC-18 | YES | All expected results proven in this session's full runs; TC-06's file cell is stale (`tests/integration/boot-summary.test.ts` does not exist; its results live in `tests/unit/boot-summary.test.ts:82-99` and `tests/integration/boot-delivery.test.ts:63-69`) |
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

## Executed validations

- Profile and scope: Windows 11 / Node 24, built CLI and runtime hooks, unit/integration/e2e suites and temporary fixture repositories. Cross-platform matrix remains the accepted evidence limit.
- Validated state: current worktree over `91b4e68` (uncommitted implementation and correction work), built runtime assets, git available.
- Reused evidence: unchanged obligations from `codereview_01`/`codereview_02` and task handoffs; every corrected obligation was rechecked against current code and re-executed below.
- Manual acceptance: CLI QA follows this review under the `DEC-HIL-02` authorization; real Pi/Oh-My-Pi captures and the Linux/macOS/Node 20/22 matrix remain accepted evidence limits.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | Passed | Built CLI and runtime assets |
| `npm run lint` | Passed | Code style |
| `npm run typecheck` | Passed | Contracts |
| `npm run schemas:check` | Passed | RF6 |
| `npm run dependencies:check` | Passed | Dependency policy (3 runtime packages, no install scripts) |
| `npm run package:smoke` | Passed; 355 packaged files | TC-18 |
| `npm test` | Passed; 173 files / 966 tests (334 s) | Full suite, TC-01–TC-17 |
| `npm run coverage` | Passed; 173 files / 966 tests, 93.55% statements / 87.21% branches / 95.44% functions | Mandatory full validation gate, 80% coverage rule |
| `git diff --check` | Passed | `codereview_01/CR-04` hygiene |

## Findings

No blocking findings. Optional improvements only:

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| RV-01 | Low, optional | QA-07 (`codereview_02/RV-01`, persistent) | `tests/e2e/e2e-simulated-long-task.test.ts:103` — 103 physical lines (91 at base) | File exceeds the 100-line rule; no behavior or test failure | Extract a cohesive helper or shorten the fixture setup without weakening TC-17 |
| RV-02 | Low, optional | QA-06 | `tests/unit/brake-engine-boot.test.ts:62` — `throw new Error('disk read failed')` in a new file; second trivial style hit at `src/cli/commands/plan.ts:81` (blank line inside `runPlanStatus`) | Style-rule hits in the feature diff; the test-double idiom matches `brake-engine-lifecycle.test.ts:24`; no behavior effect | Use the established test-double pattern without a generic throw (or record justification), and remove the blank line |
| RV-03 | Low, optional | RF18 broad reading; `cli-output.md` | `zone-actions.ts:13` RED `compact` text still says `commit if validation passes` when `instructCheckpointCommit` is false; `zoneRedClause` (`:28-34`) alone honors the switch | A user disabling the commit instruction still sees a commit recommendation in the telemetry block's RED action | Thread the switch into the RED compact text (or drop its commit clause) so one configuration value controls every commit instruction |
| RV-04 | Low, optional | RF6/RF20 convention; `cli-output.md:13` published-schema rule | `diagnostics.ts:38-42` `planStatusReportSchema` and `plan.ts:18-26` `PlanInitResult` validate in tests, but `generate-schemas.ts:8-14`, `check-package.ts:17-34`, and `schemas/` publish no JSON Schema for them (unlike `doctor-report`, `install-report`) | External consumers have no published schema artifact for `plan status --json` / `plan init --json` | Add both outputs to the schema generation, currency check, and package gate |
| RV-05 | Low, optional | `DEC-EX-T14` edge; `harness-adapters.md` | `failure-policy.ts:55` keys on `session_reset` generally, so a compaction deadline on Copilot's `preCompact` (`runtime.ts:48`, ungated `renderDecision:61`) renders the omission into an output the vendor does not process | One context emission outside the documented channel set on a rare failure path; no state content leaks | Gate the omission branch to reset contexts that carry boot delivery, and add a built-hook SessionStart deadline test |
| RV-06 | Low, optional | Regression coverage for `DEC-EX-T14B`/`DEC-EX-T14` | No test asserts `runtime-composition.ts:58-64` wires `BOOT_GIT_BUDGET_MS`, that `plan.ts:78` stays unbounded, or the built-hook SessionStart deadline omission end to end | A wiring regression could silently drop the budget or the omission | Add three focused assertions over composition wiring, `plan status` inspection, and the built-hook deadline path |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| `codereview_01/CR-01` boot git comparison missing | resolved | `boot-reader.ts:32-46` inspects Git for valid active state; `tests/integration/boot-git-delivery.test.ts` covers dirty, outside-history, missing, no-git, and non-repository cases |
| `codereview_01/CR-02` stale T09 link | resolved | `tasks.md:64` links `done/task_09.md`; all sixteen handoff links resolve (independent check this session) |
| `codereview_01/CR-03` dirty-tree profile gap | resolved | Failure profile restores the exact config; final empty `git status --porcelain` assertion is unconditional (CA-17 row) |
| `codereview_01/CR-04` EOF blank lines | resolved | `git diff --check` passed this session |
| `codereview_02/CR-01` full-suite gate not repeatably green (three distinct flakes; RF9/CA-05 pending) | resolved | Each family now has a proven cause and a correction: deadline race → `DEC-EX-T14` safe omission plus `DEC-EX-T14B` boot Git sub-budget (T14.4–T14.6); all-or-nothing sampling with bare `catch` → classified failures and 3 bounded retries (T15); decoupled measurement windows → interleaved pairs (T16). The mandatory gate passed twice in this independent session (`npm test` 173/966; `npm run coverage` 173/966 at 93.55%) and in three serialized authoring-session runs; RF9/CA-05 startup delivery green in all runs |
| `codereview_02/RV-01` long-task test length | persistent | Still 103 physical lines; carried forward unchanged as RV-01 |

## Limitations and open items

- Local validation is Windows / Node 24. The Linux/macOS and Node 20/22 matrix has not run; HIL 1 accepted this evidence limit.
- Pi and Oh-My-Pi boot delivery uses documented fixtures without a local real installation; HIL 1 accepted the simulation approach.
- CA-11's "uses only the boot content" is modeled by a static simulated script plus ordering assertions; structural prohibition of file reads is not enforced (PRD "Verificação por simulação").
- RF15 nuance: when the active step exists with `validationCommand: null`, `boot-summary.ts:36-38` emits the generic validate-first line instead of falling back to the last completed step's command; the PRD edge is handled but the fallback reading is debatable.
- TC-06's file cell in `techspec.md:117` points to a file that does not exist; its expected result is proven in `tests/unit/boot-summary.test.ts` and `tests/integration/boot-delivery.test.ts`.
- The interactive-TTY decline path of `plan init` returns exit 0 with no message and is untested (`plan.ts:57`); non-TTY and `--yes` paths are covered.
- Published JSON Schemas cannot express RF7's consistency rules (unique ids, one `IN_PROGRESS`, active step present); external consumers validating with the JSON Schema alone accept plans the strict validator rejects. Enforced at every internal use.
- Suite behavior under load remains a documented characteristic (correction-round learnings): one run in three may hit a single-case load-sensitive timeout that passes in isolation; both full runs this session were green without flakes.
- CLI QA has not run; HIL 2 authorized it after an approved review.

## Conclusion

All twenty RF and seventeen CA obligations are conformant against the approved contracts, all sixteen tasks are complete with reconciled handoffs and intact links, and the mandatory full validation gate passes repeatably in this independent session. The prior blocking finding `codereview_02/CR-01` is resolved: each failure family now has a proven cause and an implemented correction, and the boot delivery criterion RF9/CA-05 is green in every full run since. Two profile reservation hits and four optional improvements (RV-01–RV-06) remain, none touching an essential requirement, security, or validation. This report is **APPROVED WITH RESERVATIONS**; the reservations gate decides whether to correct the chosen items or finalize with them recorded as accepted open items.
