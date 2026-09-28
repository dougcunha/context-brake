# Code review report — prd-08-modo-debug

## Summary

- Status: APPROVED WITH RESERVATIONS
- Git scope: `791defe2f6651f6595f701e7494c797cdfc58e81..working tree` (feature diff uncommitted; new files marked intent-to-add), limited to `src/`, `tests/`, `schemas/`, and `README.md`. Pre-existing changes listed in `workflow.md#Feature Summary` are excluded.
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-08-modo-debug/prd.md` (sha256 d8bd29be…f7bf7b940, matches `DEC-HIL-12`) | read |
| TechSpec | `tasks/prd-08-modo-debug/techspec.md` (sha256 c2e612f4…822d2299, matches `DEC-HIL-12`) | read |
| Manifest | `tasks/prd-08-modo-debug/tasks.md`; `done/task_01.md`, `done/task_02.md` | read |
| Implementation | `git diff 791defe` over 30 files (17 `src/`, 10 `tests/`, 2 `schemas/`, `README.md`): 436 insertions, 43 deletions | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | `init --debug` persists the mode, schema-valid; a later `init` keeps it and changes nothing | `src/core/services/debug-mode-merge.ts:mergeDebugMode,applyDebugMode`; `src/core/contracts/configuration.ts:76` (`debug: z.optional(z.boolean())`); `src/cli/init-config-updates.ts:debugUpdate` | `init-debug-mode.test.ts` "adds the debug line…" (parses config with `configurationSchema`), "keeps the debug mode on a later init and changes nothing"; `debug-mode-merge.test.ts` | conformant | Full suite green; config key written before `runner` by `inSchemaOrder` |
| FR-02 | Managed block gains the exact line; bytes outside markers and EOL preserved; symlink | `src/core/services/instruction-markers.ts:DEBUG_MODE_LINE,referenceBlockFor`; five call sites in `instruction-service.ts:32,39,66,79`, `legacy-preview.ts:8` | `instruction-markers.test.ts` (exact block on/off, CRLF); `init-debug-mode.test.ts` lifecycle (LF `AGENTS.md`, CRLF `CLAUDE.md`, `startsWith` user content) and "through a symlink" | conformant | The symlink test ran and passed locally (11/11 in `init-debug-mode.test.ts`, not skipped); built CLI in a scratch repo wrote the exact line |
| FR-03 | Forced injection in any zone and percentage while on; `injectionMode` unchanged; off follows `injectionMode` | `src/core/services/injection-policy.ts:12`; `src/core/services/brake-engine.ts:64` (`isDebugModeInEffect`) | `injection-policy.test.ts` "in the debug mode"; `brake-engine-debug.test.ts` (TC-05, 4 cases); `e2e-debug-mode.test.ts` (built hook: empty at low usage without debug, `[ContextBrake v2]` with debug) | conformant | `decideInjection` has a single caller (`rg decideInjection src`) |
| FR-04 | `--no-debug` restores bytes; both flags → usage error citing both | `debug-mode-merge.ts:mergeDebugMode` (`TOGGLE_CONFLICT`), `applyDebugMode` remove | `init-debug-mode.test.ts` "restores the install without debug byte for byte" (whole-tree snapshot), conflict case `--debug with --no-debug` (exit 64) | conformant | — |
| FR-05 | Light-mode conflicts; `--light --no-debug` switches in one command | `init-config-updates.ts:21` (`--debug` in `LIGHT_MODE_OPTIONS`), `:32` (`DEBUG_IN_LIGHT_MODE`) | `init-debug-mode.test.ts` "init debug conflicts" (3 light cases, no files changed) and "switches … with --light --no-debug" | conformant | Built CLI: `init --light --yes` with debug on → exit 64 with the `--no-debug` message |
| FR-06 | Dry-run/JSON show enabling or disabling; `doctor` shows the mode; drift repaired; `remove` clears the line | `installation-builder.ts:12,60` (`DEBUG_SUMMARY`); `doctor-service.ts:99`; `report-service.ts:82`; `doctor-mode-text.ts:renderModeLines`; `text.ts:59` | TC-08 (enable preview, `installReportSchema`), TC-09 (missing line repaired), TC-10, TC-11 (`doctor`, `doctor --json`, `remove`) | conformant | Disable preview (`remove the debug mode`) and the extra-line drift case have no direct assertion; both verified in this review (see CR-01) |
| NFR-01 | Line ≤ 60 `o200k_base` tokens; telemetry `v2` unchanged | `instruction-markers.ts:DEBUG_MODE_LINE`; `telemetry-block.ts` untouched | `instruction-markers.test.ts` "keeps the debug line within the token budget" | conformant | `git diff 791defe -- src/core/services/telemetry-block.ts` is empty |
| NFR-02 | Linux, macOS, Windows; symlinked instruction files | Existing writer (`planExistingInstruction`, `realPath`) | Symlink and CRLF tests; e2e | conformant (Windows); Linux and macOS not verifiable locally | Windows 11 local run; Linux and macOS depend on CI |
| DEC-01–DEC-08 | See TechSpec adherence | — | — | conformant | — |
| TC-01–TC-13 | Test cases | Test files listed above | All named files ran and passed | conformant | TC-05 delivered at the unit level (see TechSpec adherence) |
| QA-01–QA-07 | Quality profile | — | Profile commands | conformant | See Quality profile |
| Manual acceptance | Optional (owner: user): real Claude Code session prints the line | — | — | not verifiable (optional, not executed) | Not essential per `techspec.md#test-approach` |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100-line files, 30-line functions, ≤3 parameters, no comments) | OK | No new file above 100 lines; `renderReferenceBlock` moved to an options object; no comments added. Three files now sit exactly at 100 lines (CR-02) |
| `javascript-typescript.md` | OK | Return types declared; config parsed by zod; `applyDebugMode` mirrors `applyLightMode` (`light-mode-merge.ts:29`) |
| `tests.md` | OK | Test names cite `TC-NN`/`FR-NN`; user-file bytes asserted with whole-tree snapshots; exact agent-facing line and token budget asserted; symlink test uses `requireLink` |
| `file-changes.md` | OK | Changes stay inside markers through the existing writer (DEC-08); byte-for-byte restore tested |
| `cli-output.md` | OK | Usage errors in English, name the option and the fix (`init-config-updates.ts:12,54`); `--json` report passes `installReportSchema` and `doctorReportSchema` |
| Architecture (`AGENTS.md`) | OK | `src/core/` imports no `infrastructure`/`cli` (QA-03 empty) |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>'` over 27 TS files | 0 | OK |
| QA-02 | `@ts-ignore`/`@ts-nocheck`/`eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable'` | 0 | OK |
| QA-03 | `core` → `infrastructure`/`cli` | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/"` over `src/core/**` | 0 | OK |
| QA-04 | stdout on the hook path | blocking | `rg -n 'console\.log\|process\.stdout\.write'` over `injection-policy.ts`, `brake-engine.ts` | 0 | OK |
| QA-05 | 4+ parameters | reservation | TechSpec regex | 0 | OK |
| QA-06 | `throw new Error(` | reservation | `rg -n 'throw new Error\('` | 0 | OK |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' … \| awk -F: '$2 > 100'` | 1 of 1 pre-existing (`instruction-service.ts:103`, 103 at base) | pre-existing |

