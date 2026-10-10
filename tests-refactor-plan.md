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
**Result:** 13 tests across 6 files, green. Scoped coverage proxy (`commands/doctor.ts`, `handoff-findings.ts`, `restart-doctor-findings.ts`, `runtime-error-checks.ts`, `no-harness-finding.ts`, `asset-currency.ts`, `active-sessions.ts`, `harnesses/common/restart-diagnostics.ts`, `runtime/runtime-state-reader.ts`): lines 96.03% → 94.2%; branches 81.06% → 79.74% (`restart-diagnostics.ts` branches 66.66% → 76%). The lines lost were executed without assertions by deleted tests and stay covered by the related suites: `doctor.ts` 27-30 (the invalid-config read, asserted by `integration/invalid-config.test.ts` and `integration/config-repair-errors.test.ts`) and `asset-currency.ts` 77-79 (`protectModifiedAssets` on a re-init that adds a harness, run by the deleted Oh-My-Pi test; `multi-harness-install`, `init-idempotency`, `init-exclusion`, and `omp-restart` run it). Commit pending.

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