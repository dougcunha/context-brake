# Code review report — Verified minimum version for Claude Code (prd-22)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `419c0bd328b2cd209ed98846e6b50b73ef4664fd..worktree` (uncommitted, unstaged changes; no staged or new code files)
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-22-claude-code-version-floor/prd.md` | read; sha256 matches `checkpoint.json` `approved_sources` (H-02) |
| TechSpec | `tasks/prd-22-claude-code-version-floor/techspec.md` | read; sha256 matches `approved_sources` (H-02) |
| Manifest | `tasks/prd-22-claude-code-version-floor/tasks.md` | read; link `done/task_01.md` resolves; State `[x] T01` |
| Task | `tasks/prd-22-claude-code-version-floor/done/task_01.md` | read; all 5 work items checked; handoff present |
| Workflow | `tasks/prd-22-claude-code-version-floor/workflow.md` | read; H-00, H-01, H-02 |
| Snapshot | `tasks/prd-22-claude-code-version-floor/context-snapshot.md` | header, next step brief, open threads, and `on-run` entries used (independent-stage filter) |
| Implementation | `git diff 419c0bd` over `src/`, `tests/`, `docs/` | delimited |

Reviewable set (7 files):

- `src/infrastructure/harnesses/claude-code/capabilities.ts`
- `src/infrastructure/harnesses/claude-code/adapter.ts`
- `docs/research/harness-integrations.md`
- `tests/integration/adapter-version-probes.test.ts`
- `tests/integration/init-remove-footprint.test.ts`
- `tests/integration/linked-project-root-lifecycle.test.ts`
- `tests/bench/e2e-09.test.ts`

Excluded from the reviewable set. `workflow.md#context` declares these changes out of scope:

- `.gitignore`: the `# >>> context-brake` managed block that `context-brake init` writes.
- `tasks/triage-log.jsonl`: the triage line of H-00.
- `tasks/prd-21-manual-handoff-command/`: another feature.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Claude Code probe reports `minimumVersion: "2.1.97"` | `capabilities.ts:4` `CLAUDE_MINIMUM_VERSION`; `adapter.ts:33` `probeVersion` passes it to `probeExecutableVersion` | TC-01, TC-02 in `adapter-version-probes.test.ts:25-31,54-57` | conformant | Suite passed 7/7. `version-probes.ts:13,24,28` carry the floor on every return path. |
| FR-02 | `doctor` emits no `VERSION_FLOOR_UNVERIFIED` for `claude-code`; `support.minimumVersion` is `"2.1.97"` | No core change: `support-service.ts:61` copies the floor; `doctor-service.ts:39-40` returns `null` | TC-04 `init-remove-footprint.test.ts:58-73`; TC-05 `linked-project-root-lifecycle.test.ts:23-26`; TC-06 `e2e-09.test.ts:28-43` | conformant | Suites passed. Built `doctor --json` in this repository: `healthy`, exit 0, `minimumVersion 2.1.97`, no floor finding. |
| FR-03 | Version below 2.1.97 is `old`; `post_tool_telemetry` and `session_boot` not guaranteed; limitation names 2.1.97 | Existing `gatedState` and `versionImpact` (`support-service.ts:9-27`) | TC-03 `adapter-version-probes.test.ts:59-67` | conformant | Test asserts `status: 'old'`, no `supported` capability, both limitations, and text `older than minimum 2.1.97`. |
| FR-04 | Research line names 2.1.97, mechanism table, source URL, date, 3 gaps | `docs/research/harness-integrations.md:69` | TC-07 (diff review) | conformant | All 5 elements present. This review fetched the changelog again on 2026-10-21 (9322 lines, 0.2.21 to 2.1.306). All 8 version headings of the PRD table match. |
| FR-05 | Other adapters keep `minimumVersion: null`; `doctor` still warns for them | No other adapter file in the diff; `probeExecutableVersion` default `null` (`version-probes.ts:10`) | TC-01 (null for every other adapter); `tests/unit/doctor-service.test.ts:41-50` (null floor gives exactly 1 warning, adapter-agnostic service) | conformant | The doctor clause rests on the unchanged core service, which uses only `support.minimumVersion`. |
| NFR-01 | Doctor JSON schema shape unchanged | No schema or contract change in the diff | TC-04 (`doctorReportSchema.parse`), TC-08 | conformant | `npm run schemas:check` exit 0. |
| NFR-02 | No new process call | `adapter.ts:33` reuses the existing `claude --version` probe | diff review | conformant | The diff adds no `runner.run` or `discover` call. |
| NFR-03 | One named constant in `src/infrastructure/harnesses/claude-code/` | `capabilities.ts:4` | TC-01 imports the constant | conformant | `rg "2.1.97" src` gives only `capabilities.ts:4`. |
| TC-01..TC-06 | Listed scenarios | see rows above | listed suites | conformant | see Executed validations |
| TC-07 | Research line | `harness-integrations.md:69` | diff review | conformant | see FR-04 |
| TC-08 | Schema currency | — | `npm run schemas:check` | conformant | exit 0 |
| Manual acceptance (TechSpec) | Built `doctor` with `claude` ≥ 2.1.97 shows no floor warning | — | manual | conformant | `claude --version` gives `2.1.306 (Claude Code)`; `node dist/src/cli/main.js doctor --json` exit 0, `status: healthy`; text `doctor` exit 0, 0 occurrences of `VERSION_FLOOR`. |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (no comments, except for a reason the code cannot express) | OK | `capabilities.ts:3`: 1 comment names the changelog source of a harness fact. That is a reason the code cannot express. |
| `javascript-typescript.md` | OK | `npm run lint` exit 0; `npm run typecheck` exit 0 |
| `node.md` | OK | No new process, path, or I/O code |
| `tests.md` (ID in name, Repeatable, in-process doctor with fakes) | NOT OK (Low, CR-01) | Test names cite TC-01, TC-02, TC-03, TC-04, TC-06, FR-01, and FR-03. The TC-05 test does not cite TC-05: `rg -n "TC-05" tests/integration/linked-project-root-lifecycle.test.ts` gives 0 lines (`describe` at line 33, `it` at line 48). In-process tests use `fakeProcessRunner`. See the DEC-05 row for the determinism check. |
| `harness-adapters.md` (Claude facts stay in the adapter; research section updated in the same change; gate on documented version) | OK | Constant in `claude-code/capabilities.ts`; `harness-integrations.md:69` updated; changelog verified again |
| `cli-output.md` | OK | No change to streams, exit-code constants, or messages; only values change |
| `file-changes.md` | N/A | No user file written |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' <6 TS diff files>` | 0 new of 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <6 TS diff files>` | 0 new of 0 | OK |
| QA-03 | File size ≤ 100 lines | reservation | `rg -c -H '^' <6 TS diff files> \| awk -F: '$2 > 100'` | 0 of 6 (max `adapter.ts` 92, `init-remove-footprint.test.ts` 74) | OK |