- Terrain baseline: applied from TechSpec.
- Hits discounted by baseline: 1 (`instruction-service.ts`, 103 lines at base and now).
- Reservations accumulated in the feature: 2 (CR-01, CR-02); profile reservation hits: 0 new.
- Suggested escalation: no trigger fired (under 8 reservation hits, no touched file above 200 lines, no block duplicated in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | `configuration.ts:76`, after `lightMode`, before `runner` |
| DEC-02 | YES | `debug-mode-merge.ts` exports and error text match the TechSpec |
| DEC-03 | YES | `instruction-markers.ts:20,24,32`; five call sites switched; line text identical to the contract (asserted by `EXPECTED_DEBUG_LINE`) |
| DEC-04 | PARTIAL | Behavior as specified (`injection-policy.ts:12`, `brake-engine.ts:64`). The TechSpec said `brake-engine.ts` "stays at 97 lines"; it is 98 (one import) |
| DEC-05 | YES | `init-config-updates.ts:21,32`; message identical to the TechSpec |
| DEC-06 | PARTIAL | Behavior as specified (`installation-builder.ts:38,60`, `installation-service.ts:81`, `init.ts:74`). The baseline row said `installation-service.ts` would stay at ≤ 99 lines; it is 100 |
| DEC-07 | PARTIAL | Behavior as specified (`diagnostics.ts:28`, `doctor-service.ts:99`, `doctor-mode-text.ts:8`, `text.ts:59`). The TechSpec said `doctor-service.ts` "does not grow"; it went from 99 to 100. `report-service.ts` (outside the task's file list) had to carry the field through its strict parse and is now at 100; recorded in `tasks.md#problems-and-solutions` |
| DEC-08 | YES | No new writer; `planExistingInstruction` used for enable, disable, and repair |
| TC-05 level | PARTIAL | Planned as `tests/integration/debug-injection.test.ts`; delivered as `tests/unit/brake-engine-debug.test.ts` with port fakes. All four expected results are asserted, `tests.md#layers` puts `src/core` services in the unit layer, and the hook process path is covered by TC-12. Accepted; deviation recorded in `done/task_01.md#handoff` |
| Contracts (config, block text, `doctor --json`, exit codes) | YES | Schemas regenerated (`schemas:check` exit 0); usage errors exit 64 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` (linked from `tasks.md`, State `[x]`) | COMPLETE | Every work item checked; acceptance criteria covered by TC-01–TC-09, re-run green in this review |
| T02 | `done/task_02.md` (linked from `tasks.md`, State `[x]`) | COMPLETE | Every work item checked; TC-10–TC-13 re-run green. The light-mode half of the first acceptance criterion has no automated test; verified in this review (CR-01) |

## Executed validations

- Profile and scope: CLI (`init`, `doctor`, `remove`) and the Claude Code hook engine; end-to-end runs the built CLI and hook against temporary fixture repositories, per `AGENTS.md`.
- Validated state: working tree at `791defe` plus the feature diff, Windows 11, Node 24, run in this review session.
- Reused evidence: none; every command below was run in this session.
- Manual acceptance: optional, not executed (owner: user).
- Additional checks in this session (built CLI, scratch repository with `.claude/`, `CLAUDE.md`, `AGENTS.md`): `init --yes --debug` wrote the exact block line and `"debug": true`; `init --no-debug --dry-run --json` listed `context-brake.config.json` with `…; remove the debug mode` and both instruction files with `Update ContextBrake reference block`; `doctor` printed `  - debug mode: on`; `init --light --yes` with debug on exited 64 with the `--no-debug` message; with `lightMode` added by hand next to `debug: true`, `doctor --json` had no `debugMode` (checkpoint mode `light`) and `doctor` printed no debug line.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0) | build of CLI and hook assets |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run lint` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | TC-13, FR-01, FR-06 |
| `npm run coverage` | passed (exit 0): 286 files, 1,821 passed, 3 skipped (in `e2e-run-interrupt` and `harness-session-stop`, unrelated), 95.61% lines, 91.38% branches; 475 s | TC-01–TC-12, all FR/NFR |
| `npm run package:smoke` | passed (exit 0) | built package |
| Quality profile QA-01–QA-07 | passed (only the pre-existing QA-07 hit) | QA-01–QA-07 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low (optional improvement) | FR-06, T02 acceptance, `tests.md` | Three behaviors that the PRD or task states lack a direct assertion. (1) The disable preview: `installation-builder.ts:12` `DEBUG_SUMMARY.remove` is not asserted by any test (`rg "remove the debug mode" tests` is empty); TC-08 covers only enabling. (2) T02 criterion "with … light mode on, both are absent": no `doctor` test with `debug: true` + `lightMode`. (3) FR-06 "linha … sobrando": no test of a block that keeps the debug line while the mode is off; only the missing-line case (TC-09) is tested. All three work today: (1) and (2) were checked on the built CLI in this review; (3) follows from `instruction-service.ts:67` (`existing === target`) and the `--no-debug` byte-equality test. | A regression in these paths would not fail the suite. | Add to `tests/integration/init-debug-mode.test.ts`: a `--no-debug --dry-run --json` case asserting `remove the debug mode`, and a drift case that adds `DEBUG_MODE_LINE` by hand with the mode off and asserts that `init --yes` removes it. Add a `doctor` case (for example in `tests/integration/doctor-light-mode.test.ts`) with `debug: true` and `lightMode` asserting no `debugMode`. |
| CR-02 | Low (optional improvement) | `code-standards.md` (100-line limit), TechSpec DEC-04/DEC-06/DEC-07 line budgets | `installation-service.ts`, `doctor-service.ts`, and `report-service.ts` are at exactly 100 lines (98, 99, and 98 at base); `brake-engine.ts` is at 98 (97 at base). The TechSpec said these files would stay at 97, ≤ 99, and "not grow". No QA-07 hit, since the rule counts files above 100. | Any later change to these three files must first extract a responsibility, so the next feature that touches them pays that cost. | None required now. When a later change touches one of them, extract first (for example the doctor-report assembly in `doctor-service.ts:99`, or the input type of `installation-service.ts`). Alternatively, accept the budget drift as recorded here. |

## Limitations and open items

- Independence: this review ran in the same harness session ID as the authoring sessions (`owner_session` `session_012UFSLu4nVNJ5SBBZyBqZJP`). The context was cleared with `/clear` after `DEC-PAUSE-T02`, and this context wrote no feature code. Per the snapshot Load protocol for independent stages, it loaded only the snapshot header, next step brief, open threads, and `on-run` entries, and it did not open `jev-log.jsonl` before writing this report.
- Platforms: Windows only; Linux and macOS depend on CI.
- Manual acceptance (optional, owner: user) was not executed: whether a real agent prints the `📊 ContextBrake:` line stays unverified, as the PRD accepts.
- CLI QA was skipped by `DEC-HIL-12`; the end-to-end cases TC-11 and TC-12 ran in this review as part of `npm run coverage`.

## Conclusion

All PRD obligations (FR-01–FR-06, NFR-01–NFR-02) are implemented and verified by tests that ran green in this session. Both tasks are complete, links and state are consistent, and the quality profile has no new blocking or reservation hits. Two low-severity optional improvements remain: missing regression assertions for three working behaviors (CR-01), and line budgets from the TechSpec that were slightly exceeded, leaving three files at the 100-line limit (CR-02). Neither leaves a requirement, security concern, or essential evidence pending, so the status is APPROVED WITH RESERVATIONS.
