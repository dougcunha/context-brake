# Code review report — prd-07-modo-leve

## Summary

- Status: REJECTED
- Git scope: `c3fb6a8..worktree` (uncommitted and untracked changes under `src/`, `tests/`, `schemas/`, `README.md`). The dogfood install changes that were already in the worktree are excluded, as `workflow.md#Milestone History` records: `.agents/`, `.context-brake/`, `.gitignore`, and `context-brake.config.json`.
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-07-modo-leve/prd.md` (sha256 `2b8f0f33…`, matches `DEC-HIL-02`) | read |
| TechSpec | `tasks/prd-07-modo-leve/techspec.md` (sha256 `189cbcb2…`, matches `DEC-HIL-02`) | read |
| Manifest | `tasks/prd-07-modo-leve/tasks.md` | read. The hash differs from the approved one because the `State` and `Problems and solutions` sections were updated during execution. |
| Implementation | `git diff c3fb6a8` (26 files changed) plus 30 new files; handoffs `done/task_01.md`–`done/task_06.md` | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Explicit light mode wins over plan and delegated | `light-mode.ts`, `configuration.ts` (`lightMode`), `zone-guidance.ts:20,25,58`, `light-mode-merge.ts` | `light-mode-config`, `light-guidance` (TC-03), `init-light-arguments` | conformant | Light is resolved first, with 0 port calls (TC-03) |
| FR-02 | No read or write of plan, checkpoint, or snapshot in light mode | `brake-engine.ts:38`, `snapshot-helper.ts#collectDoctorSnapshots` | `brake-engine-light` (port counters), `doctor-light-mode` (invalid plan not read) | conformant | Presence, validation, and boot counters are `[0,0,0]`; doctor leaves out the state paths |
| FR-03 | Block format `v2` and the same injection policy | `brake-engine.ts#telemetryDecision` (unchanged), `light-guidance.ts` | `light-guidance` (TC-02), `e2e-light-mode` | conformant | Only the `action` changes |
| FR-04 | Trigger zone `YELLOW`/`RED`, default `RED`, no command field | `light-mode.ts:4` (strict object) | `light-mode-config`, `light-mode-merge` | conformant | Spot check: `--snapshot-trigger BLUE` exits 64 with `lightMode.triggerZone` |
| FR-05 | Generic action texts per zone; forbidden substrings | `light-guidance.ts:9-19` | `light-guidance` (TC-02), e2e | conformant | Exact DEC-04 texts |
| FR-06 | No deny in any zone, including through the failure policy | `brake-engine.ts:38`, `failure-policy.ts:57`, `light-guidance.ts:24` | `brake-engine-light`, `failure-policy-light`, `runtime-light-mode` (Claude Code + OpenCode), e2e | conformant | A config that cannot be parsed falls back to plan mode (accepted risk, TechSpec) |
| FR-07 | No session-start injection | `brake-engine.ts:73`, `failure-policy.ts:65` | `brake-engine-light` (`new`/`clear`/`compact`), `failure-policy-light`, e2e `SessionStart` | conformant | — |
| FR-08 | Minimal install footprint; bridge when requested | `support-files.ts`, `installation-findings.ts:24` | `init-light-mode`, e2e inventory | conformant, with a UX defect | Spot check `init --light --statusline-bridge --yes` creates exactly the OBJ-01 set. See CR-02 for the post-install hint. |
| FR-09 | Full → light → full keeps user bytes; `.gitignore` rule | `support-files.ts#planLightSupport`, `removal-helper.ts:20` | `init-light-switch`, e2e round trip | **non-conformant** | CR-01: an instruction file without a trailing newline gains one byte |
| FR-10 | Rejected options; delegated section kept and inactive | `init-config-updates.ts`, `delegated-diagnostics.ts:17` | `init-light-arguments`, `init-light-mode`, `doctor-light-mode` | conformant | Spot check: `--snapshot-command` and `--light --no-light` exit 64 and name the option |
| FR-11 | Doctor light checks and leftovers | `project-file-checks.ts` | `doctor-light-mode` | conformant | The clean-install case asserts that the full-mode and leftover codes are absent, not the overall status (T04 open item). The overall status depends on host detection. |
| FR-12 | `checkpointMode` light in JSON; schema | `delegated-diagnostics.ts:10`, `diagnostics.ts` | `doctor-light-mode`, `schemas:check` | conformant | — |
| FR-13 | `wrap` works; `run` refuses | `run-preflight.ts:33`, `wrap` via guidance | `wrap-light-mode`, `run-light-mode` | conformant | — |
| FR-14 | Active sessions in doctor in every mode | `active-sessions.ts`, `runtime-state-reader.ts`, `doctor-sessions-text.ts` | `active-sessions` (TC-16), `doctor-active-sessions` (TC-17), e2e | conformant | Spot check: a reset session prints `usage unknown since last reset`, which no test asserts in text form (OI-03) |
| NFR-01 | Byte-identical outside light mode | `installation-builder.ts:35` (`inSchemaOrder`), `removal-helper.ts:20` | existing suites | conformant, with recorded deviations | Two T03 fixes change output outside light mode: the key order of the first delegated write, and `remove` on a block at the end of a file. See the limitations section for the HIL 3 decision. |
| NFR-02 | No plan, checkpoint, or Git read on hooks | `zone-guidance.ts`, `brake-engine.ts:38` | `brake-engine-light`, `light-guidance` | conformant | Runtime ports are lazy (`runtime-composition.ts:72-74`) |
| NFR-03 | Cross-platform; symlinked instruction files | `removal-helper.ts` (`realPath`) | `init-light-switch` symlink case | not verifiable (Linux, macOS) | Windows passed locally; CI has not run |
| NFR-04 | Block within 60 tokens and 220 characters | `light-guidance.ts` | `light-guidance` (TC-02) | conformant | — |
| NFR-05 | Doctor reads only the ledgers | `runtime-state-reader.ts#readLedgers` | `doctor-active-sessions` | conformant | Same files as before, with no new I/O kind |
| OBJ-01–OBJ-05 | End-to-end outcomes | — | `e2e-light-mode` (TC-13) | conformant, except FR-09 edge (CR-01) | — |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md`, `javascript-typescript.md`, `node.md` | OK | lint and typecheck pass; QA-01 to QA-08 have no hits |
| `tests.md` | OK | New process suites are registered in `tests/test-lanes.ts`, and the symlink case skips with a reason |
| `file-changes.md` | NOT OK | CR-01: removing the reference block does not restore a file without a trailing newline byte for byte |
| `cli-output.md` | OK, with a UX gap | Errors name the option and the fix. CR-02: the post-install hint contradicts light mode. |
| Architecture (core does not import `infrastructure` or `cli`) | OK | QA-04 has no hits; `active-sessions.ts` is pure and takes `now` |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over 49 changed TS files | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | same | 0 | OK |
| QA-03 | Empty catch | blocking | same | 0 | OK |
| QA-04 | Core importing `infrastructure` or `cli` | blocking | over the `src/core/` subset | 0 | OK |
| QA-05 | stdout on hook paths | blocking | over `hook_files` | 0 | OK |
| QA-06 | Sync file API in in-process code | blocking | over `in_process_files` | 0 | OK |
| QA-07 | Clock or randomness in core | reservation | over the `src/core/` subset | 0 | OK |
| QA-08 | 4+ parameters | reservation | same | 1 (`tests/helpers/light-world.ts:24`) | OK: false positive, since the regex counts the commas in `Record<string, string>` and the function has 2 parameters |
| QA-09 | File above 100 lines | reservation | same | 1 aggravated (`tests/test-lanes.ts`: 103 → 106) | pre-existing above the limit, aggravated by 3 lines (OI-02) |

- Terrain baseline: applied from the TechSpec. It covers `src/` targets only. `tests/test-lanes.ts` is outside it, and its baseline was measured here at `c3fb6a8`: 103 lines.
- Hits discounted by baseline: 0 (`tests/test-lanes.ts` was already above the limit, but this feature adds to it).
- Reservations accumulated in the feature: 1 (QA-09).
- Suggested escalation: no trigger fired. There is 1 reservation, against a threshold of 8+; no touched file is above 200 lines; and no duplication appears in 3+ places.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | Optional strict `lightMode`, and `schemaVersion` 1 |
| DEC-02 | YES | `SNAPSHOT_TRIGGER_ZONES` in `zones.ts` is re-exported; `configuration.ts` has 9 exported declarations |
| DEC-03 | YES | `zone-guidance.ts:20,25,58`. `resolveFailureGuidance` reaches light through `resolveGuidance` or `unionGuidance`. |
| DEC-04 | YES | `light-guidance.ts:9-19` |
| DEC-05 | YES | `brake-engine.ts:38`, `failure-policy.ts:57` |
| DEC-06 | YES | `brake-engine.ts:73`, `failure-policy.ts:65` |
| DEC-07 | YES | `init-config-updates.ts`; `init.ts` is 93 lines |
| DEC-08 | PARTIAL | Behavior matches, but the instruction-block removal it relies on leaves one extra byte (CR-01). A kept modified protocol blocks `init --no-light` (OI-01). |
| DEC-09 | YES, as an equivalent variant | `collectDoctorSnapshots` replaces the `includeState` option (T04 deviation, same effect) |
| DEC-10 | YES | `project-file-checks.ts`, `doctor-mode-text.ts`; `doctor-service.ts` is 97 lines |
| DEC-11 | YES | `run-preflight.ts:20,33` |
| DEC-12 | YES, with a variant | A ledger is excluded only when none of its timestamps parses (T05 deviation, more tolerant). `text.ts` is 98 lines. |
| Contracts (`doctor --json`, text, manifest) | YES | `schemas:check` passes; spot-check output matches `techspec.md#doctor-text` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | Config contract, merge, schema; 19 tests |
| T02 | `done/task_02.md` | COMPLETE | Runtime, failure policy, `run` refusal; 34 tests |
| T03 | `done/task_03.md` | COMPLETE, defect open | `init --light`/`--no-light`, 27 tests. The acceptance criterion "user bytes stay identical" fails for a file without a trailing newline (CR-01), and the tests use files with a trailing newline. |
| T04 | `done/task_04.md` | COMPLETE | Doctor light mode; 5 tests |
| T05 | `done/task_05.md` | COMPLETE | Active sessions; 9 tests |
| T06 | `done/task_06.md` | COMPLETE | e2e (2), README (1), lane registration |

