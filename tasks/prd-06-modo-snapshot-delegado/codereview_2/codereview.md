# Code review report — prd-06-modo-snapshot-delegado

## Summary

- Status: APPROVED
- Git scope: `3b94a9c..working tree` (uncommitted: 31 modified and 26 new files under `src/`, `tests/`, `schemas/`, `README.md`, `docs/research/`, and the feature folder)
- Previous review: `tasks/prd-06-modo-snapshot-delegado/codereview_1/codereview.md` (REJECTED, CR-01)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-06-modo-snapshot-delegado/prd.md` (approved `DEC-HIL-01`) | read (FR-08 re-read for CR-01) |
| TechSpec | `tasks/prd-06-modo-snapshot-delegado/techspec.md` (approved `DEC-HIL-02`) | read (DEC-05, DEC-06, quality profile, terrain baseline) |
| Manifest | `tasks/prd-06-modo-snapshot-delegado/tasks.md` | read |
| Correction | `codereview_1/done/task_06.md` (T06, CR-01) | read, including handoff |
| Implementation | `git diff 3b94a9c` plus untracked files | delimited. Only `src/core/services/failure-policy.ts` and `tests/unit/failure-policy-delegated-reset.test.ts` are newer than `codereview_1/codereview.md` (22:51, 2026-09-24): `find src tests schemas docs README.md package.json -newer`. All other files are the state review 1 judged. |
| Snapshot | `context-snapshot.md` | loaded as an independent stage: header, next step brief, `Open threads`, `on-run` only |

## Coverage matrix

Obligations whose implementation did not change since review 1 keep that review's evidence. The code is the same, and this session revalidated it with lint, typecheck, build, schemas, and the full suite.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01–FR-07 | Section, command, trigger, action, block v1, CRITICAL allowlist, deny message | unchanged since review 1 | unchanged suites, all passing | conformant | `codereview_1/codereview.md#coverage-matrix`; full suite green (below) |
| FR-08 | Resume command on reset; nothing without it; plan boot does not run in delegated mode; unchanged with the plan present | Engine: `brake-engine.ts:69`. Deadline failure path: `failure-policy.ts:56` → `deadlineBootDecision` (`:63-67`) through `resolveFailureGuidance` | `brake-engine-delegated-lifecycle.test.ts`; `failure-policy-delegated-reset.test.ts` (5 cases) | conformant | Both paths decide identically: `resumeText` as context, or `neutral`. With the plan present or no section, the result is `renderBootOmission()` exactly. With no section, presence is called 0 times. |
| FR-09–FR-13 | `init`, add/remove, `doctor`, `wrap`/`run`, `checkpointMode` | unchanged since review 1 | unchanged suites | conformant | `codereview_1/codereview.md#coverage-matrix` |
| NFR-01 | Byte-identical without section | `guidanceSources` passes `planPresence`; `resolveCheckpointMode` short-circuits without the section | `failure-policy-delegated-reset.test.ts` ("without the section … never checks") | conformant with recorded exception | `doctor --json` `checkpointMode` exception unchanged (FR-13/DEC-09) |
| NFR-02, NFR-04, NFR-05 | Safe patterns, cross-platform paths, block size | unchanged | unchanged | conformant | review 1 |
| NFR-03 | ≤ 1 stat per event, only on emitting paths | The deadline reset path now does one presence check, only with the section set. That path emits text, so it is an emitting path. | reset test counts calls | conformant | Same bound as the `pre_tool` failure path noted in review 1 |
| OBJ-01 | Delegated user never sees plan text | engine + deadline path | e2e TC-14; reset test | conformant | The CR-01 exception is closed |
| OBJ-02–OBJ-04 | End-to-end outcomes; plan users unaffected | unchanged | e2e TC-14; full suite | conformant | 1,506 passed |
| DEC-07 | `Skill` payload mapping | unchanged | `pre-tool-use-skill.json` | conformant with open item | O-01 |
| T06 | Correction contract for CR-01 | `failure-policy.ts` (95 lines, 11 exports = baseline) | 5 new cases | conformant | Every acceptance criterion in `codereview_1/done/task_06.md` is met |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| Hexagonal boundaries (`AGENTS.md`) | OK | `failure-policy.ts` imports only `core` modules; QA-04 empty |
| `code-standards.md` / `javascript-typescript.md` | OK | Private helpers, no new export, `npm run lint` and `npm run typecheck` pass |
| `tests.md` | OK | New suite 37 lines; names cite CR-01/FR-08/DEC-06/NFR-01; asserts exact values |
| `harness-adapters.md`, `file-changes.md`, `cli-output.md` | N/A for the correction | No adapter, user-file, or CLI output change since review 1 |

## Quality profile

Swept over the reviewable set changed since review 1 (`failure-policy.ts`, `failure-policy-delegated-reset.test.ts`). The rest of the set is unchanged and was 0 hits in review 1.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command | 0 | OK |
| QA-02 | `@ts-ignore`/`eslint-disable` | blocking | TechSpec command | 0 | OK |
| QA-03 | Empty `catch` | blocking | TechSpec command | 0 | OK. Existing `catch { return … }` blocks are not empty. |
| QA-04 | core → infrastructure/cli | blocking | TechSpec command | 0 | OK |
| QA-05 | Sync FS in in-process code | blocking | TechSpec command | 0 | OK |
| QA-06 | stdout on hook paths | blocking | TechSpec command | 0 | OK |
| QA-07 | 4+ parameters | reservation | TechSpec command (PCRE) | 0 | OK |
| QA-08 | File > 100 lines | reservation | line count | 0 (95 and 37) | OK |