- Terrain baseline: applied from the TechSpec for the 2 `src` files (`adapter.ts` 92 lines, `capabilities.ts` 8 lines). The 4 test files have no baseline row. All 4 are under 100 lines at base and now, so the gap does not change a result.
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired (0 reservations; largest touched file 92 lines; no duplication found)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 constant in `capabilities.ts` with 1-line comment | YES | `capabilities.ts:3-4`; `MODS_MINIMUM_CLAUDE_VERSION` unchanged |
| DEC-02 `probeVersion` passes the floor | YES | `adapter.ts:33` |
| DEC-03 no change when Claude Code is not detected | YES | `detection-collector.ts:13` unchanged; no core change in the diff |
| DEC-04 TC-01 expects the constant for `claude-code`, `null` for the rest | YES | `adapter-version-probes.test.ts:28-29` |
| DEC-05 tests stop asserting the floor warning and do not fix exit code 1 | PARTIAL | `e2e-09` (real runner) asserts exit code equal to `report.exitCode`, as DEC-05 says. The 2 in-process tests assert `healthy` and exit 0 (`init-remove-footprint.test.ts:62,67`; `linked-project-root-lifecycle.test.ts:24`). The handoff records this refinement: the fake runner makes the result deterministic. This review checked that claim. The 2 suites pass with `CLAUDE_CONFIG_DIR` set to an empty folder and to a folder whose user `settings.json` has a `statusLine` command. With an invalid user `settings.json`, 2 tests fail at the `init --yes` exit code (`init-remove-footprint.test.ts:33`, `linked-project-root-lifecycle.test.ts:51`). These assertions are not in the diff, and they fail before any new doctor assertion. TC-04 passes in that condition. The refinement is stricter than the text and adds no new machine dependency. |
| Contracts and data: no `doctor --json` shape change | YES | `schemas:check` exit 0; TC-04 schema parse |
| Floor value 2.1.97 = highest changelog version of the registered mechanisms | YES | Changelog line 6500 (`## 2.1.97`): "Added `refreshInterval` status line setting…". The adapter does not set `refreshInterval` itself. It copies the option from the previous status line into the bridge entry (`statusline-settings.ts:14,64-67`; `statusline-planner.ts:54,68`). If the floor came from mechanisms the adapter writes, it would be 2.1.6. The H-01 and H-02 floor is therefore conservative. It cannot add an over-claim. |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | T01.1–T01.5 checked. Handoff lists 7 changed files, which equal the reviewable set. This review ran the checks the handoff lists again; see below. |

## Executed validations

