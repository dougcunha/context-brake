# Code review report — Verified minimum version for Claude Code (prd-22)

## Summary

- Status: APPROVED
- Execution: delegated reviewer
- Git scope: `419c0bd328b2cd209ed98846e6b50b73ef4664fd..worktree` (unstaged changes to tracked files; no staged files; the new files are SDD artifacts only)
- Previous review: `tasks/prd-22-claude-code-version-floor/codereview_01/codereview.md`

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-22-claude-code-version-floor/prd.md` | read; sha256 `f1497669…` matches `checkpoint.json` `approved_sources` (H-02) |
| TechSpec | `tasks/prd-22-claude-code-version-floor/techspec.md` | read; sha256 `6fbb1260…` matches `approved_sources` (H-02) |
| Manifest | `tasks/prd-22-claude-code-version-floor/tasks.md` | read; link `done/task_01.md` resolves; State `[x] T01` |
| Task | `tasks/prd-22-claude-code-version-floor/done/task_01.md` | read; T01.1–T01.5 checked; handoff present |
| Previous review | `codereview_01/codereview.md` | read; `APPROVED WITH RESERVATIONS`, CR-01 (Low) |
| Correction task | `codereview_01/done/task_02.md` | read; T02.1–T02.3 checked; handoff present |
| Workflow | `tasks/prd-22-claude-code-version-floor/workflow.md` | read; H-00, H-01, H-02, R-01, H-03 |
| Snapshot | `tasks/prd-22-claude-code-version-floor/context-snapshot.md` | header, next step brief, open threads, and `on-run` entries only (independent-stage filter); header is behind, see limitations |
| Implementation | `git diff 419c0bd` over `src/`, `tests/`, `docs/`; handoffs of T01 and T02 | delimited |

Reviewable set (7 files, the same set as codereview_01):

- `src/infrastructure/harnesses/claude-code/capabilities.ts`
- `src/infrastructure/harnesses/claude-code/adapter.ts`
- `docs/research/harness-integrations.md`
- `tests/integration/adapter-version-probes.test.ts`
- `tests/integration/init-remove-footprint.test.ts`
- `tests/integration/linked-project-root-lifecycle.test.ts`
- `tests/bench/e2e-09.test.ts`

The corrections also changed `done/task_01.md` (T02.3). This review reads it as an SDD artifact, not as code.

Excluded from the reviewable set. `workflow.md#context` declares these changes out of scope:

- `.gitignore`: this review checked the diff. It is only the `# >>> context-brake` managed block (16 added lines) that `context-brake init` writes.
- `tasks/triage-log.jsonl`: the triage line of H-00.
- `tasks/prd-21-manual-handoff-command/`: another feature.

