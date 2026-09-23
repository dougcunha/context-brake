# TechSpec — Plano, checkpoint e boot (prd-03)

## Sources and traceability

- PRD: `tasks/prd-03-plano-checkpoint-e-boot/prd.md` (`RF1`–`RF20`, `CA-01`–`CA-17`), approved as `DEC-HIL-01` in `workflow.md`.
- Applicable instructions and rules: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `cli-output.md`, `file-changes.md`, `harness-adapters.md`.
- Research: `docs/research/disk-checkpoint-reset-loop.md` (plan/checkpoint/boot pattern), `contextops-srs-original.md` §4.2–4.3 (field shapes), `contextops-spec-review.md` §"Inconsistências" (boot consumes the turn budget; guillotine must allow the save), `single-agent-context-management.md` (retention matrix for the boot reduction order), `harness-integrations.md` (per-harness session-start channel).
- Evidence in existing code: `src/core/contracts/configuration.ts:56,60`; `src/core/contracts/harness.ts:15-22`; `src/core/services/brake-engine.ts:72`; `src/core/services/zone-actions.ts:13,17-21`; `src/core/services/protocol-service.ts:24-44`; `src/core/services/support-service.ts:46`; `src/core/services/doctor-checks.ts:55`; `src/infrastructure/runtime/plan-validation-reader.ts`; `src/infrastructure/harnesses/*/capabilities.ts:7`; `src/infrastructure/harnesses/*/planner.ts`.

## Solution summary

The feature adds two owned state files (`task_plan.json`, `state_checkpoint.json`) with versioned schemas, a strict validator, a `plan` CLI command family, and a boot summary delivered at session start. Most of the delivery path already exists and is extended rather than created: all eight harness adapters already emit the `session_reset` runtime event, the `RuntimeDecision` union already carries `{kind:'context', block}`, the installers already register the session-start hook events, and `stateStorage.instructCheckpointCommit` and `stateStorage.bootMaxTokens` already ship as required configuration keys that no production code reads yet.

