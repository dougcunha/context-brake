# Code review report — prd-06-modo-snapshot-delegado

## Summary

- Status: REJECTED
- Git scope: `3b94a9c..working tree` (uncommitted: 31 modified and 24 new files under `src/`, `tests/`, `schemas/`, `README.md`, `docs/research/`)
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-06-modo-snapshot-delegado/prd.md` (sha256 `7b9244ec…` = approved `DEC-HIL-01`) | read |
| TechSpec | `tasks/prd-06-modo-snapshot-delegado/techspec.md` (sha256 `302593c4…` = approved `DEC-HIL-02`) | read |
| Manifest | `tasks/prd-06-modo-snapshot-delegado/tasks.md` | read; hash differs from the HIL 2 record because of `State` and `Problems and solutions` updates during execution |
| Implementation | `git diff 3b94a9c` plus untracked files; handoffs in `done/task_01.md`–`done/task_05.md` | delimited |
| Snapshot | `context-snapshot.md` | loaded as an independent stage: header, next step brief, `Open threads`, `on-run` only |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Optional section; automatic mode | `configuration.ts:delegatedSnapshotSchema`; `zone-guidance.ts:resolveCheckpointMode`; `plan-presence.ts:NodePlanPresence` | `delegated-snapshot-config.test.ts`, `zone-guidance.test.ts`, `plan-presence.test.ts`, `runtime-delegated-snapshot.test.ts` (TC-10) | conformant | Presence checked per event; invalid-but-present plan stays `plan` |
| FR-02 | One-line command ≤ 200, trimmed | `configuration.ts:agentCommand` | `delegated-snapshot-config.test.ts`, `init-delegated-snapshot.test.ts` | conformant | Field path in `init` error via `delegated-snapshot-merge.ts:31` |
| FR-03 | Trigger zone YELLOW/RED, default RED | `delegated-guidance.ts:isAtOrAbove` | `zone-guidance.test.ts` | conformant | e2e asserts YELLOW block without the command |
| FR-04 | Delegated action without plan words | `delegated-guidance.ts:delegatedAction` | `zone-guidance.test.ts`, e2e | conformant | e2e `PLAN_WORDS` over all 12 blocks |
| FR-05 | Block stays v1 | `telemetry-block.ts` (`action` input only) | `zone-guidance.test.ts` | conformant | Same field order |
| FR-06 | CRITICAL allowlist (paths, skill, git, extras) | `delegated-guidance.ts:isDelegatedCallAllowed`; `path-pattern.ts`; `claude-code/runtime.ts:23` | `brake-engine-delegated.test.ts`, `runtime-delegated-snapshot.test.ts`, e2e | conformant | Allowed snapshot write and `Skill` pass in e2e; `src/app.ts` write denied |
| FR-07 | Delegated deny message | `delegated-guidance.ts:20-26` | `brake-engine-delegated.test.ts`, e2e | conformant | Matches DEC-05 format |
| FR-08 | Resume command on reset; nothing without it; plan boot does not run | `brake-engine.ts:178-179` | `brake-engine-delegated-lifecycle.test.ts` | **non-conformant** (failure path) | See CR-01 |
| FR-09 | `init` flags; protocol describes both paths | `init-arguments.ts`, `delegated-snapshot-merge.ts`, `delegated-protocol.ts` | `init-delegated-snapshot.test.ts`, `delegated-install-support.test.ts` | conformant | Protocol unchanged without section |
| FR-10 | Add/remove preserves user content and state files | `installation-builder.ts:applyDelegatedSnapshot` | `init-delegated-snapshot.test.ts` | conformant | Plan files kept after removal |
| FR-11 | `doctor` validates; no plan warning | `delegated-diagnostics.ts`, `doctor-service.ts:98` | `doctor-delegated-snapshot.test.ts` | conformant | Healthy without plan; protocol drift flagged |
| FR-12 | `wrap` in both modes; `run` hint | `wrap-telemetry.ts`, `run-preflight.ts:34` | `wrap-command.test.ts`, `run-command-preflight.test.ts` | conformant | Message cites delegated mode and `plan init` |
| FR-13 | `checkpointMode` in JSON | `diagnostics.ts:checkpointMode`, `report-service.ts` | `doctor-delegated-snapshot.test.ts`, e2e | conformant | Always present (`no_section` included), per DEC-09 |
| NFR-01 | Byte-identical without section | Optional key; guidance falls back to `planGuidance` | Existing suites unchanged (TC-06) | conformant with recorded exception | `doctor --json` gains `checkpointMode` always (FR-13/DEC-09; manifest `Problems and solutions` T04) |
| NFR-02 | Safe patterns; command never executed | `relativePath` reuse; command only embedded in text | `delegated-snapshot-config.test.ts`, `path-pattern.test.ts` | conformant | No exec path for the command |
| NFR-03 | ≤ 1 stat per event, only emitting paths | `brake-engine.ts:readGuidance` after zone/injection checks | `brake-engine-delegated-lifecycle.test.ts` (TC-07) | conformant | Engine path; see limitations for the failure path |
| NFR-04 | Cross-platform path comparison | Normalized repo-relative `/` paths + `path-pattern.ts` | `runtime-delegated-snapshot.test.ts` (absolute native path) | conformant | Windows verified locally; other OS via CI |
| NFR-05 | Block < 400 chars with 200-char command | `delegatedAction` | `zone-guidance.test.ts` | conformant | — |
| OBJ-01–OBJ-03 | End-to-end outcomes | — | `tests/e2e/e2e-delegated-snapshot.test.ts` (TC-14) | conformant on the normal path | OBJ-01 exception on the deadline path, CR-01 |
| OBJ-04 | Plan users unaffected | — | Full suite | conformant | 1,501 passed |
| DEC-07 | `Skill` payload verified and documented | `claude-code/runtime.ts:23`; `harness-integrations.md` Skills bullet | `pre-tool-use-skill.json` | conformant with open item | `tool_input.skill` observed, not documented (O-01) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| Hexagonal boundaries (`AGENTS.md`) | OK | QA-04 empty; `PlanPresence` port in `core/contracts/checkpoint-mode.ts`, adapter in `infrastructure/runtime/plan-presence.ts` |
| `harness-adapters.md` | OK | Mapping confined to `claude-code/runtime.ts`; research file updated |
| `file-changes.md` | OK | Config and protocol through the existing change plan and confirmation |
| `cli-output.md` | OK | Errors keep `CliArgumentError`/`RUN_PLAN_NOT_RUNNABLE` paths |
| `tests.md` | OK | Tests per TC; e2e runs the built CLI in temp dirs |
| `code-standards.md` / `javascript-typescript.md` | OK | Lint and typecheck pass; files ≤ 100 lines |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over 50 changed `src/`/`tests/` TS files | 0 | OK |
| QA-02 | `@ts-ignore`/`eslint-disable` | blocking | same | 0 | OK |
| QA-03 | Empty `catch` | blocking | same | 0 | OK |
| QA-04 | core → infrastructure/cli | blocking | over changed `src/core/**` | 0 | OK |
| QA-05 | Sync FS in in-process code | blocking | over `plan-presence.ts`, `zone-guidance.ts`, `runtime-composition.ts` | 0 | OK |
| QA-06 | stdout on hook paths | blocking | over `brake-engine.ts`, `zone-guidance.ts`, `claude-code/runtime.ts` | 0 | OK |
| QA-07 | 4+ parameters | reservation | over changed `src/` files (PCRE) | 0 | OK |
| QA-08 | File > 100 lines | reservation | line count over changed files | 0 (max 100: `init.ts`, `doctor-service.ts`, `process-hook-host.ts`) | OK |

- Terrain baseline: applied from TechSpec.
- Hits discounted by baseline: 0.
- Reservations accumulated in the feature: 0.
- Suggested escalation: no trigger fired.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | Optional key, `schemaVersion` 1, `DEFAULT_CONFIG` unchanged |
| DEC-02 | YES | `NodePlanPresence`: `ENOENT` → absent, other errors → present |
| DEC-03 | YES | `ZoneGuidance.actionFor`; `renderTelemetryBlock` takes `action` |
| DEC-04 | YES | Allowlist and matcher as specified; no validation-command exception |
| DEC-05 | YES | Deny text and union fallback in `zone-guidance.ts:unionGuidance` |
| DEC-06 | PARTIAL | Engine path correct; failure-policy deadline path still injects the plan boot omission (CR-01) |
| DEC-07 | YES | With O-01 open |
| DEC-08 | YES | Flags, merge semantics, protocol section, reference and `.gitignore` blocks unchanged |
| DEC-09 | YES | `checkpointMode`, both findings |
| DEC-10 | YES | Same code, extended message |
| DEC-11 | YES (deviation recorded) | `planPresence` port instead of a `readGuidance` callback; laziness preserved and proven by TC-07 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Config contract, matcher, schema; tests in a separate file for `max-lines` |
| T02 | `done/task_02.md` | COMPLETE | Guidance, engine, failure policy; `planPresence` deviation recorded |
| T03 | `done/task_03.md` | COMPLETE | Runtime wiring, `Skill` mapping, research update |
| T04 | `done/task_04.md` | COMPLETE | `init`, protocol, `doctor`, `run` |
| T05 | `done/task_05.md` | COMPLETE | e2e and README |

## Executed validations

- Profile and scope: hook process (Claude Code, via built CLI in e2e), in-process hosts through `composeRuntime`, CLI commands. No browser/UI per `AGENTS.md`.
- Validated state: working tree on `3b94a9c` with T01–T05 applied, Windows 11, local Node toolchain, run in this review session.
- Reused evidence: none for the gate; CI matrix for Linux/macOS not run here.
- Manual acceptance: optional per TechSpec; not run (O-01).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed | rules |
| `npm run typecheck` | passed | all |
| `npm run schemas:check` | passed | DEC-01, DEC-09 |
| `npm run build` | passed | TC-14 prerequisite |
| `npm run coverage` | passed: 237 files, 1,501 passed, 3 skipped (pre-existing); 95.35% lines, 90.03% branches, 96.92% functions | TC-01–TC-15 |
| QA-01–QA-08 sweeps | 0 hits | quality profile |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-08, OBJ-01, DEC-06 | `src/core/services/failure-policy.ts:57` — on `session_reset` with `DEADLINE_EXCEEDED` and session boot supported, `resolveFailure` returns `renderBootOmission()` (`boot-summary.ts:89`: "Validate the plan and checkpoint state before continuing.") regardless of mode. With `delegatedSnapshot` set and no plan file, a reset whose engine run passes the 1.5 s deadline injects plan-based boot text; without `resumeCommand` FR-08 requires nothing to be injected, and with it the resume text is lost. | In delegated mode, a slow `SessionStart` tells the agent to validate a plan and checkpoint that do not exist, contradicting FR-08 ("sem ele, nada é injetado"; plan boot does not run) and OBJ-01. Plan mode unaffected. | In `resolveFailure`, before returning the boot omission, resolve the mode tolerantly (`resolveFailureGuidance` or `resolveCheckpointMode` with a catch that keeps `plan`) and, when `delegated`, return `resumeText` as context or neutral. Add a unit case to `tests/unit/failure-policy-delegated.test.ts` for `session_reset` + `DEADLINE_EXCEEDED` with and without `resumeCommand`, and a plan-mode case proving the omission text is unchanged. |

## Limitations and open items

- O-01 (non-blocking): the Claude Code `Skill` `tool_input.skill` field is observed in the tool schema, not in the hooks reference. A real `PreToolUse` capture remains optional manual verification; a missing field fails safe (denied).
- NFR-03 on failure paths: when the engine fails after its own presence check, the failure policy may stat once more in the same `pre_tool` event. The engine path is proven by TC-07; not raised as a finding because the failure path is rare and still bounded (≤ 2).
- `doctor --json` always carries `checkpointMode`, an additive optional schema field required by FR-13/DEC-09; NFR-01 byte identity holds for config, protocol, and agent-facing text but not for that JSON document. Recorded in the manifest (T04).
- Linux and macOS were not run in this session; the CI matrix covers them.
- CLI QA skipped by `DEC-HIL-02`.

## Conclusion

The implementation covers every FR/NFR on the normal path, all tasks are complete with evidence, the quality profile is clean, and the full validation suite passes. One obligation is non-conformant on the failure path: the deadline boot omission ignores delegated mode (CR-01), so the status is REJECTED. The fix is local to `failure-policy.ts` and within the contracts approved at HIL 2.