`tasks.md` does not list T02. This is correct: `sdd-plan-corrections` step 4 says "Do not create a correction manifest". T02 lives in `codereview_01/done/`.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Claude Code probe reports `minimumVersion: "2.1.97"` | `capabilities.ts:4` `CLAUDE_MINIMUM_VERSION`; `adapter.ts:33` `probeVersion` passes it to `probeExecutableVersion` | TC-01 `adapter-version-probes.test.ts:25`; TC-02 `:54` | conformant | Suite passed. `version-probes.ts:13,24,28` carry the floor on every return path. |
| FR-02 | `doctor` emits no `VERSION_FLOOR_UNVERIFIED` for `claude-code`; `support.minimumVersion` is `"2.1.97"` | No core change: `support-service.ts:61` copies the floor; `doctor-service.ts:40` returns `null` when the floor is not `null` | TC-04 `init-remove-footprint.test.ts:58-72`; TC-05 `linked-project-root-lifecycle.test.ts:24-26,48`; TC-06 `e2e-09.test.ts:34-42,61` | conformant | Suites passed. Built `doctor --json` in this repository: `healthy`, exit 0, `minimumVersion 2.1.97`, no floor finding. |
| FR-03 | Version below 2.1.97 is `old`; `post_tool_telemetry` and `session_boot` not guaranteed; limitation names 2.1.97 | Existing `gatedState` and `versionImpact` (`support-service.ts:9-27`) | TC-03 `adapter-version-probes.test.ts:59-67` | conformant | The test asserts `status: 'old'`, no `supported` capability, both limitations, and the text `older than minimum 2.1.97`. |
| FR-04 | Research line names 2.1.97, mechanism table, source URL, date, 3 gaps | `docs/research/harness-integrations.md:69` | TC-07 (diff review) | conformant | Line 69 has all 5 elements. It now also states the DEC-03 edge (T02.2). This review fetched the changelog again: 9322 lines, `## 2.1.306` to `## 0.2.21`. All 8 version headings of the PRD table match (lines 8972, 8838, 8796, 8243, 8203, 7955, 6500, 1245). A search for `additionalContext`, `context_window_size`, and the `compact` source gives 0 lines, so the 3 gaps are real. |
| FR-05 | Other adapters keep `minimumVersion: null`; `doctor` still warns for them | No other adapter file in the diff; default `null` at `version-probes.ts:10` | TC-01 (`null` for every other adapter); `tests/unit/doctor-service.test.ts` (null floor gives the warning, adapter-agnostic) | conformant | The doctor clause rests on the unchanged core service, which reads only `support.minimumVersion`. |
| NFR-01 | Doctor JSON schema shape unchanged | No schema or contract change in the diff | TC-04 (`doctorReportSchema.parse`), TC-08 | conformant | `npm run schemas:check` exit 0. |
| NFR-02 | No new process call | `adapter.ts:33` reuses the existing `claude --version` probe | diff review | conformant | The diff adds no `runner.run` or `discover` call. |
| NFR-03 | One named constant in `src/infrastructure/harnesses/claude-code/` | `capabilities.ts:4` | TC-01 imports the constant | conformant | `rg -n "2\.1\.97" src` gives 1 line: `capabilities.ts:4`. |
| TC-01..TC-06 | Listed scenarios | see rows above | listed suites | conformant | see Executed validations |
| TC-07 | Research line | `harness-integrations.md:69` | diff review | conformant | see FR-04 |
| TC-08 | Schema currency | — | `npm run schemas:check` | conformant | exit 0 |
| Manual acceptance (TechSpec) | Built `doctor` with `claude` ≥ 2.1.97 shows no floor warning | — | manual | conformant | `claude --version` gives `2.1.306 (Claude Code)`. `node dist/src/cli/main.js doctor --json`: exit 0, `status: healthy`, `exitCode: 0`. Text `doctor`: exit 0, 0 lines with `VERSION_FLOOR`. |
| codereview_01/CR-01 (T02.1) | TC-05 test name cites `TC-05` | `linked-project-root-lifecycle.test.ts:48` | same suite | conformant | `rg -n "TC-05"` gives 1 line (48). Suite count unchanged. |
| codereview_01 limitation, research text (T02.2) | Line 69 names the DEC-03 edge | `harness-integrations.md:69` | diff review | conformant | Text: "quando o detecta (sem detecção não há sonda de versão, e o aviso continua)". This matches `detection-collector.ts:13`. |
| codereview_01 limitation, task artifact (T02.3) | `done/task_01.md` names the real built entry point | `done/task_01.md:59` | — | conformant | Text: "`node dist/src/cli/main.js doctor` (or the package bin)". |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (no comments, except for a reason the code cannot express) | OK | `capabilities.ts:3`: 1 comment names the changelog source of a harness fact. The code cannot express that reason. |
| `javascript-typescript.md` | OK | `npm run lint` exit 0; `npm run typecheck` exit 0 |
| `node.md` | OK | No new process, path, or I/O code |
| `tests.md` (ID in name, repeatable, in-process doctor with fakes) | OK | All 6 TechSpec test scenarios cite their ID in the test name: TC-01 (`adapter-version-probes.test.ts:25`), TC-02 (`:54`), TC-03 (`:59`), TC-04 (`init-remove-footprint.test.ts:58`), TC-05 (`linked-project-root-lifecycle.test.ts:48`), TC-06 (`e2e-09.test.ts:61`). In-process tests use `fakeProcessRunner`. |
| `harness-adapters.md` (Claude facts stay in the adapter; research section updated in the same change; gate on documented version) | OK | Constant in `claude-code/capabilities.ts`; `harness-integrations.md:69` updated; changelog verified again in this review |
| `cli-output.md` | OK | No change to streams, exit-code constants, or messages; only values change |
| `file-changes.md` | N/A | No user file written |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' <6 TS diff files>` | 0 new of 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <6 TS diff files>` | 0 new of 0 | OK |
| QA-03 | File size ≤ 100 lines | reservation | `rg -c -H '^' <6 TS diff files>` | 0 of 6 (`adapter.ts` 92, `init-remove-footprint.test.ts` 74, `e2e-09.test.ts` 68, `adapter-version-probes.test.ts` 68, `linked-project-root-lifecycle.test.ts` 58, `capabilities.ts` 11) | OK |

