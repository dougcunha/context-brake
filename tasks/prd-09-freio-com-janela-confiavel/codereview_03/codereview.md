# Code review report — prd-09-freio-com-janela-confiavel (Freio só com janela confiável)

## Summary

- Status: APPROVED WITH RESERVATIONS
- Execution: delegated reviewer
- Git scope: `e0a9604ea8349c2c66bfe9137e94dbd2abf3b6c7..worktree` (staged, unstaged, and new files; `HEAD` = base). Includes both correction rounds (`codereview_01/done/task_03.md`, `task_04.md`; `codereview_02/done/task_05.md`) and `.agents/rules/harness-adapters.md` (T04, `DEC-HIL-02`). The pre-existing changes listed in `workflow.md#feature-summary` (`.agents/` hooks, settings, and SDD skills; `.context-brake/manifest.json`; `.gitignore`; `context-brake.config.json`; `tasks/triage-log.jsonl`) are outside the reviewable set.
- Previous review: `tasks/prd-09-freio-com-janela-confiavel/codereview_02/codereview.md` (REJECTED: CR-01)

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-09-freio-com-janela-confiavel/prd.md` (FR-01–FR-09, NFR-01–NFR-03) | read |
| TechSpec | `tasks/prd-09-freio-com-janela-confiavel/techspec.md` (DEC-01–DEC-12, TC-01–TC-16, QA-01–QA-09, Terrain baseline). This version is not the one hashed in `DEC-HIL-01`: it carries the in-contract amendments of DEC-06 (T01), DEC-09 (T02), and TC-09 (`DEC-HIL-03`, T05; the T05 handoff records the pre-edit hash) | read |
| Manifest | `tasks/prd-09-freio-com-janela-confiavel/tasks.md` (T01, T02 completed; links to `done/task_01.md` and `done/task_02.md` resolve) | read |
| Handoffs | `done/task_01.md`, `done/task_02.md`, `codereview_01/done/task_03.md`, `task_04.md`, `codereview_02/done/task_05.md` | read |
| Corrections | `codereview_02/done/` (T05 → `codereview_02/CR-01` and `DEC-HIL-03`) | read |
| Decisions | `workflow.md` human decisions log and milestones 1–13 (DEC-HIL-00, DEC-PD-00–02, DEC-HIL-01, DEC-EXC-01, DEC-HIL-02, DEC-HIL-03) | read |
| Snapshot | `context-snapshot.md` through the independent-stage filter of `.agents/skills/sdd-snapshot/references/load.md` | header, next step brief, open threads, and `on-run` entries only (see limitations) |
| Implementation | `git diff e0a9604` over `src/`, `schemas/`, `tests/`, `README.md`, `docs/`, `.agents/rules/harness-adapters.md` (34 files in `src/`, `schemas/`, docs, and rules, +285/−73; 76 TypeScript files in all) | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Every reading has a window origin `harness` / `declared` / `config`; only the first two are trusted | `src/core/contracts/zones.ts:WINDOW_ORIGINS`, `src/core/services/usage-resolver.ts:resolveWindow`, `src/core/services/session-zone.ts:readZone` | `tests/unit/window-origin.test.ts` (TC-01) | conformant | A reported window (hook or bridge, merged by `mergeMeasurements`) → `harness`; a declared window only when `acceptsDeclaredWindow` (`window-trust.ts`, `context_usage` `unsupported`) → `declared`; otherwise `contextWindowCeiling` → `config` |
| FR-02 | No deny with origin `config`, in any zone; telemetry and guidance still injected; trusted origin unchanged | `src/core/services/brake-engine.ts:handlePreTool` (`zone !== 'CRITICAL' \|\| !isTrustedWindow(...)`) | `tests/unit/brake-engine-window-trust.test.ts` (TC-02), `tests/e2e/e2e-window-trust.test.ts` (TC-12) | conformant | Gate runs before the block append, so no block is logged. Turn limits raise a zone to `RED` at most, so turns cannot deny (DEC-PD-02). Live: this review's own tool results carry `[ContextBrake v3] ... source=estimated window=config zone=CRITICAL action=not blocked (no harness window, see context-brake doctor); finish the RED actions` from the repository hook, and no call was denied |
| FR-03 | `integration_failure` only when the last recorded reading is `CRITICAL` with a trusted window | `src/core/services/failure-policy.ts:wasTrustedCritical`; `windowOrigin` written by `brake-engine.ts:handlePostTool` | `tests/unit/failure-policy-window-trust.test.ts` (TC-03), `window-origin.test.ts` (TC-04) | conformant | `config` or absent origin → neutral with the error recorded; `harness`/`declared` → deny. The adapter rule matches (`.agents/rules/harness-adapters.md:33`) |
| FR-04 | Plain `init` installs the bridge in full mode; `--no-statusline-bridge` opts out and is remembered; no record → `config` | `src/cli/commands/init.ts:68-69`, `statusline-planner.ts:requestedEntry`, `statusline-default.ts` | `tests/integration/statusline-default.test.ts`, `statusline-install.test.ts`, `tests/unit/statusline-default.test.ts` (TC-09), TC-12 | conformant | Built CLI in a temp repo with isolated `HOME`/`USERPROFILE`: plain `init --yes --json` → `success`, exit 0, `statusLine` of the bridge in `.claude/settings.local.json`; `--no-statusline-bridge` → exit 0, key and file removed, `claude-statusline-opt-out.json` written; a later plain `init` → exit 0, still no bridge |
| FR-05 | Declared window for harnesses without a source; schema validates | `window-trust.ts:acceptsDeclaredWindow`, `configuration.ts` (`declaredContextWindow`), `config-legacy-checks.ts:normalizeTurnLimits`, `schemas/context-brake.config.schema.json` | TC-01, TC-05 (`window-origin.test.ts:43-50`), TC-12 (built Codex hook) | conformant | Declaration ignored for `supported` (Pi, Oh-My-Pi) and `unknown` (Claude Code) `context_usage` |
| FR-06 | Block `v3` with `window=`; with `config` the action does not promise blocking; debug line repeats the origin | `telemetry-block.ts` (`TELEMETRY_BLOCK_VERSION = 3`, `window=`), `window-trust.ts:telemetryAction`, `session-zone.ts:renderSessionTelemetry`, `brake-engine.ts:telemetryDecision`, `instruction-markers.ts:DEBUG_MODE_LINE` | `telemetry-block.test.ts`, `telemetry-block-budget.test.ts`, `window-trust.test.ts` (TC-06, TC-07), `instruction-markers.test.ts` (TC-08) | conformant | Only `ZONE_ACTIONS.CRITICAL.compact` promises blocking and is replaced by the untrusted text; live block above shows it |
| FR-07 | `doctor` text and `--json` show per harness whether the brake can deny and why; warning with `context-brake init` remediation without the bridge | `src/core/services/brake-window-report.ts`, `doctor-report-extras.ts`, `src/cli/output/doctor-mode-text.ts`, `schemas/doctor-report.schema.json` | `tests/unit/brake-window-report.test.ts` (TC-10), `tests/integration/doctor-brake-window.test.ts` (TC-11) | conformant | Built CLI: with the bridge, `brakeWindow: [{claude-code, canDeny: true, reason: bridge}]` and text `  - brake: claude-code can block (status line bridge)`; after the opt-out, `{canDeny: false, reason: bridge_absent}` and `STATUSLINE_BRIDGE_ABSENT` with remediation `Run context-brake init. After --no-statusline-bridge, run context-brake init --statusline-bridge.` |
| FR-08 | README, protocol, and research docs describe the rule, `window=`, the default bridge, the declared window, and each harness's window source | `README.md:31,53,71,80,179,271-286`, `protocol-service.ts` → `docs/context-brake-protocol.md:7`, `docs/telemetry-block.md`, `docs/research/harness-integrations.md` ("Fonte da janela e freio (PRD-09)") | `tests/unit/readme-config-example.test.ts` (TC-14) | conformant | README lines 31, 53, and 80 now carry the trusted-window condition; no README sentence states a deny without it (`grep -n -i "block\|deni\|deny" README.md`). The research table lists the source, the `window=` origin, and whether each harness can block |
| FR-09 | Runner cuts at `CRITICAL` only with a trusted window | `session-watch.ts:isCriticalGraceOver`, `run-ports.ts:LedgerReading.windowOrigin`, `node-ledger-watcher.ts:readingFromLedger` | `tests/unit/session-watch-window-trust.test.ts` (TC-16), `tests/e2e/e2e-run-autonomy.test.ts` | conformant | `config` or legacy → no `critical_ceiling` end; `harness`/`declared` → `critical_ceiling` |
| NFR-01 | Hook p95 within 100 ms / 120 ms | Origin resolved from data `readZone` already loads | `runtime-overhead`, `statusline-overhead`, `claude-transcript-usage` (TC-15) | conformant | In this session's full run: `runtime-overhead` 4 passed, `statusline-overhead` 3 passed (120 ms p95 with 200 `statusline` lines), `claude-transcript-usage` 15 passed |
| NFR-02 | Optional schema fields only; `schemaVersion` 1; `window=` ≤ 10 tokens | `configuration.ts` (`optionalPositiveInt`), `diagnostics.ts` (`brakeWindow` optional), ledger `windowOrigin` optional, `v` stays 1 | TC-05, TC-06, TC-13 | conformant | Schema diffs add optional properties only; `schemas:check` passes |
| NFR-03 | Linux, macOS, Windows | — | CI | not verifiable | Windows exercised locally (Git Bash); no CI run exists for this uncommitted diff (see limitations) |
| DEC-PD-02 | Turns never deny without a trusted window; declaration only for harnesses without a source | `brake-engine.ts:handlePreTool`, `window-trust.ts:acceptsDeclaredWindow` | TC-01, TC-02 | conformant | See FR-02, FR-05 |
| TC-01–TC-16 | Test cases of the TechSpec | listed above | all listed files exist and passed in this session's full run | conformant | TC-10 lives in `brake-window-report.test.ts` (builder moved under DEC-11); TC-05 lives in `window-origin.test.ts`; TC-09 now expects exit 1 (`status: warnings`), never exit 2, and lists the malformed-settings case (`DEC-HIL-03`) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100-line files, 30-line functions, ≤3 parameters, no comments) | OK | `npm run lint` exit 0 (ESLint `max-lines`, `max-lines-per-function`, `max-params`); no `src/` file above 100 lines |
| `javascript-typescript.md` | OK | `WINDOW_ORIGINS` constant and `WindowOrigin` union; exported functions typed; QA-01, QA-02 zero hits |
| `node.md` (no stdout on the hook path, no sync I/O in-process) | OK | QA-05 and QA-06 zero hits |
| `tests.md` (IDs in test names, exact agent-facing text) | OK | New describes cite `prd-09` with FR/DEC/TC IDs; agent-facing texts asserted exactly (`window-trust.test.ts`, `instruction-markers.test.ts`) |
| `file-changes.md` | OK | Opt-out marker planned as a change and covered by `STANDARD_HARNESS_PATHS` snapshots (`src/cli/snapshot-helper.ts`); an unparseable local settings file is left untouched in the default case (`statusline-default.ts:softenDefaultConflict`) |
| `cli-output.md` | OK | `STATUSLINE_BRIDGE_ABSENT` carries message, impact, remediation; the doctor line uses `can block` / `only warns`; exit codes unchanged |
| `harness-adapters.md` (Failure Policy, capability states) | OK | `.agents/rules/harness-adapters.md:33` states the trusted-window condition; `capabilities.ts:8` impact text matches the default bridge |
| AGENTS.md architecture (core imports no infrastructure/cli) | OK | QA-04 zero hits |

## Quality profile

Scope: the 76 TypeScript files added or modified since `e0a9604` (`core_files`: 20; `in_process_files`: 0; `hook_files`: `brake-engine.ts`, `failure-policy.ts`, `session-zone.ts`, `window-trust.ts`). The `\|` in the TechSpec table is read as the Markdown escape of `|`; commands ran with plain alternation in Git Bash with ripgrep.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | 0 | OK |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | 0 | OK |
| QA-03 | Empty `catch` | blocking | `rg -n --type ts -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | 0 | OK |
| QA-04 | core → infrastructure/cli | blocking | `rg -n --type ts "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | 0 | OK |
| QA-05 | stdout on the hook path | blocking | `rg -n --type ts 'console\.log\|process\.stdout\.write' "${hook_files[@]}"` | 0 | OK |
| QA-06 | Sync file API in in-process adapters | blocking | `rg -n --type ts '\b(readFileSync\|writeFileSync\|appendFileSync\|existsSync\|spawnSync)\b' "${in_process_files[@]}"` | 0 (no in-process file in the diff) | OK |
| QA-07 | Clock or randomness in core | reservation | `rg -n --type ts 'Date\.now\(\)\|new Date\(\)\|Math\.random\(\)' "${core_files[@]}"` | 0 | OK (baseline `session-watch.ts:36` `new Date(now)` does not match) |
| QA-08 | 4+ parameters | reservation | `rg -n --type ts '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | 2 matches, 0 real | OK — `tests/unit/runtime-claude-measured.test.ts:30` and `tests/e2e/e2e-window-trust.test.ts:21` have three parameters; the comma in `Record<string, unknown>` matches |
| QA-09 | File above 100 lines | reservation | `wc -l` per file vs `git show e0a9604:<path> \| wc -l` | 1 aggravated of 3 | reservation — `tests/e2e/e2e-simulated-long-task.test.ts` 101 → 102; `e2e-brake.test.ts` (106) and `process-hook-host.test.ts` (105) unchanged from base |

