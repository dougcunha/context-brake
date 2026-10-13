# Code review report — 20-skills-wizard-discovery (skill discovery and alternatives in the init wizard), re-review

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `7295a433a4f1f79430b0c5281cb46ab8495b6db6..worktree (uncommitted)`, limited to the 40 paths in `slice-scope.txt` (37 TypeScript files, now including `tests/helpers/scripted-ui-prompts.ts` and `tests/unit/questions-skill-resume-paths.test.ts`); slice 19 files in the same worktree were read only as callers or context
- Previous review: `tasks/prd-20-skills-wizard-discovery/codereview_01/codereview.md` (REJECTED)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-20-skills-wizard-discovery/prd.md` | read |
| TechSpec | `tasks/prd-20-skills-wizard-discovery/techspec.md` | read |
| Manifest | `tasks/prd-20-skills-wizard-discovery/tasks.md` | read |
| Handoffs | `done/task_01.md` to `done/task_05.md`, `codereview_01/done/task_01.md` | read |
| Previous review | `codereview_01/codereview.md` | read |
| Workflow, checkpoint, slice-scope, baseline hashes | `workflow.md`, `checkpoint.json`, `slice-scope.txt`, `baseline-hashes.txt` | read |
| Snapshot | none in the feature folder | not applicable |
| Implementation | files of `slice-scope.txt`; `ask.ts`, `snapshot-specs.ts`, `snapshot-merge.ts`, `assistant-questions.ts` as context | delimited |

Scope check: of the 139 files in `baseline-hashes.txt`, only 8 differ from the baseline now and all 8 are in `slice-scope.txt`; no file outside the scope changed.

## Coverage matrix

Obligations already judged `conformant` in codereview_01 were re-checked against the current code only where the correction touched them (`skill-options.ts`, `questions-snapshot.ts`, `questions-skill.ts` flow, the test helpers, the README). The remaining rows keep the codereview_01 evidence, re-confirmed by the full gates below (same 37 files, no change since).

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Read-only catalog per harness; empty without folders | `src/infrastructure/skills/skill-catalog.ts`, `src/infrastructure/harnesses/skill-folders.ts` (exhaustive record), eight `*/skill-folders.ts` | `tests/integration/skill-catalog-harnesses.test.ts` | conformant | `it.each(HARNESS_IDS)` passes in the coverage run |
| FR-02 | Frontmatter only, validated name, bounds, symlinks | `skill-catalog-reader.ts`, `frontmatter.ts` | `skill-catalog-reader.test.ts`, `skill-catalog-bounds.test.ts` | conformant | passes; the POSIX-only EACCES test skips on Windows (limitation) |
| FR-03 | Snapshot scoring | `skill-ranking.ts` | `skill-ranking.test.ts` | conformant | unchanged since review 1 |
| FR-04 | Resume scoring; snapshot skill excluded; asked only after a snapshot skill | `skill-ranking.ts`, `questions-snapshot.ts:57-67` (`exclude: command`), `askSnapshot` | `skill-ranking.test.ts`, `questions-skill-resume.test.ts` | conformant | the snapshot name is absent from the ranked resume list; one edge with a configured value is recorded as optional improvement OI-01 |
| FR-05 | Options: recommended first, up to 3 alternatives, type another, none (snapshot); configured value preselected; Enter keeps | `skill-options.ts:22-33,41-43`, `questions-skill.ts:46-56` | `questions-skill.test.ts`, `questions-skill-resume-paths.test.ts:15-45,48-58` | conformant | `none` exists only for the snapshot role (`skill-options.ts:30`); the resume list ends with `type another` (test asserts `not.toContain('none')`); Enter keeps a configured resume skill (test `1) old-flow (current)`, no `--resume-command` flag); the terminal `select` path is covered through `ScriptedUiPrompts` (options as data, values `['sdd-snapshot','?other','?none']`) |
| FR-06 | Union by name, universal above partial, origin in words | `skill-candidates.ts`, `skill-ranking.ts`, `skill-options.ts:10-13` | `skill-candidates.test.ts`, `questions-skill-harnesses.test.ts` | conformant | unchanged |
| FR-07 | No scan with flags or non-interactive | catalog created only in `assistant-context.ts` | `init-skill-catalog-not-read.test.ts` | conformant | negative cases (count 0 for `--yes`, snapshot flags, `--dry-run --json`) plus a positive case that builds the wizard context and sees the factory called once, so the tripwire is shown to be connected |
| FR-08 | Catalog failure falls back with a stderr warning | `questions-skill.ts:23-36` | `questions-skill-resume.test.ts` | conformant | throwing catalog gives the typed question and `WARN:`; reader warnings are written and the picker stays |
| NFR-01 | Only the validated name is stored or shown | `skill-options.ts:15-20` | `questions-skill-resume.test.ts` ("never shows or stores a description") | conformant | unchanged |
| NFR-02 | 200 skills within 500 ms | `skill-catalog-reader.ts` | `tests/bench/skill-catalog.test.ts` | conformant | `npm run test:bench` passed; the skill bench took 1441 ms for its 22 scans |
| NFR-03 | Scoring pure in `core` over a port | `src/core/contracts/skill-catalog.ts`, `src/core/services/skill-*.ts` | QA-03, QA-05 | conformant | both greps empty |
| NFR-04 | Linux, macOS, Windows, symlinks, junctions | `node:path`, `stat` follows links | `skill-catalog-bounds.test.ts` | conformant (Windows run) | Linux and macOS not run here |
| NFR-05 | Words, not color | `skill-options.ts:19,24` | `questions-skill.test.ts`, `questions-skill-harnesses.test.ts` | conformant | `recommended`, `current`, `found in` are text |
| OBJ-01..OBJ-04 | Outcomes | as above | as above | conformant | |
| US-01..US-03 | Journeys | as above | as above | conformant | |
| US-04 | Resume skill that is not the snapshot skill; no loop | `questions-snapshot.ts:57-67`, `questions-skill.ts:43` | `questions-skill-resume.test.ts` | conformant, with edge | candidate list excludes the snapshot skill and the question appears only with a snapshot skill; a configured resume skill equal to the newly chosen snapshot skill is still preselected (OI-01) |
| TC-01..TC-14 | TechSpec scenarios | test files named in the TechSpec | all present | conformant | TC-05 now holds the resume paths that review 1 found missing (refusal of `none`, type another, Enter keeps the configured value, no `none` in the resume list) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100-line files, no comments, 3 parameters) | OK | QA-08 commands empty; `questions-snapshot.ts` 76 lines, `skill-options.ts` 51, `questions-skill.ts` 56; no comment lines in the scope |
| `javascript-typescript.md`, `node.md` | OK | async `node:fs/promises` only (QA-06 empty); no new dependency; lint and typecheck pass |
| `harness-adapters.md` | OK | harness knowledge limited to one constant per harness folder plus an exhaustive record |
| `cli-output.md` | OK | warnings on stderr with the `WARN:` label; the new refusal message is English, names the flag, and is re-asked by `askValidated` |
| `tests.md` | OK | benchmark only in `tests/bench/`; temporary directories; link tests skip with a reason; the new helper `ScriptedUiPrompts` is a test double in `tests/helpers/` |
| `file-changes.md` | N/A | read-only scan |
| `ts-tests` | OK | the added cases check behavior (what is offered, refused, kept), not implementation |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>'` over the 37 scope TypeScript files | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | same file set | 0 | OK |
| QA-03 | `core` importing `infrastructure` or `cli` | blocking | import-pattern `rg` over the scope files under `src/core/` | 0 | OK |
| QA-04 | empty `catch` / `.catch(() => {})` | blocking | multiline `rg` over the scope | 0 | OK |
| QA-05 | harness id branching in ranking and merge | blocking | `rg` of harness names over `skill-ranking.ts`, `skill-candidates.ts` | 0 | OK |
| QA-06 | synchronous file API in the reader | blocking | `rg` over `src/infrastructure/skills` | 0 | OK |
| QA-07 | `throw new Error(` where a class fits | reservation | `rg 'throw new Error\('` over the scope | 1 new of 1 | `tests/integration/init-skill-catalog-not-read.test.ts:12`, a tripwire mock that must never run; the helper `ScriptedUiPrompts.ask` uses `Promise.reject(new Error(...))` (`tests/helpers/scripted-ui-prompts.ts`), the same pattern outside the regex; both in test doubles where a dedicated class is not warranted. Counted as optional improvements, not findings |
| QA-08 | 4+ parameters, file above 100 lines | reservation | parameter regex; `rg -c` with `awk '$2 > 100'` | 0 | OK |

