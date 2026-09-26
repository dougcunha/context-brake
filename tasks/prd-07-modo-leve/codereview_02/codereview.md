# Code review report — prd-07-modo-leve

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `c3fb6a8..worktree`. This covers the uncommitted and untracked changes under `src/`, `tests/`, `schemas/`, and `README.md`, including the codereview_01 corrections T07–T10. The dogfood install changes that were already in the worktree are excluded, as `workflow.md#Milestone History` records: `.agents/`, `.context-brake/`, `.gitignore`, and `context-brake.config.json`.
- Previous review: `codereview_01/codereview.md` (REJECTED)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-07-modo-leve/prd.md` (sha256 `2b8f0f33…`, matches `DEC-HIL-02`) | read |
| TechSpec | `tasks/prd-07-modo-leve/techspec.md` (sha256 `189cbcb2…`, matches `DEC-HIL-02`) | read |
| Manifest | `tasks/prd-07-modo-leve/tasks.md` | read. Its hash differs from the approved one only because the `State` and `Problems and solutions` sections were updated during execution, as codereview_01 already recorded. |
| Implementation | `git diff c3fb6a8` plus the untracked files (50 TypeScript files); handoffs `done/task_01.md`–`task_06.md` and `codereview_01/done/task_07.md`–`task_10.md` | delimited |

## Coverage matrix

This matrix carries over the codereview_01 matrix and re-verifies only the rows the corrections touched. The code of the other rows did not change, and the full suite passes over the current state.

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01–FR-07 | Mode, no state reads, format, trigger, actions, no deny, no boot | unchanged since codereview_01 | unchanged, passing | conformant | codereview_01 matrix; `npm run coverage` passes |
| FR-08 | Minimal install footprint | `support-files.ts`, `installation-findings.ts` | `init-light-mode` | conformant | The CR-02 hint is fixed; see the previous findings |
| FR-09 | Full → light → full keeps user bytes; `.gitignore` rule | `removal-helper.ts:7-27` (`removeReferenceFromBody`, `stripTrailingEol`) | `reference-block-roundtrip` (6 cases), `init-light-switch` (no-EOL case), e2e | conformant | Built-CLI spot checks. A LF file with no trailing newline is identical after light, and after `--no-light` it equals a fresh full install. A CRLF file with no trailing newline is identical after light. |
| FR-10 | Rejected options | `init-config-updates.ts` | `init-light-arguments`, `init-light-mode` | conformant | Spot check: `--snapshot-command` in light mode and `--light --no-light` both exit 64 |
| FR-11–FR-13 | Doctor light checks, JSON, `wrap`/`run` | unchanged | unchanged, passing | conformant | codereview_01 matrix |
| FR-14 | Active sessions in doctor | `active-sessions.ts`, `doctor-sessions-text.ts` | `active-sessions` (TC-16), `doctor-active-sessions` (TC-17, 3 cases) | conformant | The unknown-usage text is now asserted (OI-03) |
| NFR-01 | Byte-identical outside light mode | `installation-builder.ts` (`inSchemaOrder`), `removal-helper.ts`, `text.ts:38` (`planHint` defaults to `true`) | existing suites; `init-light-mode` "keeps the plan hint for a full install" | conformant, with recorded deviations | Full install output is unchanged (spot check). The T03 and T07 deviations await HIL 3; see the limitations. |
| NFR-02, NFR-04, NFR-05 | Hook I/O, block budget, doctor isolation | unchanged | unchanged, passing | conformant | codereview_01 matrix |
| NFR-03 | Cross-platform; symlinked instruction files | `removal-helper.ts` (string operations only), `realPath` | `init-light-switch` symlink case, CRLF round trip | not verifiable (Linux, macOS) | Passes on Windows. CI has not run on this diff. |
| OBJ-01–OBJ-05 | End-to-end outcomes | — | `e2e-light-mode` (TC-13) | conformant | e2e passes over the rebuilt `dist/` |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md`, `javascript-typescript.md`, `node.md` | OK | lint and typecheck pass; no comments added; touched files ≤ 100 lines (`removal-helper.ts` 90, `text.ts` 98, `init.ts` 95) |
| `tests.md` | OK | New cases sit in existing process-lane files; the round-trip test is a pure unit test |
| `file-changes.md` | OK | Removing the reference block now inverts insertion (`removal-helper.ts:19`); user bytes outside the markers are restored |
| `cli-output.md` | OK | `LIGHT_MODE_ASSET_KEPT` names the file and the fix (`support-files.ts:61`); the light `init` no longer suggests a plan |
| Architecture (core does not import `infrastructure` or `cli`) | OK | QA-04 has no hits |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | TechSpec command over 50 changed TS files | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | same | 0 | OK |
| QA-03 | Empty catch | blocking | same | 0 | OK |
| QA-04 | Core importing `infrastructure` or `cli` | blocking | over the `src/core/` subset | 0 | OK |
| QA-05 | stdout on hook paths | blocking | over `hook_files` | 0 | OK |
| QA-06 | Sync file API in in-process code | blocking | over `in_process_files` | 0 | OK |
| QA-07 | Clock or randomness in core | reservation | over the `src/core/` subset | 0 | OK |
| QA-08 | 4+ parameters | reservation | same | 1 (`tests/helpers/light-world.ts:24`) | OK: false positive, the same as in codereview_01 (the commas in `Record<string, string>`) |
| QA-09 | File above 100 lines | reservation | same | 1 aggravated (`tests/test-lanes.ts`: 103 → 106) | reservation (OI-01 below; codereview_01/OI-02, not taken by `DEC-CORR-01`) |

