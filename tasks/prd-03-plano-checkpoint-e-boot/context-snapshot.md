# Context snapshot — prd-03-plano-checkpoint-e-boot

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: active
- generated: 2026-09-17
- stage: tasks
- stage_source: tasks/prd-03-plano-checkpoint-e-boot/tasks.md
- covers_through: T02
- authored_code: yes
- git_head: 86961bb
- worktree: dirty — T01 and T02 sources and tests uncommitted under `src/core/`, `src/cli/`, `src/infrastructure/`, `tests/`; plus pre-existing prd-02 closure files
- next_step: `sdd-orchestrate-flow` → T03 (git inspector and divergence)
- other_eligible: T06 (protocol commit switch, no dependencies), T08 (schema publishing)
- superseded_by: —

## Load map

| Tier | Load when |
| --- | --- |
| `now` | Session start: header, next step brief, open threads waiting on the user |
| `on-select` | Chosen unit matches a trigger: task ID or traceability ID |
| `on-edit` | About to edit or create a path matching a trigger |
| `on-run` | About to run a matching command, or it just failed |
| `on-demand` | A gist is not enough: follow its `src:` pointer, that section only |

Review and QA sessions load only the header, next step brief, `Open threads`, and `on-run` entries.

Entry shape: `- [ID] (when: tier: trigger; trigger) gist — src: path#section; until: condition`

## Next step brief

- Why next: T01 and T02 are complete and in `done/`. T03 unblocks both T04 (boot needs git divergence) and T07 (`plan status` shows git state), so it is the highest-value next unit. T06 and T08 are also eligible and fully independent if you prefer a smaller unit.
- Read first: `tasks/prd-03-plano-checkpoint-e-boot/task_03.md`, then `techspec.md#technical-decisions` (DEC-09) and `prd.md` RF14/RF16.
- Known change points: create `src/core/contracts/git.ts`, `src/infrastructure/git/git-inspector.ts`, `src/core/services/git-divergence.ts`. No git adapter exists yet; reuse the `ProcessRunner` port.
- Applicable entries: D-01, L-01, L-02, L-03, L-04, M-01, M-02, O-01, O-02, O-03.
- Watch out: the full suite takes 4–8 minutes. Run narrow suites while iterating and the full coverage run once, at the end of the task.

## Decisions

- [D-01] (when: on-edit: src/infrastructure/runtime/plan-validation-reader.ts; on-select: T04) `NodePlanValidationReader` must stay tolerant (`z.looseObject`, returns `null`). It sits on the hook fail-open path, so a strict parse there would let a malformed plan disable the brake. Strict validation lives in `src/core/validation/` and is used only by the CLI and the boot. — src: `techspec.md#technical-decisions` (DEC-06); until: DEC-06 replaced.

## Learnings

- [L-01] (when: on-run: npm run lint; on-edit: tests/**) ESLint enforces `max-lines-per-function` 30 and `max-params` 3, both with `skipBlankLines`. A `describe` callback counts as a function, so a suite with many `it` blocks must be split. Both rules failed once each during T01 and T02. — src: `eslint.config.js`; until: config changes.
- [L-02] (when: on-run: npm test, npm run coverage) The full suite is 152 files / 860 tests and takes 240–510 s. `tests/e2e/**` spawns `dist/src/cli/main.js`, so `npm run build` must run first. Iterate with `npx vitest run <file>` and do one full coverage run to close the task. — src: `vitest.config.ts`; until: suite shrinks.
- [L-03] (when: on-edit: src/cli/commands/**) Coverage does not follow into the process the e2e suite spawns. A command module covered only by e2e reads at roughly 20%; `plan.ts` was 22% until an in-process test called `runPlanInit` directly, lifting it to 92%. Add an in-process test for every new command. — src: `done/task_02.md#Handoff`; until: coverage provider changes.
- [L-04] (when: on-edit: tests/unit/**, tests/integration/**) A test importing `/cli/commands/` or `composition-root` contains a `PROCESS_MARKERS` string and must be listed in `PROCESS_LANE_FILES`, or `test-lanes.test.ts` fails. E2E files register automatically through the `tests/e2e/` directory glob. — src: `tests/test-lanes.ts`; until: markers change.

## Code map

- [M-01] (when: on-select: T03, T04, T07) T01 and T02 shipped: `src/core/contracts/{task-plan,state-checkpoint}.ts` (entities, `zod/mini` schemas, `PlanStore`/`CheckpointStore` ports, `findActiveStep`/`findNextStep`/`findLastCompletedStep`/`isPlanComplete`), `src/core/validation/{plan-validator,checkpoint-validator,issues}.ts`, `src/core/services/plan-scaffold.ts`, `src/infrastructure/storage/{plan-store,checkpoint-store}.ts`, `src/cli/{plan-arguments.ts,commands/plan.ts}`. — src: —; until: those files change.
- [M-02] (when: on-select: T04, T05) Boot delivery seam, already traced: `brake-engine.ts:72` `handleSessionReset` returns `NEUTRAL` today and is where the boot decision belongs; the `context` decision kind already exists; `claude-code/runtime.ts:55`, `codex-cli/runtime.ts:64`, `cursor/runtime.ts:45` gate `context` on the post-tool event and must widen; `github-copilot-cli/runtime.ts:61` has no gate and needs no change; `pi/runtime.ts:58-61` and `oh-my-pi/runtime.ts:58-61` discard the session-start decision. Installers already register every session-start event, so no planner changes. — src: `techspec.md#technical-decisions` (DEC-01 to DEC-05); until: those files change.
- [M-03] (when: on-edit: src/infrastructure/git/**) No git adapter exists. `src/core/contracts/processes.ts` defines `ProcessRunner`; `src/infrastructure/process/node-process-runner.ts` spawns with an argument array, `shell: false`, a timeout and tree-kill. `tests/helpers/git-capability.ts` has `runGit` and the skip policy for tests. — src: —; until: T03 lands.

## Open threads

- [O-01] (when: now; on-select: T07) `src/cli/plan-arguments.ts` is at 11.76% coverage because `parsePlan` is exercised only through the out-of-process e2e suite. T07 should add `tests/unit/plan-arguments.test.ts` covering missing and unknown subcommands, missing or empty `--task`, and the flags. — src: `done/task_02.md#Handoff` (open item 1); until: T07 adds the suite.
- [O-02] (when: now; on-select: T05, T09) No real Pi, Oh-My-Pi, or OpenCode installation exists on this machine, so their boot delivery rests on documented fixtures only (prd-02 gaps `OI-03`, `OI-04`, `OI-05`). — src: `docs/research/harness-integrations.md`; until: a real capture is recorded.
- [O-03] (when: now) All evidence so far is Windows 11 / Node v24.19.0. The Linux and macOS × Node 20/22/24 CI matrix has never run and bounds this feature's acceptance too (prd-02 `O-04`, PRD-03 `PI-03`). — src: `workflow.md#Pending-items-for-HIL-1`; until: the matrix runs.
- [O-04] (when: now) Nothing is committed. T01 and T02 sources and tests sit uncommitted on top of `86961bb`, together with the prd-02 closure files that were already there. Committing is a user decision and has not been requested. — src: `workflow.md#Baseline-and-pre-existing-changes`; until: the user commits.
