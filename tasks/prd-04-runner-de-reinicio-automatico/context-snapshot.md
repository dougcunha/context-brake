# Context snapshot — prd-04-runner-de-reinicio-automatico

> Hints, not an authority: artifacts, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: closed
- generated: 2026-09-24
- stage: acceptance
- stage_source: qa_01/qa.md
- covers_through: HIL 3 (DEC-HIL-03 accepted)
- authored_code: no (review and QA session changed no code)
- git_head: eb2f386
- worktree: uncommitted T01–T14 work in `src/`, `tests/`, `scripts/`, `schemas/`, and `docs/research/harness-integrations.md`; this feature folder; and unrelated `.agents/scheduled_tasks.lock`
- next_step: none (feature completed)
- other_eligible: —
- superseded_by: —

## Load map

| Tier | Load when |
| --- | --- |
| `now` | Session start: header, next step brief, open threads waiting on the user |
| `on-select` | The chosen unit matches a trigger: task or finding ID, affected file, or traceability ID |
| `on-edit` | About to edit or create a path that matches a trigger |
| `on-run` | About to run a matching command, or it just failed |
| `on-demand` | A gist is not enough: follow its `src:` pointer, that section only |

Entry shape: `- [ID] (when: tier: trigger; trigger) gist — src: path#section; until: condition`

## Next step brief

- **Why next:** Re-review `codereview_02` and CLI QA `qa_01` are both APPROVED in an independent session. The flow reached HIL 3 for human acceptance of the delivery.
- **Skill and unit:** `sdd-orchestrate-flow`, HIL 3 gate.
- **Read first:**
  - `codereview_02/codereview.md` (Summary; Conclusion)
  - `qa_01/qa.md` (Summary; Conclusion)
  - `workflow.md` (Human Decisions Log; Milestones 26 & 27)
- **Applicable entries:** L-08, O-02, O-04, O-06.

## Decisions

- [D-05] (when: on-select: review; DEC-16) Exit codes: a forbidden shim argument exits 64 (`INVALID_ARGUMENTS`), preflight errors exit 2, and Ctrl+C at a TTY prompt ends as the approval stop rather than 130. — src: done/task_08.md#Handoff; until: feature closed

## Learnings

- [L-02] (when: on-run: npm test; on-edit: tests/**) Process-spawning tests belong in the process lane (`tests/test-lanes.ts`). `tests/e2e/` is in it. — src: tasks/prd-03-plano-checkpoint-e-boot/workflow.md#Correction round 2; until: feature closed
- [L-05] (when: on-run: npm run lint) The lint baseline is 14 errors, all in `tasks/prd-03-plano-checkpoint-e-boot/qa_01/evidence/*.mjs`. Only new errors count. — src: tasks.md#Problems and solutions; until: those files are fixed
- [L-08] (when: on-run: npm run coverage) The full serialized coverage run passed at 94.88% lines (1,390 passed, 3 skipped for POSIX CI). — src: codereview_02/codereview.md; until: feature closed
- [L-10] (when: on-run: context-brake run; on-edit: tests/e2e/**) Real `claude.exe` and `codex.exe` are installed on this machine. Launch `run` only through `runEnvironment` or `runAcceptance` (sealed `PATH` plus guard). Never hand-build a `PATH`. — src: tasks.md#Problems and solutions; until: feature closed
- [L-12] (when: on-run: npm run coverage) POSIX group-stop tests skip on Windows and need Linux/macOS CI. The signal helper has focused unit tests on Windows. — src: codereview_01/done/task_11.md#Handoff; until: feature closed

## Code map

- [M-14] (when: on-select: review; on-edit: tests/e2e/**; tests/helpers/run-*) Test entry points: `tests/helpers/run-project.ts` (sealed `PATH`, scenario, journal) and `run-acceptance.ts`. Fake harness: `tests/support/fake-harness/fake-harness.mjs` and `fake-agent.mjs`. — src: done/task_09.md#Handoff; until: feature closed

## Open threads

- [O-02] (when: acceptance) Local evidence is Windows only (PI-03). The TC-22 SIGINT case and both T11 POSIX cases run only in CI. — src: codereview_01/done/task_11.md#Handoff; until: feature closed
- [O-04] (when: acceptance) The T08 real-harness incident was disclosed and guarded with sealed PATH and real-harness guard. — src: done/task_08.md#Handoff open item 1; until: feature closed
- [O-06] (when: acceptance) For HIL 3: OI-01 (`wrap` has no child timeout, against `node.md`; accept or record a DEC), OI-02 (QA-06 test double `throw new Error('locked')`), and OI-03 (PRD-02 reset notice trailing-line signal alignment). — src: codereview_02/codereview.md#Findings; until: HIL 3