- Terrain baseline: applied from the TechSpec. `tests/test-lanes.ts` was measured at `c3fb6a8` (103 lines), as in codereview_01.
- Hits discounted by baseline: 0.
- Reservations accumulated in the feature: 1 (QA-09).
- Suggested escalation: no trigger fired. There is 1 reservation, against a threshold of 8+; no touched file is above 200 lines; and no duplication appears in 3+ places.

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01–DEC-07, DEC-09–DEC-12 | YES | Unchanged since codereview_01. DEC-09 and DEC-12 are equivalent variants, as recorded there. |
| DEC-08 | YES | The instruction-block removal it relies on now restores the original bytes (T07). The kept modified protocol tells the user how to return to full mode (T09); `UNMANAGED_PROTOCOL_CONFLICT` itself is unchanged, to keep full-mode output (NFR-01). |
| Contracts (`doctor --json`, text, manifest) | YES | `schemas:check` passes; the finding code, severity, and scope of `LIGHT_MODE_ASSET_KEPT` are unchanged |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01–T06 | `done/task_01.md`–`task_06.md` | COMPLETE | Verified in codereview_01. T03's open defect is closed by T07. |
| T07 | `codereview_01/done/task_07.md` | COMPLETE | `removeReferenceFromBody` inverts insertion; 6 round-trip cases; TC-08 no-EOL case |
| T08 | `codereview_01/done/task_08.md` | COMPLETE | `planHint` option; two `init-light-mode` cases |
| T09 | `codereview_01/done/task_09.md` | COMPLETE | Remediation text, README sentence, and test assertion |
| T10 | `codereview_01/done/task_10.md` | COMPLETE | Third TC-17 case (reset, `usage: null`, text line) |

## Executed validations

- Profile and scope: the CLI and hook process, the in-process plugin, and the `init`, `doctor`, `run`, `wrap`, and `remove` commands. End-to-end tests run the built CLI against temporary fixture repositories, per `AGENTS.md`.
- Validated state: worktree at `c3fb6a8` plus the feature diff and the T07–T10 corrections, with `dist/` rebuilt in this session, on Windows 11 with Node 24.
- Reused evidence: none. This session reran every command.
- Manual acceptance: optional (TechSpec). It is pending with the user.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | all |
| `npm run typecheck` | passed | all |
| `npm run lint` | passed | code standards |
| `npm run schemas:check` | passed | FR-12, FR-14, TC-15 |
| `npm run dependencies:check` | passed | — |
| `npm run coverage` | passed: 280 files; 1,775 passed, 3 skipped, 0 failed; 95.56% statements, 91.32% branches, 96.46% functions, 95.56% lines | TC-01–TC-17, OBJ-04 |
| `npm run package:smoke` | passed | packaging |
| Built CLI: `init` → `init --light` → `init --no-light` with `CLAUDE.md` = `# Project\nrules` (LF) | passed: identical after light (`cmp`); after `--no-light`, equal to a fresh full install | FR-09 (codereview_01/CR-01) |
| Built CLI: the same file in CRLF, full → light | passed: identical | FR-09, NFR-03 |
| Built CLI: `init` → `remove` with the LF file without a trailing newline | passed: identical | NFR-01 deviation (see limitations) |
| Built CLI: `init --light --statusline-bridge --yes`, and a full `init --yes` | passed: light mode prints no plan hint; the full install still prints it | codereview_01/CR-02, NFR-01 |
| Built CLI: an edited protocol, then `init --light`, `init --no-light`, delete the file, `init --no-light` | passed: the new remediation is shown. `--no-light` exits 2 before the deletion and 0 after it, and the protocol is recreated. | codereview_01/OI-01, DEC-08 |
| Built CLI: `--snapshot-command` in light mode, `--light --no-light` | passed (exit 64) | FR-10 |