The core work is therefore: give `brake-engine.handleSessionReset` a boot summary to return instead of `NEUTRAL`; widen three adapters' `renderDecision` event gates and wire the two in-process extensions' session-start handlers; build the plan/checkpoint entities, strict validation, and stores; add a git inspector behind the existing `ProcessRunner` port; and thread the two dormant configuration keys into protocol rendering and boot budgeting. Boot text is built in `core` as a versioned contract that adapters only transport, as `harness-adapters.md` requires.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | RF9, RF10 | Produce the boot from `handleSessionReset` in `brake-engine.ts`, returning `{kind:'context', block}` instead of `NEUTRAL`. | `brake-engine.ts:72-76` already receives every harness's session start; `RuntimeDecision` already has the `context` kind (`runtime.ts:28`). No new event or port. | A dedicated boot event would duplicate eight adapter mappings that already exist. |
| DEC-02 | RF9 | Widen the `context` event gate in `claude-code/runtime.ts:55`, `codex-cli/runtime.ts:64`, and `cursor/runtime.ts:45` to also emit on the session-start event name. Accept both `session_id` and `conversation_id` in the Cursor session-start payload. | Those three gate on `PostToolUse`/`postToolUse`; `github-copilot-cli/runtime.ts:61` has no event gate. Current Cursor docs show `session_id` in the `sessionStart` example, while the adapter only reads `conversation_id`. | Removing the gate entirely would emit telemetry on unintended events; requiring only `conversation_id` would drop the documented session-start payload. |
| DEC-03 | RF9 | No installer or planner changes. | `claude-code/planner.ts:19,48`, `codex-cli/planner.ts:34`, `cursor/planner.ts:18-19`, `github-copilot-cli/planner.ts:26-27,37-38` already register the session-start events and their matchers. | Re-registering would churn user config files for no behavior gain. |
| DEC-04 | RF9 | For Pi and Oh-My-Pi, retain the decision produced by the session-start or post-compaction handler for that session, then return it once through the next documented `before_agent_start` `message` channel. | `session_start` and `session_compact` are lifecycle events without a context response; `before_agent_start` returns a message. Both declare `session_boot: supported` (`capabilities.ts:7`). | `pi.sendMessage` delivery modes add an ordering guarantee the docs do not pin down; returning from the lifecycle event would discard the boot. |
| DEC-05 | RF9, RF13, CA-13 | Deliver no boot for `opencode` and `antigravity-cli`; both fall back to the protocol file routine. | Both declare `session_boot: unsupported` (`opencode/capabilities.ts:7`, `antigravity-cli/capabilities.ts:7`); `harness-integrations.md` §OpenCode records "Não há hook estável de injeção de contexto". | Antigravity could carry the boot on `PreInvocation` `ephemeralMessage`, but that fires before every model call, not once per session, and would repeat the boot each turn. |
| DEC-06 | RF7, RF9 | Keep `NodePlanValidationReader` tolerant (`z.looseObject`) and add a separate strict validator for `plan status`, `plan init`, and the boot. | The tolerant reader sits on the hook fail-open path (`runtime-composition.ts:48-53`); making it strict would let a malformed plan disable the brake, violating the under-ceiling fail-open rule in `harness-adapters.md`. | One shared strict reader is simpler but couples brake availability to plan validity. |
| DEC-07 | RF7, RF11 | Model validation failures on the existing configuration pattern: an issue list of `{path, received, rule}` plus a dedicated error class per file. | `configuration-validator.ts:4-13` already establishes it, and the PRD requires errors naming file, field path, and violated rule. | Generic `Error` would breach the dedicated-error-class rule in `javascript-typescript.md`. |
| DEC-08 | RF6, RF8, CA-16 | `schemaVersion: 1` literal on both files; generate the JSON Schemas from the Zod schemas through the existing script pair and add both to the package's required files. | `generate-schemas.ts:6` and `check-schemas.ts:6` share one `outputs` map; `check-package.ts:17-32` gates the published tarball. Any other version yields a validation error naming the required migration, satisfying RF8 with a single shipped version. | A migration framework is unjustified before a second version exists. |
| DEC-09 | RF14, RF16 | Add `src/infrastructure/git/git-inspector.ts` behind a new `GitInspector` port, executing git through the existing `ProcessRunner`. | No git adapter exists; `NodeProcessRunner` already spawns with an argument array, `shell: false`, and a timeout, satisfying `node.md`. Absent git, the inspector reports unavailable and the boot omits repository checks. | Shelling out directly would breach the no-shell-string rule. |
| DEC-10 | RF12, CA-07, CA-08 | Enforce `bootMaxTokens` by reducing in a fixed order — modified files first, then older decisions — never constraints, appending a pointer to the full checkpoint. | RF12 fixes the order; `single-agent-context-management.md` retention matrix supports dropping file lists and old attempts before constraints. | Proportional truncation would risk dropping a constraint, which the PRD forbids. |
| DEC-11 | RF17, RF18, CA-14 | Thread `instructCheckpointCommit` into `ProtocolZoneContext` so the `RED` clause omits the commit sentence when it is off. | The key ships as required in `schemas/context-brake.config.schema.json:121,133` and is defaulted `true` at `configuration.ts:60`, but `zone-actions.ts:17-21` does not accept it and `:13` hardcodes the commit text. | A separate protocol flag would duplicate an existing key. |
| DEC-12 | RF19, RF20 | Model `plan status` on `doctor`: a core service returning a report object, a Zod report schema, and `--json` rendering the same findings. | `commands/doctor.ts:52-57` and `diagnostics.ts:22` are the established precedent; `cli-output.md` requires one JSON document matching a published schema. | A bespoke output shape would diverge from the existing CLI contract. |
| DEC-13 | RF2, CA-02 | `plan init` refuses to overwrite an existing plan or checkpoint without `--yes`, and writes through `writeFileAtomically`. | `file-changes.md` requires a change plan before writing and temp-file-plus-rename; `cli-output.md` requires a flag equivalent for every confirmation and no prompting when stdin is not a TTY. | Prompting alone would break non-interactive use. |
| DEC-14 | RF1, RF19 | Absorbed refactoring: extract `plan` argument parsing into `src/cli/plan-arguments.ts` rather than growing `argument-parser.ts`. | That file is 78 lines with 6 exports; adding a two-subcommand parser inline would cross the 100-line limit in `code-standards.md`. Recorded here so the hit is expected, not a finding. | Inline growth would breach the file-size rule. |
| DEC-15 | RF9, RF13, CA-05 | Guarantee boot at new-session start for the six `session_boot: supported` harnesses. Reinjection after compaction applies only to Claude Code, Codex CLI, Pi, and Oh-My-Pi; Cursor and GitHub Copilot CLI keep the protocol-file routine without a reinjection guarantee. | Cursor documents `preCompact` as observational with `user_message` only and no post-compaction event. GitHub Copilot CLI marks `preCompact` output unprocessed. Both document session-start context fields. Approved at exception HIL `DEC-EX-T05` in `workflow.md`. | Sending at `preCompact` would rely on undocumented behavior; waiting for a later tool call would miss the first model call after compaction. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/task-plan.ts` | new | Plan entity, `zod/mini` schema, step status union, `PlanStore` port | — |
| CMP-02 | `src/core/contracts/state-checkpoint.ts` | new | Checkpoint entity and schema: git state, working memory, modified files, timestamp | — |
| CMP-03 | `src/core/contracts/git.ts` | new | `GitInspector` port and `GitState` / `GitDivergence` types | — |
| CMP-04 | `src/core/validation/plan-validator.ts` | new | Strict parse plus consistency: unique ids, at most one `IN_PROGRESS`, active step exists | CMP-01, DEC-06, DEC-07 |
| CMP-05 | `src/core/validation/checkpoint-validator.ts` | new | Strict parse and cross-file check against the plan | CMP-02, CMP-04 |
| CMP-06 | `src/core/services/plan-scaffold.ts` | new | Build the initial plan and checkpoint with one example step | CMP-01, CMP-02 |
| CMP-07 | `src/core/services/boot-summary.ts` | new | Render the boot text and apply the reduction order to the token budget | CMP-01, CMP-02, DEC-10 |
| CMP-08 | `src/core/services/boot-policy.ts` | new | Decide boot, no boot, or invalid-state instruction | CMP-04, CMP-05, RF10, RF11 |
| CMP-09 | `src/core/services/git-divergence.ts` | new | Compare recorded commit and tree against the repository | CMP-03 |
| CMP-10 | `src/core/services/plan-status.ts` | new | Build the `plan status` report | CMP-04, CMP-05, CMP-09 |
| CMP-11 | `src/core/services/brake-engine.ts` | modified | `handleSessionReset` returns the boot decision | CMP-07, CMP-08, DEC-01 |
| CMP-12 | `src/core/services/zone-actions.ts` | modified | `RED` clause honors `instructCheckpointCommit` | DEC-11 |
| CMP-13 | `src/core/services/protocol-service.ts` | modified | Protocol reflects the commit switch; boot routine retained for RF13 | CMP-12 |
| CMP-14 | `src/core/services/doctor-checks.ts` | modified | `checkStateFiles` reports schema violations, not only bad JSON | CMP-04, CMP-05 |
| CMP-15 | `src/infrastructure/storage/plan-store.ts`, `checkpoint-store.ts` | new | Read, validate, and atomically write the owned files | CMP-04, CMP-05, `atomic-writer.ts` |
| CMP-16 | `src/infrastructure/git/git-inspector.ts` | new | Branch, head commit, ancestry, clean tree via `ProcessRunner` | CMP-03, DEC-09 |
| CMP-17 | `src/infrastructure/harnesses/{claude-code,codex-cli,cursor}/runtime.ts`, `src/infrastructure/harnesses/cursor/schemas.ts` | modified | Emit `additionalContext` / `additional_context` on session start; read Cursor's documented `session_id` | DEC-02, DEC-15 |
| CMP-18 | `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` | modified | Queue the reset boot per session and return it once from `before_agent_start` | DEC-04, DEC-15 |
| CMP-19 | `src/cli/commands/plan.ts` | new | `plan init` and `plan status` entrypoints | CMP-06, CMP-10, DEC-12, DEC-13 |
| CMP-20 | `src/cli/plan-arguments.ts` | new | Parse the `plan` subcommands | DEC-14 |
| CMP-21 | `src/cli/argument-parser.ts`, `composition-root.ts`, `main.ts`, `output/text.ts` | modified | Register and route `plan`; render status text | CMP-19, CMP-20 |
| CMP-22 | `scripts/generate-schemas.ts`, `check-schemas.ts`, `check-package.ts` | modified | Publish and gate the two new schemas | DEC-08 |

**Flow — boot.** A harness session-start event reaches its adapter, which already maps it to `session_reset`. `brake-engine.handleSessionReset` keeps its ledger side effects, then asks `boot-policy`: no plan or all steps complete yields `NEUTRAL` (RF10); an invalid plan or checkpoint yields a short instruction naming file and error, with no state content (RF11, CA-04); otherwise `boot-summary` renders task, active and next step, constraints, decisions, blocks, git divergences, and the validation command to run first, trimmed to `bootMaxTokens`. Process-hook adapters transport the text in their documented session-start fields. Pi and Oh-My-Pi retain the reset decision per session and return it once from `before_agent_start`. After compaction, only the four channels in DEC-15 reinject it.

**Flow — status.** `plan status` loads both files through the stores, validates them, inspects git, and returns a report rendered as text or, with `--json`, as one document matching the published schema.

## Contracts and data

**`task_plan.json`** (RF4): `schemaVersion: 1`, `taskId`, `title`, `currentStepId`, `steps[]` with `id`, `title`, `description`, `status` (`PENDING` | `IN_PROGRESS` | `COMPLETED` | `FAILED`), `validationCommand` (nullable, RF4 edge case), `artifactsProduced[]`. Consistency rules: ids unique, at most one `IN_PROGRESS`, `currentStepId` present in `steps`.

**`state_checkpoint.json`** (RF5): `schemaVersion: 1`, `taskId`, `activeStepId`, `gitState` (`branch`, `lastCommitHash`, `cleanWorkingTree`, all nullable when git is absent), `workingMemory` (`discoveredConstraints[]`, `decisionsMade[]`, `blockedItems[]`, `breakingChanges[]`), `modifiedFiles[]`, `timestamp` (ISO 8601). `activeStepId` must exist in the plan.

Both files keep the `zod/mini` convention used by `configuration.ts` and `session-ledger.ts`, are written with LF endings, and stay gitignored by the installation PRD's RF24. The boot summary is a versioned agent-facing contract (`[ContextBrake boot v1]`), like the telemetry block. Configuration gains no new keys: `instructCheckpointCommit` and `bootMaxTokens` already exist and only become live.

## Integrations and interfaces

- **Session start, process hooks.** Claude Code, Codex CLI, Cursor, and GitHub Copilot CLI already register the event; the `renderDecision` gate changes for the first three, and Cursor also accepts the documented `session_id` input. Output stays the documented field for that event, per `harness-adapters.md`. Claude Code and Codex CLI also receive a post-compaction session-start event; Cursor and GitHub Copilot CLI do not have a documented reinjection channel after compaction.
- **Session start, in-process.** Pi and Oh-My-Pi retain the boot from session start or post-compaction until `before_agent_start` returns its `message` once. No synchronous I/O is introduced on these paths, per `node.md`.
- **Excluded.** OpenCode and Antigravity CLI receive no boot (DEC-05); their users rely on the protocol file, which RF13 keeps complete.
- **CLI.** `context-brake plan init --task="<name>" [--yes] [--json]` and `context-brake plan status [--json]`. Exit codes reuse `EXIT_CODES`; invalid arguments are `64`, invalid state files are `2`.
- **Failure policy.** A boot failure never throws into the harness: the hook host's existing deadline and failure path apply. A boot that cannot be built degrades to `NEUTRAL`, leaving the session usable; the SessionStart deadline under `DEC-EX-T14` instead reports a safe omission in the documented session-start field when `session_boot` is supported, with no state content, and other failures stay `NEUTRAL`. Under `DEC-EX-T14B`, the boot Git inspection races an internal sub-budget whose per-command timeouts are clamped to the remaining budget; on overrun it degrades to the existing `checks_omitted` path so the boot content still delivers within the hook deadline, while `plan status` keeps the unbounded inspection.

## Errors, security, and recovery

- Errors and edges: all-complete plan (no boot), failed step, step without a validation command, invalid JSON, checkpoint commit outside the branch, dirty tree, no git, and two sessions sharing one plan — the last is out of scope for locking, and last write wins.
- User files and sensitive data: the protocol already instructs agents not to write secrets to the checkpoint; the CLI never transmits either file. Writes go only inside the repository root.
- Concurrency and idempotency: `plan init` is refused rather than repeated when files exist; every write is temp-file-plus-rename so an interrupted run leaves no partial file.
- Rollback: both files are local and gitignored; deleting them restores the pre-feature state, and `remove --remove-state` already deletes them after confirmation.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| Entities, schemas, validators | — | Unit tests for RF4, RF5, RF7; schemas generated and current |
| Stores and scaffold | entities | `plan init` creates valid files; second run refused |
| Git inspector and divergence | — | Divergence and no-git cases covered |
| Boot summary, policy, budget | entities, git | Boot content, suppression, invalid-state, and token budget tests |
| Engine and adapter wiring | boot | Boot reaches each supported harness in integration tests |
| Protocol and commit switch | — | Protocol text with the switch on and off |
| `plan status` and JSON | validators, git | Status text and JSON against the published schema |
| Packaging | schemas | `package:smoke` lists both new schema files |

## Test approach

- Profile: Node.js `>=20` (validated on 24), TypeScript 5.9 `NodeNext` ESM with `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`; Vitest 3.2 with the `parallel` and `process` projects from `vitest.config.ts`. Commands from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- End-to-end: the built CLI run against fixture repositories in temporary directories for `plan init` and `plan status`, which `.agents/rules/tests.md` already lists as critical flows. No browser or UI automation.
- Platforms: Linux, macOS, and Windows. Local evidence will again be Windows-only; the CI matrix remains the open item carried from prd-02.
- Prerequisites and exclusions: e2e and any suite spawning the CLI must be registered in `tests/test-lanes.ts` `PROCESS_LANE_FILES`, and unit tests must avoid the process-lane marker strings, or `test-lanes.test.ts` flags them. Git-dependent tests skip with a reason when git is unavailable, never pass silently.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | RF1, RF3, CA-01 | e2e | `plan init --task="refactor-auth"` in a clean fixture | Valid plan and checkpoint with one example step | `tests/e2e/e2e-plan-init.test.ts` |
| TC-02 | RF2, CA-02 | e2e | `plan init` with files present and no `--yes` | Files byte-identical; confirmation explained | `tests/e2e/e2e-plan-init.test.ts` |
| TC-03 | RF7, CA-03 | unit | Plan with two `IN_PROGRESS` steps | Validation fails naming the violated rule | `tests/unit/plan-validator.test.ts` |
| TC-04 | RF7, RF11, CA-04 | integration | Session start with a malformed checkpoint | Only the instruction naming file and error; no state content | `tests/integration/boot-invalid-state.test.ts` |
| TC-05 | RF9, CA-05 | integration | Step 3 in progress, two constraints; new session on each supported harness and compaction on the four documented channels | Boot carries task, steps 3 and 4, both constraints, validation command in the documented field; no reinjection is asserted for Cursor or GitHub Copilot CLI after compaction | `tests/integration/boot-delivery.test.ts` |
| TC-06 | RF10, CA-06 | integration | All steps `COMPLETED` | No boot delivered | `tests/integration/boot-summary.test.ts` |
| TC-07 | RF12, CA-07 | unit | Checkpoint exceeding the budget | All constraints intact; reduced content points to the checkpoint | `tests/unit/boot-budget.test.ts` |
| TC-08 | CA-08 | unit | 20 steps, 20 constraints and decisions | Boot within 1,000 tokens via `js-tiktoken` | `tests/unit/boot-budget.test.ts` |
| TC-09 | RF14, CA-09 | integration | Commit outside the current branch history | Divergence names recorded and current commit | `tests/integration/git-divergence.test.ts` |
| TC-10 | RF14, CA-10 | integration | Uncommitted changes | Boot warns about the pending changes | `tests/integration/git-divergence.test.ts` |
| TC-11 | RF15, CA-11 | e2e | Simulated agent using only the boot | Validation command run within 3 tool calls, before any edit | `tests/e2e/e2e-simulated-boot.test.ts` |
| TC-12 | RF16, CA-12 | integration | Repository without git | No repository checks; omission reported | `tests/integration/git-divergence.test.ts` |
| TC-13 | RF13, CA-13 | integration | Harness without session-start injection | Complete boot routine present in the protocol file | `tests/integration/protocol-content.test.ts` |
| TC-14 | RF17, RF18, CA-14 | unit | Protocol rendered with the switch on and off | Commit instruction present, then absent | `tests/unit/protocol-commit-switch.test.ts` |
| TC-15 | RF19, RF20, CA-15 | e2e | `plan status --json` with 5 steps, 2 complete | Valid JSON with all steps, active step, and validity | `tests/e2e/e2e-plan-status.test.ts` |
| TC-16 | RF8, CA-16 | unit | Checkpoint at an earlier schema version | Accepted, or migration named in the output | `tests/unit/checkpoint-validator.test.ts` |
| TC-17 | CA-17 | e2e | 20 simulated red-zone sessions per full-level harness | Valid checkpoint and `checkpoint:` commit each time; tree clean | `tests/e2e/e2e-simulated-long-task.test.ts` |
| TC-18 | RF6 | integration | Packaged tarball | Both new schema files present and current | `npm run package:smoke`, `npm run schemas:check` |

## Quality profile

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b|\bas any\b|<any>' "${files[@]}"` | — |
| QA-02 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-03 | synchronous file or process API in in-process adapters | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|existsSync\|spawnSync)\b' "${in_process_files[@]}"` | — |
| QA-04 | `exec`, `execSync`, or `shell: true` | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — |
| QA-05 | empty `catch` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}' "${files[@]}"` | `DEC-06` for the tolerant runtime reader, which returns `null` by design |
| QA-06 | generic `throw new Error(` | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-07 | file above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | `DEC-14` for the extracted plan argument parser |
| QA-08 | clock or randomness in `core` | reservation | `"${RG[@]}" 'Date\.now\(\)\|new Date\(\)' "${core_files[@]}"` | Checkpoint timestamps use the injected `Clock` port |

