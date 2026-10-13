# Code review report — 19-skills-name-and-invocation

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `7295a433a4f1f79430b0c5281cb46ab8495b6db6..uncommitted worktree` (84 paths in `git status --porcelain`, new files included; HEAD still `7295a43`)
- Previous review: `tasks/prd-19-skills-name-and-invocation/codereview_02/codereview.md`

Reason for the status: the correction of the QA finding BUG-01 (FR-02 flag error without flag or file name) is in place and verified by running the built CLI. Every obligation is conformant, all gates are green, and no blocking quality profile rule has a hit. Only Low optional improvements remain (four carried from earlier reviews, accepted by AUTO-11/AUTO-12, and one new one about the wizard wording).

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-19-skills-name-and-invocation/prd.md` | read |
| TechSpec | `tasks/prd-19-skills-name-and-invocation/techspec.md` | read (quality profile QA-01..QA-07 and Terrain baseline present) |
| Manifest | `tasks/prd-19-skills-name-and-invocation/tasks.md` | read (T01-T05 `[x]`, all in `done/`) |
| Previous review | `codereview_02/codereview.md` | read |
| Corrections since it | `qa_01/qa.md` (BUG-01), `qa_01/done/task_01.md` (Handoff); earlier: `codereview_01/done/` listed, covered by `codereview_02` | read |
| Decisions | `autonomous-decisions.md` (AUTO-11..AUTO-13), `workflow.md` (R-01..R-05) | read |
| Snapshot | `context-snapshot.md` | header, next step brief and open threads relied on (independent-stage filter); it predates the reviews and corrections, so no entry was used to judge; state re-derived from sources. Note: I read the file whole (it is under 8 KiB) but did not rely on Decisions, Learnings, or Code map |
| Implementation | uncommitted diff against `7295a43` plus untracked files (74 `.ts` files outside `tasks/`, schemas, README, docs, `AGENTS.md`, one SDD reference) | delimited |

Files newer than `qa_01/qa.md` (the state reviewed by `codereview_02` and QA) are only `src/core/services/snapshot-merge.ts`, `tests/integration/init-snapshot.test.ts`, and SDD artifacts (checkpoint, workflow, decisions, `qa_01/done/task_01.md`); `schemas/*.json` carry a newer mtime from the build with unchanged content (`schemas:check` passes). So the delta to judge is the BUG-01 correction; the rest was re-confirmed by the full gates on the current worktree.

## Coverage matrix

Only the rows touched by the correction were re-derived in depth; the others are re-confirmed by the unchanged code (see above) and the full suite with coverage on the current worktree.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Name rule `^[a-z0-9]+(-[a-z0-9]+)*$`, 64, optional `plugin:` prefix | `src/core/contracts/skill-name.ts` | `tests/unit/skill-name.test.ts`, `configuration-snapshot.test.ts` | conformant | coverage run green; file unchanged since `codereview_02` |
| FR-02 | Old format rejected with a message that says what happened, which file or flag, and the fix | `src/core/services/snapshot-merge.ts:14-16,26-29` (`FLAG_BY_FIELD`, suffix ` Set it with <flag> or in context-brake.config.json.`) | `tests/integration/init-snapshot.test.ts` (new cases for `--snapshot-command /sdd-snapshot` and `--resume-command $resume`), `snapshot-merge.test.ts`, `assistant-questions-invalid.test.ts` | conformant (was wording gap) | built CLI by hand: `init --yes --harness claude-code --snapshot-command /sdd-snapshot` prints `Invalid snapshot option: snapshot.command "/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot. Set it with --snapshot-command <skill> or in context-brake.config.json.`, exit 64, directory still holds only `.git`; `$x` for `--resume-command` names `--resume-command <skill>` and `x` |
| FR-03 | Per-harness form in zone action and resume text | `zone-guidance.ts`, eight `skill-invocation.ts`, eight `runtime.ts`, `brake-engine.ts`, `session-reset-handler.ts`, `failure-policy.ts` | `tests/integration/skill-invocations.test.ts`, `zone-guidance.test.ts`, `tests/e2e/e2e-init.test.ts` | conformant | unchanged; QA proved RED, CRITICAL, and resume text through the built hooks for five harnesses |
| FR-04 | Unknown formatter yields the sentence | `zone-guidance.ts` default, `failure-policy.ts` | `zone-guidance.test.ts`, `failure-policy-snapshot-reset.test.ts` | conformant | no sigil fallback |
| FR-05 | Flags take bare names, replay equal | `snapshot-merge.ts`, `questions-snapshot.ts` | `init-snapshot.test.ts`, `init-assistant-equivalence.test.ts`, `e2e-init.test.ts` | conformant | coverage run green; replay tests pass with the longer error suffix (suffix is on the error path only) |
| FR-06 | Wizard says "skill name", validates, shows per-harness form | `snapshot-specs.ts`, `questions-snapshot.ts`, `invocation-facts.ts`, `summary-rows.ts` | `assistant-questions-invalid.test.ts`, `assistant-questions.test.ts` | conformant | the re-ask uses `mergeSnapshot`'s message, which now carries the flag suffix (see CR-01 below) |
| FR-07 | Bare name printed; doctor text and JSON carry forms | `doctor-report-extras.ts`, `diagnostics.ts`, `doctor-mode-text.ts` | `doctor-report-extras.test.ts`, `doctor-mode-text.test.ts`, `doctor-light-mode.test.ts` | conformant | suite green; QA ran it on the built CLI |
| FR-08 | Repo config, README, `AGENTS.md`, SDD references, schemas use the bare name | `context-brake.config.json`, `README.md`, `AGENTS.md`, `autonomous-mode.md`, `schemas/` | TC-09 | conformant | `git grep --untracked -nE '"/sdd-(snapshot\|orchestrate-flow)"\|command "/sdd-'` outside `tasks/`, `tests/`: no hit; `schemas:check` passes |
| FR-09 | Skills entry in each of 8 harness sections | `docs/research/harness-integrations.md` | TC-10 | conformant | unchanged since `codereview_02` |
| NFR-01 | Syntax in the harness folder, no id branching in guidance | `core/services/skill-invocation.ts`, `harnesses/skill-invocations.ts` | `zone-guidance.test.ts` (fake format), QA-07 | conformant | QA-07 printed nothing |
| NFR-02 | 60-token block budget | `telemetry-block-budget.test.ts` | itself | conformant | suite green |
| NFR-03 | Platforms | no shell or path code added; the correction adds only a string constant | review | conformant | Windows only run (limitation) |
| NFR-04 | Errors without stack trace, with the fix | `snapshot-merge.ts`; `InvalidConfigurationError` path unchanged | `init-snapshot.test.ts`, QA scenarios | conformant | built CLI output above has no stack trace; the config-file route names the file and was proven by QA (`doctor` against a stored old-format value) |
| NFR-05 | Schemas regenerated, `schemas:check` passes | `schemas/context-brake.config.schema.json`, `doctor-report.schema.json` | `skill-name.test.ts`, `npm run schemas:check` | conformant | passed here after `npm run build` |
| OBJ-03 | Old format fails in `init`, `doctor`, hooks | shared `snapshotSchema` | schema, merge, wizard, flag tests | conformant | proven end to end by QA; no automated test loads a stored old-format file through `doctor` or a hook (CR-02 below) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100 lines, no comments, 30-line functions, 3 params) | OK | `snapshot-merge.ts` 37 lines, no comments, `mergeSnapshot` stays under 30 lines; lint clean; one aggravated test file (CR-04) |
| `javascript-typescript.md` | OK | QA-01 and QA-02 empty |
| `harness-adapters.md` / AGENTS.md architecture | OK | QA-03 empty; the new constant is in `core/services`, flag names are CLI vocabulary inside a core message already used by the wizard (no harness id) |
| `cli-output.md` | OK | message states what happened, the offending key, the fix, and where to set it; exit 64; nothing written |
| `tests.md` | OK | new cases cite `prd-19`/FR via the existing describe titles; in-process plus the run helper; the e2e budget held (coverage run 103.6 s) |
| `file-changes.md` | N/A | no user-file writing code added |
| AGENTS.md "never edit instruction files" | OK | docs edits are repository docs |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | rg `:\s*any\b\|\bas any\b\|<any>` over the 74 changed/new `.ts` files outside `tasks/` | 0 | OK |
| QA-02 | `@ts-ignore`, `eslint-disable` | blocking | rg over the same files | 0 | OK |
| QA-03 | core importing infrastructure/cli | blocking | rg over changed `src/core` files | 0 | OK |
| QA-04 | `throw new Error(` | reservation | rg over the same files | 2 of 2, both in tests (`brake-engine-lifecycle.test.ts:27`, `process-hook-host.test.ts:62`), in lines not added by this feature | pre-existing |
| QA-05 | 4+ parameters | reservation | rg PCRE over the same files | 8 matches: two `recordBoot` signatures with a 3-parameter declaration (`pi/runtime.ts:52`, `oh-my-pi/runtime.ts:52`), destructured `it.each` callbacks, a tuple type in `summary-rows.ts:24`; none is a declaration with 4 parameters | OK (false positives) |
| QA-06 | File above 100 lines | reservation | `rg -c` + awk | 1 of 1: `tests/unit/assistant-output.test.ts` 104 lines (101 at base) | aggravated (CR-04, persistent) |
| QA-07 | Harness id in core guidance | blocking | rg on `zone-guidance.ts`, `skill-invocation.ts` | 0 | OK |

- Terrain baseline: applied from TechSpec (the test file above 100 lines is outside the baseline table; measured at `7295a43` in `codereview_01`). The correction files measure `snapshot-merge.ts` 37 lines (was 33), `init-snapshot.test.ts` 48 lines
- Hits discounted by baseline: 2 (QA-04) plus 8 QA-05 false positives
- Reservations accumulated in the feature: 1 (QA-06) plus the optional improvements CR-01 to CR-03
- Suggested escalation: no trigger fired (fewer than 8 reservations, no touched file above 200 lines, no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 `skillNameSchema` in its own file, sigil message | YES | `skill-name.ts`; `configuration.ts` has no new export |
| DEC-02 formats in core, default sentence | YES | `core/services/skill-invocation.ts` |
| DEC-03 required `RuntimeDescriptor.skillInvocation` | YES | eight descriptors; identity test in `skill-invocations.test.ts` |
| DEC-04 exhaustive `Record<HarnessId,...>` resolver | YES | `skill-invocations.ts` |
| DEC-05 `zoneAction(zone, snapshot, options)`, 3 params | YES | `zone-guidance.ts` |
| DEC-06 `snapshot.invocations` for active harnesses | YES | `doctor-report-extras.ts`, `diagnostics.ts` |
| DEC-07 flags validated by `snapshotSchema` through `mergeSnapshot`, sigil message for the flags too, "skill name" prompts, preview | PARTIAL | flag validation YES and now names the flag and the file; the per-harness preview sits in the summary card (AUTO-09, recorded decision) |
| DEC-08 repo config and docs changed last | PARTIAL | done; installed hook assets not refreshed (AUTO-10, open thread O-02), `doctor` reports `ASSET_OUTDATED` as a warning |
| DEC-09 research doc entries | YES | eight entries |
| Contract: config schema `pattern` and `maxLength` | YES | `schemas/context-brake.config.schema.json`; `schemas:check` passes |
| Contract: `doctor` keeps `schemaVersion` 1, additive optional field | YES | `diagnostics.ts` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | schema, formats, fixtures |
| T02 | `done/task_02.md` | COMPLETE | descriptor field, eight forms, guidance |
| T03 | `done/task_03.md` | COMPLETE | doctor JSON and text |
| T04 | `done/task_04.md` | COMPLETE | wizard and summary |
| T05 | `done/task_05.md` | COMPLETE | TC-09 empty; schemas current |
| Corrections of `codereview_01` (CR-01, CR-02) | `codereview_01/done/task_01.md`, `task_02.md` | COMPLETE | verified in `codereview_02`; files unchanged since |
| Correction of QA BUG-01 | `qa_01/done/task_01.md` | COMPLETE | verified here: `snapshot-merge.ts` change (+5/-1 lines), two new rejection cases in `init-snapshot.test.ts`, built CLI output; the handoff's claims (37 lines, suffix text, flags per field) match the code |

## Executed validations

- Profile and scope: Node v24.20.0 on Windows 11, Git Bash; CLI plus hooks; in-process tests plus the e2e smoke set; Linux, macOS, and Node 20 not run.
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted diff as of this review (84 paths in `git status --porcelain`, 65 modified, 19 untracked entries; identical before and after my commands); `npm run build` ran here first, so `dist/` is current for the e2e and process tests.
- Reused evidence: QA's end-to-end runs of the five process-hook harnesses, the stored-old-format `doctor` run, and the eight-harness `doctor` output (`qa_01/evidence/`) stay valid because the only code changed since is the error suffix in `mergeSnapshot` (error path of `init`/wizard). The `test:budget` figure was not run as the script; the coverage run took 103.6 s wall, inside the 180 s budget.
- Manual acceptance: none required. By hand (isolated HOME, empty git repos): `init --yes --harness claude-code --snapshot-command /sdd-snapshot` -> exit 64, message above, nothing written; `--snapshot-command sdd-snapshot --resume-command '$x'` -> `snapshot.resumeCommand "$x" is not a skill name; use the bare name x. Set it with --resume-command <skill> or in context-brake.config.json.`; `--resume-command ok` alone -> `snapshot.resumeCommand requires snapshot.command. Set it with --resume-command <skill> or in context-brake.config.json.`; `--snapshot-trigger BLUE` -> message names `--snapshot-trigger <YELLOW|RED>`. (The first attempt showed a mangled path only because Git Bash rewrote the `/sdd-snapshot` argument into a Windows path; rerun with `MSYS_NO_PATHCONV=1` is the result quoted.)

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | assets, built CLI |
| `npm run lint` | passed | code-standards, QA-02 |
| `npm run typecheck` | passed | all code |
| `npm run schemas:check` | passed | NFR-05 |
| `npm run dependencies:check` | passed (9 packages, no install scripts) | supply chain |
| `npm run coverage` | passed: 258 files, 1342 tests, 95.99% statements, 92.97% branches, 103.6 s | FR-01..FR-07, NFR-01, NFR-02, TC-01..TC-08, TC-11..TC-13 |
| `npm run package:smoke` | passed | package contents, built CLI help |
| TC-09 `git grep --untracked -nE '"/sdd-(snapshot\|orchestrate-flow)"\|command "/sdd-'` outside `tasks/`, `tests/` | no hit | FR-08 |
| QA-01..QA-07 commands | see quality profile | profile |
| Built-CLI `init` rejection runs (four, above) | as expected | FR-02, NFR-04, BUG-01 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | FR-06, NFR-04 (new, optional) | `src/cli/assistant/questions-snapshot.ts:13-16` returns `mergeSnapshot`'s error as the re-ask text, so a wizard user who types `/sdd-snapshot` also reads `Set it with --snapshot-command <skill> or in context-brake.config.json.`; for `--resume-command ok` alone the suffix points to the resume flag although the cause is the missing `snapshot.command` (observed output above) | Cosmetic: in the wizard the flag advice is not actionable, and for the "requires command" case the pointed flag is not the missing piece. The bare name and the rule are still shown | Optional: strip the suffix in the wizard path, or have `mergeSnapshot` return the rule and the setting hint separately. No test asserts the wizard's full text beyond `toContain` of the rule, so a change is safe |
| CR-02 | Low | OBJ-03, TC-02 (carried: `codereview_02/CR-02`) | no automated test loads a stored `context-brake.config.json` with `/sdd-snapshot` through `doctor` or a hook | The claim rests on the shared loader; QA proved it end to end on the built CLI (`qa_01/evidence/s3-old-format-stored-config.json`) | Optional: one doctor integration case |
| CR-03 | Low | FR-03 acceptance (carried: `codereview_02/CR-03`) | `tests/integration/skill-invocations.test.ts` asserts the exact form per harness and the descriptor identity; exact RED/CRITICAL/resume text is asserted with the standard formats in `zone-guidance.test.ts` | The PRD wording "one test per harness asserts the exact text at RED and CRITICAL and for the resume text" is met by composition; QA covered five harnesses end to end | Optional: extend the per-harness `it.each` with `zoneAction` and `resumeText` through each descriptor |
| CR-04 | Low | QA-06 (carried: `codereview_02/CR-04`) | `tests/unit/assistant-output.test.ts` is 104 lines (101 at `7295a43`) | Reservation aggravated by 3 lines | Optional: move the new invocation rows to a second test file |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_02/CR-01 (flag and file missing from the merge error; = `qa_01/BUG-01`) | resolved | `snapshot-merge.ts:14,26-29`; `init-snapshot.test.ts` new cases at the two flag-rejection rows; built CLI output quotes `--snapshot-command <skill>` and `context-brake.config.json` with the bare name; exit 64; nothing written |
| codereview_02/CR-02 (no stored-config doctor test) | persistent | now CR-02 above; optional, accepted (AUTO-11/AUTO-12) |
| codereview_02/CR-03 (per-harness exact text) | persistent | now CR-03 above; optional, accepted |
| codereview_02/CR-04 (`assistant-output.test.ts` 104 lines) | persistent | now CR-04 above; optional, accepted |
| codereview_01/CR-01, CR-02 | resolved | already verified in `codereview_02`; README and schema files unchanged since (no newer mtimes, `schemas:check` passes) |

## Limitations and open items

- Linux, macOS, and Node 20 were not run; Windows with Git Bash (and the built CLI from Git Bash) only. The correction adds a string constant and no platform-specific code. Argument rewriting of a leading `/` by MSYS on Windows is a shell artifact, not a product behavior.
- `context-brake init` was not run against this repository (contract); the `init` runs above were in temporary empty git repositories with an isolated `HOME`/`USERPROFILE`, and the first rejection attempt wrote nothing.
- `doctor` in this repository reports `ASSET_OUTDATED` for `.claude/hooks/context-brake.mjs` and the mod `register.mjs` (AUTO-10, snapshot O-02): the installed hook script is the previous bundle. Warning only; the decision is the user's.
- `npm run test:budget` was not run as its own script (coverage wall time 103.6 s is inside the 180 s budget).
- The path count in `git status --porcelain` is 84 here against 83 recorded by earlier reviews; the only source files newer than `qa_01/qa.md` are the two files of the BUG-01 correction (both already modified at that point), so I attribute the difference to SDD artifact folders and the count method rather than to unreviewed code. Could not be confirmed against the earlier listing.
- The context snapshot predates the reviews and corrections and was not used to judge; `authored_code: yes` confirms the author could not review.
- Other SDD artifacts (`tasks/prd-20-skills-wizard-discovery/`, `tasks/triage-log.jsonl`) appear as worktree changes and are outside this review.
- Ran `npm run coverage` twice by mistake (the first output was truncated by a pipe); both runs passed and leave only the ignored `coverage/` output.

## Conclusion

The QA finding BUG-01 is corrected and verified on the built CLI: the `init` flag error now names the flag (`--snapshot-command <skill>`, `--resume-command <skill>`, `--snapshot-trigger <YELLOW|RED>`), the config file, the offending key, and the bare name, exits 64, and writes nothing; the integration tests assert it. Build, lint, typecheck, schema currency, dependency scripts, package smoke, and the full suite with coverage (258 files, 1342 tests, 95.99%) pass; TC-09 is empty; no blocking profile rule has a hit and no architecture rule is broken. Every PRD and TechSpec obligation is conformant, so the status is APPROVED WITH RESERVATIONS, carrying four Low optional improvements: one new wizard-wording item (CR-01) and three accepted from earlier rounds (CR-02 to CR-04).
