# Code review report — prd-09-freio-com-janela-confiavel (Freio só com janela confiável)

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `e0a9604ea8349c2c66bfe9137e94dbd2abf3b6c7..worktree` (uncommitted and staged changes; `HEAD` = base). The pre-existing changes listed in `workflow.md#feature-summary` (`.agents/`, `.context-brake/manifest.json`, `.gitignore`, `context-brake.config.json`, `tasks/triage-log.jsonl`) are outside the reviewable set.
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-09-freio-com-janela-confiavel/prd.md` (FR-01–FR-09, NFR-01–NFR-03) | read |
| TechSpec | `tasks/prd-09-freio-com-janela-confiavel/techspec.md` (DEC-01–DEC-12, TC-01–TC-16, QA-01–QA-09, Terrain baseline) | read |
| Manifest | `tasks/prd-09-freio-com-janela-confiavel/tasks.md` (T01, T02 completed; links to `done/task_01.md`, `done/task_02.md` resolve) | read |
| Handoffs | `done/task_01.md#handoff`, `done/task_02.md#handoff` | read |
| Decisions | `workflow.md#human-decisions-log` (DEC-HIL-00, DEC-PD-00–02, DEC-HIL-01) | read |
| Snapshot | `context-snapshot.md` through the independent-stage filter of `.agents/skills/sdd-snapshot/references/load.md` | header, next step brief, open threads, and `on-run` entries only (see limitations) |
| Implementation | `git diff e0a9604` over `src/`, `schemas/`, `tests/`, `README.md`, `docs/` (83 files, +832/−156) | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Every reading has a window origin `harness` / `declared` / `config` | `src/core/contracts/zones.ts:WINDOW_ORIGINS`, `src/core/services/usage-resolver.ts:resolveWindow`, `src/core/services/session-zone.ts:readZone` | `tests/unit/window-origin.test.ts` (TC-01) | conformant | Reported window → `harness`; declared window only through `acceptsDeclaredWindow`; otherwise `contextWindowCeiling` → `config` |
| FR-02 | No deny with origin `config`, in any zone; telemetry and guidance still injected | `src/core/services/brake-engine.ts:43` (`zone !== 'CRITICAL' \|\| !isTrustedWindow(...)`) | `tests/unit/brake-engine-window-trust.test.ts` (TC-02: incident replay neutral for Bash and Edit, no block logged; bridge 128000 denies), `tests/e2e/e2e-window-trust.test.ts` (TC-12) | conformant | Only the percentage reaches `CRITICAL` (`zone-classifier.ts`), so turn-based zones cannot deny (DEC-PD-02). Live evidence: after the repository hook was updated to the feature build, this review session's own tool calls at `CRITICAL` (`source=estimated window=config`) were no longer denied and the block carried the untrusted action |
| FR-03 | `integration_failure` only when the last recorded reading is `CRITICAL` with a trusted window | `src/core/services/failure-policy.ts:wasTrustedCritical`; `toolLineSchema.windowOrigin` optional (`session-ledger.ts:23`); written by `brake-engine.ts:handlePostTool` | `tests/unit/failure-policy-window-trust.test.ts` (TC-03), `tests/unit/window-origin.test.ts` (TC-04) | conformant | `config` → neutral and `DEADLINE_EXCEEDED` recorded; `harness`/`declared` → deny; legacy line without origin → neutral. `lastReading` honors the last reset (`session-counters.ts:25-37`), same scope as the former `lastZone` |
| FR-04 | Plain `init` installs the bridge in full mode; `--no-statusline-bridge` opts out; no record → `config` | `src/cli/commands/init.ts:68-69`, `statusline-planner.ts:requestedEntry`, `statusline-default.ts` | `tests/integration/statusline-default.test.ts`, `statusline-install.test.ts`, `tests/unit/statusline-default.test.ts` (TC-09), TC-12 | conformant | Reproduced with the built CLI in a temp repo: plain `init --yes` exit 0 and `.claude/settings.local.json` written; `--no-statusline-bridge` removes it and writes the opt-out marker; later plain `init` keeps it off; `--statusline-bridge` reinstalls and deletes the marker; `remove` deletes the marker. Acceptance criteria met; the DEC-08 guarantee is not (CR-01) |
| FR-05 | Declared window for harnesses without a source; schema validates | `window-trust.ts:acceptsDeclaredWindow`, `configuration.ts:75`, `config-legacy-checks.ts:normalizeTurnLimits`, `schemas/context-brake.config.schema.json` | TC-01, TC-05 (`window-origin.test.ts`), TC-02 (Codex descriptor), TC-12 (built Codex hook) | conformant | Declaration ignored for `supported`/`unknown` `context_usage` |
| FR-06 | Block `v3` with `window=`; with `config` the action does not promise blocking; debug line repeats the origin | `telemetry-block.ts:3,18`, `window-trust.ts:telemetryAction`, `session-zone.ts:renderSessionTelemetry`, `instruction-markers.ts:DEBUG_MODE_LINE` | `tests/unit/telemetry-block.test.ts`, `telemetry-block-budget.test.ts`, `window-trust.test.ts` (TC-06, TC-07), `instruction-markers.test.ts` (TC-08 text), TC-12 (`window=config zone=CRITICAL` + untrusted action) | conformant | Only the plan-mode CRITICAL compact text says "blocked" (`zone-actions.ts:31`); YELLOW/RED/delegated/light texts promise no block (`zone-actions.ts:22-29`, `delegated-guidance.ts:16`) |
| FR-07 | `doctor` text and `--json` show per active harness whether the brake can deny and why; warning with `context-brake init` remediation without the bridge | `src/core/services/brake-window-report.ts`, `doctor-report-extras.ts`, `diagnostics.ts:brakeWindowEntry`, `src/cli/output/doctor-mode-text.ts`, `schemas/doctor-report.schema.json` | `tests/unit/brake-window-report.test.ts` (TC-10), `tests/integration/doctor-brake-window.test.ts` (TC-11) | conformant | Built-CLI reproduction: with the bridge `brakeWindow: [{claude-code, canDeny: true, reason: bridge}]`; after opt-out the text shows `brake: claude-code only warns (no status line bridge)` and `[WARN] STATUSLINE_BRIDGE_ABSENT` with remediation `Run context-brake init. ...` |
| FR-08 | README, protocol, telemetry doc, research doc describe the rule, `window=`, default bridge, declared window, per-harness source | `README.md`, `protocol-service.ts` → `docs/context-brake-protocol.md`, `docs/telemetry-block.md`, `docs/research/harness-integrations.md` ("Fonte da janela e freio (PRD-09)") | `tests/unit/readme-config-example.test.ts` (TC-14) | conformant, with CR-02 | New text covers all four points; one stale README row and the Claude Code capability text still call the bridge "optional" (CR-02) |
| FR-09 | Runner cuts at `CRITICAL` only with a trusted window | `session-watch.ts:isCriticalGraceOver`, `run-ports.ts:LedgerReading.windowOrigin`, `node-ledger-watcher.ts:readingFromLedger` | `tests/unit/session-watch-window-trust.test.ts` (TC-16), `tests/e2e/e2e-run-autonomy.test.ts` (Codex with declared window keeps the restart) | conformant | `config` → `session_timeout` with `finalZone: CRITICAL`; `harness`/`declared` → `critical_ceiling`; legacy line → `windowOrigin: undefined` (untrusted) |
| NFR-01 | Hook p95 within 100 ms / 120 ms | Origin resolved from data `readZone` already loads; no new file read on the hook path | `runtime-overhead`, `statusline-overhead`, `claude-transcript-usage` (TC-15) | conformant | `runtime-overhead` (4 tests), `statusline-overhead` (3 tests, 120 ms p95 with 200 `statusline` lines) and `claude-transcript-usage` (15 tests) passed in this session's full coverage run |
| NFR-02 | Optional schema fields only; `schemaVersion` 1; `window=` ≤ 10 tokens | `configuration.ts:75`, `diagnostics.ts:168`, ledger `windowOrigin` optional | TC-05, TC-06 (`window-trust.test.ts` token budget), TC-13 | conformant | Schema diffs add optional properties only; `v` stays 1 |
| NFR-03 | Linux, macOS, Windows | — | CI | not verifiable | Only Windows was exercised locally; no CI run exists for this uncommitted diff |
| DEC-PD-02 | Turns never deny without a trusted window; declaration only for harnesses without a source | `brake-engine.ts:43`, `window-trust.ts:acceptsDeclaredWindow` | TC-01, TC-02 | conformant | See FR-02 and FR-05 |
| DEC-08 | Default bridge; "a plain `init` never fails because of the bridge" | `statusline-planner.ts:25-30,48`, `statusline-default.ts:softenDefaultConflict` | TC-09 (unsupported path only) | non-conformant | CR-01 |
| TC-01–TC-16 | Test cases of the TechSpec | listed above | listed above | conformant | TC-10 lives in `brake-window-report.test.ts` instead of `window-trust.test.ts` (the builder moved there under DEC-11); the TC-08 test cites the PRD-08 id `TC-03` in its name instead of `TC-08` |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100-line files, ≤3 parameters, no comments) | OK | No `src/` file above 100 lines (`doctor-service.ts`, `report-service.ts` at 100); QA-08 hits are false positives with three parameters; no comments added in the diff |
| `javascript-typescript.md` (closed sets from one constant, typed returns) | OK | `WINDOW_ORIGINS` constant and `WindowOrigin` union; exported functions declare return types |
| `node.md` (no stdout on the hook path, no sync I/O in-process) | OK | QA-05 and QA-06 zero hits |
| `tests.md` (IDs in test names, exact agent-facing text, budgets) | OK | New tests cite `prd-09` FR/DEC/TC ids; exact `v3` block and debug line asserted |
| `file-changes.md` (refuse unparseable files, continue, plan before write) | NOT OK | The default bridge now reads `.claude/settings.local.json` on every plain `init`; an unparseable file turns the whole run into `status: errors`, exit 2 (CR-01) |
| `cli-output.md` (text label, English, remediation) | OK | `  - brake: <harness> can block\|only warns (<reason>)`; `[WARN] STATUSLINE_BRIDGE_ABSENT` with remediation |
| `harness-adapters.md` (Failure Policy) | OK, with open item | FR-03 narrows "at or above the critical ceiling, an internal failure denies" to trusted windows; the PRD wins, but the rule text no longer matches (see limitations) |
| AGENTS.md architecture (core imports no infrastructure/cli) | OK | QA-04 zero hits; `brake-window-report.ts` depends only on `core/contracts` |