- Terrain baseline: applied from the TechSpec for the 2 `src` files (`adapter.ts` 92 lines, `capabilities.ts` 8 lines). The 4 test files have no baseline row. All 4 are under 100 lines now, so the gap does not change a result.
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 0 (codereview_01 CR-01 is resolved)
- Suggested escalation: no trigger fired (0 reservations; largest touched file 92 lines; no duplication found)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 constant in `capabilities.ts` with 1-line comment | YES | `capabilities.ts:3-4`; `MODS_MINIMUM_CLAUDE_VERSION` unchanged |
| DEC-02 `probeVersion` passes the floor | YES | `adapter.ts:33` |
| DEC-03 no change when Claude Code is not detected | YES | `detection-collector.ts:13` unchanged; no core change in the diff; research line 69 now states the edge |
| DEC-04 TC-01 expects the constant for `claude-code`, `null` for the rest | YES | `adapter-version-probes.test.ts:28-29` |
| DEC-05 tests stop asserting the floor warning and do not fix exit code 1 | PARTIAL (documented refinement, no defect) | `e2e-09` (real runner) asserts the process exit code equal to `report.exitCode` (`e2e-09.test.ts:34,41`), as DEC-05 says. The 2 in-process tests assert `healthy` and exit 0 (`init-remove-footprint.test.ts:63`; `linked-project-root-lifecycle.test.ts:24`). The T01 handoff records this refinement: the fake runner makes the result deterministic. This review ran the 2 suites again with `CLAUDE_CONFIG_DIR` set to an empty folder and to a folder whose `settings.json` has a `statusLine` command. Both runs pass 4/4. The refinement adds no machine dependency. H-03 saw the codereview_01 assessment and asked for no change. |
| Errors and edges: probe timeout, missing executable, or malformed output carry the floor and add no finding | YES | `version-probes.ts:13,24,28`; an `unknown` probe keeps `supported` capabilities (`support-service.ts:9-14`) and no limitation (`:29-33`), as the TechSpec states |
| Contracts and data: no `doctor --json` shape change | YES | `schemas:check` exit 0; TC-04 schema parse |
| Floor value 2.1.97 = highest changelog version of the registered mechanisms | YES | Changelog line 6500 under `## 2.1.97`: "Added `refreshInterval` status line setting…" |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | T01.1–T01.5 checked. The handoff lists 7 changed files, which equal the reviewable set. This review ran the checks again. |
| T02 (correction of codereview_01) | `codereview_01/done/task_02.md` | COMPLETE | T02.1–T02.3 checked. The handoff lists 3 changed files. This review verified each change at its line (see the matrix). |

## Executed validations

