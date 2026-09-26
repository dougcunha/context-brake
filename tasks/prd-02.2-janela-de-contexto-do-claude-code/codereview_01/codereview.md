# Code review report — PRD 2.2 real context window in Claude Code

## Summary

- Status: REJECTED
- Git scope: `5917593..working tree` (uncommitted, not delimited by a base commit — see limitations). The review covers the 51 modified and 36 untracked paths from `git status` on 2026-09-25 that belong to T01–T05.
- Previous review: —
- Independence: this session did not write or change the code under review. It changed no code; it wrote only this report.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md` | read |
| TechSpec | `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md` | read |
| Manifest | `tasks/prd-02.2-janela-de-contexto-do-claude-code/tasks.md` | read; T01–T05 checked, all five links resolve to `done/task_0N.md` |
| Snapshot | `context-snapshot.md` | loaded as an independent stage: header, next step brief, `Open threads`, and `on-run` entries only |
| Implementation | worktree diff over HEAD `5917593`, plus the five handoffs | limited: no base commit |

Out-of-feature changes in the worktree, not judged here: `.agents/hooks/context-brake.mjs` (rebuilt hook), `.agents/settings.json` (`Stop` hook), `.context-brake/manifest.json`, `.gitignore`, and `context-brake.config.json`. They come from running `init` on this repository with the new build. The manifest's new `.claude/hooks/context-brake-statusline.mjs` asset is consistent with DEC-01.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| OBJ-01 | 100% of blocks after the first status line run show the latest window | `session-zone.ts:mergeMeasurements` + unchanged `usage-resolver.ts:26` | `session-zone-statusline.test.ts` (window not asserted on the estimated path) | non-conformant | CR-01: estimated blocks show `contextWindowCeiling` |
| OBJ-02 | Status line output intact | `statusline-bridge.ts:passThrough`, `statusline-settings.ts:bridgeCommand` | TC-06, TC-08 | conformant for the fixtures; see CR-05 | `statusline-bridge.test.ts` passed |
| OBJ-03 | No regression without the bridge | `mergeMeasurements` equals PRD 2.1 inputs with no lines | TC-05, PRD 2.1 suites | conformant | full suite passed except one known timeout |
| OBJ-04 | Hook p95 ≤ 100 ms, bridge adds ≤ 50 ms | — | TC-20 | not verifiable | CR-04 |
| US-01 | 1M sessions use the real window | as FR-04 | TC-03, manual | conformant (measured path) | manual acceptance reported as passed |
| US-02 | Keep existing status line | planner + bridge | TC-06, TC-12 | conformant | — |
| US-03 | Window follows `/model` | `summarizeStatusline` takes the last window | TC-02, manual step 4 | conformant | manual reported as passed, no per-step detail |
| US-04 | Diagnose the bridge | `statusline-diagnostics.ts` | TC-16 | non-conformant | CR-02 |
| US-05 | Clean removal | `statusline-restore.ts` | TC-12, TC-13, TC-21 | conformant | — |
| FR-01 | Opt-in local install, absolute forward-slash path, dry run, flagless rerun keeps it | `statusline-planner.ts:planStatuslineEntry` | TC-10–TC-12, TC-15 | conformant | `statusline-install.test.ts` |
| FR-02 | Run previous command (local, project, user), same stdin, output, exit, `padding`, `refreshInterval` | `statusline-settings.ts:firstPreviousStatusline`, `bridgeCommand` | TC-06, TC-10 | non-conformant (edge case) | CR-05: a previous command ending in a `#` comment breaks the pipeline; the real-shell pipeline has no automated test (CR-03) |
| FR-03 | Record five values per session; nulls do not overwrite | `statusline-payload.ts`, `statusline-summary.ts` | TC-01, TC-02, TC-06, TC-09 | conformant | — |
| FR-04 | Window from the bridge, else the ceiling | `mergeMeasurements` | TC-03, TC-05 | conformant for measured readings; see CR-01 | — |
| FR-05 | Bridge tokens as fallback after the reset | `mergeMeasurements`, `isStale` | TC-04 | conformant | — |
| FR-06 | Keep the window and drop usage across resets | `summarizeStatusline` keeps it; the estimated path drops it | TC-02, TC-04 | non-conformant | CR-01: after `/compact`, the block shows `tokens=15150/128000` with a recorded window of 1,000,000 |
| FR-07 | Doctor state, source, last window, four warnings | `statusline-diagnostics.ts`, `statusline-context-window.ts` | TC-16–TC-18 | non-conformant | CR-02 (tracked-file check on a symlinked `.claude`) |
| FR-08 | Removal restores the key and deletes a created file | `statusline-restore.ts` | TC-12, TC-13, TC-21 | conformant | — |
| FR-09 | README and research docs | README subsection, `harness-integrations.md` | TC-19 | conformant; the README bullet on zones overstates the behavior until CR-01 is fixed | `readme-config-example.test.ts` |
| NFR-01 | Performance budgets | — | TC-20 | not verifiable | CR-04 |
| NFR-02 | Resilience | `statusline-bridge.ts` | TC-08 | conformant | — |
| NFR-03 | Privacy | `statusline-payload.ts`; `failureDetail` logs the class name only | TC-09 | conformant | `failure-policy.ts:44-47` |
| NFR-04 | Compatibility | optional `contextWindow`; ledger union additive | TC-01, TC-18, `schemas:check` | conformant | — |
| NFR-05 | Quality gates | — | lint, typecheck, coverage, schemas, smoke | conformant | see validations |
| NFR-06 | Platforms, including paths with spaces, quotes, and accents | `bridgeCommand` quoting | TC-11 (string only), TC-21 (no shell) | not verifiable | CR-03 |
| DEC-01–DEC-13, CMP-01–CMP-14 | see TechSpec adherence | — | — | — | — |
| TC-01–TC-21 | Listed suites | new and modified tests | — | present; TC-17, TC-18, and TC-20 live in new files | handoffs T04, T05 |
| Manual acceptance | Five-step script with a 1M model | — | user | reported as passed on 25/09/2026, with no per-step detail | `done/task_05.md#handoff` |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` / QA profile | OK | no new blocking hits (see Quality profile) |
| `node.md` (stdout belongs to the harness) | OK | the bridge writes stdout only in `--pipe` mode (`statusline-bridge.ts:27-38`) |
| `file-changes.md` (plan, owned keys, refuse unparseable) | OK | `setJsonProperty`/`removeJsonProperty` on `statusLine` only; `INVALID_HARNESS_CONFIG` for local/project (`statusline-planner.ts:42,52`) |
| `harness-adapters.md` (research first) | OK | Status line bullet in `docs/research/harness-integrations.md`, dated 25/09/2026 |
| `AGENTS.md` (symlinked configs, Windows) | NOT OK | CR-02 |
| `tests.md` | partially | the estimated-path window (CR-01) and real-shell execution (CR-03) are untested |
| `cli-output.md` | OK | one doctor text line (`text.ts:150-152`) |

## Quality profile

Run from Git Bash over the 71 TypeScript files in the diff, with the TechSpec `RG` command set.

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | as TechSpec | 0 | OK |
| QA-02 | suppressions | blocking | as TechSpec | 0 | OK |
| QA-03 | empty catch | blocking | as TechSpec | 0 new of 2 | pre-existing (`symlinked-harness-config.test.ts:30,58`, present in HEAD) |
| QA-04 | `exec`/`shell: true` | blocking | as TechSpec | 0 | OK |
| QA-05 | core → infra/cli | blocking | as TechSpec | 0 | OK |
| QA-06 | stray stdout in the hook path | blocking | as TechSpec | 0 | OK |
| QA-07 | `throw new Error(` | reservation | as TechSpec | 0 new of 19 | pre-existing (baseline `scripts/*`, untouched test lines) |
| QA-08 | clock in core | reservation | as TechSpec | 0 | OK |
| QA-09 | 4+ parameters | reservation | as TechSpec | 1 new of 2 | `statusline-planner.test.ts:18` is a single destructured parameter, a regex false positive; not counted |
| QA-10 | file > 100 lines | reservation | as TechSpec | 0 | OK; largest new file `statusline-planner.ts` has 82 lines |

- Terrain baseline: applied from the TechSpec, plus a HEAD check for hits on lines the diff did not change.
- Hits discounted by baseline: 21.
- Reservations accumulated in the feature: 0.
- Suggested escalation: no trigger fired (0 reservations, no touched file above 200 lines, no duplication in 3+ places).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 | YES | `ASSET_ENTRIES`, `REQUIRED_FILES`, `STANDARD_HARNESS_PATHS`; bridge asset planned on every install (`statusline-planner.ts:20-23`) |
| DEC-02 | PARTIAL | the command format matches; there is no test that runs it through `sh`/Git Bash (CR-03), and a trailing comment breaks it (CR-05) |
| DEC-03 | YES | pass-through first, 1 MiB buffer, 1,500 ms deadline, root from `assetProjectRoot`, exit 0 |
| DEC-04 | YES | `statusline-line.ts` |
| DEC-05 | YES | `statusline-summary.ts` |
| DEC-06 | YES as written; conflicts with PRD FR-06/OBJ-01 | CR-01: keeping `resolveUsage` unchanged drops the window on estimated readings |
| DEC-07 | PARTIAL, user-approved deviation | owner `harness_entry` instead of `runtime_state` (tasks.md, Problems and solutions); the TechSpec was not amended (CR-07) |
| DEC-08 | PARTIAL | the flag is rejected only when `--harness`/`--exclude-harness` exclude Claude Code, and has no effect when it is not detected (CR-06) |
| DEC-09 | YES, with an approved extension | `AdapterPlan.findings` (CR-07) |
| DEC-10 | PARTIAL | CR-02; see also OI-01 |
| DEC-11 | YES | `statusline-restore.ts` |
| DEC-12 | YES | README, telemetry doc, capability text |
| DEC-13 | YES as a test; the budget itself is not verifiable | CR-04 |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | handoff flags the estimated-window behavior, confirmed as CR-01 |
| T02 | `done/task_02.md` | COMPLETE | TC-06–TC-09 rerun green |
| T03 | `done/task_03.md` | COMPLETE | deviations recorded; comment edge confirmed as CR-05 |
| T04 | `done/task_04.md` | COMPLETE | TC-16–TC-18, TC-21 green; CR-02 is outside its tests |
| T05 | `done/task_05.md` | COMPLETE | TC-19/TC-20 green under the local rule; manual reported as passed |

## Executed validations

- Profile and scope: CLI (`init`, `remove`, `doctor`), a per-event hook process, and a new status line process. End-to-end tests run the built CLI against a temporary repository (TC-21). No web surface.
- Validated state: HEAD `5917593` plus the uncommitted worktree; Windows 11, Node 20+, Git Bash; the repository's `.claude` is a symlink to `.agents`.
- Reused evidence: none for commands. All gates were rerun in this session, serially over `dist/` and `coverage/`.
- Manual acceptance: the user reported a pass on 25/09/2026, on `D:/MyProjects/ContextBrake` (no spaces) with `ccstatusline`. No per-step detail was recorded, and none of the steps exercises the post-compaction case in CR-01.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | CMP-13 |
| `npm run lint` | passed | NFR-05 |
| `npm run typecheck` | passed | NFR-05 |
| `npm run schemas:check` | passed | NFR-04, TC-18 |
| `npm run coverage -- --coverage.reportOnFailure` | failed: 259/260 files; 1,704 passed, 1 failed, 3 skipped; all files 95.31% statements / 90.7% branches | NFR-05 |
| `npx vitest run tests/integration/init-legacy-turn-limits.test.ts` (alone) | passed 4/4; the full-run failure is the known load timeout (snapshot L-03), outside this feature | — |
| `npx vitest run tests/integration/statusline-overhead.test.ts` | passed 3/3 under the local rule; p95 bridge 331.1 vs 175.1 ms (+156), PreToolUse 259.8 vs 118.1 (+142), PostToolUse 187.7 vs 79.6 (+108) | TC-20 (CR-04) |
| `npm run package:smoke` | passed | DEC-01 |
| `npx tsx scratchpad/probe-zone.ts` (ledger: window 1,000,000, reset, post-compact line with null tokens; stale transcript) | block `tokens=15150/128000 source=estimated` | CR-01 |
| `git check-ignore -q .claude/settings.local.json` / `.agents/settings.local.json` | exit 0 / exit 1 | CR-02 |
| `node dist/src/cli/main.js doctor --json --harness claude-code` | `contextWindow` installed/statusline/1000000; no `STATUSLINE_LOCAL_TRACKED` | CR-02 |
| `sh -c 'cat \| ( echo hi # note )'` | syntax error, exit 2; with a newline before `)`: prints `hi` | CR-05 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | FR-06, OBJ-01 (PRD wins over DEC-06) | `src/core/services/session-zone.ts:52-59` passes the bridge window only inside `measured`; `usage-resolver.ts:26` returns `windowTokens: contextWindowCeiling` whenever `tokens` is null. After `/compact`, the transcript reading is stale and the post-compact status line has `current_usage: null`, so the reading is estimated: the probe prints `tokens=15150/128000 source=estimated` with a recorded window of 1,000,000. `session-zone-statusline.test.ts:53-61` asserts only `source`. | Right after every reset, the block shows the misleading 128,000 window that the PRD exists to remove. The README bullet "after the status line first runs … the telemetry block shows … the model's `context_window_size`" is false in that interval. | Make the estimated path use the harness/bridge window: for example, `resolveUsage` falls back to `measured?.contextWindow ?? contextWindowCeiling` on the estimated branch. That also changes PRD 2.1 behavior for in-process harnesses that report a window, so first record it as an amended DEC-06, then add a TC asserting `windowTokens: 1000000` on the estimated path. |
| CR-02 | Medium | FR-07, US-04, `AGENTS.md` (symlinked configs) | `statusline-diagnostics.ts:50-53` runs `git check-ignore` on the link path `.claude/settings.local.json`. In this repository, `.claude → .agents`, `/.claude` is ignored, and the real file `.agents/settings.local.json` is not (exit 1, shown as `??`). `doctor --json` emits no `STATUSLINE_LOCAL_TRACKED`. | A machine-specific absolute command can be committed with no warning, which FR-07 requires. | Check the real target: `resolveChangeTarget(root, CLAUDE_LOCAL_SETTINGS_FILE)` made relative to the root (both paths when they differ), plus a symlinked-`.claude` case in TC-16. |
| CR-03 | Medium | NFR-06, DEC-02, TechSpec "Platforms" | No test runs the installed `statusLine.command` through `sh`/Git Bash. `runStatuslinePipeline` joins two `node` processes without a shell (`tests/helpers/built-hook.ts:60-80`); TC-11 compares strings; TC-21 runs the bridge directly (`e2e-statusline-bridge.test.ts:42`). The manual run used a path without spaces. | Quoting of roots with spaces or accents, and of previous commands with quotes, is unproven on the shells that run it. | Add an integration case that runs the planned command with `sh -c` (Git Bash on Windows CI) for a root with spaces and accents and a previous command with quotes, asserting byte-equal output and exit code. |
| CR-04 | Medium | NFR-01, OBJ-04, TC-20 | Local rerun: bridge +156 ms, hooks +142/+108 ms p95 over baseline. They pass only through the local rule `max(target, baseline*3 + 150)`; the CI rule would fail them. The T05 handoff measured +27.7/+80/+95 ms. No CI run exists for this uncommitted state. | The budget is unproven. The Windows numbers suggest the second Node start in the pipeline may not fit 50 ms. | Cause still pending. Run the CI matrix (Linux, macOS, Windows) on this change before approval, and record the p95 values. |
| CR-05 | Low | FR-02, OBJ-02 | `statusline-settings.ts:77` builds `( ${previousCommand} )`; a previous command ending in `# …` comments out the `)`. Reproduced with `sh`: syntax error, blank status line. | For that input, the user's status line disappears. | Close the subshell on its own line, `( ${previousCommand}\n)`; `sh` accepts it (verified). Add the case to TC-10/CR-03. |
| CR-06 | Low | DEC-08 | `src/cli/init-arguments.ts:44-55` rejects the flags only when `--harness`/`--exclude-harness` exclude Claude Code. When Claude Code is simply not detected, `init --statusline-bridge` succeeds silently (T03 handoff open item). | The user gets no bridge and no error. | Validate after detection in `runInit` (or return a finding) when the request is present and `claude-code` is not among the active harnesses. |
| CR-07 | Low | DEC-07, DEC-09, traceability | The user-approved deviations (state owner `harness_entry`; `AdapterPlan.findings`) are recorded only in `tasks.md`. `techspec.md` DEC-07 still says `runtime_state`. | The TechSpec no longer describes the code, so later reviews would flag it again. | Amend DEC-07 and DEC-09 in the TechSpec, citing the 25/09/2026 decision. |

### Optional improvements

| ID | Source | Evidence | Suggestion |
| --- | --- | --- | --- |
| OI-01 | DEC-10 | `statusline-context-window.ts:37-46` picks the newest Claude ledger. Subagent ledgers are keyed by `agent_id` (`claude-code/runtime.ts:19`) and never receive `statusline` lines (`statusline-payload.ts:29`, `agentId: null`), so a recent subagent run makes `doctor` report `contextWindowCeiling` and `null`. | Pick the newest main-session ledger (`agentId` null) or the newest ledger that contains a `statusline` line. |
| OI-02 | style | `src/cli/output/text.ts:151-152` ends a template literal with a raw newline instead of `\n`, unlike the neighboring lines. | Use `\n`. |

## Limitations and open items

- No `--base` was given and nothing is committed, so the scope is HEAD `5917593` plus the worktree. Unrelated dogfooding changes in the worktree were excluded by path.
- CI (Linux, macOS, Windows) was not run; NFR-01 and NFR-06 stay not verifiable (CR-03, CR-04). PowerShell-only Windows is unsupported by the TechSpec's design and was not tested.
- The manual acceptance has no per-step record and did not cover a post-compaction block or a path with spaces.
- The full coverage run exits 1 because of the known load-sensitive `init-legacy-turn-limits` timeout, which passes alone. The TechSpec coverage gate (≥ 80%) is met at 95.31%.

## Conclusion

REJECTED. The implementation is well structured, with no new blocking quality hits, and most of the matrix is conformant. However, FR-06 and OBJ-01 are not met: after every reset, the telemetry block falls back to the 128,000 ceiling while a real window is recorded (CR-01). FR-07's tracked-file warning also fails on symlinked `.claude` directories, including this repository (CR-02). Essential evidence for NFR-01 and NFR-06 is missing (CR-03, CR-04). CR-01 needs a TechSpec amendment to DEC-06 before it is corrected. CR-02, CR-03, CR-05, and CR-06 have proven fixes, and CR-04 needs a CI run.
