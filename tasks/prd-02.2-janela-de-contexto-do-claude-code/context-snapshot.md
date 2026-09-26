# Context snapshot — 02.2-janela-de-contexto-do-claude-code

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-09-26
- stage: acceptance
- stage_source: qa_01/
- covers_through: qa_01/qa.md (codereview_02 APPROVED, qa_01 APPROVED)
- authored_code: no
- git_head: 8dd3baa (branch feat/prd-02.2-claude-context-window, draft PR #2, CI green)
- worktree: task-state edits, codereview_02/ and qa_01/ in tasks/prd-02.2-janela-de-contexto-do-claude-code/ uncommitted; 5 dogfooding files + .agents/settings.local.json + .agents/hooks/context-brake-statusline.mjs uncommitted by design
- next_step: — (feature completed, DEC-HIL-07)
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

- Why next: review and QA both closed APPROVED; only human acceptance (HIL 3) remains.
- Do: present HIL 3 from `qa_01/qa.md` and `codereview_02/codereview.md`; record the answer in `workflow.md`; on acceptance set checkpoint `completed` and this snapshot `closed`.
- Read first: `qa_01/qa.md#limitations-and-open-items`, `codereview_02/codereview.md#limitations-and-open-items`, `workflow.md` DEC-HIL-06.
- Applicable entries: D-05, O-07, O-08.
- Commits and pushes beyond PR #2's branch, and marking PR #2 ready, need a new authorization.

## Decisions

- [D-05] (when: on-select: commit; git add) Commits for this feature include only src, tests, assets, scripts, schemas, docs, README, and this folder; dogfooding files and `.agents/settings.local.json` stay out. — src: workflow.md#events; until: feature closed

## Learnings

- [L-02] (when: on-run: npm run coverage; npm test) Run `npm run build` first after touching `src/`. Full suite takes about 14 minutes here. — src: tasks.md#problems-and-solutions; until: feature closed
- [L-06] (when: on-run: npm run coverage) Prefer `npx vitest run --coverage --coverage.reportOnFailure` and read `Test Files`; `npm run coverage` once exited early with no summary. — src: codereview_01/done/task_07.md#handoff; until: feature closed
- [L-08] (when: on-run: QA; hook) The Claude hook prints no telemetry block at GREEN; check the ledger `tool` line (`source`, `windowTokens`) instead. RED is above 65% (650,000 of 1M is still YELLOW). — src: qa_01/evidence/qa-statusline.mjs; until: feature closed

## Code map

- [M-01] (when: on-select: src/infrastructure/harnesses/claude-code/statusline-*) Bridge runtime `statusline-bridge.ts` + `statusline-payload.ts`; install `statusline-planner.ts`; command building `statusline-settings.ts:bridgeCommand`; doctor `statusline-diagnostics.ts` + `statusline-context-window.ts`. — src: done/task_03.md#handoff; until: feature closed

## Open threads

- [O-08] (when: now; acceptance) Observations for a possible follow-up, not defects: restored previous local `statusLine` is re-serialized (value-equal); PRD US-01 says RED "starts at 650,000" while RF10 says above 65%. — src: qa_01/qa.md#limitations-and-open-items; until: HIL 3 answered