- Terrain baseline: applied from TechSpec. `failure-policy.ts` had 87 lines and 11 exports, and the destination was "one internal change, no new export". It still has 11 exports.
- Hits discounted by baseline: 0.
- Reservations accumulated in the feature: 0.
- Suggested escalation: no trigger fired.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01–DEC-05, DEC-07–DEC-11 | YES | Unchanged since review 1 |
| DEC-06 | YES | Delegated reset on both the engine and deadline paths. The capability gate (`sessionBootSupported`) still applies first (`failure-policy.ts:56`). |
| DEC-05 (failure fallback) | YES | Unreadable presence → `unionGuidance`, mode `delegated` → resume text (`FailingPresence` case) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01–T05 | `done/task_01.md`–`done/task_05.md` | COMPLETE | Verified in review 1; files unchanged since |
| T06 | `codereview_1/done/task_06.md` | COMPLETE | Handoff matches the code. This review supplies the clean full-suite run that the handoff left open. |

## Executed validations

- Profile and scope: hook process through the built CLI in e2e, in-process hosts, CLI commands. No browser or UI, per `AGENTS.md`.
- Validated state: working tree on `3b94a9c` with T01–T06 applied, `dist/` rebuilt in this session, Windows 11, Node 24.19.0.
- Reused evidence: review 1's matrix for files unchanged since it. Nothing is reused for commands; every command below ran in this session.
- Manual acceptance: optional per TechSpec; not run (O-01).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed | rules |
| `npm run typecheck` | passed | all |
| `npm run build` | passed; `dist/src/core/services/failure-policy.js` contains `deadlineBootDecision` | TC-14 prerequisite |
| `npm run schemas:check` | passed | DEC-01, DEC-09 |
| `npm run coverage` (run 1) | 1 failed / 1,505 passed / 3 skipped: `tests/integration/boot-git-delivery.test.ts` "names both commits…" (PRD-03). The boot fell back to `Repository checks omitted: inspection_failed` under load. | — (see limitations) |
| `npx vitest run boot-git-delivery.test.ts e2e-run-stops.test.ts` ×3 | passed 3/3 (9 tests each) | flake triage |
| `npm run coverage` (run 2) | **passed**: 238 files, 1,506 passed, 3 skipped (pre-existing); 95.36% lines, 90.05% branches, 96.93% functions | TC-01–TC-15, T06 |
| QA-01–QA-08 sweeps | 0 hits | quality profile |

`failure-policy.ts` coverage: the new lines 56 and 63–70 are fully covered. The uncovered lines 45, 75–77, 80, and 92–94 are catch or fallback branches that predate the feature.

## Findings

No findings.

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_1/CR-01 | resolved | `failure-policy.ts:56,63-67` sends the deadline `session_reset` through `resolveFailureGuidance`. In delegated mode it returns `resumeText` or `neutral`; otherwise `renderBootOmission()` is unchanged. Proven by `tests/unit/failure-policy-delegated-reset.test.ts`: delegated with and without `resumeCommand`, unreadable presence, plan present, and no section with 0 presence calls. |

## Limitations and open items

- **Test stability outside prd-06 (non-blocking):** across three full runs (T06 handoff and this review), two different tests failed once each under full-suite load: `e2e-run-stops.test.ts` (PRD-04 runner) and `boot-git-delivery.test.ts` (PRD-03 git inspection timing out to `inspection_failed`). Neither touches code this feature changed: `git diff 3b94a9c` has no change under `src/infrastructure/git/`, `boot-reader.ts`, or the runner stop path. Both passed 3/3 alone, and the second full run was clean. Suggested follow-up for the owner of those PRDs: a stability item for load-sensitive timing in the process lane.
- **Stale build during T06 validation:** `dist/` was built at 22:42 and `failure-policy.ts` changed at 22:56, so the T06 handoff's full run exercised e2e against pre-correction output. This review rebuilt before its runs, so no evidence gap remains. No e2e case exercises the deadline path.
- O-01 (non-blocking, carried over): the Claude Code `Skill` `tool_input.skill` field is observed, not documented. A real `PreToolUse` capture remains optional manual verification. A missing field fails safe (denied).
- NFR-03 on failure paths: the deadline reset and `pre_tool` failure paths may stat after the engine already did in the same event (≤ 2, rare). This is unchanged in kind from review 1.
- `doctor --json` always carries `checkpointMode` (FR-13/DEC-09). This is the recorded NFR-01 exception.
- Linux and macOS were not run here; the CI matrix covers them.
- CLI QA was skipped by `DEC-HIL-02`.
- Independence: this review ran in a context cleared after correction round 1. It wrote no feature code, and it loaded the snapshot as an independent stage.

## Conclusion

CR-01 is resolved with a local change that stays within the contract and a targeted test. Every other obligation is in the same state review 1 judged conformant. The quality profile is clean, and the integrated suite passes on a rebuilt `dist/`. The status is APPROVED. The flow proceeds to HIL 3 acceptance, since CLI QA was skipped by `DEC-HIL-02`.
