# Context snapshot — 02.2-janela-de-contexto-do-claude-code

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: active
- generated: 2026-09-26
- stage: corrections
- stage_source: codereview_01/
- covers_through: codereview_01/done/task_14.md (T06–T11, T13, T14 done; T12 open on BLK-01)
- authored_code: yes
- git_head: 66e46cf (branch feat/prd-02.2-claude-context-window, draft PR #2)
- worktree: 5 dogfooding files modified + 2 untracked (.agents/hooks/context-brake-statusline.mjs, .agents/settings.local.json), intentionally uncommitted; tasks/ state files updated after the commit
- next_step: exception HIL on BLK-01, then the chosen correction (T15) and a CI rerun to close T12
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

- Why next: CI on PR #2 fails TC-20 on macOS and Windows only; every other obligation of round 1 is green (263/263 locally, 262–263/263 on CI). NFR-01/OBJ-04 are PRD budgets, so the fix needs a human decision (BLK-01).
- Do: record the BLK-01 answer in `workflow.md`; write T15 in `codereview_01/`; implement; push to the same branch; close T12 on a green matrix. Then the session pause recommends ending: codereview_02 must run in a session that made no corrections.
- Read first: `codereview_01/task_12.md#handoff`, `workflow.md#events` (EV-06, EV-07).
- Applicable entries: O-05, L-02, L-03, L-06, M-03.
- Commits only as authorized: DEC-HIL-04 covers the T12 branch and draft PR; pushing follow-up commits for T15 to that branch stays within it.

## Decisions

- [D-05] (when: on-select: T12; commit; git add) Commits for this feature include only src, tests, assets, scripts, schemas, docs, README, and this folder; dogfooding files and `.agents/settings.local.json` stay out. — src: workflow.md#events; until: feature closed

## Learnings

- [L-02] (when: on-run: npm run coverage; npm test) Run `npm run build` first after touching `src/`. Full suite takes about 14 minutes here. — src: tasks.md#problems-and-solutions; until: feature closed
- [L-03] (when: on-run: on failure: Test timed out) Load-sensitive tests time out at 30 s in full runs and pass alone (`init-legacy-turn-limits`, `e2e-run-stops`, `doctor-delegated-snapshot`, `e2e-support-limitations`, `node-process-runner`). — src: codereview_01/done/task_07.md#handoff; until: feature closed
- [L-04] (when: on-edit: tests/**/*.test.ts) Tests calling Claude `planInstall` with their own snapshot list must include `.claude/hooks/context-brake-statusline.mjs`; install/doctor tests isolate the user scope with a temp `userHome` or `HOME`/`USERPROFILE`. — src: tests/helpers/statusline-world.ts; until: feature closed
- [L-06] (when: on-run: npm run coverage) `npm run coverage` once ended after ~3 min with no summary and exit 0; use `npx vitest run --coverage --coverage.reportOnFailure` and read `Test Files`. — src: codereview_01/done/task_07.md#handoff; until: feature closed
- [L-07] (when: on-run: gh api; CI logs) `gh api .../jobs/<id>/logs` refuses output with escape sequences; use `gh run view --job <id> --log` after the run completes, and `gh api repos/<repo>/check-runs/<id>/annotations` for assertion text while it runs. — src: —; until: feature closed

## Code map

- [M-01] (when: on-select: src/infrastructure/harnesses/claude-code/statusline-*) Bridge runtime `statusline-bridge.ts` + `statusline-payload.ts`; install `statusline-planner.ts`; command building `statusline-settings.ts:bridgeCommand`; doctor `statusline-diagnostics.ts` + `statusline-context-window.ts`. — src: done/task_03.md#handoff; until: feature closed
- [M-03] (when: on-select: T15; BLK-01; tests/integration/statusline-overhead.test.ts) TC-20 lives in `statusline-overhead.test.ts` (`BRIDGE_TARGET_MS = 50`, `HOOK_TARGET_MS = 100`, CI rule `measured - baseline <= target`); PRD 2.1 hook budget is `runtime-overhead.test.ts` `PROCESS_TARGET_MS = 100`. — src: codereview_01/task_12.md#handoff; until: T12 done

## Open threads

- [O-05] (when: now; T12; T15) BLK-01 awaits the user: bridge off the critical path, revised NFR-01/OBJ-04 budgets, or CR-04 accepted open. — src: checkpoint.json#pending_hil; until: answer recorded in workflow.md
