# Context snapshot — prd-02-telemetria-zonas-e-freio

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: active
- generated: 2026-09-17
- stage: review
- stage_source: codereview_09/codereview.md
- covers_through: T09 (reviewed, APPROVED WITH RESERVATIONS)
- authored_code: no
- git_head: 4a9f5fe
- worktree: tasks/prd-02-telemetria-zonas-e-freio/{done/task_09.md,tasks.md,codereview_09/codereview.md}, tests/support/harness-simulator/{scenarios,agent-profiles,process-driver,in-process-driver,session-recorder}.ts, tests/e2e/{e2e-simulated-usage,e2e-brake,e2e-simulated-long-task}.test.ts
- next_step: sdd-execute-qa
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

- Why next: T09 is implemented and green (handoff in `task_09.md`); T05 and T08 dependencies are closed, and the review must run in a session that did not author the code.
- Read first: `tasks/prd-02-telemetria-zonas-e-freio/task_09.md` (contract + Handoff), then the eight new files, then the cited TechSpec sections: `#test-approach` (TC-13, TC-20 end to end, TC-23, TC-27), `#technical-decisions` DEC-05/06/08/10/11/19, and `prd.md#critérios-de-aceitação` (CA-01, CA-11, CA-14, CA-15, CA-17, CA-18, CA-21).
- Known change points: `tests/support/harness-simulator/scenarios.ts` (catalog, seeds, tokenizer, call builders), `agent-profiles.ts` (20-profile catalog and scripts), `process-driver.ts` (payload builders, response parsing, install/git), `in-process-driver.ts` (mock API, incremental token counts, reload), `session-recorder.ts` (recorder, script runner, ledger helpers); `tests/e2e/e2e-simulated-usage.test.ts`, `e2e-brake.test.ts`, `e2e-simulated-long-task.test.ts`. No `src/` file changed.
- Applicable entries: L-01, L-03, L-04, L-05, L-06, M-01, M-03, M-04, D-01, O-02, O-04, O-05, O-06, O-07.
- Watch out: the quality-profile reservations are expected but must be counted (QA-10 and QA-11 below); the long-task suite is the slow one (~128 s alone, ~5 min in coverage); compare the handoff's claims against the actual commands, not the snapshot.

## Decisions

- [D-01] (when: on-select: sdd-review-code; on-edit: tests/support/harness-simulator/**) Long-task process sessions seed an 11-turn RED ledger and emit only the post-tool event that crosses the ceiling; the below-ceiling save posts are skipped, but every call (save included) is still gated by the hook's documented response. Review it as a documented deviation, not as a silent pass. — src: `task_09.md#Handoff` (open items); until: T09 review closes.

## Learnings

- [L-01] (when: on-run: npm test, npm run coverage, e2e suites) The process lane requires `npm run build` first; it now also runs `tests/integration/runtime-in-process.test.ts` and `tests/integration/runtime-overhead.test.ts`. — src: `tests/test-lanes.ts`; until: —
- [L-03] (when: on-edit: tests/support/harness-simulator/in-process-driver.ts) Each in-process runtime caches one runtime per project root (`createRuntimeResolver`); corrupting `context-brake.config.json` mid-session only takes effect after the channel's `reload()`, which the failure profile uses. — src: `src/infrastructure/harnesses/common/in-process-support.ts`; until: runtime cache changes.
- [L-04] (when: on-edit: tests/unit/*, tests/e2e/*) Unit test files must not contain process-lane literal markers (`node:child_process`, `/cli/commands/`) in test strings or `test-lanes.test.ts` flags them as misplaced; e2e suites are registered through the `tests/e2e/` directory glob. — src: `tests/test-lanes.ts`; until: test lane marker regex is updated.
- [L-05] (when: on-run: npx vitest run tests/e2e/e2e-simulated-long-task.test.ts) The suite runs 100 concurrent tests (20 per full-level harness) in ~128 s on Windows/Node 24; narrow with `-t "<harness>"` or `-t "session N"` while iterating. — src: `tests/e2e/e2e-simulated-long-task.test.ts`; until: suite changes.
- [L-06] (when: on-edit: tests/support/harness-simulator/**) Measured usage in the mock is the incremental sum of line tokens (`+1` per join), not a re-tokenization; keep `addLine` as the only way lines enter the context or the margins in `e2e-simulated-usage` shift. — src: `tests/support/harness-simulator/in-process-driver.ts`; until: driver changes.

## Code map

- [M-01] (when: on-edit: src/infrastructure/harnesses/{pi,oh-my-pi,opencode}/runtime.ts) Each exports the descriptor, context/API types, and the factory (`createPiExtension`, `createOmpExtension`, `createOpenCodePlugin`); `events.ts` holds pure mapping/rendering, `capabilities.ts` holds the capability list, `schemas.ts` is `zod/mini`. — src: —; until: changed files overlap.
- [M-03] (when: on-edit: tests/helpers/*, tests/support/harness-simulator/*) `runtime-seed.ts` (config + `fixedClock`), `built-hook.ts` (installed hook path and spawn), and `git-capability.ts` (`runGit`, skip policy) are reused by the simulator instead of duplicated. — src: —; until: helpers change.
- [M-04] (when: on-select: sdd-review-code) Simulator responsibility split: `scenarios.ts` catalog+seed+call builders, `agent-profiles.ts` profiles/scripts, `process-driver.ts` documented payloads and response parsing, `in-process-driver.ts` built-extension mock, `session-recorder.ts` recorder/script runner/ledger+git helpers. — src: —; until: files change.

## Open threads

- [O-02] (when: now) No real Pi, Oh-My-Pi, or OpenCode installation exists here: OI-03 (Pi `.js` discovery), OI-04 (Oh-My-Pi load), and OI-05 (`input.sessionID`, `tool.execute.after` arguments) stay as recorded gaps. Cursor/Antigravity capture gaps from T06 also remain. — src: `docs/research/harness-integrations.md` (Payloads reais per section); until: a capture is recorded.
- [O-04] (when: now) Local validation was Windows/Node 24 only; the Linux/macOS/Windows × Node 20/22/24 CI matrix that completes CA-20 and the feature's final acceptance has not run. — src: `tasks/prd-02-telemetria-zonas-e-freio/codereview_08/codereview.md#limitations-and-open-items`; until: CI matrix run.
- [O-05] (when: now) codereview_08 optional improvements: CR-01 (overhead evidence scope and p95 logging), CR-02 (dead `assets/runtime/entry.ts` stub), CR-03 (`scripts/check-package.ts` missing `docs/telemetry-block.md`); persistent reservations `codereview_01/CR-01` (schema `required: brake`) and `codereview_02/CR-02` (QA-10 test helper). None blocks T09. — src: `tasks/prd-02-telemetria-zonas-e-freio/codereview_08/codereview.md#findings`; until: a corrections or packaging task closes them.
- [O-06] (when: now) Cursor has no documented file-write payload, so its above-ceiling state save is asserted denied and recorded as the fixture-gated gap (OI-04); do not read the long-task suite as proving an above-ceiling Cursor save. — src: `task_09.md#Handoff`; until: a real Cursor file-tool capture exists.
- [O-07] (when: now) codereview_09 optional reservations: QA-10 in `tests/support/harness-simulator/process-driver.ts:69` and QA-11 in `tests/e2e/e2e-brake.test.ts` (106 physical lines, 100 non-blank). Both recorded as CR-01/CR-02; feature has 3 total reservations, below the 8-count escalation trigger. — src: `tasks/prd-02-telemetria-zonas-e-freio/codereview_09/codereview.md#findings`; until: a future cleanup task closes them.