## Executed validations

- Profile and scope: CLI and hook process, in-process plugin (OpenCode), `init`, `doctor`, `run`, and `wrap`. End-to-end runs the built CLI against temporary fixture repositories, per `AGENTS.md`.
- Validated state: worktree at `c3fb6a8` plus the feature diff, with `dist/` rebuilt in this session, on Windows 11 with Node 24.
- Reused evidence: none. This session reran every command.
- Manual acceptance: optional (TechSpec). It is pending with the user.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | all |
| `npm run typecheck` | passed | all |
| `npm run lint` | passed | code standards |
| `npm run schemas:check` | passed | FR-12, FR-14, TC-15 |
| `npm run dependencies:check` | passed | — |
| `npm run coverage` | passed: 279 files, 1,765 passed, 3 skipped, 0 failed; 95.54% statements, 91.01% branches, 96.46% functions, 95.54% lines | TC-01–TC-17, OBJ-04 |
| Built CLI spot check: `init` → `init --light` → `init --no-light` on `CLAUDE.md` = `# Project\nrules` (no trailing newline) | defect | FR-09 (CR-01) |
| Built CLI spot check: `init --light --statusline-bridge --yes` on a fresh repository | passed; the hint is wrong | FR-08, OBJ-01 (CR-02) |
| Built CLI spot check: `--snapshot-command` in light mode, `--light --no-light`, and `--snapshot-trigger BLUE` | passed (exit 64 with the option or field named) | FR-04, FR-10 |
| Built CLI spot check: a modified protocol, then `init --light`, then `init --no-light` | kept with `LIGHT_MODE_ASSET_KEPT`; `--no-light` exits 2 | DEC-08 (OI-01) |
| Built CLI spot check: `doctor` with a reset ledger in `.context-brake/runtime/sessions/claude-code/` | passed (`usage unknown since last reset`, JSON `usage: null`) | FR-14 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-09, `file-changes.md`, T03 acceptance | `src/core/services/removal-helper.ts:20`. Insertion (`instruction-service.ts:81-82`) adds two EOLs before the block and none after it when the file has no trailing newline. Removal strips one EOL from `before`, and when nothing follows the block it returns `before`, which still ends with the second EOL. Reproduced with the built CLI: `CLAUDE.md` = `# Project\nrules` becomes `# Project\nrules\n` after `init` then `init --light`. After `init --no-light`, `CLAUDE.md` differs from a fresh full install, because the block is followed by a newline it did not have before. | User content outside the markers changes by one byte, against FR-09's "igual byte a byte". `remove` has the same residue (pre-existing, and before T03 it left two bytes). | Make removal the inverse of insertion. When the block is the last thing in the file and no EOL follows the end marker, also strip the second EOL that insertion added before the block. Add TC-08 and removal cases for a file without a trailing newline, both LF and CRLF. |
| CR-02 | Low | PRD User experience ("a prévia diz que o modo leve … não gerencia plano ou checkpoint"), FR-08 | `src/cli/output/text.ts:38-40` prints `Next step: run context-brake plan init to create task plan.` after every applied `init` with changes, including `init --light` (seen in both spot checks) | The only post-install guidance in light mode tells the user to create a plan, which light mode ignores (FR-01, FR-02) | When the installed config has `lightMode`, print no plan hint, or a light-specific one. Assert it in `init-light-mode`. |

