# Context snapshot — prd-02-telemetria-zonas-e-freio

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: active
- generated: 2026-09-16
- stage: review
- stage_source: codereview_08/codereview.md
- covers_through: codereview_08/codereview.md
- authored_code: no
- git_head: ce3c4c5
- worktree: 13 changed: README.md, package.json, scripts/asset-bundler.ts, src/core/validation/configuration-validator.ts, tests/integration/{package-contents,runtime-overhead}.test.ts, tests/test-lanes.ts, tests/unit/runtime-bundle-imports.test.ts, docs/telemetry-block.md, tasks/prd-02-telemetria-zonas-e-freio/{tasks,context-snapshot}.md, done/task_08.md (moved), codereview_08/ (plus untracked .agents/scheduled_tasks.lock)
- next_step: sdd-execute-task — T09 (task_09.md)
- other_eligible: —
- superseded_by: —

## Load map

| Tier | Load when |
| --- | --- |
| `now` | Session start: header, next step brief, open threads waiting on the user |
| `on-select` | Chosen unit matches a trigger: task or finding ID, affected file, or traceability ID |
| `on-edit` | About to edit or create a path matching a trigger |
| `on-run` | About to run a matching command, or it just failed |
| `on-demand` | A gist is not enough: follow its `src:` pointer, that section only |

Review and QA sessions load only the header, next step brief, `Open threads`, and `on-run` entries.

Entry shape: `- [ID] (when: tier: trigger; trigger) gist — src: path#section; until: condition`

## Next step brief

- Why next: T08 is implemented, reviewed (`APPROVED WITH RESERVATIONS` in codereview_08), and closed; T09 is the last PRD-02 unit and owns simulated accuracy (CA-11), the built-CLI brake flow (CA-01, CA-14, CA-15, CA-17, CA-18), and long-task efficacy (CA-21).
- Read first: `tasks/prd-02-telemetria-zonas-e-freio/task_09.md` (contract + Work), then `techspec.md#technical-decisions` (DEC-19 plus DEC-05, DEC-06, DEC-08, DEC-10, DEC-11), `#test-approach` (TC-13, TC-20, TC-23, TC-27), `#quality-profile`, `prd.md#critérios-de-aceitação`, `docs/telemetry-block.md`, and `codereview_08/codereview.md` (findings, limitations, persistent reservations).
- Known change points: new `tests/support/harness-simulator/{scenarios,agent-profiles,process-driver,in-process-driver,session-recorder}.ts` and `tests/e2e/{e2e-simulated-usage,e2e-brake,e2e-simulated-long-task}.test.ts`; `tests/test-lanes.ts` only if the support files need lane registration; `src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts` only if estimation recalibration is required.
- Watch out: e2e suites run the built CLI, so `npm run build` first; process-lane and e2e suites share `dist/`, `coverage/`, and fixture directories, so serialize them; unit-lane files must not carry process-lane literal markers (L-04); the process p95 target binds only under `CI` and no p95 is printed (codereview_08/CR-01); runtime bundles are ≈750 KB because all zod locale modules are retained (codereview_08 limitation).
- Applicable entries: O-02, O-03, O-04, O-05, L-01, L-02, L-04, D-01, M-01, M-03.

## Decisions

- [D-01] (when: on-select: T09; on-edit: src/infrastructure/harnesses/{pi,oh-my-pi}/runtime.ts) The estimation constants (`baselineTokens`, `tokensPerTurn`) live in the runtime descriptors and are the only calibration knobs for TC-13; recalibrating them requires `npm run build` because the e2e suites load the built assets. — src: `tasks/prd-02-telemetria-zonas-e-freio/task_09.md#Work`; until: T09 review closes.

## Learnings

- [L-01] (when: on-run: npm test, npm run coverage, e2e suites) The process lane requires `npm run build` first; it now also runs `tests/integration/runtime-in-process.test.ts` and `tests/integration/runtime-overhead.test.ts`. — src: `tests/test-lanes.ts`; until: —
- [L-02] (when: on-run: e2e-user-hook-preservation) `remove` must drop event keys that become empty arrays for the byte-identical restoration check; Claude planner, Codex and Cursor updaters use `removeJsonProperty` for that case. — src: `src/infrastructure/harnesses/claude-code/planner.ts`; until: refactor of the shared updaters.
- [L-03] (when: on-edit: src/infrastructure/harnesses/*/{runtime,events}.ts) Each in-process runtime caches one runtime per project root (`createRuntimeResolver`), and its ledger cache does not see external writes; seed a ledger before the first handler call or use a fresh session key. — src: `src/infrastructure/harnesses/common/in-process-support.ts`; until: runtime cache changes.
- [L-04] (when: on-edit: tests/unit/*, tests/e2e/*) Unit test files must not contain process-lane literal markers (`node:child_process`, `/cli/commands/`) in test strings or `test-lanes.test.ts` flags them as misplaced; e2e suites are registered through the `tests/e2e/` directory glob. — src: `tests/test-lanes.ts`; until: test lane marker regex is updated.

## Code map

- [M-01] (when: on-edit: src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts) Each exports the descriptor, context/API types, and the factory (`createPiExtension`, `createOmpExtension`, `createOpenCodePlugin`); `events.ts` holds pure mapping/rendering, `capabilities.ts` holds the capability list, `schemas.ts` is `zod/mini`. — src: —; until: changed files overlap.
- [M-03] (when: on-edit: tests/helpers/*) `runtime-seed.ts` writes configs and ledger tool lines (`seedTurns(projectRoot, key, turns)`), `fixedClock` timestamps them; `harness-payloads.ts` reads fixtures; the simulator support files from T09 extend these helpers rather than duplicating them. — src: —; until: T09 extends them.

## Open threads

- [O-02] (when: now) No real Pi, Oh-My-Pi, or OpenCode installation exists here: OI-03 (Pi `.js` discovery), OI-04 (Oh-My-Pi load), and OI-05 (`input.sessionID`, `tool.execute.after` arguments) stay as recorded gaps. Cursor/Antigravity capture gaps from T06 also remain. — src: `docs/research/harness-integrations.md` (Payloads reais per section); until: a capture is recorded.
- [O-03] (when: now) T08 reviewed (`APPROVED WITH RESERVATIONS` in codereview_08) and moved to done; T09 (simulator, end-to-end brake flow, long-task efficacy) is the next and last unit. — src: `tasks.md#State`; until: T09 review closes.
- [O-04] (when: now) Local validation was Windows/Node 24 only; the Linux/macOS/Windows × Node 20/22/24 CI matrix that completes CA-20 and the feature's final acceptance has not run. — src: `tasks/prd-02-telemetria-zonas-e-freio/codereview_08/codereview.md#limitations-and-open-items`; until: CI matrix run.
- [O-05] (when: now) codereview_08 optional improvements: CR-01 (overhead evidence scope and p95 logging), CR-02 (dead `assets/runtime/entry.ts` stub), CR-03 (`scripts/check-package.ts` missing `docs/telemetry-block.md`); persistent reservations `codereview_01/CR-01` (schema `required: brake`) and `codereview_02/CR-02` (QA-10 test helper). None blocks T09. — src: `tasks/prd-02-telemetria-zonas-e-freio/codereview_08/codereview.md#findings`; until: a corrections or packaging task closes them.
