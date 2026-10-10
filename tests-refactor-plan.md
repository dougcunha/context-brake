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
| 29 | integration/omp-pi-restart | omp-restart, omp-restart-handoff, omp-session-switch, pi-restart, pi-restart-handoff, in-process-restart-plan, semi-auto-restart | harnesses/oh-my-pi, pi | G | 24 | pending |
| 30 | integration/runtime-harnesses | runtime-antigravity, -codex, -copilot, -cursor, -in-process, -host-process, claude-transcript-usage, codex-rollout-usage | src/infrastructure/runtime, harnesses | G | 33 | pending |
| 31 | integration/runtime-policies | runtime-failure-policy, copilot-failure-policy, runtime-invalid-config, runtime-light-mode, light-mode-lifecycle, runtime-parallel-turns, runtime-retention, runtime-session-ledger, runtime-state-removal, brake-lifecycle, debug-mode-lifecycle, simulated-usage | src/infrastructure/runtime | G | 33 | pending |
| 32 | integration/hooks-lifecycle-misc | retired-hook-events, -copilot, -harnesses, linked-project-root, -lifecycle, asset-currency-lifecycle, cli-shells, support-limitations, invalid-config, remove-invalid-config, node-process-runner | src/cli/commands, src/infrastructure/process | G | 26 | pending |
| 33 | integration/statusline | statusline-bridge, -bridge-lifecycle, -bridge-previous, statusline-default, -install, -install-invalid, statusline-shell, runtime-statusline-ledger | harnesses/claude-code, src/infrastructure/runtime | G | 34 | pending |
| 34 | telemetry/zones | zone-classifier, zone-guidance, telemetry-block, telemetry-block-budget | src/core/services | K | 34 | pending |
| 35 | telemetry/session-zone-usage | session-zone, session-zone-statusline, session-zone-reset-window, usage-resolver, window-origin, window-trust | src/core/services | K | 42 | pending |
| 36 | brake/engine-failure-policy | brake-engine-debug, brake-engine-lifecycle, failure-policy, failure-policy-snapshot-reset, injection-policy, reset-notice | src/core/services | K | 35 | pending |
| 37 | runtime/hosts | hook-deadline, in-process-host, in-process-host-deadline, in-process-runtime, process-hook-host, process-hook-host-deadline, runtime-composition, runtime-paths | src/infrastructure/runtime | K | 38 | pending |
| 38 | storage/json-editing | json-document-editor, json-span-safety | src/infrastructure/storage | K | 23 | pending |
| 39 | storage/change-apply | change-plan-service, change-target, path-boundary, runtime-state-files, integration/change-applier, integration/directory-pruner, integration/safe-removal | src/core/services/change-plan-service, src/infrastructure/storage | K | 26 | pending |
| 40 | gitignore/core | gitignore-block, gitignore-merge, gitignore-plan | src/core/services/gitignore-* | K | 28 | pending |
| 41 | gitignore/integration | init-gitignore, -lifecycle, -tracked, -default-runner, remove-gitignore | src/cli/commands, gitignore-* | K | 20 | pending |
| 42 | handoff/store | node-handoff-store, -expiry, -lock, handoff-deadline, handoff-deadline-hosts | src/infrastructure/storage, src/infrastructure/runtime | K | 21 | pending |
| 43 | harness/config-preservation | antigravity-lifecycle, antigravity-registration, claude-preservation, codex-cursor-user-hooks, codex-hook-command-shells, codex-hook-migration, codex-hook-root, legacy-user-hooks, minified-config, minified-config-lifecycle, user-hook-preservation, symlinked-harness-config, symlinked-harness-lifecycle | src/infrastructure/harnesses | K | 30 | pending |

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
**Result:** 23 tests across 5 files, green. Scoped coverage proxy (`claude-code/mod/*.ts`, `core/services/restart-guards.ts`): lines 217/239 (90.79%) → 229/239 (95.81%); branches 81/93 (87.09%) → 84/97 (86.59%; v8 counts the branches of `onSessionStart`/`recordLoaded` only once they run, so the percentage dips while no covered branch was lost). Remaining gaps: the `catch` blocks of `onSessionStart`, `onTurnStart` and `onPromptSubmit` (`hooks.ts` 13-14, 21-22, 42-43), the JSON `catch` of `parseConfig` (`mod-config.ts` 25-26) and of `readLog` (`mod-log.ts` 21-22): defensive; the `onTurnComplete` catch is asserted by `logs an internal error and lets the turn go on when a read fails`; `host.ts` is type-only.

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