## Findings

No new findings.

### Optional improvements

| ID | Source | Evidence | Suggestion |
| --- | --- | --- | --- |
| OI-01 | QA-09 (reservation); codereview_01/OI-02 | `tests/test-lanes.ts` grows from 103 to 106 lines. `DEC-CORR-01` left it out of correction round 1. | Split the lane lists into their own module at the next change to this file |

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_01/CR-01 | resolved | `removal-helper.ts:19` strips the second EOL when the block ends the file. `reference-block-roundtrip.test.ts` has 6/6 cases, `init-light-switch.test.ts:60-75` has the no-EOL case, and the built-CLI `cmp` passes for LF and CRLF. |
| codereview_01/CR-02 | resolved | `init.ts:87-88` passes `planHint: false` when `isLightModeInEffect`, and `text.ts:38` guards the hint. `init-light-mode.test.ts:49-58` covers both modes, and the built-CLI spot check confirms it. |
| codereview_01/OI-01 | resolved | `support-files.ts:61` remediation. The README (`### Light Mode`) documents the step, `init-light-switch.test.ts:35` asserts it, and the built CLI confirms that following it lets `--no-light` exit 0. |
| codereview_01/OI-02 | persistent (not taken by `DEC-CORR-01`) | `tests/test-lanes.ts` has 106 lines; reported here as OI-01 |
| codereview_01/OI-03 | resolved | `doctor-active-sessions.test.ts:44-49` asserts `usage: null` and the `usage unknown since last reset` text |

## Limitations and open items

- NFR-01 deviations that need acceptance at HIL 3. All three are bug fixes, and no `DEC` covers them:
  1. `inSchemaOrder` (`installation-builder.ts`) writes `delegatedSnapshot` before `runner` on the first delegated `init`, where PRD-06 wrote it after `runner`. After a second `init`, the steady state is byte-identical to before.
  2. When the block ends a file that has a trailing newline, `remove` now restores the original bytes instead of leaving a blank line (T03).
  3. When the block ends a file that has no trailing newline, `remove` now restores the original bytes instead of adding a newline (T07).
- NFR-03 is not verifiable on Linux and macOS. CI has not run on this uncommitted diff, and running it needs a commit and a push, which the user has not authorized. The changed removal logic uses only string operations, and the CRLF case passes.
- Independence: this review ran after `/clear`, in a context that authored no code. The host kept the same session ID (`session_01TBeDgaQbko97hrGYSbmGig`) that planned and applied the corrections before the clear.
- The optional manual acceptance in a real Claude Code session is pending with the user.
- Accepted risk, unchanged: with a config that cannot be parsed, the failure policy falls back to plan mode and can deny in `CRITICAL`.
- Wording only: the PRD places the ledgers in `.context-brake/sessions/`, but the real path is `.context-brake/runtime/sessions/`.

## Conclusion

Every obligation in the PRD and TechSpec is conformant. Tasks T01–T10 are complete, and the full suite, schemas, packaging, and built-CLI spot checks pass. The two codereview_01 findings and the two optional improvements the user chose are resolved. No blocking profile hit remains. The single profile reservation (QA-09, `tests/test-lanes.ts`) remains as an optional improvement that the user already left out of round 1. Status: APPROVED WITH RESERVATIONS. The NFR-01 deviations, the Linux and macOS evidence, and the optional manual acceptance go to HIL 3.
