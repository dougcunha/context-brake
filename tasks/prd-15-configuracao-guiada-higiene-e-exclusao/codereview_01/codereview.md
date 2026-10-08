# Code review report — Upgrade hygiene and persistent harness exclusion (prd-15)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `c8457280390c498a0a97ddbdc726754ca3de08d6..working tree` (HEAD equals the base; the code under review is the uncommitted diff plus untracked files; the feature folder is untracked). Foreign paths excluded as instructed: `.agents/skills/chat-clean/`, `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/`, `tasks/prd-16-configuracao-guiada-assistente-no-init/`, `tasks/triage-log.jsonl`.
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md` (sha256 equals the approved `cb5123fc…911f8`) | read |
| TechSpec | `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md` (sha256 equals the approved `150acadc…23258`) | read |
| Manifest | `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/tasks.md` (T01..T08 all `[x]`; sha differs from the approved `1ff542c4…` only because the State checkboxes were ticked) | read |
| Tasks and handoffs | `done/task_01.md` .. `done/task_08.md` (all eight in `done/`, handoffs present), `workflow.md`, `checkpoint.json` | read |
| Snapshot | `context-snapshot.md`, loaded through the independent-stage filter (header, next step brief, open threads, `on-run` entries only). Header is behind (`covers_through: T02`, all eight tasks done): next step brief treated as stale, nothing relied on | read (filtered) |
| Implementation | 21 modified and 9 new `src/` files, 2 modified and 14 new test files, regenerated `schemas/context-brake.config.schema.json`, `README.md`, `docs/research/harness-integrations.md` | delimited |

## Coverage matrix

FR-01 is read together with `DEC-03`, `DEC-12`, and `DEC-HIL-02` as the manifest and TechSpec instruct (the PRD file is unchanged).

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Unrecognized-only config: every key named with path plus a remediation; mixed errors keep today's message; exit code unchanged | `src/core/validation/configuration-validator.ts:5-27` (`remediation`, multi-line body); `src/core/services/doctor-checks.ts:8-19`; `src/cli/commands/doctor.ts:28-29` (sanitized config still diagnosed) | `tests/unit/configuration-validator.test.ts`, `tests/integration/config-repair-errors.test.ts` (TC-01, TC-02) | conformant | Built CLI probe: `doctor` printed three paths (`telemetry.zones.legacy`, `stateStorage`, `telemtry`) and `Run context-brake init --yes to drop them…`; doctor JSON validates against `doctorReportSchema` in the test |
| FR-01 (`init`, `remove` clauses) | `init` meets it through the preview; `remove` proceeds | `src/cli/init-config-state.ts:16-28`; `src/cli/commands/remove.ts:22` (`readTolerant`) | `tests/integration/init-config-repair.test.ts`, `config-repair-errors.test.ts` | conformant (per DEC-HIL-02) | Probe: `init --dry-run --json` summary ends `; drop unrecognized keys: telemetry.zones.legacy, stateStorage, telemtry`; `remove` did not raise the config error |
| FR-02 | `init` drops the keys after a preview, confirmation as usual, dry run writes nothing, valid and idempotent result | `src/core/validation/configuration-sanitizer.ts:23-34`; `src/core/services/installation-builder.ts:37-56,66-72`; `src/infrastructure/storage/project-config-store.ts:9-17` | `tests/unit/configuration-sanitizer.test.ts` (TC-03), `init-config-repair.test.ts` (TC-04, TC-05: `CONFIRMATION_REQUIRED` at line 65, second run plans no config change) | conformant | Tests pass; probe applied the repair and the file kept recognized values in schema order |
| FR-03 | `init` removes owned hook entries for events outside the current set (Claude, Codex, Cursor, Copilot) and leaves foreign entries byte-identical | `src/infrastructure/harnesses/common/hook-event-cleanup.ts:35-55`; wired at `claude-hooks-config.ts:27`, `codex-hooks-updater.ts:79`, `cursor-hooks-updater.ts:66`; Antigravity `antigravity-hooks-updater.ts:24-39`; Copilot rewrites its owned file (no code) | `retired-hook-events.test.ts` (TC-06, LF and CRLF), `retired-hook-events-harnesses.test.ts` (TC-07, TC-08), `retired-hook-events-copilot.test.ts`, `tests/unit/hook-event-cleanup.test.ts` | conformant | Probe on a mixed `PreToolUse` group: owned handler deleted, foreign `echo foreign` group kept with original formatting; init-then-remove restores foreign bytes in the tests |
| FR-04 | `remove` deletes every owned registration under any event | same helper through the `merge=false` / `clear=true` paths; `antigravity-hooks-updater.ts:59-62` | same tests (init then remove equals the foreign-only fixture byte for byte) | conformant | tests green |
| FR-05 | `--exclude-harness` removes the id from `activeHarnesses`, records it, and plans deletion of its artifacts as `remove` would; preview lists deletions; write needs confirmation | `src/core/services/harness-exclusion.ts:11-30`; `harness-removal.ts:35-52`; `installation-service.ts:56-82`; `removal-service.ts` reuses `planHarnessRemovals` | `harness-exclusion.test.ts` (TC-10), `init-exclusion.test.ts`, `init-exclusion-removal.test.ts` (TC-11), `init-exclusion-edges.test.ts`, `init-exclusion-conflicts.test.ts` (TC-15) | conformant | Probe with Claude Code and OpenCode installed: excluding `claude-code` listed deletes for the hook assets, `settings.local.json`, runtime file, updates for `settings.json` (foreign group kept), manifest, config; `activeHarnesses: ["opencode"]`, `excludedHarnesses: ["claude-code"]` |
| FR-06 | Excluded harness stays off on a plain `init`; detection line says so; `doctor` reports it as excluded, not missing | `harness-exclusion.ts`; `doctor-service.ts:71-79`; `cli/output/detection-text.ts`; `text.ts:22,51`; `no-harness-finding.ts` | `init-exclusion.test.ts` (TC-13), `doctor-exclusion.test.ts` (TC-16) | conformant | Probe: plain `init --yes` printed `claude-code: excluded by configuration` and planned no change; `doctor` printed the same line and no `INTEGRATION_MISSING` |
| FR-07 | `--harness` clears the exclusion and installs; both flags for one id stay an argument error | `harness-exclusion.ts:12-14`; `argument-validator` unchanged | `init-exclusion.test.ts` (TC-14, exit 64 at line 65), `harness-exclusion.test.ts` | conformant | Probe: `init --harness claude-code` reinstalled and the exclusion key was removed; both flags gave `INVALID_ARGUMENTS`, exit 64 |
| FR-08 | `remove` deletes the configuration, exclusion included | no code change required (`removal-service.ts`) | `init-exclusion-removal.test.ts`, `doctor-exclusion.test.ts` (TC-16) | conformant | tests green |
| NFR-01 | Plan before write, idempotent, foreign bytes preserved | surgical `jsonc-parser` edits in `hook-event-cleanup.ts`; `createChangePlan` unchanged | TC-04, TC-06..08 second-run assertions | conformant | tests green; CRLF evidence covers Claude Code only (see CR-03) |
| NFR-02 | Linux, macOS, Windows, symlinked settings directory | no path logic added; planners already use `resolveChangeTarget` | `retired-hook-events.test.ts` symlink case (TC-09) via `tests/helpers/link-capability.ts` | conformant on Windows; Linux and macOS not verifiable here | symlink test ran on Windows; see limitations |
| NFR-03 | Tests in process, `npm test` and coverage within 120 s | no file added to the process lane | TC-18 | conformant | `npm run coverage` 93.97 s Vitest duration (96 s wall); `npm run test:budget` exit 0 |
| NFR-04 | Text and JSON carry the same content; schemas current | `schemas/context-brake.config.schema.json` regenerated; no report schema change | `tests/unit/configuration.test.ts` (TC-12), `npm run schemas:check` | conformant | `schemas:check` exit 0; excluded detections appear in JSON (`state: excluded`) and text |
| OBJ-01..03 | Outcomes proven on the built CLI | n/a | TC-17 belongs to `sdd-execute-qa` | not verifiable here | Reviewer smoke probes on the built CLI matched the expected results (see Executed validations); the QA run is still pending by design |
| DEC-01..14 | TechSpec decisions | see TechSpec adherence | per task | conformant | see below |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `AGENTS.md` architecture (core never imports infrastructure or cli) | OK | QA-04 sweep, zero hits |
| `code-standards.md` / `javascript-typescript.md` (no `any`, no comments, 100-line files, 30-line functions, dedicated error class) | OK | QA-01/02/03/07 sweeps zero hits; `npm run lint` and `npm run typecheck` exit 0; largest changed file is `doctor-service.ts` at 91 lines |
| `tests.md` (in-process, budget, no process-lane additions) | OK | all new tests use `runInProcessCli` or pure units; budget gate passed |
| `harness-adapters.md` (ownership by the hook path, failure policy, research note updated) | OK | `isClaudeOwnedHandler` at `claude-merger.ts:18-21` uses `CLAUDE_HOOK_FILE`; `docs/research/harness-integrations.md` gains one bullet per harness |
| `file-changes.md` (plan before write, foreign bytes preserved, modified assets protected) | OK | `harness-removal.ts:23-33` protects user-modified runtime assets on the exclusion path |
| `cli-output.md` | OK | excluded line in both `renderInstallText` and `renderDoctorText`; JSON unchanged in shape |
| `sdd-review-code` independence | OK | this session wrote none of the code |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg ':\s*any\b|\bas any\b|<any>'` over the 27 changed or new `src/` files and the 16 changed or new test files | 0 of 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg '@ts-ignore|@ts-nocheck|eslint-disable'` same scope | 0 of 0 | OK |
| QA-03 | No empty `catch` / `.catch(() => {})` | blocking | multiline `rg` as in the TechSpec | 0 of 0 | OK |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | `rg "from '(\.\./)+(infrastructure|cli)/"` over `src/core/` files in the diff | 0 of 0 | OK |
| QA-05 | `throw new Error(` | reservation | `rg 'throw new Error\('` | 0 of 0 | OK |
| QA-06 | 4+ parameters in one declaration | reservation | regex from the TechSpec (positive control on a 4-parameter probe confirmed it fires) | 0 of 0 | OK |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' | awk -F: '$2 > 100'` | 0 of 0 (max 91) | OK |

- Terrain baseline: applied from TechSpec (builder 94 to 78, service 90 to 82, doctor-service 91 unchanged, `runInit` not grown)
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 0 profile hits; 4 review-level optional improvements (CR-01..CR-04 below)
- Suggested escalation: no trigger fired (0 reservation hits of 8; no touched file above 200 lines; duplication in 2 places, below 3)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 (`remediation`, body, doctor-only surface, no CLI error-document change) | YES | `configuration-validator.ts:5-27`, `doctor-checks.ts` |
| DEC-02 (pure sanitizer, strip-and-reparse, failing pass's error, `readTolerant`) | YES | `configuration-sanitizer.ts:23-34` (input cloned, terminates because each pass removes at least one key or throws) |
| DEC-03 (`init` meets FR-01 by preview) | YES | summary suffix at `installation-builder.ts:69` |
| DEC-04 (rebuilt from the parsed object, same confirmation) | YES | `planConfigChange` / `inSchemaOrder` |
| DEC-05 (shared surgical helper, event-independent predicates, current-event set) | YES | `hook-event-cleanup.ts`; Claude restart code writes no extra `hooks.*` events (T03 handoff, consistent with `HOOK_EVENTS`) |
| DEC-06 (Antigravity every `hooks.<event>.context-brake`; Copilot no change) | YES | `antigravity-hooks-updater.ts:24-39`; Copilot test |
| DEC-07 (optional `excludedHarnesses`, schema regenerated, exclusion wins) | YES | `configuration.ts:46`; schema diff |
| DEC-08 (`resolveHarnessExclusion`) | YES | `harness-exclusion.ts:11-20` |
| DEC-09 (shared `planHarnessRemovals`, conflict keeps the harness active) | YES | `harness-removal.ts`, `installation-service.ts:56-60`, `retained` in `installation-builder.ts:38-40` |
| DEC-10 (config-only plan, all-excluded finding) | YES | `installation-service.ts:65-67,75`, `no-harness-finding.ts` |
| DEC-11 (doctor exclusion, text lines) | YES | `doctor-service.ts:71-79`, `detection-text.ts` |
| DEC-12 (`remove` tolerant) | YES | `remove.ts:22` |
| DEC-13 (local extractions, all targets at or below 100 lines) | YES | line counts above |
| DEC-14 (runtime strict read untouched) | YES | `runtime-composition.ts` not in the diff |
| New fixtures under `tests/fixtures/harnesses/` (TechSpec Test approach) | PARTIAL | fixtures are built inline in the tests for byte comparison (declared in the T03/T04 handoffs); no behavior gap, see CR-04 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | doctor finding, tolerant `remove`, sanitizer, store; tests TC-01..03 present and passing |
| T02 | `done/task_02.md` | COMPLETE | `init` preview and repair; TC-04, TC-05 present and passing |
| T03 | `done/task_03.md` | COMPLETE | shared helper plus Claude Code; TC-06, TC-09 passing |
| T04 | `done/task_04.md` | COMPLETE | Codex, Cursor, Antigravity, Copilot; TC-07, TC-08 passing |
| T05 | `done/task_05.md` | COMPLETE | `excludedHarnesses`, resolver; TC-10, TC-12..14 passing |
| T06 | `done/task_06.md` | COMPLETE | exclusion removal, edges, conflicts; TC-11, TC-15 passing |
| T07 | `done/task_07.md` | COMPLETE | doctor and text lines, `remove`; TC-16 passing |
| T08 | `done/task_08.md` | COMPLETE | README, research note, gates; re-run here |

All links in `tasks.md` resolve to existing files in `done/`; dependency order is acyclic and matches the State block.

## Executed validations

- Profile and scope: Node.js CLI; in-process tests plus a reviewer smoke on the built CLI (`node dist/src/cli/main.js`) against two throwaway repositories under the scratchpad. TC-17 (formal built-CLI acceptance) is the QA run and was not executed here.
- Validated state: base `c845728` plus the working tree as found; Windows 11, Node 24.19 (Windows only). Worktree status was 51 entries before and after (only ignored build and coverage output was written).
- Reused evidence: none; every command below was re-run in this session.
- Manual acceptance: none required (HIL 2).

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed (exit 0) | code standards, all |
| `npm run typecheck` | passed (exit 0) | all |
| `npm run schemas:check` | passed (exit 0) | NFR-04, FR-05 schema |
| `npm run dependencies:check` | passed (exit 0) | package hygiene |
| `npm run coverage` | passed: 233 files, 1242 tests, 94.26% statements, Vitest duration 93.97 s | FR-01..08, NFR-01, NFR-03, NFR-04 |
| `npm run test:budget` | passed (exit 0) | NFR-03 / TC-18 |
| `npm run build` then built-CLI probes (init with a mixed `PreToolUse` group, exclude, plain init, include, both flags, broken harness file, retired config keys with `doctor`/`init --dry-run`/`init --yes`) | behavior matched FR-01..FR-07 (one exit 2 from `remove` is the known manifest-hash mechanism after the reviewer hand-edited the config; not a defect, see snapshot L-05) | OBJ-01..03 indicative only |
| Quality profile sweeps QA-01..QA-07 | 0 hits | profile |

## Findings

No blocking or high-severity finding. The items below are optional improvements (reservations).

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Low | FR-06 / `cli-output.md` | `src/core/services/installation-service.ts:75` appends `removals.harnesses` to `plan.harnesses`; built CLI printed `claude-code: full support (planned)` and `claude-code: excluded by configuration` together in the `init --exclude-harness claude-code` output | A harness that is being turned off is listed as "planned" next to the excluded line; mildly confusing, report content otherwise correct | Optional: label removal-only entries or skip them in the text harness list; no requirement depends on it |
| CR-02 | Low | duplication (profile escalation counter) | `src/infrastructure/harnesses/common/codex-hooks-updater.ts:37-56` keeps a private `removeOwnedFromEvent` that duplicates `hook-event-cleanup.ts:35-44` (acknowledged in the T03/T04 handoffs) | Two copies of the same removal logic to keep in step; below the 3-place escalation trigger | Optional: switch Codex to the shared helper once its tests show identical behavior for an empty event array |
| CR-03 | Low | TC-07/TC-08 (CRLF clause of TC-06 "as TC-06") | `tests/integration/retired-hook-events-harnesses.test.ts` renders LF only; CRLF is covered for Claude Code only (`retired-hook-events.test.ts:34`) | CRLF byte preservation for Codex, Cursor, Antigravity rests on the shared helper's behavior under the Claude CRLF test, not on direct evidence | Optional: add a CRLF variant to the three scenarios |
| CR-04 | Low | TechSpec Test approach (fixtures) | no files added under `tests/fixtures/harnesses/` for the retired-event cases; fixtures are generated in the tests | Deviates from the listed file layout; the byte comparison is stronger inline, no coverage gap | Optional: record the deviation in the TechSpec or add static fixtures |

## Previous findings (re-review only)

Not applicable: first review of this feature.

## Limitations and open items

- Linux and macOS were not run (Windows only); the symbolic-link test ran and skips with a reason where links are unavailable. Impact: NFR-02 cross-platform evidence is limited to Windows; no logic in the diff is path- or shell-specific.
- TC-17 (formal built-CLI acceptance of OBJ-01..03) is delegated to the `sdd-execute-qa` stage and was not run here; the reviewer probes are indicative only.
- The context snapshot is behind the manifest (`covers_through: T02`); it was loaded through the independent-stage filter and nothing from it was relied on.
- The ContextBrake hook in this session asked for `/sdd-snapshot` and a session reset at the RED zone. The delegated-review contract forbids editing the snapshot and running the session pause, so neither was done; the caller owns the pause.
- Pre-existing, out of scope and not counted: `remove` reports `MODIFIED_OWNED_ASSET` for a modified runtime asset yet the adapter's delete still removes the file (T06 handoff); `applyHooks` still rewrites the three current Claude events as whole arrays (TechSpec risk, recorded there).
- `tasks.md` sha differs from the HIL-approved hash only by the State checkboxes; no scope or content change was found.

## Conclusion

All eight functional requirements, the four non-functional requirements, and the fourteen TechSpec decisions are implemented and covered by named tests (TC-01..TC-16), the eight tasks are complete with handoffs, and lint, typecheck, schema currency, dependency check, coverage (1242 tests) and the 120 s budget all pass with no quality profile hit. Smoke probes on the built CLI showed the intended behavior for the repair, retired-event cleanup, exclusion, re-inclusion, and argument-conflict paths. Only four low-severity optional improvements remain and no requirement, security, or essential evidence is pending, so the status is APPROVED WITH RESERVATIONS. The QA run (TC-17) still has to confirm OBJ-01..03 on the built artifact.
