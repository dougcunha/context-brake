# Test refactoring plan

Repo: `context-brake`
Generated: 2026-10-09
Packages: `.` (Vitest 3, ESM, `projects` lanes: parallel / process / serial)
Order confirmed by user: 2026-10-10

## Scope

- In scope: `tests/unit/` and `tests/integration/` (flat folders mirroring no source tree; modules are mapped by the `src/` folders each file imports).
- Out of scope: `tests/e2e/` (smoke set fixed by `.agents/rules/tests.md`: one per command plus one hook round trip per process harness), `tests/bench/` (separate runner, `npm run test:bench`), and the untracked `chat-clean` skill tests under `.agents/` and `.claude/`.

## Project rules that override the mutant criterion

- Mandated rows (`.agents/rules/tests.md`, Required Scenarios): each module's plan table starts from these, not from zero.
  - Zone classification, zone actions, snapshot settings, failure policy, and harness config changes: success, failure, boundary, and recovery.
  - Every usage and turn boundary from the telemetry PRD.
  - Failure policy for adapter failures in every zone.
  - Exact telemetry block and resume text, plus the 60-token budget.
  - User file changes: content ContextBrake does not own stays byte-for-byte identical, including after a second run.
- Traceability: test names carry `FR`/`NFR`/`TC`/`RF`/`CA`/`DEC` identifiers (222 files, ~1,450 references). Before deleting a test with an identifier, check the TechSpec row; a merged `it.each` keeps every identifier in its title.
- Layout: the project convention is the flat `tests/unit/` and `tests/integration/` folders. Merging several files for one source file into one is a move-only step, separate from assertion rewrites. Unit files that test `src/infrastructure/` adapters move to `tests/integration/` (decision 3).
- Test infrastructure is not production code: a moved, renamed or merged file must update `PROCESS_LANE_FILES`/`SERIAL_LANE_FILES` in `tests/test-lanes.ts` in the same commit, and `npm run test:budget` runs after moves.
- Baselines come from the runner (`vitest run <files>`), which counts each `it.each` row; the `Tests` column below is the grep count (`it.each` = 1) until the module's baseline replaces it.
- Commits carry the session's `Co-Authored-By`/`Claude-Session` trailers.

## Decisions (user, 2026-10-09)

1. **Coverage gate.** Each module commit runs `vitest run --coverage` on the module's files as a proxy; a full `npm run coverage` runs at the end (and when a proxy result looks close to the 80% threshold).
2. **Stryker.** Installed locally only (`npm install --no-save @stryker-mutator/core @stryker-mutator/vitest-runner`), with `stryker.config.json` and a flat Vitest config kept out of the repo (scratchpad or `.git/info/exclude`). Nothing Stryker-related is committed. Set up and proven on `src/core/services/zone-classifier.ts` before the first Critical module; reinstall if a later `npm install` removes it.
3. **Unit tests importing `src/infrastructure/`** are moved to `tests/integration/` when their module is cleaned (move-only step, separate from rewrites; `tests/test-lanes.ts` updated in the same commit when a listed file moves).
4. **Documentation-drift tests** (`readme-*`, `docs-auto-restart`) are treated as Trivial: deleted unless a test protects observable behavior of the code rather than README wording.
5. **Test budget.** `npm run test:budget` (full-suite timing, required by `tests.md` after moving tests) is deferred to the end-of-refactor full run together with the full coverage run; merging and deleting files can only shorten the suite.

## Modules

Level: G = Glue, T = Trivial, C = Common, K = Critical. Order: Glue/Trivial first, then Common, then Critical (Stryker before and after).

| # | Module | Test files | Source | Level | Tests | Status |
|---|--------|------------|--------|-------|-------|--------|
| 1 | cli/args-output | init-arguments, main, exit-codes, cli-output-text, doctor-mode-text | src/cli, src/cli/output | G/C | 42 → 41 | done |
| 2 | cli/assistant-questions | assistant-questions, -gitignore, -invalid, -state | src/cli/assistant | G/C | 28 → 30 | done |
| 3 | cli/assistant-terminal | assistant-output, clack-prompt-port, equivalent-command, terminal | src/cli/assistant, src/cli | C | 35 → 29 | done |
| 4 | doctor/service | doctor-checks, doctor-service, diagnostics, report-service, active-sessions, asset-currency, doctor-context-window | src/core/services (doctor-*, report-service, active-sessions, asset-currency) | C | 29 → 35 | done |
| 5 | doctor/support-versions | support-service, support-service-version-gating, adapter-version-probes, adapter-diagnostics, in-process-sampler, overhead-p95 | src/core/services/support-service, version-service, src/infrastructure/diagnostics | C | 25 → 40 | done |
| 6 | doctor/integration | integration/doctor-* (8 files) | src/cli/commands, src/core/services | G | 21 → 13 | done |
| 7 | repo/release-packaging | release-workflow, check-release-tag, package-metadata, asset-bundler, runtime-bundle-imports, integration/package-assets, integration/package-contents | scripts/, src/infrastructure/storage/package-metadata | G/C | 64 → 51 | done |
| 8 | repo/test-infra | test-budget, test-lanes, e2e-smoke-set, bench-config, benchmark-fixtures | tests/test-lanes.ts, scripts/check-test-budget.ts, vitest configs | C | 22 → 21 | done |
| 9 | repo/docs-drift | readme-config-example, readme-gitignore, readme-light-example, readme-support-table, integration/docs-auto-restart | README.md, docs/ | T | 24 → 0 | done |
| 10 | config/validation | configuration, configuration-sanitizer, configuration-snapshot, configuration-validator, config-legacy-checks | src/core/validation, src/core/services/config-legacy-checks | C | 34 → 29 | done |
| 11 | config/schemas-stores | schemas, changes-schema, integration/project-config-store, integration/manifest-store | src/core/contracts schemas, src/infrastructure/storage | C | 18 → 11 | done |
| 12 | telemetry/counters-statusline | session-counters, session-reset-handler, statusline-summary, statusline-line | src/core/services | C | 36 → 29 | done |
| 13 | brake/errors-merges | runtime-error-checks, runtime-error-line, debug-mode-merge, snapshot-merge | src/core/services | C | 28 → 28 | done |
| 14 | restart/policy | auto-restart-policy, auto-restart-contract, auto-restart-notices, restart-mode, restart-neutrality | src/core/services (auto-restart-*, restart-mode) | C | 42 → 31 | done |
| 15 | restart/flow-arguments | auto-restart-arguments, restart-flow, runner-reset-signal, init-max-restarts-arguments | src/core/services/restart-flow, src/cli | C | 61 → 41 | done |
| 16 | storage/capabilities | link-capability, process-capability, git-capability | tests/helpers (link-, process-, git-capability) | C | 19 → 9 | done |
| 17 | install/services | detection-service, installation-summary, removal-service, integration/removal-conflicts, harness-exclusion | src/core/services (detection, installation-*, removal-*, harness-exclusion) | C | 22 → 21 | done |
| 18 | harness/registration | integration/harness-registry, -adapters, adapter-planners, hook-registration-paths, hook-event-cleanup, idempotent-adapter-merge | src/infrastructure/harnesses, harnesses/common | C | 38 → 32 | done |
| 19 | claude/statusline-planner | integration/statusline-context-window, statusline-default-conflicts, statusline-payload, statusline-planner, statusline-shell-resolution | src/infrastructure/harnesses/claude-code | C | 47 → 38 | done |
| 20 | claude/statusline-diagnostics | integration/statusline-diagnostics, -shell, -symlink | src/infrastructure/harnesses/claude-code | C | 15 → 11 | done |
| 21 | runtime/claude-codex | runtime-claude, runtime-claude-measured, claude-runtime-session-key, runtime-codex, runtime-codex-measured | harnesses/claude-code, harnesses/codex-cli | C | 31 → 29 | done |
| 22 | runtime/process-harnesses | runtime-antigravity, runtime-copilot, runtime-cursor, runtime-assets, harness-schemas-process | harnesses/antigravity-cli, github-copilot-cli, cursor, common | C | 30 → 15 | done |
| 23 | runtime/in-process-harnesses | runtime-omp, runtime-opencode, runtime-pi, omp-runtime-usage, pi-runtime-usage, harness-schemas-in-process | harnesses/oh-my-pi, opencode, pi | C | 30 → 19 | done |
| 24 | integration/init-install | init-assistant-cancel, init-assistant-equivalence, init-detection, init-idempotency, init-install, init-interactive-gate, init-plan, init-remove-footprint, multi-harness-install, detection-cross-signals | src/cli/commands | G | 47 → 37 | done |
| 25 | integration/init-exclusion | init-assistant-exclusion, init-exclusion, -conflicts, -edges, -removal | src/cli/commands, harness-exclusion | G | 16 → 9 | done |
| 26 | integration/init-settings | init-auto-restart, init-config-repair, config-repair-errors, init-debug-mode, init-debug-mode-disable, init-legacy-turn-limits, init-max-restarts, init-snapshot | src/cli/commands, src/core/validation | G | 40 → 17 | done |
| 27 | integration/claude-auto-restart | auto-restart-doctor, -lifecycle, -planner, -removal, -user-settings | harnesses/claude-code | G | 31 → 23 | done |
| 28 | integration/claude-mod | claude-mod-bundle, -gates, -guards, -handoff, -restart | harnesses/claude-code/mod | G/C | 27 → 23 | done |
| 29 | integration/omp-pi-restart | omp-restart, omp-restart-handoff, omp-session-switch, pi-restart, pi-restart-handoff, in-process-restart-plan, semi-auto-restart (now in-process-restart, -gates) | harnesses/oh-my-pi, pi | G | 28 → 27 | done |
| 30 | integration/runtime-harnesses | runtime-antigravity, -codex, -copilot, -cursor, -in-process, -host-process, claude-transcript-usage, codex-rollout-usage | src/infrastructure/runtime, harnesses | G | 45 → 33 | done |
| 31 | integration/runtime-policies | runtime-failure-policy, copilot-failure-policy, runtime-invalid-config, runtime-light-mode, light-mode-lifecycle, runtime-parallel-turns, runtime-retention, runtime-session-ledger, runtime-state-removal, brake-lifecycle, debug-mode-lifecycle, simulated-usage | src/infrastructure/runtime | G | 50 → 30 | done |
| 32 | integration/hooks-lifecycle-misc | retired-hook-events, -copilot, -harnesses, linked-project-root, -lifecycle, asset-currency-lifecycle, cli-shells, support-limitations, invalid-config, remove-invalid-config, node-process-runner | src/cli/commands, src/infrastructure/process | G | 40 → 25 | done |
| 33 | integration/statusline | statusline-bridge, -bridge-lifecycle, -bridge-previous, statusline-default, -install, -install-invalid, statusline-shell, runtime-statusline-ledger | harnesses/claude-code, src/infrastructure/runtime | G | 40 → 36 | done |
| 34 | telemetry/zones | zone-classifier, zone-guidance, telemetry-block, telemetry-block-budget | src/core/services | K | 64 → 43 | done |
| 35 | telemetry/session-zone-usage | session-zone, session-zone-statusline (absorbed session-zone-reset-window), usage-resolver, window-origin, window-trust | src/core/services | K | 50 → 34 | done |
| 36 | brake/engine-failure-policy | brake-engine-debug, brake-engine-lifecycle, failure-policy, failure-policy-snapshot-reset, injection-policy, reset-notice (adapter channels now integration/reset-notice-channels) | src/core/services | K | 35 → 35 | done |
| 37 | runtime/hosts | integration/hook-deadline, in-process-host, in-process-host-deadline, in-process-runtime, process-hook-host, process-hook-host-deadline, runtime-composition, runtime-paths | src/infrastructure/runtime | K | 38 → 34 | done |
| 38 | storage/json-editing | json-document-editor, json-span-safety | src/infrastructure/storage | K | 23 → 21 | done |
| 39 | storage/change-apply | change-plan-service, integration/change-target, -path-boundary, -runtime-state-files, -change-applier, -directory-pruner, -safe-removal | src/core/services/change-plan-service, src/infrastructure/storage | K | 26 → 33 | done |
| 40 | gitignore/core | gitignore-block, gitignore-merge, gitignore-plan (now also gitignore-plan-install) | src/core/services/gitignore-* | K | 39 → 40 | done |
| 41 | gitignore/integration | init-gitignore, -lifecycle, -tracked, -default-runner, remove-gitignore | src/cli/commands, gitignore-* | K | 20 → 13 | done |
| 42 | handoff/store | node-handoff-store, -expiry, -lock, handoff-deadline, handoff-deadline-hosts | src/infrastructure/storage, src/infrastructure/runtime | K | 21 → 18 | done |
| 43 | harness/config-preservation | antigravity-lifecycle, antigravity-registration, claude-preservation, codex-cursor-user-hooks, codex-hook-command-shells, codex-hook-migration, codex-hook-root, legacy-user-hooks, minified-config, minified-config-lifecycle, user-hook-preservation, symlinked-harness-config, symlinked-harness-lifecycle (antigravity-lifecycle, codex-cursor-user-hooks, codex-hook-migration, minified-config-lifecycle removed) | src/infrastructure/harnesses | K | 29 → 29 | done |

Unit files under `tests/unit/` are prefixed implicitly; files marked `integration/` live in `tests/integration/`. Assistant question gitignore (`assistant-questions-gitignore`) stays with module 2 because it tests the assistant flow, not the block.

## 1. cli/args-output — done 2026-10-10

**Baseline:** 46 runner tests across the 7 listed files, green; 42 belong to this module (the 4 `diagnoseProject` tests in `doctor-context-window.test.ts` test `doctor-service` and move to module 4). Stryker: n/a (Glue/Common).
**Result:** 41 tests, green. Scoped coverage proxy (`text.ts`, `doctor-mode-text.ts`, `init-arguments.ts`, `exit-codes.ts`, `main.ts`, `argument-parser.ts`): lines unchanged (91.2%); `text.ts` branches 92.5% → 91.4% (lines 22, 27, 51 were already uncovered before). Commit `4481177`.

### init-arguments.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| bridge flags map to install/remove/undefined | `install ? 'install' : 'remove'` swapped; `&&` → `\|\|` in the harness-target check | `maps %j to %s` (4 rows) |
| conflicting or untargeted bridge flags are rejected | remove each `throw` in `statuslineBridgeRequest` | `rejects %s as an argument error` (3 rows) |
| bridge flags need claude-code detected in the project | `state === 'project'` removed; `request === undefined` guard inverted | `rejects either flag…`, `accepts the flags…` |
| debug flags map to their own field | `debug`/`no-debug` swapped; default `false` → `true` | `parses %j as debug=%s and noDebug=%s` (2 rows) |
| removed prd-12 flags are unknown options | `strict: true` → `false`; an option re-added to `INIT_OPTIONS` | `rejects %s` (8 rows), `rejects remove --remove-state` |
| snapshot flags map to `SnapshotFlags` | fields swapped; `clearCommand` → `false` | `maps the snapshot flags` |

### exit-codes.ts → Common (`exitCodeForSeverities`); `EXIT_CODES` → Trivial

| Behavior | Mutant | Test |
|---|---|---|
| highest severity wins regardless of order | remove the `error` or `warning` check; return literal changed | `returns the highest severity independent of order` (3 rows) |

### main.ts → Glue

Kept as is: the three tests run the real entrypoint in process (no module mocks), which is the integration edge. The JSON branch of `handleParseError` is asserted by `integration/statusline-install.test.ts` (`exitCode 64`, `INVALID_ARGUMENTS`).

### output/text.ts → Common (human-readable output, reduced depth per `tests.md`)

| Behavior | Mutant | Test |
|---|---|---|
| init prints the config summary under a config change; remove does not | `report.command === 'init'` → `true`; summary write removed | `prints the config summary…`, `prints no config summary line for remove` |
| an errors install report goes to stderr with harness, limitation, conflict, and finding lines | `status === 'errors'` → `!==`; conflict or findings loop removed | `writes an errors report to stderr with the harness, limitation, conflict, and finding lines` |
| warnings reports are labeled `[WARN]` on stdout | `'warnings'` label ternary in either renderer | `labels warnings reports on stdout` |
| doctor integration line shows version, overhead, and limitations | `if (integ.version)` → `false`; overhead guard inverted | `prints the integration line with version, overhead, and limitations` |
| doctor errors go to stderr with impact and remediation | `if (f.impact)`/`if (f.remediation)` removed | `writes an errors report to stderr with the finding impact and remediation` |
| finding labels follow severity | label ternary for `ok`/`error` | `labels a %s finding as %s` (2 rows) |
| context window line shows tokens or `unknown` | `?? 'unknown'` removed; template changed | `renders the context window line for last window %s` (2 rows) |
| CLI error prints code and message on stderr | template or stream changed | `prints the error code and message on stderr` |

### output/doctor-mode-text.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| nothing without snapshot or debug | `debugMode === true` → `true` | `prints nothing without a snapshot report or the debug mode` |
| unconfigured snapshot line | `command === null` branch removed | `says when no snapshot command is configured` |
| configured snapshot with resume, before the debug line | `resumeCommand === null` inverted; order swapped | `prints the snapshot command, trigger, and resume command before the debug line` |

### Actions
- **Deleted (5):** `exit-codes` `keeps usage and interruption codes named` and `adds the runner stop codes without changing existing codes (DEC-16)`, tests of the `EXIT_CODES` constant (Trivial; code 64 is asserted by `main.test.ts` and the integration suites; the second cites prd-04 DEC-16, the runner exit codes `limitReached`/`decisionRequired` that prd-12 superseded, so the identifier is dead); the `[]` row of the severity `it.each` (same mutants as `['ok']`); the `[]` and `['--debug', '--no-debug']` rows of the debug `it.each` (the default-value mutants are killed by the `--debug`/`--no-debug` rows; the pair is rejected end to end by `integration/init-debug-mode.test.ts` and `debug-mode-merge.test.ts`).
- **Merged (2 files → 1):** `cli-install-text.test.ts` (2 tests, kept unchanged) and the two render tests of `doctor-context-window.test.ts` (`renders one text line…`, `renders an unknown last window` → one `it.each`, built from literal reports instead of `diagnoseProject`) moved into `cli-output-text.test.ts`, the file for `output/text.ts`.
- **Rewritten (5):** the three `cli-output-text` tests asserted `toHaveBeenCalled()` on the stream spies and a single line each; they became exact-line assertions for harness, limitation, conflict, finding, integration, header, and CLI error output (split by behavior). The removed-flag rejections asserted a bare `toThrow()` and now assert the `Unknown option '<flag>'` message.
- **Created (2 rows):** `labels a %s finding as %s` (`ok`, `error`): the old tests executed these labels without asserting them; the scoped coverage proxy showed the branches were otherwise lost.
- **Kept:** `main.test.ts` (3), `doctor-mode-text.test.ts` (3), the bridge and snapshot tests in `init-arguments.test.ts`.
- **Moved to module 4:** `doctor-context-window.test.ts` (4 remaining `diagnoseProject` tests).

### Production pending items
- None.

## 2. cli/assistant-questions — done 2026-10-10

**Baseline:** 28 runner tests across the 4 files, green (the plan's 21 was the grep count). Stryker: n/a (Glue/Common).
**Result:** 30 tests, green. Scoped coverage proxy (`assistant-questions.ts`, `ask.ts`, `questions-gitignore.ts`, `questions-harness.ts`, `questions-misc.ts`, `questions-restart.ts`, `questions-snapshot.ts`, `snapshot-specs.ts`): lines 100% → 100%; branches 94.57% → 96.98% (`questions-misc.ts` and the first-run fallbacks in `questions-harness.ts`/`questions-snapshot.ts` now covered; the remaining gaps are `ask.ts` 8 and 13, the `?? 'unknown'` adapter fallbacks in `questions-harness.ts` 19 and 29, unreachable with `getAllAdapters()`, `questions-restart.ts` 47, and `questions-snapshot.ts` 70). Commit `e7e79df`.

Every test drives the flow through `runQuestions` (the public entry) with the scripted prompt port, so the layout stays one file per concern (order and applicability, defaults from state, invalid answers, the git ignore question) rather than one per question module. The files stay in `tests/unit/` (decision 3): no test imports `src/infrastructure/`; `tests/helpers/assistant-context.ts` uses `getAllAdapters()` as collaborator data for the support levels and restart modes, not as the unit under test.

### assistant-questions.ts → Glue (orchestrator with a cancel short-circuit per step), tested through its public API

| Behavior | Mutant | Test |
|---|---|---|
| questions run in the FR-02 order and the flags concatenate in that order | step order or flag spread order changed | `asks every applicable question in order and builds the flags` |
| ending input at any question returns null | any `if (x === null) return null` removed | `returns null and no flags when the person cancels at any question (FR-07, TC-07, TC-08)` (9 cancel points, git ignore included) |

### ask.ts → Common (`askValidated` loop, `yesNo`, `confirmSpec`)

| Behavior | Mutant | Test |
|---|---|---|
| an unclear yes/no answer re-asks with the rule | `yesNo` error branch → `{ value: false }` | `re-asks a yes or no question for an unclear answer` |
| the hint follows the default | `yesNoHint` ternary swapped | git ignore `it.each` (`[Y/n]`/`[y/N]`), first-run defaults test |

### questions-harness.ts → Common (boundary validator `validateNumbers`)

| Behavior | Mutant | Test |
|---|---|---|
| detected harnesses listed with support level, preselected | `'detected, '` or `[x]` dropped | `lists detected harnesses with support level…` |
| numbers outside 1..8, fractions, or a partly invalid list re-ask | `>= 1` / `<= length` removed; `Number.isInteger` removed; `every` → `some` | `re-asks the harness list for %j` (`9`, `0`, `1.5`, `1 9`) |
| `1`, `8`, and `none` select and exclude the rest | `<=` → `<`; `none` branch removed; excluded filter inverted | `turns the deselected detected harnesses into --exclude-harness for answer $answer` (3 rows) |

### questions-snapshot.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| invalid command, trigger, resume re-ask with the `mergeSnapshot` rule | error passthrough → `{ value: answer }` | `re-asks the snapshot command for %j` (2 rows), `re-asks the trigger and a resume command…` |
| dash-leading values join their flag | `valueFlag` → always `[name, value]` | `joins the value to its flag…` (CR-01) |
| defaults from config; unchanged values emit nothing; `none` clears | `=== current` comparisons inverted; `--no-snapshot-command` guard | state tests `emits nothing…`, `clears the snapshot command…` |
| first run without config uses RED and emits `--snapshot-trigger` on change | `DEFAULT_ZONE` literal; `?.` removed; trigger comparison inverted | `uses the flag defaults on a first run without a configuration` |

### questions-restart.ts → Common (boundary validator `validateLimit`)

| Behavior | Mutant | Test |
|---|---|---|
| asked only when a selected harness has a restart mode | `!facts.some(...)` inverted | `skips the restart and bridge questions…` |
| mode per harness and the carrier text | carrier ternary swapped | `lists detected harnesses…`, `states the handoff carrier…` |
| limit 1..10 integer, re-asked with the rule | `>=` → `>`, `<=` → `<`, regex removed | `re-asks the restart limit for %j and accepts %j` (`0`/`1`, `11`/`10`, `2.5`/`5`) |
| `--auto-restart`, `--max-restarts`, `--no-auto-restart` only on change | `wasOn` guards inverted | order test, state tests |

### questions-misc.ts and questions-gitignore.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| bridge asked only with claude-code; opt-out flips the default | `includes('claude-code')` → `true`; `!hasStatuslineOptOut` → `true` | `skips the restart and bridge questions…`, `honors a previous status line opt-out…` |
| debug flag only on change, both directions | `debug.value === wasDebug` → `false`; ternary swapped | `changes the limit… and turns debug off`, first-run test (`--debug`) |
| git ignore asked last inside Git, flag only when it differs from the stored value | `answer.value === stored` → `false`; flag ternary swapped; `yesNo(stored)` fallback | `is asked last and emits $flags for answer "$answer" with stored $stored` (4 rows) |
| not asked outside Git, fact null | `!context.insideGit` inverted | `is not asked outside Git…` |

### snapshot-specs.ts → Trivial
Prompt text only; asserted through the prompts above.

### Actions
- **Deleted (2 rows):** `abc` row of the harness `it.each` (NaN already fails `>= 1`, so it kills nothing `0` doesn't; replaced by `1.5`, which kills the `Number.isInteger` removal); `abc` row of the restart-limit `it.each` (the regex mutant is killed by `2.5`, the range by `0`/`11`).
- **Merged (1 → loop):** git ignore `returns null when the person cancels at the question (FR-07, TC-08)` folded into the cancel loop in `assistant-questions-invalid.test.ts`, which now runs inside Git with a ninth answer and carries `TC-08`.
- **Rewritten (5 → 4 rows + 4):** the three git ignore yes/no tests asserted `not.toContain`, which let the mutant `answer.value === stored` → `false` survive (it emits `--gitignore` when kept); they became one object-row `it.each` over stored × answer with the exact question line and exact flags. The harness re-ask rows asserted `result).not.toBeNull()` and now assert the exact flags. The restart re-ask rows asserted `find(...).toBeDefined()` and `toContain('5')`; they now assert the exact re-ask line and exact flags with the accepted value on the boundary (`1`, `10`), which kills the `>=`/`<=` boundary mutants that survived before.
- **Created (3):** harness rows `8` and `none` (upper boundary and the `none` branch had no test); `uses the flag defaults on a first run without a configuration (FR-03, DEC-03, TC-06)` (no unit test passed `config: null`; covers the DEC-03 defaults, `--snapshot-trigger`, and `--debug`).
- **Kept:** order, carrier, applicability, dash values (CR-01), unclear yes/no, both snapshot command rows, trigger/resume re-ask, the four state tests, git ignore outside Git.

### Production pending items
- `askValidated` accepts `string | PromptSpec`, but every caller passes a `PromptSpec` (`ask.ts` 13 uncovered): the string overload could go.

### Notes for later modules
- The two snapshot command rows (201 characters, two lines) are the only tests of the `agentCommand` length and single-line rules in `src/core/contracts/configuration.ts`; modules 10/11 should keep or move that protection.

## 3. cli/assistant-terminal — done 2026-10-10

**Baseline:** 35 runner tests across the 4 files, green (the plan's 23 was the grep count). Stryker: n/a (Common).
**Result:** 29 tests across 5 files, green. Scoped coverage proxy (`summary.ts`, `equivalent-command.ts`, `clack-prompt-port.ts`, `prompt-port.ts`, `prompt-factory.ts`, `terminal.ts`): lines 97.2% → 97.2%; branches 93.06% → 99.04% (`summary.ts` 77.77% → 100%). The remaining gaps are by design: `detectTerminal` (`terminal.ts` 9-10) reads the real `process` streams, and the `catch` fallback of `createPromptPort` (`prompt-factory.ts` 15-16) is unreachable without a module mock of `@clack/prompts`. Commit `27459fb`.

Layout: one file per source, keeping the names the prd-16 TechSpec cites (TC-04 → `terminal.test.ts`, TC-08 → `equivalent-command.test.ts`, TC-13 → `assistant-output.test.ts`). The new `prompt-port.test.ts` holds `ReadlinePromptPort`, both branches of `confirmWithPort`, and `createPromptPort`; `clack-prompt-port.test.ts` keeps the port plus the `askValidated` rich-path test. No test imports `src/infrastructure/` (decision 3 does not apply), and every file runs in the parallel lane, so `tests/test-lanes.ts` is unchanged.

### terminal.ts → Common (`shouldRunAssistant`, `assertTerminalForAssistant`); `detectTerminal` → Trivial

| Behavior | Mutant | Test |
|---|---|---|
| a terminal with no flags starts the assistant | return → `false`; `isInteractiveTerminal` → `false` | `starts on a terminal without flags` |
| `--yes`, `--json`, or a configuration flag keeps it away | `!args.yes`, `!args.json`, or `!hasConfigurationFlag` removed | `does not start for %j` (3 rows) |
| both streams must be terminals | either operand of `stdinIsTty && stdoutIsTty` dropped; `&&` → `\|\|` | `does not start without both streams as terminals: %j` (2 rows) |
| `--interactive` forces it, even with a configuration flag | `interactive === true` early return removed | `--interactive forces the assistant even with a configuration flag` |
| `--interactive` without a terminal throws the not-interactive message | throw removed; `!isInteractiveTerminal` inverted | `refuses %j with the not-interactive message` (2 rows) |
| a terminal passes the gate; runs without `--interactive` never throw | `&&` → `\|\|`; `interactive === true` → `true` | `accepts a terminal and ignores runs without --interactive` |

### equivalent-command.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| bare values stay unquoted on one line | `BARE_VALUE.test` → `false`; prefix changed | `prints bare values unquoted on one line` |
| any other value is single-quoted | either anchor of `BARE_VALUE` removed; `+` → `*` | `single-quotes %j so no shell expands it` (spaces, `$HOME`, `''`) |
| a single quote prints labeled POSIX and PowerShell lines that parse back | `some` → `every`; either escape replacement changed | `prints one labeled line per shell family when a value has a single quote` |

### summary.ts → Common (human-readable output, reduced depth)

| Behavior | Mutant | Test |
|---|---|---|
| every choice, each harness restart mode, and a one-line command | any line template; `restartModes.map` removed; `'yes'` ternaries swapped | `lists the choices, the restart mode of each harness, and the command` (exact lines) |
| null facts read as none or not applicable | each `=== null` branch inverted | `states the no-command and not-applicable cases in words` (exact lines) |
| declined choices, no harness, no resume, default restart limit | `'no'` → `'yes'`; `'none'` dropped; `resumeCommand === null` inverted; `?? 'the default number of'` removed; debug ternary swapped | `states declined choices, no harness, and the default restart limit in words` |
| a two-line command goes under its own header; no escape sequences (NO_COLOR) | `command.length === 1` → `true`; indent removed | `prints a two-line command under its own header…` |

### clack-prompt-port.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| multiselect answers join by spaces, `none` when empty, preselected and optional | `length === 0` inverted; `join(' ')`; `initialValues`/`required` changed | `returns the chosen numbers joined by spaces, and none when nothing is marked` |
| confirm maps to `y`/`n`; select and text pass through; no log without an error or context | ternary swapped; a `case` removed; `error !== null` → `true`; `length > 0` → `>= 0` | `maps confirm to y or n, passes select and text values through, and logs nothing…` |
| the cancel symbol becomes null for every prompt | `typeof … === 'symbol'` guards removed; `settle` skipped in `ask` | `turns Ctrl+C (the cancel symbol) into null for every prompt kind` |
| the error and context lines print before the prompt; `begin` opens the intro | `log.error`/`log.info`/`intro` calls removed; join separator | `shows the context lines and the previous error before the prompt…` |

`ask.ts` (module 2's source): `re-asks through the rich prompt and passes the rule as the error (FR-04, DEC-11)` is the only test of the `askUi` branch of `askOnce` (line 8), the gap module 2's proxy reported; it stays in this file.

### prompt-port.ts and prompt-factory.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| a line port asks `[y/N]` and treats end of input as no | hint text; `answer !== null &&` removed | `answers from a scripted port and returns null when the script ends` |
| a rich port gets a confirm prompt defaulting to no | `initial: false` → `true`; branch inverted | `confirms the plan through a rich confirm prompt` |
| readline returns the line, then null at and after end of input | `close` listener or `isClosed` check removed | `reads a line through readline and returns null at end of input` |
| plain prompts when forced or on a dumb terminal, rich otherwise | `\|\|` → `&&`; either condition removed | `falls back to the line prompts…`, `uses the rich prompts otherwise` |

### Actions
- **Deleted (7):** `starts on a terminal for ["--dry-run"]` (kills only what the `[]` row kills; `--dry-run` not counting as a configuration flag is `does not count %j (FR-01, TC-03)` in `init-max-restarts-arguments.test.ts`); `does not start for ["--max-restarts","3","--auto-restart"]` and `["--debug"]` (kill only the `!hasConfigurationFlag` removal, already killed by `--harness cursor`; each flag is a row of `counts %j as a configuration flag (FR-01, TC-03)` in `init-max-restarts-arguments.test.ts`, and end to end in `integration/init-interactive-gate.test.ts` TC-12); the both-streams-piped row (the `PIPED_INPUT` and `PIPED_OUTPUT` rows kill every operand mutant); the `a"b` and `x;y` rows of the quoting `it.each` (same "character outside the bare class" mutant as `$HOME`); `round-trips quoted values through parseInit (FR-06, TC-08)` (the exact-string rows pin the same `quotePosix` output, the single-quote test keeps the in-file TC-08 parse-back check, and `integration/init-assistant-equivalence.test.ts` TC-10 replays spaced and dash values through a real `init`).
- **Moved (5):** the scripted and readline prompt tests from `terminal.test.ts`, and the rich `confirmWithPort` and both `createPromptPort` tests from `clack-prompt-port.test.ts`, into the new `prompt-port.test.ts`, unchanged.
- **Rewritten (6):** `--interactive forces the assistant` passed `['--interactive']` on a terminal, which `shouldRunAssistant` returns `true` for even without the early return, so it killed nothing; it now adds `--harness cursor`, so only the early return makes it pass. `starts on a terminal for %j` became a plain `it` after its second row went. The clack confirm test now passes `context: []` (what `confirmSpec` builds) and asserts that neither log is called. The three summary tests asserted a few lines with `toContain` (the bridge, debug, and excluded-suffix lines were unasserted); they now assert the exact lines, and the NO_COLOR test asserts the whole two-line block.
- **Created (1):** `states declined choices, no harness, and the default restart limit in words (FR-06, TC-13)`: six branches of `summary.ts` had no test.
- **Kept (17):** the remaining terminal rows, the clack multiselect, cancel, and context tests, the `askValidated` rich-path test, and the remaining equivalent-command tests.

### Production pending items
- None.

### Questions `[?]`
- None.

## 4. doctor/service — done 2026-10-10

**Baseline:** 29 runner tests across the 7 files, green (`doctor-context-window.test.ts` came from module 1). Stryker: n/a (Common).
**Result:** 35 tests across the same 7 files, green. Scoped coverage proxy (`doctor-service.ts`, `doctor-checks.ts`, `doctor-report-extras.ts`, `report-service.ts`, `active-sessions.ts`, `asset-currency.ts`): lines 75.09% → 78.33%; branches 83.33% → 88.52% (`doctor-service.ts` 70.96% → 85.29%, `report-service.ts` lines 86.15% → 96.92%, `doctor-report-extras.ts` 85.71% → 100%). The remaining gaps: `assetCurrencyFindings` and `protectModifiedAssets` (`asset-currency.ts` 18-88) run only in `integration/doctor-asset-currency.test.ts` (current, outdated, modified across three harnesses) and `integration/asset-currency-lifecycle.test.ts` (`MODIFIED_OWNED_ASSET`); the `InvalidConfigurationError.remediation` branch (`doctor-checks.ts` 9, prd-15 DEC-01) is asserted by `integration/config-repair-errors.test.ts`; `cleanPlan`'s change mapping (`report-service.ts` 41-42) is parsed by every `init --json` integration test; the `doctor-service.ts` branches left are explicit harnesses, exclusion, and the no-project finding, covered by `integration/doctor-exclusion.test.ts` and `integration/init-detection.test.ts`. Commit `a5e3965`.

Layout: one file per source, except `doctor-context-window.test.ts`, which keeps its name because the prd-09 and prd-12 TechSpecs cite it; it tests the `doctor-report-extras.ts` section and finding through `diagnoseProject`, where the claude-code targeting lives. Both doctor files hand-rolled the same fake `HarnessAdapter`; it moved to the new `tests/helpers/fake-doctor-adapter.ts`. `diagnostics.test.ts` tests the `src/core/contracts/diagnostics.ts` schemas and stays as is. No file imports `src/infrastructure/` and all run in the parallel lane, so decision 3 and `tests/test-lanes.ts` do not apply.

### doctor-service.ts → Common (orchestration with its own decisions: integration state, floor warning, targets, overhead)

| Behavior | Mutant | Test |
|---|---|---|
| `INTEGRATION_MISSING` → missing, `INVALID_HARNESS_CONFIG`/`ASSET_MISSING` → broken; errors and exit 2; no overhead measured; floor warning kept | either `deriveIntegrationState` branch removed; `state === 'installed' &&` removed | `reports %s as a %s integration with exit code 2, unmeasured, keeping the floor warning (T12/CR-02)` (3 rows, UT-13) |
| an unknown floor emits one warning, exit 1 | `minimumVersion !== null` inverted; push removed | `emits exactly one VERSION_FLOOR_UNVERIFIED warning…` |
| a verified floor is healthy and the overhead is measured | guard removed; `overhead = await measure` dropped | `reports a healthy measured integration without the warning…` |
| a failing measurement yields a null overhead, not a crash | `try/catch` removed | `reports a null overhead and stays healthy when the measurement fails` |
| no config: defaults, `CONFIG_MISSING`, targets fall back to project detections, no snapshot section | line 78 fallback removed; `config === null` guard in `snapshotReport` removed | `diagnoses the project-detected harnesses with a missing-configuration warning…` |
| runtime errors become the only extra finding | `if (input.runtimeState)` push removed | `adds only the runtime error finding… (prd-12 FR-09)` (T05) |

### doctor-report-extras.ts → Common, tested through `diagnoseProject`

| Behavior | Mutant | Test |
|---|---|---|
| context window only when claude-code is targeted | `targetIds.has('claude-code')` → `true`/`false` | `includes the section…`, `omits the section…` (TC-17) |
| bridge absent warns, installed stays silent | `bridge !== 'absent'` inverted | `warns with Claude Code active and the bridge absent…`, `stays silent…` (TC-14) |

### doctor-checks.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| an error or a missing config yields one finding with severity and remediation, and the defaults as `effective` | `if (error)`/`if (!config)` removed; severity or remediation literal; `effective` → `config` | `reports %s configuration and falls back to the defaults` (2 rows) |

### report-service.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| both builders sort and keep findings identical | `sortFindings` call dropped in one builder | `preserves finding properties identically, errors first…` (UT-16) |
| severity, then code, then path | either tie-break removed; severity order changed | `sorts findings by severity (error > warning > ok), then code, then path` |
| limitations never change install status | `success` literal changed | `keeps a success install report…` (TC-03) |
| failed outcome → errors 2, skipped → warnings 1 | either `outcomes.some` removed | `reports a %s outcome as %s with exit code %i` (2 rows) |
| doctor warning and error precedence | `deriveDoctorStatus` checks swapped | `returns warnings/exit 1… and errors/exit 2…` (T12/CR-02) |
| CLI error exit codes 64, 130, 2 | either ternary changed | `maps %s to exit code %i` (3 rows) |

### active-sessions.ts → Common

Date arithmetic would make it Critical in the `ts-tests` triage, but it only filters a diagnostic list (no brake, no persistence), so it stays Common as planned; the 30-minute boundary is now covered.

| Behavior | Mutant | Test |
|---|---|---|
| 30-minute window inclusive, newest first | `>=` → `>`; sort removed | `lists recent sessions newest first, keeps one at exactly 30 minutes, and drops older ones` |
| at most 10, unparseable ledgers excluded, usage source selection, reset → null, bridge-only → null session id | unchanged from baseline | the six other tests, kept |

### asset-currency.ts → Common (`classifyAssetCurrency`); the two planners are covered by integration (see Result)

| Behavior | Mutant | Test |
|---|---|---|
| current / outdated / modified | check order swapped; comparisons changed | `classifies installed $installed with manifest $manifest and expected $expected as $currency` (3 rows) |

### Actions
- **Deleted (2):** doctor-checks `reports nothing for the default configuration` (`config-legacy-checks.test.ts` `reports nothing for a normalized config` makes the same call and assertion); doctor-service `emits at most one warning per integration across multiple diagnosed harnesses` (kills no mutant the single-harness `emits exactly one…` does not; the loop over several adapters runs in `integration/doctor-asset-currency.test.ts`).
- **Merged:** doctor-service `keeps error precedence when the integration also has an error finding` into the UT-13 `it.each` (same arrangement as `produces INTEGRATION_MISSING…`; its floor assertion moved there). The three asset-currency tests into one `it.each`; the `stale` manifest assertion went (kills nothing the `a/a/a` row does not). The two doctor-checks tests into one `it.each`.
- **Rewritten (7):** doctor-checks rows now assert severity, remediation, and `effective` (they asserted the code only). UT-16 asserted `[0]` fields; it now asserts the full sorted list. The sort test asserted `[0]`/`[1]` severity, so the code and path tie-breaks survived; it now sorts five findings that tie on severity and code. The T05 test asserted `some` plus a `BRAKE_` filter no code can fail; it now asserts the exact finding list. The floor test lost two `toBeTruthy()` assertions. The bridge test lost `'brakeWindow' in report` (not a schema key; the parse would reject it). The active-sessions window test gained the 30-minute row.
- **Created (9 runner tests):** state rows `INVALID_HARNESS_CONFIG` and `ASSET_MISSING` (no test asserted `broken`); measurement failure; missing configuration; install status from outcomes (2 rows); `buildCliErrorDocument` (3 rows: `130` was asserted nowhere). The verified-floor test now also passes a measurer and asserts the overhead.
- **Kept:** `diagnostics.test.ts` (2), the TC-03 and T12/CR-02 report tests, the context window tests, six active-sessions tests.

### Production pending items
- None.

### Questions `[?]`
- None.

## 5. doctor/support-versions — done 2026-10-10

**Baseline:** 25 runner tests across the 6 files, green. Stryker: n/a (Common).
**Result:** 40 tests across 6 files, green. Scoped coverage proxy (`support-service.ts`, `version-service.ts`, `harnesses/common/version-probes.ts`, `diagnostics/p95.ts`, `diagnostics/in-process-sampler.ts`, `diagnostics/sample-failure.ts`): lines 89.74% → 98.97%; branches 84.11% → 93.54% (`version-service.ts` 75% → 100%, `version-probes.ts` 87.5% → 100%, `sample-failure.ts` lines 29.41% → 100%). Remaining gaps: `support-service.ts` 26-27 and `p95.ts` 7 are unreachable (see pending items); `in-process-sampler.ts` 80 (an asset whose default export is not a function) and `sample-failure.ts` 25/31 (a non-`Error` throw, a `SampleError` passed through by `process-sampler.ts`) run only in `tests/bench/overhead-measurer.test.ts`. Commit `066d102`.

Layout: `adapter-version-probes`, `adapter-diagnostics`, `in-process-sampler`, and `overhead-p95` import `src/infrastructure/` and moved to `tests/integration/` unchanged (decision 3, move-only step), keeping their names because the TechSpecs cite them. None is listed in `tests/test-lanes.ts` or carries a process marker, so the lanes file is unchanged (`test-lanes.test.ts` green after the move). `support-service-version-gating.test.ts` merged into `support-service.test.ts` (one file per source); the new `tests/unit/version-service.test.ts` owns the version parsing.

### support-service.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| the 4 remaining capability IDs and 2 levels (TC-11) | an ID re-added or dropped | `has exactly the four remaining capability IDs…` |
| level is full only when post_tool_telemetry and session_boot are supported | `FULL_SUPPORT_CAPABILITIES` changed; `every` → `some`; ternary swapped | `derives every capability combination…` (81 combinations) |
| an old probe gates every supported capability with the detected/minimum text | `status === 'old'` inverted; `?? display` order; `.filter` dropped | `gates every declared capability for an old prerelease (UT-15, CA-16, TC-08)` (exact capabilities and limitations) |
| any other status keeps the declared states; a set floor adds no limitation | `=== 'old'` → `!== 'resolved'`; `minimumVersion !== null` inverted | `keeps the declared states for a $status probe with floor $floor (FR-12, DEC-07, TC-08)` (7 rows, with and without a floor) |
| no floor adds the unverified-floor limitation; `minimumVersion` null | `floorLimitation` push removed; `?? null` dropped | `reports an unverified version floor… (RF9, DEC-08)` |

### version-service.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| null → unknown, non-string → malformed without display, no version → malformed with display, below floor → old, equal to floor → resolved, `v` prefix | each early return removed; `lt` → `lte`; `v?` dropped from the pattern | `reads $display as $status against the floor (UT-15)` (5 rows) |
| no floor resolves and keeps the source; an invalid floor throws | `source ??` default; `throw` removed | `resolves any version without a floor and rejects an invalid floor` |
| timed out → timed_out, failed → unknown even with a version in the output, completed → parsed; stderr read when stdout is blank | either status branch removed; `\|\|` fallback dropped | `turns a $result.status process into a $status probe…` (3 rows) |

### version-probes.ts → Common; adapter `probeVersion` → Glue (1:1 delegation)

| Behavior | Mutant | Test |
|---|---|---|
| no runner → unknown with the floor, from every adapter | `!runner` guard removed | `returns an unknown probe from every adapter…` |
| the first discovered path runs `--version` with the 2 s bound; the floor is forwarded | `find` → `[0]`; args or timeout changed; `minimumVersion` not passed | `runs --version on the first discovered path…` |
| nothing found: timed_out if a search timed out, unknown otherwise, nothing run | ternary swapped; `some` → `every` | `returns $status without running anything for $case` (3 rows) |

### p95.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| empty → null; rank `ceil(0.95·n)` of the sorted samples, rounded to 0.1 | sort removed; `ceil` → `floor`/`round`; `rank - 1` → `rank`; `toFixed` removed | `selects rank ceil(0.95 * n)… for $case` (4 rows: empty, 1, 100 descending, 12 shuffled) |

### in-process-sampler.ts and sample-failure.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| a registered handler gets the payload and the benchmark context, 10 warm-ups + 100 samples | counts changed; context not passed | `runs only the tool_result handler…` |
| absent handler → null, no fallback | `selected === null` guard removed | `returns null instead of falling back…` |
| returned hooks get `(input, output)` | `invocationArgs` branch removed | `invokes OpenCode tool.execute.after…` |
| benchmark context shape and cwd | literal or `cwd` changed | `builds the documented synchronous ContextUsage shape…` |
| a throwing handler → `handler_error`, a missing asset → `import_error`, detail from the error code or name | either `catch` removed; fallback causes swapped; `errorLabel` code/name choice | `rejects with a $failure.cause sample error for $asset` (2 rows) |

### adapter diagnostics (`src/infrastructure/harnesses/*`) → Glue, integration

| Behavior | Mutant | Test |
|---|---|---|
| every adapter reports INTEGRATION_MISSING in an empty project | a missing check removed | `reports INTEGRATION_MISSING…` |
| malformed claude-code and cursor config → INVALID_HARNESS_CONFIG | parse-error branch removed | `reports INVALID_HARNESS_CONFIG when $file has malformed JSON` (2 rows) |
| Codex `[hooks]` in config.toml → MIXED_HOOK_REPRESENTATIONS | `includes('[hooks]')` inverted | `reports MIXED_HOOK_REPRESENTATIONS…` |
| no Codex git root warning with `.git` present (CR-07) | `.git` check inverted | `does not warn about the Codex git root when .git exists (CR-07)` |

### Actions
- **Moved (4, move-only):** `adapter-version-probes`, `adapter-diagnostics`, `in-process-sampler`, `overhead-p95` from `tests/unit/` to `tests/integration/`.
- **Deleted (6):** support-service `never lets context_usage or auto_restart change the level` and `is partial when session_boot is not supported` (both are rows of the 81-combination `derives every capability combination…`); version-gating `downgrades declared capabilities only when the probe is old` (same arrangement and assertion as UT-15, which now carries TC-08); overhead-p95 `evaluates in-process threshold against 15ms target` (asserts the test's own `<= 15`; no production code compares p95 with 15 ms, the targets live in `tests/bench/`); overhead-p95 `selects rank 19 for 20 synthetic samples…` (pre-sorted input with integral `0.95·n` and no rounding, so it killed nothing the new rows do not); adapter-diagnostics `warns when project root has no .git entry` (`integration/codex-hook-root.test.ts` `warns when Codex integration is installed outside git repo (CR-07)` asserts the exact message, impact, and remediation).
- **Merged:** `support-service-version-gating.test.ts` into `support-service.test.ts`: its unknown/malformed/timed_out loops with and without a floor became one 7-row `it.each` (TC-08 "with and without a floor" kept); the INVALID_HARNESS_CONFIG test into a 2-row `it.each`; the three adapter-diagnostics `describe`s into one setup.
- **Rewritten (6):** UT-15 asserted one limitation with `toContainEqual`, so gating only the full-support IDs survived; it now asserts all capabilities and limitations (its `normalizeVersion` assertion moved to `version-service.test.ts`). The gating loops asserted `some(...startsWith('Detected version'))` false; they now assert the exact limitations. The unverified-floor test asserts the exact list. The p95 tests used sorted inputs and asserted `p95! <= 100`; they became 4 rows that kill sort, rounding, and rank mutants. The probe tests asserted `status` only; they now assert the full probe, the run request, and the floor passthrough. The context test lost its two `typeof` assertions and asserts the passed `cwd`.
- **Created (14 runner tests):** `version-service.test.ts` (9: no unit test covered the non-string, invalid-floor, failed, stderr, or equal-to-floor cases); the `resolved`+floor gating row (the only verified-floor case); the two `unknown` discovery rows of the probe (`version-probes.ts` 20 was uncovered); the two `SampleError` rows (`sample-failure.ts` ran only in the bench).
- **Kept:** TC-11 IDs test, exhaustive derivation, the three handler-selection tests, INTEGRATION_MISSING, MIXED_HOOK_REPRESENTATIONS, the CR-07 no-warning test.

### Production pending items
- `support-service.ts` 26-27: the "could not be verified against minimum" impact is unreachable since DEC-07; `limitationFor` reaches `versionImpact` only for a supported definition gated to `unknown`, which happens only when the status is `old`.
- `p95.ts` 7: `value !== undefined ? … : null` is unreachable (the index is always in range for a non-empty array).

### Notes for later modules
- The prd-01.1 TechSpec TC-08 row cites `tests/unit/support-service-version-gating.test.ts`, now merged into `support-service.test.ts`; the TechSpec citations of the four moved files say `tests/unit/`.
- `integration/node-process-runner.test.ts` (module 32) runs `versionFromProcess` through a real process; the parsing rows now live in `version-service.test.ts`, so module 32 can keep only the process-boundary assertions.

### Questions `[?]`
- None.

## 6. doctor/integration — done 2026-10-10

**Baseline:** 21 runner tests across the 8 files, green. Stryker: n/a (Glue).
**Result:** 13 tests across 6 files, green. Scoped coverage proxy (`commands/doctor.ts`, `handoff-findings.ts`, `restart-doctor-findings.ts`, `runtime-error-checks.ts`, `no-harness-finding.ts`, `asset-currency.ts`, `active-sessions.ts`, `harnesses/common/restart-diagnostics.ts`, `runtime/runtime-state-reader.ts`): lines 96.03% → 94.2%; branches 81.06% → 79.74% (`restart-diagnostics.ts` branches 66.66% → 76%). The lines lost were executed without assertions by deleted tests and stay covered by the related suites: `doctor.ts` 27-30 (the invalid-config read, asserted by `integration/invalid-config.test.ts` and `integration/config-repair-errors.test.ts`) and `asset-currency.ts` 77-79 (`protectModifiedAssets` on a re-init that adds a harness, run by the deleted Oh-My-Pi test; `multi-harness-install`, `init-idempotency`, `init-exclusion`, and `omp-restart` run it). Commit `f0eaa71`.

Every file is Glue: integration through the CLI edge (`runCli`/`runInProcessCli`) or, where a fixed clock is needed, `diagnoseProject` fed by the real runtime reader. The decisions live in units cleaned in modules 4–5 (`doctor-service`, `report-service`, `active-sessions`, `asset-currency`), so each file keeps one test per business flow and asserts what only the wiring can break. No surviving file was renamed (TechSpecs cite them); none is listed in `tests/test-lanes.ts`.

### Flows → Glue

| Flow | Mutant (wiring) | Test |
|---|---|---|
| doctor lists recent sessions newest first, unknown usage after a reset, in JSON and text | reader drops ledgers; `renderActiveSessionsText` template or `usage === null` branch | `shows only recent sessions, newest first, with unknown usage after a reset, in JSON and text` |
| no recent session → no `activeSessions` key, no text block | `length === 0` omission in `report-service.ts` 81 removed | `adds nothing without recent sessions` |
| current / outdated / modified assets across three harnesses | `assetCurrencyFindings` not called; classification swapped | `reports current, outdated, and modified assets across three harnesses` (exact code/path list) |
| an excluded harness is `excluded`, has no integration or finding, and both texts show it | exclusion filter removed from targets; `detection-text.ts` excluded line dropped | `doctor reports the harness as excluded, never as missing, and doctor and init text show the excluded line` |
| `remove` deletes the config with the exclusion; a second remove is clean | exclusion left in a leftover config | `remove deletes the configuration, exclusion included…` (TC-16) |
| only excluded harnesses → the excluded `NO_PROJECT_HARNESS` text | `hasExcluded` ternary inverted | `explains that every detected harness is excluded` |
| the configured snapshot (YELLOW) reaches the report; the CLI uses the injected measurer | `triggerZone` not read from config; `env.overheadMeasurer ??` fallback taken | `reports the configured snapshot and the injected overhead measurement…` |
| restart per harness: automatic not loaded, semi-automatic ready, pending handoff | `reportsRestart` or `semiAutomaticReady` guard; `handoffPending` ignored | `reports the automatic harness as not loaded…` (exact AUTO_RESTART list) |
| Pi restart log: skip → ok, `ERROR_` → warning, other component version → outdated | `startsWith('ERROR_')` severity; version comparison | `reports the restart findings for $name` (3 rows) |
| `remove` keeps the handoffs and names them | `keptHandoffFindings` dropped from remove | `deletes every restart artifact, keeps the handoffs, and names them` (TC-14) |
| the runtime reader returns null without a runtime directory, then keeps only the last 24 hours of errors | `isDirectory` guard; reader clock not passed to `selectRecentErrors` | `reads no runtime state without a runtime directory, then reports only the errors of the last 24 hours` |

### Actions
- **Deleted (5):** `doctor-context-window-schema.test.ts` (2): the `doctor --json` context window wiring and schema parse are `integration/statusline-bridge-lifecycle.test.ts` (`…reports it in doctor…`, `…the report follows the schema`), the ceiling fallback with no recorded window is `unit/statusline-context-window.test.ts` `falls back to the ceiling when no ledger has a window`; the published-file test read a generated artifact (`schemas:generate`/`schemas:check` derive it from `doctorReportSchema`, whose optional `contextWindow` every parse of a report without claude-code exercises, and `unit/schemas.test.ts` asserts `schemaVersion.const` 1). `doctor-manual-removal.test.ts` (1, IT-11/CA-14): asserted only exit 2 on a hand-written config; `INTEGRATION_MISSING` → exit 2 is UT-13 in `unit/doctor-service.test.ts` (the prd-01 code reviews map CA-14 to UT-13 too), the claude-code adapter finding is `integration/adapter-diagnostics.test.ts`, and a CLI-level doctor exit 2 is `integration/invalid-config.test.ts`. doctor-light-mode `reports zone headers only and no removed finding…`: the default snapshot is `light-mode-lifecycle.test.ts` line 57, and none of the removed codes exists in `src/`, so that assertion kills nothing. doctor-remove-restart `reports only the adapter finding for Oh-My-Pi…`: same `diagnoseInProcessRestart` path as pi in the first restart test (omp is filtered by `reportsRestart` before `semiAutomaticReady`); installing omp's restart file belongs to module 29.
- **Merged:** active-sessions `reports unknown usage after a reset…` (OI-03) into the window/order test (one more seeded session, both text lines asserted). doctor-exclusion's JSON and text tests into one (same setup). doctor-light-mode's configured-snapshot and injected-measurer tests into one (same `LIGHT_INIT` + `doctor --json`; TC-13 and TC-09 kept). The Pi skip and outdated tests into one `it.each`. doctor-runtime-errors' no-runtime test into the errors test (the reader returns null before seeding).
- **Rewritten (4):** asset currency now runs `init` and `doctor --json` through `runInProcessCli` (the hand-wired `diagnoseProject` call duplicated `runDoctor`, and the direct `runInit` passed no `overheadMeasurer`) and asserts the exact outdated/modified list. The restart-per-harness test asserted `arrayContaining`; it now asserts the exact AUTO_RESTART list. The runtime-errors test asserts the exact finding list; its text/JSON parity loop went (finding lines are `unit/cli-output-text.test.ts`) and so did its removed-code filter (no such code in `src/`). The exclusion test asserts no codex-cli finding at all instead of no `INTEGRATION_MISSING`.
- **Created (1 row):** Pi log `a rejected request`: `restart-diagnostics.ts` 43 (`ERROR_` → warning, which changes the exit code) had no assertion; it shares the `it.each` arrangement.
- **Kept:** the no-recent-sessions test, the two remaining exclusion tests, the TC-14 remove test.

### Production pending items
- None.

### Notes for later modules
- The prd-02.2 TechSpec TC-18 row cites `tests/integration/doctor-state-schema.test.ts`, which does not exist; its scenario (`doctor --json` parses at `schemaVersion: 1`) lives in `integration/init-remove-footprint.test.ts` E2E-08 and `statusline-bridge-lifecycle.test.ts`.
- `asset-currency.ts` 77-79 and 82-84 (`protectModifiedAssets`) run in the init suites (module 24) and `asset-currency-lifecycle.test.ts` (module 32); keep one of them asserting `MODIFIED_OWNED_ASSET`.

### Questions `[?]`
- None.
## 7. repo/release-packaging — done 2026-10-10

**Baseline:** 64 runner tests across the 7 files, green (the plan's 36 was the grep count). Stryker: n/a (Common/Glue).
**Result:** 51 tests across 7 files, green. Scoped coverage proxy (`scripts/check-release-tag.ts`, `scripts/asset-bundler.ts`, `src/infrastructure/storage/package-metadata.ts`): unchanged, lines 90.05% → 90.05%, branches 84.61% → 84.61%. Remaining gaps: `check-release-tag.ts` 60-69 and 75-76 (`runCli` and the direct-run guard, run only by the release workflow step); `asset-bundler.ts` 57-58 (rethrow of a non-ENOENT read error, defensive); `package-metadata.ts` 50-51 (zod shape failure, defensive) and 62-63 (`readPackageVersion` on the real layout, the e2e half of TC-02). Commit `d525fd1`.

Layout: `package-metadata.test.ts` imports `src/infrastructure/storage/` and moved unchanged to `tests/integration/` (decision 3, `git mv` only; not in `tests/test-lanes.ts`, no process marker). No file was renamed: the prd-01.1, prd-02, prd-05, and prd-13 TechSpecs cite them, and `package-assets`/`package-contents` stay in `PROCESS_LANE_FILES` (`test-lanes.test.ts` green).

### check-release-tag.ts → Common (`resolveTargetTag`, `parseAndValidateTag`, `verifyReleaseTag`); `runCli` → Glue

| Behavior | Mutant | Test |
|---|---|---|
| `--tag <value>` wins over the environment; `--tag=<value>`; GITHUB_REF_NAME before TAG_NAME; TAG_NAME; empty when nothing is set | either argv branch removed; `??` operands swapped; `''` literal changed | `resolves the tag from $source` (5 rows, TC-04) |
| a `v`-prefixed SemVer tag yields its version, prerelease included | `slice(1)` changed; `semver.valid` inverted | `returns the version of a v-prefixed SemVer tag… (TC-04)` |
| blank, unprefixed, or non-SemVer tags are rejected with their own message | `trim()` removed; any guard removed | `rejects %j (TC-03)` (3 rows) |
| a matching tag returns tag and version; a mismatch or a missing version aborts | `!==` inverted; `typeof` guard removed; return object changed | `returns the tag and version… (TC-01)`, `rejects a package.json with $case` (2 rows, TC-02) |

### release.yml → Trivial by triage, kept for prd-05 DEC-07/TC-05

The file pins literals of the workflow; every test kills the "literal edited out of `release.yml`" mutant class, so the six tests became three (triggers and permissions, gates in order, publication and release) carrying the FR/NFR/DEC identifiers that prd-05 `tasks.md` maps to the file.

| Behavior | Mutant | Test |
|---|---|---|
| a version tag or a manual dispatch builds the requested tag, with `contents`/`id-token` write only | trigger, `ref`, or permission edited | `runs on a version tag or a manual dispatch… (FR-01, NFR-01, DEC-01)` |
| gates run in order on ubuntu-latest with Node 20, all before `npm stage publish` | a gate removed or moved after publishing | `runs every pre-release gate in order… (FR-02, FR-03, NFR-04)` |
| staged publish with provenance and the masked token; GitHub release with notes | `--provenance` dropped; direct `npm publish`; `gh release` removed | `stages the npm release… (FR-04, FR-05, NFR-03, DEC-03, DEC-04)` |

### package-metadata.ts → Common (integration: real filesystem)

| Behavior | Mutant | Test |
|---|---|---|
| dist layout (four up) and source layout (three up) | either candidate removed | the two `resolves the version from…` tests (FR-07, TC-02) |
| no package.json, a non-SemVer version, or another package name → `PackageMetadataError` | `continue` → rethrow; either guard removed | the three `throws PackageMetadataError…` tests |

### asset-bundler.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| importing the module builds nothing | a top-level build call | `leaves built runtime assets untouched…` (T18/OBS-01) |
| a modified asset is reported stale and left in place | `!==` inverted; push removed; the check rewrites the file | `reports a modified asset…` (T18/OBS-02) |
| missing assets fail with their names and `npm run build` | `length === 0` inverted; message changed | `rejects missing assets…` |

### Built runtime assets and the package → Glue, checked at the bundle, process, and tarball edges

| Behavior | Mutant | Test |
|---|---|---|
| no runtime asset pulls classic Zod, `jsonc-parser`, `semver`, `child_process`, or `src/cli/`; each guard rule detects its import | an asset imports a forbidden module; a guard rule broken | `runtime-bundle-imports` (13 asset rows + 5 fixture rows, TC-24, QA-08), kept |
| each built process hook runs from its install path, exits 0, and writes only what its harness documents, also for an unhandled event and malformed stdin | the bundle crashes at load; failure policy lost at the process edge | `$asset answers $event (stdin $stdin)…` (8 rows) |
| built in-process assets export a default function | default export missing | `loads in-process plugins and extensions…` |
| the tarball holds every asset, schema, and doc, an executable bin, and no development or prd-12 removed file | `files` in `package.json` edited; shebang lost; manifest field changed | `packs the runtime assets, schemas, and an executable bin…` (RF17, RF23, CA-19, prd-12 DEC-15) |

### Actions
- **Moved (1, move-only):** `tests/unit/package-metadata.test.ts` → `tests/integration/`.
- **Deleted (9):** package-assets `verifies all expected runtime asset files exist on disk` (`npm pack` lists only files on disk, and package-contents `REQUIRED_FILES` now holds all 13 assets, `pi-restart.js` and `omp-restart.js` added as in `scripts/check-package.ts`; the lost `size > 0` check is low risk); seven `HOOK_CASES` rows (claude-code `PostToolUse`/`Stop`, codex `Stop`, cursor `postToolUse`/`preCompact`, copilot `postToolUse`, antigravity valid `PostToolUse`): each repeats an asset a kept row already runs with the same output, so it kills the same bundle mutants; event routing is in `unit/runtime-claude`/`-codex`/`-cursor`/`-copilot`/`-antigravity` (modules 21–22, e.g. `answers PostToolUse with an empty object and PreInvocation with injectSteps`), the built post-tool round trip per harness is `e2e/e2e-hook-round-trips.test.ts`, and antigravity `PostToolUse` → `{}` stays asserted by the malformed-stdin row; package-contents `validates that published config schema is usable JSON (RF17)` (`toBeDefined` only; `unit/schemas.test.ts` `publishes deterministic Draft 2020-12 schemas (RF17)` parses the file and asserts `$schema`, and `schemas:check` pins its content).
- **Merged (5 → 1 inside other tests):** release-workflow 6 → 3 (dispatch `ref` into the trigger test; runner and Node 20 into the gate-order test; GitHub release into the publication test); package-contents manifest/shebang test into the pack test. Table merges with the runner count unchanged: package-assets malformed-stdin and unhandled-event tests into the `HOOK_CASES` `it.each` through an optional `stdin` column; check-release-tag's five `resolveTargetTag` tests, three rejections, and two `verifyReleaseTag` rejections into `it.each` tables.
- **Rewritten (3):** the GITHUB_REF_NAME row now also sets TAG_NAME (the `??` swap survived: each env test set one variable) and the `--tag` row sets GITHUB_REF_NAME (argv precedence); the empty/whitespace rejection keeps only `'   '` (it alone kills both the `trim()` and the empty-guard mutants); gate order now ends at `npm stage publish`, so moving a gate after publishing fails. TC-01..TC-05 and the prd-05 FR/NFR/DEC identifiers are now in the titles.
- **Created:** none.
- **Kept:** asset-bundler (3), runtime-bundle-imports (18), package-metadata (5), the in-process loading test.

### Production pending items
- `scripts/check-package.ts` and `integration/package-contents.test.ts` keep separate `REQUIRED_FILES` lists that drift (the script lacks `docs/telemetry-block.md`; the test lacked the two restart assets). The script's top-level `await verifyPackage()` prevents importing it; an `isDirect` guard like the one in `check-release-tag.ts` would let the test share the list and the checks.

### Notes for later modules
- The prd-01.1 TechSpec TC-02 row cites `tests/unit/package-metadata.test.ts`, now in `tests/integration/`.
- package-contents cites RF23, which in prd-01 is doctor text/JSON parity, not the package manifest; the identifier was kept as found.

### Questions `[?]`
- None.

## 8. repo/test-infra — done 2026-10-10

**Baseline:** 22 runner tests across the 5 files, green (the plan's 21 was the grep count). Stryker: n/a (Common/Trivial).
**Result:** 21 tests across 5 files, green. Scoped coverage proxy (`scripts/test-budget.ts`, `tests/test-lanes.ts`, `vitest.config.ts`, `vitest.bench.config.ts`): unchanged, lines 98.67% → 98.67%, branches 100% → 100%. The only gap is `tests/test-lanes.ts` 41-42 (`isSerialLaneFile`), unreachable from the marker test because `SERIAL_LANE_FILES` is a subset of `PROCESS_LANE_FILES`, so `isProcessLaneFile` short-circuits it. Commit `f58ed30`.

Layout: `benchmark-fixtures.test.ts` imports every harness adapter from `src/infrastructure/harnesses/` and moved unchanged to `tests/integration/` (decision 3, `git mv` only; no process marker, not in `tests/test-lanes.ts`, so the lanes file is unchanged and `test-lanes.test.ts` stays green). The other files keep their names. The prd-13 TechSpec cites `test-lanes.test.ts` for TC-03 and TC-05, which live in `bench-config.test.ts` and `e2e-smoke-set.test.ts`. Merging them into `test-lanes.test.ts` would push it past 100 lines, so the split stays. These tests guard the `tests.md` Time Budget and Processes rules (process lane, smoke set, bench runner, 180 s budget), so the rules they pin count as mandated behavior even where the source is a config object.

### scripts/test-budget.ts → Common (`evaluateBudget`); `parseVitestReport` → Trivial (Zod schema), kept as the TC-07 malformed-report guard; `scripts/check-test-budget.ts` → Glue (spawns Vitest and reads the JSON report; runs only in `npm run test:budget`, no unit test)

| Behavior | Mutant | Test |
|---|---|---|
| a successful run at exactly 180 s passes; above it fails with TEST_BUDGET_EXCEEDED and the full message; the wall time line comes first | `>` → `>=`; budget check removed; message template; `toFixed(1)` changed | `exits $exitCode for a successful run of $wallSeconds s…` (2 rows, exact result) |
| a failed report, a non-zero exit code, or a killed run (null) fails with TEST_RUN_FAILED even within the budget | `!input.report.success` removed; `!== 0` → `> 0` or removed; `String(code)` template | `fails with TEST_RUN_FAILED within the budget for success $success and Vitest exit code $vitestExitCode` (3 rows) |
| the ten slowest files, slowest first, relative to the root | sort comparator; `slice` bound; `relative` dropped | `lists the ten slowest files…` |
| each failed assertion is named after the error | `status === 'failed'` filter inverted or removed | `names each failed test after TEST_RUN_FAILED` |
| a report without test results is rejected | `testResults` made optional | `rejects a report without test results` |

### tests/test-lanes.ts → Common (`hasProcessMarker`, `isProcessLaneFile`, `processLaneGlobs`); vitest.config.ts and vitest.bench.config.ts → Trivial by triage, kept for prd-13 FR-01/03/04/05, DEC-01/03/04/05, TC-03/05/06 and T23/CR-01

| Behavior | Mutant | Test |
|---|---|---|
| every test file with a process marker sits in the process or serial lane, and the scan does detect markers | `PROCESS_MARKERS` emptied or `some` → `every`; `\|\|` → `&&` in `isProcessLaneFile` | `assigns every test file with a process marker to the process or serial lane` |
| every lane entry names an existing file | a moved or deleted file left in a list | `matches existing test files with every process and serial lane entry` |
| the process lane equals the TechSpec list (DEC-EXC-01) | a file added to `PROCESS_LANE_FILES` without review | `keeps the process lane equal to the TechSpec list…` (TC-06) |
| lanes run parallel, process, serial, every lane ordered, 6 workers | `groupOrder` changed or dropped; `maxWorkers` | `runs the lanes in order…` |
| process files in parallel forks, serial files alone in one fork; neither in the parallel lane | include/exclude spreads dropped; `singleFork` changed | `runs process lane files in parallel forks…`, `keeps process and serial files out of the parallel lane` |
| global 30 s timeout, no test mode variable | `testTimeout` changed; `env` re-added | `gives every lane the global timeout… (prd-12 DEC-16)` |
| the e2e folder holds only the four smoke files | a fifth e2e file | `lists one built-CLI file per command and the hook round trips` (TC-05) |
| the bench folder holds exactly the six timing suites, runs in one fork, and stays out of the default lanes | a bench suite moved back; `BENCH_FILE_PATTERN` dropped from the parallel exclude; `singleFork` changed | the three `bench-config` tests (TC-03) |

### Adapter benchmark fixtures (`src/infrastructure/harnesses/*/adapter.ts` `benchmarkFixture`) → Trivial data, kept for TC-04 (FR-05, prd-12 DEC-07)

| Behavior | Mutant | Test |
|---|---|---|
| each sample payload parses with its adapter's documented post-tool schema, with the fields the handler reads | a payload field renamed or dropped | `parses the five process event payloads…`, `parses the three in-process payloads…` |

`unit/harness-registry.test.ts` asserts `fixture.harness` and `fixture.event`, which are different mutants, so both files stay.

### Actions
- **Moved (1, move-only):** `tests/unit/benchmark-fixtures.test.ts` → `tests/integration/`.
- **Deleted (1 row):** the `59.94 s` within-budget case. The `180 s` row kills the `>=` mutant and the exit-0 path, and the `180.5 s` row kills the `toFixed` mutants, both with exact output.
- **Merged:** test-budget `passes a successful run within the budget…`, `accepts a run at exactly the budget`, and `fails a successful run above the budget…` into one 2-row `it.each` asserting the whole result. `fails a run with test failures with TEST_RUN_FAILED…` folded into the exit-code `it.each` as a row.
- **Rewritten (3):** that row now uses `success: false` with Vitest exit code `0`. Both earlier failed-run tests passed exit code `1`, so removing `!input.report.success` survived. The exit-code rows assert the exact TEST_RUN_FAILED line and the over-budget row the exact TEST_BUDGET_EXCEEDED line, where they used `toMatch`/`toContain`. In `test-lanes.test.ts`, the marker test now also requires the scan to flag `node-process-runner.test.ts` (an empty `PROCESS_MARKERS` passed before), and the lane-order test rejects a lane without `groupOrder` (the `?? -1` fallback kept `[-1, 1, 2]` sorted and unique). No test was added for either.
- **Created:** none.
- **Kept:** `rejects a report without test results`, the slowest-files and failed-names tests, all 7 `test-lanes` tests, including the duplicated TC-06 list the user accepted as an open item (prd-13 DEC-RES-01), `e2e-smoke-set` (1), `bench-config` (3), and `benchmark-fixtures` (2).

### Production pending items
- None.

### Notes for later modules
- prd-12 `task_05.md` and prd-01 codereview_08 `task_33.md` list `tests/unit/benchmark-fixtures.test.ts`, now in `tests/integration/`.
- `tests/test-lanes.ts` 41-42 (`isSerialLaneFile`) runs only if a serial file ever leaves `PROCESS_LANE_FILES`. It is test infrastructure, not production code.

### Questions `[?]`
- None.

## 9. repo/docs-drift — done 2026-10-10

**Baseline:** 24 runner tests across the 5 files, green (the plan's 24 matched). Stryker: n/a (Trivial).
**Result:** 0 tests; the 5 files were deleted (Decision 4). Module coverage proxy before (`configuration.ts`, `harness.ts`, `registry.ts`): lines 98.11%, branches 57.57%; after: n/a, the module is empty. Combined proxy on those sources plus every `harnesses/*/adapter.ts`, run with the related suites (`unit/harness-adapters`, `unit/configuration`, `unit/configuration-snapshot`, `unit/support-service`, `integration/init-snapshot`, `unit/test-lanes`, `unit/e2e-smoke-set`): identical before and after the deletion, lines 53.82% → 53.82%, branches 94.11% → 94.11%, so no line or branch was executed only by these files. Commit `964af2f`.

No test file lists these files: `git grep` outside `tasks/` finds no reference, so `tests/test-lanes.ts` and `e2e-smoke-set.test.ts` are unchanged (both green). ESLint is n/a, since no touched test file remains.

### README.md, docs/telemetry-block.md, docs/research/harness-integrations.md, .agents/rules/file-changes.md, AGENTS.md → Trivial (Decision 4)

Every assertion reads a Markdown file and checks its wording, so each test kills only the "documentation edited" mutant. None of the assertions is in the `tests.md` Required Scenarios: the agent-facing text scenario covers the text the code emits, which is asserted elsewhere (`integration/light-mode-lifecycle.test.ts` pins the exact `action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]` and the `[ContextBrake resume v1] Run "/sdd-resume"…` resume text; `integration/runtime-statusline-ledger.test.ts` pins the `"type":"statusline"` ledger line). The sources these files import (`src/core/contracts/configuration.ts`, `src/core/contracts/harness.ts`, `src/infrastructure/harnesses/registry.ts`) belong to modules 10, 11, and 18.

| Assertion that touches code | Code behavior | Test that covers it |
|---|---|---|
| readme-support-table: one row per harness with the adapter's `supportLevel`; Oh-My-Pi `full`; Antigravity `partial` with `PreInvocation` | `capabilityProfile().supportLevel` per harness, limitation text | `unit/harness-adapters.test.ts` `matches the approved table for $id` (TC-02, 8 rows: exact level, capability states, and limitation text, including Antigravity's `PreInvocation` limitation) |
| readme-config-example: the README config JSON parses with `configurationSchema` | the schema accepts the canonical config shape | `unit/configuration.test.ts` `parses the canonical defaults`; the README example is `DEFAULT_CONFIG` with `activeHarnesses: ["claude-code"]`, which every init integration test writes |
| readme-light-example: `{ triggerZone: 'RED', command, resumeCommand }` merged into the defaults parses | the snapshot schema accepts both commands | `integration/init-snapshot.test.ts` (writes and re-reads exactly that object through init's validation); `unit/configuration-snapshot.test.ts` `requires a snapshot command for a resume command` (TC-04) for the refinement |

The only check with no equivalent is the README-to-adapter consistency itself (README level = code level), which is documentation drift under Decision 4.

### Actions
- **Deleted (24):** `readme-config-example` (11): one schema parse of the README example, see the table, plus 10 README/telemetry-doc wording checks; `readme-gitignore` (3): README, `file-changes.md`, and `AGENTS.md` wording, no source imported; `readme-light-example` (2): see the table, plus the README literal; `readme-support-table` (5): see the table, plus README wording (Oh-My-Pi extension path, no instruction pointer, managed block); `integration/docs-auto-restart` (3): README, telemetry-doc, and research-file wording, no source imported.
- **Merged, rewritten, created, moved:** none.

### Production pending items
- None.

### Notes for later modules
- TechSpec rows that now cite deleted files (`tasks/` not edited): prd-01.1 DEC-08 (and line 20); prd-02 DEC-14, TC-31, TC-34, the line-19 note, and the drift table at lines 403-404; prd-02.1 TC-22; prd-02.2 TC-19; prd-06 TC-15; prd-07 TC-14; prd-09 TC-14 (and line 88); prd-10 TC-18; prd-11 TC-26 (and line 185); prd-12 line 291; prd-17 TC-10. Done task files and code reviews under `tasks/` also name them (e.g. prd-01 `codereview_01/done/task_09.md`, `codereview_08/done/task_34.md`).
- With these files gone, nothing checks README or docs against the code. If the user wants that kept, it belongs in a release or docs check, not in `npm test`.

### Questions `[?]`
- None.

## 10. config/validation — done 2026-10-10

**Baseline:** 34 runner tests across the 5 files, green (the plan's 29 was the grep count). Stryker: n/a (Common).
**Result:** 29 tests across the same 5 files, green. Scoped coverage proxy (`contracts/configuration.ts`, `configuration-validator.ts`, `configuration-sanitizer.ts`, `config-legacy-checks.ts`): lines 100% → 100%; branches 87.5% → 91.02% (`configuration.ts` 86.36% → 100%: the trimmed and single-line `agentCommand` rules, lines 25-26, and the `yellowMaxPercentage < criticalPercentage` rule, line 37, had no test). The uncovered lines are unchanged in the other three files; their branch percentages moved by under one point (`config-legacy-checks.ts` 83.33% → 82.35%, `configuration-validator.ts` 88.88% → 88.46%) because v8 counted a different branch total, not because a branch was lost. Remaining gaps: `config-legacy-checks.ts` 17 (`??` fallbacks when only one of `criticalTurn`/`turnCeiling` is set) and 34 (`declaredContextWindow`, asserted by `unit/window-origin.test.ts` `keeps declaredContextWindow through a config rewrite`); `configuration-sanitizer.ts` 14 (defensive guard zod cannot reach); `configuration-validator.ts` 35-36 (the `'(root)'` and non-`input` fallbacks, defensive) and 39 (`invalidSyntaxError`, asserted by module 11's `unit/project-config-store.test.ts`). Commit `0afc274`.

Layout: one file per source, except that the schema rules of `contracts/configuration.ts` stay split between `configuration.test.ts` (zones, legacy fields, `excludedHarnesses`) and `configuration-snapshot.test.ts` (the snapshot section, a `tests.md` high-risk area), the names the prd-12 and prd-15 TechSpecs cite. The `configurationIssues` and `parseError` helpers, duplicated in three files, moved to the new `tests/helpers/configuration-issues.ts`. No file imports `src/infrastructure/` and all run in the parallel lane, so decision 3 and `tests/test-lanes.ts` do not apply.

### contracts/configuration.ts → Common (validation rules; snapshot settings get success, failure, boundary, and recovery rows)

| Behavior | Mutant | Test |
|---|---|---|
| the canonical defaults parse unchanged | a default changed so it fails its own schema | `parses the canonical defaults` (module 9 relies on it) |
| green < yellow < critical percentages, green < yellow turns, turns set in pairs, each issue with path, received value, and rule | `>=` → `>` on any comparison; either pair check removed; `input` dropped | `rejects zones $zones with the received value and the rule (FR-02, TC-03)` (5 rows, two on the equal boundary) |
| legacy `turnCeiling` and `criticalTurn` still parse | either field removed from the schema | `accepts a PRD-02 legacy configuration… (FR-09, TC-03)` |
| `excludedHarnesses` accepts known unique ids, rejects duplicates and unknown ids | field removed; `uniqueCheck` dropped; `z.enum` → `z.string` | `accepts a unique list…`, `rejects $excluded and names the path (FR-05, TC-12)` (2 rows) |
| a resume command needs a snapshot command | the `resumeCommand && !command` check removed | `requires a snapshot command for a resume command (prd-12 FR-04, TC-04)` (module 9 relies on it) |
| a missing section defaults to a RED trigger without commands | `_default` or `DEFAULT_SNAPSHOT` changed | `defaults the snapshot section to a RED trigger without commands` |
| a snapshot command has 1 to 200 characters, no surrounding whitespace, one line | `maxLength(200)` → 199 or 201; `minLength(1)` dropped; either custom check removed | `applies the snapshot command rules to $case (prd-12 FR-04)` (200 accepted, 201, empty, leading space, two lines) |

### configuration-validator.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| only unrecognized keys: one line per key and the remediation; every removed prd-12 key is unrecognized | `isUnrecognizedKeysOnly` → `false`; join changed; a removed key re-added to the schema | `names every retired key on its own line and sets the remediation (prd-15 FR-01, TC-01; prd-12 FR-02, TC-04)` (7 keys) |
| a nested key is named by its dotted path | `[...issue.path, key]` → `[key]`; join separator | `names a nested key with its dotted path` |
| mixed issues: one-line message, no remediation | `every` → `some`; `isUnrecognizedKeysOnly` → `true` | `keeps the one-line message and no remediation when another issue exists` |

### configuration-sanitizer.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| unrecognized keys at any depth are dropped over several passes and listed with their value | loop exits after one pass; `received` not recorded | `drops top-level and nested unrecognized keys across passes and lists them` |
| the input is not mutated | `structuredClone` removed | `does not mutate its input` |
| any other issue throws that pass's error, without remediation | `keyIssues.length === issues.length` → `true` | `throws the error of the failing pass when another issue exists` |

### config-legacy-checks.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| retired 7/10/12 → retired message; custom limits or another critical turn → ignored message; one warning with the init remediation | ternary swapped; `hasRetiredTurns` or the critical comparison removed; a finding field changed | `reports one warning for turn limits $turns` (3 rows, exact finding) |
| no turn ceiling or critical turn → no finding, also through doctor | guard inverted | `reports nothing for a normalized config` (module 4 relies on it) |
| normalization drops the four fields and keeps custom green/yellow turns only | `keepPair` inverted; a telemetry key dropped | `drops the retired turn fields and keeps only custom green and yellow turns for $turns` (2 rows) |

### Actions
- **Deleted (12 runner tests):** configuration `rejects unknown fields` (the 7-key validator test asserts every root key is unrecognized, with the exact message); configuration-snapshot `rejects the removed %s key and names it` (6 rows) and `rejects the removed runner key and names it` (folded into the 7-key validator test, which kills the per-key re-add mutants with exact lines and now carries prd-12 FR-02, TC-04); `names every removed key in the error message the CLI prints` (a substring check of the same multi-line message the validator test pins line by line); validator `has no remediation for a syntax-style error` (its only input is a non-key issue; `keeps the one-line message and no remediation…` kills both `isUnrecognizedKeysOnly` mutants it could kill; `invalidSyntaxError` itself is never called there); sanitizer `returns a valid configuration untouched with nothing dropped` (the success return is asserted by `drops top-level and nested…`, which compares the whole result with `DEFAULT_CONFIG`); legacy `plans a normalized config update that is stable on a second pass` (tests `installation-builder.ts`; `integration/init-legacy-turn-limits.test.ts` `removes the four turn fields and keeps the other keys` and `changes nothing on a second run and doctor reports no legacy finding` (TC-20) assert both halves end to end).
- **Merged:** `reports the received source value for invalid zone ordering`, `rejects non-increasing turn limits`, and `rejects a turn limit set without its pair` into one 5-row `it.each` asserting the whole issue list; the three `LEGACY_TURN_LIMITS` tests into a 3-row `it.each` on `checkLegacyTurnLimits` with the exact finding (the doctor wiring stays in `reports nothing for a normalized config` and in `integration/init-legacy-turn-limits.test.ts` `reports the retired defaults in doctor before migration`); the two `normalizeTurnLimits` tests into a 2-row `it.each`; the duplicate and unknown-id `excludedHarnesses` tests into a 2-row `it.each`.
- **Rewritten:** the zone-ordering row moved from 40 to the equal boundary 49 (40 let `>=` → `>` survive); the unknown harness row asserted `not.toEqual([])` and now asserts the path and received value; the legacy parse test asserts the parsed telemetry instead of `turnCeiling` alone, and lost two assertions that killed no mutant (a mismatched `turnCeiling` producing no issue, and the `DEFAULT_CONFIG` constant).
- **Created (7 runner rows):** the `yellowMaxPercentage: 75` zone row (line 37 had no test); the second turn-pair row (the two pair directions were two assertions in one test); the five `agentCommand` rows (carry-forward from module 2: the only tests of these rules were two assistant re-ask rows; lines 25-26 had none; the 200-character row is the accept side of the boundary).
- **Kept:** the canonical defaults, TC-04 resume rule, snapshot default, `excludedHarnesses` accept, the nested-key and mixed-message validator tests, three sanitizer tests, `reports nothing for a normalized config`.

### Production pending items
- None.

### Notes for later modules
- zod/mini reports `minLength`/`maxLength`/`enum` failures as `Invalid input`, so the rule shown for a too-long or empty snapshot command does not name the limit (`snapshot-merge.ts`, module 13, prints it).

### Questions `[?]`
- None.

## 11. config/schemas-stores — done 2026-10-10

**Baseline:** 18 runner tests across the 4 files, green (the plan's 16 was the grep count). Stryker: n/a (Common).
**Result:** 11 tests across the same 4 files, green. Scoped coverage proxy (`contracts/changes.ts`, `contracts/manifest.ts`, `storage/project-config-store.ts`, `storage/manifest-store.ts`): lines 95.55% → 85.55%; branches 88.23% → 100% (`manifest-store.ts` lines 95.12% → 73.17%, branches 81.81% → 100%). The lost lines are `NodeManifestStore.planSave` (27-37), which no production code calls (see pending items); the gained branch is the corrupt-manifest rethrow in `load()` (22-23). `project-config-store.ts` 12-13 (`readTolerant`, a 1:1 call to `sanitizeConfiguration`) stay uncovered here and run in `integration/init-config-repair.test.ts`. The published `schemas/*.json` files are not TypeScript and have no proxy; `npm run schemas:check` (in `release:check`) pins their content. Commit `eba24d9`.

Layout: `project-config-store.test.ts` and `manifest-store.test.ts` import `src/infrastructure/storage/` and moved to `tests/integration/` unchanged (decision 3, move-only step with `git mv`), keeping their names because prd-01 `done/task_3.md` cites them. Neither is listed in `tests/test-lanes.ts`, so the lanes file is unchanged (`test-lanes.test.ts` green). `schemas.test.ts` and `changes-schema.test.ts` import only `src/core/contracts/` and stay in `tests/unit/`.

### contracts/changes.ts → `CHANGE_OWNERS` Common (the closed owner set, read by `installReportSchema` in `diagnostics.ts`); the zod schemas → Trivial (no production import)

| Behavior | Mutant | Test |
|---|---|---|
| the prd-12 removed owners stay out of the closed set | `protocol`, `instruction_block`, or `ignore_block` re-added to `CHANGE_OWNERS` | `rejects the removed %s owner (prd-12 FR-08, DEC-11)` (3 rows) |
| every live owner stays in the set | an owner dropped from `CHANGE_OWNERS` | `npm run typecheck`: all six owners are typed `ChangeOwner` literals in `src/` planners (`installation-builder.ts`, `removal-helper.ts`, `gitignore-plan.ts`, `manifest-change.ts`, the harness planners) |

### contracts/manifest.ts and storage/manifest-store.ts → Common (`load`: absent vs corrupt); `save`, `delete`, `planSave` → no production caller

| Behavior | Mutant | Test |
|---|---|---|
| an absent manifest reads as null; a saved one reads back whole | ENOENT guard → `throw`; the parsed result replaced | `persists, reads back, and deletes manifest on filesystem` |
| a corrupt or unknown-version manifest throws instead of reading as absent | `if (code === 'ENOENT')` → `if (true)`; `installationManifestSchema.parse` removed | `rejects a manifest with $name instead of reading it as absent` (2 rows: `SyntaxError`, `ZodError`) |

### storage/project-config-store.ts → Common (`read`); `readTolerant` → Glue

| Behavior | Mutant | Test |
|---|---|---|
| a valid file parses to the configuration | `parseConfiguration` result dropped | `reads and validates a project configuration asynchronously` |
| schema and syntax errors carry the file path and the issue | `this.filePath` not passed; `catch` removed; `invalidSyntaxError` arguments changed | `rejects $name with the file path and the issue` (2 rows; module 10 relies on the syntax row for `invalidSyntaxError`) |

### schemas/*.json (generated by `scripts/generate-schemas.ts`) → Common, through the published files

| Behavior | Mutant | Test |
|---|---|---|
| exactly the config, doctor report, and install report schemas ship, as Draft 2020-12 | a schema file added or dropped; `target` changed | `publishes only the config, doctor report, and install report schemas, as Draft 2020-12 (prd-12 FR-01, FR-03, TC-02)` (module 7 relies on it) |
| both reports stay at `schemaVersion` 1 | `z.literal(1)` bumped in `diagnostics.ts` and regenerated | `keeps both report schemas at version 1 (NFR-02)` (module 6 relies on it) |

### Actions
- **Deleted (7 runner tests):** changes-schema `validates a valid fileChange`, `validates a complete change plan`, and `requires limitations alongside the derived support level`: they parse `fileChangeSchema`, `changePlanSchema`, and `harnessInstallPlanSchema`, which nothing in `src/` imports; `diagnostics.ts` defines its own `fileChange`, `plan`, and `harnessPlan` (with required `limitations`), parsed by every `init --json` integration test. The `DEC-02, DEC-03` on the last one's `describe` resolve in prd-01 to the git ignore block and Antigravity registration, not to limitations, so no TechSpec row loses its test. changes-schema `accepts every closed owner`: it loops over `CHANGE_OWNERS` itself, so dropping an owner only shortens the loop; typecheck kills that mutant (see the table). changes-schema `rejects an unknown owner`: same `z.enum` mutant as the three removed-owner rows. schemas `publishes two support levels and the four capability IDs in both reports (prd-12 DEC-08, TC-11)`: the body never asserted the support levels; the four capability IDs and both levels are `support-service.test.ts` `has exactly the four remaining capability IDs…` and `derives every capability combination…` (TC-11 maps there in the prd-12 TechSpec), and the published file's content is pinned by `schemas:check`. manifest-store `validates schema-compliant manifest records`: `toHaveLength(1)` on arrays; the round trip parses the same schema in `load()` and compares the whole manifest. manifest-store `plans create and update changes for manifest persistence`: `planSave` has no caller; the live planner is `planManifestChange` in `core/services/manifest-change.ts`, run by every `init` integration test.
- **Merged:** schemas `publishes deterministic Draft 2020-12 schemas` and `publishes only the config, doctor report, and install report schemas` into one test (the TC-02 directory listing plus the `$schema` check; the title lost "deterministic", which the body never checked; module 7's report cites the old title). project-config-store `attaches the file path to schema errors` and `reports malformed JSON without accepting it` into one 2-row `it.each`.
- **Rewritten:** schemas test 1 lost three `toBeDefined()` assertions on imported schemas and the dynamic `node:fs/promises` import. The version test lost the `runtime_state` and removed-owner substring checks on `install-report.schema.json` (the owner set is asserted in process by changes-schema and typecheck, the file's content by `schemas:check`) and with them `RF24` and `prd-12 FR-08`, which stay on the changes-schema test. project-config-store reads once per row with `rejects.toMatchObject`, drops `cause toBeDefined()` (losing the low-risk "error not passed as cause" mutant), and removes its temp directory in `finally`, as manifest-store now does.
- **Created (2 rows):** `rejects a manifest with $name instead of reading it as absent`: the mutant ENOENT guard → `true` makes a corrupt manifest look like a fresh project (init reinstalls over it, remove finds nothing to remove), and a dropped `parse` lets an unknown schema version through; no test in the suite killed either (`manifest-store.ts` 22-23 had no coverage anywhere).
- **Kept:** the three removed-owner rows, the manifest round trip, the valid configuration read.
- **Moved:** `tests/unit/project-config-store.test.ts` and `tests/unit/manifest-store.test.ts` → `tests/integration/` (decision 3).

### Production pending items
- `src/core/contracts/changes.ts`: `changePreviewSchema`, `fileChangeSchema`, `planConflictSchema`, `harnessInstallPlanSchema`, `applyOutcomeSchema`, and `changePlanSchema` have no production import; `diagnostics.ts` duplicates them inline. Either `diagnostics.ts` reuses them or they go (the removed-owner test would then probe `installReportSchema` or `CHANGE_OWNERS`).
- `NodeManifestStore.planSave`, `save`, and `delete` (and those `ManifestStore` port methods) have no caller: init plans the manifest through `planManifestChange` and remove deletes it through a `manifest` change. `planSave` duplicates `planManifestChange`. The round trip still uses `save`/`delete` to arrange a valid `load()`.

### Questions `[?]`
- None.

## 12. telemetry/counters-statusline — done 2026-10-10

**Baseline:** 36 runner tests across the 4 files, green (the plan's 29 was the grep count). Stryker: n/a (Common).
**Result:** 29 tests across the same 4 files, green. Scoped coverage proxy (`session-counters.ts`, `session-reset-handler.ts`, `statusline-summary.ts`, `contracts/statusline-line.ts`, `contracts/session-ledger.ts`): lines 98.13% → 98.13%; branches 87.5% → 89.09% (`session-reset-handler.ts` 81.81% → 86.36%: the compaction guard on line 28 is now covered). Remaining gaps: the `hooks.onPhase?.` calls (`session-reset-handler.ts` 23-25, 29) run in `hook-deadline.test.ts` and `integration/handoff-deadline.test.ts`; the invalid-JSON `catch` of `parseLedgerLine` (`session-ledger.ts` 67-68) belongs to the ledger store tests. Commit `07ca62a`.

Layout unchanged: one file per source, keeping the names the TechSpecs cite (prd-02.1 TC-12, prd-02.2 TC-01 and TC-02, prd-14 TC-02). `statusline-line.test.ts` covers `contracts/statusline-line.ts` and the ledger union in `contracts/session-ledger.ts`. No file imports `src/infrastructure/` and all run in the parallel lane, so decision 3 and `tests/test-lanes.ts` do not apply.

### session-counters.ts → Common (turn counting that feeds zone classification; the zone boundaries are module 34)

| Behavior | Mutant | Test |
|---|---|---|
| empty ledger: 0 turns, next turn 1, every field null, empty status line summary | `turns + 1` → `turns`; any `?? null` removed | `summarizes an empty ledger as no turns, reading, zone, session, reset, or status line` |
| tool lines count, status line lines do not; characters sum; last reading, zone, session line | `type !== 'tool'` narrowed; `+=` → `=`; `lastReading` assignment dropped | `counts the tool lines but not the status line lines… (DEC-05, TC-02)` |
| a repeated tool call id counts once, unidentified calls each count | `has` check removed; `!== null` inverted | `deduplicates a repeated tool call identifier…` |
| the count restarts after the last reset; the session line survives it | `slice(resetIndex + 1)` → whole ledger; session line looked up after the reset | `restarts the count at the reset line, ignores earlier readings, and keeps the session line` |
| `lastResetAt` is the last reset (TC-12) | `lastResetIndex` keeps the first reset | `reports the time of the last of two reset lines` |

### statusline-summary.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| the window survives the reset, earlier usage is dropped, `summarizeLedger` passes its last reset | `position > resetIndex` removed or applied to the window; `-1` passed; `type !== 'statusline'` removed | `keeps the window but drops the usage recorded before the last reset of the ledger` |
| the latest window wins; usage after the reset carries its timestamp | first window kept; `at` changed | `uses the latest window and reads the usage recorded after the reset with its timestamp` |
| null values never overwrite | either `!== null` guard removed | `does not let null values overwrite the last valid ones` |

### contracts/statusline-line.ts and the ledger union → Common (TC-01)

| Behavior | Mutant | Test |
|---|---|---|
| nulls and the boundaries 0, 0%, 100%, 200 characters are accepted | `nullable` dropped; `nonnegative` → `positive`; `lte`/`maxLength` off by one | `accepts null…`, `accepts the boundary values…` |
| zero or fractional window, negative tokens, out-of-range percentage, 201 characters, unknown field rejected | each refinement or `strictObject` relaxed | `rejects %s` (7 rows) |
| the line parses in the ledger union; older parsers skip it | schema dropped from the union | `parses the line as a ledger line…`, `is skipped without error… (NFR-04)` |

### session-reset-handler.ts → Common (agent-facing resume text, mandated)

| Behavior | Mutant | Test |
|---|---|---|
| `new`/`clear` claim a pending handoff and name the archived path | claim skipped; text argument changed | `claims a pending handoff on %s…` (2 rows) |
| the hook deadline reaches the claim | `deadline` not passed | `passes the hook deadline to the claim (CR-01)` |
| no pending handoff → neutral | `archived === null` guard removed | `injects nothing without a pending handoff` |
| compaction, restart off, or no session boot: neutral, no claim | `reason === 'compact'`, `restartMode !== 'handoff'`, or the capability check removed | `neither claims nor injects %s` (3 rows) |
| snapshot mode: resume command on `new` and on compaction where compaction boots; neutral elsewhere (prd-12 FR-05) | `resumeText ??` order swapped; `COMPACTION_BOOT_HARNESSES` check removed or inverted | `in snapshot mode answers %s on %s with %j…` (3 rows) |

### Actions
- **Deleted (4):** session-counters `has no reset time without a reset line` (the empty-ledger `toEqual` asserts `lastResetAt: null`); statusline-summary `returns no window and no usage without statusline lines` (the empty-ledger `toEqual` asserts the null summary; skipping non-statusline lines is killed by the reset line in `keeps the window but drops the usage…`); statusline-line `accepts a line with the five recorded values` (`accepts the boundary values…` spreads the same `VALID` line); session-reset-handler `delivers a handoff to one session only` (same `archived === null` path as `injects nothing without a pending handoff`; once-only delivery is the store contract, asserted by `integration/node-handoff-store.test.ts` `lets only one of two concurrent claims deliver the handoff` and `node-handoff-store-lock.test.ts` `delivers each handoff once…`).
- **Merged:** `keeps the session line across a reset` into the reset test. statusline-summary `keeps the window recorded before the reset`, `drops usage recorded before the reset` (identical arrangement), and `is filled by the ledger summary using the last reset` (which passed even with `-1` as the reset index) into one test through `summarizeLedger`. `uses the latest window, recorded after the reset` and `reads usage recorded after the reset with its timestamp` into one whole-object assertion. `does not count statusline lines as turns` into the session-counters count test (DEC-05, TC-02 in its title). The compaction, restart-off, and no-boot reset tests into one 3-row `it.each`.
- **Rewritten:** the empty-ledger test asserts the whole summary; the count test asserts `lastReading` by identity. The fake handoff store no longer empties itself after a claim (only the deleted test needed it).
- **Created (2 rows):** snapshot mode `compact` on `codex-cli` (resume text) and on `cursor` (neutral): line 28 (`COMPACTION_BOOT_HARNESSES`) had no killing test anywhere, and prd-12 FR-05 requires the resume instruction after compaction on a harness with session-start injection.
- **Kept:** dedup and last-reset counters, null-overwrite summary, all statusline-line rejection rows and both parse tests (TC-01), the claim rows, the deadline and no-pending tests.

### Production pending items
- None.

### Questions `[?]`
- None.

## 13. brake/errors-merges — done 2026-10-10

**Baseline:** 28 runner tests across the 4 files, green (the plan's 21 was the grep count). Stryker: n/a (Common).
**Result:** 28 tests across the same 4 files, green. Scoped coverage proxy (`runtime-error-checks.ts`, `debug-mode-merge.ts`, `snapshot-merge.ts`, `contracts/session-ledger.ts`): lines 80.64% → 80.64% (services 100% → 100%; `session-ledger.ts` 54-71 are the ledger parsers that module 12 and the ledger store tests own); branches 93.87% → 94% (`snapshot-merge.ts` 90.9% → 91.3%: the clear path without a section now runs). Remaining gaps: the singular `error` branch of `runtimeErrorFindings` (line 28) is asserted exactly by `integration/doctor-runtime-errors.test.ts`; the `?? []` and `?? 'is invalid'` fallbacks of `snapshot-merge.ts` (22-23) are unreachable because a failed Zod parse always carries an issue. Commit `88d4648`.

Layout unchanged: one file per source (`runtime-error-line.test.ts` covers `errorLineSchema` in `contracts/session-ledger.ts` and keeps the name prd-10 TC-17 cites). No file imports `src/infrastructure/` and all run in the parallel lane, so decision 3 and `tests/test-lanes.ts` do not apply.

### runtime-error-checks.ts → Common (doctor finding, reduced depth for wording)

| Behavior | Mutant | Test |
|---|---|---|
| the finding carries the count and the distinct codes in sorted order | `new Set` removed; `.sort()` removed; any field changed | `warns about recorded runtime errors with the count and their distinct codes in order` |
| no errors, no finding | `length === 0` guard removed | `emits no finding when there are no errors` |
| the 24-hour window includes its boundary | `>=` → `>`; `-` → `+`; window constant changed | `keeps only errors inside the 24-hour window through the injected clock` |

### contracts/session-ledger.ts `errorLineSchema` → Common (prd-10 FR-11, TC-17)

| Behavior | Mutant | Test |
|---|---|---|
| lines without the phase fields still parse | `z.optional` dropped from `phase` or `elapsedMs` | `accepts lines written before the phase fields existed` |
| phase and elapsed milliseconds are accepted | field dropped from the strict object | `accepts the phase and elapsed milliseconds of a deadline` |
| unknown phase and negative duration rejected | enum widened; `nonnegative` removed | `rejects an unknown phase and a negative duration` |
| doctor reads old and new lines alike (TC-17 scenario) | none exclusive (the window test kills the filter family) | `selects recent old and new lines alike for doctor` (kept for TC-17) |

### debug-mode-merge.ts → Common (prd-08 TC-01, FR-01, FR-04)

| Behavior | Mutant | Test |
|---|---|---|
| `--debug` sets the mode when it is absent or off | `current === true` → `current !== undefined` | `sets the mode with --debug when it is off` |
| no flag keeps, with or without the mode; `--debug` keeps the mode on; `--no-debug` without the key keeps | `if (flags.noDebug)`/`if (flags.debug)` inverted; `current === true`/`=== undefined` guards removed | `keeps the configuration for %s` (4 rows) |
| `--no-debug` removes an existing key | `current === undefined` → `!current` | `removes an existing key with --no-debug` |
| both flags are a conflict with the exact message | `&&` → `\|\|`; guard removed | `rejects --debug together with --no-debug` (module 1 relies on it) |
| apply: set writes `true`, remove drops the key, keep returns the same object | kind check removed or swapped | `writes debug true on set…`, `returns the same object on keep` |
| in effect only for `debug: true` | `=== true` → `!== undefined` or `!== false`; `?.` removed | `is in effect for %s: %s` (4 rows) |

### snapshot-merge.ts → Common, mandated snapshot settings (prd-12 FR-04, TC-05)

| Behavior | Mutant | Test |
|---|---|---|
| no snapshot flag keeps the section | keep guard removed or `!flags.clearCommand` dropped | `keeps the section without snapshot flags` |
| success: trigger alone, override of given fields, clear keeps the trigger, clear without a section falls back to `RED` | `{ ...current }` → `{}`; clear base keeps commands; `current?.triggerZone` → `current.triggerZone` (crash on a fresh `init --no-snapshot-command`) | `sets $name` (4 rows) |
| failure: clearing with a command flag is the conflict error | guard removed; `\|\|` → `&&`; message swapped for the schema error | `rejects clearing together with a command flag` |
| failure: invalid trigger names `snapshot.triggerZone` | `SECTION_PATH` or the issue path dropped | `reports an invalid trigger with the section path` |
| apply writes the section, keep returns the same object | kind check removed | `applies a set update and leaves the config alone on keep` |

Recovery and the remaining failure cases run end to end in `integration/init-snapshot.test.ts`: `clears both commands and keeps the trigger zone with --no-snapshot-command`, `rejects --no-snapshot-command together with %s and writes nothing` (both flags), and `rejects a resume command without a snapshot command and names the key`.

### Actions
- **Deleted (1):** debug-mode-merge row `removes an existing key (true) with --no-debug`: every plausible mutant of `current === undefined ? KEEP : remove` is killed by the `false` row or by the `--no-debug without the key` keep row; `--no-debug` after `--debug` runs end to end in `integration/init-debug-mode.test.ts` `turns the debug mode off with --no-debug`.
- **Merged (3 → 1 `it.each`):** snapshot-merge `sets a trigger zone without a command`, `overrides only the given fields`, `clears both commands and keeps the trigger zone` → `sets $name` (same arrangement and assertion).
- **Rewritten (3):** runtime-error-checks finding test: `toContain` and `toBeTruthy` became a whole-finding `toEqual` with codes fed out of order (the dedup and sort mutants survived before); the `RUNTIME_ERROR_WINDOW_HOURS` constant assertion was dropped (Trivial; the exact-boundary row kills a changed window). snapshot-merge conflict test: `toHaveProperty('error')` → the exact conflict message, which tells it apart from the schema error a removed `resumeCommand` check would produce.
- **Created (1 row):** snapshot-merge `the default trigger zone when clearing without a section`: production calls `mergeSnapshot(undefined, …)` on a fresh `init` (`init-config-updates.ts`), and no test ran the clear path without a section, so dropping `?.` would crash `init --no-snapshot-command` unnoticed. It replaces the deleted debug row, so the module stays at 28.
- **Kept:** the empty-finding and window tests, all four `runtime-error-line` tests (the last for TC-17), the debug set, keep, conflict, apply, and effect tests, and the snapshot keep, invalid-trigger, and apply tests.

### Production pending items
- None.

### Questions `[?]`
- None.

## 14. restart/policy — done 2026-10-10

**Baseline:** 42 runner tests across the 5 files, green (the plan's 32 was the grep count). Stryker: n/a (Common).
**Result:** 31 tests across the same 5 files, green. Scoped coverage proxy (`auto-restart-policy.ts`, `auto-restart-notices.ts`, `restart-mode.ts`, `contracts/auto-restart.ts`, `contracts/restart-log.ts`): lines 100% → 100%; branches 97.14% → 96.96% (same per-file figures; the total moved with the branch count of the deleted rows). The one gap, `seedText(resume)` (`auto-restart-notices.ts` 21), is asserted exactly by `restart-flow.test.ts` `carries the resume text in the seed…` (prd-14 TC-05). Commit `7350d49`.

Layout unchanged: one file per source, keeping the names the TechSpecs cite (prd-11 TC-01/02/04/05/06 → `auto-restart-policy.test.ts`, TC-07 → `auto-restart-notices.test.ts`, TC-08 → `auto-restart-contract.test.ts`; prd-14 TC-04 → `auto-restart-policy.test.ts`, TC-06 → `restart-neutrality.test.ts`). No file imports `src/infrastructure/` and all run in the parallel lane, so decision 3 and `tests/test-lanes.ts` do not apply. prd-11 TC-03 (checkpoint gate) and the runner-id and `DISABLE_AUTO_COMPACT` cases of TC-06 were superseded by prd-12/prd-14 (the neutrality test forbids `DISABLE_AUTO_COMPACT` in core) and were not recreated.

### auto-restart-policy.ts → Common, mandated zone action (prd-11 FR-01, FR-04–FR-06; prd-14 FR-04, DEC-04)

| Behavior | Mutant | Test |
|---|---|---|
| the signal alone restarts; snapshot mode ignores the handoff | `!handoff.required` guard removed; return literal | `restarts on the signal alone and ignores the handoff in snapshot mode (prd-12 FR-10, prd-14 TC-04)` |
| no signal skips silently, before any stand-down | `!facts.signal` inverted or moved after `standDownCode` | `skips silently without the signal…` (TC-02) |
| env switch and non-interactive stand down | either branch of `standDownCode` removed or swapped | `stands down for the %s` (2 rows, TC-06) |
| limit 2 pauses the third restart, before the no-progress guard | `>=` → `>`; guard order in `guardCode` swapped; `=== 0` operand dropped | `pauses the third consecutive restart with the limit at 2, before the no-progress guard` (TC-04) |
| a seeded session with no tool call is refused; an unseeded one is not | `consecutive > 0` → `>= 0`; `&&` → `\|\|` | `refuses a signal from a seeded session…`, `does not apply the no-progress guard…` (TC-05) |
| handoff missing, stale, fresh at the turn start, unknown turn start | `=== null` inverted; `<` → `<=`; `turnStartedAt === undefined` dropped | the four handoff tests (prd-14 TC-04, codereview_01 CR-01) |
| env → non-interactive → handoff → guards | `??` chain reordered | `orders the stand-down reasons, then the handoff gate, then the guards (FR-06, TC-06)` |

### auto-restart-notices.ts → Common (`seedText`, `appendLogRecord`); `renderRestartNotice` and `buildLogRecord` → Trivial (data table, 1:1 builder)

| Behavior | Mutant | Test |
|---|---|---|
| one single-line notice per code, none for `SKIP_NO_SIGNAL` | a notice dropped or made multi-line | `has a one-line notice for every code except the silent one` (TC-07) |
| skip notices name the way out (reduced depth) | wording of the pause or switch notice | `names the cause and the way out in the skip notices` |
| exact seed, under the 60-token budget (prd-11 TechSpec: agent-facing text) | seed literal changed | `builds the exact generic seed…`, `keeps the seed inside the token budget` |
| newest 50 records of `{ at, code }`, input untouched | `slice(-N)` → `slice(0, N)`; push mutates; field added | `keeps the newest 50 records of only a timestamp and a code, without mutating the input` (NFR-02, TC-07) |

### restart-mode.ts → Common (prd-14 FR-01, DEC-01)

| Behavior | Mutant | Test |
|---|---|---|
| off without `autoRestart`, with or without a command | `=== undefined` inverted; checks reordered | `is off without automatic restart…` |
| snapshot with a command, handoff without | ternary swapped | `uses the snapshot skill…`, `uses the markdown handoff…` |

### contracts/auto-restart.ts and contracts/restart-log.ts → Common (prd-11 FR-07, DEC-09, DEC-10, NFR-02, NFR-03)

| Behavior | Mutant | Test |
|---|---|---|
| the block defaults the limit to 2 and accepts 1 and 10 | default literal; `minimum`/`maximum` bounds | `accepts the block and defaults…`, `accepts the documented range 1 to 10` |
| rejects 0, 11, fractions, unknown keys | bound removed; `z.int` → `z.number`; `strictObject` → `object` | `rejects the limit %s` (3 rows), `rejects unknown keys inside the block` (TC-08) |
| configurations without the block stay valid | `z.optional` removed | `keeps configurations without the block valid` (NFR-03, TC-24) |
| the log holds only coded records | enum widened; `strictObject` → `object` | `accepts a log of coded records`, `rejects unknown codes and any free-text field` (DEC-10) |

### restart-neutrality → architecture rule (prd-14 FR-05, TC-06)
Kept as a grep over the seven core restart files plus the rendered notices and seed.

### Actions
- **Deleted (4):** contract `rejects the limit '2'` row (`z.int()` rejects a string just as it rejects `1.5`; no mutant separates them); contract `publishes the optional block in the generated schema` (reads the committed JSON, so no production mutant reaches it; TC-24's own suite is `npm run schemas:check`, which regenerates every published schema from `configurationSchema` and diffs it, and `keeps configurations without the block valid` kills the `z.optional` removal); notices `builds records with only a timestamp and a code` (Trivial 1:1 builder; the append test now asserts the whole newest record with `toEqual({ at, code })`, which kills the added-field mutant, and TC-07 stays in its describe); policy `ignores the handoff in snapshot mode` (same arrangement as `READY`, whose test kills the `!handoff.required` removal; its identifiers moved into that title).
- **Merged:** neutrality 7-row `names no harness in %s` → one `it` asserting that the list of offending files is empty (same protection, the file is named on failure; −6 runner tests). Policy `orders the stand-down reasons before the guards` and `orders the handoff gate after the stand-down reasons and before the guards` → one precedence test over a fact set where every gate would fire (−1).
- **Rewritten (assertions trimmed):** the `guarded(0, undefined)` assertion (identical to `READY`), the repeated `guarded(1, 3)` assertion in the no-progress test, the `TURN_START + 5` handoff assertion (`TURN_START` already kills `<` → `<=`), the seed `not.toContain('boot')` (implied by exact equality), and the config `schemaVersion` assertion (Trivial, owned by the config tests). The pause assertion now uses `guarded(2, 0)`, which kills a reordered `guardCode` that the dropped `hostile → PAUSED` assertion used to kill.
- **Created:** none.
- **Kept:** the rest of the policy, notice, seed, budget, append, restart-mode, schema, and log-schema tests.

### Production pending items
- None.

### Questions `[?]`
- None.

## 15. restart/flow-arguments — done 2026-10-10

**Baseline:** 61 runner tests across the 4 files, green (the plan's 30 was the grep count). Stryker: n/a (Common).
**Result:** 41 tests (`auto-restart-merge` 9, `init-max-restarts-arguments` 23, `restart-flow` 7, plus 2 added to `init-arguments.test.ts`, which goes from 21 to 23), green. Scoped coverage proxy (`restart-flow.ts`, `init-arguments.ts`, `init-option-rules.ts`, `auto-restart-merge.ts`, `reset-notice.ts`): lines 94.44% → 96.91%; branches 90.81% → 95.41% (`auto-restart-merge.ts` branches 96.66% → 100%: the `keep` branch of `applyAutoRestart` is now asserted; `init-arguments.ts` 93.65% → 100% because the after-run includes `init-arguments.test.ts`, which holds the bridge-target tests). Remaining gaps: `restart-flow.ts` 36-37 (the `guarded` catch around `markSeeded`/`rollbackConsecutive`, a defensive guard, uncovered before too); `init-option-rules.ts` 20 (`--gitignore` with `--no-gitignore`, owned by module 40's `gitignore-merge.test.ts`); `reset-notice.ts` 8-10 (`renderResetNotice`, asserted by `reset-notice.test.ts`, module 36). Commit `7d10af2`.

Layout: one file per source. The new `tests/unit/auto-restart-merge.test.ts` is the file the prd-16 TechSpec TC-01 names (prd-16 codereview_02 CR-03 flagged that the cases lived elsewhere); it holds the merge tests from `auto-restart-arguments.test.ts` and `init-max-restarts-arguments.test.ts`. The auto restart command-line tests went to `init-arguments.test.ts` (the file prd-11 TC-21 names; 70 non-blank lines). `init-max-restarts-arguments.test.ts` keeps the `--max-restarts`, `--interactive`, and `hasConfigurationFlag` tests and the two titles module 3 cites. `assertAutoRestartTarget` takes `getAllAdapters()` as collaborator data for the restart modes, as in module 2, so decision 3 does not apply; no file is in `tests/test-lanes.ts`.

### auto-restart-merge.ts → Common (prd-11 FR-07, DEC-09; prd-16 FR-08, FR-09)

| Behavior | Mutant | Test |
|---|---|---|
| `--auto-restart` sets an absent block, keeps a present one | `current === undefined` inverted | `sets the block only when it is absent…` |
| `--no-auto-restart` removes only a present block | same, in the remove branch | `removes the block only when it is present` |
| no flag keeps; both flags give the exact conflict error | `&&` → `\|\|`; error literal | `keeps everything without a flag and rejects both flags together` |
| a limit is stored on enable or change, kept when unchanged, refused while off | `!autoRestart` / `current === undefined &&` dropped; `=== limit` → `false` | the four `mergeAutoRestart with a limit` tests |
| apply: default 2, explicit limit, keep untouched, remove, no mutation | `?? DEFAULT` → `DEFAULT`; `kind === 'keep'` guard removed | `applies the update to a configuration without mutating it` |
| wanted when set, or kept and present | `&&` → `\|\|`; `=== 'set'` → `false` | `wants the feature…` |

### init-option-rules.ts → Common (boundary validator `parseMaxRestarts`, compatibility asserts)

| Behavior | Mutant | Test |
|---|---|---|
| 1 and 10 accepted; 0, 11, 2.5 rejected with the rule | `>=` → `>`; `<=` → `<`; either regex anchor removed | `accepts %s` (2 rows), `rejects %j naming the 1 to 10 rule` (3 rows) |
| `--max-restarts` with `--no-auto-restart` refused | `&&` → `\|\|`; throw removed | `rejects --max-restarts with --no-auto-restart` |
| `--interactive` refuses `--yes` and `--json`, accepts `--dry-run` | either throw removed; guard inverted | `rejects --interactive with %s…` (2 rows), `accepts --interactive with --dry-run` |

### init-arguments.ts → Common (`hasConfigurationFlag`, `assertAutoRestartTarget`)

| Behavior | Mutant | Test |
|---|---|---|
| each configuration flag counts | any operand of the `flags` list or the `\|\|` chain dropped | `counts %j as a configuration flag (FR-01, TC-03)` (12 rows) |
| no flag and `--dry-run` do not count | `.length > 0` → `>= 0`; `some(Boolean)` → `true` | `does not count %j (FR-01, TC-03)` (2 rows) |
| `--auto-restart` needs a project harness with a restart mode; semi-automatic counts; `--no-auto-restart` is never checked | `hasRestartMode` → `true`/`false`; `state === 'project'` dropped; `!args.autoRestart` guard removed | `requires one harness active in the project with a restart mode (prd-14 DEC-11, TC-13)` |
| the conflict reaches the CLI as a `CliArgumentError` with the message | `'error' in merge` guard or `CliArgumentError` wrapping removed | `rejects both flags together with a message that names them` |

### restart-flow.ts → Common (prd-14 FR-04, FR-05, FR-09, NFR-01, TC-05)

| Behavior | Mutant | Test |
|---|---|---|
| a reply without the marker does nothing | `!endsWithResetSignal` → `false` | `ignores a reply that does not end with the marker` |
| restart: guard bump, `RESTARTED`, generic seed, seeded on open | `bumpConsecutive`/`markSeeded` removed; seed changed | `bumps the guard, logs the restart…` |
| the resume text rides in the seed | `seedText(resume)` → `seedText()` | `carries the resume text in the seed…` (exact; module 14 relies on it) |
| rejection rolls back and reports | `rollbackConsecutive` or report removed | `rolls the guard back and reports…` |
| a skip logs its code and opens nothing; the settings reach the policy | `kind === 'skip'` return removed; `mode === 'handoff'` or `maxConsecutive` mapping changed | `skips with a reason…`, `stops at the consecutive limit` |
| a logging failure becomes the internal-error notice | `try/catch` in `reportRestart` removed | `reports an internal error when logging fails…` |

### Actions
- **Deleted (20 runner tests):** `runner-reset-signal.test.ts` (9): prd-04 RF3/DEC-05/TC-10 is the runner signal that prd-12 superseded, and every non-equivalent mutant of `endsWithResetSignal` (`trimEnd` removed, `endsWith` → `includes`, `at(-1)` → `at(0)`) is killed by `reset-notice.test.ts` `reset signal detection (RF22, prd-14 FR-12, TC-11)`; the `split`/`at(-1)` step is equivalent to `endsWith` on the trimmed text, so the CRLF and blank-line rows kill nothing more. `keeps the old behavior without a limit (FR-08, TC-01)` (same two calls as `sets the block only when it is absent…`, which now carries FR-08). `parses both flags` (the `autoRestart` mapping is killed by the target test, `noAutoRestart` by the conflict test). `accepts runs without the flags whatever the harnesses are` (codex has a restart mode, so it passed with or without the guard; the guard is killed by the `--no-auto-restart` antigravity case). `--max-restarts` rows `3` (between the `1`/`10` boundaries), `abc`, `-1`, `''` (out of range with or without the pattern; `2.5` kills the anchors). `hasConfigurationFlag` rows `--no-statusline-bridge` (same `statuslineBridge !== undefined` operand as `--statusline-bridge`) and `--yes`, `--json`, `--interactive` in `does not count` (`hasConfigurationFlag` is used only by `shouldRunAssistant`, which checks those three flags before it, so counting them changes nothing observable).
- **Moved:** the merge tests into the new `auto-restart-merge.test.ts`; the conflict and target tests into `init-arguments.test.ts`; `auto-restart-arguments.test.ts` removed.
- **Rewritten (4):** both merge errors assert the exact string (one asserted `toHaveProperty('error')`); the conflict test asserts the error class and message in one `toThrow`; the target test drops the bare `parseInit(...).not.toThrow()` and reuses the parsed args; the `hasConfigurationFlag` row `--auto-restart --max-restarts 3` became `--max-restarts 3`, since `autoRestart` masked the `maxRestarts !== undefined` operand.
- **Created (assertions, no new tests):** `applyAutoRestart` with `keep` (a flagless `init` would otherwise reset a stored limit to 2) and with an explicit limit (`?? DEFAULT` dropped); a `candidate` codex detection in the target test (the `state === 'project'` filter had no killer); `host.requests` empty in `stops at the consecutive limit` (a session opened after a skip survived).
- **Kept:** the seven `restart-flow` tests, the `--interactive` tests, the remaining matrix rows.

### Production pending items
- None.

### Questions `[?]`
- None.

### Notes for later modules
- Module 36: `reset-notice.test.ts` `reset signal detection` is now the only test of `endsWithResetSignal`; keep it in `tests/unit/` when decision 3 moves the per-harness notice tests.
- Module 3's citations of `counts %j…` / `does not count %j…` still resolve to `init-max-restarts-arguments.test.ts`; the `--max-restarts` row is now `["--max-restarts","3"]`, the `--dry-run` row is unchanged.

## 16. storage/capabilities — done 2026-10-10

**Baseline:** 19 runner tests across the 3 files, green. Stryker: n/a (Common).
**Result:** 9 tests (`link-capability` 4, `process-capability` 5), green; `git-capability.test.ts` and its helper removed. Scoped coverage proxy on the helpers (`coverage.include` is `src/**/*.ts`, so these helpers do not count toward the 80% gate; the proxy is informational): `link-capability.ts` lines 92.59% → 92.59%, branches 76.47% → 75% (same uncovered lines 20 and 35; v8 split one executed range of `linkPolicy` into two blocks before, both branches of the `fail`/`skip` ternary are still executed); `process-capability.ts` lines 91.48% → 91.48%, branches 95% → 100% (the `code === 0` side of the `close` handler is now asserted); `git-capability.ts` 61.76% → removed. Remaining gaps: `attemptLink` success (line 20, executed by the link integration suites), `requireLink`'s created-but-missing guard (line 35, defensive), `attemptGitProcess`/`attemptShellProcess` (48-53, one-line wrappers). Commit `6669794`.

The three files test test infrastructure (`tests/helpers/*-capability.ts`, the `tests.md` Platforms rule: skip locally with the reason, fail in CI), not `src/infrastructure/`, so decision 3 does not apply and they stay in `tests/unit/`. The plan row's Source column was corrected. No file is in `tests/test-lanes.ts`.

### link-capability.ts → Common (`linkPolicy`, `requireLink`, `attemptLink`, `linkExists`)

| Behavior | Mutant | Test |
|---|---|---|
| a created link proceeds | `if (attempt.created)` → `if (false)` | `proceeds when the link was created, in CI and locally` |
| an unavailable link skips locally with the reason and fails in CI | `fail`/`skip` swapped in the ternary; `ciRequiresLinks` comparison changed; `ctx.skip` or the `throw` removed | `skips locally but fails in CI when the required link is unavailable` |
| a failed attempt reports not created with platform and error detail | `created: false` → `true`; reason without `process.platform` | `captures platform and error detail when the link cannot be created` |
| `linkExists` tells an existing path from a missing one | `.then(() => true)` → `false`; `.catch(() => false)` → `true` | `detects an existing path and a missing path without throwing` |

### process-capability.ts → Common (`processPolicy`, `requireProcess`, `attemptExecutable`)

| Behavior | Mutant | Test |
|---|---|---|
| an available executable proceeds | `if (attempt.available)` → `if (false)` | `proceeds when the executable is available, in CI and locally` |
| an unavailable executable skips locally and fails in CI | `fail`/`skip` swapped; `ciRequiresProcesses` comparison changed; `ctx.skip` or the `throw` removed | `skips locally but fails in CI when a required shell is unavailable` |
| a zero exit is available | `code === 0` → `code !== 0` (every probe would skip locally, the silent pass `tests.md` forbids) | `reports a zero exit as available` |
| a missing binary settles through the `error` event with file and platform | `error` handler removed; reason without file or platform | `reports a missing executable through the child error event` |
| a hanging probe settles at the timeout | timer removed | `reports a hanging probe as timed out instead of blocking the suite` |

### git-capability.ts → dead test infrastructure
Its only consumer was IT-18 (prd-01 TechSpec, `git status --porcelain` over plan/checkpoint files), whose suite `tests/integration/gitignore-lifecycle.test.ts` was deleted with the plan and checkpoint files in `cca3a29` (prd-12). No file imports the helper; the one git-dependent suite left (`codex-hook-command-shells.test.ts`) uses `attemptGitProcess` + `requireProcess` from `process-capability.ts`, whose policy is tested above. The helper and its test are removed together.

### Actions
- **Deleted (11 runner tests):** `git-capability.test.ts` (5) with `tests/helpers/git-capability.ts`, dead since `cca3a29` (successor: `attemptGitProcess`/`requireProcess`, covered by `skips locally but fails in CI when a required shell is unavailable`). In `link-capability.test.ts` and `process-capability.test.ts`: `skips with the captured reason when a local environment cannot create the link` / `lacks the shell`, `fails in CI mode when a required link cannot be created` / `the shell is unavailable`, and `requires links` / `the process only for an explicit CI environment` (6): each is redundant with the routing test of its file (`skips locally but fails in CI when …`), which reaches the same `linkPolicy`/`processPolicy` branches and the `CI` comparison through the public `requireLink`/`requireProcess`, under `CI=false` and `CI=true`, with the reason pinned by `rejects.toThrow`.
- **Merged (2 → 1, plus 1 row):** `reports a missing executable through the child error event without throwing` and `bounds a hanging probe with the timeout instead of blocking the suite` → `it.each` `reports $name` over `attemptExecutable`; the missing-binary row asserts `<file> is unavailable on <platform>` in one `toContain`.
- **Created (1 runner row):** `reports a zero exit as available` (row of the same `it.each`): the `close` handler's `code === 0` had no killer, and the integration callers would turn that mutant into local skips instead of failures.
- **Kept (4):** both `proceeds when …` policy tests, both routing tests, `captures platform and error detail …`, `detects an existing path and a missing path …`. The describes were merged into one per file, keeping `T14/CR-04` and `T35/CR-06`.

### Production pending items
- None in `src/`. Test infrastructure: `attemptShellProcess` in `process-capability.ts` has no caller (remove it); `link-capability.ts` and `process-capability.ts` duplicate `ciRequires*`/`*Policy` and could share one capability policy helper.

### Questions `[?]`
- `process-capability.test.ts` starts child processes (`attemptExecutable` spawns `node` and a missing binary) but is not in `PROCESS_LANE_FILES`; the lane test only scans test-file source for `node:child_process`, and the spawn lives in the helper. Move it to the process lane, or accept it in the parallel lane (3 short probes, ~0.3 s)?
- The `CI === '1'` operand of `ciRequiresLinks`/`ciRequiresProcesses` has no killer; GitHub Actions sets `CI=true`, so it was left untested.

## 17. install/services — done 2026-10-10

**Baseline:** 22 runner tests across the 5 files, green (the plan's 19 was the grep count). Stryker: n/a (Common).
**Result:** 21 tests across the same 5 files, green. Scoped coverage proxy (`detection-service.ts`, `harness-exclusion.ts`, `harness-removal.ts`, `installation-adapters.ts`, `installation-builder.ts`, `installation-findings.ts`, `installation-service.ts`, `removal-helper.ts`, `removal-service.ts`): lines 72.17% → 72.17%; branches 80.95% → 80.68%. The branch delta is v8 block accounting in `removal-service.ts` (83.33% → 82.14%): a per-branch dump shows the same count of uncovered branches (5) on the same lines (31, 34, 40 ×2, 59), out of 30 blocks before and 28 after. At 31 and 34 the uncovered side swapped: the old fixture had no manifest or config snapshot and ran the `?? resolve(...)` fallback; the new one runs `snap.realPath`. The fallback is defensive (a deletion of an absent file is dropped by `createChangePlan`), so no test was added. The 0% rows are Glue run only through `init` (module 24): `installation-service.ts`, `installation-adapters.ts`, `installation-findings.ts` (no test imports them). Other gaps: `harness-removal.ts` 26-29 (`guardModifiedAssets`, reached only with `protection` from `installation-service`, asserted by `integration/asset-currency-lifecycle.test.ts`); `installation-builder.ts` 73-76 and its debug/gitignore/auto-restart/dropped summary parts (wording, asserted by the init integrations and modules 13/14); `removal-service.ts` 40 (`removalAdapters` filter) and 59 (the `.gitignore` block change, prd-17, owned by module 41). Commit `ba7097d`.

Layout: `removal-conflicts.test.ts` calls `getAdapter(h).planRemove` on four real adapters against a temp directory, so it moved to `tests/integration/` unchanged (decision 3, move-only, name kept because codereview_07 task_27 cites it); it is not in `tests/test-lanes.ts` (`test-lanes.test.ts` green after the move). The other four files stay in `tests/unit/`, one per source.

### detection-service.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| shared instructions are not harness evidence | `kind !== SHARED_INSTRUCTION_EVIDENCE` → `true` | `ignores shared instructions as harness evidence (UT-01, CA-03)` |
| machine-only evidence is a versioned candidate | `hasSignal` → `false`; `versionFields` dropped | `keeps machine-only evidence as a versioned candidate (UT-03, CA-03)` |
| explicit include/exclude after deduplication | `included \|\|` removed; `excluded` check moved below; dedup `seen` removed | `applies explicit inclusion and exclusion after deduplication (UT-02, CA-04)` |
| include and exclude of one id throws, naming it | `throw` removed; wrong harness | `rejects a harness included and excluded together (UT-02, CA-04)` |

### harness-exclusion.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| excluded = (configured − include) ∪ exclude, sorted, unique; selection carries include and exclude | `!included.has` inverted; `sort`/`Set` removed; either selection spread dropped | `$name` (3 rows: FR-06, FR-05, FR-07, TC-10) |
| detection reports a configured exclusion as `excluded` | selection not forwarded | `feeds detection so an excluded harness is reported as excluded (FR-06, TC-10)` (TechSpec TC-10 names it) |
| lists compare as sets | `length ===` removed; `every` → `some` | `compares harness lists as sets (TC-10)` |
| write, keep, or omit `excludedHarnesses` | `undefined` guard removed; `length === 0` inverted | `writes, keeps, or omits the configuration key (FR-05, TC-10)` |

### installation-builder.ts (`configSummary`/`snapshotSummary`) → Common, human-readable (reduced depth)

| Behavior | Mutant | Test |
|---|---|---|
| no command says only zone headers; command with and without resume; unchanged section still reported from the written config | `command === undefined` inverted; `resumeCommand === undefined` inverted; `config.snapshot ??` → `DEFAULT_SNAPSHOT` | `$name` (4 rows, exact summary, CR-02) |

### removal-service.ts, removal-helper.ts → Common; harness-removal.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| removal deletes only owned files (asset, manifest, runtime, config), never protocol, instruction, `.gitignore`, or plan files | `planCoreDeletions` push removed; owner literals swapped; runtime filter → all | `deletes only the owned asset, runtime files, manifest, and configuration…` (FR-08, DEC-04, TC-12) |
| a modified asset is kept with the manifest and config, and becomes a generic finding | `assetPlan.conflicts.length > 0` dropped from `hasConflicts`; `sha256 !==` inverted; generic `createRemovalFinding` branch | `keeps a modified asset, the manifest, and the configuration, and reports the conflict as a finding` |
| an unparsable harness config is a conflict for every adapter | adapter parse `catch` → throw or empty plan | `isolates unparsable config for %s as conflict` (4 rows, CR-06, integration) |
| a conflicted harness keeps its assets, the manifest, and the config; the finding names the harness | `createRemovalFinding(conflict, adapter.id)` → `null`; `assetPaths` loop removed; `excludedAssetPaths.add` removed | `keeps manifest and config and skips conflicted runtime assets` (CR-06, integration) |

### Actions
- **Deleted:** none.
- **Merged (2 → 1):** removal-service `deletes the owned asset and runtime files and never touches…` and `marks every runtime file as an owned runtime-state deletion` (same arrangement) → one test asserting the exact `[path, kind, owner]` list.
- **Rewritten (10 runner tests):** the merged removal test asserted `arrayContaining`, so dropping the manifest or config deletion survived; its fixture now holds manifest and config snapshots (the change plan drops deletions of absent files) and the list is exact. The modified-asset test asserted `conflicts.some`; it now asserts the exact changes (runtime only, so a `hasConflicts` mutant that deletes the manifest is killed), the conflict, and the generic finding (`harness: null`, impact), the only killer of that `createRemovalFinding` branch. The three `resolveHarnessExclusion` tests became one `it.each` asserting `{ excluded, selection }` (the no-flag row asserted only `excluded`). `hasSameHarnesses(['cursor'], [])` became `([], ['cursor'])`: with a non-empty left, dropping the length check still returned `false`. The four summary tests became one `it.each` asserting the exact summary instead of `toContain`/`toMatch`.
- **Created:** none.
- **Kept (11):** the four detection tests, `feeds detection…`, `writes, keeps, or omits…`, and `removal-conflicts.test.ts` (5) unchanged. Its service test is not redundant with `integration/remove-invalid-config.test.ts`: that file never asserts `finding.harness`.
- **Moved:** `tests/unit/removal-conflicts.test.ts` → `tests/integration/removal-conflicts.test.ts`.

The `.gitignore` fixture in `removal-service.test.ts` carries the pre-prd-17 `# CONTEXTBRAKE:START` markers, which `planGitIgnore` does not recognize, so it stays a plain user file; removing the managed block on `remove` belongs to module 41 (`remove-gitignore`).

### Production pending items
- `planConfigChange` accepts `string | ConfigChangeInput` plus two positional parameters, but its only caller (`installation-service.ts` 73) passes the object: the string overload and its `typeof` ternaries could go.

### Questions `[?]`
- None.

## 18. harness/registration — done 2026-10-10

**Baseline:** 38 runner tests across the 6 files, green (the plan's 27 was the grep count). Stryker: n/a (Common).
**Result:** 32 tests across the same 6 files, green. Scoped coverage proxy (`registry.ts`, `common/hook-event-cleanup.ts`, `common/runtime-assets.ts`, `common/*-hooks-updater.ts`, `*/planner*.ts`): identical before and after (lines 83.11%, branches 73.44%; `registry.ts` 100%, `hook-event-cleanup.ts` 100% lines and 91.17% branches). The remaining gaps are defensive: `hook-event-cleanup.ts` 7 and 26-27 (non-object item, missing event node), `runtime-assets.ts` 21-24. The partial planner and hooks-updater rows (legacy migration, invalid config) belong to module 43 (`harness/config-preservation`) and module 17's `removal-conflicts`. Commit `0a79ac8`.

Layout: all six files import `src/infrastructure/` and moved from `tests/unit/` to `tests/integration/` with `git mv` before any rewrite (decision 3). Names are kept because the prd-01 and prd-02 tasks and code reviews cite them. None is in `tests/test-lanes.ts` (`test-lanes.test.ts` green after the move). The module 9 carry-forward TC-02 (exact support level, capability states and limitation text for all 8 harnesses) is unchanged at `tests/integration/harness-adapters.test.ts`.

### registry.ts → Common (lookup table plus `getDescriptor`)

| Behavior | Mutant | Test |
|---|---|---|
| the eight harnesses register in descriptor order | descriptor removed or reordered; `getAllAdapters` `map` → `[]` | `registers the eight harnesses in descriptor order` |
| each id builds its own adapter with its benchmark event and the 100/15 ms target | `createAdapter` swapped; fixture event or target changed | `builds each adapter with its benchmark event and overhead target` |
| unknown id throws | `throw` removed | `throws on unknown harness descriptor lookup` |

### Adapter capability profiles → Common (TC-02, prd-01)

| Behavior | Mutant | Test |
|---|---|---|
| exact support level, capability states and limitation text per harness | any state, level or limitation literal changed | `matches the approved table for %s` (8 rows, FR-02, FR-04, CA-15) |

### Adapter planners → Common (harness config changes, mandated area)

| Behavior | Mutant | Test |
|---|---|---|
| clean project: install and remove plan for each harness without conflicts | planner returns a conflict, another harness id, or an empty plan | `plans install and remove on a clean project without conflicts for every harness` |
| a new event registers once across three installs (recovery: the second and third plans are equal) | merge appends instead of replacing | `registers each new event once after three installs (TC-26, DEC-13)` |
| each process harness installs its own built hook | wrong asset name | `installs the process hook built for %s` (5 rows) |
| exact hook set and command form per process harness; no pre-tool hook | command form changed; event added or dropped (a re-added `PreToolUse` fails) | `registers exactly the post-tool, session-start, and new-event hooks for $name` (4 rows, RF5, DEC-12, DEC-13, TC-26) |
| a legacy relative Claude command is replaced and diagnoses clean | legacy entry kept beside the new one | `replaces the relative Claude Code command left by an earlier install…` (RF5) |
| Antigravity events sit under the `context-brake` key | key or event list changed | `registers the Antigravity events under the context-brake key (DEC-14, TC-34)` |
| user hooks survive three merges byte for byte | merge rewrites user entries or is not idempotent | `merges ContextBrake hooks three times idempotently while preserving user hooks` (UT-04, CA-05) |

### common/hook-event-cleanup.ts → Common

Unchanged (7 tests): each case kills its own mutant: last entry drops the event (`remaining === 0`), a foreign entry keeps it, a mixed group keeps its foreign handler (`every` → `some`), events without an owned entry and empty user arrays stay (the `isOwnedHere` guard), current events stay (`!currentEvents.includes`), `removeOwnedFromEvent` removes repeated entries (`removeRepeatedly`), and a document without `hooks` stays as is.

### Actions
- **Deleted:** none.
- **Merged (2 → 1):** registry `registers all eight harness descriptors immutably` and `returns all adapters via getAllAdapters` → one exact ordered id list. The first only checked set membership; the second only checked the count.
- **Merged (2 → 1):** planners `generates valid install plan…` and `generates valid remove plan…` (same clean-project arrangement) → one test per adapter that asserts the conflicts list equals `[]`.
- **Merged and rewritten (8 → 4 rows):** the eight per-event `hook-registration-paths` tests (Claude, Codex, Cursor and Copilot post-tool events and their `Stop`/`preCompact`) → one `it.each` per harness that asserts the whole `hooks` object. This also pins the `SessionStart`/`sessionStart` registrations no test asserted, and an extra event, such as a pre-tool hook, now fails. The legacy-command test asserted `toContain('${CLAUDE_PROJECT_DIR}')`; it now asserts the exact group.
- **Created:** none.
- **Kept (25 runner tests):** TC-02 (8), the registry benchmark-fixture test (`integration/benchmark-fixtures.test.ts` parses the payloads but never asserts `event` or `targetMilliseconds`), the unknown-id test, TC-26, the hook assets (5), Antigravity, UT-04, and `hook-event-cleanup` (7).
- **Moved:** the six files `tests/unit/` → `tests/integration/`.

### Production pending items
- None.

### Questions `[?]`
- None.

## 19. claude/statusline-planner — done 2026-10-10

**Baseline:** 47 runner tests across the 5 files, green (the plan's 29 was the grep count). Stryker: n/a (Common).
**Result:** 38 tests across 5 files, green. Scoped coverage proxy (`statusline-context-window.ts`, `statusline-default.ts`, `statusline-payload.ts`, `statusline-settings.ts`, `statusline-state.ts`, `statusline-shell.ts`): identical before and after (lines 86.28%, branches 94.54%, functions 80.64%). The uncovered lines belong to other modules: `statusline-default.ts` 13-26 (opt-out record, `integration/statusline-default.test.ts`, module 33), `statusline-context-window.ts` 40-48 (`lastRecordedShell`, doctor shell diagnostics, module 20), `statusline-settings.ts` 31-33 and 41-42 (unreadable settings and `statuslineOf`, the planner and diagnostics paths), `statusline-shell.ts` 32-34 (the real `stat` host, `integration/statusline-bridge-previous.test.ts`). Commit `95c72b4`.

Layout: all five files import `src/infrastructure/harnesses/claude-code/` and moved from `tests/unit/` to `tests/integration/` with `git mv` before any rewrite (decision 3). `statusline-context-window`, `statusline-payload` and `statusline-planner` keep their names because the prd-02.2 tasks cite them. Two names were taken in `tests/integration/` (module 33's process-lane `statusline-shell.test.ts` and its `statusline-default.test.ts`), so these moved as `statusline-shell-resolution.test.ts` (prd-10 TC-03) and `statusline-default-conflicts.test.ts` (prd-09 CR-01). None of the five is in `tests/test-lanes.ts` (`test-lanes.test.ts` green after the move). `statusline-planner.test.ts` tests `statusline-settings.ts` and `statusline-state.ts`, not `statusline-planner.ts`; the name stays for the same traceability reason. Module 6 carry-forward: `falls back to the ceiling when no ledger has a window` is unchanged, now at `tests/integration/statusline-context-window.test.ts`.

Mandated scenario (user file changes): these sources only read the Claude settings. The writer is `statusline-planner.ts`, and the byte-for-byte and second-run assertions are `integration/statusline-install.test.ts` TC-12 (`wraps the local status line, stays unchanged on reruns, and restores the file byte for byte`) and `integration/statusline-default.test.ts` (`…plans no change on the next one`, malformed local file left untouched), module 33. Both ran green as related suites.

### statusline-context-window.ts → Common (`readClaudeContextWindow`)

| Behavior | Mutant | Test |
|---|---|---|
| no state file → bridge `absent`; no ledger → ceiling | `state === null` guard removed; `source` ternary swapped | `reports an absent bridge and the ceiling without state or ledgers` |
| state matches the local command → `installed`; newest ledger wins | `===` → `!==`; sort comparator reversed | `reports an installed bridge and the window of the most recently modified ledger` |
| local command differs → `inactive` | ternary returns `installed` always | `reports an inactive bridge when the local command differs` |
| a newer ledger without a window is skipped | `windowTokens !== null` check removed (returns the first ledger) | `skips a newer ledger without a window… (codereview_01/OI-01)` |
| ledgers without any window fall back to the ceiling | loop result or `source` mapping changed for ledgers present but empty | `falls back to the ceiling when no ledger has a window` (module 6 relies on it) |

### statusline-default.ts → Common (`softenDefaultConflict`, prd-09 CR-01)

| Behavior | Mutant | Test |
|---|---|---|
| unsupported-path conflict → warning, conflicts cleared | code ternary swapped; `conflicts: []` dropped | `turns the unsupported-path conflict into a warning…` |
| unparseable settings → exact `STATUSLINE_SETTINGS_INVALID` finding | message, impact, remediation or code changed | `turns an unparseable settings conflict into a STATUSLINE_SETTINGS_INVALID warning…` |
| a plan without conflicts passes through, so its bridge changes survive | `length === 0` guard removed | `returns a plan without conflicts unchanged` |

### statusline-payload.ts → Common (harness input, FR-03, NFR-02)

| Behavior | Mutant | Test |
|---|---|---|
| documented payload maps to the session key and the four values | any field mapping or `agentId` changed | `maps the documented example…` |
| invalid values map to null | `current_usage === null` guard removed; `> 0` → `>= 0`; `isSafeInteger` removed; `<= 100` removed | `maps %s to null` (4 rows: null `current_usage`, zero input tokens, fractional window, percentage above 100) |
| missing window and model do not throw | `?? {}` or `?.` removed | `maps a missing context window and model to null values` |
| model id length limit | length check removed | `maps a model id longer than 200 characters to null` |
| no record without a session or for a non-object window | `!result.success`, `=== undefined` or `=== ''` guard removed | `returns no record for %s` (3 rows) |

### statusline-settings.ts and statusline-state.ts → Common (prd-02.2 TC-10, TC-11, DEC-07)

| Behavior | Mutant | Test |
|---|---|---|
| precedence local → project → user, skipping the bridge and non-command values | loop order or first match changed; `!isBridgeStatusline` removed; `type` or `trim` check removed | `picks $name` (3 rows: local over project and user; project when local is the bridge; user when local and project are not command objects) |
| no command anywhere → none | final `return null` changed | `returns none when no scope has a command status line` |
| only numeric `padding`/`refreshInterval` are copied | filter removed; `?? {}` removed | `copies padding and refreshInterval and ignores other keys and non-numbers` |
| bridge command is the quoted script with no shell operator (prd-10 TC-01) | operator or `--pipe` re-added | `is only the quoted bridge script…` |
| roots with `"`, `$`, backtick or a backslash are refused, also after POSIX conversion | a character dropped from the class; `toCommandRoot` converts on a POSIX separator | `refuses the POSIX root %s` (4 rows) |
| a Windows root with spaces and accents becomes forward slashes and is quoted | separator ternary inverted; split/join removed | `converts a Windows root with spaces and accents to forward slashes and quotes it` |
| state file round-trips and invalid content reads as absent | `try` removed; `strictObject` → `object`; version literal changed; parse always returns null | `round-trips through serialization`, `treats %s as absent` (3 rows) |

### statusline-shell.ts → Common (`resolveStatuslineShell`, prd-10 TC-03, DEC-02)

Unchanged (5 tests): each covers a TC-03 case and kills its own mutant: the platform check, the `EXEPATH` candidate, the `SHELL` then `CLAUDE_CODE_GIT_BASH_PATH` order, the `MSYSTEM` guard with the PowerShell encoding, and the `isFile` and `bash.exe` basename checks.

### Actions
- **Deleted (9 runner tests):**
  - payload `maps input tokens to null for negative total input tokens`: the zero row kills `> 0` → `>= 0`; the negative row only adds `> 0` → `!== 0`.
  - payload `…non-numeric total input tokens`: `typeof` and `isSafeInteger` each reject the string alone, so removing either still returns null; the fractional-window row kills the `isSafeInteger` removal.
  - payload `maps a zero window to null`: same `positiveInteger` as the zero-input-tokens row; the call-site mutant (raw `context_window_size`) is killed by the fractional-window row.
  - payload `maps a null percentage to null`: kills nothing (`null >= 0 && null <= 100` is true in JS, and a raw pass-through is null too). The percentage boundaries 0 and 100 get no test: `usedPercentage` only reaches the fallback status line text and the ledger schema.
  - payload `returns no record for null`: the `non-object context window` row kills the same `!result.success` guard removal.
  - settings `picks project when local is absent` and `picks user when only user has one`: the fall-through to project and to user is killed by the `local is the bridge` and `not command objects` rows; TC-10's local, project, user and none scopes stay covered.
  - settings `quotes a root with spaces and accents`: the Windows test asserts `bridgeCommand` on `D:/Meus Projetos/ação`; its title now carries the spaces and accents (TC-11).
  - settings `keeps a POSIX root unchanged`: with no backslash in the root, no mutant of the separator ternary changes the result. The backslash row of `refuses the POSIX root %s` now goes through `toCommandRoot(root, '/')`, which kills "always convert" (it would turn `re\po` into an accepted `re/po`) and keeps the POSIX branch covered.
- **Merged (2 `it.each` → 1):** the payload input-token table and the window/percentage table → one `maps %s to null` table with the field per row.
- **Rewritten (1):** `refuses the root %s` → `refuses the POSIX root %s` through `toCommandRoot`.
- **Created:** none.
- **Kept (38):** context window (5), default conflicts (3), payload example, missing window, model length, null table (4) and no-record table (3), settings and state (15), shell (5).
- **Moved:** the five files `tests/unit/` → `tests/integration/`, two renamed (above).

### Production pending items
- None.

### Questions `[?]`
- None.

## 20. claude/statusline-diagnostics — done 2026-10-10

**Baseline:** 15 runner tests across the 3 files, green (the junction tests ran; none skipped). Stryker: n/a (Common).
**Result:** 11 tests across 3 files, green. Scoped coverage proxy (`statusline-diagnostics.ts`, `statusline-context-window.ts`): lines 84.95% → 84.95%, branches 88% → 88.23%, functions 78.57% → 78.57%; `statusline-diagnostics.ts` stays at 100% lines (branches 91.66% → 91.89%). `statusline-context-window.ts` shows 63.82% because this module only runs `lastRecordedShell` (40-48); lines 15-18 and 25-38 are module 19's `readClaudeContextWindow`. The three uncovered branches of `statusline-diagnostics.ts` get no test: line 50 (a command without a quoted script) and line 71 (`resolveChangeTarget` failure) are defensive guards, and line 62 (`new NodeProcessRunner()` without an injected runner) starts a real `git`, which belongs to the process lane. Commit `3cbea23`.

Layout: all three files import `src/infrastructure/harnesses/claude-code/` and moved from `tests/unit/` to `tests/integration/` with `git mv` before any rewrite (decision 3). No name collision in `tests/integration/`, none of the three is in `tests/test-lanes.ts` (`test-lanes.test.ts` green after the move), and the names stay because prd-02.2 TC-16 and prd-10 TC-06 cite `statusline-diagnostics.test.ts` (their TechSpec rows still say `tests/unit/`). The three files are not merged: together they exceed the 100-line limit, and each has its own arrangement (installed bridge, recorded shells, linked `.claude`). The symlink tests already follow `tests.md` Platforms through `requireLink` (skip with the reason locally, fail in CI).

### statusline-diagnostics.ts → Common (`diagnoseStatusline`, prd-02.2 FR-07, DEC-10, TC-16; prd-10 FR-04, FR-05, DEC-05, DEC-06, TC-06; codereview_01/CR-02)

Doctor findings are human-facing warnings (`tests.md`: less depth); the plan covers each finding's trigger and its quiet case, not the wording.

| Behavior | Mutant | Test |
|---|---|---|
| a healthy install reports nothing, with the previous command recorded from the project, the local file, or the user | any trigger condition inverted; the `local` or `user` candidate dropped from `currentPreviousCommand`; user read before project | `reports nothing for a healthy install with the $scope status line recorded at install` (3 rows) |
| no state file → no findings, even with git reporting the file as tracked | `raw === null` guard removed | `reports nothing when the bridge was never installed` |
| unparseable state → only `STATUSLINE_STATE_INVALID` | `state === null` guard removed or returns `[]` | `warns about a state file that does not parse` |
| inactive bridge, missing script, changed previous command and tracked local file each give a warning with remediation, in order (TC-16) | any `&& FINDING` → `false`; `exitCode === 1` → `!== 1`; `severity`, `harness` or the remediation changed in `finding()` | `gives the inactive bridge, missing script, changed previous command, and tracked local file a warning with remediation` |
| the PRD-09 pipeline command → `STATUSLINE_BRIDGE_OUTDATED` (TC-06) | `includes(' --pipe \| ')` → `false` | `flags the pipeline command of PRD-09 as outdated` |
| a PowerShell run on Windows → `STATUSLINE_POWERSHELL_FALLBACK` with the Git Bash remediation | platform or shell check inverted; finding dropped | `warns on Windows after a bridge run through PowerShell` |
| quiet without a run, when the latest run used Git Bash, and outside Windows | `return null` → `'powershell'` in `lastRecordedShell`; `shells.at(-1)` → `at(0)`; platform check removed | `stays quiet without a recorded run, when the latest run used Git Bash, and outside Windows` |
| a linked `.claude` checks the link path and the real target, and reports the target (CR-02) | `localSettingsPaths` returns only the link path; the reported path is the link | `warns when the link path is ignored but the real target is not` |
| a plain `.claude` checks only the local path | `targetPath === LOCAL` ternary always returns both paths | `checks only the local path when .claude is a plain directory` |

### Actions
- **Deleted (1):** symlink `reports nothing when both the link path and the real target are ignored`: every mutant that would make it report a finding (tracked filter → `() => true`, `=== 1` → `!== 1`, a broken link lookup) also fails `reports nothing for a healthy install…` or the exact `toEqual` of `warns when the link path is ignored but the real target is not`, which already proves no other finding appears through the link.
- **Merged (5 → 1, TC-16):** `warns when the local status line no longer runs the bridge`, `warns when the bridge script is missing at the recorded root`, `warns when the project status line changed after install`, `warns when git reports the local settings as not ignored` and `gives every warning a remediation` → one test that sets all four conditions, which is the TC-16 row as the TechSpec writes it. Each standalone's `&& FINDING` → `false` mutant fails the merged test's exact code list, and each `!==` → `===` mutant already fails the healthy-install rows; the old remediation test covered three of the four warnings.
- **Rewritten (2 → 1 `it.each` of 3 rows):** `reports nothing for a healthy install` and `warns when the user status line now takes precedence`. The user test killed no mutant: dropping the user candidate still gives `null !== 'project.sh'`, so it warned either way. The rows now record the previous command from the project (with a user status line present in the home, which kills reading user before project), from `previousLocal` (kills dropping the local candidate, the TC-12 install of a wrapped local status line) and from the user (kills dropping the user candidate or the user home).
- **Rewritten (1):** `stays quiet after a Git Bash run…` now records a PowerShell run followed by a Git Bash run, which also kills `shells.at(-1)` → `at(0)`; `recordShell` takes several shells. No new test.
- **Created:** none (the two new healthy rows replace the user test; net +1 runner row against 5 tests removed).
- **Kept (6):** `reports nothing when the bridge was never installed`, `warns about a state file that does not parse`, the shell file's `flags the pipeline command of PRD-09 as outdated` (TC-06; `integration/statusline-install.test.ts` TC-05 also asserts the code end to end, but TC-06 names this unit file) and `warns on Windows after a bridge run through PowerShell` (deterministic on every OS; `integration/statusline-bridge-lifecycle.test.ts` TC-07 asserts it only on win32), the symlink `warns when the link path…` and `checks only the local path…`.
- **Moved:** the three files `tests/unit/` → `tests/integration/`.

### Production pending items
- None. Observation: prd-02.2 `task_04.md` says the tracked-file check is "skipped without a runner"; the code falls back to `new NodeProcessRunner()` (line 62), so without an injected runner it runs a real `git check-ignore` instead of skipping. Likely a later, intended change (the other git checks in `init-flow.ts` do the same); the task text, not the code, looks stale.

### Questions `[?]`
- None.

## 21. runtime/claude-codex — done 2026-10-10

**Baseline:** 31 runner tests across the 5 files, green. Stryker: n/a (Common).
**Result:** 29 tests across 5 files, green. Scoped coverage proxy (`claude-code/runtime.ts`, `claude-code/transcript-usage.ts`, `codex-cli/runtime.ts`, `codex-cli/rollout-usage.ts`): lines 95.89% → 95.89%, branches 87.38% → 88.39%, functions 82.6% → 82.6%; the uncovered lines are the same before and after (Claude `runtime.ts` branches 88% → 87.75% is a v8 branch-count shift with identical uncovered lines; Codex `runtime.ts` branches 87.5% → 90%). Left uncovered: Claude 31-32 and Codex 38-39 are `toolOf` fallthroughs of the unread tool classification (see Production pending items); 85-86 and 92-93 are the `run*Hook` process entrypoints (process lane, e2e smoke); `transcript-usage.ts:25` and `rollout-usage.ts:29` belong to the module 30 reader suites. Commit `727ce01`.

Layout: all five files import `src/infrastructure/harnesses/` and moved from `tests/unit/` to `tests/integration/` with `git mv` before any rewrite (decision 3). `tests/unit/runtime-codex.test.ts` collides with the built-hook suite `tests/integration/runtime-codex.test.ts` (module 30), so it moved as **`tests/integration/runtime-codex-events.test.ts`** (it tests event mapping and rendering, not the hook). The other names stay: prd-02 TC-10 cites `claude-runtime-session-key.test.ts` and prd-02.1 TC-17 cites `runtime-claude.test.ts` (their TechSpec rows still say `tests/unit/`). None of the five is in `tests/test-lanes.ts` (`test-lanes.test.ts` green after the move). The identical `MemoryLedger`/`MemoryErrors` fakes of the two `-measured` files moved to `tests/helpers/recording-ledger.ts` (`RecordingLedger`, `RecordingErrors`); the `MemoryLedger` of `delegated-fixtures.ts` records nothing, so it could not be reused.

Key finding: no production code reads `RuntimeEvent.tool` (`category`, `paths`, `command`, `skill`). `brake-engine.ts` uses only `session` and `toolUseId`, and a search for `file_read|file_write|'shell'|category` in `src/` outside the adapters hits only the type. The classification tests carry no behavior mutant; they stay as the only coverage of that code (brief, dead-code rule), with no new rows for the uncovered fallthroughs.

### claude-code/runtime.ts → Common (prd-02 RF3, RF4, RF12, RF14, RF22, TC-10, TC-14, TC-21, TC-33; prd-02.1 FR-04, FR-05, DEC-08, NFR-02, TC-17; prd-12 TC-09)

| Behavior | Mutant | Test |
|---|---|---|
| PostToolUse → `post_tool` with session, tool_use_id and observed characters; PreToolUse → null (TC-09) | `case 'PostToolUse'` removed; `tool_use_id ?? null` → `null`; one `characterLength` term dropped | `maps the documented PostToolUse fixture with its tool_use_id, counts its input and response characters, and ignores PreToolUse` |
| tool classification; an invalid payload throws for the host's neutral fallback | category branches (unread output); `parsePayload` guard removed | `classifies every documented file tool and tolerates unknown fields` |
| SessionStart startup/fork → `new`, clear, compact (RF3) | each `source ===` operand removed; `reason: source` → literal | `maps a SessionStart with source %s to a %s reset` (4 rows) |
| resume never resets; unknown events ignored | `return null` → a reset | `never resets on a resumed session and ignores unknown events` |
| Stop → `response_end` with the message (RF22) | `case 'Stop'` removed; `?? ''` text changed | `maps the documented Stop fixture to the response text` |
| context → `hookSpecificOutput`, notice → `systemMessage`, neutral → nothing (RF14, RF17) | `kind === 'context'` → `true`; notify branch removed; field names changed | `renders context in hookSpecificOutput, the reset notice as systemMessage, and nothing for a neutral decision` |
| main-thread transcript usage reaches the block and the ledger as `measured` (TC-17) | `measuredUsage` call removed; `tokens` dropped | `reports the measured transcript usage in the post-tool block and the ledger tool line` |
| a subagent keeps the estimate (DEC-08) | `agent_id === undefined` → `true` | `keeps the estimate for a subagent payload even with a transcript path` |
| missing transcript → estimate, no error record (FR-05) | `usage === null` guard removed (throws, then logs) | `keeps the estimate without logging when the transcript is missing` |
| transcript I/O failure → logged `UNEXPECTED`, estimate, neutral (failure policy, NFR-02, NFR-03) | `recordRuntimeFailure` removed; `catch` removed | `records a transcript I/O failure in the runtime error log and keeps the estimate` |
| lifecycle events read no transcript | `eventName !== 'PostToolUse'` guard removed | `reads no transcript for lifecycle events` |
| subagent calls counted in their own ledger (TC-10, CA-08) | `agentId: payload.agent_id ?? null` → `null` | `counts subagent calls in their own ledger and leaves the main session untouched` |

### codex-cli/runtime.ts → Common (prd-02 RF1, RF3, RF12, RF14, RF22, DEC-12, DEC-13, TC-14, TC-21, TC-33)

| Behavior | Mutant | Test |
|---|---|---|
| PostToolUse fixture → `post_tool` with tool_use_id; PreToolUse → null | as Claude | `maps the documented PostToolUse fixture and classifies Bash as a shell call` |
| apply_patch paths (unread output) | prefix list or `trim` changed | `parses the patch paths of an apply_patch call` |
| observed characters; PreToolUse input empty | a `characterLength` term dropped; event guard removed | `counts the documented tool input and output characters` |
| SessionStart startup → `new`, clear, compact; resume and fork never reset | each `source ===` operand removed; a `fork` operand added | `maps a SessionStart with source %s to a %s reset` (3 rows), `never resets on a resumed or forked session` |
| Stop → `response_end` | `case 'Stop'` removed | `maps the documented Stop fixture to the response text` |
| rendering | as Claude | `renders context in hookSpecificOutput, the reset notice as systemMessage, and nothing for a neutral decision` |
| rollout tokens and model window reach the ledger (`windowOrigin: 'harness'`) | `contextWindow: usage.contextWindow` → `null` | `reports the rollout tokens and model window in the ledger tool line` |
| subagent, null path, rollout without info → estimate, no error record | `agent_id === undefined` → `true`; `z.nullable` dropped from the schema; `usage === null` guard removed | `keeps the estimate without logging for %s` (3 rows) |
| rollout I/O failure → logged, estimate, neutral (failure policy) | `recordRuntimeFailure` or `catch` removed | `records a rollout I/O failure in the runtime error log and keeps the estimate` |

### transcript-usage.ts, rollout-usage.ts → Common, covered by module 30
`claude-transcript-usage.test.ts` and `codex-rollout-usage.test.ts` own the reader rules; this module only runs the readers through the adapters.

### Actions
- **Deleted (4):** Claude `renders the reset notice as systemMessage and stays silent otherwise` (its `systemMessage` assertion moved into the single render test; its neutral `PreToolUse`/`SessionStart` → null assertions are replaced by neutral on `PostToolUse`, which also kills `kind === 'context'` → `true`; `reset-notice.test.ts` asserts the Stop channel too). Codex `ignores the declared window once the rollout reports the model window`: it kills no adapter mutant beyond the window passthrough of `reports the rollout tokens…`; Codex `context_usage` is `unknown`, so the declared window is ignored by capability, which `window-origin.test.ts` asserts in `uses the harness window when one is reported` and `ignores the declared window when context_usage is unknown`. Codex `reads no rollout for lifecycle events`: same event guard as the `PreToolUse` assertion of `counts the documented tool input and output characters`. Codex estimate row `a missing transcript path`: same `usage === null` mutant as the `rollout without token_count info` row; the reader's missing path is `codex-rollout-usage.test.ts` `returns null for a missing path`.
- **Merged (2 → 1):** Claude `maps the documented PostToolUse fixture … ignores PreToolUse` and `maps the documented PostToolUse fixture with its tool_use_id and tool_response` → one test with an exact `toEqual` of the event (now including `toolUseId`) and of the input.
- **Rewritten (4):** the observed-character assertions recomputed `JSON.stringify(...).length` from the fixture (anti-catalog); they now assert the literals 208 (Claude, as `toEqual({ observedCharacters: 208 })`, which also proves no measurement for a missing transcript) and 77 (Codex). Codex `maps the documented PostToolUse fixture and Stop fixture` kept only its Stop half (the PostToolUse half repeated the first test) and moved to the lifecycle `describe`. The Claude and Codex render tests assert context, notice and neutral on `PostToolUse` in one test each.
- **Created (+3 runner rows, 1 test → 4):** Codex `resets on startup, clear, and compact but not on resume` became a 3-row `it.each` plus `never resets on a resumed or forked session`: `startup` → `new` and `clear` had no Codex test in any suite (`integration/runtime-codex.test.ts` resets only on `compact`), and a missed reset leaves a stale turn count; the `fork` assertion pins the documented difference from Claude without a new test.
- **Kept:** the classification tests (only coverage of the unread code), Claude's SessionStart `it.each` (4 rows), resume/unknown and Stop tests, the five Claude measured tests, the Codex fixture, patch and character tests, Codex `reports the rollout tokens…`, the subagent and null-path rows, the Codex I/O failure test, and `claude-runtime-session-key.test.ts` (TC-10, unchanged; `integration/runtime-parallel-turns.test.ts` covers subagent ledgers through built hooks, but TC-10 names this file).
- **Moved:** the five files `tests/unit/` → `tests/integration/`; `runtime-codex.test.ts` renamed `runtime-codex-events.test.ts`. **Added helper:** `tests/helpers/recording-ledger.ts`.

Mandated rows: the failure policy is the two I/O failure tests (neutral decision, recorded error, estimate) plus the invalid-payload throw that the process host turns into a neutral response (module 37). The exact telemetry block and its 60-token budget are asserted by `telemetry-block.test.ts` and `telemetry-block-budget.test.ts` (module 34); the adapters only transport `decision.block`, so the measured test keeps its `toContain('tokens=194431/128000 source=measured')`.

### Production pending items
- `ToolCall` (`category`, `paths`, `command`, `skill`) is filled by every adapter's `toolOf` (Claude `WRITE_TOOLS`/`SKILL_TOOL`, Codex `patchPaths`, and the Cursor, Copilot, Antigravity, OpenCode, Pi and Oh-My-Pi adapters) but no service reads it since prd-12 removed the tool-call deny and the plan/checkpoint. Remove the classification together with its tests (`classifies every documented file tool…`, `parses the patch paths…`, and the `tool` fields in the fixture assertions), or record why it stays.

### Questions `[?]`
- None.

## 22. runtime/process-harnesses — done 2026-10-10

**Baseline:** 30 runner tests across the 5 files, green (the table's 26 was the grep count). Stryker: n/a (Common).
**Result:** 15 tests across 5 files, green. Scoped coverage proxy (`antigravity-cli/runtime.ts`, `github-copilot-cli/runtime.ts`, `cursor/runtime.ts`, `common/runtime-assets.ts`, and the five process `schemas.ts`): Cursor `runtime.ts` unchanged (95.65% lines, 83.33% branches); Copilot `runtime.ts` lines 93.33% → 93.33%, branches 73.91% → 75%; `runtime-assets.ts` and the Antigravity, Copilot and Cursor `schemas.ts` 100% → 100%. Antigravity `runtime.ts` drops 91.66%/82.35% → 87.5%/75% in the module-only run because lines 46-47 (`renderAntigravityDecision` → null for Stop) are now asserted only by `reset-notice.test.ts:84`; with that suite in the run it is back to 91.66%/82.35%. `claude-code/schemas.ts` and `codex-cli/schemas.ts` read 0% in the module-only run because no file of this module imports them any more; they are 100% with module 21's `runtime-claude`/`runtime-codex-events` suites loaded (include-list artifact, not a loss: a `schemas.ts` of `export const x = z.looseObject(...)` is covered on import, not on `.parse()`). Left uncovered, same as before: Antigravity 21-22 and Copilot 33-34 are `toolOf` fallthroughs of the unread tool classification (module 21 pending item); Antigravity 58-59, Copilot 72-73 and Cursor 56-57 are the `run*Hook` process entrypoints (e2e smoke). Commit `5c08cc7`.

Layout: all five files import `src/infrastructure/harnesses/` and moved from `tests/unit/` to `tests/integration/` with `git mv` before any rewrite (decision 3). The three runtime files collide with the built-hook suites of module 30, so they moved as **`runtime-antigravity-events.test.ts`**, **`runtime-copilot-events.test.ts`** and **`runtime-cursor-events.test.ts`** (module 21's `runtime-codex-events` convention). `runtime-assets.test.ts` and `harness-schemas-process.test.ts` keep their names (prd-01.1 TC-01 and `tasks.md` cite the latter; the TechSpec row still says `tests/unit/`). None of the five is in `tests/test-lanes.ts` (`test-lanes.test.ts` green after the move). `tests/helpers/recording-ledger.ts` was not needed: these adapters read no measured usage.

### antigravity-cli/runtime.ts → Common (prd-02 RF1, RF12, RF14, RF17, DEC-13, DEC-14, TC-14, TC-33)

| Behavior | Mutant | Test |
|---|---|---|
| PostToolUse fixture → `post_tool` without a call id; PreInvocation → `pre_invocation`; PreToolUse and Stop unmapped (prd-12 TC-09) | `case 'PostToolUse'`/`'PreInvocation'` removed; session field changed | `maps the documented PostToolUse and PreInvocation fixtures, ignores PreToolUse, and does not map Stop…` |
| `run_command` classification (unread output) | category branch | same test (exact `toEqual`) |
| observed characters are the `toolCall.args` length | `characterLength` term dropped | `counts the documented toolCall args characters` (literal 28) |
| PostToolUse answers `{}`, PreInvocation `injectSteps` with the block or empty (DEC-14) | `eventName === 'PostToolUse'` → `false`; `kind === 'context'` → `true` | `answers PostToolUse with an empty object and PreInvocation with injectSteps` |

### github-copilot-cli/runtime.ts → Common (prd-02 RF3, RF12, RF14, RF17, DEC-13, TC-14, TC-33)

| Behavior | Mutant | Test |
|---|---|---|
| postToolUse fixture → `post_tool`; preToolUse unmapped | `case 'postToolUse'` removed | `maps the captured postToolUse fixture and classifies the documented shell and path tools` |
| shell/read/write classification (unread output) | `SHELL_TOOLS`/`WRITE_TOOLS`/`READ_TOOLS` entries | same test |
| observed characters are `toolArgs` plus `textResultForLlm` | a term dropped; `textResultForLlm` lookup removed (counts the whole object) | `counts the documented toolArgs and toolResult text characters` (literal 161) |
| sessionStart `startup`/`new` → `new`, `resume` → none; preCompact → `compact` | each `source ===` operand removed; `case 'preCompact'` removed | `resets on startup, new, and preCompact but not on resume` |
| context → `additionalContext`, never `modifiedResult`; neutral → nothing (RF14) | field name changed; `kind === 'context'` → `true` | `renders additionalContext without ever touching the tool result` |

### cursor/runtime.ts → Common (prd-02 RF3, RF12, RF14, RF17, DEC-13, TC-14, TC-33)

| Behavior | Mutant | Test |
|---|---|---|
| Shell classification, other tools `other` (unread output); preToolUse unmapped | `name === 'Shell'` branch | `keeps undocumented file tools unclassified and classifies Shell from its command` |
| postToolUse carries `tool_use_id` | `tool_use_id ?? null` → `null` | `maps the documented postToolUse fixture with its call identifier` |
| sessionStart → `new` keyed by `session_id` or `conversation_id` (`harness-integrations.md`: the sessionStart example uses `session_id`); preCompact → `compact`; others ignored | `session_id ??` removed (a `session_id`-only payload throws, the reset is lost); case removed | `resets on sessionStart, keyed by session_id or conversation_id, and on preCompact…` |
| observed characters are `tool_input` plus `tool_output` | a term dropped | `counts tool_input and tool_output characters on post-tool events` (literal 41) |
| context → `additional_context` on postToolUse; neutral → nothing | field name changed; `kind === 'context'` → `true` | `injects telemetry through additional_context and stays silent for a neutral decision` |

The sessionStart branch of `renderCursorDecision` (resume text through `additional_context`) is killed by `semi-auto-restart.test.ts` (`cursor delivers a pending handoff once…`).

### common/runtime-assets.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| a named asset is read from the runtime asset folder | `return await readFile(...)` → `''`; candidate list emptied | `loads a built process hook asset by name` |
| a missing asset fails with its name | `throw` removed (returns `undefined`) | `throws when asset does not exist` (exact message) |

Candidate order (`dist` before `assets`) has no test: no test environment tells the candidates apart, and prd-01 `codereview_05/task_18` scoped the lookup order out.

### Process `schemas.ts` (five harnesses) → Trivial

Declarative `z.looseObject` constants. The payload schemas are live through each adapter's `parsePayload`; their non-strictness (`looseObject` → `strictObject`) is killed by the runtime fixture tests, whose fixtures carry undeclared vendor fields (Antigravity `hookName`, Copilot `timestamp`/`cwd`, Cursor `hook_event_name`, the Claude/Codex fixtures of module 21), and by `benchmark-fixtures.test.ts`. The hooks-file, settings and response schemas have no production caller (see Production pending items). Only TC-01 stays.

| Behavior | Mutant | Test |
|---|---|---|
| documented Antigravity names `toolCall.name`/`args` parse and undeclared vendor fields pass through (prd-01.1 FR-06, TC-01) | `toolCall` shape renamed; `looseObject` → `object` (strips `hookName`) | `parses the documented Antigravity PostToolUse fixture with toolCall.name/args (FR-06, TC-01)` |

### Actions
- **Deleted (12 runner tests, plus 3 merged away):**
  - `runtime-assets` (7): the 4 other rows of `loads the %s process hook asset`, and `loads OpenCode plugin runtime asset`, `loads Pi extension runtime asset`, `loads Oh-My-Pi extension runtime asset`. All kill the same `return readFile` mutant as the kept test; that each built asset exists and works is asserted by `package-assets.test.ts` (`$asset answers $event…` runs each of the five process hooks; `loads in-process plugins and extensions as callable functions` imports the three in-process assets).
  - `harness-schemas-process` (5): `parses Claude Code settings and hook payloads non-strictly`, `rejects Claude Code hook-specific output without the matching hookEventName`, `parses Codex CLI hooks and payloads non-strictly`, `parses Cursor hooks and payloads non-strictly`, `parses Copilot CLI hooks and Antigravity hooks non-strictly`. Their payload assertions are made redundant by the runtime fixture tests (module 21's `runtime-claude`/`runtime-codex-events` and this module's three `-events` files map the same fields from fixtures with undeclared vendor fields); the Codex, Cursor and Copilot inputs carried no extra field, so they did not test non-strictness (one used a lone `toBeDefined()`); the rest asserts dead schemas (`claudeSettingsSchema`, `claudePostToolUseResponseSchema`, the four hooks-file schemas), which stay 100% covered on import, so deleting their tests does not lower the coverage gate.
- **Merged (5 → 2):** Antigravity `maps the documented PostToolUse fixture and classifies run_command…` + the PreInvocation half of `maps PostToolUse to a turn without a call identifier and PreInvocation to a context event` (its PostToolUse half repeated the exact `toEqual`) + `does not map Stop because the event carries no assistant text` → one test. Copilot `maps the captured postToolUse fixture and classifies both documented shell tools` + `classifies edit, create, and view tools from their path field` → one test (same unread classification).
- **Rewritten (8):** the three character-count tests recomputed `JSON.stringify(...).length` from the fixture (anti-catalog) and now assert `toEqual({ observedCharacters: 28 | 161 | 41 })`; Copilot's count test also dropped its `kind`/`toolUseId` assertions (repeated by the fixture test). The three render tests dropped `notify_user → null`, asserted for all three adapters by `reset-notice.test.ts` `delivers the notice on the Claude Code and Codex CLI Stop channels only`; the Copilot one also dropped `not.toContain('modifiedResult')`, implied by its exact `toEqual` and asserted end to end by `integration/runtime-copilot.test.ts:34`. `git` records `runtime-assets` and `harness-schemas-process` as delete + add (the rewrite dropped them below rename similarity); they were moved with `git mv` first. TC-01 asserted `stepIdx` passthrough, but `stepIdx` is now a declared field; it asserts the undeclared `hookName` instead, which is what TC-01's "extra vendor fields" requires. The missing-asset test asserts the full message.
- **Created (0 tests, 2 assertions):** Copilot `source: 'startup'` → `new`, folded into the existing reset test (its title claimed startup, but no suite sent it; a missed reset leaves a stale turn count). Cursor `session_id`-only sessionStart, folded into the existing reset test (documented; every suite sends `conversation_id`, and the simulator sends both with the same value, so the `??` survived).
- **Kept:** the Antigravity render test, the Copilot reset and render tests, the Cursor fixture, Shell, count and render tests, and the classification assertions as the only coverage of the unread `RuntimeEvent.tool` (Antigravity `run_command`, Copilot shell/edit/view, Cursor Shell/ReadFile).
- **Moved:** the five files `tests/unit/` → `tests/integration/`; the three runtime files renamed `runtime-<harness>-events.test.ts`.

Mandated rows: the failure policy for these adapters is `parsePayload`/`requireIdentifier` → `PayloadInvalidError` → the process host's neutral response, asserted end to end by `package-assets.test.ts` (Antigravity malformed stdin → `{}`) and owned by modules 31 and 37. The exact telemetry block and its 60-token budget are module 34; the adapters only transport `decision.block`, so these tests assert the transport field with a placeholder block.

### Production pending items
- Extend module 21's `ToolCall` item with this module's symbols: Antigravity `toolOf`, Copilot `toolOf`/`READ_TOOLS`/`WRITE_TOOLS`/`SHELL_TOOLS`, Cursor `toolOf`, and their test assertions (the `tool` fields of the three fixture tests and the Copilot path assertions).
- Dead schema exports with no production caller: `claudeSettingsSchema`, `claudeHookGroupSchema`, `claudeHookItemSchema`, `claudePostToolUseResponseSchema`, `codexHooksFileSchema`, `codexHookGroupSchema`, `codexHookItemSchema`, `cursorHooksFileSchema`, `cursorHookCommandSchema`, `copilotHooksFileSchema`, `copilotHookItemSchema`, `antigravityHooksFileSchema`, `antigravityHookEntrySchema`. The `*PostToolUsePayloadSchema` and `antigravityPreInvocationPayloadSchema` aliases are used only by `benchmark-fixtures.test.ts`. Remove them (no test is left to remove with them), or record why they stay.
- `runtime-assets.ts:20` keeps a comment in an empty `catch` (`code-standards.md`; prd-01 `codereview_05` CR-06).

### Questions `[?]`
- None.

## 23. runtime/in-process-harnesses — done 2026-10-10

**Baseline:** 30 runner tests across the 6 files, green. Stryker: n/a (Common).
**Result:** 19 tests across 6 files, green. Scoped coverage proxy (the `runtime.ts`, `events.ts` and `schemas.ts` of `oh-my-pi`, `pi` and `opencode`, plus `common/in-process-support.ts`), lines/branches: Oh-My-Pi `runtime.ts` 73.77%/64.28% → 77.04%/80%, Pi `runtime.ts` 72.88%/73.33% → 76.27%/87.5%, OpenCode `runtime.ts` 91.66%/73.68% → 100%/85.71% (the `eventOf`/`handleAfter`/`handleEvent` catches are now asserted); Oh-My-Pi `events.ts` branches 74.07% → 75%; Pi and OpenCode `events.ts`, `in-process-support.ts` and the three `schemas.ts` unchanged (schemas 100%, covered on import). Left uncovered, same as before: Oh-My-Pi `events.ts` 17-31 (read classification and `assistantText`, which serves the `message_end` case and `restart.ts`; module 29), Pi `events.ts` 18-19 (`toolOf` fallthrough) and 34-37 (`lastAssistantText`, `restart.ts`; module 29), OpenCode `events.ts` 17-18 (`toolOf` fallthrough), both `runtime.ts` 57-71 (`before_agent_start` boot and the stop notice: `reset-notice.test.ts`, `runtime-in-process.test.ts`, module 29), `in-process-support.ts` 40-41/52-55 (in-process failure resolution: `in-process-runtime.test.ts`). Commit `6cdfe1f`.

Layout: all six files import `src/infrastructure/harnesses/` and moved from `tests/unit/` to `tests/integration/` with `git mv` before any rewrite (decision 3). No name collides in `tests/integration/`, so the names stay (prd-01.1 TC-01 and prd-02 TC-11 rows still say `tests/unit/`). None is in `tests/test-lanes.ts` (`test-lanes.test.ts` green after the move). The duplicated `registration`/`context`/`runToolResult`/`lastToolLine` of the two usage files moved to **`tests/helpers/in-process-extension.ts`** (`registerExtension`, `extensionContext`, `toolResultBlock`, `lastToolLine`); `recording-ledger.ts` was not needed (these tests read the real `NodeSessionLedger`).

### oh-my-pi/events.ts, pi/events.ts → Common (prd-02 RF1, RF3, RF12, RF14, RF17, TC-14, TC-33)

| Behavior | Mutant | Test |
|---|---|---|
| tool_result fixture → `post_tool` with call id; observed characters are `input` + `content` (literal 61) | `toolCallId ?? null` → `null`; a `characterLength` term dropped | `maps the documented tool_result fixture with its call identifier and character count, and classifies…` |
| shell/file classification (unread output) | `SHELL_TOOLS`/`WRITE_TOOLS`/`READ_TOOLS` entries | same test |
| session_start `new`/`startup` → `new`, `resume` none; compaction → `compact`; stop text (OMP `session_stop`, Pi assistant `message_end` only) | each `reason ===` operand removed; a case removed; `role === 'assistant'` → `true` | `maps session_start, both compaction events, and session_stop` / `maps session_start, session_compact, and message_end` |
| invalid payload throws (the extension turns it into no answer); unknown events ignored | `parsePayload` guard removed; `default` returns an event | `rejects an invalid payload and ignores unknown events` |
| render keeps the original parts and appends one text part (TC-14, RF14) | spread dropped; block part dropped | `appends exactly one text part after the original content parts` |

### oh-my-pi/runtime.ts, pi/runtime.ts → Common (prd-02 RF5-RF8, TC-11; PRD 2.2 DEC-06; failure policy)

| Behavior | Mutant | Test |
|---|---|---|
| measured API usage reaches the block and the ledger; a window change applies on the next reading (TC-11) | `measured: measuredOf(context)` → `undefined`; `contextWindow` passthrough changed | `reports source=measured with the API tokens and window, and takes a window change into effect…` |
| no usage → estimate over the configured window; Pi `tokens: null` → estimate over the API window (DEC-06); an invalid payload returns nothing | `measuredUsageFrom` window guard removed; `eventOf` `try/catch` removed (the handler rejects into the harness) | `falls back to estimated … and answers an invalid payload with nothing` |
| compaction resets the turn count | `recordBoot` registration removed | `resets the count on auto_compaction_end` / `on session_compact` |

### opencode/events.ts, opencode/runtime.ts → Common (prd-02 RF1, RF3, RF14, DEC-13, TC-33; prd-12 FR-07, TC-09; failure policy)

| Behavior | Mutant | Test |
|---|---|---|
| fixture → `post_tool` with `callID`; observed characters are `output.args` (literal 22); undocumented input fields tolerated | `callID ?? null` → `null`; `looseObject` → `strictObject` on the input schema | `maps the documented tool.execute.after fixture, counts output.args characters, and tolerates undocumented input fields` |
| `session.created`/`session.compacted` map with their session id; other events ignored | type guard inverted; an id lookup dropped | `maps session.created and session.compacted events` |
| no pre-tool hook; one turn per call; reset on compacted and created; invalid payloads ignored | `tool.execute.before` registered; `runInProcessEvent` call removed; either `catch` removed | `registers no pre-tool hook, counts one turn per completed call, resets…, and ignores invalid payloads` |

### Pi and Oh-My-Pi `schemas.ts` → Trivial, OpenCode `schemas.ts` → Trivial

| Behavior | Mutant | Test |
|---|---|---|
| documented `toolName`/`toolCallId`/`input` parse and the undeclared `extraField` passes through (prd-01.1 FR-06, TC-01) | a field renamed; `looseObject` → `object` | `parses the $harness tool-result fixture with toolName/toolCallId/input and extra vendor fields (FR-06, TC-01)` (2 rows) |

### Actions
- **Deleted (5 runner tests, plus 6 merged away):**
  - `harness-schemas-in-process` (5): `parses OpenCode config and tool hook payloads non-strictly`, `parses Pi settings and event payloads non-strictly`, `parses Oh-My-Pi settings and event payloads non-strictly` (dead exports `opencodeConfigFileSchema`, `piSettingsFileSchema`, `ompSettingsFileSchema`, plus test-only aliases; their inputs carried no vendor field except Pi's `extra: true`, whose passthrough the TC-01 rows now assert; the three schema files stay 100% covered on import), `parses the Pi message-end and Oh-My-Pi session-stop fixtures` (mapped with exact text by `runtime-pi`/`runtime-omp`), `parses the documented session.created and session.compacted event shapes` (same fixtures and ids asserted by `runtime-opencode` `maps session.created and session.compacted events`).
  - `runtime-opencode` `keeps the partial profile and no new-session command`: `reset-notice.test.ts` `declares the documented new-session command only where one is documented` asserts `openCodeDescriptor.newSessionCommand` null; `harness-adapters.test.ts` asserts the OpenCode `partial` profile with all four capabilities unsupported (prd-12 TC-11 names those files; prd-02 RF21's evidence is `brake-mode`/`doctor-brake-sessions`).
- **Merged (11 → 5):** Oh-My-Pi and Pi `maps tool_result fixtures and classifies…` + `maps the documented tool_result fixture and counts…` → one fixture test each with an exact `toEqual` of the event (OMP's `tool_call → null` dropped: same `default` mutant as `before_agent_start`). OpenCode `maps the documented tool.execute.after fixture…` + `tolerates undocumented and unknown payload fields` → one test; `exposes tool.execute.after and an event handler, and no pre-tool hook (prd-12 FR-07, TC-09)` folded into the lifecycle test, which invokes both hooks (identifiers carried to its `describe`). Each usage file's `reports source=measured…` + `takes a reported window change into effect…` → one test (the window test's first reading was the measured one; Pi's lone `toBeDefined()` dropped). `harness-schemas-in-process` `parses the Pi tool-result fixture with its documented fields` → the 2-row TC-01 `it.each` (adds Oh-My-Pi and the `extraField` half of TC-01).
- **Rewritten (3):** the three character counts recomputed `JSON.stringify(...).length` (anti-catalog) and now assert the literals 61, 61 and 22.
- **Created (0 tests, 5 assertions):** Oh-My-Pi `session_start` `startup` → `new` (documented in `harness-integrations.md`; only Pi asserted it, so OMP's `reason === 'startup'` operand survived). Invalid-payload assertions folded into the two estimated tests and the OpenCode lifecycle (`tool.execute.after` and `event`): the adapter-edge `try/catch` (failure policy, "a hook never ends with an uncaught exception") was uncovered in this module and in every related suite.
- **Kept:** the session, invalid/unknown and render tests of both `runtime-pi`/`runtime-omp`, OpenCode `maps session.created and session.compacted events`, both reset tests, and the classification assertions as the only coverage of the unread `RuntimeEvent.tool`.
- **Moved:** the six files `tests/unit/` → `tests/integration/`. **Added helper:** `tests/helpers/in-process-extension.ts`.

Mandated rows: the failure policy is the invalid-payload assertions above (adapter edge) plus `in-process-runtime.test.ts` (invalid configuration in GREEN and CRITICAL, module 37 owns the host). The exact telemetry block and its 60-token budget are module 34; the adapters only transport `decision.block`, so the usage tests keep `toContain('tokens=… source=…')` (module 21 precedent) while the render tests assert the exact content parts and the stop texts are exact.

### Production pending items
- Extend module 21's `ToolCall` item with the Oh-My-Pi, Pi and OpenCode `toolOf`/`SHELL_TOOLS`/`WRITE_TOOLS`/`READ_TOOLS` and their classification assertions.
- Dead schema exports with no production caller: `ompSettingsFileSchema`, `piSettingsFileSchema`, `opencodeConfigFileSchema`, `opencodeToolExecuteAfterPayloadSchema`, and the aliases `ompToolResultPayloadSchema`, `ompSessionStartPayloadSchema`, `ompSessionCompactPayloadSchema`, `ompSessionStopPayloadSchema`, `piToolResultPayloadSchema`, `piSessionStartPayloadSchema`, `piSessionCompactPayloadSchema`, `piMessageEndPayloadSchema` (the `*ToolResult*`/`ToolExecuteAfter` ones are used only by `benchmark-fixtures.test.ts`). Remove them (no test is left to remove with them), or record why they stay.
- `mapOmpEvent` has a `message_end` case, but `createOmpExtension` registers no `message_end` handler (Oh-My-Pi stops through `session_stop`), so the case is unreachable in production.
- The `eventOf` (Pi, Oh-My-Pi) and `handleAfter`/`handleEvent` (OpenCode) catches return nothing without recording the failure in `errors.jsonl`, unlike the process hosts (`harness-adapters.md`, Failure Policy: "records the error").

### Questions `[?]`
- None.

## 24. integration/init-install — done 2026-10-10

**Baseline:** 47 runner tests across the 10 files, green. Stryker: n/a (Glue).
**Result:** 37 tests across 9 files, green. Scoped coverage proxy (`commands/init.ts`, `init-flow.ts`, `detection-collector.ts`, `confirmation.ts`, `terminal.ts`, `commands/remove.ts`, `assistant/assistant-session.ts`, `installation-service.ts`, `installation-adapters.ts`, `installation-findings.ts`, `asset-currency.ts`, the eight harness `detector.ts`): lines 85.94% → 85.94%; branches 82.05% → 81.44%. The one branch lost is `terminal.ts` `assertTerminalForAssistant` with `--interactive` on a terminal (90%), run without an assertion by the deleted `lets --interactive pass the gate on a terminal`; `unit/terminal.test.ts` `accepts a terminal and ignores runs without --interactive (FR-01, TC-04)` asserts it. The `asset-currency.ts` branch delta (75% → 75.67%) is v8 block accounting; its uncovered lines are the same before and after. Left uncovered, same as before: `confirmation.ts` 14-20 (the readline TTY prompt, unreachable in process), `detection-collector.ts` 17-18 (`probeVersion` catch, defensive), `remove.ts` 23-25/30/54-56 (invalid-config and exclusion removal: modules 25 and 32), the Antigravity detector (module 43). Commits `7b97ba9` (deletion of `multi-harness-install` only; `git add` failed on the already-staged path) and `42bafe3`.

Every source is Glue reached through `init`/`remove`/`doctor` in process (`runInProcessCli`, `runAssisted`); the decisions sit in units cleaned in modules 2, 3, 15, 17 and 18. Each file keeps one test per business flow. `detection-cross-signals` calls the real adapters' `detect` (infrastructure integration, kept as such). No file is in `tests/test-lanes.ts`; no file was renamed (prd-13 TechSpec and task_03 cite these names).

### Flows → Glue

| Flow | Mutant (wiring) | Test |
|---|---|---|
| Claude install: config, hook asset, `PostToolUse` only, user hook kept, manifest records the running version; runs 2 and 3 change no byte; CLAUDE.md untouched (mandated user-file row, Claude settings family) | `packageVersion` not passed to `planInstallation`; owned span rewritten on re-init; instruction file planned | `installs Claude Code with the running package version, keeps the user hook and CLAUDE.md, and changes no byte on two more runs (CA-01, CA-05, FR-07, TC-02)` |
| a symlinked instruction file keeps its link and target | link replaced by a file | `preserves a symbolic link target (CA-07)` |
| Codex and Cursor installed together, user hooks kept verbatim, second run changes no byte (mandated row, Codex/Cursor hooks family) | one adapter dropped from `activeHarnesses`; user entry rewritten; non-idempotent merge | `installs Codex and Cursor together, keeps their user hooks, and changes no byte on a second run` (E2E-02, CA-02, IT-02) |
| no project harness → exit 1, `NO_PROJECT_HARNESS`, no config | `NO_PROJECT_HARNESS` finding dropped; plan written anyway | `exits with warning when no harness detected` (E2E-03) |
| an invalid harness file is a conflict for that harness only: exit 2, peers installed, the file byte-unchanged | conflict blocks every adapter; invalid file rewritten | `yields partial installation on invalid adapter input` (E2E-05, RF7) |
| dry run writes nothing and plans the same paths the applied run writes | `args.dryRun` branch removed; dry-run plan built differently | `matches changes between dry-run and applied run` (E2E-06, CA-11) |
| `init` writes no protocol, instruction or `.gitignore` file outside Git; `remove` deletes assets, config and runtime, keeps user files | protocol asset re-added; runtime directory kept by `remove` | `installs no protocol file, instruction block, or gitignore change, then remove deletes…` (E2E-07) |
| `remove --remove-state` is an argument error (exit 64, `INVALID_ARGUMENTS`; module 1 relies on it) | `strict` parse relaxed | `rejects the removed --remove-state flag` |
| `doctor --json` follows the published schema after an install | report shape drift | `validates against published schema` (E2E-08, prd-02.2 TC-18) |
| no adapter reports project evidence for `AGENTS.md`, `.agents/`, or a user-home config; `.claude` + CLAUDE.md is Claude Code only | a detector treats generic files or home files as project evidence | `reports no project evidence for a generic .agents directory, AGENTS.md, or a user home configuration`, `detects each harness independently…` (IT-16, RF1) |
| `--interactive` without a terminal: exit 64, message, nothing written; plain non-TTY `init` still needs `--yes` | `assertTerminalForAssistant` call removed; `authorizeWrite` bypassed | `refuses --interactive without a terminal…` (TC-05), `still fails with CONFIRMATION_REQUIRED…` (FR-08, TC-05) |
| `--yes`, `--json` and configuration flags keep the assistant away on a terminal (module 3 relies on these rows) | `shouldRunAssistant` operand removed | `never prompts or prints the summary when %j is given (TC-12)` (5 rows) |
| assistant cancel at the first, a middle and the confirmation prompt, or a declined confirmation: exit 0, `Nothing was written.`, tree unchanged | `assisted === null` guard; `printNothingWritten` on decline; `YES_ANSWER` accepting `n` | `ending input at %s writes nothing… (FR-07, TC-11)` (4 rows; TechSpec TC-11 names the three prompts) |
| one confirmation after the summary; assistant dry run shows the plan without confirming or writing | preview rendered twice; `--dry-run` not carried by `resolveAssistedArgs` | `asks the confirmation exactly once…`, `shows the plan and writes nothing with --dry-run…` |
| the printed command reproduces the assistant session (12 scenarios, prd-16 TC-10, prd-17 TC-08, CR-01 T01.3) and the dry-run plan | flag omitted or misquoted in `formatEquivalentCommand`; summary differs from the replay | `$name: same files as the replayed command and no further change (TC-10)` (12 rows), `prints the same plan the replay computes before it writes` |

### Actions
- **Deleted (5):**
  - `multi-harness-install.test.ts` (3): `IT-02: installs Codex and Cursor together without conflict` asserted two planner calls returned no conflicts; `init-install` E2E-02 installs both through `init` (exit 0, both in `activeHarnesses`) and now carries IT-02. `IT-03: explicit Copilot exclusion leaves only Cursor` is a pure `detectHarnesses` call: `unit/detection-service.test.ts` (the `excluded` row) and `unit/harness-exclusion.test.ts` (`[['cursor','project'],['opencode','excluded']]`) assert the same rule (module 17). `IT-04: malformed harness config isolates conflict` is the planner-level copy of `init-plan` E2E-05 (same RF7 flow at the CLI edge: exit 2, peer installed, invalid file byte-unchanged); `INVALID_HARNESS_CONFIG` is asserted in ten other files (among them `change-plan-service`, `minified-config`, `statusline-install-invalid`). The prd-01 code reviews cite this file for RF7; E2E-05 is the test now.
  - `init-interactive-gate` `reports the parse-time conflict in the JSON error document (FR-01, TC-05)`: the conflict is `unit/init-max-restarts-arguments.test.ts` `rejects --interactive with %s naming both flags (FR-01, TC-03)`; the JSON error document for a parse error is `main.ts` `handleParseError`, asserted by `init-remove-footprint` `rejects the removed --remove-state flag` and `statusline-install.test.ts`. TC-05 stays on the two remaining gate tests.
  - `init-interactive-gate` `lets --interactive pass the gate on a terminal (FR-01, TC-05)`: its only assertion was `stderr` not containing the message; `unit/terminal.test.ts` asserts accept-on-terminal and `--interactive` forcing the assistant (TC-04), and `init-assistant-exclusion.test.ts` (TC-09) runs `--interactive` on a terminal through `init`.
- **Merged (6 → 3):**
  - `init-install` `installs Claude non-interactively` (E2E-01, CA-01) + `records the running package version in the manifest (FR-07, TC-02)` + `init-detection` `preserves byte idempotency over 3 runs` (E2E-04) + `init-idempotency` `preserves idempotency over 3 runs (CA-05)` → one test in `init-idempotency.test.ts` (all identifiers kept in the title or `describe`). It keeps E2E-04's byte comparison after each re-run (extended to the manifest and the hook asset), CA-05's user hook and CLAUDE.md checks, and the manifest version. The stdout `full support` wording is `e2e/e2e-init.test.ts` and `unit/cli-output-text.test.ts`.
  - `init-remove-footprint` `installs no protocol file…` + `deletes the manifest assets…` → one test (same fixture; the second already ran `init` first).
  - `detection-cross-signals` `avoids false positive on generic .agents directory and AGENTS.md` + `classifies user home configurations as machine evidence, not project` → one test with both seeds (either mistake adds a harness to the empty list).
- **Rewritten (1):** E2E-02 now seeds the Codex and Cursor `user-hooks.json` fixtures, asserts the exact `activeHarnesses` instead of two `toContain` on stdout and config, and checks the user hook lines verbatim and a byte-identical second run (the mandated user-file row for that family; it had none in this module). 0 new tests.
- **Kept:** `init-assistant-cancel` (6; the middle-prompt row is unit-killed by `assistant-questions-invalid` TC-07 but TechSpec TC-11 names it), `init-assistant-equivalence` (13; module 3 relies on TC-10), the 5 TC-12 rows, E2E-03, E2E-05, E2E-06, E2E-08, `--remove-state`, CA-07, IT-16 `detects each harness independently…`.
- **Helper:** `tests/helpers/cli-fixtures.ts` lost `testIdempotency` (no caller left); `testClaudeInstall` (`cli-shells`) and `testSymlinkTarget` stay.

### Production pending items
- None.

### Notes for later modules
- Module 6's note that `multi-harness-install` and `init-idempotency` run `protectModifiedAssets` (`asset-currency.ts` 77-79, 82-84) does not hold: those lines are uncovered by this module before and after, and `multi-harness-install` never ran the CLI. The `MODIFIED_OWNED_ASSET` assertions are `integration/asset-currency-lifecycle.test.ts` (module 32) and `integration/doctor-asset-currency.test.ts` (module 6); module 32 must keep one.
- `init-assistant-equivalence` is still the slowest file of this module (~8-9 s, 12 scenarios × 5 runs); its rows are spec-named (prd-16 TC-10, prd-17 TC-08, prd-16 CR-01).

### Questions `[?]`
- None.

## 25. integration/init-exclusion — done 2026-10-10

**Baseline:** 16 runner tests across the 5 files, green. Stryker: n/a (Glue).
**Result:** 9 tests across the same 5 files, green. Scoped coverage proxy (`init-flow.ts`, `init-config-state.ts`, `installation-service.ts`, `harness-removal.ts`, `harness-exclusion.ts`, `no-harness-finding.ts`, `installation-builder.ts`, `assistant/questions-harness.ts`, `assistant/assistant-session.ts`): lines 98.15% → 98.15%; branches 76.71% → 76.47%. The uncovered line list of every file is identical before and after; the branch deltas (`assistant-session.ts` 88.88% → 85.71%, `questions-harness.ts` 86.84% → 86.48%, `installation-service.ts` 88.09% → 87.8%, `init-flow.ts` 78.26% → 80%) are v8 block accounting from fewer runs. Left uncovered, same as before: `init-config-state.ts` 20-21 (non-ENOENT read error rethrown, defensive), `installation-builder.ts` 73-76 (auto-restart summary wording, module 26), `installation-service.ts` 58/63/80/83-86 (`?? []` fallbacks and the gitignore/restart extras, modules 26 and 41), `harness-removal.ts` 45 (`assetPaths` of a conflicted adapter, asserted by `unit/removal-service.test.ts`, module 17), `no-harness-finding.ts` 10-11 (the plain `No project harness` side is `init-plan` E2E-03, module 24, outside this proxy). Commit `022dcf8`.

Every source is Glue reached through `init` in process (`runInProcessCli`, `runAssisted`); the decisions are unit-tested in `harness-exclusion.test.ts` and `detection-service.test.ts` (module 17) and `assistant-questions.test.ts` (module 2). No file renamed or deleted: the prd-15 TechSpec (TC-11, TC-13 to TC-15), `done/task_05.md`, `done/task_06.md` and `codereview_01` cite all five names. No file is in `tests/test-lanes.ts`.

### Flows → Glue

| Flow | Mutant (wiring) | Test |
|---|---|---|
| deselecting a detected, installed harness in the assistant equals `init --exclude-harness` (same tree) and prints the flag | `HarnessSelection.excluded` not turned into flags; the assistant passes no exclusion to `executeInit` | `removes what an installed harness owns exactly as init --exclude-harness does (FR-05, TC-09)` |
| typed `--exclude-harness` with `--interactive` still lists the detected harness as marked (module 24 relies on it for `--interactive` passing the gate on a terminal) | the assistant reads the typed flags into its defaults | `lists a detected harness as marked even when --exclude-harness was typed with --interactive (FR-05, TC-09)` |
| excluding a never-installed harness persists `excludedHarnesses` and installs only the rest; plain runs keep the config bytes, plan nothing, and report `excluded` | `excluded` not passed to `planInstallation`; `applyExclusion` dropped; `loadInitConfigState` ignores the stored exclusion | `persists the exclusion without installing the harness, and plain runs keep it off and plan nothing (FR-05, FR-06, NFR-01, TC-13)` |
| `--harness` clears a stored exclusion and installs | `include` not subtracted from the stored exclusion | `--harness clears the exclusion and installs the harness (FR-07, TC-14)` |
| both flags for one id: exit 64, nothing written | `validateInclusionExclusion` call removed (falls through to `DetectionSelectionError`, not 64); the only test that reaches it | `rejects the same harness in both flags as an argument error (FR-07, TC-14)` |
| excluding an installed harness: the dry run lists the deletions and writes nothing; apply deletes the asset, restores the user's Codex `hooks.json` byte-for-byte (fixture `user-hooks.json`), drops the harness from config and manifest, leaves Claude untouched; a later run plans nothing (mandated user-file row) | `planExcludedRemovals` filter → every installed adapter; `removals.changes` dropped from the plan; `retained` → every removed harness; owned-entry removal rewrites user entries | `previews the deletions, applies them keeping the user hooks and other harnesses byte-for-byte, and plans nothing on a later run (FR-05, FR-06, NFR-01, TC-11)` |
| unparsable harness file: harness stays active, file untouched, `INVALID_HARNESS_CONFIG`; retried and cleared once fixed | `retained: conflictedHarnesses` dropped; the parse failure rewrites the file | `keeps the harness active and its unparsable file untouched, then removes it on retry (FR-05, TC-15)` |
| a user-modified runtime asset is kept byte-for-byte and reported | `guardModifiedAssets` → always delete; `sha256 !==` inverted | `does not delete a runtime asset the user modified and reports it (FR-05, TC-15)` |
| excluding the only detected harness writes a config-only plan (no asset, no manifest); a later plain run writes nothing, warns `All detected harnesses are excluded…`, exit 1 | `hasExclusionChange` → `false` (no config written); manifest change planned with no install; `noProjectHarnessFinding` fed other detections | `persists the exclusion of the only detected harness on a first run, then a plain run writes nothing and warns that every detected harness is excluded (FR-05, FR-06, NFR-01, TC-15)` |

### Actions
- **Deleted (2):**
  - `init-assistant-exclusion` `plans the same files as init --exclude-harness on a project that has not installed it (FR-05, TC-09)`: the `init-assistant-equivalence` row `Claude Code only with restart on` (TC-10) runs the same seed (`makeProject`), deselects `codex-cli`, checks the printed `--exclude-harness codex-cli`, and compares the tree with the replay; the `excludedHarnesses` write from the typed flag is the TC-13 test. The prd-16 TechSpec TC-09 row names the *installed* case, which stays.
  - `init-exclusion-removal` `a plain init with no exclusion plans no harness deletion (TC-11)`: its mutant (exclusion filter → every installed adapter) is killed by module 24's `init-idempotency` test (runs 2 and 3 change no byte) and by the merged TC-11 test's later run (`plan.changes` is `[]` with Claude still installed).
- **Merged (8 → 3):**
  - `init-exclusion` `persists the exclusion and does not install the harness (FR-05, TC-13)` + `a plain init keeps the harness off and plans nothing, twice (FR-06, NFR-01, TC-13)` → one test (the second repeated the first's run before its own).
  - `init-exclusion-removal` `lists the deletions in a dry run and writes nothing` + `applies the deletions, updates the manifest, and leaves other harnesses alone` + `plans nothing for the harness on later runs (FR-06, NFR-01, TC-11)` → one test (TechSpec TC-11: `--dry-run`, then `--yes`; same fixture).
  - `init-exclusion-edges` `persists the exclusion of the only detected harness on a first run` + `still writes nothing else when nothing changes on the next plain run` + `init-exclusion-conflicts` `warns that every detected harness is excluded when nothing else changes (FR-06, TC-15)` → one test in `init-exclusion-edges.test.ts`. The conflicts test reached the same `emptyResult` (no active harness, no exclusion change, no removal) from a project whose two harnesses had been removed; its finding and exit 1 assertions moved to the later plain run of the edges flow. `doctor-exclusion` asserts the same finding through `doctor-service` (another caller), so the `init` side stays.
- **Rewritten (assertions only, 0 new tests):** the TC-11 flow seeds the Codex `user-hooks.json` fixture and asserts `hooks.json` equals it byte-for-byte after the exclusion (it asserted only `not.toContain('context-brake')` on `{}`), plus the exact `activeHarnesses`/`excludedHarnesses` (unasserted before). The unparsable-file test asserts the broken file is byte-unchanged; the modified-asset test asserts the edited bytes instead of `exists`.
- **Created:** none.
- **Kept (4):** the TC-09 installed case and the `--interactive` display test, both TC-14 tests.

### Production pending items
- None.

### Notes for later modules
- Module 24's note listing `remove.ts` 23-25/30/54-56 under "exclusion removal: module 25" does not hold: `remove.ts` has no exclusion path (`doctor-exclusion` TC-16 runs `remove` after an exclusion, module 6). Those lines are the invalid-config and `remove --dry-run` paths (module 32).
- `init-exclusion-removal.test.ts` resolves its fixture with `import.meta.dirname` (Node 20.11+), the only such use; the suite's convention is the cwd-relative `join('tests/fixtures/harnesses', ...)` (`init-install.test.ts`). Align it when the file is next touched.

### Questions `[?]`
- None.

## 26. integration/init-settings — done 2026-10-10

**Baseline:** 40 runner tests across the 8 files, green. Stryker: n/a (Glue).
**Result:** 17 tests across 7 files, green. Scoped coverage proxy (`init-flow.ts`, `init-config-updates.ts`, `init-config-state.ts`, `handoff-findings.ts`, `installation-builder.ts`, `snapshot-merge.ts`, `debug-mode-merge.ts`, `auto-restart-merge.ts`, `config-legacy-checks.ts`, `restart-install-extras.ts`, `configuration-sanitizer.ts`, `configuration-validator.ts`): lines 98.95% → 96.87%; branches 81.88% → 79.46%. The lines lost (`init-config-state.ts` 20-21, `configuration-sanitizer.ts` 30-31, `configuration-validator.ts` 19-20/34-37) were run by the deleted typo test (unrepairable config); `unit/configuration-sanitizer`, `unit/configuration-validator` and `integration/invalid-config` (module 32) cover all three files at 100% lines (checked with a scoped run). Every other uncovered line is the same before and after (`init-config-updates.ts` 17/22-23/27/32 are the partially taken `if ('error' in merge)` sides; `init-flow.ts` 45-48 is the prompt confirmation, modules 2 and 24). Commit `7653f63`.

Every source is Glue reached through `init`/`doctor`/`remove` in process; the decisions are unit-tested in modules 10 (`configuration-*`, `config-legacy-checks`), 13 (`debug-mode-merge`, `snapshot-merge`), 14/15 (`auto-restart-merge`, `init-max-restarts-arguments`) and 17 (`installation-summary`). Each file keeps one test per business flow. No file is in `tests/test-lanes.ts`; no file renamed. Carry-forward reliances kept: `init-debug-mode` `rejects --debug with --no-debug and writes nothing` (module 1), `init-legacy-turn-limits` TC-20 second run byte-stable (module 10), `init-snapshot` TC-05 writes and re-reads `command` and `resumeCommand` (module 9).

### Flows → Glue

| Flow | Mutant (wiring) | Test |
|---|---|---|
| fresh init: dry run and apply touch only the owned paths, instruction files and `.gitignore` untouched, default `snapshot` `{ triggerZone: 'RED' }`, second run changes nothing (snapshot success and recovery) | default snapshot section dropped; instruction or protocol file planned | `previews and writes only the owned paths with the default trigger zone, then changes nothing on a second run` (prd-12 FR-04, FR-08) |
| TC-05 sequence: commands written; trigger moved alone keeps them; `--no-snapshot-command` clears both and keeps the trigger | `args.snapshot` not passed to `planConfigUpdates`; set replaces instead of merging over the current section | `writes both commands, moves the trigger zone alone keeping them, and clears them keeping the trigger zone` |
| snapshot failure: clear + command, clear + resume, resume without command → exit 64, nothing written | snapshot `throw` in `init-config-updates.ts` removed; `resumeCommand !== undefined` operand dropped (only the second row kills it) | `rejects %j with exit 64 and writes nothing` (3 rows). Boundary (invalid trigger `GREEN`) is `unit/snapshot-merge` `reports an invalid trigger with the section path` |
| debug lifecycle: `--debug` recorded, kept with the snapshot settings on a plain run, removed by `--no-debug`; no instruction file changes | `debug` update not passed to `planConfigChange`; keep path drops the key | `records the debug mode, keeps it and the snapshot settings on a plain run, and removes it with --no-debug…` (FR-06, DEC-07, TC-10) |
| `--debug --no-debug` → 64, nothing written (module 1 relies on it) | debug `throw` removed | `rejects --debug with --no-debug and writes nothing` |
| plan previews `set`/`remove the debug mode` without writing (the only assertion of `DEBUG_SUMMARY`) | `debugPart` dropped from `configSummary` | `previews setting and removing the debug mode only in the configuration and writes nothing` (codereview_01/CR-01) |
| `--auto-restart`: per-harness `AUTO_RESTART_MODE`, restart file, ignore file; second run plans nothing | restart extras not planned; non-idempotent ignore file | `reports the restart mode per harness, installs the restart file and the ignore file, and changes nothing on a second run` (TC-13) |
| `--no-auto-restart`: dry run and apply delete the restart file, ignore file and restart logs; other runtime state and handoffs kept and named | `collectRestartLogSnapshots` skipped; `keptHandoffFindings` not called; runtime directory pruned whole | `previews and applies the deletion of the restart file, ignore file, and restart logs…` (FR-13, DEC-14, TC-14, CR-02) |
| no active harness with a restart mode → 64 with the message | `assertAutoRestartTarget` call removed | `fails with a clear message when no active harness has a restart mode` (TC-13) |
| TC-02 sequence: limit without restart → 64 and no config; 3; 5; 11 → 64 keeping 5 | autoRestart `throw` removed (its only kill at the CLI edge); limit not passed | `rejects a limit while restart is off, writes 3, replaces it with 5, and rejects 11 keeping 5` (FR-09, OBJ-04, TC-02) |
| retired keys: confirmation still required, dry run lists every dropped key and writes nothing, apply writes a valid file with the recognized values, next dry run plans no config change | `dropped` not passed to the summary; tolerant read replaced by the strict read | `asks for confirmation, previews every key to drop without writing, then rewrites…` (FR-02, NFR-01, TC-04, TC-05) |
| doctor names every retired key with the remediation (JSON and text) and still diagnoses the harness; remove proceeds | finding remediation dropped; doctor stops at the config error | `doctor names every key with the fix in JSON and text…` (FR-01, NFR-04, TC-02), `remove proceeds past the keys…` |
| legacy turn limits: doctor reports the retired defaults, dry run writes nothing; apply drops the four fields, second run byte-stable, doctor clean | `normalizeTurnLimits` not applied in `planConfigChange`; legacy check not wired into doctor | `reports the retired defaults in doctor and writes nothing on --dry-run`, `removes the four turn fields keeping the other keys, changes nothing on a second run…` (TC-20, FR-09, US-04) |

### Actions
- **Deleted (6):**
  - `init-snapshot` `installs the bridge by default` and `restores the previous status line with --no-statusline-bridge` (FR-09, TC-13): `statusline-default` `installs the bridge on a plain init…` and `remembers --no-statusline-bridge on later plain inits…` run the same flows; the exact `node "<root>/.claude/hooks/context-brake-statusline.mjs"` command is asserted by `statusline-planner`, `statusline-install` and `statusline-diagnostics-symlink`.
  - `init-snapshot` `does not suggest creating a plan` (codereview_01 CR-02): a negative check on wording no source produces since prd-12 removed `plan init`; no plausible mutant. `says in the text output that only zone headers will be injected`: `unit/installation-summary` row 1 asserts the exact summary (same CR-02 identifier) and module 1 `prints the config summary…` asserts that `init` prints it.
  - `init-config-repair` `does not repair a file whose typo leaves a required key missing` (TC-04): the rule is `unit/configuration-sanitizer` `throws the error of the failing pass when another issue exists`; the CLI wiring (tolerant read throws → exit 2, file untouched) is the same `readTolerant` path as `invalid-config` IT-10 `blocks writes in init and remove with exit code 2…`. TC-04 stays on the merged repair test.
  - `init-max-restarts` `keeps the default of 2 without the flag`: `unit/auto-restart-merge` `applies the update…` asserts `{ kind: 'set' }` → `maxConsecutiveRestarts: 2`; the flag-to-config wiring is the TC-02 sequence.
- **Merged (29 → 12):**
  - `init-snapshot` fresh-repo `writes only…` + `previews the same paths with --dry-run` + `changes nothing on a second run` → one test (same fixture).
  - `init-snapshot` `writes the snapshot and resume commands` + `sets the trigger zone alone` + `clears both commands…` → one TC-05 sequence, as the TechSpec row reads; the trigger-alone-without-command case is also the `init-debug-mode` lifecycle and `unit/snapshot-merge`. `rejects a resume command without a snapshot command…` became the third row of the rejection `it.each` and now also asserts that nothing is written.
  - `init-debug-mode` `succeeds…records the debug mode` + `keeps the snapshot settings and the debug mode already on` + `turns the debug mode off with --no-debug` + `init-debug-mode-disable` `removes the debug key without touching the instruction files` → one lifecycle test. `previews the configuration change…` + `init-debug-mode-disable` `previews the debug removal only in the configuration…` → one preview test (CR-01 kept in the `describe`). `init-debug-mode-disable.test.ts` is deleted; only prd-08 done tasks and codereviews cite it, no TechSpec row.
  - `init-auto-restart` `reports the restart mode…` + `changes nothing on a second run` → one (TC-13 says "twice"); `removes the restart file and the ignore file with --no-auto-restart` + `deletes the restart logs and leaves other runtime state` + `names the kept handoffs…` → one (same seed, now in `seedRestartState`).
  - `init-max-restarts` `writes 3, then replaces it with 5` + `rejects an out-of-range value and a limit while restart is off` → one TC-02 sequence.
  - `init-config-repair` `previews every key to drop…` + `rewrites a valid file…` + `asks for confirmation like any other write…` (TC-05) → one sequence; the confirmation run is its first step.
  - `config-repair-errors` `doctor names every key…in JSON` + `doctor prints the keys and the remediation line in text` (NFR-04) → one test (same fixture).
  - `init-legacy-turn-limits` 4 → 2: `reports the retired defaults…` + `writes nothing on --dry-run` (pre-migration state); `removes the four turn fields…` + `changes nothing on a second run…` (TC-20). Two tests rather than one keep each at three CLI runs or fewer (prd-02.2 recorded this file timing out under full-suite load).
- **Rewritten (assertions only):** the auto-restart target check asserts exit 64 instead of `not.toBe(0)`; the max-restarts `11` step asserts the stored limit stays 5.
- **Created:** none.
- **Kept (5):** `config-repair-errors` `remove proceeds past the keys…`, `init-debug-mode` `rejects --debug with --no-debug…`, `init-auto-restart` `fails with a clear message…` (assertion tightened), and the two `--no-snapshot-command` rows of the snapshot rejection `it.each`.
- **Fixture path (orchestrator, carried into this commit):** `init-exclusion-removal.test.ts` now resolves its fixture with the cwd-relative `join('tests/fixtures/harnesses', ...)` used by the suite instead of `import.meta.dirname`, closing module 25's note.

### Production pending items
- None.

### Notes for later modules
- Module 31: `light-mode-lifecycle` `installs the minimal footprint…` and `accepts --debug and creates no instruction file` repeat the `init-snapshot` footprint and the `init-debug-mode` lifecycle assertions; their hook and doctor parts are their own.
- Module 32: `invalid-config` IT-10 is now the only CLI-edge test of an unrepairable configuration on `init`; keep it.
- Module 33: keep the default-bridge and opt-out-after-install tests of `statusline-default` (see the deletions above).

### Questions `[?]`
- None.

## 27. integration/claude-auto-restart — done 2026-10-10

**Baseline:** 31 runner tests across the 5 files, green. Stryker: n/a (Glue).
**Result:** 23 tests across 5 files, green. Scoped coverage proxy (`claude-code/auto-restart-planner.ts`, `-diagnostics.ts`, `-ownership.ts`, `-settings.ts`, `-files.ts`): lines 98.13% → 98.13%; branches 91.48% → 91.48%. The uncovered lines are the same before and after: defensive `catch` blocks (`auto-restart-diagnostics.ts` 56-57, `auto-restart-ownership.ts` 21-22) and the `INVALID_HARNESS_CONFIG` branch of `settingsBase` (`auto-restart-planner.ts` 55-56; the invalid local settings path is module 33 `statusline-install-invalid`). Commit `f185faa`.

All five sources are Glue reached through `init`/`doctor`/`remove` in process (`statusline-world` and `runInProcessCli`); no unit test covers them and no other test file imports them (`doctor-remove-restart`, `init-auto-restart`, `init-gitignore-lifecycle`, `harness-adapters` reach them only through the CLI and stay green). `planClaudeRemove` calls `planAutoRestart(..., false)`, so `remove` deletes the mod files through the removal service (`assetPaths`) while `init --no-auto-restart` deletes them through `removalChanges`; each path keeps its own edited-file test. No file is in `tests/test-lanes.ts`; no file renamed or moved.

### Flows → Glue

| Flow | Mutant (wiring) | Test |
|---|---|---|
| mandated byte-for-byte: install with a user local settings file holding a comment, second run plans nothing and leaves the tree identical, doctor JSON validates and reports `AUTO_RESTART_NOT_LOADED` with a matching exit code, `remove` restores every file byte for byte | non-idempotent settings merge; comment lost; mod files or keys left after `remove`; doctor finding not wired | lifecycle `installs the mod, changes nothing the second time, reports it, and restores the repository` (FR-07, FR-08, FR-09, TC-17, TC-23, TC-25) |
| install writes the four mod files, both settings keys next to the bridge's `statusLine`, the config block; a second run plans nothing for those paths | `installChanges` dropped; `kept` filter drops the base local change (loses `statusLine`); marketplace path not the real `MOD_ROOT` | planner `writes the marketplace, the plugin files, the two settings keys next to the status line, and the config block, then plans nothing` (TC-17) |
| plain init adds nothing | `wanted = context.autoRestart === true` → `!== false` | planner `leaves the mod files, the settings keys and the config block out` (TC-18) |
| user marketplaces and plugins kept through install and switch-off | `withoutModKeys` removes the whole group; `pruneEmpty` drops a non-empty group | planner `keeps the other marketplaces and plugins through install and removal, byte for byte` (TC-20) |
| bridge opt-out that deletes the bridge-created local file becomes an update carrying the loader keys | `deletesLocal` branch removed (file deleted, mod unloadable) | planner `updates the file with the two loader keys instead of deleting it…` (DEC-08, CR-01) |
| switch-off deletes a local file the install created, and the ownership record | `drop` → `false`; `ownershipRemoval` skipped | planner `leaves no local settings file after %s` (2 rows: remove, opt-out of both; codereview_02 CR-01) |
| switch-off keeps a user-created local file (`{}` or comment only), bridge on/off, remove/opt-out | `owned` → `true`; `isCreatedByBridge` ignoring `createdLocalFile: false`; `isEmptySettings` regex | user-settings `keeps $file with the bridge $bridge after $off` (8 rows; codereview_03 CR-01 repros s3, s4, s6, s8) |
| `init --no-auto-restart` deletes the unedited mod files, keys and config block, keeps an edited mod file and reports `MODIFIED` | `isModified` → `false`; config `autoRestart` not removed | removal `deletes the other mod files, the settings keys and the config block, and keeps an edited mod file and says so` (TC-19) |
| `remove` keeps an edited mod file and reports it | `MOD_FILES` dropped from `assetPaths` in `planClaudeRemove` | removal `keeps a mod file the user edited and reports it` (TC-19) |
| doctor: off, not loaded, outdated by session version, outdated by missing file, Claude too old, ready, last skip ok/warning | each `diagnoseAutoRestart` guard removed or reordered; `!== 'RESTARTED'` → `true`; `startsWith('ERROR_')` severity | doctor 6 tests (FR-08, DEC-10, TC-22) |

### Actions
- **Deleted (5):**
  - lifecycle `keeps the loader keys when the opt-out removes the bridge-created local settings, then changes nothing` (DEC-08, CR-01): planner `updates the file with the two loader keys instead of deleting it, and plans nothing on the next run` runs the same flow and also asserts the change kind is `update`, the exact CR-01 defect.
  - lifecycle `restores the repository, local settings file included, after install and remove` (codereview_02 CR-01): planner `leaves no local settings file after remove` starts from the same no-local-file state and asserts the file and the ownership record are gone; the lifecycle test above proves the full-tree restore.
  - lifecycle `leaves the user file in place after install and remove` (codereview_03 CR-01): identical to user-settings row `keeps 'an empty object' with the bridge 'on' after 'remove'`.
  - removal `takes the mod files and the settings keys back` (TC-19): the lifecycle test's `remove` step restores the tree to its pre-install bytes, which proves the mod files and keys are gone.
  - doctor `validates against the doctor report schema and carries an AUTO_RESTART finding` (TC-23): the lifecycle test parses the same `doctor --json --harness claude-code` output with `doctorReportSchema` and asserts the exact code; TC-23 moved to its `describe`.
- **Merged (6 → 3):**
  - doctor `reports ready without a warning once a session recorded the loaded header` + `adds the last skip code next to ready…` → one sequence on the same log file (RESTARTED alone → `READY` only; then a skip; then an error).
  - planner `writes the marketplace, the plugin files…` + `plans nothing on the second run and keeps the status line bridge` → one TC-17 sequence.
  - removal `deletes the files, the settings keys and the config block` + `leaves an edited mod file in place and says so` → one `--no-auto-restart` sequence (same arrangement; it now also asserts the three unedited files are deleted). R1's `exitCode` 0 assertion was dropped: the merged flow carries the `MODIFIED_OWNED_ASSET` conflict and exits 2; a clean `--no-auto-restart` exit 0 stays asserted at the CLI edge by module 26 `init-auto-restart` (`[applied.code, status]` → `[0, 'success']`).
- **Rewritten (assertions only):** planner TC-20 asserts the seeded local file is restored byte for byte (the TechSpec row says "kept byte for byte"; it compared parsed JSON) and uses a static `writeFile` import; doctor `not loaded` asserts code and severity plus one cause instead of four wording checks (`tests.md`: doctor formatting needs less depth).
- **Created:** none.
- **Kept (18 runner tests):** the lifecycle test (the module's mandated byte-for-byte test; only TC-17/TC-23 added to its `describe`), planner TC-18, CR-01 opt-out and the 2 switch-off rows, removal `remove` edited-file test, doctor off/outdated×2/too-old, and all 8 user-settings rows (each dimension takes a different path: file content → `isEmptySettings`; bridge on/off → base change from the status line planner vs disk read; remove vs opt-out → `deleteFiles=false` with `assetPaths` vs the init `deletesLocal` branch).
- The lifecycle file keeps `FLOW_TIMEOUT_MILLISECONDS = 120_000` from prd-13's budget work; it now runs one flow.

### Production pending items
- None.

### Questions `[?]`
- None.

## 28. integration/claude-mod — done 2026-10-10

**Baseline:** 27 runner tests across the 5 files, green (the table's 26 was the grep count). Stryker: n/a (Glue/Common).
**Result:** 23 tests across 5 files, green. Scoped coverage proxy (`claude-code/mod/*.ts`, `core/services/restart-guards.ts`): lines 217/239 (90.79%) → 229/239 (95.81%); branches 81/93 (87.09%) → 84/97 (86.59%; v8 counts the branches of `onSessionStart`/`recordLoaded` only once they run, so the percentage dips while no covered branch was lost). Remaining gaps: the `catch` blocks of `onSessionStart`, `onTurnStart` and `onPromptSubmit` (`hooks.ts` 13-14, 21-22, 42-43), the JSON `catch` of `parseConfig` (`mod-config.ts` 25-26) and of `readLog` (`mod-log.ts` 21-22): defensive; the `onTurnComplete` catch is asserted by `logs an internal error and lets the turn go on when a read fails`; `host.ts` is type-only. Commit `5d97c75`.

The five files drive the real `register` through the simulated `$` host (`tests/fixtures/claude-mod-host.ts`, `claude-mod-scene.ts`) in process; the bundle test runs esbuild through the `bundleAsset` API. No file holds a `PROCESS_MARKERS` string, none is in `tests/test-lanes.ts`, and no file moved or was renamed (the prd-11 and prd-12 TechSpecs cite all five). The decisions the mod hands to core are unit-tested elsewhere: `decideRestart` in `unit/auto-restart-policy` (module 14), `handleTurnEnd` in `unit/restart-flow` (module 15). `restart-guards.ts` has no unit test; this module (`foldToolCalls`, `resetConsecutive`, `rollbackConsecutive` through the store) and the omp/pi restart suites (module 29) are its coverage.

### register.ts, hooks.ts, mod-log.ts, mod-guards.ts, turn-state.ts → Glue; mod-info.ts → Trivial (except the DEC-10 version pin)

| Behavior | Mutant | Test |
|---|---|---|
| bundle built from the mod entry, exports `register`, no `node:` import or sync file/process API | `ASSET_ENTRIES` path changed; a Node import or `process.env` added to the mod | bundle `is built from the mod entry, exports register, and holds no Node module import…` (NFR-01, DEC-11, TC-15) |
| only events, fields and prompt origins the observed session delivers | a `classic.*` or extra event registered; `PERSON_PROMPT_ORIGINS` drops the observed typed kind | bundle `registers only delivered events and reads only the turn.complete fields…` (DEC-13, TC-16) |
| mod version equals the package version | `MOD_VERSION` not bumped with a release (doctor drift check) | bundle `matches the package version so doctor can detect drift` (DEC-10) |
| `session.start` writes the loaded header doctor reads | `onSessionStart` unwired; `recordLoaded` drops `componentVersion`/`harnessVersion` | gates `writes the mod and Claude Code versions with no record when the session starts` (FR-08, DEC-10) |
| a person's prompt resets the loop counter; the seed prompt does not | `PERSON_PROMPT_ORIGINS.includes(kind)` → `true` / `false` | guards `refuses the third consecutive restart and resumes after a typed prompt`, `does not reset the counter for the seed prompt itself` (FR-04, DEC-06, TC-04) |

### restart-flow.ts, restart-host.ts, restart-facts.ts, mod-config.ts → Common

| Behavior | Mutant | Test |
|---|---|---|
| signal at the end of a turn queues one `clear`, logs `RESTARTED`, reads no plan or checkpoint file | `'clear'` literal; signal path cut | restart `queues exactly one clear for a signal at the end of a turn, with no state file read` (FR-01, DEC-01, DEC-02, TC-09, prd-12 FR-10, TC-03) |
| no signal (or the signal mid-answer) clears nothing | mod `endsWithResetSignal` check → `includes` or removed | restart `does not clear without the signal, whatever the answer says` |
| subagent and non-answer turns are ignored | `reason !== 'answer'` or `agentId !== undefined` removed | restart `ignores subagent turns and turns that did not end with an answer` |
| seed submitted once, only after the queued clear resolves | `submitSeed` called before `.then`; called per settle | restart `submits the seed once, after the queued clear resolves` (FR-02, DEC-03, TC-10, TC-11, prd-12 TC-03) |
| no `autoRestart` block: nothing happens, no log | `config === undefined` return removed | gates `does nothing and writes no log…` (FR-07) |
| tool calls since the seed feed the no-progress guard | `foldToolCalls` unwired; `countToolCall` not called | guards `refuses a signal from a seeded session that made no tool call and accepts it after one` (FR-05, TC-05) |
| env switches stand down; a false-like `DISABLE_AUTO_COMPACT` does not | `=== '0'` changed; `FALSE_ENV_VALUES` or `toLowerCase` dropped | guards `logs %s=%s as %s` (3 rows, FR-06, TC-06) |
| no terminal or desktop surface stands down | `INTERACTIVE_SURFACES` check → `true` | guards `stands down without a terminal or desktop surface` |
| handoff mode: missing, stale, fresh | `exists` guard removed; `turnSnapshot().startedAt` or `mtimeMs` mis-wired; mode ignored | handoff 3 tests (prd-14 FR-04, FR-05, TC-07) |
| failures never break the session: read failure, rejected clear (rollback), rejected seed, store failure after the clear | hook `try/catch` removed; `onRejected` unwired; `submitSeed` catch removed; `Promise.all` → sequential and unguarded | restart 4 failure tests (NFR-04, TC-13, CR-03) |

### Actions
- **Deleted (3):**
  - gates `restarts on the signal with no state file` (prd-12 FR-10, TC-03): same arrangement and `clears` assertion as restart `queues exactly one clear…`; its `task_plan|state_checkpoint` access check moved into that test and the identifiers into its `describe`.
  - gates `seeds with the generic text that does not mention the boot` (prd-12 TC-03): identical assertion (`seeds` → `[seedText()]`) to restart `submits the seed once, after the queued clear resolves`; TC-03 added to that `describe`. The seed wording belongs to `seedText()`, tested in core.
  - restart `submits nothing when the person types /clear themselves` (TC-11): the mod registers no `session.end` handler (bundle TC-16 asserts the exact event list), so the test was a no-signal turn, already restart `does not clear without the signal…`; "only the mod's own clear seeds" (DEC-03) stays asserted by the seed test, which now carries TC-11.
- **Merged (6 → 3):** bundle `is built from the mod entry and exports register` + `contains no Node module import…` → one test on one esbuild build (TC-15); bundle `registers only events the real session delivered…` + `reads only turn.complete fields and prompt origins…` → one TC-16 test on one fixture read; guards `refuses a signal from a seeded session that made no tool call` + `accepts the signal once a tool call happened after the seed` → one TC-05 sequence on the same scene.
- **Rewritten:** the stand-down `it.each` asserts the logged code only (the skip path never reaches `openSession`, `unit/restart-flow`), so a row can expect `RESTARTED`.
- **Created (1 test, 1 row):**
  - gates `writes the mod and Claude Code versions with no record when the session starts`: `onSessionStart`/`recordLoaded` never ran in the module (proxy: `hooks.ts` 9-15, `register.ts` 6-7, `mod-log.ts` 29-33); it writes the header doctor reads for READY vs `AUTO_RESTART_NOT_LOADED`, and module 27 fakes that file.
  - stand-down row `DISABLE_AUTO_COMPACT=False` → `RESTARTED`: kills dropping `FALSE_ENV_VALUES` or `toLowerCase` in `isTruthyEnv`, which would silently disable restarts for a user who sets the variable to false.
- **Kept (16):** bundle DEC-10; gates FR-07; guards loop guard ×2, 2 env rows, surfaces; handoff ×3; restart `queues exactly one clear…`, `does not clear without the signal…`, `ignores subagent turns…`, `submits the seed once…`, and the 4 failure tests.

### Production pending items
- None.

### Questions `[?]`
- None.

## 29. integration/omp-pi-restart — done 2026-10-10

**Baseline:** 28 runner tests across the 7 files, green (the table's 24 was the grep count). Stryker: n/a (Glue/Common).
**Result:** 27 tests across 5 files, green. Scoped coverage proxy (`oh-my-pi/restart.ts`, `pi/restart.ts`, `core/services/restart-guards.ts`, `restart-flow.ts`, `storage/node-handoff-store.ts`, `common/in-process-restart-state.ts`, `-support.ts`, `-log.ts`, `common/restart-asset-plan.ts`): lines 364/408 (89.21%) → 373/408 (91.42%); branches 116/150 (77.33%) → 126/160 (78.75%). Newly covered: `in-process-restart-support.ts` 14-20 and `in-process-restart-log.ts` 38-40 (the loaded header). Remaining gaps: `restart-flow.ts` 18-19, 36-37 (`reportRestart`/`guarded` catches, asserted by claude-mod `logs an internal error…` and `unit/restart-flow`), `restart-guards.ts` 26 (idle early return, defensive), `in-process-restart-state.ts` 54-56 (unreadable config rethrow), the `catch` of each `runRestartCommand` (`newSession` throwing), and `node-handoff-store.ts` claim paths (module 42's suites). Commit `5a33366`.

Pi and Oh-My-Pi share `handleTurnEnd`, `restart-guards.ts`, and `common/in-process-restart-*`; each `restart.ts` wires its own host (stand-down, handoff store, turn start, guard store, open session). The shared flows now run as `it.each` over both harnesses through a uniform `RestartRun` adapter (`tests/helpers/in-process-restart-run.ts`, built by `omp-restart-world.ts` and `pi-restart-world.ts`); the Oh-My-Pi run presses Enter on the prefilled `/context-brake-restart` with the captured `input-interactive.json`. No file is in `tests/test-lanes.ts`. `restart-guards.ts` carry-forward (no unit test): `bumpConsecutive` → every `RESTARTED` row; `rollbackConsecutive` → `rolls the counter back and reports when Pi cancels…` (now at limit 1, so a missing rollback pauses the next restart) and claude-mod `rolls the counter back…`; `markSeeded` and `foldToolCalls` → the guard sequence (`SKIP_NO_PROGRESS`, then `RESTARTED` after a tool call) and claude-mod TC-05; `resetConsecutive` → the typed prompt in the same sequence and claude-mod guards; line 26 stays uncovered (defensive).

### oh-my-pi/restart.ts, pi/restart.ts, common/in-process-restart-*.ts → Glue (integration through the simulated extension API)

| Behavior | Mutant | Test |
|---|---|---|
| session start writes the loaded header doctor reads (READY vs NOT_LOADED) | `session_start` unregistered; `recordRestartLoaded` settings guard inverted | `$harness records the loaded restart module when a session starts (FR-11)` (2 rows) |
| a valid signal opens one new session seeded once (Oh-My-Pi after one Enter) | `newSession` call removed; prefill text changed; seed not sent | `$harness opens one new session seeded once on a valid signal` (2 rows) |
| loop guards: no tool call since the seed skips; the limit pauses; a typed prompt resets; the own seed prompt (Pi `extension` input, Oh-My-Pi Enter on the command) does not | `foldToolCalls`/`countToolCall` unwired; `onOpened` (markSeeded) removed; `source === 'interactive'` (Pi) or `!== COMMAND_TEXT` (Oh-My-Pi) dropped; `resetConsecutive` unwired | `$harness skips a turn without tool calls, stops at the consecutive limit, and resumes after a typed prompt` (2 rows) |
| Oh-My-Pi keeps a person's draft and reports the restart as not carried out | editor check removed; `onRejected` not called | `leaves a busy Oh-My-Pi editor alone…` |
| a cancelled Pi session rolls the counter back and reports | `result.cancelled` check removed; `rollbackConsecutive` removed | `rolls the counter back and reports when Pi cancels the new session` |
| env switch, non-interactive mode, and restart off stand down; restart off writes no log | `standDown` wiring; `mode === 'tui'` → `true`; `settings === undefined` return removed | gates `stands down with CONTEXT_BRAKE_AUTO_RESTART=0` (2 rows), `stands down outside the interactive terminal`, `writes nothing with automatic restart off` |
| handoff mode: missing, stale, fresh | handoff store mis-wired; `agent_start`/`turnStartedAt` unwired (undefined reads as stale, so only the fresh row kills it) | gates `skips without a handoff`, `skips a handoff written before the turn started`, `restarts with a handoff written during the turn` (2 rows each) |

### common/restart-asset-plan.ts (through both planners) → Common

| Behavior | Mutant | Test |
|---|---|---|
| restart file created only with restart on; deleted when turned off or on remove; nothing when absent | `autoRestart === true` → `!== false`; `pathExists` guard removed; a planner drops `planRestartRemoval` | `$harness plans the restart file only with restart on, and deletes it…` (2 rows) |
| an edited restart file is kept with `MODIFIED_OWNED_ASSET` | `isModified` → `false` | `keeps a restart file the person edited and reports the conflict` |

### oh-my-pi/runtime.ts (module 23's source) and the process-harness session start → Glue

| Behavior | Mutant | Test |
|---|---|---|
| `session_switch` after `/new` delivers the pending handoff (DEC-20) | `session_switch` unregistered or `resetOf` drops it | switch `delivers a pending handoff after a session switch…` |
| the captured message-shaped `last_assistant_message` reaches the reset notice | `events.ts:48` reads only a string | switch `reads the final text from a message-shaped last_assistant_message` |
| Codex, Cursor, Copilot deliver a pending handoff once and archive it | a harness's session-start renderer drops the resume text (Cursor's `additional_context` is covered only here) | semi `$harness delivers a pending handoff once and archives it` (3 rows) |
| restart off leaves the handoff pending | composition passes a config with restart on | semi `leaves the handoff pending with automatic restart off (NFR-05)` |

### Actions
- **Deleted (2 rows):** semi `ignores a handoff with automatic restart off (NFR-05)` `cursor` and `github-copilot-cli` rows: the decision is `restartMode(config) !== 'handoff'` in `session-reset-handler.ts`, killed by `unit/session-reset-handler` `neither claims nor injects with automatic restart off (NFR-05)`; the kept codex-cli test checks the real config read end to end and keeps NFR-05.
- **Merged (4 files → 2):** `omp-restart`, `omp-restart-handoff`, `pi-restart`, `pi-restart-handoff` (17 tests) → `in-process-restart.test.ts` (8) and `in-process-restart-gates.test.ts` (10), identifiers kept in the `describe` titles:
  - `prefills the command, and Enter opens a seeded session` + Pi `opens one new session seeded once…` → one 2-row `it.each`.
  - `counts restarts confirmed with Enter toward the consecutive limit` + Pi `stops at the consecutive limit and resumes after a typed prompt` + Pi `does not reset the guard for the seed prompt it sent itself` → one 2-row guard sequence asserting the full code list.
  - both env-switch tests, Pi `stands down outside the interactive terminal`, Pi `does nothing with automatic restart off`, and the six handoff tests → one 10-row gates table.
  - `in-process-restart-plan` `plans the restart file only with automatic restart on` + `deletes an installed restart file…` → one 2-row `it.each` (Oh-My-Pi deletion was not asserted before).
- **Rewritten (1):** Pi `rolls back and reports when Pi cancels…` runs at `maxConsecutiveRestarts: 1`; at 2 the follow-up restart passed without the rollback.
- **Created (2 rows):** `$harness records the loaded restart module when a session starts (FR-11)`: `recordRestartLoaded`/`recordInProcessLoaded` never ran in any suite (`doctor-remove-restart` writes the log by hand), and the header decides doctor's `AUTO_RESTART_READY` vs `AUTO_RESTART_NOT_LOADED` for Pi and Oh-My-Pi (module 28 added the same test for the Claude mod). The Oh-My-Pi rows of the guard sequence need no new `it`: they are folded rows that now also kill the Oh-My-Pi `onOpened` and typed-prompt mutants.
- **Kept (4 tests, 6 rows):** `omp-session-switch` (2; the second is the only runtime-path assertion for the captured message-shaped stop payload, which `runtime-omp` and `reset-notice` send as a string), semi delivery (3 rows), `in-process-restart-plan` conflict test; the semi restart-off test kept its codex-cli row.
- **Moved/renamed:** none besides the merge; `omp-restart-world.ts` and `pi-restart-world.ts` now export `createOmpWorld`/`createPiWorld` and `RestartRun` adapters; Pi's unused `notices` field dropped.

### Production pending items
- None.

### Questions `[?]`
- prd-14 TechSpec TC-09 names `tests/integration/<harness>-restart.test.ts`; the Pi and Oh-My-Pi restart flows now live in `in-process-restart.test.ts` and `in-process-restart-gates.test.ts` (rows per harness). Confirm the TechSpec row can point there.

## 30. integration/runtime-harnesses — done 2026-10-10

**Baseline:** 45 runner tests across the 8 files, green (the table's 33 was the grep count). Stryker: n/a (Glue/Common).
**Result:** 33 tests across 8 files, green. Scoped coverage proxy (`process-hook-host.ts`, the Antigravity, Codex, Copilot and Cursor `runtime.ts`, `transcript-usage.ts`, `rollout-usage.ts`, `common/jsonl-tail-reader.ts`): module only, lines 87.11% → 86.63%, branches 80.13% → 76.71%; module plus the related suites (the five `-events` files, both `-measured` files, `unit/process-hook-host`, `-deadline`, `reset-notice`, `runtime-failure-policy`, `copilot-failure-policy`, `runtime-light-mode`, `package-assets`), lines 96.18% → 96.18% with the same uncovered lines, branches 91.58% → 91.45% (`process-hook-host.ts` 83.33% → 83.33%; Antigravity `runtime.ts` 90% → 88.88% and Codex `runtime.ts` 95.23% → 94.91% are v8 branch-count shifts with identical uncovered lines; `jsonl-tail-reader.ts` 91.89% → 92.1%). The module-only line loss is Antigravity `runtime.ts` 46-47 (`renderAntigravityDecision` → null for Stop), asserted by `reset-notice.test.ts:84` (module 22 note); the module-only branch loss is the PreToolUse/neutral render arms, asserted by the `-events` files. Left uncovered, same as before: the `run*Hook` process entrypoints (e2e smoke), the unread `toolOf` fallthroughs (module 21 pending item), `jsonl-tail-reader.ts` 21-22 (a non-ENOENT `open` error, defensive), `process-hook-host.ts` 95-96 (`parsePayload` catch; the real-boundary malformed stdin is `package-assets`). `readStdinUpTo` (36-48) runs only in spawned children, which v8 does not measure; `unit/process-hook-host.test.ts` (module 37) covers it in process. Commit `042bb34`.

Layout: no move (all eight already in `tests/integration/`), no rename. `runtime-host-process.test.ts` stays in `PROCESS_LANE_FILES` (prd-13 DEC-04 names it); no other file gained or lost a process marker (`test-lanes.test.ts` green). The four `runtime-<harness>.test.ts` files run the adapters through `runHookInProcess` with an in-memory `ProcessHookContext` (prd-13 TechSpec), so their value is the composed flow (ledger across invocations, reset, transport field); the event mapping and render rules are in modules 21-22's `-events` files. The real process boundary is `runtime-host-process` (fixture host over stdin/stdout/exit code), `package-assets` (built hooks, malformed stdin) and the e2e smoke round trip per process harness (`e2e-hook-round-trips.test.ts`, unchanged). `runtime-in-process.test.ts` is the built in-process round trip prd-13 T04 designates; `loadPi`/`loadOmp` became one `loadExtension(asset)`.

### Process-harness adapters through the host (`runtime-<harness>.test.ts`) → Glue (one composed flow per harness)

| Behavior | Mutant | Test |
|---|---|---|
| PostToolUse turns persist across invocations and PreInvocation injects the current block; PostToolUse answers `{}` (DEC-13, DEC-14) | ledger append unwired; `pre_invocation` not routed to the engine | Antigravity `counts one turn per PostToolUse call and replies with an empty object` |
| Codex PreToolUse writes nothing and no stderr; four post-tool calls inject the exact telemetry block in `hookSpecificOutput` (FR-07, mandated exact text) | `event === null` guard removed (engine throws, stderr written); block text or field changed | Codex `stays silent on PreToolUse and injects the exact telemetry block…` |
| Codex compaction resets the count; Stop names `/new` exactly (DEC-12) | `session_reset` not applied; notice command changed | Codex `resets on compaction and names /new on the documented Stop fixture` |
| Copilot injects only `additionalContext` | `modifiedResult` added; field renamed | Copilot `injects additionalContext after the tool without touching the tool result` |
| Copilot preCompact and `source: new` reset | either reset unwired | Copilot `resets on preCompact and on a new session source` |
| Cursor injects only `additional_context`; preCompact fixture resets | field renamed; reset unwired | Cursor `injects additional_context after a tool and resets at preCompact` |

### process-hook-host.ts at the real process boundary → Glue (fixture host, `PROCESS_LANE_FILES`)

| Behavior | Mutant | Test |
|---|---|---|
| an unmapped event above the ceiling exits 0 with a neutral answer and empty stderr (FR-07) | `event === null` guard removed; exit code changed; stderr written | `answers an unmapped event above the ceiling with a neutral response, exit code 0, and no stderr (prd-12 FR-07)` |
| stdin payload reaches the ledger; the decision goes to stdout | `readStdin`/`writeStdout` of the default context mis-wired | `reads the payload from stdin, appends the tool line, and answers on stdout` |

### Built in-process assets (`runtime-in-process.test.ts`) → Glue

| Behavior | Mutant | Test |
|---|---|---|
| built Pi appends the measured block after the original content; `message_end` notice names `/new` (prd-14 TC-10); no `tool_call` handler (FR-07) | bundle drops the measured usage; notice channel unwired; a pre-tool handler registered | `runs the built Pi extension…` |
| built Oh-My-Pi `session_stop` notice names `/new`; no `tool_call` handler | as Pi | `runs the built Oh-My-Pi extension with the session_stop notice` |
| built OpenCode has no `tool.execute.before`; the tool call and the compaction reach the ledger | pre-tool hook registered; `runInProcessEvent` call removed from either handler | `runs the built OpenCode plugin: no pre-tool hook, the tool call and the compaction reach the ledger` |

### transcript-usage.ts, rollout-usage.ts, common/jsonl-tail-reader.ts → Common

Read-only parsing with a `null` fallback on every branch, so Common rather than Critical (no persistence, money or permission; a wrong answer degrades to the estimate). The shared `readLatestLine`/`scanBackwards` rules are tested once, in the Claude file that prd-02.1 TC-13/15/16 name; the Codex file keeps only `usageOf` rules plus the missing-path row module 21 relies on.

| Behavior | Mutant | Test |
|---|---|---|
| Claude sums the three usage fields of the latest main-thread line (TC-13) | a term dropped; `+` → `-` | `sums the three usage fields…` |
| sidechain lines skipped (TC-14) | `isSidechain === true` → `false` | `skips sidechain assistant lines…` |
| no assistant line, missing path, missing or empty file, torn line, non-numeric, negative, no timestamp → null (TC-15) | `path === undefined` guard removed; `isMissingFileError` guard removed; a schema check relaxed | `returns null for a transcript without an assistant line`, `returns null for a missing path`, `returns null without throwing for %s` (6 rows) |
| the complete line before a torn tail is read; CRLF tolerated | backward scan stops at the first line | `reads the complete line before a torn tail…` |
| reading stops 4 MiB from the end (DEC-07) | `floor` removed | `stops reading after 4 MiB…` |
| I/O failures surface as `TranscriptUnreadableError` | either wrap removed | `wraps file I/O failures in TranscriptUnreadableError` |
| work independent of size at a path with spaces and accents (TC-16, NFR-01) | full-file read | `reads a 20 MB transcript…` |
| Codex last-turn tokens and model window; null window; no info → null | `last_token_usage` → `total_token_usage`; `?? null` dropped; `info` made optional | `returns the last turn tokens…`, `reports a null window…`, `returns null when no token_count carries info` |
| Codex non-numeric, negative, zero window, and a torn line that passes the marker check → null | `nonnegative`/`positive` relaxed; `parseJsonLine` try/catch removed (the torn line would throw `TranscriptUnreadableError`) | `returns null without throwing for %s` (4 rows) |

### Actions
- **Deleted (11 runner tests, plus 1 merged away):**
  - The PreToolUse-above-the-ceiling tests: Antigravity and Cursor `writes nothing for an unregistered PreToolUse/preToolUse event, even above the ceiling (prd-12 FR-07, TC-09)`, Codex `stays silent on PreToolUse above the ceiling (prd-12 FR-07)`, Copilot `stays silent below and above the ceiling (prd-12 FR-07)`. The adapter half (`PreToolUse → null`, TC-09) is in each `-events` file (`runtime-claude` carries `prd-12 TC-09` in its title) and `hook-registration-paths`; the host half (`event === null → NEUTRAL`, so the zone is never read) is `runtime-host-process` at the real boundary and the PreToolUse assertion folded into the kept Codex test; `package-assets` runs PreToolUse on every built process hook (`''`, exit 0). The critical seeding killed nothing: the host returns before the engine for an unmapped event.
  - Antigravity `answers PreInvocation with an empty injectSteps list while green`: `package-assets` `antigravity-cli-hook.mjs answers PreInvocation` asserts `{"injectSteps":[]}` through the built hook; the GREEN `pre_invocation` → neutral decision is `session-zone.test.ts:42`; the render is `runtime-antigravity-events`.
  - `runtime-host-process` `notifies the new-session command when the response ends with the signal`: the stdout pipe is the kept PostToolUse test; the notice text is `reset-notice.test.ts` `renders the notice with the harness command` (exact `/clear`) and the Codex Stop test here (exact `/new`), and the fixture host's Stop mapping is test code. RF22 stays in `reset-notice.test.ts` describes.
  - `claude-transcript-usage` `returns null for an empty path`: `open('')` fails with `ENOENT` (checked on this machine), which `isMissingFileError` maps to null, so the `path === ''` mutant survives with or without the row.
  - `codex-rollout-usage` `an empty path`, `a missing file`, `an empty file` and `wraps file I/O failures in TranscriptUnreadableError`: the same shared `readLatestLine` rows in `claude-transcript-usage` (`returns null for a missing path`, `returns null without throwing for a missing file / an empty file`, `wraps file I/O failures…`).
- **Merged (2 → 1):** `runtime-host-process` `stays neutral on a code read above the ceiling and exits zero (prd-12 FR-07)` + `answers unknown events with a neutral response` (same null-event path in the fixture host) → one test asserting `{ code: 0, stdout: neutral, stderr: '' }`.
- **Rewritten (6):** Codex yellow test asserts the exact telemetry block and the whole `hookSpecificOutput` (was two `toContain`), with the PreToolUse silence (code, stdout, stderr) folded in: without it `process-hook-host.ts:79` lost its only in-process execution. Copilot and Cursor injection tests assert the whole response object (`toEqual({ additionalContext | additional_context: … })`, which also implies no `modifiedResult`). Antigravity asserts the whole `injectSteps` object. Pi asserts the full content array (original part plus block) and drops a `session_start` call that asserted only `resolves.toBeUndefined()` on another session. OpenCode drops its critical half (identical to `runtime-light-mode` `registers no pre-tool hook and records a post-tool call above the critical ceiling`) and its assertion-free `resolves.toBeUndefined()` calls, and now asserts the ledger lines `session, tool, reset`. The Codex torn-line row was kept (renamed `a torn last line that carries the token_count marker`): it is the only test of the `parseJsonLine` catch, because the Claude torn rows are cut before `"usage"` and never reach the parser (the proxy showed lines 36-37 uncovered when it was dropped).
- **Created (0).**
- **Kept:** the Codex reset/Stop test, the Copilot reset test, the Pi/Oh-My-Pi notice assertions (prd-14 TC-10 names this file), every Claude reader row except the empty path (TC-13/14/15/16, DEC-07), the Codex `usageOf` rows and its missing-path row (module 21 relies on it).
- **Moved/renamed:** none.

Mandated rows: the failure policy (an adapter failure lets the tool call proceed) has no test in these files; it is `package-assets` (built Antigravity hook, malformed stdin → `{}`, exit 0, error on stderr, so a `writeStderr`→stdout mutant is killed at the real boundary), `runtime-failure-policy` and `copilot-failure-policy` (module 31), the I/O failure tests of module 21, and `unit/process-hook-host` (module 37). The exact telemetry block is now asserted end to end once (Codex yellow); the exact Stop notices are the Codex test and the Pi/Oh-My-Pi built tests; the 60-token budget is module 34.

### Production pending items
- None new. Module 21's `ToolCall` item covers the uncovered `toolOf` fallthroughs seen here.

### Questions `[?]`
- TC-16 (`reads a 20 MB transcript … as fast as its tail alone`) is a relative timing assertion in the integration lane, while `tests.md` sends timing targets to `tests/bench/`. Kept because prd-02.1 TC-16 names this file and it runs in ~0.3-0.5 s; confirm whether it should move to the bench suite.
- prd-13 TechSpec gives `runtime-host-process.test.ts` the lane reason "stdin limit", but no test here sends more than `MAXIMUM_STDIN_BYTES`; the limit is tested in process by `unit/process-hook-host.test.ts` (module 37). Confirm the TechSpec reason can drop "stdin limit", or whether a spawned over-limit test is wanted.

## 31. integration/runtime-policies — done 2026-10-10

**Baseline:** 50 runner tests across the 12 files, green (the table's 33 was the grep count; `simulated-usage` alone is 17 runner tests). Stryker: n/a (Glue/Common).
**Result:** 30 tests across 10 files, green. Scoped coverage proxy (`src/infrastructure/runtime/**`, `src/core/services/failure-policy.ts`): lines 73.44% → 73.44% with identical uncovered lines in every file; branches 77.86% → 77.68%, all of it `runtime-state-reader.ts` 63.63% → 61.9% (same uncovered lines; a doctor branch the deleted `brake-lifecycle` doctor run executed without asserting it). `doctor-runtime-errors` + `doctor-active-sessions` cover that reader at 94.2% lines / 80.64% branches (checked with a scoped run). `in-process-host.ts` shows 0% before and after: the simulator loads the built `dist` bundles, which v8 does not attribute to `src/`; module 37's unit files cover it. `hook-failure.ts` 25-26 and the `failure-policy.ts` gaps are the defensive catches modules 36/37 own. Commit `ce43c89`.

Layout: no move (all already in `tests/integration/`), no rename. `runtime-parallel-turns.test.ts` stays in `PROCESS_LANE_FILES` and still spawns the built hook (prd-13 lane reason: concurrency between hook processes); `test-lanes.test.ts` green. Dead simulator helpers left by the `brake-lifecycle` deletion removed from `tests/support/harness-simulator/` (`workStep`, `criticalCalls`, `brakeWorkFlow`, `readCall`, `writeCall`, `shellCall`, `WORK_FILE`).

### Failure policy (`process-hook-host.ts`, `hook-failure.ts`, `failure-policy.ts` through the in-process hooks) → Glue, mandated rows

The host loads the configuration before the `event === null` check (`process-hook-host.ts` 77 vs 79), so an invalid configuration fails even an unregistered PreToolUse and goes through the null-event record branch of `hook-failure.ts` (18-20); a mapped event goes through `resolveFailure`. Both are now asserted by their error records. The failure decision never reads the zone (the configuration fails first), so GREEN and CRITICAL are the two zones the TechSpec rows name (TC-04 "below and at CRITICAL", TC-18 "below and above the ceiling").

| Behavior | Mutant | Test |
|---|---|---|
| Claude PreToolUse below and at CRITICAL and PostToolUse with an invalid configuration: exit 0, no output, one `INVALID_CONFIG` record per call with its event (`PreToolUse` from the null-event branch, `post_tool` from `resolveFailure`) | null-event `recordRuntimeFailure` removed; failure decision renders a deny/context; exit code changed | `runtime-invalid-config` `lets pre-tool calls below and at CRITICAL and a post-tool call proceed silently and records INVALID_CONFIG for each` (TC-04, RF19, CA-16, prd-12 TC-10) |
| Cursor and Copilot post-tool in GREEN and CRITICAL with an invalid configuration: exit 0, no output, four `INVALID_CONFIG` records | either adapter renders the failure decision; record dropped | `runtime-failure-policy` `lets Cursor and Copilot post-tool calls proceed silently in GREEN and CRITICAL…` (TC-18, CA-16, prd-12 FR-07, TC-10) |
| an unreadable ledger is a recorded `LEDGER_UNREADABLE`, not a crash | `LedgerUnreadableError` mapping removed; read error escapes | `treats an unreadable ledger as a recorded failure rather than a crash` |

### node-session-ledger.ts → Common (same precedent as module 11's stores: append-only JSONL with tolerant read, no money/permission; a wrong answer degrades to the estimate)

| Behavior | Mutant | Test |
|---|---|---|
| one LF-terminated line per event with the injected clock (RF2, DEC-04) | `\n` dropped; `clock.now()` replaced | `appends one LF-terminated valid JSON line per event…` |
| runtime `.gitignore` `*` on the first write, never overwritten (DEC-16, TC-29) | `ensureRuntimeDirectory` writes unconditionally or not at all | `creates the runtime gitignore on the first write and never overwrites it (DEC-16, TC-29)` |
| corrupt, partial, and unknown-version lines skipped | `parseLedgerLines` replaced by a strict parse | `skips corrupt, partial, and unknown-version lines…` |
| retention: older than 14 days pruned, exactly 14 and 13 kept (DEC-16, TC-29) | `>=` → `>` in `prune` (the new exactly-14-days row); `SESSION_RETENTION_DAYS` changed; filter on the prefix dropped | `prunes only the ledgers untouched for more than fourteen days and keeps one touched exactly fourteen days ago` |
| three concurrent built hooks then one isolated call report `turn=4` (RF1, RF2, CA-06, TC-08) | append replaced by read-modify-write; turn counted from a stale read | `reports four turns on the isolated call after three concurrent hooks` (process lane) |

### Composed flows through the Claude Code hook and the built OpenCode plugin → Glue

| Behavior | Mutant | Test |
|---|---|---|
| no command: YELLOW/RED/CRITICAL generic actions without the marker, PreToolUse never denies, clear SessionStart injects nothing, doctor shows the default snapshot and the session (prd-12 TC-08, FR-06, FR-07) | snapshot action leaks with a null command; a pre-tool decision returned | `injects the generic actions without the marker, never denies, and shows the session in doctor` |
| snapshot flags: exact `action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]` at RED, exact `[ContextBrake resume v1] Run "/sdd-resume" before continuing.`, doctor reflects set and clear (module 9 relies on it) | trigger zone ignored; resume text changed; clear not applied | `names the command at the trigger zone, resumes after a clear, and clears the commands again` (prd-12 TC-05, TC-07, TC-13) |
| built OpenCode: no `tool.execute.before`; a post-tool call above the critical ceiling is recorded (module 30 relies on it) | pre-tool hook registered; the critical post-tool path throws or skips the ledger | `registers no pre-tool hook and records a post-tool call above the critical ceiling` |
| debug mode: doctor JSON/text, telemetry at low usage, health unchanged, nothing left after remove (prd-08 TC-11, TC-12) | debug flag not read by the hook; doctor status changed by debug | kept unchanged |
| remove deletes the runtime directory, keeps a non-owned file beside it, and a second remove succeeds and keeps it (prd-12 FR-08, DEC-04, TC-12) | runtime directory removed recursively with its parent; second remove fails on the missing manifest | `deletes the runtime directory, keeps a file it does not own next to it, and a second remove succeeds…` |
| simulated usage accuracy: every Pi/Oh-My-Pi reading within 10 points across the TC-13 matrix (2 windows × 4 output kinds) and repeated estimated Claude ledgers identical (CA-11) | estimator constants changed; `source`/`windowTokens` mis-recorded | kept unchanged (17) |

### Actions
- **Deleted (16 runner tests):**
  - `copilot-failure-policy.test.ts` (2): neither test exercised a failure. `generates dedicated hook file avoiding shell interpolation` → `hook-registration-paths` Copilot row (`toEqual` on the whole hooks object: post-tool, session-start, preCompact, no preToolUse, same `exec` form); `reports full support with a context usage limitation and no warning finding (prd-12 TC-11)` → `harness-adapters` TC-02 (exact Copilot profile and limitations, CA-15 in its describe; prd-12 TC-11 names `support-service` and `harness-adapters`) and `support-limitations` (no `COPILOT_TIMEOUT_LIMITATION` in doctor). The `INVALID_HARNESS_CONFIG` negative on a valid file killed nothing. IT-12 is a prd-01 row about a timeout limitation the current Copilot profile no longer declares. The Copilot failure path the file name promised (TC-18) is now in `runtime-failure-policy`.
  - `brake-lifecycle.test.ts` (1): the simulator's `pre` always returns `allowed: true` (`process-driver.ts`), so "every tool call completes" and the written `src/generated.ts` were simulator constants; no `BRAKE_*` finding code exists in `src/`. The zone progression through the installed Claude hook is `light-mode-lifecycle` test 1 (YELLOW, RED, CRITICAL, PreToolUse not denied, prd-12 FR-07); the bridge window driving the zone is `runtime-host-process` (`seedBridgeWindow`).
  - `runtime-light-mode` `injects nothing at session start`, `returns no resume block on a clear session start`: the same `resumeText(null) → null` path, asserted by `unit/session-reset-handler` (module 12) and end to end by `light-mode-lifecycle` (clear SessionStart → `''`). `injects the generic action without the marker after a tool call`: `light-mode-lifecycle` asserts the exact CRITICAL generic action plus `FORBIDDEN` (prd-12 TC-08 is in its describe). `injects the resume text on a clear session start` (prd-12 FR-05, TC-07): `light-mode-lifecycle` asserts the same exact resume text after `init --resume-command`; TC-07 itself names `unit/zone-guidance`.
  - `light-mode-lifecycle` `accepts --debug and creates no instruction file` (module 26 note): `debug-mode-lifecycle` asserts `debugMode: true` after `init --debug`, `init-debug-mode` asserts no instruction-file change, `statusline-default` the bridge on a plain init. The three `rejects the removed %s flag with exit 64` rows: `unit/init-arguments` `rejects %s` (same three flags among eight, `Unknown option` message) and `main.test.ts` maps the parse error to 64.
  - `runtime-parallel-turns` `keeps one valid line per concurrent append…` (T03, in process): `Promise.all` inside one process is not the inter-process case TC-08 describes; the built test kills the read-modify-write mutant across processes (RF1, RF2 moved to its describe). `keeps subagent turns in their own ledger`: `claude-runtime-session-key` (RF4, CA-08, TC-10: subagent calls in their own ledger, main untouched) and `unit/runtime-paths` (`separates a subagent from the main session`).
  - `runtime-session-ledger` `keeps a subagent on its own ledger…` (RF4, CA-08): the same two tests. `returns no lines for a session that never wrote a ledger`: every first-turn test reads an absent ledger; a throw there turns every block into the failure answer, which `light-mode-lifecycle` (`blocks[7]` YELLOW) would catch.
  - `runtime-state-removal` `deletes nested runtime-state files and prunes every emptied ContextBrake directory`: `init-remove-footprint` E2E-07 seeds `.context-brake/runtime/sessions/s1.json` after a real `init` and asserts `.context-brake` is gone after `remove` (same TC-12); the nested listing is `unit/runtime-state-files`.
- **Merged (8 → 4):**
  - `runtime-failure-policy` below-the-ceiling (Claude, Cursor) + above-the-ceiling (Claude, Cursor, `INVALID_CONFIG`) → one test for Cursor and Copilot in GREEN and CRITICAL with four records; the Claude legs moved to `runtime-invalid-config`.
  - `runtime-invalid-config` `stays neutral below and at the ceiling…` + `keeps a post-tool event silent and records INVALID_CONFIG` → one test asserting the three calls and the exact `event code` records (the pre-tool calls never had their records asserted).
  - `runtime-retention` `prunes only the ledgers untouched for more than fourteen days` + `removes nothing when every ledger was touched within the retention window` → one test with a 15-, 14- and 13-day ledger; the gitignore assertion is `runtime-session-ledger` (now tagged DEC-16, TC-29).
  - `runtime-state-removal` `plans and changes nothing when repeating remove…` (asserted only exit 0) folded into the stray-file test: the second remove must succeed and keep the stray file.
- **Rewritten (2):** the OpenCode critical test asserted only `resolves.toBeUndefined()`; it now asserts the 13th tool line in the ledger. `light-mode-lifecycle` test 1 dropped the footprint assertion (`LIGHT_FILES`, module 26 note: `init-snapshot` asserts the owned paths) and the `task_plan.json` write (no source reads that file since prd-12).
- **Created (0).** Copilot was folded into the existing failure-policy arrangement (TC-18 names it), not added as a test.
- **Kept:** `light-mode-lifecycle` snapshot round trip (module 9), `debug-mode-lifecycle` (prd-08 TC-11 names the text line and the post-remove check), the session-ledger append, gitignore and tolerant-read tests, the built parallel test, and `simulated-usage` unchanged (prd-02 TC-13 enumerates both windows and all four output kinds for Pi and Oh-My-Pi).

Mandated rows: failure policy in every zone is `runtime-invalid-config` (Claude pre and post, GREEN and CRITICAL) and `runtime-failure-policy` (Cursor and Copilot, GREEN and CRITICAL, plus the unreadable ledger), and module 30's `package-assets` at the real boundary. The exact snapshot action and resume text are `light-mode-lifecycle`; the 60-token budget is module 34. Runtime retention DEC-16 is `runtime-retention` (15/14/13 days) and the session-ledger gitignore test.

### Production pending items
- None.

### Questions `[?]`
- prd-02 TC-08 says "repeat 20 times on fresh ledgers"; the built test runs 5 rounds (pre-existing, kept for the process-lane time budget). Confirm 5 is acceptable or the TechSpec row should say 5.

## 32. integration/hooks-lifecycle-misc — done 2026-10-10

**Baseline:** 40 runner tests across the 11 files, green (the table's 26 was the grep count; the `describe.each` EOL and scenario matrices and the IT-13 `it.each` count per row). Stryker: n/a (Glue).
**Result:** 25 tests across the same 11 files, green. Scoped coverage proxy (`commands/init.ts`, `commands/remove.ts`, `commands/doctor.ts`, `composition-root.ts`, `process/node-process-runner.ts`, `process/process-tree.ts`, `harnesses/common/hook-event-cleanup.ts`, `asset-currency.ts`): lines 81.53% → 81.53% with the same uncovered lines in every file; branches 81.98% → 82.42% (`composition-root.ts` 57.89% → 61.9%, `doctor.ts` 77.77% → 78.94%: the IT-10 legs now run through `runInProcessCli`). Left uncovered, same as before: `asset-currency.ts` 18-34 (`assetCurrencyFindings`, module 6's `doctor-asset-currency`) and 77-79 (the no-manifest/no-snapshot guard, defensive); `process-tree.ts` 7-9/14-25 (the POSIX kill and the no-pid guard: platform, not a gap); `node-process-runner.ts` 46-47 (`spawnPipedProcess`, called only by `statusline-previous.ts`, module 33); `remove.ts` 58 (declined confirmation). The module 25 note holds: `remove.ts` lines are 100% here (invalid config through IT-10, `remove --dry-run` through `linked-project-root-lifecycle`, the conflicted harness through `remove-invalid-config`). Commit `c8fd166`.

Every source is Glue reached through `init`/`remove`/`doctor` in process, except `NodeProcessRunner`, which is tested at the real process boundary. The decisions are unit-tested elsewhere: `hook-event-cleanup` (module 18), `classifyAssetCurrency` (`unit/asset-currency`, module 4), `versionFromProcess`/`normalizeVersion` (`unit/version-service`, module 5), the Copilot and Cursor profiles (`harness-adapters` TC-02, module 18), the configuration rules (module 10). No file moved, renamed or deleted: the prd-15 TechSpec names `retired-hook-events.test.ts` (TC-06 to TC-09), the prd-13 TechSpec names `linked-project-root`, `support-limitations`, `cli-shells` and `node-process-runner`, and prd-13 `done/task_03.md` names `linked-project-root-lifecycle.test.ts`. `cli-shells` stays in `PROCESS_LANE_FILES` and `node-process-runner` in both `PROCESS_LANE_FILES` and `SERIAL_LANE_FILES` (unchanged; both still spawn, `unit/test-lanes` green). Carry-forward reliances kept: `asset-currency-lifecycle` `MODIFIED_OWNED_ASSET` (only coverage of `protectModifiedAssets` 80-84 with `doctor-asset-currency`), `invalid-config` IT-10 with a CLI-level doctor exit 2 (modules 6, 26), `remove-invalid-config` finding assertions (module 17), `support-limitations` no `COPILOT_TIMEOUT_LIMITATION` (module 31).

### Flows → Glue

| Flow | Mutant (wiring) | Test |
|---|---|---|
| Claude Code, LF and CRLF: `init` drops owned entries under retired events (same group, own group, emptied event key removed) and keeps foreign groups/handlers and events; a second `init` plans no settings change; `remove` restores the foreign content byte for byte (mandated user-file row, second run) | cleanup limited to current events; emptied event key kept; EOL not preserved; non-idempotent rewrite | `init keeps only current owned events, a second init plans nothing, and remove restores…` (FR-03, FR-04, NFR-01, TC-06) ×2 |
| `remove` without a prior `init` deletes owned entries under any event, LF and CRLF | removal consults only the current events | `remove alone deletes owned entries under any event` (FR-04, TC-06) ×2 |
| `.claude` a link to `.agents`: the edit lands on the target and the link survives | the writer replaces the link | `edits the link target and keeps the link` (NFR-02, TC-09) |
| Codex (alias and legacy command forms), Cursor (flat), Antigravity (named children): same sequence as TC-06 | per-adapter ownership match misses a form; foreign sibling dropped | `init removes the owned retired entries, a second init plans nothing, and remove restores…` (FR-03, FR-04, NFR-01, TC-07) ×3 |
| Copilot `preToolUse` dropped by `init`; `remove` deletes the wholly owned file | retired event kept; owned file left behind | kept unchanged (TC-08) |
| linked project root: `init` writes into the real root, the rerun is byte-identical (config and manifest), `doctor` and `remove --dry-run` run without `UNEXPECTED_ERROR`, the root link survives | boundary check rejects the link; canonical path mismatch makes the rerun rewrite; dry-run path broken | `installs through the linked root into the real root, reruns byte-identically, and keeps doctor and remove --dry-run working` (T11.4, CR-01) |
| symlinked config and linked `.context-brake/` inside a linked root: writes go through both links, both stay links, the rerun is byte-identical | atomic write replaces the file link; state directory link replaced by a directory | `writes through both links, keeps them as links, and reruns byte-identically` (T11.4) |
| outdated owned asset rewritten to the packaged content; user-modified asset kept byte for byte with `MODIFIED_OWNED_ASSET` | `protectModifiedAssets` not applied; `modified` → overwrite | `rewrites an outdated asset and leaves a modified one untouched…` (FR-08, TC-04) |
| built CLI `init` through PowerShell and Git Bash (Windows) or bash and the native shell | argument quoting through a shell | kept unchanged (CA-01, CA-20, prd-13 DEC-04) ×2 |
| Copilot and Cursor limitations printed by `init` and reported by `doctor --json` with `full` support; no `COPILOT_TIMEOUT_LIMITATION` | limitations not passed to the report; support level changed; timeout finding reintroduced | `prints the context usage limitations in init and in doctor with full support and no limitation finding` (TC-03, FR-03, FR-04) |
| invalid configuration: `init` and `remove` exit 2 and write nothing (the directory still holds only the config, byte-unchanged); `doctor --json` exits 2 with an `INVALID_CONTEXTBRAKE_CONFIG` error finding | `readTolerant` error swallowed; doctor stops at the config error or drops the finding | `blocks init and remove with exit code 2 leaving the repository unchanged, and doctor reports INVALID_CONTEXTBRAKE_CONFIG with exit code 2` (IT-10, CA-13) |
| `remove` with an unparsable harness file keeps that harness, removes the other, reports `INVALID_HARNESS_CONFIG`, and succeeds once the file is fixed | conflicted harness retained list dropped | kept unchanged (CR-06) |

### node-process-runner.ts, process-tree.ts → Common (process boundary)

| Behavior | Mutant | Test |
|---|---|---|
| old, prerelease, current and malformed fixture executables yield the IT-13 states | stdout not collected; exit code dropped | `normalizes the $mode fixture` (4 rows, IT-13 enumerates them) |
| metacharacters reach the child as one argument | `shell: false` → `true` | `passes metacharacters as one argument without a shell` |
| discovery deduplicates names and returns `null` for a missing executable | `new Set` dropped; `locatedPath` ignores the exit code | `discovers executables with deduplicated argument-array probes` |
| a timeout yields `timed_out` (and a `timed_out` probe) and kills the descendants | `killProcessTree` skipped; `timedOut` flag ignored on close | `returns a timed-out probe and stops descendants when the parent times out` |
| spawn failure → `failed`; non-positive timeout → `RangeError` | `error` handler removed; guard inverted | `reports spawn failures and rejects invalid timeouts` |

### Actions
- **Deleted:** none outright; every removed runner test was folded into a surviving flow below.
- **Merged (25 → 10 runner tests):**
  - `retired-hook-events` (TC-06, per EOL) `removes owned entries outside the current events and keeps foreign ones` + `a second init plans no change to the settings file` + `init then remove restores the foreign content byte for byte` → one flow per EOL (the TechSpec row is one `init`-then-`remove` sequence with a second run); the two `describe.each` blocks became one with the same seed. 6 → 2.
  - `retired-hook-events-harnesses` the same three tests per scenario → one flow per scenario; the `keep-same`/`keep-event`/`keep-key` `toContain` checks were subsumed by the byte-for-byte check after `remove`. 9 → 3.
  - `linked-project-root` `installs through linked root with canonical paths and rerun is byte-idempotent` + `linked-project-root-lifecycle` `runs init --yes twice, doctor, and remove --dry-run…` → one flow in the lifecycle file (both ran `init` twice through the link and compared the config); the manifest byte check moved over. The direct `snapshotFiles` `realPath` assertion was dropped: canonical resolution through a linked directory is `unit/change-target` (module 39), and a non-canonical snapshot path would make the rerun plan a rewrite, which the byte-identical rerun catches. 2 → 1.
  - `linked-project-root` `installs with symlinked context-brake.config.json…` + `installs with linked .context-brake directory…` → one fixture holding both links (same linked-root arrangement; each link and each target is still asserted). 2 → 1.
  - `support-limitations` `prints matching limitations in init text and JSON` + `prints equivalent limitations in doctor text and JSON…` → one test with two CLI runs instead of five (init text, `doctor --json`). Dropped legs: the `init --dry-run --json` plan and the `doctor` text output render the same report fields; the renderers are module 1's `cli-output-text` (limitation lines for install and integration lines for doctor). The init-plan `post_tool_telemetry` negative is `harness-adapters` TC-02 (exact Copilot and Cursor limitation lists); in `doctor` that capability appears legitimately for the unverified version, so the doctor leg asserts `arrayContaining`.
  - `invalid-config` IT-10 `blocks writes in init and remove with exit code 2…` + `doctor continues diagnostics and reports INVALID_CONTEXTBRAKE_CONFIG…` → one flow (same fixture, one TechSpec row). 2 → 1.
  - `node-process-runner` `returns a bounded timeout state` folded into the tree-kill test (same `timed_out` mutant; the `versionFromProcess` timed-out mapping is now asserted there and is `unit/version-service` row 1). 2 → 1.
- **Rewritten (assertions):** IT-10 runs through `runInProcessCli` and asserts the `INVALID_CONTEXTBRAKE_CONFIG` error finding (the doctor test asserted only exit 2 under a title promising the finding) and that `init`/`remove` created nothing (`readdir` is the config alone). `asset-currency-lifecycle` asserts the outdated hook is restored to the installed content (was `not.toBe(stale)`), parses the report with `installReportSchema`, and no longer mutates the parsed manifest in place.
- **Created:** none.
- **Kept (14 runner tests):** `retired-hook-events` remove-alone ×2 and TC-09, `retired-hook-events-copilot`, `cli-shells` ×2, `remove-invalid-config`, the IT-13 `it.each` (4 rows; the TechSpec names old, prerelease, malformed and timed-out fixtures, so the identifier overrides the overlap with `unit/version-service`), and the metacharacter, discovery and spawn-failure tests.

Mandated rows: user-file byte preservation including a second run is the TC-06 flows (LF and CRLF) and the TC-07 flows; the linked-root and inner-link reruns are byte-identical.

### Production pending items
- `remove` does not restore a harness file whose original had no or an empty `hooks` object: in `remove-invalid-config`, Cursor's `{ "version": 1 }` comes back as `{ "version": 1, "hooks": {} }` and Codex's `{ "hooks": {} }` comes back with the empty object reformatted (`{\n  }`). Content ContextBrake does not own is not byte-identical after `init` + `remove` (`tests.md` user-file row). The test keeps its `not.toContain('context-brake.mjs')` assertions; tighten them to byte equality when the editor drops an emptied `hooks` key it created and keeps an existing empty one as written.

### Questions `[?]`
- Same finding as above: confirm whether an emptied `hooks` key left behind is acceptable, or a defect to fix in the JSON editor (module 38 owns `json-document-editor`).
- prd-15 codereview_01 CR-03 (optional CRLF variant for Codex, Cursor and Antigravity) stays open; not added under the growth rule, since the Claude CRLF flow exercises the shared editor.

## 33. integration/statusline — done 2026-10-10

**Baseline:** 40 runner tests across the 8 files, green (the table's 34 was the grep count; the TC-08 `it.each` counts 3 rows, the TC-04 `it.each` 3, and the TC-02 `it.each` one row per shell found: `git-bash`, `pwsh.exe` and `powershell.exe` on this machine, so the `statusline-shell` count varies by machine). Stryker: n/a (Glue).
**Result:** 36 tests across the same 8 files, green. Scoped coverage proxy (`claude-code/statusline-bridge.ts`, `-output.ts`, `-previous.ts`, `-planner.ts`, `-restore.ts`, `-default.ts`, `runtime/node-session-ledger.ts`): lines 89.58% → 89.58% with the same uncovered lines in every file; branches 86.7% → 86.7% overall. Per file the only differences are V8 block ranges split differently (`statusline-default.ts` 73.33% → 75%, `statusline-planner.ts` 91.07% → 90.9%: a per-branch comparison of `coverage-final.json` shows no branch that was hit before and is missed after). The built bridge (`statusline-bridge`, `-lifecycle`, `-shell`) runs the bundle in `dist/`, so only the in-process tests count toward `statusline-bridge.ts` (87.5% lines; the uncovered lines are the stdin read error, `parseJson` failure and the ledger-write failure, which the built TC-08 tests exercise). `node-session-ledger.ts` at 57.89% is expected: the rest is module 31's `runtime-session-ledger` and module 37. Commit `d0007e9`.

Every source is reached through the real edge: `init`/`remove`/`doctor` in process (`statusline-world`), the built bridge script through real processes and shells (process lane), or `runClaudeStatuslineBridge` in process with real child shells. The decisions are unit-tested elsewhere: payload mapping (module 19 `statusline-payload`), settings precedence, command quoting and state parsing (module 19 `statusline-planner`, `-shell-resolution`), the default-conflict softening (module 19 `statusline-default-conflicts`), the doctor findings (module 20), the ledger line schema (`unit/statusline-line`, TC-01). No file moved, renamed or deleted: all eight already live in `tests/integration/`, and the prd-02.2 TechSpec names `statusline-bridge.test.ts` (TC-06 to TC-09) and `statusline-install.test.ts` (TC-12 to TC-14), prd-10 names `statusline-install` (TC-05) and the bridge flows (TC-02, TC-04, TC-07). `statusline-bridge`, `-bridge-lifecycle`, `-bridge-previous` and `statusline-shell` stay in `PROCESS_LANE_FILES` (unchanged; all still spawn; `unit/test-lanes` green). Observation: the TechSpecs cite `tests/e2e/e2e-statusline-bridge.test.ts` (prd-02.2 TC-21, prd-10 TC-07) and `tests/e2e/e2e-statusline-…` (prd-10 TC-02); those flows now live in `statusline-bridge-lifecycle.test.ts` and `statusline-shell.test.ts`.

Carry-forward reliances kept: `statusline-install` TC-12 byte-for-byte restore after reruns (module 19) and CR-06 `INVALID_ARGUMENTS` exit 64 JSON document (module 1); `statusline-default` default bridge with no change on the next run and opt-out after install (module 26); `statusline-bridge-lifecycle` doctor `contextWindow` wiring (TC-21) and `doctorReportSchema` parse (TC-07) (module 6); `runtime-statusline-ledger` exact `"type":"statusline"` line (module 9); `statusline-install-invalid` `INVALID_HARNESS_CONFIG` for an unparsable local settings file (module 27: the only coverage of `auto-restart-planner.ts` 55-56).

### Flows → Glue

| Flow | Mutant (wiring) | Test |
|---|---|---|
| built bridge with `--pipe`: stdout byte-identical to the previous command alone, its exit code kept, one ledger line with the four values | pipe writer removed; record mapping changed | `passes stdin to the previous command…` (FR-02, OBJ-02, DEC-03, TC-06) |
| built bridge without `--pipe` and no state: empty stdout, exit 0, line recorded | early return dropped | `prints nothing without --pipe…` (TC-07) |
| invalid JSON, missing `session_id`, stdin above 1 MiB: output unchanged, nothing recorded, nothing logged; unwritable ledger logged under `StatusLine` with the output intact | `parseJson` `try` removed; size limit removed; `recordRuntimeFailure` dropped or event renamed | `keeps the output unchanged and records nothing for %s` (3 rows), `logs an unwritable ledger…` (NFR-02, TC-08: the TechSpec enumerates the four cases) |
| the ledger line holds only the values and `at`, never cost, workspace or output | payload spread into the line; a write that bypasses the schema | `stores only the five values and the time…` (NFR-03, TC-09) |
| in-process bridge runs the previous command, prints its output and records the shell label; with a state whose previous command is null it prints nothing and records no `shell` | `shell.label` spread removed; `previousCommand === null` guard dropped | `prints the previous output and records the shell that ran it`, `prints nothing and records without a previous status line` (FR-02, DEC-03, DEC-06, TC-04) |
| previous exits 1, prints nothing, or times out → one fallback line with the payload percentage; exit 2 with a ledger tool line → that reading and zone; shell not started → `not started` | `code !== 0` inverted; `trim() === ''` check removed; timer removed; `error` handler resolves output; tool-line reading dropped | `prints one line with the reason %s` (3 rows, TC-04 enumerates them), `uses the latest reading…`, `reports a shell that cannot start` |
| a tool reading before the latest reset is not shown; no payload percentage → no reading | reset slicing removed (`newestFirst` used whole); `percentage === null` guard removed | `omits the reading when the only tool reading precedes a reset and the payload has none` |
| `--pipe` passes stdin through and never runs the recorded command | `isPipe ? null :` dropped | `keeps passing stdin through with --pipe…` (DEC-05, TC-05) |
| spaces and accents in the root: exact installed command, recorded window in `doctor --json` `contextWindow`, local file restored byte for byte, state and script removed | path quoting; doctor context window not wired; restore incomplete | `installs, records a window, reports it in doctor…` (NFR-06, TC-21) |
| a PowerShell run recorded → `STATUSLINE_POWERSHELL_FALLBACK` with the Git Bash remediation on win32; report parses with `doctorReportSchema` | finding not wired into the report | `warns on Windows with the Git Bash remediation…` (FR-05, DEC-06, prd-10 TC-07) |
| installed command through every shell found prints the previous output byte for byte, exit 0, `shell` label recorded; a failing previous command gives one fallback line and exit 0 (and fails in CI without a shell) | shell resolution or argument quoting per shell | `prints the previous status line unchanged through %s` (one row per shell), `prints one fallback line and exits 0…` (prd-10 TC-02, FR-03, TC-04) |
| TC-12: wrap the local status line, reruns with and without the flag change nothing, `--no-statusline-bridge` restores byte for byte (mandated user-file row, second run) | non-idempotent rewrite; restore loses comments or key order | `wraps the local status line, stays unchanged on reruns…` |
| dry run lists `settings.local.json` and the state without writing (TC-15) | dry run applies the plan | `lists both files in a dry run without writing them` |
| wraps the user status line (copying `refreshInterval`), then `remove` deletes the created local file and the state (TC-13) | `createdLocalFile` ignored; options not copied | `wraps the user status line and deletes…` |
| PRD-09 pipeline flagged `STATUSLINE_BRIDGE_OUTDATED`, rewritten by `init`, unchanged on a rerun, restored on `remove` (TC-05) | migration skipped; rerun rewrites | `flags the pipeline, rewrites it on init…` |
| the bridge flag without Claude Code: exit 64 `INVALID_ARGUMENTS`, nothing written, with and without `--dry-run` (CR-06) | detection guard removed | `fails with an argument error and writes nothing…` |
| local settings unparsable with the flag: exit 2, `INVALID_HARNESS_CONFIG`, file untouched, no state; project settings unparsable: no local file; user settings unparsable: install with `STATUSLINE_USER_SETTINGS_INVALID` (TC-14) | conflict softened for an explicit request; user finding dropped | `reports a conflict with exit code 2…` (prd-09 DEC-08, TC-09, CR-01), `writes no local settings…`, `installs with a warning…` |
| plain `init` installs by default, the next one plans nothing (prd-09 TC-09); unparsable local settings on a plain `init` → `STATUSLINE_SETTINGS_INVALID` warning, hooks installed, file untouched | `isDefault` ignored; soften not applied | `installs the bridge on a plain init…`, `warns instead of failing a plain init…` |
| opt-out remembered across plain `init` until `--statusline-bridge`; a fresh opt-out writes no local file or state and is forgotten on `remove` | opt-out record not consulted; not cleared on install or remove | `remembers --no-statusline-bridge…`, `keeps the bridge off with --no-statusline-bridge and forgets the opt-out on remove` (FR-09, TC-13) |
| `appendStatuslineLine` writes the exact line with the injected time; an out-of-schema line throws and writes nothing | schema parse removed | `appends a statusline line…`, `rejects a statusline line outside the schema…` (FR-03, DEC-04) |

### Actions
- **Deleted (2):**
  - `statusline-install` `creates the status line without the flag now that the bridge is the default (prd-09 FR-04)`: same plain `init` on the same world as `statusline-default` `installs the bridge on a plain init and plans no change on the next one`, which asserts the local `statusLine` and the state and adds the second run.
  - `statusline-shell` `has no shell operator`: the installed command is pinned exactly by `statusline-bridge-lifecycle` TC-21 (`node "<root>/.claude/hooks/context-brake-statusline.mjs"` on a root with spaces and accents) and by TC-12 on a plain root; the command shape is module 19's TC-01 unit (`is only the quoted bridge script…`).
- **Merged (2 → 0 extra tests, folded into existing ones):**
  - `statusline-default` `keeps the bridge off with --no-statusline-bridge (FR-09, TC-13)` → `forgets the opt-out on remove`, which ran the same fresh `--no-statusline-bridge`; the merged test now asserts exit 0, no local file, no state, the opt-out record, and its removal on `remove`, and carries FR-09/TC-13 in its title.
  - `statusline-default` `keeps the conflict when the bridge is requested explicitly` → `statusline-install-invalid` `reports a conflict…`: same malformed `{ "statusLine": ` local file with `--statusline-bridge`; that test now also asserts exit 2 and carries prd-09 DEC-08/TC-09/CR-01.
- **Rewritten (2):** `statusline-install-invalid` `installs with a warning when the user settings do not parse` asserted `not.toContain('--pipe')` (a PRD-09 leftover that any non-pipeline command passes) and now matches the bridge command. `statusline-bridge-previous` `omits the reading when neither the ledger nor the payload has one` used a ledger holding only a reset, so removing the reset slicing in `renderFallbackLine` survived; the ledger now holds a `CRITICAL` tool line before the reset (title updated), which kills that mutant and still covers the no-payload case.
- **Created:** none.
- **Kept (32):** everything else above. Considered and reverted: deleting `statusline-bridge-previous` `prints nothing and records without a previous status line` on the strength of TC-07 and TC-09; the coverage proxy showed `statusline-bridge.ts` branches 73.33% → 70% because the built TC-07 has no state file and the bundle is not instrumented, so the in-process test is the only one for a state whose previous command is null (the common install without a previous status line).

Mandated rows: user-file byte preservation including a second run is TC-12 and TC-05 (`statusline-install`) and the default-bridge rerun (`statusline-default`); unparsable harness files left untouched are TC-14 and the default conflict; failure policy for the bridge (output unchanged, error logged, exit 0) is TC-08.

### Production pending items
- None.

### Questions `[?]`
- None.

## 34. telemetry/zones — done 2026-10-10

**Baseline:** 64 runner tests across the 4 files, green (the table's 34 was the grep count; `zone-classifier` 20, `zone-guidance` 21, `telemetry-block` 10, `telemetry-block-budget` 13). Stryker on `zone-classifier.ts`, `zone-guidance.ts`, `telemetry-block.ts` with these 4 files: **94.83%** (110 killed, 4 survived, 2 no coverage); per file 98.21% / 88.64% / 100%. Coverage proxy: lines 96.92%, branches 100% (`zone-guidance.ts` lines 26-27 uncovered).
**Result:** 43 tests, green. Stryker on the same scope: **95.69%** (111 killed, 3 survived, 2 no coverage); per file 100% / 88.64% / 100%. Coverage proxy unchanged (lines 96.92%, branches 100%, same uncovered lines 26-27). Related suites green: `unit/session-zone`, `unit/brake-engine-debug`, `integration/package-contents`. Commit `6e1908a`.

Deletions were checked against a `--disableBail` Stryker run (the default run records only the first killing test per mutant): every mutant killed before still has a killer among the kept tests.

### zone-classifier.ts → Critical (zone classification, 3+ branches, mandated boundaries)

| Behavior | Mutant | Test |
|---|---|---|
| default usage boundaries 49/50/65/66/74/75 and 130%, turns ignored without limits (prd-02 TC-01, prd-02.1 FR-01/TC-01) | `>` ↔ `>=` on each percentage; `>= critical` → `true`; turn operand forced | `classifies usage $usage% as $zone regardless of turns` (7 rows, turns 1 and 500) |
| optional turn limits 59/60/99/100/10000 raise the zone up to RED (prd-02.1 FR-02/TC-02) | `>` ↔ `>=` on each turn limit; `\|\|` → `&&` | `classifies $turns turns at 10% usage as $zone` (5 rows) |
| highest zone wins when usage and turns disagree (prd-02 TC-01 combined conditions, DEC-03) | usage YELLOW checked before turn RED | `takes the highest zone when usage and turns disagree` |
| turn limits and RED start exist only when both limits are set | either `=== undefined` operand → `false`; `+ 1` → `- 1` | `reports the turn limits and the RED start only when both are set` (+1 assertion) |
| usage percentage is the floored ratio; non-positive window is 100% (DEC-03, TC-28) | `Math.floor` removed or `ceil`; `*` → `/`; `<=` → `<` | `floors the ratio…`, `guards against a zero or negative window` |
| custom percentages and turns from the configuration (RF9, CA-04) | ceiling or limit hardcoded to the default | `classifies with custom percentages and turns` |
| a legacy `criticalTurn` is ignored (prd-02.1 FR-09) | turn-based CRITICAL reintroduced | `ignores the deprecated critical turn of a legacy configuration (FR-09)` |

### zone-guidance.ts → Critical (zone actions and snapshot settings, mandated)

| Behavior | Mutant | Test |
|---|---|---|
| exact action per zone with a snapshot command and the RED trigger, `now` only in CRITICAL (prd-12 FR-05, TC-07) | any action literal; `=== 'CRITICAL'` inverted; `>=` → `>` in `isAtOrAbove` | `uses the RED trigger in %s` (4 rows) |
| a YELLOW trigger starts the snapshot step at YELLOW (TC-07 "each zone and trigger") | trigger hardcoded to RED | `starts at YELLOW when the trigger is YELLOW` |
| without a command and restart off, generic RED/CRITICAL actions and no reset marker (prd-12 FR-06; prd-14 TC-01 restart off) | `mode !== 'handoff'` → `false`; generic literals | `uses the generic action in %s without the reset marker` (2 rows) |
| restart on: handoff text in RED and CRITICAL without a command, snapshot step with one (prd-14 FR-01, TC-01) | handoff branch removed; command check moved after the mode check | `asks in $zone with restart mode $mode…` (3 rows) |
| exact RED block in handoff mode (prd-14 TC-01, NFR-05) | handoff path or marker literal | `renders the exact RED block in handoff mode` |
| exact resume text, absent without `resumeCommand` (prd-12 FR-05) | prefix or template literal; `=== undefined` inverted | `names the resume command when configured`, `is absent without a resume command` |

### telemetry-block.ts → Critical (exact agent-facing text and the 60-token budget, mandated)

| Behavior | Mutant | Test |
|---|---|---|
| exact v3 block, estimated reading (RF12, RF15, CA-10, TC-06) | any template literal; field order | `renders the documented example line` |
| exact block with a measured reading and harness window (CA-09) | `source`/`windowOrigin` printed as a constant | `marks a measured reading with the same value the harness reported` |
| debug line appended with the block's own values (prd-08 FR-06, DEC-07) | `debug ?` inverted; debug literal | `appends the prefilled line…` (literal expected) |
| null usage renders as 0 in the block and the debug line | `?? 0` → `&& 0` or removed | `renders a null usage as zero tokens in the block and the debug line` |
| turn alone without limits, `turn/redStart` with limits (prd-02.1 FR-03, TC-05) | `=== null` inverted; separator literal | `renders the turn with RED start %s as %s` (2 rows) |
| worst-case block ≤ 60 tokens and ≤ 220 characters in every zone and action variant (CA-13, NFR-04, TC-06) | (budget, not a mutant) | `keeps the worst-case %s block within the token and character budget…` (4 rows × 3 configurations) |
| debug line adds ≤ 40 tokens (prd-08 NFR-03) | (budget) | `adds at most 40 tokens for the debug line` |
| CRITICAL block with a 200-character command stays under 400 characters (prd-06 NFR-05) | (budget) | `keeps the CRITICAL block with a 200-character snapshot command under 400 characters` |

Survivors, all equivalent: `zone-guidance.ts` 15:86 (default `mode = 'off'` → `''`: only `'handoff'` is ever compared); 16:7 and 16:16 (`zone === 'GREEN'` → `false`/`''`: `SNAPSHOT_TRIGGER_ZONES` is `['YELLOW', 'RED']`, so `!isAtOrAbove('GREEN', trigger)` already returns the generic action). The two no-coverage mutants are `handoffResumeText` (lines 25-27), asserted exactly by `unit/session-reset-handler.test.ts` and `unit/restart-flow.test.ts` (modules 12 and 15), outside this Stryker scope. The baseline survivor `zone-classifier.ts` 12:7 (left operand `greenMaxTurn === undefined` → `false`) is now killed by one assertion folded into an existing test; the schema's `checkTurnPair` rejects a lone `yellowMaxTurn`, so this protects the guard rather than a reachable configuration.

### Actions
- **Deleted (12):**
  - `zone-classifier` `never reaches CRITICAL by turns alone with the default configuration`: its 74%/500 turns and 75%/1 turn cases are rows 74 and 75 of the boundary `it.each` (asserted with turns 1 and 500); 30%/10,000 turns is covered by row 49 at 500 turns. FR-01/TC-01 stays in that describe.
  - `zone-classifier` `inherits the ceiling from the configuration instead of constants`: a hardcoded ceiling is killed by `classifies with custom percentages and turns` (59% → CRITICAL with a 59% ceiling).
  - `zone-guidance` `uses the generic action in GREEN/YELLOW without the reset marker` (2 rows): same calls and literals as the GREEN and YELLOW rows of `uses the RED trigger in %s` (below the trigger the command is never read).
  - `zone-guidance` `never mentions a plan, checkpoint, or blocked tools`: every action text is pinned exactly by the per-zone rows, so added wording fails them; it killed no mutant.
  - `zone-guidance` `asks for the handoff from the RED trigger in GREEN/YELLOW` (2 rows): below the trigger the mode is never read; same literals as the GREEN/YELLOW rows above.
  - `zone-guidance` `asks for the handoff from YELLOW when the trigger is YELLOW`: same trigger guard (line 16) as `starts at YELLOW when the trigger is YELLOW`; prd-14 TC-01 lists only RED and CRITICAL.
  - `zone-guidance` `keeps the generic action with restart off and no snapshot command`: identical calls to the RED/CRITICAL rows of the restart-off `it.each` (default mode `'off'`); prd-14 TC-01 "restart off" moved to that describe's title.
  - `telemetry-block` `declares version 3`: a constant test (Trivial); `[ContextBrake v3]` is in every exact string.
  - `telemetry-block` `keeps the byte order of the fields`: the exact-string tests pin the order.
  - `telemetry-block` `keeps the block without the debug mode byte-identical to the documented line`: same shape as `marks a measured reading…` (measured, harness, debug off, exact).
- **Merged:**
  - `zone-guidance` `keeps the snapshot command action when a command is configured` (RED and CRITICAL with mode `'snapshot'`) → the CRITICAL row of the restart-on `it.each`, which keeps prd-14 TC-01's "restart on with a skill" case; its RED call duplicated `uses the RED trigger in RED`.
  - `telemetry-block` `renders a null usage without a token value as zero` and `renders a null reading as zero inside the debug line` → one exact-string test of the debug block with a null usage (both `tokens()` call sites).
  - `telemetry-block` `omits the ceiling when the default configuration has no turn limits` (which also asserted that `DEFAULT_CONFIG` has no turn limit, a constant check) and `shows the turn where RED starts…` → one `it.each` with both TC-05 rows.
  - `telemetry-block-budget` worst-case `it.each`, 12 rows (zone × configuration) → 4 rows (one per zone) that check all three configurations with a labeled assertion; the three GREEN rows rendered the same action.
- **Rewritten (1):** `appends the prefilled line with the values of that same block` built its expected value from `renderTelemetryBlock({ debug: false })` (recomputing the implementation); it now asserts the full literal.
- **Moved (1):** `keeps a 200-character command block under 400 characters` from `zone-guidance` to `telemetry-block-budget` (a block budget), titled with its requirement prd-06 NFR-05 and rendered with the worst-case values.
- **Created:** none (one assertion added to `reports the turn limits and the RED start only when both are set` for the 12:7 survivor).
- **Kept:** everything else above.

Mandated rows: every usage boundary (49/50/65/66/74/75/130) and turn boundary (59/60/99/100/10,000) stays; the exact block, debug line and resume text stay as literal assertions; the 60-token/220-character budget still checks every zone and action variant.

### Production pending items
- `zone-guidance.ts` line 16: the `zone === 'GREEN' ||` guard is redundant while `SNAPSHOT_TRIGGER_ZONES` excludes GREEN (two equivalent mutants). Optional cleanup; keep it if GREEN may become a trigger.

### Questions `[?]`
- None.

## 35. telemetry/session-zone-usage — done 2026-10-10

**Baseline:** 50 runner tests across the 6 files, green (the table's 42 was the grep count; `session-zone` 11, `session-zone-statusline` 11, `session-zone-reset-window` 4, `usage-resolver` 14, `window-origin` 8, `window-trust` 2). Stryker (`--disableBail`) on `session-zone.ts`, `usage-resolver.ts`, `window-trust.ts` with these 6 files: **95.95%** (71 killed, 3 survived, 0 no coverage); per file 93.33% / 100% / 90.91%. Coverage proxy: lines 100%, branches 94.59% (`session-zone.ts` 90%, lines 21 and 28).
**Result:** 34 tests in 5 files, green. Stryker on the same scope: **98.65%** (73 killed, 1 survived, 0 no coverage); per file 96.67% / 100% / 100%. Coverage proxy: lines 100%, branches 97.29% (`session-zone.ts` 95.23%, line 21 only). Related suites green: `unit/brake-engine-*`, `unit/statusline-summary`, `unit/in-process-host`; `npm run typecheck` green. Commit `058049a`.

Every deletion was checked against the `--disableBail` kill map: before the cleanup only 3 tests killed an exclusive mutant (the `at the reset` row, the `resolveUsageWithConfig` test, `uses the declared window…`), and all are kept.

### session-zone.ts → Critical (readings and windows feeding the zone, recovery after a reset)

| Behavior | Mutant | Test |
|---|---|---|
| the engine injects the block `readZone` produces (DEC-20) | engine passes other inputs to `readZone` | `renders the same block the engine injects for critical usage over many turns` |
| below the activation threshold the engine stays neutral (CA-12) | neutral branch removed | `renders a block below the activation threshold…` (module 30 relies on it) |
| pending characters add to the ledger's; the pending turn, not the ledger's, meets the turn limits (prd-02.1 FR-02) | `+` → `-` on characters; `inputs.turns` → `summary.turns` | `classifies $label` (2 rows, exact estimate/percentage/zone) |
| a transcript measurement at or before the reset is stale (FR-06, DEC-09, TC-11) | `<=` ↔ `<`/`>`; `isStale` guard removed | `reads a measurement taken $moment the reset as $source` (3 rows) |
| status line window feeds the percentage, also after a reset (prd-02.2 FR-04, FR-06, TC-03) | `?? statusline.windowTokens` removed | `computes the percentage over the recorded window…`, `keeps the recorded window after a reset` |
| bridge tokens after the reset measure; at or before it they don't (TC-04) | bridge `isStale` skipped (`?? undefined` → `&& undefined`) | `measures from status line tokens…`, `estimates when the status line tokens were $label` (2 rows) |
| transcript beats bridge; a stale transcript falls back to the bridge | `??` operands swapped; stale transcript kept | `prefers transcript tokens…`, `falls back to status line tokens…` |
| no bridge: measured tokens over the ceiling, with percentage, zone and the parallel estimate (TC-05) | `estimate` taken from the reading; percentage over the wrong window | `classifies measured tokens over contextWindowCeiling…` (full `ZoneReading`) |
| harness window wins over the status line window, even from a stale reading (TC-05, TC-22) | `transcript?.contextWindow` instead of `inputs.measured?.contextWindow`; operands swapped | `lets a Pi-reported window win…`, `keeps a harness window from a stale reading…` |
| estimate over the recorded window after a compaction (TC-22, recovery) | window dropped with the usage | `estimates over the status line window after a compaction…` |

### usage-resolver.ts → Critical (estimate formula, source and window origin)

| Behavior | Mutant | Test |
|---|---|---|
| baseline + ceil(chars/4) + turns × per-turn (RF6–RF8, CA-10, TC-28) | arithmetic operators; `ceil` → `floor`/`round` | `adds baseline, quarter of observed characters, and turns`, `rounds observed characters up` |
| harness tokens and window, source `measured` (CA-09) | `tokens !== null` inverted; origin literal | `uses the harness tokens and window…` |
| null tokens fall back to the estimate over the harness window or the ceiling (PRD 2.2 DEC-06, TC-22) | `measured &&` → `\|\|`; `?? null` removed | `falls back to the estimate over window $expected.windowOrigin…` (2 rows) |
| a measurement without a window uses the configured ceiling (FR-07, DEC-10, TC-10) | ceiling hardcoded | `uses the configured ceiling as the window of a measurement without one` |
| declared window and its origin (prd-09 TC-01) | `!== undefined` → `false`; origin literal | `window-origin` `uses the declared window on a harness without a window source` |
| `resolveUsageWithConfig` passes the config ceiling | body emptied | `uses the configured window ceiling when the harness supplies no window` (dead code, see pending) |

### window-trust.ts → Critical (declared window gate)

| Behavior | Mutant | Test |
|---|---|---|
| declared window only when `context_usage` is `unsupported` (prd-09 FR-05) | `=== 'unsupported'` → `true`/`!==`; `entry.id === 'context_usage'` → `true` | `accepts the declared window only when the harness reports no context usage` (+1 assertion), `window-origin` `ignores the declared window when context_usage is %s` (2 rows) |

Survivor, equivalent: `session-zone.ts` 35:37 (`lastResetAt === null` → `false`): `Date.parse(null)` is `NaN` and `x <= NaN` is false, so the guard changes nothing observable. The baseline survivors 28:26 (bridge usage never stale-checked) and `window-trust.ts` 4:39 (first capability taken regardless of id) are now killed: the first by an `it.each` row with a status line line appended after the reset line but timestamped at the reset (the race between the bridge process and the reset), the second by one assertion with another capability listed first.

### Actions
- **Deleted (14):**
  - `session-zone` `uses the no-plan action from the plan guidance for a yellow session without a plan file`: cites prd-02.1 FR-08/DEC-05/TC-07 (plan and no-plan variants) and prd-02 DEC-HIL-04 (an acceptance gate), all superseded by prd-12's single mode; the YELLOW action text is pinned exactly by `zone-guidance` (module 34).
  - `session-zone` `keeps a timestamped measurement when the session has no reset`: its only mutant (35:37) is equivalent; the measured reading with no reset is asserted by `classifies measured tokens over contextWindowCeiling…`.
  - `session-zone-statusline` `renders tokens=200000/1000000 in the telemetry block`: same arrangement as `computes the percentage over the recorded window…`, which asserts TC-03's 20%, tokens/window and source on the reading; the block format is module 34's exact-string tests.
  - `session-zone-statusline` `ignores a statusline line without a window`: null windows are dropped by `summarizeStatusline` (`statusline-summary` `does not let null values overwrite…`, module 12); the resulting path is the no-bridge test.
  - `session-zone-reset-window` `renders the recorded window in the telemetry block of an estimated reading`: same reading as `estimates over the status line window after a compaction…` (exact `toEqual`), rendered by module 34's code.
  - `session-zone-reset-window` `estimates over contextWindowCeiling without any window source`: the stale-transcript rows cover the estimate, and the `usage-resolver` null-token row with window `null` covers the ceiling.
  - `usage-resolver` `resolves the empty-estimate baseline for the first event of a session`: the exact formula test kills the same mutants.
  - `usage-resolver` `applies a window change reported mid-session`: `resolveUsage` is stateless; each call's window is pinned by `uses the harness tokens and window…`.
  - `usage-resolver` `keeps the parallel estimate available for measured sessions`: repeated two other tests' values; the parallel `estimate` of a measured reading is now asserted on `readZone` (the full `ZoneReading` in the no-bridge test).
  - `usage-resolver` `returns the resolver reading for %s` (4 rows): compared `readZone` with `resolveUsage` (oracle from the implementation) and killed nothing exclusive; each row has a literal counterpart (no measurement: `classifies $label`; transcript tokens: the no-bridge test; harness window: `window-origin` `uses the harness window…`; null tokens: the resolver `it.each`). TC-05 stays in the statusline describe.
  - `window-trust` `costs at most 10 tokens for the window field (NFR-02)`: encoded a string literal, not code output; prd-09 TC-06 assigns NFR-02 to the block tests, and `telemetry-block-budget` (describe cites prd-09 NFR-02) measures the worst case with `window=declared`.
- **Merged:**
  - `session-zone` `renders the same block the engine injects for %s` 3 rows → 1 (critical over many turns): the yellow and red rows killed the same mutants.
  - `session-zone` `prefers measured usage when the harness reports it` + `session-zone-statusline` `uses contextWindowCeiling when the ledger has no statusline lines` → `classifies measured tokens over contextWindowCeiling when the ledger has no statusline lines` (asserts the reading, estimate 15150, percentage 78 and CRITICAL).
  - `session-zone-statusline` `estimates when the status line tokens were recorded before the last reset` + `…share the reset timestamp` → `estimates when the status line tokens were $label` (2 rows); the second row now places the line after the reset line, which kills survivor 28:26 (before, both rows were dropped by the summary's position rule).
  - `usage-resolver` `falls back to the estimate over the harness window…` + `estimates over the configured ceiling when the harness reports neither…` → one `it.each` with full `toEqual` on both rows.
- **Rewritten (1):** `session-zone` `counts pending characters and turns on top of the ledger` (asserted `toBeGreaterThan` and two zones) → `classifies $label` with exact estimate, percentage and zone. Stale `it.each` titles now name the moment and the source instead of printing the timestamp.
- **Created:** 1 `it.each` row in `classifies $label`: turn limits 59/99 and a pending turn of 100 over a ledger turn of 1 → RED at 23% usage. It is the mandated prd-02.1 FR-02 row for how the event's turn reaches the classifier (`inputs.turns` → `summary.turns` is a mutant Stryker does not generate). Plus 2 assertions (`window-trust` capability order; the full `ZoneReading` in the no-bridge test).
- **Moved:** the 2 remaining `session-zone-reset-window` tests into `session-zone-statusline.test.ts` (same fixtures and helpers; 75 non-blank lines), file removed. `session-zone.test.ts` (59) + `session-zone-statusline.test.ts` (75) exceed 100 lines, so the split by concern stays. No lane entries.
- **Kept:** everything else, including the module 21 (`window-origin` harness and `unknown`), module 30 (`session-zone` CA-12 neutral `PreInvocation`, now line 35) and module 10 (`window-origin` `keeps declaredContextWindow through a config rewrite…`) carry-forwards; `leaves it out by default` stays (prd-09 TC-05 "absent by default"; its second assertion protects `normalizeTurnLimits` omitting the key).

Mandated rows: stale-reading boundaries before/at/after the reset (FR-06, DEC-09), bridge tokens before/at/after the reset, the recorded and harness windows after a reset, and the turn reaching the classifier with limits (FR-02) are asserted; the usage and turn boundaries themselves are module 34's `zone-classifier` tables.

### Production pending items
- `usage-resolver.ts` `resolveUsageWithConfig` has no production caller: remove it and its test together.
- `session-zone.ts` 35: the `lastResetAt === null` operand is redundant (equivalent mutant); optional cleanup.
- `session-zone.ts` 21: `reading.usedTokens ?? 0` is unreachable (`resolveUsage` never returns a null `usedTokens`); it exists because `UsageReading.usedTokens` is `number | null`.

### Questions `[?]`
- The `session-zone` engine describe cites `TC-16`, which matches no row for this behavior (prd-02 TC-16 is the allowlist; DEC-20 is prd-04's `readZone` extraction, from the superseded runner). Left as is.

## 36. brake/engine-failure-policy — done 2026-10-10

**Baseline:** 35 runner tests across the 6 files, green (`brake-engine-debug` 3, `brake-engine-lifecycle` 8, `failure-policy` 5, `failure-policy-snapshot-reset` 3, `injection-policy` 8, `reset-notice` 8). Stryker (`--disableBail`) on `brake-engine.ts`, `failure-policy.ts`, `injection-policy.ts`, `reset-notice.ts` with these 6 files: **79.14%** (129 killed, 26 survived, 8 no coverage); per file 92.86% / 64.47% / 100% / 78.57%. Coverage proxy: lines 98.23%, branches 90.66% (`failure-policy.ts` lines 63-64; branch gaps `brake-engine.ts` 41, `reset-notice.ts` 4).
**Result:** 35 tests in 7 files, green. Stryker on the same sources with the 7 after-state files: **92.02%** (150 killed, 11 survived, 2 no coverage); per file 96.43% / 89.47% / 100% / 78.57%. Coverage proxy: lines 100%, branches 96.42% (`brake-engine.ts` 41, `failure-policy.ts` 40, `reset-notice.ts` 4). Related suites green: `integration/claude-mod-restart`, `claude-runtime-session-key`, `handoff-deadline`, `runtime-claude-measured`, `runtime-codex-measured`, `runtime-opencode`, `unit/hook-deadline`, `process-hook-host`, `process-hook-host-deadline`, `in-process-host`, `session-zone`, `test-lanes`; `npm run typecheck` green. Commit `1f248a5`.

Central finding: `resolveFailure` never reads `input.ledger` or the zone. It decides from the event kind, the code, the descriptor's `session_boot` capability and the resume command only, so the mandated four-zone rows kill identical mutants by construction. They stay as the guard against a zone-dependent failure policy coming back (prd-02's deny above the ceiling, which prd-12 removed).

### failure-policy.ts → Critical (failure policy, mandated in every zone; recovery on a session reset past the deadline)

| Behavior | Mutant | Test |
|---|---|---|
| an adapter failure lets the tool call proceed in GREEN, YELLOW, RED and CRITICAL, recording code, detail, phase and elapsed time (RF19, CA-16, DEC-09, TC-17, prd-12 FR-07, TC-10) | non-neutral decision for a tool call; `kind === 'session_reset'` → `true`; `&&` → `\|\|`; record dropped | `lets the tool call proceed after a deadline failure in %s and records it` (4 rows, resume command and session boot configured, so a forced-true condition would inject) |
| a failing error log still lets the call proceed | `try/catch` around `errors.append` removed (no Stryker operator; catch body `{ return; }` → `{}` is equivalent) | `lets the tool call proceed when the runtime error log cannot be written` |
| each failure class maps to its code and detail | each `instanceof` → `true`/`false`; code and detail literals | `maps every failure class to its documented code and detail` (+ `INVALID_CONFIG` / `InvalidConfigurationError schemaVersion`) |
| work settles with its own value or error before the deadline; past it, a deadline error | resolve or reject callback emptied; timer removed | `settles with the work before the deadline and rejects with a deadline error after it` |
| session reset past the deadline injects the resume text only with session boot (prd-12 FR-05) | `some` → `every`; `?? DEFAULT_CONFIG` → `&&`; `text === null` inverted | `injects the configured resume command on a harness with session boot` (descriptor lists another capability first) |
| …and stays neutral without a configuration (FR-06), for another failure, without session boot, or without a descriptor | `code === 'DEADLINE_EXCEEDED'` → `true`; `entry.state === 'supported'` → `true`; `&&` → `\|\|` in the capability check; `descriptor?.` → `descriptor.`; `?? false` → `?? true` | `stays neutral $label` (4 rows) |

### brake-engine.ts → Critical (wires zone, injection, actions and the reset notice)

| Behavior | Mutant | Test |
|---|---|---|
| post-tool appends the tool line (next turn, call id, estimated or measured reading) and injects the YELLOW block (RF12, RF13, CA-01, CA-06, TC-06) | `usedTokens ?? 0` → `&& 0`; turn or `toolUseId` not stored | `appends the $source tool line and injects the YELLOW block` (2 rows) |
| first tool line writes the session line; observed characters default to 0 | `ensureSessionLine` emptied; `?? 0` → `&& 0` | `writes the derived session line on the first tool line` |
| duplicate call ids are skipped; GREEN below the threshold is neutral | `toolUseId !== null` → `===`; `sessionLine !== null` → `false` | `skips a duplicate call identifier…` |
| debug mode injects the block and debug line at 10% GREEN (prd-08 FR-06, DEC-07) | `debug:` passed as `false` to `decideInjection` or the block | `injects the telemetry block at 10% GREEN…` |
| reset line and prune only on a new session; pre-invocation telemetry without a tool line; unreadable ledger → `LedgerUnreadableError` | switch cases; `pre_invocation` body; catch emptied | kept as is |
| reset notice: exact `/clear` text; restart on adds the resume clause; a mid-text marker or a harness without a new-session command stays neutral (RF22, prd-14 DEC-18) | `newSessionCommand === null` → `false`; `restartMode(...) !== 'off'` → `false`; `!endsWithResetSignal` → `false` | `$label` (4 rows) |

### injection-policy.ts → Critical (zone action delivery, activation threshold boundary)

| Behavior | Mutant | Test |
|---|---|---|
| non-GREEN zones always inject (TC-05 YELLOW by turn count) | `zone !== 'GREEN'` → `false` | `decides true for a session YELLOW by turn count…` |
| GREEN injects from the activation threshold: 40 yes, 39 no | `>=` → `>`; `\|\|` → `&&`; threshold hardcoded | `decides $expected for a GREEN session at / one point below the threshold` (2 rows) |
| `always` mode injects in GREEN below the threshold | `=== 'always'` → `false` | `decides true for a GREEN session below the threshold in the always mode` |
| debug on injects below the threshold (prd-08 TC-04, FR-03, DEC-04) | `input.debug \|\|` → `false \|\|` | `delivers the block for a GREEN session below the threshold when debug is on` |

### reset-notice.ts → Critical (agent-facing reset signal and user notice)

| Behavior | Mutant | Test |
|---|---|---|
| the marker counts only at the end of the reply (RF22, prd-14 FR-12, TC-11) | `trimEnd` → `trimStart`; `endsWith` → `startsWith` | `recognizes the marker alone…`, `does not recognize the marker in the middle…` (module 15 relies on both) |
| exact notice for `/clear` and `/new`, resume clause when restart is on (DEC-18) | suffix literals; template | `renders the notice with the harness command and says it resumes by itself…` (module 30 relies on the exact `/new`) |

### Decision 3: `reset-notice.test.ts` split

The `reset notice channels per harness` describe imports all eight adapters and asserts their descriptors, `render*Decision` Stop channels and the Pi/Oh-My-Pi `ctx.ui.notify` handlers: adapter behavior, so it moved to `tests/integration/reset-notice-channels.test.ts`. The `reset signal detection` describe tests the shared core rule and stays in `tests/unit/reset-notice.test.ts` (module 15's note). A split cannot be one `git mv`: the file was moved with `git mv`, then the unit file was recreated with the core describe. No lane entries.

Survivors, all equivalent or unobservable: `failure-policy.ts` 12, 15, 18 (six message and `this.name` literals of the three error classes: `failureDetail` uses `constructor.name` and nothing reads `.message` or `.name`; records carry metadata only); 62:11 (catch `{ return; }` → `{}`, both swallow); 40:130 no coverage (`'InvalidConfigurationError'` for an error with no issues; the validator always reports at least one). `brake-engine.ts` 35:7 (`toolUseId !== null` → `true`: `summarizeLedger` stores only non-null ids, so `has(null)` is false); 62:116 (`{ cause: error }` → `{}`: no production reader of `cause`). `reset-notice.ts` 4:10 optional chain and 4:82 `?? false` (`split` never returns an empty array) and 4:31 regex `\r?\n` → `\r\n` (the last line ends with the marker exactly when the trimmed text does; module 15 note).

### Actions
- **Deleted (8):**
  - `brake-engine-debug` `stays neutral at 10% GREEN when the debug mode is off`: same neutral-below-threshold decision as `skips a duplicate call identifier and writes a green line below the threshold` (null id at 0%), and the debug-off half of TC-04 is the `injection-policy` 39% row.
  - `brake-engine-debug` `leaves the stored injection mode unchanged`: the engine never writes the configuration; it killed no mutant.
  - `failure-policy` `stays neutral when the ledger cannot be read`: `resolveFailure` never reads the ledger, so it was the same call as the zone rows; the engine side is `surfaces an unreadable ledger as a dedicated error`, end to end `runtime-failure-policy` (module 31).
  - `injection-policy` `delivers the block for a YELLOW session in the default mode` and `delivers on every non-GREEN zone`: the same `zone !== 'GREEN'` operand as the YELLOW-by-turn-count row. `delivers nothing for a GREEN session below the threshold` and `keeps the threshold for the same session when debug is off`: same mutants as the 39% row (debug off).
  - `reset-notice` `registers no notice channel for OpenCode`: two bare `toBeDefined()`; the plugin's hook shape is `runtime-opencode` `registers no pre-tool hook…`, its null command is the descriptor test.
- **Merged:**
  - `failure-policy` `stays neutral below the ceiling…` + `…at the last recorded critical zone (prd-12 FR-07, TC-10)` + the `resolveFailure` half of `rejects with a deadline error…` → the four-zone `it.each` (identifiers kept in the describe).
  - `failure-policy-snapshot-reset` `stays neutral without a resume command` + `stays neutral with the default snapshot section (prd-12 FR-06)` (one branch, `resumeText` → null) → the row `without a configuration, so without a resume command (prd-12 FR-06)`, which also exercises `config ?? DEFAULT_CONFIG`.
  - `brake-engine-lifecycle` `appends the tool line and injects at yellow` + `records a measured reading from the in-process host` → `appends the $source tool line…` (2 rows); `notifies the user only for the final reset signal` → `$label` (4 rows).
  - `injection-policy` → one `it.each` (4 rows) plus the debug test.
  - `reset-notice` `says the new session resumes by itself…` + `renders the notice with the harness command` → one test with the three exact strings.
- **Rewritten:** `maps every failure class…` as one table, now with `InvalidConfigurationError` (2 survivors, 3 no-coverage). The deadline test asserts `runWithinDeadline` alone, with the resolve and reject paths (2 no-coverage). The Pi/Oh-My-Pi notice test asserts the literal `/new` notice instead of `renderResetNotice('/new')`, uses `registerExtension` and a `mkdtemp` root removed after each test (it wrote under a shared `tmpdir()/cb-t07-reset`). `writes the derived session line…` also asserts the stored `toolUseId` (kept from the merged yellow test).
- **Created (rows):** zone rows YELLOW and RED (mandate: all four zones; module 31 covers only GREEN and CRITICAL); `lets the tool call proceed when the runtime error log cannot be written` (mandated failure path, no test anywhere); `stays neutral` rows `for another failure of the session reset` (51:47), `on a harness without session boot` (67:51, 67:82, the `||` at 51:7), `before the harness descriptor is known` (67:10, 67:114); engine notice rows `restart is on` (55:95) and `without a new-session command` (54:7).
- **Moved:** the adapter describe to `tests/integration/reset-notice-channels.test.ts` (Decision 3).
- **Kept:** everything else, including the module 15 (`reset signal detection`), module 22/23 (descriptor and Stop-channel assertions, Pi/Oh-My-Pi notify) and module 30 (exact `/new` notice) carry-forwards.

Mandated rows: failure policy in every zone (GREEN, YELLOW, RED, CRITICAL) is asserted here at the unit level, plus the failing error log and the session-reset recovery; the exact reset notice is asserted for `/clear`, `/new` and the restart-on clause.

### Production pending items
- `FailureResolutionInput.ledger` has no reader in `resolveFailure`: remove the field and the callers' argument.
- `failure-policy.ts` 12, 15, 18: the error messages and `this.name` assignments are never read (`failureDetail` uses `constructor.name`); optional cleanup.
- `reset-notice.ts` 4: `endsWithResetSignal` is `text.trimEnd().endsWith(SESSION_RESET_SIGNAL)`; the split, `at(-1)` and `?? false` are redundant (three equivalent mutants).

### Questions `[?]`
- `brake-engine-debug` describe cites prd-08 `TC-09, TC-10`, which the prd-08 TechSpec assigns to `init-debug-mode` and `doctor-mode-text`. Left as is; FR-06 and DEC-07 match.

## 37. runtime/hosts — done 2026-10-10

**Baseline:** 38 runner tests across the 8 files, green. Stryker (`--disableBail`) on `hook-deadline.ts`, `hook-failure.ts`, `in-process-host.ts`, `process-hook-host.ts`, `runtime-composition.ts`, `runtime-paths.ts`: **69.37%** (153 killed + 1 timeout, 54 survived, 14 no coverage); per file 91.43 / 86.67 / 54.35 / 54.55 / 85.00 / 77.50. Coverage proxy: lines 96.56%, branches 89.47%.
**Result:** 34 tests in the same 8 files, now under `tests/integration/` (Decision 3), green. Stryker on the same sources: **81.98%** (181 killed + 1 timeout, 27 survived, 13 no coverage); per file 97.14 / 86.67 / 76.09 / 75.76 / 100 / 75.00. Coverage proxy: lines 97.59%, branches 95.14% (`hook-failure.ts` 25-26, `in-process-host.ts` 43-44 and 72-74, `process-hook-host.ts` 51, `runtime-paths.ts` 42). Related suites green: `handoff-deadline`, `handoff-deadline-hosts`, `runtime-codex`, `runtime-session-ledger`, `runtime-retention`, `unit/test-lanes`, `runtime-failure-policy`, `runtime-opencode`, `runtime-pi`, `claude-runtime-session-key`, `runtime-host-process`; `npm run typecheck` green. Commit `50fc2a6`.

### Levels
`hook-deadline.ts`, `hook-failure.ts`, `process-hook-host.ts`, `in-process-host.ts` → Critical (deadline timing and phase record; failure policy: a host failure or deadline lets the tool call proceed with exit 0; hook process boundary). `runtime-composition.ts` and `runtime-paths.ts` → Common (config load; ledger path and subagent separation).

| Behavior | Mutant | Test |
|---|---|---|
| work settled in time never expires later, even after `extendTo` (prd-14 FR-03) | `timer === undefined` guard → `false` (39); `finally` emptied (47) | `resolves work that finishes in time and never expires after it, even when extended` (was `not.toThrow`) |
| deadline error carries the running phase and whole ms since the hook start; other errors carry no timing (FR-11, TC-16) | `now() - startedAt` → `+` (55) | `times out with the running phase and the whole milliseconds…` (injected clock, exact `{ phase: 'prune', elapsedMs: 42 }`) |
| in-process host passes the measured input to the engine and never writes stdout (TC-32) | `{ ...engineInput, onPhase, deadline }` → `{}` (32) | `returns the engine decision for the measured input without writing to stdout` |
| write-through cache per session and agent (DEC-16): a foreign write stays unseen until a reset; session line written once | cache bypass (54, 30 `→ true`); `appendSessionLine` emptied (59); `entryKey` collapsed (84, 85) | `keeps a write-through cache per session and agent…` (exact line shapes plus the subagent ledger) |
| a new session prunes stale ledgers through the cached ledger | `pruneStaleSessions` emptied (75) | `prunes a stale session ledger on a new session…` (was a bare neutral assertion) |
| process host answers mapped and unmapped events, malformed stdin parses to `null`, a `null` render writes nothing; exit 0, stderr and error log empty | `event === null` guard (79); `NEUTRAL` literal (9); `parsePayload` body and catch (91-94); `text !== null` (89) | `answers $label, exits zero, and leaves stderr and the error log empty` (3 rows) |
| failures let the tool call proceed with the exact code on stderr (DEC-09, TC-17, CMP-17, TC-15) | catch path, stderr line | `lets the tool call proceed after $label…` (2 rows); invalid config above the ceiling (prd-12 TC-10) |
| stdin cap keeps the first bytes across chunks; the real cap is 16 MiB (CMP-17; module 30 relies on it) | `maximumBytes - size` → `+`; `<= 0` → `false`; `+=` → `-=`; `16 * 1024 * 1024` arithmetic (8) | `keeps the first bytes up to the maximum across chunks and caps the real stdin at 16 MiB` |
| session start gets its own limit; a tool call of the same duration fails (FR-10, DEC-11, TC-15) | limit swap after `extendTo` | `records $records deadline failures for $eventName…` (2 rows) |
| unreadable config path rejects with its own error; invalid syntax with the syntax issue | `isMissingFileError` → `true` (34); syntax catch emptied (41) | `rejects an unreadable file with its own error, and invalid syntax and invalid values…` |

### Actions
- **Moved (Decision 3):** all 8 files `tests/unit/` → `tests/integration/` with `git mv`; no `tests/test-lanes.ts` entries (in process, parallel lane); no name collisions.
- **Deleted (4):**
  - `runtime-composition` `wires the ledger under the project runtime directory`: 0 exclusive kills; every `process-hook-host` test runs `composeRuntime` with the real ledger and error log (`awaits an asynchronous input mapper…` asserts the error log).
  - `runtime-paths` `hashes the session and agent identifiers into thirty-two hex characters`: same hash as `resolves the ledger inside the runtime sessions directory…`, which asserts it inside the path.
  - `runtime-paths` `ignores the whole runtime directory through a single LF-terminated gitignore line`: constant test; `runtime-session-ledger` `creates the runtime gitignore on the first write and never overwrites it (DEC-16, TC-29)` asserts `'*\n'` on disk and the never-overwrite rule. It is the one per-file Stryker drop (`runtime-paths.ts` 77.5% → 75%): 7:42 and the 29-46 `writeGitignoreIfMissing` mutants are killed by that out-of-scope test.
  - `in-process-runtime` `never writes to stdout from a registered in-process handler`: 0 exclusive kills; the stdout spy moved into the invalid-config rows, and `in-process-host` asserts the host never writes stdout.
- **Merged:** `process-hook-host` `records DEADLINE_EXCEEDED when the internal deadline elapses` + `-deadline` `names the phase of a failure before the event is known` (same slow-stdin arrangement) → `lets the tool call proceed and names the stdin phase…` in `-deadline`. `-deadline` `records DEADLINE_EXCEEDED when a session start passes its own deadline` + `names the running phase and the elapsed milliseconds` (two 700 ms runs of the same hook) → one test. `lets a session start finish past the event deadline…` + `keeps the event deadline for a tool call of the same duration` → 2-row `it.each` (the only process-host proof of the event limit after `extendTo`). `records a payload error…` + `stays neutral when the project root cannot be resolved` → 2-row `it.each` with exact stderr. `in-process-runtime` invalid config below/above the ceiling → 2-row `it.each`. Identifiers kept in titles and describes.
- **Rewritten:** the two `hook-deadline` tests, the three `in-process-host` tests, the `runtime-composition` rejects test and the stdin cap test (rows in the table).
- **Created (rows):** `process-hook-host` response rows for an unmapped event with malformed stdin (79, 9, 91-94) and for a `null` render (89); the old response test covered only a mapped event.
- **Kept:** module 12 (`reports the prune step…` runs the `onPhase?.` callbacks), modules 21/31 (`separates a subagent from the main session…`), module 30 (stdin cap, now stronger), module 35 (`in-process-host`), `in-process-host-deadline`, `deadlineFor`, both commit tests, and the src-level `registers no tool_call handler on Pi and Oh-My-Pi` (`runtime-in-process` asserts it on `dist`, which `npm test` does not rebuild).

Mandated rows: the failure policy is asserted at both hosts. Process host: invalid payload, unresolvable project root, invalid config above the ceiling, deadline before the event is known, session-start deadline. In-process host: unreadable ledger, deadline, invalid config below and above the ceiling through Pi. Each answers neutral with exit 0 (or `undefined` in process) and records the code.

Survivors, equivalent or covered elsewhere: `hook-failure.ts` 13 (`projectRoot === null` → `false`: `recordRuntimeFailure` swallows the failed write at a null root) and 24 no-cov (`resolveFailure` does not throw); `in-process-host.ts` 61:5/65:5 (the cache is populated before any append), 42-43 no-cov (as hook-failure 24), 69/71/73 no-cov (`handle` invalidates before a reset, so the reset push short-circuits; in-process hosts write no statusline lines); `process-hook-host.ts` 41:11 `< 0` and 42:19 (a subarray of 0 or of the full length is the same), 46 (a stream error waits for the deadline and still exits 0), 28-30 (default context, real boundary in `runtime-host-process`), 51:40 no-cov, 53/72/76/83 (phase labels of steps that are synchronous, a local read, or overwritten by the engine's own phases; `project_root` is never recorded), 68:62 (the fixture adapters ignore the argument), 89:24/89:33 (an empty write is invisible at the boundary); `hook-deadline.ts` 54:35 (killed at baseline only through timing); `runtime-paths.ts` 7, 29-46 (see the deleted gitignore test), 10:41 (`SESSIONS_RELATIVE_PREFIX`, consumed by the ledger prune and the state reader).

### Production pending items
- `hook-failure.ts` 22-26 and `in-process-host.ts` 40-44: the `catch` around `resolveFailure` is unreachable (it already catches the error-log write).
- `in-process-host.ts` `CachedSessionLedger`: the reset-line cache push and `appendStatuslineLine` never run in process (invalidation precedes the reset; no in-process statusline).
- `process-hook-host.ts` 53: the initial `project_root` phase can never be recorded (a failed root resolution skips the error log).

### Questions `[?]`
- None.

## 38. storage/json-editing — done 2026-10-10

**Baseline:** 23 runner tests across the 2 files, green (`json-document-editor` 11, `json-span-safety` 12). Stryker (`--disableBail`) on `json-document-editor.ts`, `json-span-utils.ts`, `json-validator.ts` with these 2 files: **63.22%** (201 killed + 7 timeout, 76 survived, 45 no coverage); per file 66.67 / 68.72 / 46.75. Coverage proxy: lines 89.89%, branches 84.04% (`json-document-editor.ts` 31-32; `json-span-utils.ts` 21-23, 95-99; `json-validator.ts` 40-43, 52-54, 57-58).
**Result:** 21 tests in the same 2 files, green. Stryker on the same sources: **83.28%** (267 killed + 7 timeout, 47 survived, 8 no coverage); per file 91.23 / 85.13 / 72.73. Coverage proxy: lines 97.97%, branches 93.1% (`json-span-utils.ts` 98-99, `json-validator.ts` 57-58). Related suites green: `integration/claude-preservation`, `codex-cursor-user-hooks`, `hook-event-cleanup`, `minified-config`, `minified-config-lifecycle`, `retired-hook-events`, `-copilot`, `-harnesses`, `user-hook-preservation`; `npm run typecheck` green. Commit `8267fb5`.

Central finding: most baseline survivors came from `toContain`, `toBeDefined` and `JSON.parse(...).toEqual` assertions on a unit whose contract is bytes. Every edit assertion is now an exact `toBe` on the output text, which is the `tests.md` user-file mandate (byte for byte, including a second run) applied at the editor level.

### Levels
`json-document-editor.ts`, `json-span-utils.ts`, `json-validator.ts` → Critical: the single code path behind every harness config edit (`file-changes.md`: preserve non-owned bytes, apply twice without change, refuse files that do not parse).

Layout: both files stay in `tests/unit/`. They import `src/infrastructure/storage/` but are pure `string → string` transforms with no filesystem, process or fixture directory; `tests.md` layer 1 puts parsers in `unit/`, and the brief left the call open for pure transforms. Decision 3's import-based wording would move them; if the user wants the literal reading, it is a `git mv` with no lane entries.

| Behavior | Mutant | Test |
|---|---|---|
| syntax error, nested duplicate key and empty file are invalid with exact errors, and the editor refuses them with `InvalidJsonDocumentError` (UT-05, CA-06, `file-changes.md` refuse) | `!result.valid` → `false` (51); child walk emptied (26-27); `!root` → `false` (40); error map emptied (39) | `reports $label as invalid and refuses to edit it` (3 rows) |
| a nested insert keeps comments, key order, indent and final newline; a second run changes nothing (UT-19, CA-05) | format `''` for multi-line (11); `opts` → `{}` (14, 23); `formatJsonValue` prefix and join (20-22) | `preserves comments, key order, indentation, and final newline, and a second run changes nothing` |
| a nested insert keeps CRLF | `eol` not passed to `formatJsonValue` (hand mutant; no other CRLF multi-line value) | `preserves CRLF line endings through surgical edits` |
| missing parent path is created | recursion at 21 removed | `inserts into empty object and creates nested parent path` |
| append to an empty, populated (after a comment) and missing array, with an object value | `container.offset + 1` → `- 1` (39); closing indent depth (40); missing-array branch (30-31); `depth + 1` (36) | `appends array items to empty, populated, and missing arrays` |
| remove a middle own-line property and the last inline array item | own-line check → `false` (90) | `removes properties and array items cleanly` |
| minified insert emits nothing after the root; a second run changes nothing (CR-01, RF6) | compact separator; replace path | `inserts into a minified object…, and a second run changes nothing (CA-05)` |
| a comma inside a block or line comment is never a separator | `startsWith` → `endsWith` (27, 28); `indexOf('*/')` → `indexOf('')` (29) | `does not treat a comma inside a $label comment as a separator` (2 rows; commas now mid-comment) |
| a middle property whose comment precedes its comma is removed with the right comma | `isLastChild` → `true` (71, 94); `^\s*,` → `\s*,` (92); leading-comma path (95-97) | `removes a middle property whose comment precedes its comma` |
| minified removal of first, last and only property; first, middle and last item | `context.index <= 0` → `false` / `< 0` (65) | `removes object properties…`, `removes array items…` |
| removing one of two items on one line never removes the line | `&&` → `\|\|` and anchor removals in `isOnlyNodeOnLine` (75) | `removes one item of a line holding two without touching the other item` |
| nothing to remove returns the same text (the updaters loop until no change; second `remove`) | `!node` → `false` (43); `!arrayNode` → `false` (50); `!target` → `false` (52) | `returns the document unchanged when there is nothing left to remove` |
| append then remove gives back the input for final `//` and `/* */` comments in LF, compact, CRLF and missing-final-newline documents (T29.1) | comma placement and trivia slicing in `insertIntoContainer` and `removeLastNode` | `round-trips an appended item after $label` (4 rows), `keeps a final property comment attached when adding a property` |

### Actions
- **Deleted (5):**
  - `json-document-editor` `appends to a minified array without corrupting the document` and `json-span-safety` `appends to a minified array without corrupting prior items`: 0 exclusive kills; minified append is the compact round-trip row (`[1 /* keep */]` → `[1, /* keep */2]`) and `RF6` stays on the `single-line document edits` describe.
  - `json-span-safety` `re-applies the same property byte-identically on a minified document`: folded into the minified insert test as its second-run assertion (same arrangement, 0 exclusive kills).
  - `json-span-safety` `re-applies the same property byte-identically on an unindented multi-line document`: 0 exclusive kills; the second-run rule is asserted by the trivia test (indented LF) and the minified insert test; CRLF by the CRLF tests.
  - `json-span-safety` round trip `no trailing comment`: 0 exclusive kills, same mutants as the LF comment row; T29.1 names only commented final items.
  - `json-document-editor` `keeps a final property block comment attached on a compact document`: 0 exclusive kills; the compact `/* */` case is the array compact row, the property removal path is the LF property test.
- **Merged:** the two `validateJsonDocument` tests → one `it.each` (UT-05, CA-06 kept in each title); the five `expectArrayRoundTrip` tests → one `it.each` (four rows after the deletion); the two comment-separator tests → one `it.each`.
- **Rewritten (exact bytes instead of `toContain`/`toBeDefined`/`JSON.parse`):** trivia (now a nested value plus a second run), CRLF (nested value), empty-object insert, array appends (now an object value after a comment, plus a missing array), property and array removal, minified insert, comment separators (comma moved inside the comment text so `startsWith` → `endsWith` and `indexOf('')` change the result), minified removals. The duplicate-key row is nested (the root-only input left the child walk untested).
- **Created (rows):** validator `an empty file` (40-42: an empty harness file must be refused, not crash `findDuplicateKeys`); `removes a middle property whose comment precedes its comma` (8 survivors plus 5 no-coverage at 92-97); `removes one item of a line holding two…` (6 `isOnlyNodeOnLine` survivors; the mutant removes the user's other item); `returns the document unchanged when there is nothing left to remove` (5 guard survivors that crash or loop the updaters' `while (next !== cur)`).
- **Kept:** the LF property ownership test and four round-trip rows (0 exclusive kills each, kept as the T29.1 matrix: compact, LF, CRLF, missing final newline) and the CRLF insert (hand mutant above).

Mandated rows: user-file bytes are asserted exactly for every edit, with a second run on the multi-line and minified inserts and the nothing-to-remove case; refuse-unparsable is asserted for syntax, duplicate key and empty file.

Survivors, equivalent or unreachable in a valid document: `json-span-utils.ts` 16 (`findLineEndAfter` without a newline: never reached for a node inside a container), 20 (`raw.includes('\n')` guard: the split/join of a one-line value is the identity), 26 (`<=`: `text[to]` is the closing bracket), 27:70/29:40 (`± 2` before `indexOf` finds the same terminator), 30 (unclosed `/*` cannot parse; on insert there is never a real comma after the last child, since trailing commas are invalid), 47:19/60:16 (optional chains on values that always exist), 49:17 and 49:76/47:45 no-cov (same trailing-comma reason), 65:46 (`<= +1`: index 1 has a previous sibling, same result), 71:10 `false` (only reached through 94, where a non-last child without a trailing comma is the comment-before-comma layout; the row kills the `true` side), 75:35 (`[^ \t]`/`\n` variants on the text after an own-line node, which holds only spaces, a comma and a newline), 96-98 (whitespace between the comma and the node; see the pending dangling-comma item); `json-validator.ts` 6/5:22 (message and `name` wording; no caller passes a file path), 13/16 (object children are always properties with a key), 38:45 (`disallowComments: false` is the default), 41 (`parseTree` always reports an error when it returns no root), 52:98/127 (separators of a multi-error join), 55-57 (second `parseTree` on a validated text); `json-document-editor.ts` 11:32 (`includes('\n')` → `includes('')` is true, and the indent of a minified text is `''` anyway), 19:22 (`findNodeAtLocation(root, [])` is `root`), 35 (same as 11:32), 43:32 (removing by an array index: no caller; `removeJsonArrayItem` exists for that).

### Module 32 finding: `remove` does not restore Cursor's `{"version":1}` or Codex's `{"hooks":{}}`
Reproduced with the updaters in process (`updateCursorHooks`/`updateCodexHooks`, install then clear). Two separate causes:
1. **Editor** (`json-span-utils.ts` `removeNodeSpan` → `removeLastNode`): removing the only child of a multi-line container does not undo the expansion `insertIntoContainer` (line 40) made when it inserted into an empty `{}` or `[]`. Input `'{\n  "hooks": {}\n}\n'`, `setJsonProperty(…, ['hooks','A'], 1)` → `'{\n  "hooks": {\n    "A": 1\n  }\n}\n'`, then `removeJsonProperty(…, ['hooks','A'])` → actual `'{\n  "hooks": {\n  }\n}\n'`, expected `'{\n  "hooks": {}\n}\n'`. Same for arrays (`'[\n  ]'`). Minified documents round-trip (`{"hooks":{}}`). This is the Codex case and the root cause of prd-11 codereview_04 OI-07 (`{}\n` → `{\n}\n`).
2. **Adapters** (`cursor-hooks-updater.ts` `updateCursorHooks`/`updateCursorEvent` clear path; `codex-hooks-updater.ts` `removeOwnedFromEvent`): when an event key is missing, install calls `setJsonProperty(text, ['hooks', event], …)`, whose parent recursion (`json-document-editor.ts` 21) creates `hooks`; clear removes each event key but never the `hooks` key it created. Cursor `'{\n  "version": 1\n}\n'` → install → clear gives `'{\n  "version": 1,\n  "hooks": {\n  }\n}\n'` (cause 2 plus the cause 1 formatting); expected the original. The editor cannot know `hooks` was created; the plan must (an owned-key record in the manifest, or removing an emptied `hooks` that was absent before install).
No test added: a test of the expected bytes is red today, and one pinning `{\n  }` would protect the defect. `integration/remove-invalid-config.test.ts` keeps its `not.toContain` assertions until both are fixed.

### Production pending items
- `json-span-utils.ts` `removeLastNode`: removing the sole child of a multi-line container leaves `{\n<indent>}`/`[\n<indent>]` instead of the `{}`/`[]` it was inserted into (cause 1 above; OI-07).
- `cursor-hooks-updater.ts` and `codex-hooks-updater.ts` clear paths: an emptied `hooks` object that install created is left behind (cause 2 above).
- `json-span-utils.ts` `removeNodeSpan` 98: removing the first child whose comment precedes its comma leaves a dangling comma: `removeJsonProperty('{"a":1 /*x*/,"b":2}', ['a'])` → `'{ /*x*/,"b":2}'` (invalid: `ValueExpected at offset 7`); expected `'{ /*x*/"b":2}'` or `'{"b":2}'`.
- `json-span-utils.ts` `removeLastNode` 80: removing the last own-line item when a comment line follows it leaves the previous comma: `removeJsonArrayItem('{\n  "items": [\n    1,\n    2\n    // tail\n  ]\n}\n', ['items'], v => v === 2)` → `'…    1,\n    // tail\n  ]…'` (invalid trailing comma); expected `'…    1\n    // tail\n  ]…'`.
- Removing an item from an inline array leaves the separating space (`["a", "b"]` → `["a" ]`; `[\n    1, 2\n  ]` without `1` → `[\n     2\n  ]`): valid JSON, cosmetic; the tests pin the current bytes.

### Questions `[?]`
- Module 32's question (plan line 1918) is answered above: the emptied `hooks` key is a defect with two causes, one in the editor and one in the Cursor and Codex updaters. Confirm whether to fix them in a production change.
- Decision 3 for pure text transforms: kept in `tests/unit/` (see Layout). Confirm, or move both with `git mv`.

## 39. storage/change-apply — done 2026-10-10

**Baseline:** 26 runner tests across the 7 files, green. Stryker (`--disableBail`) on `change-plan-service.ts`, `manifest-change.ts`, `change-applier.ts`, `change-target.ts`, `path-boundary.ts`, `directory-pruner.ts`, `runtime-state-files.ts`, `atomic-writer.ts`: **61.73%** (276 killed + 3 timeout, 103 survived, 70 no coverage); per file 69.51 / 0 / 65.14 / 75.00 / 40.22 / 69.47 / 89.47 / 72.73. Coverage proxy (same 8 sources): lines 86.55%, branches 80.89%.
**Result:** 33 tests, green; `change-target`, `path-boundary` and `runtime-state-files` now under `tests/integration/` (Decision 3). Stryker on the same sources: **72.79%** (326 killed + 3 timeout, 73 survived, 50 no coverage); per file 82.93 / 0 / 78.90 / 75.00 / 55.43 / 78.95 / 94.74 / 72.73 (no file dropped). Coverage proxy: lines 89.24%, branches 83.63% (`change-plan-service.ts` 100% lines; `path-boundary.ts` lines unchanged, branches 62.96% → 61.53% from V8 branch counting on the same uncovered lines 19-20, 58, 71-72). Related suites green: `symlinked-harness-config`, `symlinked-harness-lifecycle`, `linked-project-root-lifecycle`, `init-remove-footprint`, `runtime-state-removal`, `init-plan`, `unit/test-lanes`; `npm run typecheck` green. Commit `54579b4`.

`manifest-change.ts` stays at 0% in both runs: no module test executes it (install-only, through `installation-service`; module 24's `init-*` suites assert the manifest end to end). The `--mutate` list is unchanged so the scores compare.

### Levels
`change-plan-service.ts`, `change-applier.ts`, `path-boundary.ts`, `change-target.ts`, `directory-pruner.ts` → Critical (the plan shared by preview and apply, the precondition that protects user edits, the write boundary, directory deletion). `runtime-state-files.ts` and `atomic-writer.ts` `deleteFileIfExists` → Common. `manifest-change.ts` → Common, covered through `init`.

Layout: `change-plan-service.test.ts` stays in `tests/unit/` (pure `src/core` service, no I/O). The three unit files that create temp directories and junctions against `src/infrastructure/` moved with `git mv` (no lane entries, no name collisions).

| Behavior | Mutant | Test |
|---|---|---|
| changes sorted by path with before/after hashes; harnesses sorted (UT-10, CA-11) | `afterSha256` → null; harness `sort` removed (65) | `orders changes and harnesses and records the before and after hashes` |
| input conflicts kept and sorted next to valid changes (UT-05, CA-06) | conflict `sort` removed (64) | `isolates conflicts sorted by path…` |
| no-op update omitted, no confirmation (CA-05) | equal-hash guard removed | `omits no-op modifications…` |
| two planned changes for one target: identical ones planned once, different ones a `CONFLICTING_CHANGES` conflict | `if (existing)` and content comparison (39-41, no coverage) | `plans an identical duplicate once`, `reports a duplicate with other content as a conflict` |
| a delete, update or create with no matching snapshot is a `SNAPSHOT_MISSING` conflict (UT-11, CA-12) | `!snap` → `false` | `reports a delete, an update, and a create without a matching snapshot…` |
| a delete of an absent file is silent | absent-delete skip removed | `skips a delete whose matching snapshot records an absent file` |
| a target edited, created or deleted after the plan fails with its reason, keeps the user state, and the other changes still apply (IT-15, CA-05; FR-09, TC-05 for a runtime delete) | `beforeSha256 === null` branches (13-14, 21-23, no coverage); `some` → `every` (78) | `fails a target $label…` (4 rows, each with an applied sibling) |
| an applied delete and a plan conflict give `warnings`, exit 1, exact outcomes (CA-12) | conflict outcome template (76) | `deletes the file and reports a plan conflict as a skipped warning` |
| empty runtime directories are pruned recursively under `remove` (DEC-04) | `recursive: true` → `false` (23) | `prunes already-empty nested runtime directories…` (fixture now two levels deep) |
| pruning never follows a linked runtime directory | `isSymbolicLink()` → `false` (59, no coverage) | `never prunes through a runtime directory that is a link` |
| `remove` reports each non-empty runtime directory deepest first, never `.context-brake` itself (prd-14 FR-13, DEC-14) | `dirs.set(contextBrakeDir, false)` → `true` (47); runtime subdirectory flag → `false` (48) | `reports each runtime directory left non-empty, deepest first…` (exact outcomes) |
| a write outside the project is refused: `..`, absolute, sibling sharing the root prefix, link pointing outside, and `..`/outside link through a linked root | `rootPrefix` without the trailing `/` (54:45) | `rejects $label` (6 rows) |
| a missing path under a linked root resolves to its canonical target | ancestor walk | `accepts a missing path under a linked root…` (exact path, was `toContain`) |
| change targets resolve through a linked directory, existing and missing (module 32 relies on it) | realpath branch (31-32); ancestor climb | `resolves %s under a link to the canonical target` (2 rows) |
| runtime files listed as sorted POSIX paths | `.sort()` removed (15) | `lists nested files as sorted POSIX-relative paths` (top-level file now sorts after the nested one) |
| `remove` keeps non-owned bytes, including after a second run (IT-09, TC-12, `tests.md` user files) | editor/updater removal | `preserves user settings…` (settings now exact bytes, plus a second `remove`) |

### Actions
- **Moved (Decision 3):** `change-target`, `path-boundary`, `runtime-state-files` `tests/unit/` → `tests/integration/`.
- **Deleted (3):**
  - `change-applier` `leaves directory snapshot completely identical in dry-run mode` (IT-08): 0 exclusive kills; `createChangePlan` is pure and `snapshotFiles` only reads, so no mutant of the dry-run path can turn it red. The dry-run guarantee lives in `init`/`remove` and is asserted by `integration/init-plan` E2E-06 (config absent after `--dry-run`), whose describe now carries IT-08 (title-only edit in module 24's file).
  - `change-target` `resolves existing file to its canonical path`: 0 exclusive kills; the existing-file case is now a row resolved through a link, which still covers lines 31-32.
  - `path-boundary` `identifies paths inside repository and rejects paths outside`: 0 exclusive kills; its `..` case is the first escape row, its `toContain` accept became the exact canonical-path test.
- **Merged:** `change-target` single- and nested-missing link tests → one `it.each`; `change-plan-service` the two snapshot-missing tests → one test with all three kinds (identifiers kept in the describe); `directory-pruner` `fails the changed runtime file and never prunes its still non-empty directory` → the runtime row of the applier race `it.each` (FR-09, TC-05 in its title; the kept file content proves the directory stayed); `path-boundary` linked-root test → rows of the escape matrix.
- **Rewritten:** plan ordering (exact hashes instead of `toBeDefined`), conflict isolation (two out-of-order conflicts), applier deletion (exact report), pruner reporting (exact outcome list; `keep.json` moved into `runtime/sessions`), `computeFileIdentity` (exact values instead of `toBeDefined`), `safe-removal` settings (exact bytes instead of a `JSON.parse` length).
- **Created (7 rows/tests):** escape rows `an absolute path outside the root` (mandated escape case, untested before) and `a sibling directory sharing the root name prefix` (kills 54:45, a real escape on every platform); race rows `created after the plan` and `deleted after the plan` (13-14 and 21-23 had no coverage; the `deleted` mutant recreates a file the user removed); the two duplicate-target rows (39-41 had no coverage; Claude Code's `statusline-planner` and `auto-restart-planner` both plan `.claude/settings.local.json`); `never prunes through a runtime directory that is a link` (59 had no coverage; on Windows the mutant removes the user's junction).
- **Kept:** `omits no-op…`, `skips a delete…`, `rejects out-of-root paths…` (change-target: `..` and outside link), `compares paths…` (only coverage of dead `arePathsEqual`), `deletes file if exists…`, the other two `listRuntimeStateFiles` tests (`falls back to entry.path…` has 0 exclusive kills on Node 24 but is the only test of the Node 20.0-20.11 `path` fallback), `prunes the emptied restart folders silently…`, `safe-removal`.

Growth (26 → 33): the 7 created rows above; the escape matrix also turns inline assertions into runner-counted rows, since every escape case is kept.

Mandated rows: user-file bytes after `remove` and after a second `remove`; every escape case (`..`, absolute, prefix sibling, outside link, linked root); a race on one file never blocks or reverts the other changes.

Survivors, equivalent or unreachable: `change-plan-service.ts` 20 (Windows lowercasing: planners and snapshots both use `realpath`), 29 (wording), 40:48 (same content, different kind: no planner emits it), 53-54 (deletes always carry `null` content; an absent-file delete is skipped at 51), 65:45; `change-applier.ts` 11:53 (a Buffer hashes like the string), 13 (wording only), 40-44 (missing-content and unchanged guards: `createChangePlan` already drops both), 49-50 no-cov (write failure: the precondition read throws first for directories), 71 (a failed delete leaves its file, so the pruner never removes the directory); `change-target.ts`/`path-boundary.ts` 16/28 (the filesystem root always resolves), 33, 35/46 (`missing` always holds the basename), 52 (`resolve(root, '')` is the root), 54:22 (Windows paths never start with `/`), 55-58 (posix branch, no coverage on Windows; Linux CI runs it), 56:82 (target equal to the root: no caller passes it), 6-7 (wording), 70 no-cov (posix `dev:ino` branch); `directory-pruner.ts` 6 (`manifest` owner: only `remove` deletes manifest files under `.context-brake/`, and it adds that directory itself), 24/28/57/60-61 (a non-directory candidate fails `readdir` and is skipped anyway), 26 (Node < 20.12 fallback), 36/39/40 (a broader candidate set only reaches `rmdir`, which refuses non-empty directories), 64 (plural wording), 69-70 no-cov (`rmdir` race); `runtime-state-files.ts` 24 (non-ENOENT errors); `atomic-writer.ts` 12/14 (encoding, `sync` errors), 18-21 no-cov (temp-file cleanup when `rename` fails), 29.

### Production pending items
- `path-boundary.ts` `arePathsEqual`: no production caller. Remove it and its test together.
- `FileSnapshot.fileIdentity` / `computeFileIdentity`: written by `snapshotFile`, never read. Use it or remove both with their test.
- `change-applier.ts` 40-45: the missing-content and unchanged guards are unreachable through `createChangePlan`.
- `change-applier.ts` `checkPrecondition`: a read error other than `ENOENT` (target became a directory, `EACCES`) rejects the whole `apply` after earlier changes were written, instead of a `failed` outcome for that target.
- `change-target.ts` duplicates `path-boundary.ts` `findExistingAncestor` and canonical resolution; `resolveChangeTarget`'s second `assertWithinRepository` (line 44) repeats the first, which already resolves links.

### Questions `[?]`
- `atomic-writer.ts` 18-21 (temp file removed when `rename` fails; `file-changes.md` "never leaves a partial file") has no test anywhere; not added here (no cheap portable failure). Confirm whether it deserves one.

## 40. gitignore/core — done 2026-10-10

**Baseline:** 39 runner tests across the 3 files, green. Stryker (`--disableBail` for kill attribution) on `gitignore-block.ts`, `gitignore-merge.ts`, `gitignore-plan.ts`: **78.15%** (236 killed, 39 survived, 27 no coverage); per file 87.29 / 100 / 63.57. Coverage proxy (same 3 sources): lines 95.31%, branches 94.64% (`gitignore-plan.ts` lines 87-89, 92-94 uncovered).
**Result:** 40 tests, green; `gitignore-plan.test.ts` split in two (`gitignore-plan-install.test.ts` holds `runtimeStatePaths` and `planGitIgnoreForInstall`, so both stay under 100 lines). Stryker on the same sources, with the four files: **92.38%** (279 killed, 18 survived, 5 no coverage); per file 91.53 / 100 / 90.71 (no file dropped). Coverage proxy: lines 100%, branches 95.16% (only 70 and 92 partial). Related suites green: `integration/init-gitignore`, `-lifecycle`, `-tracked`, `-default-runner`, `remove-gitignore`, `init-assistant-equivalence`, `unit/assistant-questions-gitignore`, `removal-service`, `installation-summary`, `test-lanes`; `npm run typecheck` green. Commit `06ff8a8`.

### Levels
`gitignore-block.ts` → Critical (the only edit ContextBrake makes to the user's `.gitignore`: insert, replace, remove, malformed markers; bytes outside the markers must survive, prd-17 NFR-01). `gitignore-plan.ts` `planGitIgnore`, `ownedPathsFor`, `runtimeStatePaths`, `planGitIgnoreForInstall` → Critical (what the block lists and which change kind the plan shows). `gitignore-merge.ts` → Common (the `--gitignore`/`--no-gitignore` truth table and the stored `gitIgnore: false`).

The second `describe` of `gitignore-merge.test.ts` (3 tests) tests `cli/init-arguments`, `cli/init-config-updates` and `installation-builder` (flag parsing, `hasConfigurationFlag`, the written config key order, schema and summary). Kept unchanged: no other test rejects `--gitignore --no-gitignore` at parse time or counts the two flags as configuration flags, and the write test also kills 20 in-scope mutants through `applyGitIgnore`. End-to-end flows stay in module 41.

| Behavior | Mutant | Test |
|---|---|---|
| a missing or empty file gets the block alone (FR-04) | `content === ''` branch removed | `creates the block alone for a missing or empty file` |
| the block is appended after the user lines with one blank line, user bytes intact (FR-04, mandated) | `closed` / blank-line template | `appends after the user lines…` |
| a last line without a break gains one, and `remove` leaves it (OI-01) | `TRAILING_BREAK.test` inverted | `adds one line break before the block when the last line has none, and remove leaves it` |
| a CRLF file gets a CRLF block (NFR-01, mandated line endings) | `lineEnding` → `'\n'` | `writes the block with CRLF in a CRLF file…` |
| an existing block is replaced in place; a second run changes nothing (FR-02, NFR-01) | span replace → append | `replaces an existing block in place and is idempotent` |
| text before and after a block that sits right after a user line survives replace and remove (FR-04, FR-06) | `TWO_TRAILING_BREAKS` without `$` or with one break (12:29) | `keeps the text around a block placed right after a user line…` |
| apply then remove restores the original, LF and CRLF (FR-06, mandated) | `LEADING_BREAK`, `TWO_TRAILING_BREAKS` | `restores %j after apply then remove` (3 rows) |
| remove of a block-only file deletes it; no block or no file is a no-op (FR-06) | `{ content: null }` / `{ content }` literals (44, 47) | `returns null content when only the block was there…` |
| an empty line list removes the block (FR-02) | `lines.length === 0` removed | `removes the block when no lines are left to list` |
| missing, reversed, doubled, repeated-start and repeated-end markers leave the file untouched (FR-04) | `starts.length !== 1` / `ends.length !== 1` → `false`, `\|\|` → `&&` (29:7, 29:30) | `reports malformed markers and changes nothing for %j` (6 rows) |
| `--no-gitignore`/`--gitignore` against the stored value, and both together (FR-05) | each branch of `mergeGitIgnore` | `stored %s with %j gives %s` (6 rows), `rejects both flags together…` |
| only `false` is stored; turning it on drops the key; absent means enabled (FR-05) | `!== false` → `=== true`; key filter | `stores false only, drops the key…` |
| owned paths: config, manifest, assets, plus link target inside the project, sorted, no target outside (FR-01, FR-03, BUG-01) | `.filter` removed (35:21, 35:115); `path.startsWith('..')` | `names the link path and the target path…`, `keeps the link path but skips a target outside…` (exact list) |
| a missing file is a `create`, an existing one an `update`, with the exact change, no conflicts or findings (FR-01, FR-04) | `before === null` → `true` (49:10, 49:39 no-cov); preview, `conflicts`/`findings` literals (55, 75) | `plans the file %j as a %s with the block…` (2 rows) |
| a current block plans nothing (NFR-01, second run) | `before === after` removed | `plans nothing when the block is already current` |
| the opt-out removes the block and deletes a block-only file (FR-05) | `enabled ?` swapped; `paths` kept when disabled | `removes the block and deletes a file…` |
| Git special characters and a trailing space are escaped (FR-01) | `SPECIAL_CHARACTERS` | `escapes characters Git treats specially` |
| malformed markers give a conflict with code and detail, no change, no finding (FR-04) | `findings` literal (74:150), code literal | `reports a conflict and no change for malformed markers` (exact plan) |
| outside Git: no change, a `GITIGNORE_NO_GIT` ok finding with project scope only when enabled (FR-07) | `conflicts`/`paths` literals (69), `scope` literal (40:54) | `writes nothing outside Git…` (exact plans) |
| runtime state files: planned-only and existing-only listed, non-runtime and deleted dropped (CR-02) | planned filter `() => undefined`, `endsWith` (82); existing filter (83) | `adds planned and existing runtime files…`, `drops a runtime file that the plan deletes…` |
| an install locates each owned file through the planned change, then the snapshot, then the root, and picks the root `.gitignore` snapshot (FR-03, CR-02, BUG-01) | `locateOwned` `??` → `&&`, `find` predicates, optional chaining (87-89, 27 no-cov); `.gitignore` find (93) | `lists the owned files, the targets of planned and existing links, and the runtime state files` |

### Actions
- **Deleted (3):**
  - `ownedPathsFor` `lists the configuration, the manifest, and the assets, sorted and without duplicates`: 0 exclusive kills; the link test lists the same configuration and manifest (both located in the root, so deduplicated) in sorted order, and FR-01 moved to its title.
  - `restores "a/\n\nb/\n" after apply then remove`: 0 exclusive kills; an inner blank line never reaches the trailing-break logic. The new "block right after a user line" case covers inner blank lines where they matter.
  - `leaves the added line break when the original had none` (OI-01): merged into the OI-01 insert test (same arrangement, both assertions kept).
- **Rewritten (6):** `keeps the link path but skips a target outside` (exact list instead of `toContain`/`not.toContainEqual`, which passed with `null` entries); `creates the file with the block alone` → `it.each` with an `update` row, asserting the whole plan; the malformed-marker conflict and the no-Git plans (whole plan instead of `objectContaining` on two fields); `keeps text after the block when it is replaced` (block moved right after a user line, plus the remove result); `runtimeStatePaths` first test (one runtime file planned only, one existing only: before, both were planned and existing, so dropping either list survived).
- **Created (4 rows/tests):** malformed rows `a repeated start marker` and `a repeated end marker` (29:7 and 29:30 survived: the four old rows never had exactly one marker of a kind repeated); the `update` row (49:10 survived, 49:39 had no coverage: no test planned an insert into an existing file); `planGitIgnoreForInstall` (lines 87-94 had no unit coverage: change-over-snapshot-over-root precedence and the `.gitignore` snapshot lookup decide which link targets the block lists, BUG-01).
- **Kept:** the CRLF, append, idempotent and empty-file block tests, the `mergeGitIgnore` truth table (6 rows, one per flag/stored cell of FR-05), `applyGitIgnore`, the three cross-source flag tests, `plans nothing when current`, the opt-out delete, the escapes, `drops a runtime file that the plan deletes`.
- **Split:** `gitignore-plan.test.ts` → `gitignore-plan.test.ts` (ownedPathsFor, planGitIgnore) + `gitignore-plan-install.test.ts` (runtimeStatePaths, planGitIgnoreForInstall); no lane entries.

Growth (39 → 40): 4 created rows/tests above against 3 removed; each created one kills a named survivor or a no-coverage block.

Mandated rows: user lines byte for byte on insert (LF, CRLF, no final newline), on replace and on remove; second run plans nothing; malformed markers leave the file untouched; opt-out removes the block.

Survivors, equivalent or unreachable: `gitignore-block.ts` 3 (message wording; tests compare to the constant), 9/10 regex `$` removed (`[^\r\n]*` is greedy, same match), 9/10 `^` removed (a marker text in the middle of a user line: not plausible), 13 unanchored `LEADING_BREAK` (the end marker consumes its line, so the tail starts with a break or is empty), 29:51/29:74 (`first`/`last === undefined` only narrow types: the length checks already return), 29:96 `<` → `<=` (two markers never share an index), 56:37 (`?? ''` only feeds `lineEnding`: any text without `\r\n` gives `\n`); `gitignore-plan.ts` 24:63 (only a path with an inner and a trailing space differs; owned asset names have neither), 29:10/29:19 (no owned path resolves to the root itself), 40:111/40:237 (finding wording), 70 (snapshot `undefined` guard: `snapshot-helper` always snapshots `.gitignore`, and `removal-service` passes the same list), 81:27/81:54 (a wider `deleted` set only drops existing paths that `planned` already lists or that fail the runtime prefix), 92:177 no-cov (`hasInstall: false`; left to module 41's `init` flows).

### Production pending items
- `gitignore-plan.ts` line 70: the `snapshot === undefined` guard is unreachable from both callers.
- `gitignore-block.ts` line 29: `first === undefined || last === undefined` exists only for type narrowing; destructuring after the length check would drop the two dead conditions.

### Questions `[?]`
- None.

## 41. gitignore/integration — done 2026-10-10

**Baseline:** 20 runner tests across the 5 files, green; all in process with the fake process runner (`makeGitProject` creates a `.git` folder, no real `git` runs), so no lane entry. Stryker on `gitignore-block.ts`, `gitignore-merge.ts`, `gitignore-plan.ts`, `cli/gitignore-findings.ts`, plus `infrastructure/git/git-context.ts` (added: only these tests cover it), `--disableBail`: **72.05%** (261 killed + 2 timeout, 83 survived, 19 no coverage); per file 75.42 / 65.91 / 70.71 / 75.00 / 72.34. The first dry run failed (`Unable to locate runtime asset`): the local config's `ignorePatterns` leaves `dist/` out of the sandbox and init needs `dist/assets/runtime`; both runs pass `--ignorePatterns '.claude,.agents,tasks,graft,coverage,logo.*'` (about 11 to 16 minutes each). Coverage proxy (same 5 sources): lines 98.75%, branches 88.88%.
**Result:** 13 tests, green. Stryker on the same scope and flags: **75.89%** (275 killed + 2 timeout, 69 survived, 19 no coverage); per file 76.27 / 65.91 / 71.43 / 87.50 / 93.62 (no file dropped, no mutant went from killed to survived). Coverage proxy: lines 98.75%, branches 87.78%. `gitignore-block.ts` still has 7 uncovered branches (v8 changed the denominator, 42/49 → 40/47). `gitignore-merge.ts` lost one: the `current === false` keep path of `--no-gitignore` (line 17). The deleted `planOf(root, ['--no-gitignore'])` exercised it, and the unit row `stored false with --no-gitignore gives keep` pins it. Related suites green: `unit/gitignore-block`, `-merge`, `-plan`, `-plan-install`, `assistant-questions-gitignore`, `removal-service`, `test-lanes`, `integration/init-assistant-equivalence`, `statusline-default`; `npm run typecheck` green. Commit `9714cd5`, plus `2eef160` (the git argv assertion compares against `realpath(root)`: the CLI realpaths the project root, and the macOS tmpdir is a symlink). The final Stryker run copied its sandbox before a reverted `init-gitignore-default-runner` edit; that test kills no mutant in this scope, so the score stands.

### Levels
The five files are integration flows of `init`/`remove` through the in-process CLI on a real temporary folder (Glue wiring over the Critical block of module 40). Kept: one test per business flow that needs the real CLI and filesystem. Module 40's units already pin the block text, the merge table and the plan objects. `git-context.ts` → Critical for FR-07/FR-08 (the walk up to a `.git` entry; the `git ls-files` query and its failure handling); no unit test exists, so these flows are its only coverage. `cli/gitignore-findings.ts` → Common (one finding builder).

| Behavior | Mutant | Test |
|---|---|---|
| the block is planned as a `create` and lists exactly the owned files, anchored, without harness files (FR-01, FR-03, FR-04) | `before === null` → `false`/`!==` (plan 49:10); `[...new Set]` → no dedup or extra paths (plan 36:10) | `plans the block as a create and lists exactly the files ContextBrake owns…` (exact list) |
| CRLF user lines byte for byte, CRLF block, second run plans nothing (NFR-01, FR-02; mandated user-file scenario) | `lineEnding` literals (block 16:24, 16:34); replace span (block 62:71) | `keeps CRLF user lines byte for byte… and plans no change on a second run` |
| outside Git: no file, `GITIGNORE_NO_GIT`, config still written; a `.git` in a parent folder enables the block (FR-07) | walk loop `parent === current` → `true`/`!==` (git-context 16:9); `insideGit` guard and finding literals (plan 39-40, 69) | `writes no .gitignore… then writes the block once a parent folder is a Git working tree` |
| a harness folder linked into the repo lists the link and the target (FR-03, BUG-01) | `locateOwned` `??` chain (plan 88) | `lists the link path and the link target path…` |
| automatic restart adds and removes the mod files, the handoff ignore, and the runtime state files (FR-01, FR-02, CR-02) | `runtimeStatePaths` return (plan 84) | `adds the mod files, the handoff ignore, and their runtime state…` |
| excluding a harness drops its script line (FR-02) | asset paths of the excluded harness kept | `drops a harness script line when the harness is turned off` |
| opt-out removes the block and keeps user lines, is stored, a plain init plans nothing, `--gitignore` brings it back and drops the key (FR-05) | `mergeGitIgnore` branches (merge 18, 24); `applyGitIgnore` key literal (merge 8) | `removes the block but keeps the user lines, stores the opt-out…` |
| malformed markers: file untouched, conflict reported, install continues (FR-04) | marker count checks (block 26, 29, 60); conflict literals (plan 74) | `leaves .gitignore untouched, reports the conflict, and still installs` |
| tracked files: `git -C <root> ls-files -z --`, finding with both names and the `git rm --cached` command, exit code unchanged (FR-08) | argv literals (git-context 24:62-93); `split('\0')`/filter (26); join separators (findings 9:133, 11:58) | `asks git ls-files, names the tracked files…` |
| no finding when git exits non-zero or the opt-out leaves no paths, and no git call then (FR-08) | `\|\|` → `&&` and `exitCode !== 0` → `false` (git-context 25); `paths.length === 0` (23:31) | `reports nothing when Git exits with an error or the opt-out is on` |
| the shipped CLI hands a runner to the Git query when none is injected (FR-08, CR-01) | `env.runner ?? new NodeProcessRunner()` → `env.runner` (`init-flow.ts` 52, outside the Stryker scope) | `passes a runner even when the caller injected none…` (kept; exercises `main(`) |
| remove restores the original file byte for byte (FR-06, OBJ-05; mandated) | `TRAILING_BREAK` regex (block 11:24); `create` literal (plan 49:39) | `restores the original file after init then remove` |
| remove dry run shows `delete`/`gitignore` and writes nothing; the real remove deletes a block-only file (FR-06) | `joined === '' ? null` (block 51) | `shows the deletion of a .gitignore that held only the block in a dry run, then deletes it` |

### Actions
- **Deleted (2):**
  - `remove-gitignore` `plans no .gitignore change when there is no block`: its exclusive kills (block 47:7, 47:37, the no-block `{ content }` return) are now killed by the merged FR-05 test, whose plain `init` after the opt-out runs `removeIgnoreBlock` on `dist/\n`. The remove side is pinned by unit `removal-service` `deletes only the owned asset… never the… gitignore…` (exact change list with a `.gitignore` snapshot that has no block).
  - `init-gitignore-lifecycle` `plans no change on a second run, with the block or without it`: its exclusive kill (block 62:71) moved into the CRLF test, which now ends with a second-run plan. The "without the block" half is the plain `init` after the opt-out in the FR-05 test.
- **Merged (9 → 4):**
  - `adds the mod files and the handoff ignore when automatic restart is on` (init-gitignore), `gains and loses the mod lines…` and `lists the runtime state files init writes and drops them…` (lifecycle) → one auto-restart on/off test with the same arrangement and every identifier. Exclusive kills kept: plan 84:10 and 84:22.
  - `removes the block, deletes a file that held only it, and a plain init keeps it off` + `keeps the user lines when the block goes away and brings it back with --gitignore` → one FR-05 flow. The kills are kept: merge 18:7 by the plain-init empty plan, the rest by the `--gitignore` step. Deleting a block-only file on opt-out is pinned by unit `removes the block and deletes a file that held only the block when disabled`, and end to end by the remove dry-run/delete test.
  - `shows the block in the plan with owner gitignore and writes nothing on a dry run` → folded into the exact-list test (same fresh project) as a `create`/`gitignore` assertion on the dry-run plan. A first after-run without it lost plan 49:10 (two mutants); the general rule that a dry run writes nothing is pinned by `init-plan` `matches changes between dry-run and applied run`.
  - `shows the block removal in a dry run and writes nothing` + `deletes a .gitignore that held only the block` (remove) → one test (dry run, then the real remove).
- **Rewritten (6, the first also a merge target):** `lists exactly the files ContextBrake owns` (`arrayContaining` + `every startsWith('/')` + `not.toContain('settings')` → exact `toEqual` list, which kills plan 36:10); the CRLF test (adds the second-run plan); the FR-07 test (runs from a `package/` subfolder, then `git init` in the parent; kills git-context 16:9 twice); both tracked tests (two tracked files and an exact remediation, captured `git` argv, and a `completed`/exit 128 failure instead of `failed`/`null`, which left `||` → `&&` alive; they also assert that no git call happens on opt-out). The malformed-markers test now asserts `activeHarnesses` instead of only that the config file exists.
- **Kept (4):** link/junction, harness exclusion, `restores the original file after init then remove`, `init-gitignore-default-runner`. A rewrite of default-runner to `toBeInstanceOf(NodeProcessRunner)` was reverted: naming the class is a `PROCESS_MARKERS` hit, which `test-lanes` `assigns every test file with a process marker…` rejects for a parallel-lane file. The file starts no process because `git-context` is mocked.
- **Created:** none. **Moved:** none; no `tests/test-lanes.ts` change.

Mandated rows: CRLF user bytes on insert and after a second run, user bytes after the block is removed by opt-out and by `remove`, malformed markers left untouched.

Survivors, equivalent or left to module 40: `git-context.ts` 23:7 (`runner === undefined` → `false`: the only caller always passes `env.runner ?? new NodeProcessRunner()`), 25:7 (`status !== 'completed'` → `false`: a `failed` or `timed_out` result never carries exit code 0), 9:40 (`() => false` → `() => undefined`, same falsy result); `gitignore-findings.ts` 8:86 and 10:13 (finding `path` and `impact` text, wording). The other 64 survivors and the 19 no-coverage mutants in `gitignore-block.ts`, `-merge.ts` and `-plan.ts` are unit-level cases (escapes, malformed-marker shapes, `isGitIgnoreEnabled`, merge rows, wording) that module 40's unit tests kill (unit-scope score 92.38%). They are not chased again through the CLI.

### Production pending items
- `git-context.ts` line 23: `runner === undefined` cannot happen from `init-flow.ts`. Making the `runner` parameter required would drop the dead guard.

### Questions `[?]`
- None.

## 42. handoff/store — done 2026-10-10

**Baseline:** 21 runner tests across the 5 files, green. Stryker (`--disableBail`) on `storage/node-handoff-store.ts`, `storage/handoff-claim-lock.ts`, `runtime/hook-deadline.ts`, `core/services/session-reset-handler.ts`: **61.75%** (129 killed + 5 timeout, 71 survived, 12 no coverage); per file 79.78 / 67.74 / 34.29 / 48.39. Coverage proxy (same 4 sources): lines 92%, branches 83.33% (`node-handoff-store.ts` 88.6% / 88.88%, `handoff-claim-lock.ts` 80.76% / 84.61%).
**Result:** 18 tests, green. Stryker on the same sources and flags: **64.98%** (136 killed + 5 timeout, 70 survived, 6 no coverage); per file 84.27 / 70.97 / 37.14 / 50.00 (no file dropped, no mutant went from killed to survived; 11 mutants improved). Coverage proxy: lines 93.14%, branches 84.78% (`node-handoff-store.ts` 91.13% / 91.48%; the `moveInto` ENOENT path 72-73 is now covered). `handoff-deadline.test.ts` drops from about 725 ms to under 60 ms: it no longer sleeps on real timers. Related suites green: `integration/hook-deadline`, `process-hook-host-deadline`, `claude-mod-handoff`, `doctor-remove-restart`, `init-auto-restart`, `omp-session-switch`, `semi-auto-restart`, `unit/session-reset-handler`, `test-lanes`; `npm run typecheck` green. Commit `169c156`.

`hook-deadline.ts` and `session-reset-handler.ts` are in the `--mutate` list because these flows drive them, but module 37 owns `hook-deadline.ts` (`integration/hook-deadline.test.ts`) and module 12 owns `session-reset-handler.ts` (`unit/session-reset-handler.test.ts`). Their low scores here reflect that split. Their survivors are not chased again here (module 41 precedent).

### Levels
`node-handoff-store.ts` `claim` and `handoff-claim-lock.ts` → Critical (concurrency: one delivery per handoff across processes; lock recovery after a crash; an undelivered handoff stays pending when the hook deadline answers first). `pendingSince` → Common (doctor and the claim guard). `HookDeadline.commit`/`isExpired` as seen by the claim, and the hosts passing their deadline down → Critical, through integration only (the hosts are Glue).

| Behavior | Mutant | Test |
|---|---|---|
| no handoff: nothing pending, nothing claimed, no `.context-brake/` folder or lock created | `pendingSince() === null` guard → `false` (28:9, survived before) | `reports no pending handoff and claims nothing when the file is missing` (now asserts the folder is absent) |
| the claim moves the handoff to `handoffs/<timestamp>.md`, returns the relative path, clears the pending state; a taken name gets `-1` (FR-03) | `reserveName` suffix, path template, `rename` | `moves the handoff to the archive under its timestamp and adds a suffix when that name is taken` |
| the archive keeps the newest entries and never prunes the handoff it just archived, even with the clock behind (FR-03, codereview_05 CR-02) | `name !== delivered` filter; `HANDOFF_ARCHIVE_LIMIT - 1`; `Math.max` | `keeps the handoff it just archived when the clock is behind a full archive` |
| two concurrent claims deliver once (TC-03, NFR-02); 100 pairs in a row deliver once to an existing file (codereview_02 CR-01) | lock acquisition removed; `createExclusive` `wx` flag | `lets only one of two concurrent claims deliver the handoff`, `delivers each handoff once across many sequential concurrent claim pairs…` (both kept for module 12) |
| a lock exactly 30 s old is respected; one 1 ms older is taken over, the claim delivers and releases it | `>` → `>=` (lock 26:12, survived before); `!isStale` branch; `finally` lock removal | `respects a lock exactly at the stale limit`, `takes over a lock just past the stale limit…` (`it.each`) |
| a handoff that vanishes between the guard and the move gives `null` and no empty reserved file in the archive | `moveInto` catch emptied (71:19), ENOENT → throw (73:9), `return true` (73:43); all no coverage before | `returns null and leaves no reserved archive file when the handoff vanishes before the move` |
| an expired deadline, before or during the move, leaves the handoff pending and a full archive unpruned (FR-03, codereview_03 CR-01, codereview_04 CR-01) | `!deadline.commit()` branch, `restoreHandoff` | `keeps the handoff and a full archive when the deadline %s` (2 rows) |
| a newer handoff written during the restore wins and the archived copy stays (codereview_03 CR-01) | `EEXIST` return in `restoreHandoff` | `keeps a newer handoff and the archived one when both exist at restore time` |
| a prune failure rejects, restores the handoff, leaves the archive and no lock | `pruneOrRestore` catch | `rejects when the archive cannot be pruned…` |
| the session start answers in the `ledger` phase when the deadline elapses there, and the late claim keeps the handoff (FR-03; module 12's `onPhase?.` reliance) | `hooks.onPhase?.('ledger')` → `''` (reset handler 23:19, survived before); deadline not passed to `claim` | `answers through the deadline in the ledger phase and leaves the handoff pending…` |
| a committed claim finishes past the deadline, through prune and lock release (FR-02, codereview_05 CR-01) | `commit` keeps the timer; an expiry check after the commit | `delivers the resume text when the deadline elapses after the commit, during the prune and the lock release` |
| both hosts pass their deadline to the claim: an answer before the claim keeps the handoff; an expiry after the commit still delivers (FR-02, FR-03, codereview_03/06 CR-01) | `{ ...engineInput, onPhase, deadline }` without `deadline` (in-process-host 32, process-hook-host 84, outside the Stryker scope) | `%s keeps the handoff pending when the deadline answers before the claim`, `%s delivers the resume text when the deadline elapses after the commit` (in-process and process hook host rows) |

### Actions
- **Deleted (1):** `keeps only the most recent archived handoffs`: 0 exclusive kills. The clock-behind test kills every prune mutant it killed: the limit, `Math.max`, and the `delivered` filter, which drops the delivered file there because it sorts first.
- **Merged:**
  - `moves the handoff to the archive and returns its relative path` (0 exclusive kills) + `adds a suffix when a handoff with the same timestamp is already archived` → one test with the same arrangement. It asserts the first path, the archived content and the cleared `pendingSince`, then the suffixed second path.
  - expiry `does not move the handoff when the deadline already expired`, `moves the handoff back when the deadline expires during the move`, `keeps a full archive when the deadline already expired`, `keeps a full archive when the deadline expires during the move` (0 exclusive kills each) → one `it.each` (2 rows) on a full archive. Each row asserts the pending text and the unchanged archive, which also proves no archived file and no lock. The describe carries FR-03, codereview_03 CR-01 and codereview_04 CR-01.
  - lock `returns null while another claim holds a fresh lock` (age 0) + `takes over a stale lock left by a crashed claim` (age 1 h) → `it.each` on the boundary (30 000 ms held, 30 001 ms taken over) through the injected clock, which kills `>` → `>=`. The `Clock` port is the time source here, so fake timers are not needed.
  - `handoff-deadline` `keeps the handoff pending when a process hook session start expires before the claim` (0 exclusive kills in scope; its kill is the process host's deadline hand-off, out of scope) → the process-hook row of the hosts `it.each`, beside the in-process row (H1). The other two host tests became the two rows of the delivery `it.each`.
- **Rewritten (2):** `answers through the deadline…` now uses fake timers instead of a real 150 ms ledger sleep (`tests.md` Repeatable). It asserts `phase: 'ledger'`, which kills reset-handler 23:19 and gives module 12's `onPhase?.` reliance an assertion. The moved process-host row elapses the deadline right after the synchronous `HookDeadline` construction and waits for the actual claim. It no longer sleeps 450 ms. The concurrency test drops its redundant `toBeGreaterThanOrEqual(1)`.
- **Created (1):** `returns null and leaves no reserved archive file when the handoff vanishes before the move`. `moveInto`'s catch (71-73) had no coverage. Without the `rm(reserved)`, an empty `.md` stays in the archive and later counts against the prune limit. Without the ENOENT return, the claim rejects.
- **Kept:** `reports no pending handoff…` (plus the folder assertion), clock-behind archive, both concurrency tests (module 12 cites them by title; the single pair has 0 exclusive kills against the 100-pair loop), the newer-handoff restore, the prune failure, and the committed-claim test (the only one that elapses between the commit and the prune).
- **Moved:** none; no lane entries (all five files run in process).

Mandated rows: concurrency (one claim wins, 100 pairs), lock recovery past the stale limit and its exact boundary, and expiry before, during and after the move. The expiry rows use fake timers (`HookDeadline` hosts) or the injected clock (lock age).

Survivors, equivalent or unreachable: `node-handoff-store.ts` 13:51 (`() => undefined` is falsy like `false`), 22:11 (`pendingSince` non-ENOENT errors: `stat` on an existing path does not fail), 33/72/85/91 `rm` options (`force` only matters for a missing file, and each target exists at that point), 37:9 (whole guard → `false`: `commit()` refuses the same expired deadline and restores the file, so the outcome matches; a vanished handoff fails `rename` with ENOENT), 73:9 → `true` (non-ENOENT `rename` errors: not reproducible portably), 82:9 (non-EEXIST `copyFile` errors), 89:17 (`.sort()` removed: NTFS `readdir` is already ordered; Linux CI kills it through the clock-behind test); `handoff-claim-lock.ts` 11/12 (non-EEXIST `open` errors), 18:7 (skipping the first `createExclusive` reaches the same lock through `isStale`'s ENOENT → `true` path: slower, same result), 20 `rm` options, 27-28 no coverage (lock removed between the failed create and `stat`: a race with no deterministic trigger without an injected filesystem). The 21 `hook-deadline.ts` and 30 `session-reset-handler.ts` survivors are owned by modules 37 and 12.

### Production pending items
- `node-handoff-store.ts` line 37: `deadline.isExpired()` before the move only saves work. `commit()` already refuses an expired deadline and restores the file. Keep it as an optimization, or drop it together with the `ClaimDeadline.isExpired` port method (line 37 is its only reader). The vanishing-handoff test would then need another hook to delete the file.

### Questions `[?]`
- None.

## 43. harness/config-preservation — done 2026-10-10

**Baseline:** 29 runner tests across the 13 files, green (`codex-hook-command-shells` runs 3 shell rows on Windows and 2 on POSIX, so the count is platform-dependent). Stryker (`--disableBail`) on `common/codex-hooks-updater.ts`, `common/cursor-hooks-updater.ts`, `common/antigravity-hooks-updater.ts`, `common/hook-event-cleanup.ts`, `claude-code/claude-hooks-config.ts`, `claude-code/claude-merger.ts` and the four `planner.ts` (claude-code, antigravity-cli, codex-cli, cursor): **51.82%** (458 killed + 11 timeout, 255 survived, 181 no coverage); per file, in that order, 52.60 / 72.92 / 46.60 / 13.24 / 75.00 / 61.33 / 53.41 / 47.31 / 54.87 / 50.51. The dry run worked with the local config (the sandbox copies `dist/assets/runtime`, which the process-lane files and `init` need); 15 to 18 minutes per run. Coverage proxy (same 10 sources): lines 88.01%, branches 76.79%.
**Result:** 29 tests across 9 files, green. Stryker on the same sources and flags: **62.87%** (558 killed + 11 timeout, 200 survived, 136 no coverage); per file 72.73 / 81.25 / 58.25 / 13.24 / 93.75 / 66.67 / 67.05 / 55.91 / 67.26 / 58.59 (no file dropped, no mutant went from killed to survived, 97 gained). Coverage proxy: lines 89.98%, branches 80.42% (planners: cursor 50 → 66.66, antigravity 42.85 → 62.5, codex 69.23 → 78.57; updaters: antigravity 82.6 → 93.33, codex 78.94 → 79.48, cursor lines 96.49 → 100 and branches 84.37 → 83.33, the denominator grew with the newly covered `version` branch; `claude-code/planner.ts` branches 70 → 66.66 with the same uncovered lines 39-40, 45-46, 63-64, a v8 denominator change). Related suites green: `integration/hook-event-cleanup`, `idempotent-adapter-merge`, `adapter-planners`, `hook-registration-paths`, `retired-hook-events`, `-copilot`, `-harnesses`, `harness-adapters`, `removal-conflicts`, `init-install`, `unit/test-lanes`; `npm run typecheck` green. Commit `b8f928b`.

Central finding: most baseline tests asserted `toContain`/`toBeDefined` on the planned config, and only the CLI flow in `user-hook-preservation` reached the planners' plan objects (73 exclusive kills). The module now asserts exact bytes for every family (install, second install, remove), the exact parsed structure for every legacy migration, and the exact conflict for every planner's unparsable file.

### Levels
`codex-hooks-updater.ts`, `cursor-hooks-updater.ts`, `antigravity-hooks-updater.ts`, `claude-hooks-config.ts`, `claude-merger.ts` → Critical: the only code that edits user harness config files (non-owned bytes, second run, legacy migration; `file-changes.md`). The four planners → Critical for the read, refuse and plan path; their plan object fields (`entries`, `preview`, `assetPaths`) are asserted by module 18's `adapter-planners`. `hook-event-cleanup.ts` is owned by module 18 (`integration/hook-event-cleanup.test.ts`); its 13% here reflects that split, and its survivors are not chased again (module 42 precedent).

| Behavior | Mutant | Test |
|---|---|---|
| Codex and Cursor (trailing comments), Claude Code and Antigravity user files stay byte for byte through `init`, a second `init` and `remove`; each file gets exactly its 3 or 2 owned hooks; `doctor` reports no `INTEGRATION_MISSING` (mandated row for every family; T29.3, IT-01, CA-01, CR-02) | planner change fields, updater append and remove paths, event lists | `keeps trailing comments and user hooks of every harness through two inits, a healthy doctor, and remove…` |
| minified files of all four families and a CRLF Cursor file round-trip exactly: install changes the file, adds no line break of another kind (none in a minified file), a second install changes nothing, remove restores the input (CR-01, RF6) | separator and line-ending handling reached through the updaters | `keeps %s byte for byte through install, a second install, and remove` (5 rows) |
| an unparsable file is refused by each planner with the exact conflict and no change, and the file stays untouched (CR-01, RF7, `file-changes.md`) | `!validation.valid` → `false` and the conflict literals in each planner (no coverage before for Codex, Cursor, Antigravity) | `refuses a malformed minified %s as a conflict and plans no change` (4 rows) |
| legacy Codex (relative form; two-form beside a third-party group), Cursor (`./.cursor`), a Cursor file without `version`, and an Antigravity legacy event that also holds a user child migrate to the exact current structure; a second install changes nothing (CR-01, DEC-04, CR-06, CR-02) | owned-handler predicates; `version` insertion (cursor 60-61, no coverage before); Antigravity `isEmpty`, `hasUserEventArray`, `allEmptyObjects` (34, 46-48, no coverage before) | `migrates %s to the current registration and changes nothing on a second install` (5 rows) |
| a current registration followed by a user hook is left unchanged (CA-05) | Codex `groupMatchesDesired` and the `ownedGroups.length === 1` fast path (33, 35, 70-71); Cursor `matchesDesired` (45-46): each mutant moves the owned entry after the user's on every run | `leaves a current %s registration followed by a user hook unchanged` (2 rows) |
| a mixed Codex group keeps the user handler on install and remove, exact bytes after remove (CR-01) | inner handler loop of `removeOwnedFromEvent` | `keeps the user handler of a mixed Codex group on install and remove` |
| a user Stop group whose command names the event stays first and is the only one left after remove, bytes restored (TC-26, DEC-12) | `isTargetHook` `&&` → `\|\|` (26); merger filters | `adds one ContextBrake group after the user Stop group and removes only its own entry` |
| an Antigravity legacy file diagnoses `INTEGRATION_MISSING`, migrates to `{ "context-brake": … }` alone, and diagnoses clean after (CR-02) | legacy event removal; `hooks` key removal | `migrates legacy entries, changes nothing on a second install, and diagnoses missing or present states` |
| Claude Code and Cursor through a linked folder: the planned `realPath` equals the snapshot's, the link survives, the user entry stays, a second plan is empty (T10.4) | change-target resolution | `installs %s through a linked folder…` (2 rows) |
| `init` through a junction, a byte-identical second `init`, `remove` restoring the user settings; a concurrent edit yields `FILE_CHANGED_SINCE_PREVIEW` (T10.5) | applier precondition through the link | both `symlinked-harness-lifecycle` tests |
| registered Codex commands run from a subdirectory under each shell; the `init`-installed command runs from a subdirectory; outside Git, doctor warns with the exact CR-07 message, impact and remediation (CA-20, DEC-04, CR-06, CR-07) | command quoting; `.git` check | `codex-hook-command-shells` (3), `codex-hook-root` (2) |

### Actions
- **Deleted files (4, 7 tests):**
  - `codex-cursor-user-hooks.test.ts` (2): 0 exclusive kills. It built documents identical to the `user-hooks-trailing.json` fixtures and ran the same flow at planner level as the CLI test, which keeps both files.
  - `minified-config-lifecycle.test.ts` (1): 0 exclusive kills; the minified Claude Code row asserts the second install and the remove byte for byte.
  - `antigravity-lifecycle.test.ts` (2): the install/doctor/remove test (15 exclusive kills in `antigravity-cli/planner.ts`) is folded into the multi-harness CLI test. That test seeds the same fixture, asserts the healthy doctor and the byte-identical remove, and kills the same 15. The CLI legacy migration (0 exclusive kills) is the planner-level legacy test in `antigravity-registration`.
  - `codex-hook-migration.test.ts` (2): the two-form test is the `two-form Codex command` row of `legacy-user-hooks` (same arrangement, exact parsed structure plus the second install, DEC-04 and CR-06 kept). Its second test (0 exclusive kills) is that row's second-install assertion.
- **Deleted inside kept files (3):** `antigravity-registration` `installs documented structure and preserves user hooks` (0 exclusive kills; its `?? s1` let the idempotency check pass with no change; the CLI test covers the flow); `claude-preservation` IT-01 (0 exclusive kills; now the Claude Code file of the CLI test, with IT-01 and CA-01 in its title); `legacy-user-hooks` `preserves probe P1 and P2 user hook fixtures` (0 exclusive kills; module 24's E2E-02 and module 25's TC-11 assert those `user-hooks.json` fixtures verbatim through the CLI).
- **Merged:** the CLI `user-hook-preservation` test (Codex and Cursor) + Claude IT-01 + the Antigravity lifecycle → one CLI test over the four families. The four minified `toBeDefined` tests + the CRLF part of `legacy-user-hooks` → one 5-row `it.for`. The `symlinked-harness-config` Claude and Cursor tests → one 2-row `it.for` (T10.4 kept).
- **Rewritten:** `minified-config` holds only the refuse-unparsable rows (all four planners, exact conflict, file untouched). The legacy migrations assert the exact parsed structure and a second install instead of `toContain`. The mixed-group remove asserts exact bytes. The Claude Stop test asserts the exact `Stop` array and the exact bytes after remove; before, it rewrote the file through `JSON.stringify` between install and remove. `symlinked-harness-lifecycle` T10.5 adds `remove` restoring the user settings byte for byte. The Antigravity legacy test asserts `{ "context-brake": … }` exactly plus a second install.
- **Created (rows, from survivors):** the malformed rows for Codex, Cursor and Antigravity (the planner refuse branches had no coverage; mandated failure scenario); migration rows `a Cursor file without the version field` and `an Antigravity legacy event that also holds a user child` (no coverage before; the mutants never add `version` or drop the user child); `leaves a current Codex/Cursor registration followed by a user hook unchanged` (25 and 1 exclusive kills; the mutants reorder the user's file on every run).
- **Kept unchanged:** `codex-hook-command-shells` (3) and `codex-hook-root` (2). `codex-hook-root`'s process test overlaps the cmd.exe shell row (0 exclusive kills), but it is the prd-13 TechSpec process row (codereview_01 CR-02, NFR-04 shell coverage), and its CR-07 test is module 5's carry-forward. No `tests/test-lanes.ts` change.
- **Moved:** none.

Growth: 29 → 29 runner tests. The 7 created rows (3 malformed, 2 migration, 2 current-registration) replace the 7 deleted tests and 4 files.

Mandated rows: byte for byte plus a second run for every family (Codex, Cursor, Claude Code, Antigravity; LF with comments, minified, CRLF), through the CLI and through the planners; linked config (T10.4, T10.5; skipped with the reason when links cannot be created); refuse-unparsable for every planner; legacy migration for every harness that has a legacy form. Carry-forward kept: CR-07 exact finding (module 5); legacy and two-form Codex migration (modules 18, 24, 25).

Not asserted on purpose: the remove result of a file whose `hooks` object ContextBrake created or emptied (Cursor `{"version":1}`, the Codex, Cursor and Antigravity legacy fixtures, a CRLF `"hooks": {}`). Those hit module 38's defects (the editor does not undo its expansion; the Cursor and Codex updaters leave a `"hooks": {}` key), so the migration rows assert the parsed structure, not bytes, and no test pins the `{\n  }` output.

Survivors, equivalent or out of scope: the `typeof … === 'object'`/`null` guards in every predicate (codex 12/19/25/31, cursor 18/24, merger 19/24/30; defensive against non-object entries); codex 14:11 and cursor 20:10 (`typeof command === 'string'` with a string command); codex 15 (a `commandWindows`-only legacy handler: no known form), 21 (`length > 0`: an empty user group), 47/49 (loop bounds that re-run a no-op removal), 66:11 (`!clear` → `true`: a missing event re-added on remove); merger 14-15 (`args` filter), 32 (`some` → `every`: a Claude group mixing an owned and a user handler), 43/53; Antigravity `hasMatchingRegistration` 15-18 (replacing the same value gives the same bytes) and the `ownedEvents` filter variants 26-28; planner preview summaries and `entries`/`assetPaths` literals (module 18 `adapter-planners`); non-ENOENT read errors and the updater `catch` blocks (no portable trigger); the remove conflict and `raw !== null` branches (module 17 `removal-conflicts`). The `hook-event-cleanup.ts` survivors belong to module 18.

### Production pending items
- Module 38's defects also show on the migration path: migrating the Codex, Cursor and Antigravity legacy fixtures leaves whitespace-only lines (`    \n    ]`, `  \n  }`, an unindented `"context-brake"`), and removing a registration from a file whose `hooks` object install created leaves `"hooks": {\n  }`. Same causes as module 38 items 1 and 2.
- The planner `catch` around `update*Hooks` (claude 44-46, codex 55-58, cursor 45-48, antigravity 40-43) is unreachable once `validateJsonDocument` passed, unless an updater throws on an unexpected shape such as `"hooks": []`; no test, no known trigger.

### Questions `[?]`
- None.

## Closing — 2026-10-10

**Result:** all 43 modules `done`. Runner tests across the modules: 1450 → 1163 (−287, −20%). Full suite after the refactor: 240 files, 1171 tests (including the e2e smoke set), green.

**Final checks (Decisions 1 and 5):**
- `npm run coverage`: lines 95.55%, branches 92.62%, functions 96.44%, statements 95.55% (gate 80%). The module 11 dead-code deletions did not trip the gate, so nothing was restored.
- `npm run test:budget`: 87.6 s wall (budget 180 s).
- `npm run lint` and `npm run typecheck`: clean.
- Stryker (local only, Decision 2) on the Critical modules 34–43: every module's total score went up; see each section.

**Confirmed production defects (no red tests committed; see modules 32, 38, 43):**
1. The JSON editor does not undo its own expansion on remove: `{\n  "hooks": {}\n}\n` → add + remove → `{\n  "hooks": {\n  }\n}\n` (Codex case, same root as OI-07). **Fixed** in `fix(storage): restore emptied containers and report unreadable targets` (2026-10-10).
2. The Cursor and Codex updaters never remove a `hooks` key that install created: Cursor `{"version":1}` comes back with `"hooks": {}`.
3. Two removals produce invalid JSON: `{"a":1 /*x*/,"b":2}` minus `a` → `{ /*x*/,"b":2}`; removing the last array item followed by a comment line leaves the comma. **Fixed** in `fix(storage): keep JSON valid when removing an item next to a comment` (2026-10-10).
4. `checkPrecondition` (change applier): a non-ENOENT read error rejects the whole `apply` after earlier changes were already written (partial apply). **Fixed** in the same commit: the change now fails with `FILE_UNREADABLE` and the others are still reported.

**Production pending items (dead or unreachable code):** `askValidated` string overload; `support-service.ts` 26-27; `p95.ts` 7; `scripts/check-package.ts` runs on import and keeps its own required-files list; `changes.ts` zod schemas; `NodeManifestStore.planSave/save/delete`; `RuntimeEvent.tool` / every adapter's `toolOf`; ~25 unused harness schema exports; `mapOmpEvent` `message_end`; in-process catches that skip `errors.jsonl`; `zone-guidance.ts` 16; `resolveUsageWithConfig`; `FailureResolutionInput.ledger`; catches around `resolveFailure`; `arePathsEqual`; `fileIdentity`; `change-target.ts` duplicating `path-boundary.ts`; `git-context.ts` 23; `node-handoff-store.ts` 37; planner catches around the updaters. Details are in each module's section.

**Open questions `[?]`:**
- `process-capability.test.ts` starts child processes through its helper but is not in `PROCESS_LANE_FILES` (module 16).
- prd-14 TC-09 should point to `in-process-restart*.test.ts` (module 29); many TechSpec and task rows cite moved, renamed or deleted test files (modules 3, 5, 8, 9, 18–23, 30, 33).
- prd-02 TC-08 asks for 20 parallel rounds; the built test runs 5 (module 31).
- `atomic-writer.ts` temp-file cleanup on a failed rename (18-21) has no test (module 39).
- Identifiers that match no spec row: TC-16 on the session-zone engine-match describe (module 35); prd-08 TC-09/TC-10 on `brake-engine-debug` (module 36).

**Notes:** module 24 landed as two commits (`7b97ba9` deletion only, `42bafe3` the rest) and module 41 as two (`9714cd5`, `2eef160` realpath fix). Stryker files (`stryker.config.json`, `vitest.stryker.config.ts`, `.stryker-tmp/`, `reports/`) are git-excluded through `.git/info/exclude`; the `@stryker-mutator/*` packages are installed with `--no-save`.