- Verification scope: the TypeScript files in each task's diff.
- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or the same block duplicated in 3+ places.

### Terrain baseline

Measured on 2026-09-17 at `86961bb` with `wc -l` and the profile greps. No target file crosses a structural threshold (100 lines, 10 exports, 4+ parameters, 10+ cases), so condition (a) is met nowhere.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/cli/argument-parser.ts` | 78 | 6 | 1 | 0 | none | recorded; growth absorbed in `DEC-14` |
| `src/cli/main.ts` | 61 | 1 | 2 | 0 | none | recorded |
| `src/core/contracts/configuration.ts` | 60 | 6 | 2 | 0 | none | recorded |
| `src/core/services/protocol-service.ts` | 59 | 3 | 3 | 0 | none | recorded |
| `src/cli/output/text.ts` | 59 | 5 | 2 | 0 | none | recorded |
| `src/cli/composition-root.ts` | 56 | 1 | 3 | 0 | none | recorded |
| `src/core/services/zone-actions.ts` | 38 | 5 | 2 | 4 | none | recorded |
| `src/cli/argument-validator.ts` | 36 | 4 | 2 | 0 | none | recorded |
| `src/infrastructure/storage/runtime-state-files.ts` | 27 | 2 | 2 | 0 | none | recorded |
| `src/cli/exit-codes.ts` | 7 | 3 | 1 | 0 | none | recorded |
| `src/cli/output/json.ts` | 3 | 1 | 1 | 0 | none | recorded |

- Preparatory refactoring: **not recommended**. No target file crosses a structural threshold, so intense contact is ordinary work. The one saturation risk — `argument-parser.ts` growing past 100 lines — is absorbed locally under `DEC-14`.

## Observability and rollout

- Signals: `plan status` is the user-facing view; `doctor` gains schema-level findings for both state files through `CMP-14`. Boot failures record a runtime error line through the existing error log, with no file content.
- Migration and compatibility: first shipped version of both schemas; `schemaVersion` mismatches report the required migration. No configuration migration is needed because both keys already exist with defaults.
- Rollout and rollback: shipped with the package; the feature is inert until `plan init` creates a plan, since no plan means no boot (RF10).

## Risks and open items

- Risk: Pi and Oh-My-Pi boot delivery rests on documented behavior with no real installation available (prd-02 `O-02`, gaps `OI-03`/`OI-04`). Mitigation: fixtures follow the documented format and the gap stays recorded; probability medium, impact medium.
- Limit: Cursor and GitHub Copilot CLI have no documented context channel after compaction; T05 and T09 verify new-session delivery only for them and retain the protocol-file routine. Approved at exception HIL `DEC-EX-T05`.
- Risk: CA-11 and CA-17 measure simulated agents, not real model adherence, as the PRD already states under "Verificação por simulação".
- Risk: the boot consumes part of the turn budget, noted in `contextops-spec-review.md` §"O boot consome o orçamento de turnos"; `bootMaxTokens` bounds the cost but does not remove it.
- Open item: the Linux/macOS × Node 20/22/24 CI matrix (prd-02 `O-04`) is still unrun and will bound this feature's platform evidence too.
- Open item: two sessions sharing one plan is explicitly out of scope; last write wins.

## Relevant files

- Modify: `src/core/services/brake-engine.ts`, `zone-actions.ts`, `protocol-service.ts`, `doctor-checks.ts`; `src/cli/argument-parser.ts`, `composition-root.ts`, `main.ts`, `output/text.ts`; `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,pi,oh-my-pi}/runtime.ts`, `src/infrastructure/harnesses/cursor/schemas.ts`; `scripts/generate-schemas.ts`, `check-schemas.ts`, `check-package.ts`; `tests/test-lanes.ts`.
- Create: `src/core/contracts/{task-plan,state-checkpoint,git}.ts`; `src/core/validation/{plan-validator,checkpoint-validator}.ts`; `src/core/services/{plan-scaffold,boot-summary,boot-policy,git-divergence,plan-status}.ts`; `src/infrastructure/storage/{plan-store,checkpoint-store}.ts`; `src/infrastructure/git/git-inspector.ts`; `src/cli/commands/plan.ts`; `src/cli/plan-arguments.ts`; `schemas/{task-plan,state-checkpoint}.schema.json`.