- Profile and scope: CLI command `doctor`. 1 built-CLI e2e (`tests/bench/e2e-09.test.ts`) per the TechSpec. CLI QA does not run (H-02).
- Validated state: worktree on base `419c0bd` with the 7-file diff, after T01 and T02. Windows 11 Pro 10.0.26200, Node v24.20.0, Git Bash, local `claude` 2.1.306.
- Reused evidence: none. This review ran every check again. It did not rely on the T02 handoff statement that the earlier evidence stays valid.
- Manual acceptance: done in this repository with the built CLI (see the matrix).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | rules |
| `npm run typecheck` | passed (exit 0) | rules |
| `npm run schemas:check` | passed (exit 0) | NFR-01, TC-08 |
| `npm run build` | passed (exit 0) | TC-06 prerequisite |
| `npx vitest run tests/integration/adapter-version-probes.test.ts tests/integration/init-remove-footprint.test.ts tests/integration/linked-project-root-lifecycle.test.ts tests/unit/doctor-service.test.ts` | passed: 4 files, 19 tests | FR-01, FR-02, FR-03, FR-05, TC-01..TC-05, CR-01 |
| `npx vitest run --config vitest.bench.config.ts tests/bench/e2e-09.test.ts` | passed: 2/2 (quick-start 16.96 s) | FR-02, TC-06 |
| `npm run coverage` | passed: 272 files, 1432 passed, 1 skipped; lines 96.11%, branches 92.87%, functions 97.15%; 132 s wall time | all; 80% gate; 180 s budget |
| `node dist/src/cli/main.js doctor --json` and `doctor` (this repository) | exit 0, `healthy`, `minimumVersion 2.1.97`, 0 `VERSION_FLOOR` lines | manual acceptance, FR-02 |
| `curl https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md` + heading lookup for the 8 PRD rows and the 3 gaps | 8 of 8 headings match; 0 entries for the 3 gaps | FR-04, TC-07 |
| `CLAUDE_CONFIG_DIR=<empty \| statusLine> npx vitest run <2 in-process doctor suites>` | 4/4 and 4/4 | DEC-05 determinism check |
| QA-01..QA-03 commands | 0 hits | quality profile |
| `rg -n "2\.1\.97" src` | 1 line: `capabilities.ts:4` | NFR-03 |
| `rg -n "TC-05" tests/integration/linked-project-root-lifecycle.test.ts` | 1 line (48) | codereview_01 CR-01 |

## Findings

No findings. No optional improvements.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `tests/integration/linked-project-root-lifecycle.test.ts:48`: the `it` name ends with `(TC-05)`. The suite passes with the same test count. |

The 2 wording limitations of codereview_01 are also closed (H-03, T02):

- Research text: `harness-integrations.md:69` now says that the warning stays when Claude Code is not detected (DEC-03).
- Task artifact: `done/task_01.md:59` now names `node dist/src/cli/main.js`.

## Limitations and open items

- Platforms: this review ran on Windows only. Linux and macOS are left to CI, as the TechSpec says. This does not change the status, because the diff changes no path or process code (NFR-02).
- Approved-source hashes: `prd.md` and `techspec.md` match `approved_sources`. `tasks.md` and `done/task_01.md` do not match the H-02 hashes. The State tick, the T01 Handoff, the move to `done/`, and the T02.3 path fix explain the change. The files are untracked, so this review cannot diff them against the approved versions. Changes beyond state, handoff, and the T02.3 line are not verifiable.
- Snapshot header is behind: `covers_through: T01` and `next_step: codereview_01`, but `codereview_01/` and its `done/task_02.md` exist. The header `worktree` says 8 changed files; `git status` shows 9 tracked changes (the extra one is the excluded `.gitignore` block). By `load.md`, this review treated the next step brief as stale and used no snapshot entry as evidence. `O-01` is closed by its own `until` condition.
- Pre-existing machine dependency (from codereview_01, not introduced by this feature): an invalid user `settings.json` makes `init --yes` exit 1 in 2 in-process tests that the diff did not change. This review did not run that variant again. No decision is required here.
- PRD assumptions (3 changelog gaps) stay open by decision H-02. This review did not run a live test of Claude Code 2.1.97 (out of scope in the PRD).
- Observation, not a finding: an `unknown` probe can occur when the project files show Claude Code but `claude` is not on `PATH` or times out. Before this feature, that case gave the floor warning. Now it gives full support and no limitation. The TechSpec section "Errors, security, and recovery" states this behavior, and H-02 approved it.
- `workflow.md`: this review recorded nothing there. No block requires a workflow entry.

## Conclusion

The diff meets all FR-01..FR-05 and NFR-01..NFR-03 obligations. All 5 TechSpec decisions are implemented. DEC-05 has a documented refinement, and this review checked it for determinism again. T01 and the correction task T02 are complete. The codereview_01 finding CR-01 is resolved, and its 2 wording limitations are closed. This review ran lint, typecheck, schema check, build, the touched suites, the built-CLI e2e, and full coverage with 96.11% lines. All pass. The manual acceptance in this repository passes. The quality profile has 0 hits. The changelog evidence for 2.1.97 matches the live source. Status: APPROVED.
