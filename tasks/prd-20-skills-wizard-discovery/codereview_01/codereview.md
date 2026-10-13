# Code review report — 20-skills-wizard-discovery (skill discovery and alternatives in the init wizard)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `7295a433a4f1f79430b0c5281cb46ab8495b6db6..worktree (uncommitted)`, limited to the 42 paths in `slice-scope.txt` (35 TypeScript files); slice 19 files in the same worktree were read only as callers or context
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-20-skills-wizard-discovery/prd.md` | read |
| TechSpec | `tasks/prd-20-skills-wizard-discovery/techspec.md` | read |
| Manifest | `tasks/prd-20-skills-wizard-discovery/tasks.md` | read |
| Handoffs | `done/task_01.md` to `done/task_05.md` | read |
| Workflow, checkpoint, slice-scope | `workflow.md`, `checkpoint.json`, `slice-scope.txt` | read |
| Snapshot | none in the feature folder | not applicable |
| Implementation | files of `slice-scope.txt`, plus `questions-snapshot.ts`, `ask.ts`, `snapshot-specs.ts`, `skill-name.ts` as context | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Read-only catalog per harness (name, description, folder); empty list without folders | `src/infrastructure/skills/skill-catalog.ts:5`, `src/infrastructure/harnesses/skill-folders.ts:12`, eight `*/skill-folders.ts` | `tests/integration/skill-catalog-harnesses.test.ts:17,26` | conformant | `it.each(HARNESS_IDS)` passes in the 267-file coverage run; the record is exhaustive over `HarnessId` |
| FR-02 | Frontmatter only, validated name, ignore unparseable, symlinks, bounds | `skill-catalog-reader.ts:21-47,73-78`, `frontmatter.ts:18-25` | `skill-catalog-reader.test.ts:35,48,53`; `skill-catalog-bounds.test.ts:18,25,47,56` | conformant | 8 KiB head read via handle; 500-directory cap; junction/symlink test ran on Windows; the EACCES warning test skips on Windows (POSIX only, see limitations) |
| FR-03 | Snapshot scoring by name > description, body never read, ties by name | `skill-ranking.ts:13-31` | `skill-ranking.test.ts:13-36` | conformant | `commit` and `sdd-triage` rank after name matches, only on the description score |
| FR-04 | Resume scoring, snapshot skill excluded, resume asked only after a snapshot skill | `skill-ranking.ts:7-10`, `questions-snapshot.ts:50-60,66-74` | `skill-ranking.test.ts:39`; `questions-skill-resume.test.ts:17-32` | conformant | `sdd-orchestrate-flow` first, snapshot name absent, no resume question when the snapshot is `none` |
| FR-05 | Snapshot question: best match recommended, up to 3 alternatives, type another, none; resume the same; configured value preselected, Enter keeps it | `skill-options.ts:22-39,41-43`, `questions-skill.ts:48-58` | `questions-skill.test.ts:15-60`, `questions-skill-resume.test.ts` | non-conformant | Snapshot role conforms. For the resume role the `none` option and the typed word `none` do not do what they offer: CR-01, CR-02 |
| FR-06 | Union by name, universal skill above partial one, origin said in words | `skill-candidates.ts:14-22`, `skill-ranking.ts:31`, `skill-options.ts:10-13` | `skill-candidates.test.ts:9`, `questions-skill-harnesses.test.ts:12-22` | conformant | `a-snapshot` annotated with both folders, `b-snapshot` with `claude-code (.claude/skills)`; a name match beats a universal weaker match (`skill-ranking.test.ts:49`) |
| FR-07 | No scan with flags or non-interactive | catalog is created only in `assistant-context.ts:28`, reached only through the wizard | `tests/integration/init-skill-catalog-not-read.test.ts:24-33` | conformant | tripwire mock never called for `--yes`, flag, and `--dry-run --json` runs (weak proof that the mock is reachable: CR-04) |
| FR-08 | Catalog failure falls back to the typed question with a stderr warning | `questions-skill.ts:23-36` | `questions-skill-resume.test.ts:35-44` | conformant | throwing catalog gives the typed question and `WARN:` on stderr |
| NFR-01 | Only validated name stored or shown; description is a hint only | `skill-options.ts:15-20` (label and hint hold name and folders only) | `questions-skill-resume.test.ts:55-60` | conformant | hostile description absent from prompts and from the result |
| NFR-02 | 200 skills under 500 ms | `skill-catalog-reader.ts:51-55` (chunks of 32) | `tests/bench/skill-catalog.test.ts` | conformant | `npm run test:bench`: 7 files, 17 tests passed; the skill bench took 950 ms for 22 scans |
| NFR-03 | Scoring pure in `core` over a port | `src/core/contracts/skill-catalog.ts`, `src/core/services/skill-*.ts` | QA-03, QA-05 | conformant | both greps empty |
| NFR-04 | Linux, macOS, Windows, symlinks and junctions | `node:path` only, `stat` follows links | `skill-catalog-bounds.test.ts:47,56` | conformant (Windows run) | Linux and macOS not run here (limitation) |
| NFR-05 | Words, not color | `skill-options.ts:19,24` | `questions-skill.test.ts`, `questions-skill-harnesses.test.ts:19` | conformant | `recommended`, `current`, `found in` in text |
| OBJ-01..OBJ-04, US-01..US-04 | Outcomes and journeys | as above | as above | conformant | US-04 exclusion and ask-only-after-snapshot proven; the resume `none` defect does not affect them |
| TC-01..TC-14 | TechSpec scenarios | test files named in the TechSpec | all present | TC-01..04, 06..14 conformant; TC-05 partial | TC-05 "resume omits none" was replaced by the recorded deviation (resume offers `none`), whose behavior is untested and defective: CR-01, CR-03 |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100-line files, no comments, 3 parameters, no blank lines in functions) | OK | QA-08 line and parameter commands empty; no comment lines in the scope. One stray blank line at the end of a `describe` body in `tests/unit/questions-skill.test.ts`, cosmetic |
| `javascript-typescript.md`, `node.md` | OK | async `node:fs/promises` only (QA-06 empty); no new dependency; lint and typecheck pass |
| `harness-adapters.md` | OK | harness knowledge limited to one constant per harness folder plus an exhaustive record |
| `cli-output.md` | OK | warnings go to stderr with the `WARN:` label (`questions-skill.ts:19-21`); messages in English; prompt gating unchanged |
| `tests.md` | OK | benchmark only in `tests/bench/` and registered in `bench-config.test.ts`; temporary directories; symlink tests skip with a reason |
| `file-changes.md` | N/A | the scan is read-only |
| `ts-tests` | OK | tests are behavior-level and scripted; gap on the resume `none` path noted in CR-03 |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n ':\s*any\b\|\bas any\b\|<any>'` over the 35 scope TypeScript files | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | same file set | 0 | OK |
| QA-03 | `core` importing `infrastructure` or `cli` | blocking | `rg` of the import pattern over the three core skill files | 0 | OK |
| QA-04 | empty `catch` / `.catch(() => {})` | blocking | multiline `rg` over the scope | 0 | OK |
| QA-05 | harness id branching in ranking and merge | blocking | `rg` of harness names over `skill-ranking.ts` and `skill-candidates.ts` | 0 | OK |
| QA-06 | synchronous file API in the reader | blocking | `rg` over `src/infrastructure/skills` | 0 | OK |
| QA-07 | `throw new Error(` where a class fits | reservation | `rg 'throw new Error\('` over the scope | 1 new of 1 | `tests/integration/init-skill-catalog-not-read.test.ts:10`, a tripwire mock that must never run; a dedicated class is not warranted. Counted as an optional improvement, not a finding |
| QA-08 | 4+ parameters, file above 100 lines | reservation | parameter regex and `rg -c` with `awk` over the scope | 0 | OK |

