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
| 3 | cli/assistant-terminal | assistant-output, clack-prompt-port, equivalent-command, terminal | src/cli/assistant, src/cli | G/C | 23 | pending |
| 4 | doctor/service | doctor-checks, doctor-service, diagnostics, report-service, active-sessions, asset-currency, doctor-context-window | src/core/services (doctor-*, report-service, active-sessions, asset-currency) | C | 29 | pending |
| 5 | doctor/support-versions | support-service, support-service-version-gating, adapter-version-probes, adapter-diagnostics, in-process-sampler, overhead-p95 | src/core/services/support-service, version-service, src/infrastructure/diagnostics | C | 25 | pending |
| 6 | doctor/integration | integration/doctor-* (8 files) | src/cli/commands, src/core/services | G | 21 | pending |
| 7 | repo/release-packaging | release-workflow, check-release-tag, package-metadata, asset-bundler, runtime-bundle-imports, integration/package-assets, integration/package-contents | scripts/, src/infrastructure/storage/package-metadata | G/C | 36 | pending |
| 8 | repo/test-infra | test-budget, test-lanes, e2e-smoke-set, bench-config, benchmark-fixtures | tests/test-lanes.ts, scripts/check-test-budget.ts, vitest configs | C | 21 | pending |
| 9 | repo/docs-drift | readme-config-example, readme-gitignore, readme-light-example, readme-support-table, integration/docs-auto-restart | README.md, docs/ | T | 24 | pending |
| 10 | config/validation | configuration, configuration-sanitizer, configuration-snapshot, configuration-validator, config-legacy-checks | src/core/validation, src/core/services/config-legacy-checks | C | 29 | pending |
| 11 | config/schemas-stores | schemas, changes-schema, project-config-store, manifest-store | src/core/contracts schemas, src/infrastructure/storage | C | 16 | pending |
| 12 | telemetry/counters-statusline | session-counters, session-reset-handler, statusline-summary, statusline-line | src/core/services | C | 29 | pending |
| 13 | brake/errors-merges | runtime-error-checks, runtime-error-line, debug-mode-merge, snapshot-merge | src/core/services | C | 21 | pending |
| 14 | restart/policy | auto-restart-policy, auto-restart-contract, auto-restart-notices, restart-mode, restart-neutrality | src/core/services (auto-restart-*, restart-mode) | C | 32 | pending |
| 15 | restart/flow-arguments | auto-restart-arguments, restart-flow, runner-reset-signal, init-max-restarts-arguments | src/core/services/restart-flow, src/cli | C | 30 | pending |
| 16 | storage/capabilities | link-capability, process-capability, git-capability | src/infrastructure (git, process, storage) | C | 19 | pending |
| 17 | install/services | detection-service, installation-summary, removal-service, removal-conflicts, harness-exclusion | src/core/services (detection, installation-*, removal-*, harness-exclusion) | C | 19 | pending |
| 18 | harness/registration | harness-registry, harness-adapters, adapter-planners, hook-registration-paths, hook-event-cleanup, idempotent-adapter-merge | src/infrastructure/harnesses, harnesses/common | C | 27 | pending |
| 19 | claude/statusline-planner | statusline-context-window, statusline-default, statusline-payload, statusline-planner, statusline-shell | src/infrastructure/harnesses/claude-code | C | 29 | pending |
| 20 | claude/statusline-diagnostics | statusline-diagnostics, -shell, -symlink | src/infrastructure/harnesses/claude-code | C | 15 | pending |
| 21 | runtime/claude-codex | runtime-claude, runtime-claude-measured, claude-runtime-session-key, runtime-codex, runtime-codex-measured | harnesses/claude-code, harnesses/codex-cli | C | 25 | pending |
| 22 | runtime/process-harnesses | runtime-antigravity, runtime-copilot, runtime-cursor, runtime-assets, harness-schemas-process | harnesses/antigravity-cli, github-copilot-cli, cursor, common | C | 26 | pending |
| 23 | runtime/in-process-harnesses | runtime-omp, runtime-opencode, runtime-pi, omp-runtime-usage, pi-runtime-usage, harness-schemas-in-process | harnesses/oh-my-pi, opencode, pi | C | 30 | pending |
| 24 | integration/init-install | init-assistant-cancel, init-assistant-equivalence, init-detection, init-idempotency, init-install, init-interactive-gate, init-plan, init-remove-footprint, multi-harness-install, detection-cross-signals | src/cli/commands | G | 29 | pending |
| 25 | integration/init-exclusion | init-assistant-exclusion, init-exclusion, -conflicts, -edges, -removal | src/cli/commands, harness-exclusion | G | 16 | pending |
| 26 | integration/init-settings | init-auto-restart, init-config-repair, config-repair-errors, init-debug-mode, init-debug-mode-disable, init-legacy-turn-limits, init-max-restarts, init-snapshot | src/cli/commands, src/core/validation | G | 39 | pending |
| 27 | integration/claude-auto-restart | auto-restart-doctor, -lifecycle, -planner, -removal, -user-settings | harnesses/claude-code | G | 23 | pending |
| 28 | integration/claude-mod | claude-mod-bundle, -gates, -guards, -handoff, -restart | harnesses/claude-code/mod | G/C | 26 | pending |
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
**Result:** 30 tests, green. Scoped coverage proxy (`assistant-questions.ts`, `ask.ts`, `questions-gitignore.ts`, `questions-harness.ts`, `questions-misc.ts`, `questions-restart.ts`, `questions-snapshot.ts`, `snapshot-specs.ts`): lines 100% → 100%; branches 94.57% → 96.98% (`questions-misc.ts` and the first-run fallbacks in `questions-harness.ts`/`questions-snapshot.ts` now covered; the remaining gaps are `ask.ts` 8 and 13, the `?? 'unknown'` adapter fallbacks in `questions-harness.ts` 19 and 29, unreachable with `getAllAdapters()`, `questions-restart.ts` 47, and `questions-snapshot.ts` 70). Commit pending.

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