- Terrain baseline: applied from TechSpec (no pre-existing hit in the five modified files)
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 2 (the two test-double errors above)
- Suggested escalation: no trigger fired (2 of 8 reservations; no file above 100 lines; no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 port and exhaustive resolver | YES | `harnesses/skill-folders.ts` is `Record<HarnessId, ...>` |
| DEC-02 reader bounds | YES | unchanged since review 1 |
| DEC-03 merge | YES | `skill-candidates.ts` |
| DEC-04 ranking | YES, with the recorded deviation (`options = { exclude }`, no `selectedCount`) | `skill-ranking.ts` |
| DEC-05 picker and fallback | PARTIAL (benign) | with no match the typed question is shown even when a value is configured; it keeps the configured value on Enter |
| DEC-06 resume without `none` | YES | restored by the correction: `skill-options.ts:30` adds `none` for the snapshot only; `questions-snapshot.ts:42` refuses the typed word for the resume role with the way to remove the skill (`--no-snapshot-command`, which does clear both skills: `snapshot-merge.ts:15`) |
| DEC-07 only the name leaves the picker | YES | unchanged |
| DEC-08 only directories with `SKILL.md` | YES | unchanged |
| Folder table of the TechSpec | YES | eight constants equal the table |
| No change to config, schemas, `--json`, flags | YES | `npm run schemas:check` passes with no regeneration |

The decision that review 1 asked of the HIL (keep or drop resume `none`) was taken as AUTO-18 (drop, back to DEC-06), recorded in `codereview_01/done/task_01.md`; the README sentence in `Skill suggestions` states the same.

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | unchanged since review 1 |
| T02 | `done/task_02.md` | COMPLETE | unchanged |
| T03 | `done/task_03.md` | COMPLETE | unchanged |
| T04 | `done/task_04.md` | COMPLETE | defects of review 1 corrected, see below |
| T05 | `done/task_05.md` | COMPLETE | gates re-run in this review |
| Correction T01 | `codereview_01/done/task_01.md` | COMPLETE | T01.1 to T01.4 present in code, tests, and README; handoff lists the changed files, which all appear in `slice-scope.txt` |

All task files are in `done/`, links in `tasks.md` resolve, state checkboxes match, and the graph is acyclic.

## Executed validations

- Profile and scope: Node.js 24 on Windows 11 with Git Bash; in-process Vitest, one benchmark, the existing built-CLI smoke inside `npm run coverage`; no real terminal session (the clack `select` path is covered through its option data)
- Validated state: HEAD `7295a43`, uncommitted worktree as found; this review changed no repository file other than this report and the build, test, and coverage outputs
- Reused evidence: none; every command below was run in this session
- Manual acceptance: none required by the TechSpec; a real TTY run of the picker is not verifiable here
- Probe: a scratch script outside the repository (session scratchpad) ran the real `runQuestions` through `ScriptedPrompts` with a configured resume skill `sdd-orchestrate-flow`, typing `sdd-orchestrate-flow` as the new snapshot skill and pressing Enter at the resume question. Result: `--snapshot-command sdd-orchestrate-flow` and `facts.resumeCommand: "sdd-orchestrate-flow"` (the resume question shows `Enter keeps [sdd-orchestrate-flow]`). This is OI-01. The probe wrote nothing in the repository.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed | code standards |
| `npm run typecheck` | passed | all |
| `npm run schemas:check` | passed (no regeneration) | config and schemas unchanged |
| `npm run coverage` | passed: 268 files, 1397 passed, 1 skipped, 96.07% statements | FR-01..FR-08, NFR-01, NFR-03..05, TC-01..09, TC-11..14 |
| `npm run test:bench` | passed: 7 files, 17 tests | NFR-02, TC-10 |
| `npm run test:budget` (1st run, after coverage and bench) | failed: 179.1 s wall and one failure, `tests/e2e/e2e-doctor.test.ts` (measured hook overhead) | see limitations |
| `npx vitest run tests/e2e/e2e-doctor.test.ts` | passed (1 test, 4.9 s) | the failed test, in isolation |
| `npm run test:budget` (2nd run) | passed: 122.7 s wall (budget 180 s) | test budget |
| QA-01..QA-08 commands | see Quality profile | profile |

`npm run build` and `npm run package:smoke` were not re-run: no finding depends on `dist/`, and the correction touched no packaged asset (limitation).

## Findings

No actionable findings. The one edge case found is recorded as an optional improvement because the PRD gives it two competing rules (FR-05 "a configured value is preselected" and FR-04 "the snapshot skill is excluded") and the explicit acceptance criteria of both pass.

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — |

Optional improvements (not findings):

- OI-01 (US-04, FR-04, FR-05): `skill-options.ts:26-28` adds the configured value as `<name> (current)` when it is not among the ranked picks, with no check against `exclude`; and the typed fallback keeps it on Enter. If the user changes the snapshot skill to the skill already configured for the resume, Enter at the resume question stores the same skill for both (probe above), the loop that US-04 wants to avoid. Rare, always visible in the prompt text, and the summary shows both values. Suggested: skip the `current` entry (or refuse the typed value) when it equals `exclude`.
- OI-02 (QA-07): the two test-double errors described in the quality profile.
- OI-03: the tie-break and origin sort use `localeCompare` (`skill-ranking.ts`, `skill-candidates.ts`), which depends on the process locale, while the PRD says "ties break by name".
- OI-04: a folder shared by several selected harnesses (`.agents/skills` appears in six adapters) is scanned once per harness (`questions-skill.ts:26`); within the bounds but redundant.
- OI-05: `RESUME_NONE_MESSAGE` begins "Enter keeps the current resume skill" even when no resume skill is configured; harmless, the second half is the useful part.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 (Medium, resume `none` silently ignored) | resolved | `skill-options.ts:30` offers `none` only for `role === 'snapshot'`; the resume list no longer contains a choice without effect; test `questions-skill-resume-paths.test.ts:15-19` asserts `type another` is offered and `none` is not |
| codereview_01/CR-02 (Low, typed `none` stores a skill named `none`) | resolved | `questions-snapshot.ts:42` returns an error for `none` at the resume prompt; `askValidated` re-asks; test `questions-skill-resume-paths.test.ts:21-25` checks the message and that the stored resume skill stays `sdd-orchestrate-flow` |
| codereview_01/CR-03 (Low, resume paths and `askUi` untested) | resolved | `questions-skill-resume-paths.test.ts` covers refusal of `none`, Enter keeping a configured resume skill, `type another`, and the `ScriptedUiPrompts` select path (options as data, labels, returned values) |
| codereview_01/CR-04 (Low, tripwire not proven connected) | resolved | `init-skill-catalog-not-read.test.ts` adds a positive case: building the wizard context calls the factory once and the mock's error propagates |

## Limitations and open items

- Linux and macOS were not run. The unreadable-folder warning path (`EACCES`, `skill-catalog-reader.ts`) is exercised only by a POSIX-only test that skips on Windows, so that path is `not verifiable` on this machine.
- The clack `select` prompt was not driven in a real terminal; evidence is the scripted option data only (the TechSpec accepts `NOT VERIFIABLE` for real TTY use).
- Vendor doc claims behind the folder constants were not re-fetched; `.pi/skills` and `.omp/skills` are declared though the vendor pages do not write them, as the handoff and the research doc record.
- `npm run build` and `npm run package:smoke` were not re-run in this review.
- Test budget: the first `test:budget` run in this session failed (179.1 s of 180 s and one failure of the e2e doctor hook-overhead measurement) right after coverage and bench runs on the same machine; the failed test passes alone and the budget passes on a second run (122.7 s). I read this as machine load, not a regression of this feature: no scoped file touches the doctor, the hook path, or the e2e suite. The margin of the budget on a loaded machine is thin; the HIL may want to know.
- Optional improvements OI-01 to OI-05 above are not blocking.

## Conclusion

The four findings of codereview_01 are resolved with code and test evidence: the resume question no longer offers `none` (DEC-06 restored), the typed word `none` is refused with the way to remove the skill, the resume and terminal-select paths are covered by tests, and the FR-07 tripwire is shown to be connected. Every blocking quality profile rule is clean, and lint, typecheck, schema currency, coverage (268 files, 96.07%), benchmark, and, on a second run, the test budget pass. No requirement, security, or essential evidence is pending. The status is APPROVED WITH RESERVATIONS because of the optional improvements, mainly OI-01 (a configured resume skill equal to the new snapshot skill is still preselected) and the unverifiable Linux, macOS, and real-terminal paths.