## Quality profile

Scope: the 74 TypeScript files changed or added since `e0a9604` (`core_files`: 20; `in_process_files`: 0; `hook_files`: `brake-engine.ts`, `failure-policy.ts`, `session-zone.ts`, `window-trust.ts`). The `\|` in the TechSpec table is read as the Markdown escape of `|`; commands were run with plain alternation (Git Bash, ripgrep).

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | 0 | OK |
| QA-03 | Empty `catch` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | 0 | OK |
| QA-04 | core → infrastructure/cli | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | 0 | OK |
| QA-05 | stdout on the hook path | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | 0 | OK |
| QA-06 | Sync file API in in-process adapters | blocking | `rg -n --type ts '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync)\b' "${in_process_files[@]}"` | 0 (no in-process file in the diff) | OK |
| QA-07 | Clock or randomness in core | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | 0 | OK (the baseline hit `session-watch.ts:36`, `new Date(now)`, does not match the pattern) |
| QA-08 | 4+ parameters | reservation | `rg -n --type ts '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | 2 matches, 0 real | OK — `tests/unit/runtime-claude-measured.test.ts:30` and `tests/e2e/e2e-window-trust.test.ts:21` have three parameters; the comma inside `Record<string, unknown>` matches |
| QA-09 | File above 100 lines | reservation | `wc -l` per file, compared with `git show e0a9604:<path> \| wc -l` | 1 aggravated of 3 | reservation — `tests/e2e/e2e-simulated-long-task.test.ts` 101 → 102; `tests/e2e/e2e-brake.test.ts` (106) and `tests/unit/process-hook-host.test.ts` (105) pre-existing and unchanged |

- Terrain baseline: applied from TechSpec.
- Hits discounted by baseline: 2 (the two pre-existing QA-09 files; the QA-07 baseline hit does not match the regex).
- Reservations accumulated in the feature: 1 (QA-09, `e2e-simulated-long-task.test.ts`).
- Suggested escalation: no trigger fired (1 reservation < 8; no touched file above 200 lines; no block duplicated in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 origin in `resolveUsage` | YES | `usage-resolver.ts:resolveWindow` |
| DEC-02 capability filter, `ZoneSettings.descriptor.capabilities` | YES | `session-zone.ts:18-28`; `wrap-telemetry.ts` already passes the full descriptor |
| DEC-03 in-place gate, no block logged | YES | `brake-engine.ts:43`; TC-02 asserts `blocks.records` empty |
| DEC-04 optional ledger field, legacy = `config` | YES | `session-ledger.ts:23`; `failure-policy.ts:wasTrustedCritical` |
| DEC-05 `declaredContextWindow` optional, normalizer | YES | `configuration.ts:75`, `config-legacy-checks.ts:33-36` |
| DEC-06 block `v3`, warning-only CRITICAL action | YES | `telemetry-block.ts`, `window-trust.ts:telemetryAction` (text as amended in the TechSpec) |
| DEC-07 debug line | YES | `instruction-markers.ts:20` |
| DEC-08 default bridge; plain `init` never fails because of the bridge | PARTIAL | Default and flags as specified; only `STATUSLINE_UNSUPPORTED_PATH` is softened (CR-01) |
| DEC-09 opt-out marker file | YES | `statusline-default.ts:STATUSLINE_OPT_OUT_FILE`; marker in `snapshot-helper.ts:8` (TechSpec amended in T02) |
| DEC-10 `brakeWindow`, `STATUSLINE_BRIDGE_ABSENT` | PARTIAL (location) | Behavior matches; the finding is built in core (`brake-window-report.ts:bridgeAbsentFindings`) instead of `statusline-diagnostics.ts`; `canDeny` for Claude Code follows the installed bridge, as the FR-07 criterion asks |
| DEC-11 file budgets, absorbed extraction | YES | `doctor-report-extras.ts`; no new export in the five structural modules (`failure-policy.ts` replaced a private function; `session-ledger.ts`, `diagnostics.ts`, `run-ports.ts` add fields; `instruction-markers.ts` changes a constant) |
| DEC-12 runner gate | YES | `session-watch.ts:84`, `node-ledger-watcher.ts:12` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | All work items checked; handoff lists files, checks (build, typecheck, lint, `schemas:check`, coverage 292 files / 1,854 passed), profile, J3 operational failure. Changed files match the diff |
| T02 | `done/task_02.md` | COMPLETE | All work items checked; handoff lists files, checks (build, typecheck, lint, `schemas:check`, `package:smoke`, coverage 298 files / 1,871 passed), profile, J3 operational failure. Changed files match the diff |

## Executed validations

- Profile and scope: hook engine (process and in-process) and CLI (`init`, `doctor`, `remove`); end-to-end through the built CLI and hooks in temporary directories, per AGENTS.md.
- Validated state: worktree at `e0a9604` plus the feature diff, Windows 11, Git Bash. The mid-review unblock changed only `.claude/hooks/context-brake.mjs`, `.claude/hooks/context-brake-statusline.mjs` (both git-ignored, this repository's own install) and `.context-brake/manifest.json` (pre-existing change, outside the reviewable set); none is read by the suite's temporary fixtures, so no reviewed evidence was invalidated.
- Reused evidence: none for the commands below; all were run in this session.
- Manual acceptance: optional TokenHound check (owner: user) not run.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0; regenerated schemas unchanged against the worktree) | TC-13 (generation), build |
| `npm run coverage` | passed (exit 0): 298 files, 1,871 passed, 3 skipped; 95.65% lines, 91.54% branches | all TCs, NFR-01 (TC-15) |
| `npm run typecheck` | passed (exit 0) | build quality |
| `npm run lint` | passed (exit 0) | build quality |
| `npm run schemas:check` | passed (exit 0) | TC-13 |
| `npm run package:smoke` | passed (exit 0) | package |
| Quality profile script (QA-01–QA-09) over 74 TS files | passed; 1 reservation | QA-01–QA-09 |
| Built CLI: plain `init --yes`, `doctor --json`, `init --no-statusline-bridge`, plain `init`, `doctor`, `init --statusline-bridge`, `remove --yes` in a temp repo | passed (exit 0 each; `doctor` exit 1 = warnings) | FR-04, FR-07, DEC-08, DEC-09, DEC-10 |
| Built CLI: plain `init --yes --json` with malformed `.claude/settings.local.json` | failed: `status: errors`, `exitCode: 2`, conflict `INVALID_HARNESS_CONFIG` on `.claude/settings.local.json` | DEC-08 (CR-01) |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | DEC-08, `file-changes.md` | `src/infrastructure/harnesses/claude-code/statusline-planner.ts:27-29,48` — in the default case `planStatuslineEntry(context, true)` now reads `.claude/settings.local.json` on every plain `init` and returns `INVALID_HARNESS_CONFIG` when it does not parse; `statusline-default.ts:softenDefaultConflict` (lines 26-33) softens only `STATUSLINE_UNSUPPORTED_PATH`. At the base, a plain `init` with no bridge state returned `EMPTY_PLAN` before reading the file. Reproduced: malformed `settings.local.json` → plain `init --yes --json` exits 2 with `status: errors` while the hooks are still applied | A user with an unparseable local settings file, who never asked for the bridge, gets a failing `init` on every plain run; DEC-08 states "a plain `init` never fails because of the bridge". TC-09 covers only the unsupported-path case | In the default case, soften the `INVALID_HARNESS_CONFIG` conflict on `.claude/settings.local.json` into a warning finding (no bridge, brake only warns), as `softenDefaultConflict` does for the unsupported path, and add a TC-09 case for it |
| CR-02 | Low | FR-04, FR-08 | `README.md:71` ("the context window comes from the optional status line bridge") and `src/infrastructure/harnesses/claude-code/capabilities.ts:8` (`context_usage` impact, printed by `doctor`: "The context window comes from the optional status line bridge.") | User-facing text contradicts the new default in the same README and in `doctor` output | Reword both to say the bridge is installed by default and that without it the brake only warns |

Optional improvements (not blocking):

- QA-09 reservation: `tests/e2e/e2e-simulated-long-task.test.ts` grew from 101 to 102 lines.
- `window-trust.ts:telemetryAction` recognizes the blocking text by string equality with `ZONE_ACTIONS.CRITICAL.compact`; a guidance that later rephrases that text would silently keep promising a block. A flag from the guidance would be sturdier.
- `tests/e2e/e2e-run-autonomy.test.ts` now gives Claude Code runs no ceiling session instead of a `CRITICAL` session that must not be cut; FR-09 for Claude Code is covered only by the unit TC-16.
- The TC-08 test name cites `TC-03` (PRD-08) instead of `TC-08`; TC-10 sits in `brake-window-report.test.ts` rather than the file the TechSpec names.

## Limitations and open items

- Block and unblock during the review: at turn 42 of this session, the ContextBrake hook then installed in this repository (pre-feature `v2`, `.claude/hooks/context-brake.mjs`) denied `Bash` and `Write` with `critical_ceiling` at `CRITICAL` 75%, `source=estimated`, `tokens=96569/128000` (the `contextWindowCeiling` fallback) — the incident this feature fixes. The first draft of this report could not be written. The coordinator then updated the repository hook to the feature build (`init --yes` with the built CLI, changing only `.claude/hooks/context-brake.mjs`, `.claude/hooks/context-brake-statusline.mjs`, and `.context-brake/manifest.json`); from then on the blocks read `[ContextBrake v3] ... window=config zone=CRITICAL action=not blocked (...)` and no call was denied. The typecheck, lint, `schemas:check`, `package:smoke`, and coverage results above were collected after the unblock. The three changed files are outside the reviewable set and are not read by the test fixtures, so no evidence gathered before the block was invalidated.
- The subagent session kept `window=config` after the unblock even though this repository has the bridge installed: a Claude Code subagent has its own ledger key and no bridge record, the risk the TechSpec already accepts.
- NFR-03: Linux and macOS not verified; no CI run exists for this uncommitted diff.
- Manual TokenHound acceptance (optional, owner: user) not run.
- Snapshot filter: the file is under 8 KiB and was read in one call (load.md step 1); only the header, next step brief, open threads, and `on-run` entries (L-01, L-02) were used. Header validated: `git_head` e0a9604 = `HEAD`; `covers_through` T02 matches `tasks.md#state`; worktree matches the listed pre-existing changes plus the feature diff.
- Dogfooding manifest: before the unblock, `.context-brake/manifest.json` recorded the base protocol hash (`b6ad0693…`); after the coordinator's `init` it records the regenerated doc's hash (`3bdcdd3e…`), so the drift is gone. Not a finding: the file is outside the feature.
- `harness-adapters.md#failure-policy` still says an internal failure at or above the critical ceiling denies; after FR-03 that holds only with a trusted window. Updating the rule is a decision for the HIL.

## Conclusion

The window-origin model, both deny gates, the ledger field, the declared window, telemetry `v3`, the debug line, the doctor `brakeWindow` report, the runner gate, and the docs implement FR-01–FR-09 and their TechSpec decisions, with tests for every TC and no blocking quality-profile hit. The default Claude Code bridge meets the FR-04 acceptance criteria, but it breaks the DEC-08 guarantee that a plain `init` never fails because of the bridge: an unparseable `.claude/settings.local.json` now makes every plain `init` exit 2 (CR-01). With a non-conformant TechSpec obligation, the status is REJECTED. CR-02 and the optional improvements can be handled in the same correction round.