- Terrain baseline: applied from TechSpec (no pre-existing hit in the five modified files)
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 1
- Suggested escalation: no trigger fired (1 of 8 reservations; no file above 100 lines; no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 port and exhaustive resolver | YES | `skill-catalog.ts` contract; `harnesses/skill-folders.ts:12` is `Record<HarnessId, ...>` |
| DEC-02 reader bounds, 8 KiB, first duplicate wins, missing folder empty, other errors as warnings | YES | `skill-catalog-reader.ts:12-13,21-47,73-78` |
| DEC-03 merge | YES | `skill-candidates.ts` |
| DEC-04 ranking | YES, with the recorded deviation (`options = { exclude }`, no `selectedCount`; the origin count carries the coverage) | `skill-ranking.ts:25-31` |
| DEC-05 picker and fallback | PARTIAL | With no match the typed question is shown even when a value is configured (`questions-skill.ts:50`), while DEC-05 limits that to "no match and no configured value"; the user-visible effect is benign (the typed prompt keeps the configured value on Enter). The readline "accepts `none`" behavior holds for the snapshot only (CR-02) |
| DEC-06 resume without `none` | NO, replaced by the recorded deviation | `tasks.md` Problems and solutions and `workflow.md` R-01 choose PRD FR-05 over DEC-06; the chosen behavior is defective (CR-01) |
| DEC-07 only the name leaves the picker | YES | `SnapshotChoice` unchanged; hostile description test passes |
| DEC-08 only directories with `SKILL.md` | YES | `skill-catalog-reader.ts:36-41` |
| Folder table of the TechSpec | YES | eight constants equal the table; the research doc gets three re-check lines (Claude Code, Pi, Oh-My-Pi) |
| No change to config, schemas, `--json`, flags | YES | `npm run schemas:check` passes with no regeneration |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | core contract, merge, ranking and two unit files present; TC-03, TC-04, TC-06 pass |
| T02 | `done/task_02.md` | COMPLETE | `frontmatter.ts`, reader and two integration files present; the POSIX-only EACCES test skips here |
| T03 | `done/task_03.md` | COMPLETE | eight folder files, resolver, `skill-catalog.ts`, 16 harness tests; research lines updated |
| T04 | `done/task_04.md` | COMPLETE as delivered, with defects CR-01, CR-02 | picker and wiring present; the resume `none` deviation is recorded in the handoff and `tasks.md`; its behavior is untested |
| T05 | `done/task_05.md` | COMPLETE | benchmark, README `Skill suggestions` bullet, gates re-run in this review |

All five task files are in `done/`, links in `tasks.md` resolve, state checkboxes match, and the dependency graph is acyclic.

## Executed validations

- Profile and scope: Node.js 24 on Windows 11 with Git Bash; in-process Vitest, one benchmark, the existing built-CLI smoke inside `npm run coverage`; no terminal UI session (the clack `select` path is covered only through its option data)
- Validated state: HEAD `7295a43`, uncommitted worktree as found; this review modified no repository file other than this report and the build/test outputs
- Reused evidence: none; every command below was run in this session
- Manual acceptance: none required by the TechSpec; a real TTY run of the picker is not verifiable here
- Probe: a scratch script (outside the repository, in the session scratchpad) ran the real `runQuestions` through `ScriptedPrompts` to observe the resume `none` behavior (CR-01, CR-02); it wrote nothing in the repository

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed | code standards |
| `npm run typecheck` | passed | all |
| `npm run schemas:check` | passed (no regeneration) | config and schemas unchanged |
| `npm run coverage` | passed: 267 files, 1391 passed, 1 skipped, 96.06% statements | FR-01..FR-08, NFR-01, NFR-03..05, TC-01..09, TC-11..14 |
| `npm run test:bench` | passed: 7 files, 17 tests | NFR-02, TC-10 |
| `npm run test:budget` | passed (exit 0) | test budget |
| QA-01..QA-08 commands | see Quality profile | profile |
| scratch probe of `runQuestions` with a configured resume skill | showed the CR-01 and CR-02 behavior | FR-05 |

`npm run build` and `npm run package:smoke` were not re-run: no finding depends on `dist/`, and nothing observed contradicts the T05 handoff evidence (limitation).

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-05, DEC-06, US-04 | `src/cli/assistant/questions-snapshot.ts:60` (`resume.value === null ? []`) with `skill-options.ts:30-35` (the resume list always offers `none`) and `questions-skill.ts:57` (`none` returns `null`). Probe: config `resumeCommand: sdd-orchestrate-flow`, choosing option 3 (`none — no resume skill`) gives `flags: ["--harness","claude-code"]` and `facts.resumeCommand: null` | The wizard says the resume skill is none and the summary and invocation facts follow, but no flag clears a stored resume skill (the CLI has only `--no-snapshot-command`, `src/cli/init-arguments.ts:24,58`), so the configuration keeps the old resume skill. The choice is silently ignored and the summary is wrong | Either drop `none` from the resume role (restores DEC-06 and the earlier flow; `buildOptions` already receives the role), or give the choice a real effect through a clearing path; add a test for the chosen behavior |
| CR-02 | Low | FR-05, DEC-05 | `questions-skill.ts:34` (typed fallback result for the resume role) and `questions-snapshot.ts:36-42` (`validateResume` has no `none` branch). Probe: at the resume prompt, typing `none` yields `flags: [... "--resume-command","none"]` and `facts.resumeCommand: "none"` | The readline prompt invites "Number or skill name"; the snapshot prompt treats the word `none` as no skill, the resume prompt stores a skill literally named `none` (a valid name under the slice 19 rule). Inconsistent, and it writes a bogus resume skill | Resolve together with CR-01: either handle the word `none` in `pickValidator` for both roles, or refuse it for the resume role |
| CR-03 | Low | TC-05, `tests.md` | `tests/unit/questions-skill-resume.test.ts` and `questions-skill.test.ts` hold no case for resume `none`, resume `type another`, Enter keeping a configured resume skill, or the `askUi` (clack) path of the picker | The two defects above passed 267 test files; a regression in these resume paths would also pass | Add cases for the resume role once CR-01 and CR-02 are decided |
| CR-04 | Low | FR-07, TC-07 | `tests/integration/init-skill-catalog-not-read.test.ts:7-14,26` asserts `created.count === 0` but no case shows that the mock is hit when the wizard does run | The tripwire could be silently disconnected (for example by a renamed module) and still pass | Optional: add a positive case that runs the wizard and asserts the factory is called, or document why the tripwire is sufficient |

## Previous findings (re-review only)

Not a re-review.

## Limitations and open items

- Optional improvements, not findings: (1) QA-07, one test tripwire `throw new Error(` (`init-skill-catalog-not-read.test.ts:10`); (2) the tie-break and origin sort use `localeCompare` (`skill-ranking.ts:31`, `skill-candidates.ts:9`), which depends on the process locale while the PRD says "ties break by name"; (3) a folder shared by several selected harnesses (`.agents/skills` appears in six adapters) is scanned once per harness (`questions-skill.ts:26`), within the bound but redundant; (4) the DEC-05 divergence for "no match with a configured value" described under TechSpec adherence.
- Linux and macOS were not run. The unreadable-folder warning path (`EACCES`, `skill-catalog-reader.ts:60-67`) is exercised only by a POSIX-only test that skips on Windows, so that path is `not verifiable` on this machine.
- The clack `select` prompt was not driven in a real terminal; evidence is the scripted option data only (the TechSpec accepts `NOT VERIFIABLE` for real TTY use).
- Vendor doc claims behind the folder constants (re-check of 13/10/2026) were not re-fetched; `.pi/skills` and `.omp/skills` are declared though the vendor pages do not write them, as the handoff and the research doc record.
- `npm run build` and `npm run package:smoke` were not re-run in this review.
- Decision needed from the HIL: whether the resume `none` option (a deviation chosen over DEC-06) stays; the correction depends on that choice.

## Conclusion

The core services, reader, harness folder resolver, ranking, merge, bounds, fallback, and benchmark match the PRD and TechSpec: every blocking quality profile rule is clean, and lint, typecheck, schema currency, coverage (267 files, 96.06%), benchmark, and test budget pass. FR-05 is not fully met: the resume question offers a `none` choice (the recorded deviation from DEC-06) whose effect is lost when a resume skill is already configured (CR-01), and the typed word `none` stores a skill named `none` for the resume role (CR-02). Both are small and localized and share one decision, but a non-conformant requirement with a silently ignored user choice keeps the status at REJECTED until they are corrected and re-reviewed by a new reviewer.
