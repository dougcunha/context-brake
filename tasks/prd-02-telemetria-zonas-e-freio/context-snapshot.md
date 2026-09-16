# Context snapshot — prd-02-telemetria-zonas-e-freio

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: active
- generated: 2026-09-16
- stage: review
- stage_source: codereview_07/codereview.md
- covers_through: codereview_07/codereview.md
- authored_code: no
- git_head: 3cff470
- worktree: 42 changed: assets/, docs/, src/, tests/, tasks/ (plus untracked .agents/scheduled_tasks.lock)
- next_step: sdd-execute-task — T08 (task_08.md)
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

- Why next: T07 is implemented, tested, and handed off; `sdd-review-code` must run in a session that did not author this code (independence rule), so it must skip `Decisions`, `Code map`, and author `Learnings` below except the `on-run` entries.
- Read first: `tasks/prd-02-telemetria-zonas-e-freio/task_07.md` (contract + Handoff), then `techspec.md#integrations-and-interfaces` (OpenCode, Pi, Oh-My-Pi rows), `#contracts-and-data` (telemetry block, block message, reset notice, ledger), `#test-approach` (TC-09, TC-11, TC-12, TC-14, TC-21, TC-32, TC-33), and `prd.md#critérios-de-aceitação` (CA-06 to CA-19). Judge the uncommitted diff (`git diff` plus untracked files), not `HEAD`.
- Known change points: new `src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/{runtime,events,capabilities,schemas}.ts`; shared `src/infrastructure/harnesses/common/in-process-support.ts`; `adapter.ts` imports the moved capability lists; thin `assets/runtime/{pi-extension,omp-extension,opencode-plugin}.ts` factories; `in-process-sampler.ts` context shape; fixtures and the named suites; `tests/test-lanes.ts` process-lane entry; three research sections.
- Watch out: `common/in-process-support.ts` and the per-harness `events.ts` are extra files beyond T07's literal Affected files (100-line rule; scope note in the Handoff); `tests/integration/runtime-in-process.test.ts` runs in the process lane and needs `npm run build` first; the OpenCode deny test pins the exact v1 block message (`turn=12/12 usage=70% tokens=16800/24000 source=estimated`).
- Applicable entries: O-01, O-03, L-01, L-02.

## Decisions

- [D-01] (when: on-select: T07, T08) T07 added `common/in-process-support.ts` and per-harness `events.ts` beyond the task's literal file list because ESLint/`code-standards.md` cap files at 100 lines; the built-asset integration suite sits in `PROCESS_LANE_FILES`. — src: `tasks/prd-02-telemetria-zonas-e-freio/task_07.md#Handoff`; until: T07 review closes.

## Learnings

- [L-01] (when: on-run: npm test, npm run coverage) The process lane requires `npm run build` first; it now also runs `tests/integration/runtime-in-process.test.ts`, which imports `dist/assets/runtime/*`. — src: `tests/test-lanes.ts`; until: —
- [L-02] (when: on-run: e2e-user-hook-preservation) `remove` must drop event keys that become empty arrays for the byte-identical restoration check; Claude planner, Codex and Cursor updaters use `removeJsonProperty` for that case. — src: `src/infrastructure/harnesses/claude-code/planner.ts`; until: refactor of the shared updaters.
- [L-03] (when: on-edit: src/infrastructure/harnesses/*/{runtime,events}.ts) Each in-process runtime caches one runtime per project root (`createRuntimeResolver`), and its ledger cache does not see external writes; seed a ledger before the first handler call or use a fresh session key. — src: `src/infrastructure/harnesses/common/in-process-support.ts`; until: runtime cache changes.

## Code map

- [M-01] (when: on-edit: src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts) Each exports the descriptor, context/API types, and the factory (`createPiExtension`, `createOmpExtension`, `createOpenCodePlugin`); `events.ts` holds pure mapping/rendering, `capabilities.ts` holds the capability list, `schemas.ts` is `zod/mini`. — src: —; until: changed files overlap.
- [M-02] (when: on-edit: assets/runtime/{pi-extension,omp-extension,opencode-plugin}.ts) Thin assets call the factory and keep the exported function names asserted by `tests/unit/runtime-assets.test.ts`. — src: —; until: T08 rewrites assets.
- [M-03] (when: on-edit: tests/helpers/*) `runtime-seed.ts` writes configs and ledger tool lines (`seedTurns(projectRoot, key, turns)`), `fixedClock` timestamps them; `harness-payloads.ts` reads fixtures. — src: —; until: T09 extends them.

## Open threads

- [O-01] (when: now) QA-08's bundle-guard suite is still missing; T08 owns it. T07 checked the three bundles manually for `jsonc-parser`, `semver`, `node:child_process`, and `src/cli/` with no hits. — src: `tasks/prd-02-telemetria-zonas-e-freio/techspec.md#quality-profile`; until: T08 done.
- [O-02] (when: now) No real Pi, Oh-My-Pi, or OpenCode installation exists here: OI-03 (Pi `.js` discovery), OI-04 (Oh-My-Pi load), and OI-05 (`input.sessionID`, `tool.execute.after` arguments) stay as recorded gaps. Cursor/Antigravity capture gaps from T06 also remain. — src: `docs/research/harness-integrations.md` (Payloads reais per section); until: a capture is recorded.
- [O-03] (when: now) T07 reviewed (APPROVED WITH RESERVATIONS in codereview_07); T08 (assets, bundle guard, overhead, docs) is the next unit; T09 (simulator, e2e) remains pending. — src: `tasks.md#State`; until: T08 done.
- [O-04] (when: now) Local validation was Windows/Node 24 only; Linux and macOS run in CI. — src: `tasks/prd-02-telemetria-zonas-e-freio/task_07.md#Handoff`; until: CI matrix run.