- Terrain baseline: applied from TechSpec.
- Hits discounted by baseline: 2 (the two unchanged QA-09 files).
- Reservations accumulated in the feature: 1 (QA-09, `e2e-simulated-long-task.test.ts`); neither correction round added one.
- Suggested escalation: no trigger fired (1 reservation < 8; no touched file above 200 lines, largest 106; no block duplicated in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 origin in `resolveUsage` | YES | `usage-resolver.ts:resolveWindow` |
| DEC-02 capability filter | YES | `session-zone.ts:readZone`, `ZoneSettings.descriptor.capabilities`; `wrap-telemetry.ts` passes `RUNTIME_DESCRIPTORS` with capabilities |
| DEC-03 in-place gate, no block logged | YES | `brake-engine.ts:handlePreTool` |
| DEC-04 optional ledger field, legacy = `config` | YES | `session-ledger.ts:toolLineSchema` (`windowOrigin` optional); `failure-policy.ts:wasTrustedCritical` |
| DEC-05 `declaredContextWindow` | YES | `configuration.ts:telemetrySchema`, `config-legacy-checks.ts:normalizeTurnLimits` |
| DEC-06 block `v3`, warning-only CRITICAL action | YES | `telemetry-block.ts`, `window-trust.ts:UNTRUSTED_CRITICAL_ACTION`, `telemetryAction` |
| DEC-07 debug line | YES | `instruction-markers.ts:DEBUG_MODE_LINE` |
| DEC-08 default bridge; plain `init` never fails because of the bridge | YES | `statusline-planner.ts:requestedEntry`; `statusline-default.ts:softenDefaultConflict`; explicit `--statusline-bridge` keeps the conflict |
| DEC-09 opt-out marker file | YES | `statusline-default.ts:STATUSLINE_OPT_OUT_FILE`, `planStatuslineOptOut`, `clearStatuslineOptOut`; `planStatuslineRemove` clears it |
| DEC-10 `brakeWindow`, `STATUSLINE_BRIDGE_ABSENT` | PARTIAL (location only) | Behavior matches; builder and finding live in `brake-window-report.ts` (core) instead of `window-trust.ts` and `statusline-diagnostics.ts`, as `codereview_01` and `codereview_02` recorded |
| DEC-11 file budgets, absorbed extraction | YES | `doctor-report-extras.ts`; no `src/` file above 100 lines; no new export in the modules with ten or more exports |
| DEC-12 runner gate | YES | `session-watch.ts:isCriticalGraceOver`, `node-ledger-watcher.ts:readingFromLedger` |
| Contracts and data: bridge state accepts `{ v: 1, optedOut: true }` | NO (text only) | `techspec.md:62` still describes the pre-T02 design; DEC-09 was amended to the separate marker file, which the code implements (optional improvement below) |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | T01.1–T01.5 checked; changed files match the diff |
| T02 | `done/task_02.md` | COMPLETE | T02.1–T02.6 checked; changed files match the diff |
| T03 (`codereview_01/CR-01`) | `codereview_01/done/task_03.md` | COMPLETE | T03.1–T03.3 checked; `statusline-default.ts` and its tests match the diff |
| T04 (`codereview_01/CR-02`, DEC-HIL-02) | `codereview_01/done/task_04.md` | COMPLETE | T04.1–T04.2 checked; `README.md:71`, `capabilities.ts:8`, `.agents/rules/harness-adapters.md:33` match the diff |
| T05 (`codereview_02/CR-01`, DEC-HIL-03) | `codereview_02/done/task_05.md` | COMPLETE | T05.1–T05.2 checked; `README.md:31,53,80` and the TC-09 row of `techspec.md` match the handoff; no code changed, consistent with the diff |

## Executed validations

- Profile and scope: hook engine (process and in-process) and CLI (`init`, `doctor`); end-to-end through the built CLI and hooks in temporary directories, per AGENTS.md.
- Validated state: worktree at `e0a9604` plus the feature diff and both correction rounds; Windows 11, Node 24.19.0, Git Bash. The 113 non-SDD files in the diff were hashed before the first command and matched by `sha256sum -c` after the last one: no source changed during the review.
- Reused evidence: none; every command below ran in this session.
- Manual acceptance: optional TokenHound check (owner: user) not run.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed (exit 0); regenerated schemas byte-identical to the worktree (sha256) | TC-13 (generation), build |
| `npm run coverage` | passed (exit 0) in one run: 298 files passed, 1,874 tests passed, 3 skipped; 519 s; 95.65% statements and lines, 91.53% branches, 96.53% functions. `e2e-support-limitations` 2 passed (19.8 s), `boot-git-delivery` 5 passed | all TCs, NFR-01 (TC-15) |
| `npm run typecheck` | passed (exit 0) | build quality |
| `npm run lint` | passed (exit 0) | code standards |
| `npm run schemas:check` | passed (exit 0) | TC-13 |
| `npm run package:smoke` | passed (exit 0) | package |
| Quality profile script (QA-01–QA-09) over 76 TS files | passed; 1 reservation | QA-01–QA-09 |
| Built CLI in a temp Git repo with `.claude/`, isolated `HOME`/`USERPROFILE`: plain `init --yes --json`, `doctor --json`, `doctor`, `init --no-statusline-bridge`, plain `init`, `doctor --json` | as expected (details under FR-04 and FR-07) | FR-04, FR-07, DEC-08, DEC-09 |

## Findings

No actionable finding in this review.

Optional improvements (not blocking):

- QA-09 reservation: `tests/e2e/e2e-simulated-long-task.test.ts` grew from 101 to 102 lines (carried from `codereview_01`).
- `docs/telemetry-block.md:108` ("Failure Variant") still says ContextBrake denies when the last recorded zone was `CRITICAL`, without the trusted-window condition of FR-03. The same document states the rule in field 6 ("With `window=config`, ContextBrake blocks no tool call in any zone") and in "Changes from v2", and FR-08 names the README and the protocol, which are consistent, so it is not a finding; adding "with a trusted window" would align the section. The same applies to the `CRITICAL` rows of `docs/context-brake-protocol.md` and `docs/telemetry-block.md` ("Other tool calls are blocked"), qualified in their own telemetry paragraphs.
- `techspec.md:62` (Contracts and data) still says the bridge state accepts `{ "v": 1, "optedOut": true }`; DEC-09 and the code use the separate marker file `claude-statusline-opt-out.json`. CMP-06 also lists `statusline-state.ts`, which the feature did not modify.
- `window-trust.ts:telemetryAction` recognizes the blocking text by string equality with `ZONE_ACTIONS.CRITICAL.compact`; a later rephrase would silently keep promising a block (carried).
- The `STATUSLINE_SETTINGS_INVALID` impact text says "was not installed" also when an installed bridge could not be updated (`statusline-default.ts:conflictFinding`; the message already says "installed or updated") (carried).
- The TC-08 describe cites `TC-03` (PRD-08) instead of `TC-08`; the unsupported-path TC-09 case is covered only by the unit test (carried).

## Previous findings (re-review only)

| Review/ID | State | Current evidence |
| --- | --- | --- |
| codereview_02/CR-01 | resolved | `README.md:53` states the deny needs a trusted window (harness-reported, or `telemetry.declaredContextWindow` for harnesses that report none) and that with the fallback `CRITICAL` only warns; `README.md:80` says Antigravity returns `deny` only with `telemetry.declaredContextWindow`, otherwise `allow` in every zone; `README.md:31` carries the same condition. A sweep of `block`/`deny` sentences in the README found no unconditional deny statement; `readme-config-example` 6 passed |
| codereview_02 limitation (TC-09 "exit 0") | resolved | `techspec.md` TC-09 now expects "warning and no bridge, exit 1 (`status: warnings`), never exit 2" and lists the malformed-settings case, per `DEC-HIL-03` |
| codereview_02 limitation (full suite not green) | resolved | `npm run coverage` exit 0 in one run in this session (see Executed validations) |
| codereview_01/CR-01, CR-02, failure-policy rule text | resolved | Resolved in `codereview_02`; the code is unchanged since (T05 changed only `README.md` and `techspec.md`), and the default-bridge flow was reproduced with the built CLI in this session |

## Limitations and open items

- NFR-03: Linux and macOS not verified; no CI run exists for this uncommitted diff. The TechSpec assigns them to CI; the HIL should require a green CI run on the commit before closing the feature.
- Manual TokenHound acceptance (optional, owner: user) not run.
- Snapshot filter: the file is under 8 KiB and was read in one call; only the header, next step brief, open threads (O-03, O-04), and `on-run` entries (L-01, L-02, L-04) were used. `git_head` e0a9604 = `HEAD`; `covers_through` (`codereview_02/done/task_05.md`) matches the stage source; the worktree matches the listed changes.
- The repository hook injected `window=config` telemetry into this session (estimated usage over the 128,000 fallback, reaching `CRITICAL` with the warning-only action). Under the reviewer contract no session pause was taken; no call was denied, which is the FR-02 behavior.
- `workflow.md` records nothing from this review; the coordinator records the status per `delegated-review.md#receive`.

## Conclusion

Both correction rounds hold: the README now states the trusted-window condition wherever it describes a deny, TC-09 matches the real exit code, and the full suite passed in one run, which clears every item `codereview_02` left open. The window-origin model, both deny gates, the declared window, telemetry `v3`, the doctor `brakeWindow` report and warning, the default bridge with its remembered opt-out, and the runner gate implement FR-01–FR-09 with a passing test for every TC, confirmed with the built CLI for the install and doctor flows. The quality profile has no blocking hit and one carried reservation (QA-09). With no actionable finding and only optional improvements, the status is APPROVED WITH RESERVATIONS; NFR-03 on Linux and macOS remains for CI on the commit.
