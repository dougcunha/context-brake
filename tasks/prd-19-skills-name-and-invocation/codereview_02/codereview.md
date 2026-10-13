# Code review report — 19-skills-name-and-invocation

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `7295a433a4f1f79430b0c5281cb46ab8495b6db6..uncommitted worktree` (83 changed paths, new files included; HEAD still `7295a43`)
- Previous review: `tasks/prd-19-skills-name-and-invocation/codereview_01/codereview.md`

Reason for the status: the one block of the previous review (CR-01, README option table) and the unmet TechSpec contract (CR-02, schema `pattern`/`maxLength`) are resolved and verified. Every obligation is conformant, all gates are green, and no blocking quality profile rule has a hit. Only optional improvements remain (CR-03 to CR-06 of the previous review, accepted as open items by AUTO-11).

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-19-skills-name-and-invocation/prd.md` | read |
| TechSpec | `tasks/prd-19-skills-name-and-invocation/techspec.md` | read |
| Manifest | `tasks/prd-19-skills-name-and-invocation/tasks.md` | read (T01-T05 `[x]`, all in `done/`) |
| Previous review and corrections | `codereview_01/codereview.md`, `codereview_01/done/task_01.md`, `task_02.md` (Handoff sections) | read |
| Decisions | `autonomous-decisions.md` (AUTO-01..AUTO-11), `workflow.md` (R-01..R-03), `checkpoint.json` | read |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads O-01/O-02); it predates review 1 and the corrections, so entries were not relied on; state was re-derived from sources |
| Implementation | uncommitted diff against `7295a43` plus untracked files (73 `.ts` files outside `tasks/`, schemas, README, docs, `AGENTS.md`, `context-brake.config.json`, one SDD reference) | delimited |

## Coverage matrix

Only the rows touched by the corrections were re-derived in depth; the other rows were re-confirmed through the unchanged gates (full suite with coverage, lint, typecheck, schemas, TC-09) on the current worktree and the evidence of `codereview_01`.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Name rule `^[a-z0-9]+(-[a-z0-9]+)*$`, 64, optional `plugin:` prefix | `src/core/contracts/skill-name.ts:1-34` (pattern now carries the per-segment 64-character limit as lookaheads; `isSkillName` and the schema share it) | `tests/unit/skill-name.test.ts:8-27`, `configuration-snapshot.test.ts` | conformant | coverage run green; rejected and accepted lists unchanged and passing |
| FR-02 | Old format rejected with fix | `skill-name.ts:21-24`; `snapshot-merge.ts` | `configuration-snapshot.test.ts`, `init-snapshot.test.ts`, `e2e-init.test.ts` | conformant, wording gap (CR-03 of review 1, persistent) | bare name always in the message; flag name not in the merge message |
| FR-03 | Per-harness form in zone action and resume text | `zone-guidance.ts`, 8 `skill-invocation.ts`, 8 `runtime.ts`, `brake-engine.ts`, `session-reset-handler.ts`, `failure-policy.ts` | `tests/integration/skill-invocations.test.ts:24-35`, `zone-guidance.test.ts` | conformant | exact form per harness asserted; exact RED/CRITICAL/resume strings asserted with the standard formats (CR-05 persistent, optional) |
| FR-04 | Unknown formatter yields the sentence | `zone-guidance.ts` default `sentenceInvocation`; `failure-policy.ts` | `zone-guidance.test.ts`, `failure-policy-snapshot-reset.test.ts` | conformant | no sigil fallback |
| FR-05 | Flags take bare names, replay equal | `snapshot-merge.ts`, `questions-snapshot.ts` | `init-snapshot.test.ts`, `init-assistant-equivalence.test.ts`, `e2e-init.test.ts` | conformant | coverage run green |
| FR-06 | Wizard says "skill name", validates, shows per-harness form | `snapshot-specs.ts`, `questions-snapshot.ts`, `invocation-facts.ts`, `summary-rows.ts` | `assistant-questions-invalid.test.ts`, `assistant-questions.test.ts`, `assistant-output.test.ts` | conformant | preview in the summary card before confirmation (AUTO-09) |
| FR-07 | Bare name printed; doctor text and JSON carry forms | `doctor-report-extras.ts`, `diagnostics.ts`, `doctor-mode-text.ts` | `doctor-report-extras.test.ts`, `doctor-mode-text.test.ts`, `doctor-light-mode.test.ts` | conformant | suite green |
| FR-08 | Repo config, README, `AGENTS.md`, SDD references, schemas use the bare name | `context-brake.config.json`, `README.md:116,234,325`, `AGENTS.md`, `autonomous-mode.md`, `schemas/` | TC-09 `git grep` | conformant | TC-09 empty; README init row repaired (see Previous findings); `schemas:check` passes |
| FR-09 | Skills entry in each of 8 harness sections | `docs/research/harness-integrations.md` | TC-10 | conformant | unchanged since review 1 |
| NFR-01 | Syntax in harness folder, no id branching in guidance | `core/services/skill-invocation.ts`, `skill-invocations.ts` (`Record<HarnessId,...>`) | `zone-guidance.test.ts` (fake format), QA-07 | conformant | QA-07 printed nothing |
| NFR-02 | 60-token block budget | `telemetry-block-budget.test.ts` | itself | conformant | suite green |
| NFR-03 | Platforms | no shell or path code added | review | conformant | Windows only run (limitation) |
| NFR-04 | Errors without stack trace | `InvalidConfigurationError` path unchanged | verified in review 1 by hand; unchanged code | conformant | no change to that path in the corrections |
| NFR-05 | Schemas regenerated, `schemas:check` passes | `schemas/context-brake.config.schema.json:139-149` | `skill-name.test.ts:29-41`, `npm run schemas:check` | conformant | `pattern` and `maxLength: 129` on both keys; check passed here |
| OBJ-03 | Old format fails in `init`, `doctor`, hooks | shared `snapshotSchema` | schema, merge, wizard, and flag tests | conformant | no test drives a stored old-format file through doctor or a hook (CR-04 persistent, optional) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100 lines, no comments, 30-line functions, 3 params) | OK | `skill-name.ts` 34 lines, no comments; lint clean; one aggravated test file (CR-06) |
| `javascript-typescript.md` (Zod, no `any`, dedicated errors) | OK | QA-01 and QA-02 empty |
| `harness-adapters.md` / AGENTS.md architecture | OK | QA-03 empty; syntax in `infrastructure/harnesses/*/skill-invocation.ts` |
| `cli-output.md` | OK | no new output channel; CR-03 wording gap noted |
| `tests.md` | OK | tests cite `prd-19 FR-/TC-`; the new schema test sits in `skill-name.test.ts` (reads a committed JSON, no process) |
| `file-changes.md` | N/A | no user-file writing code added |
| AGENTS.md "never edit instruction files" | OK | docs edits are repository docs |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | rg `:\s*any\b\|\bas any\b\|<any>` over the 73 changed `.ts` files | 0 | OK |
| QA-02 | `@ts-ignore`, `eslint-disable` | blocking | rg over the same files | 0 | OK |
| QA-03 | core importing infrastructure/cli | blocking | rg over changed `src/core` files | 0 | OK |
| QA-04 | `throw new Error(` | reservation | rg over the same files | 2 of 2, both in tests, in lines not added by this feature | pre-existing |
| QA-05 | 4+ parameters | reservation | rg PCRE over the same files | 9 matches: two `recordBoot` signatures with a 3-parameter declaration, destructured `it.each` callbacks, a tuple type in `summary-rows.ts:24`; none is a declaration with 4 parameters | OK (false positives) |
| QA-06 | File above 100 lines | reservation | `rg -c` + awk | 1 of 1: `tests/unit/assistant-output.test.ts` 104 lines (101 at base) | aggravated (CR-06, persistent) |
| QA-07 | Harness id in core guidance | blocking | rg on `zone-guidance.ts`, `skill-invocation.ts` | 0 | OK |

- Terrain baseline: applied from TechSpec (the one test file above 100 lines is outside the baseline table and was measured at `7295a43` in review 1)
- Hits discounted by baseline: 2 (QA-04) plus 9 QA-05 false positives
- Reservations accumulated in the feature: 1 (QA-06) plus the optional improvements CR-03, CR-04, CR-05 carried from review 1
- Suggested escalation: no trigger fired (fewer than 8 reservations, no touched file above 200 lines, no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 `skillNameSchema` in its own file, `plugin:` prefix, sigil message | YES | `skill-name.ts`; `configuration.ts` has no new export |
| DEC-02 formats in core, default sentence | YES | `core/services/skill-invocation.ts` |
| DEC-03 required `RuntimeDescriptor.skillInvocation`, one constant per harness | YES | eight descriptors; identity test in `skill-invocations.test.ts:32-35` |
| DEC-04 exhaustive `Record<HarnessId,...>` resolver | YES | `skill-invocations.ts`; test asserts all ids |
| DEC-05 `zoneAction(zone, snapshot, options)`, 3 params | YES | `zone-guidance.ts` |
| DEC-06 `snapshot.invocations` for active harnesses | YES | `doctor-report-extras.ts`, `diagnostics.ts` |
| DEC-07 flags validated by `snapshotSchema`, "skill name" prompts, preview | PARTIAL | preview in the summary card (AUTO-09, recorded decision) |
| DEC-08 repo config and docs changed last | PARTIAL | done; installed hook assets not refreshed (AUTO-10, open thread O-02), `doctor` reports `ASSET_OUTDATED` as a warning |
| DEC-09 research doc entries | YES | eight entries |
| Contract: config schema `pattern` and `maxLength` replace the free string | YES (was NO in review 1) | `schemas/context-brake.config.schema.json:139-149`: `pattern` and `maxLength: 129` on `command` and `resumeCommand`; `skill-name.ts:34` registers the metadata in `z.globalRegistry`; test at `skill-name.test.ts:29-41` asserts the fragment and exercises the pattern |
| Contract: `doctor` keeps `schemaVersion` 1, additive optional field | YES | `diagnostics.ts` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | schema, formats, fixtures |
| T02 | `done/task_02.md` | COMPLETE | descriptor field, eight forms, guidance |
| T03 | `done/task_03.md` | COMPLETE | doctor JSON and text |
| T04 | `done/task_04.md` | COMPLETE | wizard and summary |
| T05 | `done/task_05.md` | COMPLETE | README row repaired by correction task 01 (`codereview_01/done/task_01.md`); TC-09 empty; schemas current |
| Corrections C-T01 (CR-01) | `codereview_01/done/task_01.md` | COMPLETE | verified in `README.md:325` |
| Corrections C-T02 (CR-02) | `codereview_01/done/task_02.md` | COMPLETE | verified in schema, `skill-name.ts`, test |

## Executed validations

- Profile and scope: Node 24 on Windows 11, Git Bash; CLI plus hooks; in-process tests plus the e2e smoke set; Linux and macOS not run.
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted diff as of this review (83 changed paths, same count as before the review started); `npm run build` ran here first, so `dist/` is current for the e2e and process tests.
- Reused evidence: `test:budget` and `package:smoke` from the T05 handoff not re-run (no source file of the runtime path changed in the corrections; this review's coverage run took 103.8 s wall inside the 180 s budget). `doctor` by hand against an old-format config from review 1 not repeated: `skill-name.ts` message paths are covered by the unit tests.
- Manual acceptance: none required. By hand: the README table row was checked cell by cell (4 unescaped and 1 escaped pipe on line 325, the same as the original row at `7295a43:README.md:316`; `--resume-command` appears once in that row; line 234 holds the other mentions in prose, outside a table).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | assets, built CLI |
| `npm run lint` | passed | code-standards, QA-02 |
| `npm run typecheck` | passed | all code |
| `npm run schemas:check` | passed | NFR-05 |
| `npm run dependencies:check` | passed (9 packages, no install scripts) | supply chain |
| `npm run coverage` | passed: 258 files, 1342 tests, 95.98% statements, 92.98% branches | FR-01..FR-07, NFR-01, NFR-02, TC-01..TC-08, TC-11..TC-13 |
| TC-09 `git grep -nE '"/sdd-(snapshot\|orchestrate-flow)"\|command "/sdd-'` outside `tasks/`, `tests/` | no hit | FR-08 |
| QA-01..QA-07 commands | see quality profile | profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | FR-02, NFR-04 (carried: `codereview_01/CR-03`) | `src/core/services/snapshot-merge.ts:23` names the key (`snapshot.command`), not the flag `--snapshot-command`; the config-file error carries the file only in `path` and the remediation | FR-02 asks for file or flag; the message gives key and bare name, so the fix is clear | Optional: include the flag in the merge error and the file in the `InvalidConfigurationError` message. Accepted open item (AUTO-11) |
| CR-02 | Low | OBJ-03, TC-02 (carried: `codereview_01/CR-04`) | no test loads a stored `context-brake.config.json` with `/sdd-snapshot` through `doctor` or a hook | Claim rests on the shared loader and on a manual check in review 1 | Optional: one doctor integration case |
| CR-03 | Low | FR-03 acceptance (carried: `codereview_01/CR-05`) | `tests/integration/skill-invocations.test.ts:24-35` asserts the exact form per harness and that each descriptor carries it; exact RED/CRITICAL/resume text is asserted with the standard formats in `zone-guidance.test.ts` | The PRD wording "one test per harness asserts the exact text at RED and CRITICAL and for the resume text" is met by composition, not by a literal per-harness assertion | Optional: extend the per-harness `it.each` with `zoneAction` and `resumeText` through each descriptor |
| CR-04 | Low | QA-06 (carried: `codereview_01/CR-06`) | `tests/unit/assistant-output.test.ts` is 104 lines (101 at `7295a43`) | Reservation aggravated by 3 lines | Optional: move the new invocation rows to a second test file |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 (README option table) | resolved | `README.md:325` lists `--snapshot-trigger <YELLOW\|RED>` (escaped) and `--resume-command <skill>` once; no `\|RED>` fragment or `<text>` next to `resume-command` in the diff; cell structure equals the original row; TC-09 empty |
| codereview_01/CR-02 (schema `pattern`/`maxLength`) | resolved | `schemas/context-brake.config.schema.json:139-149`; `schemas:check` passes; `skill-name.test.ts:29-41`; runtime issue and message unchanged (`skill-name` and `configuration-snapshot` tests pass in the 1342-test run) |
| codereview_01/CR-03 (flag/file in message) | persistent | now CR-01 above; optional, accepted by AUTO-11 |
| codereview_01/CR-04 (no stored-config doctor test) | persistent | now CR-02 above; optional, accepted by AUTO-11 |
| codereview_01/CR-05 (per-harness exact text) | persistent | now CR-03 above; optional, accepted by AUTO-11 |
| codereview_01/CR-06 (`assistant-output.test.ts` 104 lines) | persistent | now CR-04 above; optional, accepted by AUTO-11 |

## Limitations and open items

- Linux and macOS were not run; Windows with Git Bash only. No platform-specific code was added.
- `context-brake init` was not run (contract). TC-06 and TC-13 evidence is the in-process and built-CLI tests in the coverage run.
- `doctor` in this repository reports `ASSET_OUTDATED` for `.claude/hooks/context-brake.mjs` and the mod `register.mjs` (AUTO-10, snapshot O-02): the installed hook script is the previous bundle and renders the bare name without the harness form until the user runs `context-brake init --yes`. Warning only; the decision is the user's.
- `test:budget` and `package:smoke` were not re-run in this review (see Executed validations).
- The context snapshot predates both reviews and was used only for its header and open threads; its `authored_code: yes` confirms the author could not review.
- Other SDD artifacts (`tasks/prd-20-skills-wizard-discovery/`, `tasks/triage-log.jsonl`) appear as worktree changes and are outside this review.

## Conclusion

The two corrections are in place and verified: the README option row is repaired and structurally equal to the original, and the published config schema now states the skill-name rule with `pattern` and `maxLength` while the runtime message stays single. Build, lint, typecheck, schema currency, dependency scripts, and the full suite with coverage (258 files, 1342 tests, 95.98%) pass; TC-09 is empty; no blocking profile rule has a hit and no architecture rule is broken. Every PRD and TechSpec obligation is conformant, so the status is APPROVED WITH RESERVATIONS, with four Low optional improvements (CR-01 to CR-04) carried from the first review and accepted as open items.