### Optional improvements

| ID | Source | Evidence | Suggestion |
| --- | --- | --- | --- |
| OI-01 | DEC-08, FR-09 rollback | `support-files.ts:52` keeps a modified protocol, and `installation-findings.ts:24` drops it from the manifest. The next `init --no-light` then hits `protocol-service.ts:64-65` `UNMANAGED_PROTOCOL_CONFLICT` (exit 2), whose remediation reads "Fix syntax or structure". | Say in the `LIGHT_MODE_ASSET_KEPT` remediation that the file must be deleted or moved before `--no-light`, or keep tracking the kept protocol so `--no-light` recognizes it. |
| OI-02 | QA-09 (reservation) | `tests/test-lanes.ts` grows from 103 to 106 lines | Split the lane lists into their own module at the next change to this file. |
| OI-03 | FR-14 text, T05 acceptance | No test asserts `usage unknown since last reset` or `(unknown session)` in the text output. The review verified the first by a spot check. | Add a null-usage entry to the TC-17 text fixture. |

## Limitations and open items

- NFR-01 deviations that need acceptance at HIL 3. Both are bug fixes recorded in the T03 handoff, and no `DEC` covers them:
  1. `inSchemaOrder` (`installation-builder.ts:35`) writes `delegatedSnapshot` before `runner` on the first delegated `init`, where PRD-06 wrote it after `runner`. The steady state after a second `init` is byte-identical to before, and the change fixes the PRD-06 non-idempotency.
  2. `remove` on a block at the end of a file with a trailing newline now restores the original bytes instead of adding a blank line.
- Linux and macOS are not verified. CI has not run on this diff (NFR-03).
- The optional manual acceptance in a real Claude Code session is pending with the user.
- Accepted risk, unchanged: with a config that cannot be parsed, the failure policy falls back to plan mode and can deny in `CRITICAL`.
- The PRD says the ledgers live in `.context-brake/sessions/`, but the real path is `.context-brake/runtime/sessions/`. The wording has no behavioral impact.

## Conclusion

The implementation covers every PRD obligation, and the quality profile has no blocking hit. One obligation is non-conformant: FR-09 requires byte-identical user content across full → light → full, and an instruction file without a trailing newline gains one byte (CR-01). The post-install hint of `init --light` also contradicts the light mode (CR-02). Both have a proven cause and a local fix within the approved contracts. Status: REJECTED, pending a correction round for CR-01 and CR-02; the optional improvements are for the user to decide.
