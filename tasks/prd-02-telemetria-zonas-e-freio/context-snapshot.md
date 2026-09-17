# Context snapshot — prd-02-telemetria-zonas-e-freio

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: closed
- generated: 2026-09-17
- stage: acceptance
- stage_source: tasks/prd-02-telemetria-zonas-e-freio/workflow.md
- covers_through: HIL 3 (completed)
- authored_code: no
- git_head: 86961bb
- worktree: clean
- next_step: prd-03-plano-checkpoint-e-boot
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

- Why next: PRD-02 QA execution has concluded with status APPROVED. All 22 Functional Requirements (`RF1`–`RF22`) and 23 Acceptance Criteria (`CA-01`–`CA-23`) are verified and passing with 146 test files, 813 tests passing, and 93.31% statement coverage.
- Read first: `tasks/prd-02-telemetria-zonas-e-freio/qa_01/qa.md` (QA report and evidence matrix), then `tasks/prd-02-telemetria-zonas-e-freio/tasks.md` and `prd.md`.
- Known change points: No code modifications were performed in this QA session. QA evidence is stored under `tasks/prd-02-telemetria-zonas-e-freio/qa_01/evidence/`.
- Applicable entries: L-01, L-03, L-04, L-05, L-06, M-01, M-03, M-04, O-02, O-04, O-05, O-06, O-07, O-08.
- Watch out: PRD-02 is fully verified locally on Windows 11 / Node 24; multi-platform CI matrix (Linux/macOS × Node 20/22/24) remains tracked under O-04 for release.

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
- [O-08] (when: now) QA stage completed with status APPROVED. Report written to `tasks/prd-02-telemetria-zonas-e-freio/qa_01/qa.md`. All 22 RFs and 23 CAs verified; 0 bugs found. Feature ready for final acceptance/handoff. — src: `tasks/prd-02-telemetria-zonas-e-freio/qa_01/qa.md`; until: feature accepted.