- Profile and scope: CLI command `doctor`. 1 built-CLI e2e (`tests/bench/e2e-09.test.ts`) per the TechSpec. CLI QA does not run (H-02).
- Validated state: worktree on base `419c0bd` with the 7-file diff. Windows 11 Pro 10.0.26200, Node v24.20.0, Git Bash. Local `claude` 2.1.306.
- Reused evidence: none. This review ran every check again.
- Manual acceptance: done in this repository with the built CLI (see the matrix).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | rules |
| `npm run typecheck` | passed (exit 0) | rules |
| `npm run schemas:check` | passed (exit 0) | NFR-01, TC-08 |
| `npm run build` (+ `npx tsc -p tsconfig.json`, exit 0) | passed | TC-06 prerequisite |
| `npx vitest run tests/integration/adapter-version-probes.test.ts tests/integration/init-remove-footprint.test.ts tests/integration/linked-project-root-lifecycle.test.ts tests/unit/doctor-service.test.ts` | passed, 4 files, 19 tests | FR-01, FR-02, FR-03, FR-05, TC-01..TC-05 |
| `npx vitest run --config vitest.bench.config.ts tests/bench/e2e-09.test.ts` | passed, 2/2 (quick-start 10.7 s) | FR-02, TC-06 |
| `npm run coverage` | passed: 272 files, 1432 passed, 1 skipped; lines 96.11%, branches 92.87%, functions 97.15%; 124.65 s | all; 80% gate; 180 s budget |
| `node dist/src/cli/main.js doctor --json` and `doctor` (this repository) | exit 0, `healthy`, `minimumVersion 2.1.97`, 0 `VERSION_FLOOR` lines | manual acceptance, FR-02 |
| `curl https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md` + heading lookup for the 8 PRD rows | all 8 headings match (1.0.38, 1.0.62, 1.0.71, 2.0.65, 2.0.70, 2.1.6, 2.1.97, 2.1.287) | FR-04, TC-07 |
| `CLAUDE_CONFIG_DIR=<empty \| statusLine \| invalid> npx vitest run <2 in-process doctor suites>` | 4/4, 4/4, 2 failed (both at the existing `init --yes` assertion) | DEC-05 determinism check |
| QA-01..QA-03 commands | 0 hits | quality profile |
| `rg -n "2\.1\.97" src` | 1 line: `capabilities.ts:4` | NFR-03 |
| `rg -n "TC-05" tests/integration/linked-project-root-lifecycle.test.ts` | 0 lines | `tests.md` Test Structure (CR-01) |

## Findings

No blocking findings. 1 optional improvement:

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low (optional improvement) | `.agents/rules/tests.md` Test Structure; TechSpec TC-05 | `tests/integration/linked-project-root-lifecycle.test.ts:33` (`describe('linked project root lifecycle (T11.4, CR-01)'`) and `:48` (`it` name). The diff changed the doctor assertions at lines 24 and 26 for TC-05. Neither name cites `TC-05`. | The traceability from the test to TC-05 exists only in `tasks.md` and the TechSpec, not in the test, as the rule requires. Behavior is not affected. | Add `TC-05` to the `it` name at line 48 or to the `describe` at line 33. |

## Limitations and open items

- Platforms: this review ran on Windows only. Linux and macOS are left to CI, as the TechSpec says. This does not change the status, because the diff changes no path or process code (NFR-02).
- Approved-source hashes: `checkpoint.json` `approved_sources` lists `tasks.md` and `task_01.md` with hashes from H-02. The current `tasks.md` and `done/task_01.md` have different hashes. The State tick, the Handoff, and the move to `done/` explain the change. The files are untracked, so this review cannot diff them against the approved versions. Changes beyond state and handoff are not verifiable.
- Pre-existing machine dependency (not introduced by this feature): an invalid user `settings.json` (through `CLAUDE_CONFIG_DIR` or the real home) makes `init --yes` exit 1 in 2 in-process tests that the diff did not change. This is outside this feature; no decision is required here.
- Research text: `harness-integrations.md:69` says that `doctor` stops emitting `VERSION_FLOOR_UNVERIFIED` for Claude Code. When Claude Code is not detected, the warning stays (DEC-03). The text omits this edge. This is an observation and has no impact on behavior.
- Task artifact: the manual check in `done/task_01.md` names `node dist/cli/index.js`. The built entry point is `dist/src/cli/main.js` (`package.json` `bin`). The task also allows "or the package bin". This review used the `bin` path.
- Snapshot: the file is under 8 KiB, so this review read it whole. This review did not use the `Decisions`, `Code map`, or `Learnings` sections as evidence. All judgments come from the sources and the code.
- PRD assumptions (3 changelog gaps) stay open by decision H-02. This review did not run a live test of Claude Code 2.1.97 (out of scope in the PRD).

## Conclusion

The diff meets all FR-01..FR-05 and NFR-01..NFR-03 obligations. All 5 TechSpec decisions are implemented. DEC-05 has a documented refinement, and this review checked it for determinism. T01 is complete. This review ran the TechSpec checks again: lint, typecheck, schema check, touched suites, built-CLI e2e, and full coverage with 96.11% lines. All pass. The manual acceptance in this repository passes. The quality profile has 0 hits. The changelog evidence for 2.1.97 matches the live source. 1 optional improvement remains: CR-01, a missing TC-05 identifier in a test name. Status: APPROVED WITH RESERVATIONS.
